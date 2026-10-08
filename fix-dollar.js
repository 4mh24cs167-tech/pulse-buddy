const fs = require('fs');
let html = fs.readFileSync('www/index.html', 'utf8');
html = html.replace(/\$\('dialog button:not\(\[type="submit"\]\)'\)\.forEach/g, `$$('dialog button:not([type="submit"])').forEach`);
fs.writeFileSync('www/index.html', html, 'utf8');
