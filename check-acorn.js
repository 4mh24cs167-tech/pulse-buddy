const fs = require('fs');
const html = fs.readFileSync('www/index.html', 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/g)[0].replace(/<\/?script>/g, '');

const acorn = require('acorn');
try {
    acorn.parse(script, { ecmaVersion: 2020 });
    console.log("Syntax OK");
} catch(e) {
    console.log("Syntax error at line " + e.loc.line + ", col " + e.loc.column + ": " + e.message);
}
