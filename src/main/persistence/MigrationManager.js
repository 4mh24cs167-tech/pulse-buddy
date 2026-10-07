class MigrationManager {
    static migrate(rawState) {
        if (!rawState || typeof rawState !== 'object') {
            return { schemaVersion: 1, reminders: [], settings: {} };
        }
        
        // If it's already v1 or higher, just return it
        if (rawState.schemaVersion >= 1) {
            return rawState;
        }

        // Migrate from legacy format (v0)
        // Legacy format had only: { reminders: [], settings: {} }
        const migrated = {
            schemaVersion: 1,
            reminders: Array.isArray(rawState.reminders) ? rawState.reminders : [],
            settings: rawState.settings || { autostart: true, sound: true, snooze: 10 },
            buddies: [],
            favorites: [],
            statistics: {},
            history: [],
            metadata: {}
        };

        return migrated;
    }
}

module.exports = MigrationManager;
