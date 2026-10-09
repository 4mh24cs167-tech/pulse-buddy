const fs = require('fs');
let yml = fs.readFileSync('.github/workflows/android-release.yml', 'utf8');
yml = yml.replace('run: npm test', 'run: xvfb-run --auto-servernum npm test');
fs.writeFileSync('.github/workflows/android-release.yml', yml, 'utf8');
