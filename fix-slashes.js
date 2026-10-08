const fs = require('fs');
let html = fs.readFileSync('www/index.html', 'utf8');

html = html.replace(/el\.style\.transform = \\\`perspective/g, 'el.style.transform = `perspective');
html = html.replace(/\\\$\\\{/g, '${');
html = html.replace(/\\\`/g, '`');

fs.writeFileSync('www/index.html', html, 'utf8');
