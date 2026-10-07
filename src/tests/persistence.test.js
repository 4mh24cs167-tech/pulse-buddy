const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const StateStore = require('../main/persistence/StateStore');
const AssetStore = require('../main/persistence/AssetStore');

const testDir = path.join(__dirname, 'test_userdata');

test('Persistence Architecture Tests', async (t) => {
    // Cleanup before
    if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });

    await t.test('Initializes with default safe state', () => {
        const store = new StateStore(testDir);
        const state = store.getState();
        assert.strictEqual(state.schemaVersion, 1);
        assert.deepStrictEqual(state.reminders, []);
        assert.strictEqual(state.settings.autostart, true);
    });

    await t.test('Atomic write and read', () => {
        const store = new StateStore(testDir);
        store.getState().settings.snooze = 20;
        store.persist();
        
        const store2 = new StateStore(testDir);
        assert.strictEqual(store2.getState().settings.snooze, 20);
    });

    await t.test('Migrates legacy data.json safely', () => {
        fs.rmSync(testDir, { recursive: true, force: true });
        fs.mkdirSync(testDir, { recursive: true });
        // Legacy state
        fs.writeFileSync(path.join(testDir, 'data.json'), JSON.stringify({
            reminders: [{id: '123', mode: 'daily', time: '10:00'}],
            settings: { snooze: 5 }
        }));
        
        const store = new StateStore(testDir);
        const state = store.getState();
        
        assert.strictEqual(state.schemaVersion, 1);
        assert.strictEqual(state.reminders.length, 1);
        assert.strictEqual(state.reminders[0].id, '123');
        assert.strictEqual(state.settings.snooze, 5);
        
        // Assert safe backup was created
        const backupDir = path.join(testDir, 'data'); // activePath was migrated to data/state.json, wait no, it's backupped
        // Wait, RecoveryManager creates it in 'backups' dir
        assert.strictEqual(fs.existsSync(path.join(testDir, 'backups', 'data.backup.json')), true);
    });

    await t.test('Recovers from corrupt state.json', () => {
        fs.rmSync(testDir, { recursive: true, force: true });
        const storeDir = path.join(testDir, 'data');
        fs.mkdirSync(storeDir, { recursive: true });
        
        // Write corrupt JSON
        const corruptFile = path.join(storeDir, 'state.json');
        fs.writeFileSync(corruptFile, '{ "schemaVersion": 1, "reminders": [ ');
        
        const store = new StateStore(testDir);
        assert.strictEqual(store.getState().schemaVersion, 1);
        
        // Check if backup corrupt file exists
        const files = fs.readdirSync(storeDir);
        const hasCorruptBackup = files.some(f => f.includes('.corrupt-'));
        assert.strictEqual(hasCorruptBackup, true);
    });

    await t.test('AssetStore stores base64 to local file', () => {
        const assets = new AssetStore(testDir);
        const base64Pixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
        const uri = assets.storeAsset(base64Pixel, 'image');
        
        assert.strictEqual(uri.startsWith('file:///'), true);
        assert.strictEqual(uri.endsWith('.png'), true);
        
        const filePath = uri.replace('file:///', '');
        assert.strictEqual(fs.existsSync(filePath), true);
    });

    // Cleanup after
    if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });
});
