const fs = require('fs');
let code = fs.readFileSync('src/tests/browser_smoke.test.js', 'utf8');

code = code.replace(/document\.querySelector\('#sClose'\)\.click\(\)/g, "document.querySelector('#studioDlg').close()");

fs.writeFileSync('src/tests/browser_smoke.test.js', code, 'utf8');
