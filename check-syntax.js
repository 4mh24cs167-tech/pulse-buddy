const fs = require('fs');
const html = fs.readFileSync('www/index.html', 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/g)[0].replace(/<\/?script>/g, '');
try {
    new Function(script);
    console.log("Syntax OK");
} catch(e) {
    console.log("SYNTAX ERROR:", e.message);
    const lines = script.split('\n');
    lines.forEach((l, i) => {
        try { new Function(l); } catch(err) {
            // some lines will naturally fail (like `if(true) {`) but we might find the unexpected token.
        }
    });
}
