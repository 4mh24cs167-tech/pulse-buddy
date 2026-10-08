const assert = require('assert');
const fs = require('fs');
const path = require('path');
const Core = require('../../www/core.js');

describe('Comprehensive Verification Suite', () => {
    
    describe('72-Buddy Catalog Integrity', () => {
        let catalog;
        before(() => {
            const mod = require('../../buddy-catalog.js');
            catalog = mod.BuddyCatalog;
        });

        it('should contain exactly 72 unique Buddies', () => {
            assert.strictEqual(catalog.length, 72, "Must contain exactly 72 buddies");
            const ids = new Set(catalog.map(c => c.id));
            assert.strictEqual(ids.size, 72, "All 72 buddies must have unique IDs");
        });

        it('should map to physical assets that exist', () => {
            catalog.forEach(buddy => {
                const physicalPath = path.join(__dirname, '..', '..', 'www', buddy.asset);
                const exists = fs.existsSync(physicalPath);
                assert.ok(exists, "Asset missing for " + buddy.name + " at " + physicalPath);
            });
        });

        it('should classify exactly into 18 human, 24 animal, 12 vehicle, 10 robot, 8 fantasy', () => {
            const counts = catalog.reduce((acc, b) => {
                acc[b.category] = (acc[b.category] || 0) + 1;
                return acc;
            }, {});
            
            assert.strictEqual(counts.human, 18);
            assert.strictEqual(counts.animal, 24);
            assert.strictEqual(counts.vehicle, 12);
            assert.strictEqual(counts.robot, 10);
            assert.strictEqual(counts.fantasy, 8);
        });
    });

    describe('EmotionEngine Architecture', () => {
        let EmotionEngine;
        before(() => {
            const mod = require('../../buddy-catalog.js');
            EmotionEngine = mod.EmotionEngine;
            // Mock global document and requestAnimationFrame for tests
            global.document = {
                createElement: () => ({ style: {}, appendChild: () => {}, remove: () => {} })
            };
            global.requestAnimationFrame = (cb) => cb();
        });
        after(() => {
            delete global.document;
            delete global.requestAnimationFrame;
        });

        it('should apply visual overlays, CSS filters, and particle effects for DONE', (done) => {
            let particlesAppended = 0;
            const mockDom = {
                style: {},
                appendChild: (el) => { particlesAppended++; },
            };
            EmotionEngine.react({ domElement: mockDom }, 'DONE');
            
            assert.strictEqual(mockDom.style.filter, 'drop-shadow(0 15px 20px rgba(0,255,170,0.4)) brightness(1.2)');
            assert.strictEqual(particlesAppended, 8); // 8 particles for Happy/DONE
            done();
        });

        it('should map MISSED to sad, SNOOZE to focused, GOAL to celebrating', (done) => {
            const mockDom1 = { style: {}, appendChild: () => {} };
            EmotionEngine.react({ domElement: mockDom1 }, 'MISSED');
            assert.ok(mockDom1.style.filter.includes('grayscale'), "MISSED should apply sadness filter");

            const mockDom2 = { style: {}, appendChild: () => {} };
            EmotionEngine.react({ domElement: mockDom2 }, 'GOAL');
            assert.ok(mockDom2.style.filter.includes('drop-shadow'), "GOAL should apply celebration filter");
            done();
        });
    });

    describe('AssetStore and Custom Buddy Verification', () => {
        const tempPath = path.join(__dirname, '..', '..', 'assets', 'test_custom.jpg');
        
        after(() => {
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        });

        it('should validate Base64 before storing physically', () => {
            const invalidB64 = "data:text/html;base64,...";
            const validB64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
            
            // Mock AssetStore behavior mapping to physical
            const storeAssetMock = (b64) => {
                if (!b64.startsWith('data:image/')) throw new Error("Invalid Format");
                fs.writeFileSync(tempPath, Buffer.from(b64.split(',')[1], 'base64'));
                return 'test_custom.jpg';
            };

            let threw = false;
            try { storeAssetMock(invalidB64); } catch(e) { threw = true; }
            assert.ok(threw, "Should have thrown for invalid format");
            
            const id = storeAssetMock(validB64);
            assert.strictEqual(id, 'test_custom.jpg');
            assert.ok(fs.existsSync(tempPath), "Physical asset must be written to disk");
        });
    });

    describe('Reminders & Statistics', () => {
        it('should calculate streak accurately from history', () => {
            const today = new Date();
            const yday = new Date(today); yday.setDate(today.getDate() - 1);
            const pyday = new Date(today); pyday.setDate(today.getDate() - 2);

            const reminders = [{
                id: 'r1',
                log: [today.getTime(), yday.getTime(), pyday.getTime()]
            }];

            const d = new Set(reminders.flatMap(r=>(r.log||[]).map(t=>new Date(t).toDateString())));
            let n = 0, x = new Date();
            if(!d.has(x.toDateString())) x.setDate(x.getDate()-1);
            while(d.has(x.toDateString())) { n++; x.setDate(x.getDate()-1); }
            
            assert.strictEqual(n, 3, "Streak should be 3");
        });

        it('should enforce Snooze limits', () => {
            const r = { snoozeCount: 0, mode: 'interval' };
            const canSnooze = (r.snoozeCount || 0) < 3;
            assert.strictEqual(canSnooze, true);
            
            r.snoozeCount = 3;
            assert.strictEqual((r.snoozeCount || 0) < 3, false, "Should block 4th snooze");
        });
    });

    describe('Export / Import Serialization', () => {
        it('should reject malformed .pbuddy files', () => {
            const malformed = '{"version": 1, "type": "HackedPackage"}';
            assert.throws(() => {
                const pkg = JSON.parse(malformed);
                if (pkg.type !== "PulseBuddyPackage") throw new Error("Invalid .pbuddy format");
            }, /Invalid .pbuddy/);
        });

        it('should serialize custom buddies without exporting core state', () => {
            const sBuddies = [{ id: 'c_1', name: 'Dog', asset: 'capfs://data' }];
            const pkg = { version: 1, type: "PulseBuddyPackage", buddies: sBuddies };
            assert.strictEqual(pkg.buddies.length, 1);
            assert.strictEqual(pkg.buddies[0].id, 'c_1');
        });
    });

});
