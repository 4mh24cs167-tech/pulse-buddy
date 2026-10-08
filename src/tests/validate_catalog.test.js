const assert = require('assert');
const { BuddyCatalog } = require('../../www/buddy-catalog.js');

describe('72-Buddy Catalog Validation', () => {
    it('should have exactly 72 buddies', () => {
        assert.strictEqual(BuddyCatalog.length, 72, "Total buddy count must be 72.");
    });

    it('should map uniquely and correctly', () => {
        const counts = { human: 0, animal: 0, vehicle: 0, robot: 0, fantasy: 0 };
        const ids = new Set();
        
        for (const buddy of BuddyCatalog) {
            // Verify ID exists and is unique
            assert.ok(buddy.id !== undefined, "Buddy must have an id");
            assert.ok(!ids.has(buddy.id), "Buddy ID must be unique: " + buddy.id);
            ids.add(buddy.id);
            
            // Verify category
            counts[buddy.category]++;
            
            // Asset exists property verification
            assert.ok(buddy.image || buddy.asset, "Buddy must have asset reference");
        }
        
        assert.strictEqual(counts.human, 18, "Must have 18 humans");
        assert.strictEqual(counts.animal, 24, "Must have 24 animals");
        assert.strictEqual(counts.vehicle, 12, "Must have 12 vehicles");
        assert.strictEqual(counts.robot, 10, "Must have 10 robots");
        assert.strictEqual(counts.fantasy, 8, "Must have 8 fantasy");
    });
});

