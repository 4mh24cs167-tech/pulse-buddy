// Mobile Storage & Notification Adapter for Pulse Buddy
// Bridges the Desktop API to Capacitor for Android/iOS

window.isMobile = !!window.Capacitor;

if (window.isMobile && !window.api) {
    console.log("Initializing Mobile Storage & Notification Adapter");
    
    // Default safe state
    let state = { schemaVersion: 2, settings: { autostart: true, sound: true, snoozeDur: 5 }, reminders: [], buddies: [], favorites: [] };
    
    try {
        const stored = localStorage.getItem('pulse-state');
        if (stored) state = JSON.parse(stored);
    } catch (e) {
        console.error("Corrupt mobile state", e);
    }

    const saveState = async () => {
        localStorage.setItem('pulse-state', JSON.stringify(state));
        await scheduleMobileNotifications();
    };

    const scheduleMobileNotifications = async () => {
        if (!window.Capacitor || !window.Capacitor.Plugins || !window.Capacitor.Plugins.LocalNotifications) return;
        const LocalNotifications = window.Capacitor.Plugins.LocalNotifications;
        
        try {
            await LocalNotifications.requestPermissions();
            // Cancel all existing to prevent duplicates
            const pending = await LocalNotifications.getPending();
            if (pending.notifications.length > 0) {
                await LocalNotifications.cancel(pending);
            }

            const notifications = [];
            let notifId = 1;

            state.reminders.forEach(r => {
                if (!r.active || !r.next) return;
                
                // Only schedule if it's in the future
                if (r.next > Date.now()) {
                    notifications.push({
                        id: notifId++,
                        title: 'Pulse Buddy',
                        body: r.title || 'Reminder!',
                        schedule: { at: new Date(r.next) },
                        actionTypeId: '',
                        extra: { reminderId: r.id }
                    });
                }
            });

            if (notifications.length > 0) {
                await LocalNotifications.schedule({ notifications });
                console.log(`Scheduled ${notifications.length} mobile notifications.`);
            }
        } catch (e) {
            console.error("Mobile notification error:", e);
        }
    };

    window.api = {
        get: async () => state,
        save: async (newState) => { state = newState; await saveState(); },
        createReminder: async (r) => { 
            r.id = Date.now().toString() + Math.random().toString().slice(2,6);
            state.reminders.push(r); 
            await saveState(); 
            return r.id; 
        },
        updateReminder: async (id, data) => {
            const idx = state.reminders.findIndex(x => x.id === id);
            if(idx !== -1) { Object.assign(state.reminders[idx], data); await saveState(); }
        },
        deleteReminder: async (id) => {
            state.reminders = state.reminders.filter(x => x.id !== id);
            await saveState();
        },
        setSetting: async (k, v) => {
            state.settings[k] = v;
            await saveState();
        },
        onRefresh: (cb) => {
            // Mock IPC listener. Could listen to storage events if needed.
        }
    };

    // Run scheduling once on boot
    scheduleMobileNotifications();
}
