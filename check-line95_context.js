const fs = require('fs');
const html = fs.readFileSync('www/index.html', 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/g)[0].replace(/<\/?script>/g, '');
const lines = script.split('\n');
console.log(lines.slice(85, 100).join('\n'));
