const fs = require('fs');
let js = fs.readFileSync('main.js', 'utf8');

js = js.replace(/win\.loadFile\('index\.html'\);/, "win.loadFile('www/index.html');");
js = js.replace(/ov\.loadFile\('overlay\.html'\);/, "ov.loadFile('www/overlay.html');");

fs.writeFileSync('main.js', js, 'utf8');
