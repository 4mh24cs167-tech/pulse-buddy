const fs = require('fs');
let html = fs.readFileSync('www/overlay.html', 'utf8');

const regex = /const viewer = window\.Buddy3D\.default;/;
const replacement = `const viewer = window.Buddy3D.createViewer();`;

html = html.replace(regex, replacement);
fs.writeFileSync('www/overlay.html', html, 'utf8');
