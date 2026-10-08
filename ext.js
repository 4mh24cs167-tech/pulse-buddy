const fs = require('fs');
const html = fs.readFileSync('www/index.html', 'utf8');
const scriptStart = html.indexOf('<script>');
const scriptEnd = html.lastIndexOf('</script>');
const scriptContent = html.substring(scriptStart + 8, scriptEnd);
fs.writeFileSync('www/check.js', scriptContent, 'utf8');
