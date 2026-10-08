const assert = require('assert');
const Scheduler = require('../main/scheduler/Scheduler.js');

describe('Scheduler', () => {
    let mockStateStore;
    let fired;
    let scheduler;

    beforeEach(() => {
        mockStateStore = {
            state: { reminders: [] },
            save: () => {}
        };
        fired = [];
        scheduler = new Scheduler(mockStateStore, (r) => fired.push(r));
    });

    afterEach(() => {
        scheduler.stop();
    });

    it('should calculate next interval reminder', () => {
        const now = Date.now();
        const r = { id: '1', mode: 'interval', every: 60, active: true };
        const next = scheduler.calculateNext(r, now);
        assert.strictEqual(next, now + 3600000); // +1 hour
    });

    it('should push next trigger to tomorrow if goal is reached', () => {
        const now = Date.now();
        const r = { id: '2', mode: 'interval', every: 60, active: true, goal: 2, log: [now, now - 1000] };
        const next = scheduler.calculateNext(r, now);
        
        // Next trigger should be well into tomorrow (at least > now + 3600000)
        assert.ok(next > now + 3600000);
    });

    it('should pause and resume correctly', () => {
        scheduler.pause(10);
        assert.ok(scheduler.pausedUntil > Date.now());
        
        scheduler.resume();
        assert.strictEqual(scheduler.pausedUntil, 0);
    });
});
