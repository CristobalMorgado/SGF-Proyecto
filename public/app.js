// ================================================
// SGF — Lógica del Cliente (Frontend)
// ================================================

const API = ''; // Mismo origen (vacío = relativo al servidor)
let token = null;
let userInfo = null; // { id, grupoId, rol }
let allMovimientos = [];
let allCategorias = [];

// ========================================
// UTILIDADES
// ========================================

// Fetch autenticado (agrega el token JWT a cada petición)
async function authFetch(url, options = {}) {
  options.headers = {
    ...options.headers,
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
  const res = await fetch(`${API}${url}`, options);
  if (res.status === 401) {
    logout();
    return null;
  }
  return res;
}

// Formatear montos en pesos chilenos
function formatMonto(n) {
  return '$' + Number(n).toLocaleString('es-CL');
}

// Formatear fecha a DD/MM/AAAA
function formatFecha(fechaStr) {
  const d = new Date(fechaStr);
  return d.toLocaleDateString('es-CL');
}

// Decodificar payload del token JWT
function decodeToken(t) {
  try {
    const payload = JSON.parse(atob(t.split('.')[1]));
    return payload;
  } catch {
    return null;
  }
}

// ========================================
// AUTENTICACIÓN
// ========================================

function showAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  if (tab === 'login') {
    document.querySelector('.auth-tab:first-child').classList.add('active');
    document.getElementById('form-login').style.display = 'flex';
    document.getElementById('form-registro').style.display = 'none';
  } else {
    document.querySelector('.auth-tab:last-child').classList.add('active');
    document.getElementById('form-login').style.display = 'none';
    document.getElementById('form-registro').style.display = 'flex';
  }
  // Limpiar mensajes de error
  document.getElementById('login-error').textContent = '';
  document.getElementById('registro-error').textContent = '';
  document.getElementById('registro-success').textContent = '';
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errorEl = document.getElementById('login-error');
  errorEl.textContent = '';

  try {
    const res = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (!res.ok) {
      errorEl.textContent = data.mensaje || 'Error al iniciar sesión.';
      return;
    }

    // Guardar token y entrar a la app
    token = data.token;
    localStorage.setItem('sgf_token', token);
    onLoginSuccess();
  } catch (err) {
    errorEl.textContent = 'Error de conexión con el servidor.';
  }
}

async function handleRegistro(e) {
  e.preventDefault();
  const nombre = document.getElementById('reg-nombre').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const nombreGrupo = document.getElementById('reg-grupo').value.trim();
  const errorEl = document.getElementById('registro-error');
  const successEl = document.getElementById('registro-success');
  errorEl.textContent = '';
  successEl.textContent = '';

  try {
    const res = await fetch(`${API}/api/auth/registro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, email, password, nombreGrupo })
    });
    const data = await res.json();

    if (!res.ok) {
      errorEl.textContent = data.mensaje || 'Error al registrarse.';
      return;
    }

    successEl.textContent = '✅ Cuenta creada. Ya puedes iniciar sesión.';
    document.getElementById('form-registro').reset();
    // Cambiar a pestaña de Login después de 2 segundos
    setTimeout(() => showAuthTab('login'), 2000);
  } catch (err) {
    errorEl.textContent = 'Error de conexión con el servidor.';
  }
}

function onLoginSuccess() {
  userInfo = decodeToken(token);
  if (!userInfo) { logout(); return; }

  // Ocultar auth, mostrar app
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';

  // Configurar UI según rol
  document.getElementById('user-name').textContent = `ID: ${userInfo.id.slice(-6)}`;
  const rolBadge = document.getElementById('user-role');
  rolBadge.textContent = userInfo.rol;
  if (userInfo.rol === 'Administrador') {
    rolBadge.classList.add('admin');
    document.getElementById('btn-nav-familia').style.display = 'flex';
  }

  // Cargar datos del dashboard
  loadDashboard();
}

function logout() {
  token = null;
  userInfo = null;
  localStorage.removeItem('sgf_token');
  document.getElementById('app').style.display = 'none';
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('form-login').reset();
}

// Restaurar sesión al cargar la página
function tryRestoreSession() {
  const saved = localStorage.getItem('sgf_token');
  if (saved) {
    const payload = decodeToken(saved);
    // Verificar que el token no haya expirado
    if (payload && payload.exp * 1000 > Date.now()) {
      token = saved;
      onLoginSuccess();
    } else {
      localStorage.removeItem('sgf_token');
    }
  }
}

// ========================================
// NAVEGACIÓN (SIDEBAR)
// ========================================

const sectionTitles = {
  dashboard: 'Dashboard',
  ingresos: 'Ingresos',
  gastos: 'Gastos',
  categorias: 'Categorías',
  familia: 'Mi Familia'
};

function navigateTo(section) {
  // Ocultar todas las secciones
  document.querySelectorAll('.section').forEach(s => s.style.display = 'none');
  // Mostrar la sección elegida
  document.getElementById(`section-${section}`).style.display = 'block';

  // Actualizar botón activo en sidebar
  document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.querySelector(`.nav-item[data-section="${section}"]`);
  if (activeBtn) activeBtn.classList.add('active');

  // Actualizar título del header
  document.getElementById('section-title').textContent = sectionTitles[section] || section;

  // Cargar datos según la sección
  if (section === 'dashboard') loadDashboard();
  if (section === 'ingresos') renderFilteredTable('Ingreso', 'tabla-ingresos');
  if (section === 'gastos') renderFilteredTable('Gasto', 'tabla-gastos');
  if (section === 'categorias') loadCategorias();
}

// ========================================
// DASHBOARD — CARGAR DATOS
// ========================================

async function loadDashboard() {
  await Promise.all([loadResumen(), loadMovimientos(), loadCategorias()]);
  renderMovimientosTable();
}

async function loadResumen() {
  try {
    const res = await authFetch('/api/movimientos/resumen');
    if (!res) return;
    const data = await res.json();

    document.getElementById('total-ingresos').textContent = formatMonto(data.totalIngresos);
    document.getElementById('total-gastos').textContent = formatMonto(data.totalGastos);
    document.getElementById('saldo-total').textContent = formatMonto(data.saldoTotal);

    const alertaEl = document.getElementById('alerta-deficit');
    alertaEl.style.display = data.alertaDeficit ? 'block' : 'none';

    // Cambiar color del saldo si hay déficit
    const saldoEl = document.getElementById('saldo-total');
    if (data.saldoTotal < 0) {
      saldoEl.style.color = '#ef4444';
    } else {
      saldoEl.style.color = '#3b82f6';
    }
  } catch (err) {
    console.error('Error al cargar resumen:', err);
  }
}

async function loadMovimientos() {
  try {
    const res = await authFetch('/api/movimientos');
    if (!res) return;
    allMovimientos = await res.json();
  } catch (err) {
    console.error('Error al cargar movimientos:', err);
  }
}

async function loadCategorias() {
  try {
    const res = await authFetch('/api/categorias');
    if (!res) return;
    allCategorias = await res.json();
    renderCategoriasGrid();
  } catch (err) {
    console.error('Error al cargar categorías:', err);
  }
}

// ========================================
// RENDERIZAR TABLAS
// ========================================

function renderMovimientosTable() {
  const tbody = document.getElementById('tabla-movimientos');
  const emptyMsg = document.getElementById('sin-movimientos');

  if (allMovimientos.length === 0) {
    tbody.innerHTML = '';
    emptyMsg.style.display = 'block';
    return;
  }

  emptyMsg.style.display = 'none';
  tbody.innerHTML = allMovimientos.map(m => buildMovRow(m)).join('');
}

function renderFilteredTable(tipo, tbodyId) {
  const filtered = allMovimientos.filter(m => m.tipo === tipo);
  const tbody = document.getElementById(tbodyId);
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#64748b; padding:24px;">No hay ${tipo.toLowerCase()}s registrados.</td></tr>`;
    return;
  }
  tbody.innerHTML = filtered.map(m => buildMovRow(m)).join('');
}

function buildMovRow(m) {
  const catNombre = m.categoriaId ? m.categoriaId.nombre : 'Sin categoría';
  const montoClass = m.tipo === 'Ingreso' ? 'monto-ingreso' : 'monto-gasto';
  const signo = m.tipo === 'Ingreso' ? '+' : '-';
  const metodoClass = m.metodo === 'Efectivo' ? 'metodo-efectivo' : 'metodo-transferencia';

  return `
    <tr>
      <td>${formatFecha(m.fecha)}</td>
      <td>${m.concepto}</td>
      <td>${catNombre}</td>
      <td><span class="metodo-badge ${metodoClass}">${m.metodo}</span></td>
      <td class="${montoClass}">${signo}${formatMonto(m.monto)}</td>
      <td>
        <button class="btn-action btn-edit" onclick="editMovimiento('${m._id}')">✏️ Editar</button>
        <button class="btn-action btn-delete" onclick="deleteMovimiento('${m._id}')">🗑️</button>
      </td>
    </tr>
  `;
}

// ========================================
// CATEGORÍAS — RENDERIZAR GRID
// ========================================

function renderCategoriasGrid() {
  const grid = document.getElementById('categorias-grid');
  if (allCategorias.length === 0) {
    grid.innerHTML = '<p class="empty-msg">No hay categorías creadas aún. Haz clic en "+ Nueva Categoría" para comenzar.</p>';
    return;
  }

  grid.innerHTML = allCategorias.map(c => `
    <div class="cat-card">
      <div class="cat-info">
        <span class="cat-dot ${c.tipo.toLowerCase()}"></span>
        <div>
          <div class="cat-name">${c.nombre}</div>
          <div class="cat-type">${c.tipo}</div>
        </div>
      </div>
      <button class="btn-action btn-delete" onclick="deleteCategoria('${c._id}')">🗑️</button>
    </div>
  `).join('');
}

// ========================================
// MODAL — MOVIMIENTOS (CREAR / EDITAR)
// ========================================

function openModal(tipoDefault) {
  document.getElementById('modal-movimiento').style.display = 'flex';
  document.getElementById('form-movimiento').reset();
  document.getElementById('mov-id').value = '';
  document.getElementById('modal-titulo').textContent = 'Nuevo Movimiento';

  // Si se abre desde "Ingresos" o "Gastos", pre-seleccionar el tipo
  if (tipoDefault) {
    document.getElementById('mov-tipo').value = tipoDefault;
  }

  // Poner fecha de hoy por defecto
  document.getElementById('mov-fecha').value = new Date().toISOString().split('T')[0];

  // Llenar el selector de categorías
  populateCategoriaSelect();
}

function closeModal() {
  document.getElementById('modal-movimiento').style.display = 'none';
}

function populateCategoriaSelect() {
  const select = document.getElementById('mov-categoria');
  select.innerHTML = allCategorias.map(c =>
    `<option value="${c._id}">${c.nombre} (${c.tipo})</option>`
  ).join('');

  if (allCategorias.length === 0) {
    select.innerHTML = '<option value="">— Crea una categoría primero —</option>';
  }
}

async function handleMovimiento(e) {
  e.preventDefault();
  const id = document.getElementById('mov-id').value;
  const body = {
    tipo: document.getElementById('mov-tipo').value,
    concepto: document.getElementById('mov-concepto').value.trim(),
    monto: Number(document.getElementById('mov-monto').value),
    categoriaId: document.getElementById('mov-categoria').value,
    metodo: document.getElementById('mov-metodo').value,
    fecha: document.getElementById('mov-fecha').value
  };

  if (!body.categoriaId) {
    alert('Debes crear al menos una categoría antes de registrar un movimiento.');
    return;
  }

  try {
    let res;
    if (id) {
      // Editar
      res = await authFetch(`/api/movimientos/${id}`, {
        method: 'PUT',
        body: JSON.stringify(body)
      });
    } else {
      // Crear
      res = await authFetch('/api/movimientos', {
        method: 'POST',
        body: JSON.stringify(body)
      });
    }

    if (res && res.ok) {
      closeModal();
      loadDashboard();
    }
  } catch (err) {
    console.error('Error al guardar movimiento:', err);
  }
}

function editMovimiento(id) {
  const m = allMovimientos.find(mov => mov._id === id);
  if (!m) return;

  openModal();
  document.getElementById('modal-titulo').textContent = 'Editar Movimiento';
  document.getElementById('mov-id').value = m._id;
  document.getElementById('mov-tipo').value = m.tipo;
  document.getElementById('mov-concepto').value = m.concepto;
  document.getElementById('mov-monto').value = m.monto;
  document.getElementById('mov-metodo').value = m.metodo;
  document.getElementById('mov-fecha').value = m.fecha ? m.fecha.split('T')[0] : '';

  // Seleccionar la categoría correcta
  const catId = m.categoriaId ? (m.categoriaId._id || m.categoriaId) : '';
  document.getElementById('mov-categoria').value = catId;
}

async function deleteMovimiento(id) {
  if (!confirm('¿Estás seguro de que deseas eliminar este movimiento?')) return;

  try {
    const res = await authFetch(`/api/movimientos/${id}`, { method: 'DELETE' });
    if (res && res.ok) {
      loadDashboard();
    }
  } catch (err) {
    console.error('Error al eliminar movimiento:', err);
  }
}

// ========================================
// MODAL — CATEGORÍAS (CREAR)
// ========================================

function openModalCategoria() {
  document.getElementById('modal-categoria').style.display = 'flex';
  document.getElementById('form-categoria').reset();
}

function closeModalCategoria() {
  document.getElementById('modal-categoria').style.display = 'none';
}

async function handleCategoria(e) {
  e.preventDefault();
  const body = {
    nombre: document.getElementById('cat-nombre').value.trim(),
    tipo: document.getElementById('cat-tipo').value
  };

  try {
    const res = await authFetch('/api/categorias', {
      method: 'POST',
      body: JSON.stringify(body)
    });
    if (res && res.ok) {
      closeModalCategoria();
      await loadCategorias();
    }
  } catch (err) {
    console.error('Error al crear categoría:', err);
  }
}

async function deleteCategoria(id) {
  if (!confirm('¿Estás seguro de que deseas eliminar esta categoría?')) return;

  try {
    const res = await authFetch(`/api/categorias/${id}`, { method: 'DELETE' });
    if (res && res.ok) {
      await loadCategorias();
    }
  } catch (err) {
    console.error('Error al eliminar categoría:', err);
  }
}

// ========================================
// INICIALIZACIÓN
// ========================================

document.addEventListener('DOMContentLoaded', () => {
  tryRestoreSession();
});
