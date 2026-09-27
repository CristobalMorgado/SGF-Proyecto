const fs = require('fs');
let js = fs.readFileSync('public/app.js', 'utf8');
js = js.replace(/function logout\(\) \{/, "function logout() {\n  document.body.classList.remove('readonly-mode');");
fs.writeFileSync('public/app.js', js);
console.log('logout fixed');
