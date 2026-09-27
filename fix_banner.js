const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');

const targetApp = '<div id="app" class="app" style="display:none">';
const replacementApp = `<div id="app" class="app" style="display:none">
    <!-- BANNER MEMBRESIA (HU05) -->
    <div id="banner-membresia" style="display:none; width:100%; background-color:#ef4444; color:white; text-align:center; padding:10px; z-index:9999; font-weight:bold;">
      ⛔ Tu período de prueba ha finalizado. La plataforma está en modo 'Solo Lectura'. Renueva tu suscripción para registrar operaciones.
    </div>`;

if(html.includes(targetApp)) {
  html = html.replace(targetApp, replacementApp);
  fs.writeFileSync('public/index.html', html);
  console.log('Banner injected into HTML correctly.');
} else {
  console.log('Could not find the app div.');
}
