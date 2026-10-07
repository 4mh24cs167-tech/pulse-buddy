const test = require('node:test');
const assert = require('node:assert');
const TimeUtils = require('../main/scheduler/TimeUtils');
const Scheduler = require('../main/scheduler/Scheduler');

test('TimeUtils Tests', async (t) => {
    await t.test('parseTime validates strict format', () => {
        assert.strictEqual(TimeUtils.parseTime('09:30'), 570);
        assert.strictEqual(TimeUtils.parseTime('14:00'), 840);
        assert.strictEqual(TimeUtils.parseTime('25:00'), null);
        assert.strictEqual(TimeUtils.parseTime('abc'), null);
    });

    await t.test('nextDaily calculates correctly across midnight', () => {
        const now = new Date('2025-01-01T10:00:00').getTime();
        
        // Time in the future today
        const future = new Date(TimeUtils.nextDaily('14:00', now));
        assert.strictEqual(future.getHours(), 14);

        // Time in the past today -> moves to tomorrow
        const past = new Date(TimeUtils.nextDaily('08:00', now));
        assert.strictEqual(past.getHours(), 8);
        assert.strictEqual(past.getDate(), new Date(now).getDate() + 1);
    });

    await t.test('constrainToActiveHours pushes times out of bounds to next start', () => {
        const d1 = new Date('2025-01-01T08:00:00').getTime();
        
        // 08:00 is before 09:00 window -> shifts to 09:00 today
        const c1 = new Date(TimeUtils.constrainToActiveHours(d1, '09:00', '17:00'));
        assert.strictEqual(c1.getHours(), 9);

        // 18:00 is after 17:00 window -> shifts to 09:00 tomorrow
        const d2 = new Date('2025-01-01T18:00:00').getTime();
        const c2 = new Date(TimeUtils.constrainToActiveHours(d2, '09:00', '17:00'));
        assert.strictEqual(c2.getHours(), 9);
        assert.strictEqual(c2.getDate(), new Date(d2).getDate() + 1);
    });
});

test('Scheduler Intelligence Tests', async (t) => {
    const getMockState = () => {
        const memoryState = {
            reminders: [
                { id: '1', mode: 'interval', every: 60, next: Date.now() - 5000, active: true },
                { id: 'stale', mode: 'daily', times: ['12:00'], next: Date.now() - 90000000, active: true } // 25 hours old
            ]
        };
        return {
            getState: () => memoryState,
            persist: () => {}
        };
    };

    await t.test('tick() fires due reminders but ignores deeply stale ones', () => {
        let fired = [];
        const mockState = getMockState();
        const sched = new Scheduler(mockState, (dues) => { fired = dues; });
        sched.tick();

        assert.strictEqual(fired.length, 1);
        assert.strictEqual(fired[0].id, '1');
        
        const state = mockState.getState();
        const stale = state.reminders.find(r => r.id === 'stale');
        assert.strictEqual(stale.next > Date.now(), true);
    });
    
    await t.test('tick() deduplicates rapid fires', () => {
        let firedCount = 0;
        const mockState = getMockState();
        const sched = new Scheduler(mockState, () => { firedCount++; });
        
        const state = mockState.getState();
        state.reminders[0].next = Date.now(); // due now
        
        sched.tick(); // Fires
        
        // Reset next to simulate a duplicate fire without time passing
        state.reminders[0].next = Date.now();
        sched.tick(); // Ignores due to 1-min deduplication block
        
        assert.strictEqual(firedCount, 1);
    });
});
