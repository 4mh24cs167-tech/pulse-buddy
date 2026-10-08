const fs = require('fs');
let code = fs.readFileSync('src/tests/browser_smoke.test.js', 'utf8');

code = code.replace(/page\.on\('console', msg => \{ if\(msg\.type\(\) === 'error'\) console\.log\('PAGE ERROR:', msg\.text\(\)\) \}\);/, `page.on('requestfailed', request => { console.log('REQ FAILED:', request.url()); });`);

fs.writeFileSync('src/tests/browser_smoke.test.js', code, 'utf8');
