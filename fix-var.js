const fs = require('fs');
let html = fs.readFileSync('www/index.html', 'utf8');

html = html.replace(/const catalogFallback = window\.BuddyCatalog \|\| \[\];/g, 'var catalogFallback = window.BuddyCatalog || [];');
html = html.replace(/const EmotionEngine = window\.EmotionEngine \|\| \{ react: \(\) => \{\} \};/g, 'var EmotionEngine = window.EmotionEngine || { react: () => {} };');

fs.writeFileSync('www/index.html', html, 'utf8');
