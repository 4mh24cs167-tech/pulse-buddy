const fs = require('fs');
let html = fs.readFileSync('www/index.html', 'utf8');

html = html.replace(/var EmotionEngine = window\.EmotionEngine \|\| \{ react: \(\) => \{\} \};\n/g, '');

fs.writeFileSync('www/index.html', html, 'utf8');
