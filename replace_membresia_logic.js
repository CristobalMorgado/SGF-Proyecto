const fs = require('fs');
let js = fs.readFileSync('public/app.js', 'utf8');

const targetOnLogin = `    document.getElementById('btn-nav-familia').style.display = 'flex';
  }

  // Cargar datos del dashboard
  loadDashboard();
}`;

const replacementOnLogin = `    document.getElementById('btn-nav-familia').style.display = 'flex';
  }

  // Verificar membresia antes de cargar todo
  checkMembresia();

  // Cargar datos del dashboard
  loadDashboard();
}`;

if (js.includes(targetOnLogin)) {
  js = js.replace(targetOnLogin, replacementOnLogin);
}

// Append new function
const newLogic = `
// ========================================
// CONTROL DE MEMBRESÍA (HU05)
// ========================================

async function checkMembresia() {
  try {
    const res = await authFetch('/api/grupos/me');
    if (!res) return;
    const grupo = await res.json();
    
    const banner = document.getElementById('banner-membresia');
    const badge = document.getElementById('badge-membresia');
    const botonesAccion = document.querySelectorAll('.btn-accent, .btn-primary');
    
    // Calcular días restantes
    const hoy = new Date();
    const vencimiento = new Date(grupo.fechaVencimiento);
    const msDiff = vencimiento.getTime() - hoy.getTime();
    const diasRestantes = Math.ceil(msDiff / (1000 * 3600 * 24));

    if (grupo.estadoMembresia === 'Vencida' || diasRestantes <= 0) {
      // Bloqueo Estricto
      banner.style.display = 'block';
      badge.style.background = 'rgba(239, 68, 68, 0.2)';
      badge.style.color = '#ef4444';
      badge.textContent = 'Membresía Vencida';
      
      // Ocultar botones de agregar
      botonesAccion.forEach(btn => btn.style.display = 'none');
    } else {
      // Plan Activo
      banner.style.display = 'none';
      badge.style.background = 'rgba(16, 185, 129, 0.2)';
      badge.style.color = '#10b981';
      badge.textContent = \`Plan Activo (\${diasRestantes} días)\`;
      
      botonesAccion.forEach(btn => btn.style.display = 'flex');
    }
  } catch (err) {
    console.error('Error verificando membresía', err);
  }
}
`;

fs.writeFileSync('public/app.js', js + newLogic);
console.log('checkMembresia added successfully');
