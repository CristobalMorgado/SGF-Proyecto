const fs = require('fs');
let js = fs.readFileSync('public/app.js', 'utf8');

const regexToggle = /async function handleCategoria/;
const replacementToggle = `function togglePresupuesto() {
  const tipo = document.getElementById('cat-tipo').value;
  const group = document.getElementById('group-presupuesto');
  if (tipo === 'Gasto') {
    group.style.display = 'block';
  } else {
    group.style.display = 'none';
    document.getElementById('cat-presupuesto').value = '';
  }
}

async function handleCategoria`;

js = js.replace(regexToggle, replacementToggle);

const regexHandle = /const body = \{\s*nombre: document.getElementById\('cat-nombre'\)\.value\.trim\(\),\s*tipo: document\.getElementById\('cat-tipo'\)\.value\s*\};/;
const replacementHandle = `const body = {
      nombre: document.getElementById('cat-nombre').value.trim(),
      tipo: document.getElementById('cat-tipo').value,
      presupuestoMensual: Number(document.getElementById('cat-presupuesto').value) || 0
    };`;

js = js.replace(regexHandle, replacementHandle);

// Now for the dashboard alerts
const regexDashboard = /renderMovimientosTable\(\);\s*renderGraficos\(\);/;
const replacementDashboard = `renderMovimientosTable();
  renderGraficos();
  renderAlertasPresupuesto();`;

js = js.replace(regexDashboard, replacementDashboard);

fs.writeFileSync('public/app.js', js);
console.log('App.js modified successfully');
