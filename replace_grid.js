const fs = require('fs');
let js = fs.readFileSync('public/app.js', 'utf8');

const regexGrid = /function renderCategoriasGrid\(\) \{[\s\S]*?join\(''\);\s*\}/;
const replacementGrid = `function renderCategoriasGrid() {
  const grid = document.getElementById('categorias-grid');
  if (allCategorias.length === 0) {
    grid.innerHTML = '<p class="empty-msg">No hay categorías creadas aún. Haz clic en "+ Nueva Categoría" para comenzar.</p>';
    return;
  }

  grid.innerHTML = allCategorias.map(c => {
    let budgetText = '';
    if (c.tipo === 'Gasto' && c.presupuestoMensual > 0) {
      budgetText = \`<div style="font-size:12px; color:#94a3b8; margin-top:4px;">Tope: \${formatMonto(c.presupuestoMensual)}</div>\`;
    }
    return \`
    <div class="cat-card">
      <div class="cat-info">
        <span class="cat-dot \${c.tipo.toLowerCase()}"></span>
        <div>
          <div class="cat-name">\${c.nombre}</div>
          <div class="cat-type">\${c.tipo}</div>
          \${budgetText}
        </div>
      </div>
      <button class="btn-action btn-delete" onclick="deleteCategoria('\${c._id}')">🗑️</button>
    </div>
  \`}).join('');
}`;

if (regexGrid.test(js)) {
  js = js.replace(regexGrid, replacementGrid);
  fs.writeFileSync('public/app.js', js);
  console.log('renderCategoriasGrid updated successfully');
} else {
  console.log('Could not find renderCategoriasGrid');
}
