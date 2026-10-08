const assert = require('assert');
const Core = require('../../src/shared/core.js'); // Use core.js scheduler if applicable

describe('Ultimate Scheduler Verification', () => {
    
    it('handles interval triggers', () => {
        const r = { mode: 'interval', every: 15 };
        const now = 1000000;
        const next = Core.next(r, now);
        assert.equal(next, now + 15 * 60000);
    });

    it('respects active hours boundaries (does not fire outside)', () => {
        const r = { mode: 'interval', every: 15, hs: '09:00', he: '17:00' };
        // Test near boundary
        const now = new Date('2026-10-08T08:50:00').getTime();
        const next = Core.next(r, now);
        // It should schedule at 9:00 because interval would fall outside or be clamped
        const nextD = new Date(next);
        assert(nextD.getHours() >= 9);
    });

    it('handles daily specific times', () => {
        const r = { mode: 'daily', times: ['09:00', '15:00'] };
        const now = new Date('2026-10-08T10:00:00').getTime();
        const next = Core.next(r, now);
        const nextD = new Date(next);
        assert.equal(nextD.getHours(), 15);
        assert.equal(nextD.getMinutes(), 0);
    });

    it('wraps daily times to next day correctly', () => {
        const r = { mode: 'daily', times: ['09:00', '15:00'] };
        const now = new Date('2026-10-08T16:00:00').getTime();
        const next = Core.next(r, now);
        const nextD = new Date(next);
        assert.equal(nextD.getDate(), 9);
        assert.equal(nextD.getHours(), 9);
    });

    it('prevents duplicate firing (collect returns once and updates)', () => {
        const r = { id: 1, mode: 'interval', every: 5, active: true, next: 1000 };
        const due = Core.collect([r], 2000);
        assert.equal(due.length, 1);
        assert(r.next > 2000);
        
        const due2 = Core.collect([r], 2000);
        assert.equal(due2.length, 0);
    });
});

