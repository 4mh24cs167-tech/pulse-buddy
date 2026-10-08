const fs = require('fs');
let html = fs.readFileSync('www/index.html', 'utf8');
const ix = html.indexOf("$('dialog button:not([type=\"submit\"])').forEach");
console.log("Index:", ix);
