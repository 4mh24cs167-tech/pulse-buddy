const fs = require('fs');
console.log(fs.readFileSync('www/overlay.html', 'utf8').substring(0, 1500));
