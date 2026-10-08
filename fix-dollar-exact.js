const fs = require('fs');
let html = fs.readFileSync('www/index.html', 'utf8');
html = html.replace("$('dialog button:not([type=\"submit\"])').forEach", "$$('dialog button:not([type=\"submit\"])').forEach");
fs.writeFileSync('www/index.html', html, 'utf8');
