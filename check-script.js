const fs = require('fs');
const lines = fs.readFileSync('www/index.html', 'utf8').split('\n');
const scriptStart = lines.findIndex(l => l.includes('<script>'));
for(let i = scriptStart; i < scriptStart + 100; i++) {
    console.log(i + ": " + lines[i]);
}
