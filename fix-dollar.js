const fs = require('fs');
let html = fs.readFileSync('www/index.html', 'utf8');

html = html.replace(/\$\('\.sidebar button'\)\.forEach/g, "$$$$('.sidebar button').forEach");
html = html.replace(/\$\('\.tab-view'\)\.forEach/g, "$$$$('.tab-view').forEach");
html = html.replace(/\$\('#galTabs button'\)\.forEach/g, "$$$$('#galTabs button').forEach");

fs.writeFileSync('www/index.html', html, 'utf8');
