const fs = require('fs');
let code = fs.readFileSync('src/tests/browser_smoke.test.js', 'utf8');

code = code.replace(/#btnAdd/g, '#add');

fs.writeFileSync('src/tests/browser_smoke.test.js', code, 'utf8');
