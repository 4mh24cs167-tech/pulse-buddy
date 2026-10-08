const fs = require('fs');
const assert = require('assert');
const path = require('path');

describe('UI Smoke Test', () => {
    let html;
    before(() => {
        html = fs.readFileSync(path.join(__dirname, '../../www/index.html'), 'utf8');
    });

    it('should have all expected tabs', () => {
        assert.match(html, /id="tab-today"/);
        assert.match(html, /id="tab-reminders"/);
        assert.match(html, /id="tab-buddies"/);
        assert.match(html, /id="tab-stats"/);
        assert.match(html, /id="tab-settings"/);
    });

    it('should contain the safe bootstrap function', () => {
        assert.match(html, /function bootstrap\(\)/);
        assert.match(html, /window\.addEventListener\('DOMContentLoaded', bootstrap\)/);
        assert.match(html, /catch\(e\) {[\s\S]*?3D rendering unavailable/);
    });
    
    it('should use currentTarget in main navigation listeners', () => {
        assert.match(html, /const target = e\.currentTarget;/);
    });

    it('should set dialog buttons to type="button"', () => {
        assert.match(html, /b\.setAttribute\('type', 'button'\)/);
    });
    
    it('should have viewport meta tag', () => {
        assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">/);
    });
    
    it('should implement the 5 categories plus favorites and all', () => {
        assert.match(html, /data-tab="all"/);
        assert.match(html, /data-tab="human"/);
        assert.match(html, /data-tab="animal"/);
        assert.match(html, /data-tab="vehicle"/);
        assert.match(html, /data-tab="robot"/);
        assert.match(html, /data-tab="fantasy"/);
        assert.match(html, /data-tab="fav"/);
    });
});
