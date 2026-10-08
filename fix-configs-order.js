const fs = require('fs');
let html = fs.readFileSync('www/index.html', 'utf8');

html = html.replace(/viewer = window\.Buddy3D\.createViewer\(\);\n\s*Configs = window\.Buddy3D\.Configs;/, `Configs = window.Buddy3D.Configs;\n                viewer = window.Buddy3D.createViewer();`);

fs.writeFileSync('www/index.html', html, 'utf8');
