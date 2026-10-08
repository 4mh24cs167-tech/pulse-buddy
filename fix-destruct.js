const fs = require('fs');
let html = fs.readFileSync('www/index.html', 'utf8');

html = html.replace(/const \{ parseTime, nextDaily, constrainToActiveHours, todayCount \} = \(typeof module !== 'undefined' \? module\.exports : window\.Core\) \|\| window\.Core;\n/g, '');

fs.writeFileSync('www/index.html', html, 'utf8');
