const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');

// Eliminar el banner gigante
const bannerRegex = /<!-- BANNER MEMBRESIA \(HU05\) -->[\s\S]*?<\/div>/;
html = html.replace(bannerRegex, '');

// Agregar el nuevo Modal de Membresía
const modalHTML = `
    <!-- MODAL MEMBRESÍA VENCIDA -->
    <div id="modal-membresia-vencida" class="modal-overlay" style="display:none; z-index:99999;">
      <div class="modal-card" style="text-align:center; max-width: 400px; padding: 2rem;">
        <div style="font-size: 40px; margin-bottom: 10px;">⏳</div>
        <h3 style="margin-bottom: 15px; color:#ef4444;">Período de Prueba Finalizado</h3>
        <p style="color:var(--text-color); margin-bottom: 20px; font-size: 14px; line-height: 1.5;">
          Tu membresía ha vencido. La plataforma ha pasado a modo <b>Solo Lectura</b>. <br><br>
          Podrás seguir navegando y exportando tus reportes a Excel, pero no podrás registrar nuevos movimientos ni modificar configuraciones hasta que renueves tu plan.
        </p>
        <button class="btn-secondary" onclick="document.getElementById('modal-membresia-vencida').style.display='none'" style="width:100%; border: 1px solid #475569; border-radius: 6px; padding: 0.75rem; background: transparent; color: var(--text-color); cursor: pointer; font-weight: bold;">Entendido</button>
      </div>
    </div>
`;

// Insertar justo al final del app o junto a otros modales
if (!html.includes('id="modal-membresia-vencida"')) {
  html = html.replace('<div id="modal-movimiento"', modalHTML + '\n    <div id="modal-movimiento"');
}

fs.writeFileSync('public/index.html', html);
console.log('HTML Modal Added and Banner Removed');
