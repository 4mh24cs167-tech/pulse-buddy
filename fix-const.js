const fs = require('fs');
let html = fs.readFileSync('www/index.html', 'utf8');

html = html.replace(/const BuddyCatalog = window\.BuddyCatalog \|\| \[\];/g, 'const catalogFallback = window.BuddyCatalog || [];');

fs.writeFileSync('www/index.html', html, 'utf8');
