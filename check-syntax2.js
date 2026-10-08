const fs = require('fs');
const html = fs.readFileSync('www/index.html', 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/g)[0].replace(/<\/?script>/g, '');
const lines = script.split('\n');

for (let i = 0; i < lines.length; i++) {
    const chunk = lines.slice(0, i + 1).join('\n') + '\n}';
    try {
        require('vm').createScript(chunk);
    } catch(e) {
        if(e.message.includes('Invalid or unexpected token')) {
            console.log("Error near line " + i + ": " + lines[i]);
        }
    }
}
