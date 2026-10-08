import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export class MobileNotificationAdapter {
    static async requestPermissions() {
        if (!Capacitor.isNativePlatform()) return true;
        const result = await LocalNotifications.requestPermissions();
        return result.display === 'granted';
    }

    static async schedule(reminder, fireDate) {
        if (!Capacitor.isNativePlatform()) return;
        
        await LocalNotifications.schedule({
            notifications: [
                {
                    title: reminder.title,
                    body: reminder.message || 'Time for your reminder!',
                    id: reminder.id || Math.floor(Math.random() * 100000),
                    schedule: { at: new Date(fireDate) },
                    sound: reminder.sound ? null : undefined,
                    actionTypeId: '',
                    extra: { reminderId: reminder.id }
                }
            ]
        });
    }

    static async cancel(id) {
        if (!Capacitor.isNativePlatform()) return;
        await LocalNotifications.cancel({ notifications: [{ id }] });
    }

    static async clearAll() {
        if (!Capacitor.isNativePlatform()) return;
        const pending = await LocalNotifications.getPending();
        if (pending.notifications.length > 0) {
            await LocalNotifications.cancel({ notifications: pending.notifications.map(n => ({ id: n.id })) });
        }
    }
}
