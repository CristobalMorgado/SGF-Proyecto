// ================================================
// SGF — Lógica del Cliente (Frontend)
// ================================================

const API = ''; // Mismo origen (vacío = relativo al servidor)
let token = null;
let userInfo = null; // { id, grupoId, rol }
let allMovimientos = [];
let globalMonth = new Date().getMonth();
let globalYear = new Date().getFullYear();
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
  if (!fechaStr) return '-';
  const d = new Date(fechaStr);
  return d.toLocaleDateString('es-CL');
}

// Formatear hora a HH:MM (ej: 17:44)
function formatHora(fechaStr) {
  if (!fechaStr) return '-';
  const d = new Date(fechaStr);
  return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });
}

// Decodificar payload del token JWT
function decodeToken(t) {
  try {
    const base64Url = t.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
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
  errorEl.innerHTML = '';

  try {
    const res = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (!res.ok) {
      if (data.bloqueado) {
        errorEl.innerHTML = `
          <div style="background: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; border-radius: 8px; padding: 12px; margin-top: 12px; color: #fca5a5; font-size: 13px; text-align: center; line-height: 1.4;">
            <i class="ph-bold ph-lock-key" style="font-size: 22px; display: block; margin-bottom: 6px; color: #f87171;"></i>
            <strong>${data.mensaje}</strong>
            <div style="margin-top: 8px;">
              <button type="button" onclick="abrirModalRecuperar()" style="background: #ef4444; border: none; color: white; border-radius: 6px; padding: 6px 12px; font-size: 12px; font-weight: 600; cursor: pointer;">
                Ver información de contacto
              </button>
            </div>
          </div>
        `;
      } else if (data.intentosRestantes !== undefined) {
        errorEl.innerHTML = `
          <div style="background: rgba(245, 158, 11, 0.15); border: 1px solid #f59e0b; border-radius: 8px; padding: 10px; margin-top: 10px; color: #fcd34d; font-size: 13px; text-align: center;">
            <i class="ph-bold ph-warning-circle" style="font-size: 16px; vertical-align: middle; margin-right: 4px;"></i>
            <span>${data.mensaje}</span>
          </div>
        `;
      } else {
        errorEl.textContent = data.mensaje || 'Error al iniciar sesión.';
      }
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

function abrirModalRecuperar() {
  const modal = document.getElementById('modal-recuperar-password');
  if (modal) modal.style.display = 'flex';
}

function cerrarModalRecuperar() {
  const modal = document.getElementById('modal-recuperar-password');
  if (modal) modal.style.display = 'none';
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

  if (nombre.length < 2) {
    errorEl.textContent = 'El nombre debe tener al menos 2 caracteres.';
    return;
  }
  if (!email.includes('@')) {
    errorEl.textContent = 'Ingresa un correo electrónico válido.';
    return;
  }
  if (password.length < 8) {
    errorEl.textContent = 'La contraseña debe tener al menos 8 caracteres.';
    return;
  }
  if (!/[A-Z]/.test(password)) {
    errorEl.textContent = 'La contraseña debe incluir al menos una letra mayúscula.';
    return;
  }
  if (!/\d/.test(password)) {
    errorEl.textContent = 'La contraseña debe incluir al menos un número.';
    return;
  }

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
  document.getElementById('user-name').textContent = userInfo.nombre || 'Usuario';
  renderUserAvatar(userInfo.avatar || 'default');
  const rolBadge = document.getElementById('user-role');
  rolBadge.textContent = userInfo.rol;

  const btnExcel = document.getElementById('btn-exportar-excel');
  const btnFamilia = document.getElementById('btn-nav-familia');

  document.body.dataset.rol = userInfo.rol;

  if (userInfo.rol === 'Administrador') {
    if (btnExcel) btnExcel.style.display = 'inline-flex';
    if (btnFamilia) btnFamilia.style.display = 'flex';
    rolBadge.classList.add('admin');
  } else {
    if (btnExcel) btnExcel.style.display = 'none';
    if (btnFamilia) btnFamilia.style.display = 'none';
    rolBadge.classList.remove('admin');
  }

  // Verificar membresia antes de cargar todo
  checkMembresia();

  // Cargar datos del dashboard
  inicializarFiltroMes(); navigateTo('dashboard'); loadDashboard();
}

function logout() {
  document.body.classList.remove('readonly-mode');
  document.body.removeAttribute('data-rol');
  renderUserAvatar('default');
  token = null;
  userInfo = null;
  localStorage.removeItem('sgf_token');

  const btnExcel = document.getElementById('btn-exportar-excel');
  if (btnExcel) btnExcel.style.display = 'none';
  const btnFamilia = document.getElementById('btn-nav-familia');
  if (btnFamilia) btnFamilia.style.display = 'none';
  const rolBadge = document.getElementById('user-role');
  if (rolBadge) rolBadge.classList.remove('admin');

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
  if (section === 'dashboard') {
    inicializarFiltroMes();
    loadDashboard();
  }
  if (section === 'ingresos') renderFilteredTable('Ingreso', 'tabla-ingresos');
  if (section === 'gastos') {
    renderFilteredTable('Gasto', 'tabla-gastos');
    renderAlertasPresupuesto();
  }
  if (section === 'categorias') loadCategorias();
  if (section === 'familia') loadFamilia();
}

// ========================================
// DASHBOARD — CARGAR DATOS
// ========================================

async function loadDashboard() {
  await Promise.all([loadMovimientos(), loadCategorias()]);
  await loadResumen(); // ahora local
  renderMovimientosTable();
  renderGraficos();
  renderAlertasPresupuesto();
}

async function loadResumen() {
  const currentMonth = globalMonth;
  const currentYear = globalYear;
  
  const movMes = allMovimientos.filter(m => {
    const d = new Date(m.fecha);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const totalIngresos = movMes.filter(m => m.tipo === 'Ingreso').reduce((acc, m) => acc + m.monto, 0);
  const totalGastos = movMes.filter(m => m.tipo === 'Gasto').reduce((acc, m) => acc + m.monto, 0);
  const saldoTotal = totalIngresos - totalGastos;
  const alertaDeficit = saldoTotal < 0;

  document.getElementById('total-ingresos').textContent = formatMonto(totalIngresos);
  document.getElementById('total-gastos').textContent = formatMonto(totalGastos);
  document.getElementById('saldo-total').textContent = formatMonto(saldoTotal);

  const alertaEl = document.getElementById('alerta-deficit');
  if (alertaEl) alertaEl.style.display = alertaDeficit ? 'block' : 'none';

  const saldoEl = document.getElementById('saldo-total');
  if (saldoEl) {
    saldoEl.style.color = saldoTotal < 0 ? '#ef4444' : '#3b82f6';
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

let filtroTipoDashboard = 'todos';

function cambiarFiltroTipo(tipo) {
  filtroTipoDashboard = tipo;
  renderMovimientosTable();
}

function renderMovimientosTable() {
  const tbody = document.getElementById('tabla-movimientos');
  const emptyMsg = document.getElementById('sin-movimientos');

  const currentMonth = globalMonth;
  const currentYear = globalYear;
  
  let movMes = allMovimientos.filter(m => {
    const d = new Date(m.fecha);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  if (filtroTipoDashboard !== 'todos') {
    movMes = movMes.filter(m => m.tipo === filtroTipoDashboard);
  }

  if (movMes.length === 0) {
    tbody.innerHTML = '';
    emptyMsg.style.display = 'block';
    emptyMsg.textContent = filtroTipoDashboard === 'todos' 
      ? 'No hay movimientos registrados aún.' 
      : `No hay ${filtroTipoDashboard.toLowerCase()}s registrados en este período.`;
    return;
  }

  emptyMsg.style.display = 'none';
  // En el dashboard, limitamos a los últimos 15 según el filtro activo
  tbody.innerHTML = movMes.slice(0, 15).map(m => buildMovRow(m, true)).join('');
}

function renderFilteredTable(tipo, tbodyId) {
  const currentMonth = globalMonth;
  const currentYear = globalYear;
  const filtered = allMovimientos.filter(m => {
    const d = new Date(m.fecha);
    return m.tipo === tipo && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  const tbody = document.getElementById(tbodyId);
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#64748b; padding:24px;">No hay ${tipo.toLowerCase()}s registrados.</td></tr>`;
    return;
  }
  tbody.innerHTML = filtered.map(m => buildMovRow(m, false)).join('');
}

function buildMovRow(m, showTipo = false) {
  const catNombre = m.categoriaId ? m.categoriaId.nombre : 'Sin categoría';
  const usuarioNombre = m.usuarioId ? (m.usuarioId.nombre || m.usuarioId.email || 'Usuario') : 'Usuario';
  const userAvatar = m.usuarioId && ['padre', 'madre', 'hijo'].includes(m.usuarioId.avatar)
    ? `<img src="/avatars/${m.usuarioId.avatar}.jpg" style="width:20px; height:20px; border-radius:50%; object-fit:cover; margin-right:6px; vertical-align:-4px; border:1px solid #3b82f6;">`
    : `<i class="ph ph-user" style="font-size:12px; margin-right:4px; color:#3b82f6;"></i>`;
  const montoClass = m.tipo === 'Ingreso' ? 'monto-ingreso' : 'monto-gasto';
  const signo = m.tipo === 'Ingreso' ? '+' : '-';
  let metodoClass = 'metodo-transferencia';
  if (m.metodo === 'Efectivo') metodoClass = 'metodo-efectivo';
  else if (m.metodo === 'Tarjeta') metodoClass = 'metodo-tarjeta';

  const tipoTd = showTipo
    ? (m.tipo === 'Ingreso'
        ? `<td style="text-align: center;"><span class="badge-tipo ingreso" title="Ingreso"><i class="ph-bold ph-trend-up"></i></span></td>`
        : `<td style="text-align: center;"><span class="badge-tipo gasto" title="Gasto"><i class="ph-bold ph-trend-down"></i></span></td>`)
    : '';

  return `
    <tr>
      ${tipoTd}
      <td>${formatFecha(m.fecha)}</td>
      <td><span style="color:#94a3b8; font-size:12px; font-weight:600;"><i class="ph ph-clock" style="margin-right:3px; vertical-align:-1px;"></i>${formatHora(m.fecha)}</span></td>
      <td><span style="font-weight:600; color:var(--text-color); font-size:13px;">${userAvatar}${usuarioNombre}</span></td>
      <td>${catNombre}</td>
      <td>${m.concepto}</td>
      <td><span class="metodo-badge ${metodoClass}">${m.metodo}</span></td>
      <td class="${montoClass}">${signo}${formatMonto(m.monto)}</td>
      <td style="text-align: center; white-space: nowrap;">
        ${userInfo && userInfo.rol === 'Administrador' ? `<button class="btn-action btn-edit" title="Editar" onclick="editMovimiento('${m._id}')"><i class="ph-bold ph-pencil-simple"></i></button>
        <button class="btn-action btn-delete" title="Eliminar" onclick="deleteMovimiento('${m._id}')"><i class="ph-bold ph-trash"></i></button>` : ''}
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
      ${userInfo.rol === 'Administrador' ? `<button class="btn-action btn-delete" onclick="deleteCategoria('${c._id}')"><i class="ph-bold ph-trash"></i> Eliminar</button>` : ''}
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

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');

  document.getElementById('mov-fecha').value = `${year}-${month}-${day}`;
  const horaEl = document.getElementById('mov-hora');
  if (horaEl) horaEl.value = `${hours}:${minutes}`;

  const groupTipo = document.getElementById('group-mov-tipo');
  
  if (tipoDefault) {
    document.getElementById('mov-tipo').value = tipoDefault;
    document.getElementById('modal-titulo').textContent = 'Nuevo ' + tipoDefault;
    if (groupTipo) groupTipo.style.display = 'none'; // Ocultar el selector de tipo
    populateCategoriaSelect(tipoDefault);
  } else {
    document.getElementById('mov-tipo').disabled = false;
    document.getElementById('modal-titulo').textContent = 'Nuevo Movimiento';
    if (groupTipo) groupTipo.style.display = 'block'; // Mostrar el selector
    const tipoActual = document.getElementById('mov-tipo').value || 'Ingreso';
    populateCategoriaSelect(tipoActual);
  }
}

function closeModal() {
  document.getElementById('modal-movimiento').style.display = 'none';
}

function populateCategoriaSelect(tipoFiltro, selectedCatId = '') {
  const select = document.getElementById('mov-categoria');
  if (!select) return;

  const tipo = tipoFiltro || document.getElementById('mov-tipo')?.value || 'Ingreso';
  const categoriasFiltradas = allCategorias.filter(c => c.tipo === tipo);

  if (categoriasFiltradas.length === 0) {
    select.innerHTML = `<option value="">— No hay categorías de ${tipo} creadas —</option>`;
  } else {
    select.innerHTML = categoriasFiltradas.map(c =>
      `<option value="${c._id}">${c.nombre}</option>`
    ).join('');
  }

  if (selectedCatId) {
    select.value = selectedCatId;
  }
}

async function handleMovimiento(e) {
  e.preventDefault();
  const id = document.getElementById('mov-id').value;
  const fechaVal = document.getElementById('mov-fecha').value;
  const horaVal = document.getElementById('mov-hora')?.value || '12:00';
  const fechaCompleta = new Date(`${fechaVal}T${horaVal}:00`);

  const concepto = document.getElementById('mov-concepto').value.trim();
  const monto = Number(document.getElementById('mov-monto').value);
  const categoriaId = document.getElementById('mov-categoria').value;
  const metodo = document.getElementById('mov-metodo').value;
  const tipo = document.getElementById('mov-tipo').value;

  if (!concepto || concepto.length < 2) {
    alert('El concepto debe contener al menos 2 caracteres.');
    return;
  }

  if (isNaN(monto) || monto <= 0) {
    alert('El monto debe ser un número válido mayor a 0.');
    return;
  }

  if (!categoriaId) {
    alert('Debes crear o seleccionar al menos una categoría antes de registrar un movimiento.');
    return;
  }

  const body = {
    tipo,
    concepto,
    monto,
    categoriaId,
    metodo,
    fecha: isNaN(fechaCompleta.getTime()) ? new Date().toISOString() : fechaCompleta.toISOString()
  };

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
      const data = await res.json();
      closeModal();
      inicializarFiltroMes();
      await loadDashboard();

      if (document.getElementById('section-gastos')?.style.display !== 'none') {
        renderFilteredTable('Gasto', 'tabla-gastos');
        renderAlertasPresupuesto();
      }
      if (document.getElementById('section-ingresos')?.style.display !== 'none') {
        renderFilteredTable('Ingreso', 'tabla-ingresos');
      }

      if (data && data.alertaPresupuesto) {
        const ap = data.alertaPresupuesto;
        if (ap.excedido) {
          alert(`🚨 ¡Alerta de Presupuesto Excedido!\nHas superado el 100% del presupuesto para "${ap.categoria}".\nGastaste ${formatMonto(ap.gastado)} de un tope de ${formatMonto(ap.presupuesto)} (${ap.porcentaje}%).`);
        } else {
          alert(`⚠️ Alerta de Presupuesto:\nHas alcanzado el ${ap.porcentaje}% del tope asignado para "${ap.categoria}".\nLlevas gastado ${formatMonto(ap.gastado)} de ${formatMonto(ap.presupuesto)}.`);
        }
      }
    } else if (res) {
      const data = await res.json();
      alert(data.mensaje || 'Error al guardar el movimiento.');
    }
  } catch (err) {
    console.error('Error al guardar movimiento:', err);
    alert('Error de conexión al guardar el movimiento.');
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

  if (m.fecha) {
    const d = new Date(m.fecha);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    document.getElementById('mov-fecha').value = `${year}-${month}-${day}`;
    const horaEl = document.getElementById('mov-hora');
    if (horaEl) horaEl.value = `${hours}:${minutes}`;
  }

  // Seleccionar la categoría correcta
  const catId = m.categoriaId ? (m.categoriaId._id || m.categoriaId) : '';
  populateCategoriaSelect(m.tipo, catId);
}

async function deleteMovimiento(id) {
  if (!confirm('¿Estás seguro de que deseas eliminar este movimiento?')) return;

  try {
    const res = await authFetch(`/api/movimientos/${id}`, { method: 'DELETE' });
    if (res && res.ok) {
      inicializarFiltroMes(); loadDashboard();
    }
  } catch (err) {
    console.error('Error al eliminar movimiento:', err);
  }
}

// ========================================
// MODAL — CATEGORÍAS (CREAR)
// ========================================

function openModalCategoria() {
  document.getElementById('form-categoria').reset();
  togglePresupuesto();
  document.getElementById('modal-categoria').style.display = 'flex';
}

function closeModalCategoria() {
  document.getElementById('modal-categoria').style.display = 'none';
  document.getElementById('form-categoria').reset();
  togglePresupuesto();
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
  const nombre = document.getElementById('cat-nombre').value.trim();
  const tipo = document.getElementById('cat-tipo').value;
  const presupuestoRaw = document.getElementById('cat-presupuesto').value;
  const presupuestoMensual = Number(presupuestoRaw) || 0;

  if (!nombre || nombre.length < 2) {
    alert('El nombre de la categoría debe tener al menos 2 caracteres.');
    return;
  }

  if (presupuestoMensual < 0) {
    alert('El presupuesto mensual no puede ser un número negativo.');
    return;
  }

  const body = {
    nombre,
    tipo,
    presupuestoMensual: tipo === 'Gasto' ? presupuestoMensual : 0
  };

  try {
    const res = await authFetch('/api/categorias', {
      method: 'POST',
      body: JSON.stringify(body)
    });
    if (res && res.ok) {
      closeModalCategoria();
      await loadCategorias();
    } else if (res) {
      const data = await res.json();
      alert(data.mensaje || 'Error al crear la categoría.');
    }
  } catch (err) {
    console.error('Error al crear categoría:', err);
    alert('Error de conexión al crear categoría.');
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
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">No hay miembros registrados</td></tr>';
    return;
  }

  usuarios.forEach(u => {
    const isSelf = u._id === userInfo.id;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${u.nombre}</td>
      <td>${u.email}</td>
      <td><span class="role-badge">${u.rol}</span></td>
      <td>${u.bloqueado ? '<span class="role-badge" style="background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3);"><i class="ph-bold ph-lock"></i> Bloqueado</span>' : '<span class="role-badge" style="background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3);"><i class="ph-bold ph-check-circle"></i> Activo</span>'}</td>
      <td>${formatFecha(u.createdAt)}</td>
      <td>
        ${!isSelf ? `${u.bloqueado ? `<button class="btn-edit" style="background:#10b981; color:white;" onclick="desbloquearMiembro('${u._id}', '${u.nombre}')"><i class="ph-bold ph-lock-open"></i> Desbloquear</button> ` : ''}<button class="btn-edit" onclick="resetPasswordMiembro('${u._id}', '${u.nombre}')"><i class="ph-bold ph-key"></i> Contraseña</button> <button class="btn-delete" onclick="eliminarMiembro('${u._id}')"><i class="ph-bold ph-trash"></i> Eliminar</button>` : '<span style="color:#64748b; font-size:12px;">Tú</span>'}
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
  const nombre = document.getElementById('m-nombre').value.trim();
  const email = document.getElementById('m-email').value.trim();
  const password = document.getElementById('m-password').value;

  if (nombre.length < 2) {
    alert('El nombre del miembro debe tener al menos 2 caracteres.');
    return;
  }
  if (!email.includes('@')) {
    alert('Ingresa un correo electrónico válido.');
    return;
  }
  if (password.length < 8) {
    alert('La contraseña provisional debe tener al menos 8 caracteres.');
    return;
  }
  if (!/[A-Z]/.test(password)) {
    alert('La contraseña provisional debe incluir al menos una letra mayúscula.');
    return;
  }
  if (!/\d/.test(password)) {
    alert('La contraseña provisional debe incluir al menos un número.');
    return;
  }

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

Chart.register(ChartDataLabels);

function renderGraficos() {
  const currentMonth = globalMonth;
  const currentYear = globalYear;

  const movMes = allMovimientos.filter(m => {
    const d = new Date(m.fecha);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const totalIngreso = movMes.filter(m => m.tipo === 'Ingreso').reduce((acc, m) => acc + m.monto, 0);
  const totalGasto = movMes.filter(m => m.tipo === 'Gasto').reduce((acc, m) => acc + m.monto, 0);

  const ctxBalance = document.getElementById('chart-balance');
  if (ctxBalance) {
    if (chartBalance) chartBalance.destroy();
    chartBalance = new Chart(ctxBalance, {
      type: 'bar',
      data: {
        labels: ['Ingresos', 'Gastos'],
        datasets: [{
          label: 'Monto',
          data: [totalIngreso, totalGasto],
          backgroundColor: [
            'rgba(16, 185, 129, 0.8)', // Ingreso gradient start
            'rgba(239, 68, 68, 0.8)'   // Gasto gradient start
          ],
          borderColor: ['#10b981', '#ef4444'],
          borderWidth: 1,
          borderRadius: 8,
          barPercentage: 0.6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1e293b',
            titleFont: { family: "'Poppins', sans-serif", size: 14 },
            bodyFont: { family: "'Poppins', sans-serif", size: 13, weight: 'bold' },
            padding: 12,
            callbacks: {
              label: (ctx) => ' ' + formatMonto(ctx.raw)
            }
          },
          datalabels: {
            display: true,
            color: '#94a3b8',
            font: { family: "'Poppins', sans-serif", weight: '600', size: 12 },
            anchor: 'end',
            align: 'top',
            formatter: (val) => formatMonto(val)
          }
        },
        scales: {
          y: { 
            beginAtZero: true,
            grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false },
            ticks: { color: '#64748b', font: { family: "'Poppins', sans-serif" }, callback: (val) => formatMonto(val) }
          },
          x: {
            grid: { display: false, drawBorder: false },
            ticks: { color: '#94a3b8', font: { family: "'Poppins', sans-serif", weight: '600', size: 13 } }
          }
        }
      }
    });
  }

  const gastosPorCat = {};
  movMes.filter(m => m.tipo === 'Gasto').forEach(g => {
    const catNom = g.categoriaId ? (g.categoriaId.nombre || 'Sin categoría') : 'Sin categoría';
    gastosPorCat[catNom] = (gastosPorCat[catNom] || 0) + g.monto;
  });

  const PALETA_DONUT = [
    '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#06b6d4',
    '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#3b82f6'
  ];

  const categoriasOrdenadas = Object.entries(gastosPorCat).sort((a, b) => b[1] - a[1]);
  const labelsGastos = categoriasOrdenadas.map(c => c[0]);
  const valoresGastos = categoriasOrdenadas.map(c => c[1]);
  const coloresGastos = labelsGastos.map((_, i) => PALETA_DONUT[i % PALETA_DONUT.length]);
  const totalGastosMes = valoresGastos.reduce((acc, v) => acc + v, 0);

  const ctxGastos = document.getElementById('chart-gastos');
  const centroEl = document.getElementById('donut-center');
  const vacioEl = document.getElementById('donut-empty');
  const leyendaEl = document.getElementById('legend-gastos');

  const escapeHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const pctDe = (v) => totalGastosMes > 0 ? Math.round((v / totalGastosMes) * 100) : 0;
  const marcarLeyenda = (idx) => {
    if (!leyendaEl) return;
    leyendaEl.querySelectorAll('.donut-legend-item').forEach(el => {
      el.classList.toggle('active', Number(el.dataset.index) === idx);
    });
  };

  if (leyendaEl) leyendaEl.innerHTML = '';

  if (!ctxGastos) return;

  if (chartGastos) { chartGastos.destroy(); chartGastos = null; }

  if (totalGastosMes <= 0) {
    if (centroEl) { centroEl.innerHTML = ''; centroEl.style.display = 'none'; }
    if (vacioEl) vacioEl.style.display = 'block';
    return;
  }

  if (vacioEl) vacioEl.style.display = 'none';
  if (centroEl) {
    centroEl.style.display = 'block';
    centroEl.innerHTML = '<span class="donut-center-label">Gastos del mes</span>' +
      '<span class="donut-center-value">' + formatMonto(totalGastosMes) + '</span>';
  }

  chartGastos = new Chart(ctxGastos, {
    type: 'doughnut',
    data: {
      labels: labelsGastos,
      datasets: [{
        data: valoresGastos,
        backgroundColor: coloresGastos,
        borderColor: '#1e293b',
        borderWidth: 3,
        borderRadius: 8,
        borderAlign: 'inner',
        hoverOffset: 10,
        hoverBorderColor: '#0f172a'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '55%',
      layout: { padding: 10 },
      animation: { animateRotate: true, animateScale: false, duration: 900, easing: 'easeOutQuart' },
      plugins: {
        legend: { display: false },
        datalabels: {
          display: (ctx) => (ctx.dataset.data[ctx.dataIndex] / totalGastosMes) * 100 >= 5,
          color: '#ffffff',
          font: { family: "'Poppins', sans-serif", weight: '600', size: 12 },
          textAlign: 'center',
          formatter: (value) => pctDe(value) + '%',
          textShadowColor: 'rgba(15, 23, 42, 0.6)',
          textShadowBlur: 4
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          borderColor: '#334155',
          borderWidth: 1,
          cornerRadius: 8,
          padding: 10,
          displayColors: false,
          titleFont: { family: "'Poppins', sans-serif", weight: '600', size: 13 },
          bodyFont: { family: "'Poppins', sans-serif", size: 12 },
          callbacks: {
            label: (context) => ' ' + formatMonto(context.raw) + ' (' + pctDe(context.raw) + '%)'
          }
        }
      },
      onHover: (event, activeElements) => {
        marcarLeyenda(activeElements.length ? activeElements[0].index : -1);
      }
    }
  });

  const resaltarPorcion = (i) => {
    if (!chartGastos) return;
    const arc = chartGastos.getDatasetMeta(0).data[i];
    if (!arc) return;
    const pos = { x: arc.x, y: arc.y };
    chartGastos.setActiveElements([{ datasetIndex: 0, index: i }]);
    chartGastos.tooltip.setActiveElements([{ datasetIndex: 0, index: i }], pos);
    chartGastos.update('none');
  };

  const limpiarResaltado = () => {
    if (!chartGastos) return;
    chartGastos.setActiveElements([]);
    chartGastos.tooltip.setActiveElements([], { x: 0, y: 0 });
    chartGastos.update('none');
  };

  if (leyendaEl) {
    leyendaEl.innerHTML = labelsGastos.map((cat, i) =>
      '<div class="donut-legend-item" data-index="' + i + '">' +
        '<span class="donut-legend-dot" style="background:' + coloresGastos[i] + '"></span>' +
        '<span class="donut-legend-name">' + escapeHtml(cat) + '</span>' +
        '<span class="donut-legend-pct">' + pctDe(valoresGastos[i]) + '%</span>' +
        '<span class="donut-legend-value">' + formatMonto(valoresGastos[i]) + '</span>' +
      '</div>'
    ).join('');

    leyendaEl.querySelectorAll('.donut-legend-item').forEach(el => {
      const idx = Number(el.dataset.index);
      el.addEventListener('mouseenter', () => { marcarLeyenda(idx); resaltarPorcion(idx); });
      el.addEventListener('mouseleave', () => { marcarLeyenda(-1); limpiarResaltado(); });
    });
  }
}

// ========================================
// ALERTAS DE PRESUPUESTO (HU08)
// ========================================
async function renderAlertasPresupuesto() {
  const containerDashboard = document.getElementById('presupuesto-alertas-container');
  const containerGastos = document.getElementById('presupuesto-alertas-container-gastos');
  
  if (containerDashboard) containerDashboard.innerHTML = '';
  if (containerGastos) containerGastos.innerHTML = '';

  const currentMonth = globalMonth;
  const currentYear = globalYear;
  const movMes = allMovimientos.filter(m => {
    const d = new Date(m.fecha);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const gastos = movMes.filter(m => m.tipo === 'Gasto');
  const gastosPorCat = {};
  const gastosPorCatId = {};
  gastos.forEach(g => {
    if (g.categoriaId) {
      const catId = g.categoriaId._id ? String(g.categoriaId._id) : String(g.categoriaId);
      const catNom = g.categoriaId.nombre || 'Sin categoría';
      gastosPorCatId[catId] = (gastosPorCatId[catId] || 0) + g.monto;
      gastosPorCat[catNom] = (gastosPorCat[catNom] || 0) + g.monto;
    }
  });

  try {
    const res = await authFetch('/api/categorias');
    if (!res || !res.ok) return;
    const cats = await res.json();
    
    cats.forEach(c => {
      if (c.presupuestoMensual > 0) {
        const cId = String(c._id);
        const gastado = gastosPorCatId[cId] || gastosPorCat[c.nombre] || 0;
        const porcentaje = (gastado / c.presupuestoMensual) * 100;

        if (porcentaje >= 80) {
          const isDanger = porcentaje >= 100;
          const icon = isDanger ? '<i class="ph-fill ph-warning-circle" style="font-size:22px;"></i>' : '<i class="ph-fill ph-warning" style="font-size:22px;"></i>';
          const msj = isDanger 
            ? `Excediste tu presupuesto para "<strong>${c.nombre}</strong>". Gastaste ${formatMonto(gastado)} de un tope de ${formatMonto(c.presupuestoMensual)} (${porcentaje.toFixed(1)}%).`
            : `Alerta: Estás al ${porcentaje.toFixed(1)}% de tu presupuesto para "<strong>${c.nombre}</strong>". Llevas gastado ${formatMonto(gastado)} de ${formatMonto(c.presupuestoMensual)}.`;

          const alertCard = document.createElement('div');
          alertCard.style.padding = '14px 18px';
          alertCard.style.borderRadius = '10px';
          alertCard.style.backgroundColor = isDanger ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)';
          alertCard.style.border = `1px solid ${isDanger ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`;
          alertCard.style.borderLeft = `4px solid ${isDanger ? '#ef4444' : '#f59e0b'}`;
          alertCard.style.color = isDanger ? '#ef4444' : '#f59e0b';
          alertCard.style.fontWeight = '500';
          alertCard.style.fontSize = '14px';
          alertCard.style.display = 'flex';
          alertCard.style.alignItems = 'center';
          alertCard.style.gap = '10px';
          alertCard.style.boxShadow = '0 4px 6px rgba(0,0,0,0.05)';
          alertCard.innerHTML = `${icon} <span>${msj}</span>`;

          if (containerDashboard) {
            containerDashboard.appendChild(alertCard.cloneNode(true));
          }
          if (containerGastos) {
            containerGastos.appendChild(alertCard.cloneNode(true));
          }
        }
      }
    });
  } catch (err) {
    console.error('Error alertas presupuesto', err);
  }
}

// ========================================
// EXPORTAR A EXCEL (HU09)
// ========================================
function exportarExcel() {
  if (!userInfo || userInfo.rol !== 'Administrador') {
    alert('Acceso restringido: Solo el Administrador puede exportar reportes a Excel.');
    return;
  }

  if (allMovimientos.length === 0) {
    alert('No hay movimientos para exportar.');
    return;
  }

  
  const currentMonth = globalMonth;
  const currentYear = globalYear;
  const movMes = allMovimientos.filter(m => {
    const d = new Date(m.fecha);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  if (movMes.length === 0) {
    alert('No hay movimientos en este mes para exportar.');
    return;
  }

  const dataExcel = movMes.map(m => ({
    Fecha: formatFecha(m.fecha),
    Hora: formatHora(m.fecha),
    Usuario: m.usuarioId ? (m.usuarioId.nombre || m.usuarioId.email || 'Usuario') : 'Usuario',
    Categoría: m.categoriaId ? m.categoriaId.nombre : 'Sin Categoría',
    Concepto: m.concepto,
    Método: m.metodo || 'No especificado',
    Tipo: m.tipo,
    Monto: m.monto
  }));

  const worksheet = XLSX.utils.json_to_sheet(dataExcel);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Movimientos');

  const mesActual = document.getElementById('texto-mes-actual') ? document.getElementById('texto-mes-actual').textContent.replace(' ', '_') : 'Mes';
  XLSX.writeFile(workbook, `Reporte_Financiero_${mesActual}.xlsx`);
}

// ========================================
// CONTROL DE MEMBRESÍA (HU05)
// ========================================
async function checkMembresia() {
  try {
    const res = await authFetch('/api/grupos/me');
    if (!res) return;
    if (!res.ok) {
      const b = document.getElementById('badge-membresia');
      if (b) b.textContent = 'Error de Servidor (Reinicia Node)';
      return;
    }
    const grupo = await res.json();
    
    const modal = document.getElementById('modal-membresia-vencida');
    const badge = document.getElementById('badge-membresia');
    const botonesAccion = document.querySelectorAll('#app .btn-accent, #app .btn-primary, #app .btn-action');
    
    const hoy = new Date();
    const vencimiento = new Date(grupo.fechaVencimiento);
    const msDiff = vencimiento.getTime() - hoy.getTime();
    const diasRestantes = Math.ceil(msDiff / (1000 * 3600 * 24));

    if (grupo.estadoMembresia === 'Vencida' || diasRestantes <= 0) {
      if (modal) modal.style.display = 'flex';
      if (badge) {
        badge.style.background = 'rgba(239, 68, 68, 0.2)';
        badge.style.color = '#ef4444';
        badge.textContent = 'Membresía Vencida';
      }
      botonesAccion.forEach(btn => btn.style.display = 'none');
      document.body.classList.add('readonly-mode');
    } else {
      if (modal) modal.style.display = 'none';
      if (badge) {
        badge.style.background = 'rgba(16, 185, 129, 0.2)';
        badge.style.color = '#10b981';
        badge.textContent = `Plan Activo (${diasRestantes} días)`;
      }
      botonesAccion.forEach(btn => btn.style.display = ''); 
      document.body.classList.remove('readonly-mode');
    }
  } catch (err) {
    console.error('Error verificando membresía', err);
  }
}


// ========================================
// CUSTOM MONTH PICKER
// ========================================
let pickerYear = new Date().getFullYear();

function inicializarFiltroMes() {
  const label = document.getElementById('texto-mes-actual');
  if (label) {
    const nombreCompletos = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    label.textContent = `${nombreCompletos[globalMonth]} ${globalYear}`;
  }
}

function toggleMonthPicker() {
  const dp = document.getElementById('picker-dropdown');
  if (dp.style.display === 'none' || dp.style.display === '') {
    pickerYear = globalYear;
    renderPickerMonths();
    dp.style.display = 'block';
  } else {
    dp.style.display = 'none';
  }
}

function changePickerYear(delta) {
  pickerYear += delta;
  renderPickerMonths();
}

function selectPickerMonth(mIndex) {
  globalMonth = mIndex;
  globalYear = pickerYear;
  inicializarFiltroMes();
  document.getElementById('picker-dropdown').style.display = 'none';
  
  // Refrescar la vista actual (Dashboard o Tablas)
  if (document.getElementById('section-dashboard').style.display === 'block') {
    loadDashboard();
  } else if (document.getElementById('section-ingresos').style.display === 'block') {
    renderFilteredTable('Ingreso', 'tabla-ingresos');
  } else if (document.getElementById('section-gastos').style.display === 'block') {
    renderFilteredTable('Gasto', 'tabla-gastos');
  }
}

function renderPickerMonths() {
  document.getElementById('picker-year').textContent = pickerYear;
  const grid = document.getElementById('picker-months-grid');
  const nombreMeses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  
  let html = '';
  for(let i=0; i<12; i++) {
    let isSelected = (i === globalMonth && pickerYear === globalYear);
    let btnClass = isSelected ? 'picker-month-btn selected' : 'picker-month-btn';
    html += `<button type="button" class="${btnClass}" onclick="selectPickerMonth(${i})">${nombreMeses[i]}</button>`;
  }
  grid.innerHTML = html;
}

// Cerrar picker al hacer clic afuera
document.addEventListener('click', (e) => {
  const picker = document.getElementById('contenedor-mes');
  if (picker && !picker.contains(e.target)) {
    const dp = document.getElementById('picker-dropdown');
    if (dp) dp.style.display = 'none';
  }
});




// --- SIMULADOR DE PAGO SAAS ---
async function simularPago() {
  const btn = document.getElementById('btn-simular-pago');
  const originalText = btn.innerHTML;
  btn.innerHTML = '<i class="ph-bold ph-spinner ph-spin"></i> Procesando Pago...';
  btn.disabled = true;

  try {
    const res = await fetch('/api/grupos/simular-pago', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('sgf_token') || token}`
      }
    });

    if (res.ok) {
      setTimeout(() => {
        alert('¡Pago procesado con éxito! Tu membresía SGF ha sido renovada por 30 días.');
        window.location.reload(); // Recargar para limpiar bloqueos de UI
      }, 1500); // Pequeña demora para que se vea la animación
    } else {
      btn.innerHTML = originalText;
      btn.disabled = false;
      alert('Hubo un error procesando el pago.');
    }
  } catch (error) {
    btn.innerHTML = originalText;
    btn.disabled = false;
    console.error('Error simulando pago:', error);
  }
}



// === GESTIÓN DE AVATAR FAMILIAR ===
function renderUserAvatar(avatarKey) {
  const avatarEl = document.getElementById('header-user-avatar');
  if (!avatarEl) return;
  
  if (avatarKey && ['padre', 'madre', 'hijo'].includes(avatarKey)) {
    avatarEl.innerHTML = `<img src="/avatars/${avatarKey}.jpg" alt="${avatarKey}">`;
    avatarEl.style.padding = '0';
    avatarEl.style.overflow = 'hidden';
  } else {
    avatarEl.innerHTML = `<i class="ph-fill ph-user"></i>`;
    avatarEl.style.padding = '';
    avatarEl.style.overflow = '';
  }
}

function seleccionarAvatar(key) {
  const hiddenInput = document.getElementById('perfil-avatar');
  if (hiddenInput) hiddenInput.value = key;
  document.querySelectorAll('.avatar-card-option').forEach(el => {
    el.classList.remove('active');
  });
  const opt = document.getElementById(`avatar-opt-${key}`);
  if (opt) opt.classList.add('active');
}

// === GESTIÓN DE PERFIL ===
async function abrirPerfil() {
  try {
    const res = await fetch('/api/usuarios/me', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('sgf_token') || token}` }
    });
    if (res.ok) {
      const data = await res.json();
      document.getElementById('perfil-nombre').value = data.usuario.nombre || '';
      document.getElementById('perfil-email').value = data.usuario.email || '';
      document.getElementById('perfil-current-password').value = '';
      document.getElementById('perfil-new-password').value = '';
      const currentAvatar = data.usuario.avatar || 'padre';
      seleccionarAvatar(currentAvatar);
      document.getElementById('modal-perfil').style.display = 'flex';
    } else {
      const text = await res.text();
      alert('Error del servidor: ' + res.status + ' - ' + text);
    }
  } catch (error) {
    alert('Error JS al abrir perfil: ' + error.message);
  }
}

async function guardarPerfil(e) {
  e.preventDefault();
  const nombre = document.getElementById('perfil-nombre').value;
  const currentPassword = document.getElementById('perfil-current-password').value;
  const newPassword = document.getElementById('perfil-new-password').value;
  const avatar = document.getElementById('perfil-avatar')?.value || 'padre';

  if (newPassword) {
    if (newPassword.length < 8) {
      alert('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      alert('La nueva contraseña debe incluir al menos una letra mayúscula.');
      return;
    }
    if (!/\d/.test(newPassword)) {
      alert('La nueva contraseña debe incluir al menos un número.');
      return;
    }
    if (!currentPassword) {
      alert('Debes ingresar tu contraseña actual para poder cambiarla.');
      return;
    }
  }

  const payload = { nombre: nombre.trim(), avatar };
  if (newPassword) {
    payload.password = newPassword;
    payload.currentPassword = currentPassword;
  }

  try {
    const res = await fetch('/api/usuarios/me', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('sgf_token') || token}`
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (res.ok) {
      alert('Perfil actualizado correctamente.');
      document.getElementById('user-name').textContent = data.nombre;
      renderUserAvatar(data.avatar);
      if (userInfo) userInfo.avatar = data.avatar;
      document.getElementById('modal-perfil').style.display = 'none';
    } else {
      alert(data.mensaje || 'Error al actualizar perfil');
    }
  } catch (error) {
    console.error('Error guardando perfil:', error);
    alert('Ocurrió un error inesperado al guardar el perfil.');
  }
}

// === RESTABLECER CONTRASEÑA DE MIEMBRO (UC11 - SysAdmin) ===
async function resetPasswordMiembro(userId, nombre) {
  const newPassword = prompt(`Ingresa la nueva contraseña para ${nombre} (mínimo 8 caracteres, números y al menos 1 mayúscula):`);
  if (!newPassword) return;

  if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
    alert('La contraseña debe tener al menos 8 caracteres, incluir números y al menos una letra mayúscula.');
    return;
  }

  try {
    const res = await authFetch(`/api/usuarios/${userId}/reset-password`, {
      method: 'PUT',
      body: JSON.stringify({ newPassword })
    });

    if (!res) return;

    const data = await res.json();
    if (res.ok) {
      alert(data.mensaje);
    } else {
      alert(data.mensaje || 'Error al restablecer contraseña.');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error de conexión al restablecer contraseña.');
  }
}

// === DESBLOQUEAR CUENTA DE MIEMBRO (Admin) ===
async function desbloquearMiembro(userId, nombre) {
  if (!confirm(`¿Deseas desbloquear el acceso para ${nombre}?`)) return;

  try {
    const res = await authFetch(`/api/usuarios/${userId}/desbloquear`, {
      method: 'PUT'
    });

    if (!res) return;

    const data = await res.json();
    if (res.ok) {
      alert(data.mensaje || 'Cuenta desbloqueada exitosamente.');
      loadFamilia();
    } else {
      alert(data.mensaje || 'Error al desbloquear usuario.');
    }
  } catch (error) {
    console.error('Error al desbloquear:', error);
    alert('Error de conexión al desbloquear usuario.');
  }
}

