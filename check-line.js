const fs = require('fs');
const html = fs.readFileSync('www/index.html', 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/g)[0].replace(/<\/?script>/g, '');
const lines = script.split('\n');
console.log(lines[59]); // index is 0-based, line 60 is index 59
