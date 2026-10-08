const fs = require('fs');
let html = fs.readFileSync('www/overlay.html', 'utf8');

// replace style of #buddy
html = html.replace(/#buddy\{position:absolute;bottom:20px;width:180px;height:180px;transition: transform 0\.1s\}/, `#buddy{position:absolute;left:0;top:0;width:100vw;height:100vh;pointer-events:none;} canvas{pointer-events:auto;} .hit{pointer-events:auto;}`);

fs.writeFileSync('www/overlay.html', html, 'utf8');
