import { contextBridge, ipcRenderer } from 'electron';
import {
  Reminder,
  AppSettings,
  Avatar,
  ReminderHistoryRecord,
  ReminderTriggerPayload,
  ReminderAction,
} from '@pulse-buddy/shared-types';

const api = {
  getReminders: (): Promise<Reminder[]> => ipcRenderer.invoke('desktop:get-reminders'),
  saveReminder: (reminder: Reminder): Promise<Reminder> =>
    ipcRenderer.invoke('desktop:save-reminder', reminder),
  deleteReminder: (id: string): Promise<boolean> =>
    ipcRenderer.invoke('desktop:delete-reminder', id),

  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke('desktop:get-settings'),
  saveSettings: (settings: Partial<AppSettings>): Promise<AppSettings> =>
    ipcRenderer.invoke('desktop:save-settings', settings),

  getAvatars: (): Promise<Avatar[]> => ipcRenderer.invoke('desktop:get-avatars'),
  saveAvatar: (avatar: Avatar): Promise<Avatar> =>
    ipcRenderer.invoke('desktop:save-avatar', avatar),
  deleteAvatar: (id: string): Promise<boolean> =>
    ipcRenderer.invoke('desktop:delete-avatar', id),

  getHistory: (): Promise<ReminderHistoryRecord[]> =>
    ipcRenderer.invoke('desktop:get-history'),
  recordHistory: (record: ReminderHistoryRecord): Promise<void> =>
    ipcRenderer.invoke('desktop:record-history', record),

  getDiagnostics: () => ipcRenderer.invoke('desktop:get-diagnostics'),

  openDashboard: () => ipcRenderer.send('desktop:open-dashboard'),
  hideToTray: () => ipcRenderer.send('desktop:hide-to-tray'),
  quitApp: () => ipcRenderer.send('desktop:quit-app'),

  testCompanion: (reminderId?: string) =>
    ipcRenderer.invoke('desktop:test-companion', reminderId),
  closeCompanion: () => ipcRenderer.send('desktop:close-companion'),

  respondReminderAction: (
    action: ReminderAction,
    reminderId: string,
    snoozeMinutes?: number
  ) => ipcRenderer.send('desktop:reminder-action', { action, reminderId, snoozeMinutes }),

  onReminderTriggered: (callback: (payload: ReminderTriggerPayload) => void) => {
    const handler = (_: any, payload: ReminderTriggerPayload) => callback(payload);
    ipcRenderer.on('desktop:reminder-triggered', handler);
    return () => ipcRenderer.removeListener('desktop:reminder-triggered', handler);
  },

  onCompanionPayload: (callback: (payload: ReminderTriggerPayload) => void) => {
    const handler = (_: any, payload: ReminderTriggerPayload) => callback(payload);
    ipcRenderer.on('companion:update-payload', handler);
    return () => ipcRenderer.removeListener('companion:update-payload', handler);
  },
};

contextBridge.exposeInMainWorld('pulseBuddyAPI', api);
