class SchemaValidator {
    static validate(data) {
        if (!data || typeof data !== 'object') throw new Error('Invalid state root');
        
        const safe = {
            schemaVersion: 1,
            reminders: [],
            settings: { autostart: true, sound: true, snooze: 10 },
            buddies: [],
            favorites: [],
            statistics: {},
            history: [],
            metadata: {}
        };
        
        // Settings validation
        if (data.settings && typeof data.settings === 'object') {
            safe.settings.autostart = Boolean(data.settings.autostart);
            safe.settings.sound = Boolean(data.settings.sound);
            safe.settings.snooze = typeof data.settings.snooze === 'number' && data.settings.snooze > 0 ? data.settings.snooze : 10;
        }

        // Reminders validation
        if (Array.isArray(data.reminders)) {
            data.reminders.forEach(r => {
                if (!r.id || typeof r.id !== 'string') return;
                
                safe.reminders.push({
                    id: r.id,
                    title: typeof r.title === 'string' ? r.title : 'Reminder',
                    message: typeof r.message === 'string' ? r.message : '',
                    mode: ['interval', 'daily', 'once'].includes(r.mode) ? r.mode : 'interval',
                    time: r.time, // Time string or minutes
                    active: Boolean(r.active),
                    next: typeof r.next === 'number' ? r.next : 0,
                    goal: typeof r.goal === 'number' ? r.goal : 1,
                    log: Array.isArray(r.log) ? r.log.filter(x => typeof x === 'number') : [],
                    buddy: r.buddy,
                    ent: r.ent || 'walk'
                });
            });
        }
        
        // Favorites validation
        if (Array.isArray(data.favorites)) {
            safe.favorites = data.favorites.filter(x => typeof x === 'string');
        }
        
        return safe;
    }
}

module.exports = SchemaValidator;
