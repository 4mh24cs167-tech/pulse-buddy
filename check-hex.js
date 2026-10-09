const fs = require('fs');
const html = fs.readFileSync('www/index.html', 'utf8');
const lines = html.split('\n');
console.log(Buffer.from(lines[528]).toString('hex'));
console.log(lines[528]);
