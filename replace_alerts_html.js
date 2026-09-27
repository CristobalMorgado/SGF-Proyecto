const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');

const regexContainer = /<!-- Últimos Movimientos -->/;
const replacementContainer = `<!-- Alertas de Presupuesto (HU08) -->
        <div id="presupuesto-alertas-container" style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 2rem;"></div>

        <!-- Últimos Movimientos -->`;

html = html.replace(regexContainer, replacementContainer);
fs.writeFileSync('public/index.html', html);
console.log('HTML alerts container added');
