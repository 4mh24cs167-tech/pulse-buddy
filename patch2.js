const fs = require('fs');
let code = fs.readFileSync('buddy3d.js', 'utf8');

// Replace the mangled else block
let target = "} else \n            let isObj = typeof id === 'object';";
let replacement = "} else {\n            let isObj = typeof id === 'object';";
code = code.replace(target, replacement);

target = "else model = FantasyGenerator.generate(id);\n else {";
replacement = "else model = FantasyGenerator.generate(id);\n}\n/*";
code = code.replace(target, replacement);

target = "this.scene.add(model);";
replacement = "*/\n        this.scene.add(model);";
code = code.replace(target, replacement);

fs.writeFileSync('buddy3d.js', code);
