const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');

const targetApp = '<div id="app" class="layout" style="display:none">';
const replacementApp = `<div id="app" class="layout" style="display:none">
    <!-- BANNER MEMBRESIA (HU05) -->
    <div id="banner-membresia" style="display:none; position:fixed; top:0; left:0; width:100%; background-color:#ef4444; color:white; text-align:center; padding:10px; z-index:9999; font-weight:bold;">
      ⛔ Tu período de prueba ha finalizado. La plataforma está en modo 'Solo Lectura'. Renueva tu suscripción para registrar operaciones.
    </div>`;

if(html.includes(targetApp)) html = html.replace(targetApp, replacementApp);

const targetSidebar = '<div class="sidebar-footer">';
const replacementSidebar = `<div class="sidebar-footer">
          <div id="badge-membresia" style="background:rgba(16, 185, 129, 0.2); color:#10b981; padding:5px 10px; border-radius:12px; font-size:12px; font-weight:bold; margin-bottom:10px; text-align:center;">Verificando Plan...</div>`;

if(html.includes(targetSidebar)) html = html.replace(targetSidebar, replacementSidebar);

fs.writeFileSync('public/index.html', html);
console.log('HTML modified successfully');
