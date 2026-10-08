const fs = require('fs');
let html = fs.readFileSync('www/index.html', 'utf8');
console.log(html.substring(50320, 50350));
