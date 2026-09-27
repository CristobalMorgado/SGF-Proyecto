const fs = require('fs');
let js = fs.readFileSync('public/app.js', 'utf8');

const regex = /const grupo = await res\.json\(\);/;
const replacement = `if (!res.ok) {
      document.getElementById('badge-membresia').textContent = 'Error de Servidor (Reinicia Node)';
      return;
    }
    const grupo = await res.json();`;

if (js.includes('const grupo = await res.json();')) {
  js = js.replace(regex, replacement);
  fs.writeFileSync('public/app.js', js);
  console.log('App.js error handling updated');
} else {
  console.log('Regex not found');
}
