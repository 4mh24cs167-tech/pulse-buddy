const fs = require('fs');
let html = fs.readFileSync('www/index.html', 'utf8');

html = html.replace(/window\.Sprites\.update\(studioInst, emotion\);\n                }\n                \/\/ Legacy EmotionEngine removed in favor of true 3D BuddyEngine behavior\n            }\n        };\n    \}\);/, `window.Sprites.update(studioInst, emotion);
                }
                // Legacy EmotionEngine removed in favor of true 3D BuddyEngine behavior
            }
        });
    });`);

fs.writeFileSync('www/index.html', html, 'utf8');
