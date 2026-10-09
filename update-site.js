const fs = require('fs');
let html = fs.readFileSync('site/index.html', 'utf8');
html = html.replace(/v1\.0\.11/g, 'v1.0.12');
fs.writeFileSync('site/index.html', html, 'utf8');
