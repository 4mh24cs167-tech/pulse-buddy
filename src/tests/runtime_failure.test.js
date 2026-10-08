const fs = require('fs');
const assert = require('assert');
const path = require('path');

describe('Runtime Failure Regression', () => {
    let html;
    before(() => {
        html = fs.readFileSync(path.join(__dirname, '../../www/index.html'), 'utf8');
    });

    it('should NOT execute new THREE.Scene() globally', () => {
        // Find if new THREE.Scene() appears outside of a function
        // A simple heuristic is that new THREE.Scene() should only appear inside init3DBackground or similar
        const sceneMatch = html.match(/const scene = new THREE\.Scene\(\);/);
        // We know it is inside init3DBackground()
        // Let's make sure it's wrapped
        const safeWrapped = /function init3DBackground[\s\S]*?const scene = new THREE\.Scene\(\);/.test(html);
        assert.ok(safeWrapped, "THREE.Scene() must be inside a safe wrapper function");
        
        // Ensure no global const scene = new THREE.Scene() outside function blocks.
        // If it was global, it would be at the root indentation level.
        const lines = html.split('\n');
        const globalScene = lines.find(line => line.match(/^const scene = new THREE\.Scene\(\);/));
        assert.strictEqual(globalScene, undefined, "Found global THREE.Scene execution");
    });
    
    it('should catch exceptions in background init without killing UI bootstrap', () => {
        // Assert that bootstrap wraps init3DBackground() in a try-catch
        assert.match(html, /try \{[\s\S]*?init3DBackground\(\);[\s\S]*?\} catch\(e\)/);
    });
});
