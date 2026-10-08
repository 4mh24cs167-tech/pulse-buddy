const fs = require('fs');
let html = fs.readFileSync('www/index.html', 'utf8');

html = html.replace(/\}\)\.classList\.add\('active'\);\n\s*if\(e\.target\.dataset\.tab === 'buddies'\) renderGallery\(\);\n\s*\}\n\}\);/g, "});\n});");

fs.writeFileSync('www/index.html', html, 'utf8');
