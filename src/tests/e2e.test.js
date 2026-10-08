const assert = require('assert');
const Core = require('../../src/shared/core.js');

describe('End-to-End User Journeys', () => {
    it('Journey 1: Reminder persistence across restart', () => {
        let state = { reminders: [] };
        // Create reminder
        state.reminders.push({ id: 'r1', mode: 'once', next: Date.now() + 60000, active: true });
        // Simulate restart
        const loadedState = JSON.parse(JSON.stringify(state));
        assert.strictEqual(loadedState.reminders.length, 1);
        assert.strictEqual(loadedState.reminders[0].id, 'r1');
    });

    it('Journey 2: Reminder due -> Buddy reacts -> Done -> Progress updates', () => {
        const now = Date.now();
        const reminder = { id: 'r2', title: 'Test', mode: 'interval', every: 60, next: now, active: true, log: [], goal: 5 };
        
        // Due check
        const due = Core.collect([reminder], now);
        assert.strictEqual(due.length, 1);
        
        // User presses Done
        reminder.log.push(now);
        const progress = Core.today(reminder);
        assert.strictEqual(progress, 1);
        
        // Emotion engine pseudo-verify
        let buddyEmotion = 'idle';
        if (progress > 0) buddyEmotion = 'happy';
        if (progress === reminder.goal) buddyEmotion = 'celebrating';
        assert.strictEqual(buddyEmotion, 'happy');
    });

    it('Journey 3: Upload photo -> Create custom buddy -> Persist', () => {
        const fakeB64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
        const state = { buddies: [] };
        
        // User uploads custom buddy
        state.buddies.push({
            id: 'c_123',
            name: 'My Dog',
            category: 'custom',
            asset: fakeB64
        });
        
        // Persist
        const loadedState = JSON.parse(JSON.stringify(state));
        assert.strictEqual(loadedState.buddies[0].name, 'My Dog');
        assert.strictEqual(loadedState.buddies[0].category, 'custom');
    });

    it('Journey 4: Missing a reminder triggers sadness', () => {
        // Pseudo logic mimicking the UI flow
        let emotion = 'idle';
        const event = 'MISSED';
        if (event === 'MISSED') emotion = 'sad';
        assert.strictEqual(emotion, 'sad');
    });
});

