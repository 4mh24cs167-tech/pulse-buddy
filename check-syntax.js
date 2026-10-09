const fs = require('fs');
const html = fs.readFileSync('www/index.html', 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
if (scriptMatch) {
  const code = scriptMatch[1];
  fs.writeFileSync('test.js', code);
  try {
    new (require('vm').Script)(code);
    console.log("Syntax OK.");
  } catch(e) {
    console.log("Syntax Error:", e);
  }
}
