const fs = require('fs');
let js = fs.readFileSync('public/app.js', 'utf8');
js = js.replace(/document\.querySelectorAll\('\.btn-accent, \.btn-primary'\)/g, "document.querySelectorAll('#app .btn-accent, #app .btn-primary')");
fs.writeFileSync('public/app.js', js);
console.log('Fixed querySelector scope');
