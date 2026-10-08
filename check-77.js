const fs = require('fs');
const lines = fs.readFileSync('src/tests/browser_smoke.test.js', 'utf8').split('\n');
console.log("Line 77:", lines[76]);
