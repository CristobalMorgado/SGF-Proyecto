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
  if (section === 'familia') loadFamilia();
}

// ========================================
// DASHBOARD — CARGAR DATOS
// ========================================

async function loadDashboard() {
  await Promise.all([loadResumen(), loadMovimientos(), loadCategorias()]);
  renderMovimientosTable();
  renderGraficos();
  renderAlertasPresupuesto();
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

  grid.innerHTML = allCategorias.map(c => {
    let budgetText = '';
    if (c.tipo === 'Gasto' && c.presupuestoMensual > 0) {
      budgetText = `<div style="font-size:12px; color:#94a3b8; margin-top:4px;">Tope: ${formatMonto(c.presupuestoMensual)}</div>`;
    }
    return `
    <div class="cat-card">
      <div class="cat-info">
        <span class="cat-dot ${c.tipo.toLowerCase()}"></span>
        <div>
          <div class="cat-name">${c.nombre}</div>
          <div class="cat-type">${c.tipo}</div>
          ${budgetText}
        </div>
      </div>
      <button class="btn-action btn-delete" onclick="deleteCategoria('${c._id}')">🗑️</button>
    </div>
  `}).join('');
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

function togglePresupuesto() {
  const tipo = document.getElementById('cat-tipo').value;
  const group = document.getElementById('group-presupuesto');
  if (tipo === 'Gasto') {
    group.style.display = 'block';
  } else {
    group.style.display = 'none';
    document.getElementById('cat-presupuesto').value = '';
  }
}

async function handleCategoria(e) {
  e.preventDefault();
  const body = {
      nombre: document.getElementById('cat-nombre').value.trim(),
      tipo: document.getElementById('cat-tipo').value,
      presupuestoMensual: Number(document.getElementById('cat-presupuesto').value) || 0
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
// ========================================
// GESTIÓN DE FAMILIA (ADMIN)
// ========================================

async function loadFamilia() {
  const res = await authFetch('/api/usuarios');
  if (!res) return;
  const usuarios = await res.json();
  
  const tbody = document.getElementById('tabla-familia');
  tbody.innerHTML = '';

  if (usuarios.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">No hay miembros registrados</td></tr>';
    return;
  }

  usuarios.forEach(u => {
    const isSelf = u._id === userInfo.id;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${u.nombre}</td>
      <td>${u.email}</td>
      <td><span class="role-badge">${u.rol}</span></td>
      <td>${formatFecha(u.createdAt)}</td>
      <td>
        ${!isSelf ? `<button class="btn-delete" onclick="eliminarMiembro('${u._id}')">🗑️</button>` : '<span style="color:#64748b; font-size:12px;">Tú</span>'}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function openModalMiembro() {
  document.getElementById('form-miembro').reset();
  document.getElementById('modal-miembro').style.display = 'flex';
}

function closeModalMiembro() {
  document.getElementById('modal-miembro').style.display = 'none';
}

async function handleMiembro(e) {
  e.preventDefault();
  const nombre = document.getElementById('m-nombre').value;
  const email = document.getElementById('m-email').value;
  const password = document.getElementById('m-password').value;

  const res = await authFetch('/api/usuarios', {
    method: 'POST',
    body: JSON.stringify({ nombre, email, password })
  });

  if (!res) return;

  const data = await res.json();
  if (res.ok) {
    alert('Miembro agregado exitosamente');
    closeModalMiembro();
    loadFamilia();
  } else {
    alert(data.mensaje || 'Error al agregar miembro');
  }
}

async function eliminarMiembro(id) {
  if (!confirm('¿Estás seguro de eliminar a este miembro del grupo familiar? Perderá el acceso al sistema.')) return;

  const res = await authFetch('/api/usuarios/' + id, {
    method: 'DELETE'
  });

  if (!res) return;

  if (res.ok) {
    alert('Miembro eliminado');
    loadFamilia();
  } else {
    const data = await res.json();
    alert(data.mensaje || 'Error al eliminar');
  }
}
// ========================================
// GRÁFICOS (Chart.js)
// ========================================

let chartGastos = null;
let chartBalance = null;

function renderGraficos() {
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  // Filtrar movimientos del mes actual
  const movMes = allMovimientos.filter(m => {
    const d = new Date(m.fecha);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  // 1. Gráfico de Balance (Ingreso vs Gasto)
  const totalIngreso = movMes.filter(m => m.tipo === 'Ingreso').reduce((acc, m) => acc + m.monto, 0);
  const totalGasto = movMes.filter(m => m.tipo === 'Gasto').reduce((acc, m) => acc + m.monto, 0);

  const ctxBalance = document.getElementById('chart-balance');
  if (ctxBalance) {
    if (chartBalance) chartBalance.destroy();
    
    // Configurar color de fuente global para Chart.js para que resalte en tema oscuro
    Chart.defaults.color = '#cbd5e1'; 

    chartBalance = new Chart(ctxBalance, {
      type: 'bar',
      data: {
        labels: ['Ingresos', 'Gastos'],
        datasets: [{
          label: 'Total Mensual ($)',
          data: [totalIngreso, totalGasto],
          backgroundColor: ['#10b981', '#ef4444'], // Verde y Rojo
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        scales: { 
          y: { 
            beginAtZero: true,
            grid: { color: '#334155' }
          },
          x: {
            grid: { display: false }
          }
        },
        plugins: { legend: { display: false } }
      }
    });
  }

  // 2. Gráfico de Dona (Distribución de Gastos)
  const gastos = movMes.filter(m => m.tipo === 'Gasto');
  const categoriasMap = {};

  gastos.forEach(g => {
    // categoriaId puede venir populado desde el backend
    const catNombre = g.categoriaId ? (g.categoriaId.nombre || 'Sin Categoría') : 'Sin Categoría';
    categoriasMap[catNombre] = (categoriasMap[catNombre] || 0) + g.monto;
  });

  const catLabels = Object.keys(categoriasMap);
  const catData = Object.values(categoriasMap);

  const ctxGastos = document.getElementById('chart-gastos');
  if (ctxGastos) {
    if (chartGastos) chartGastos.destroy();
    
    // Paleta de colores cálidos y fríos variados
    const bgColors = [
      '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1', '#f43f5e', '#84cc16'
    ];

    chartGastos = new Chart(ctxGastos, {
      type: 'doughnut',
      data: {
        labels: catLabels.length ? catLabels : ['Sin Gastos'],
        datasets: [{
          data: catData.length ? catData : [1],
          backgroundColor: catData.length ? bgColors.slice(0, catData.length) : ['#334155'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'right', labels: { padding: 20 } }
        },
        cutout: '70%'
      }
    });
  }
}

// ========================================
// ALERTAS DE PRESUPUESTO (HU08)
// ========================================

function renderAlertasPresupuesto() {
  const container = document.getElementById('presupuesto-alertas-container');
  if (!container) return;
  container.innerHTML = ''; // Limpiar

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  // Filtrar movimientos de "Gasto" del mes actual
  const gastosMes = allMovimientos.filter(m => {
    const d = new Date(m.fecha);
    return m.tipo === 'Gasto' && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  let alertasHtml = '';

  allCategorias.forEach(cat => {
    // Solo revisar categorías de Gasto que tengan un presupuesto > 0
    if (cat.tipo === 'Gasto' && cat.presupuestoMensual > 0) {
      // Sumar los gastos que pertenecen a esta categoría
      const sumaGastos = gastosMes
        .filter(g => (g.categoriaId._id || g.categoriaId) === cat._id)
        .reduce((acc, curr) => acc + curr.monto, 0);

      const porcentaje = (sumaGastos / cat.presupuestoMensual) * 100;

      // Generar alerta si supera el 80% (Criterio HU08)
      if (porcentaje >= 80) {
        // Color: Amarillo si está entre 80 y 99%, Rojo si superó el 100%
        const isOverBudget = porcentaje >= 100;
        const colorBg = isOverBudget ? '#fef2f2' : '#fefce8';
        const colorBorder = isOverBudget ? '#ef4444' : '#eab308';
        const colorText = isOverBudget ? '#991b1b' : '#854d0e';
        
        alertasHtml += `
          <div style="background-color: ${colorBg}; border-left: 4px solid ${colorBorder}; padding: 1rem; border-radius: 4px;">
            <p style="color: ${colorText}; margin: 0; font-weight: bold;">
              ⚠️ Alerta de Presupuesto: ${cat.nombre}
            </p>
            <p style="color: ${colorText}; margin: 5px 0 0 0; font-size: 14px;">
              Llevas gastado ${formatMonto(sumaGastos)} de un presupuesto de ${formatMonto(cat.presupuestoMensual)}. 
              (${porcentaje.toFixed(1)}%)
            </p>
          </div>
        `;
      }
    }
  });

  if (alertasHtml) {
    container.innerHTML = alertasHtml;
  }
}
