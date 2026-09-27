const fs = require('fs');
let js = fs.readFileSync('public/app.js', 'utf8');

const regexOldLogic = /const banner = document\.getElementById\('banner-membresia'\);[\s\S]*?botonesAccion\.forEach\(btn => btn\.style\.display = 'flex'\);\n    \}/;

const newLogic = `
    const modal = document.getElementById('modal-membresia-vencida');
    const badge = document.getElementById('badge-membresia');
    const botonesAccion = document.querySelectorAll('#app .btn-accent, #app .btn-primary, #app .btn-action');
    
    // Calcular días restantes
    const hoy = new Date();
    const vencimiento = new Date(grupo.fechaVencimiento);
    const msDiff = vencimiento.getTime() - hoy.getTime();
    const diasRestantes = Math.ceil(msDiff / (1000 * 3600 * 24));

    if (grupo.estadoMembresia === 'Vencida' || diasRestantes <= 0) {
      // Bloqueo Estricto (SaaS Read-Only)
      if (modal) modal.style.display = 'flex';
      badge.style.background = 'rgba(239, 68, 68, 0.2)';
      badge.style.color = '#ef4444';
      badge.textContent = 'Membresía Vencida';
      
      // Ocultar botones de agregar, editar, eliminar
      botonesAccion.forEach(btn => btn.style.display = 'none');
      // Asegurar modo lectura en toda la app
      document.body.classList.add('readonly-mode');
    } else {
      // Plan Activo
      if (modal) modal.style.display = 'none';
      badge.style.background = 'rgba(16, 185, 129, 0.2)';
      badge.style.color = '#10b981';
      badge.textContent = \`Plan Activo (\${diasRestantes} días)\`;
      
      // Mostrar botones de acción
      botonesAccion.forEach(btn => btn.style.display = ''); // Restaurar
      document.body.classList.remove('readonly-mode');
    }
`;

js = js.replace(regexOldLogic, newLogic.trim());
fs.writeFileSync('public/app.js', js);
console.log('JS Logic updated');
