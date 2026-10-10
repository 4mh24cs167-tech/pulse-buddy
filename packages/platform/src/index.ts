import {
  Reminder,
  AppSettings,
  Avatar,
  ReminderHistoryRecord,
  AppDiagnostics,
  ReminderTriggerPayload,
  ReminderAction,
} from '@pulse-buddy/shared-types';
import { BUILTIN_AVATARS } from '@pulse-buddy/avatar';
import { DEFAULT_CATEGORIES, calculateNextOccurrence } from '@pulse-buddy/core';

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  soundEnabled: true,
  soundVolume: 0.8,
  companionPosition: 'bottom-right',
  companionSize: 'medium',
  displayDurationSeconds: 45,
  defaultAvatarId: 'pip-penguin',
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  launchAtLogin: false,
  closeToTray: true,
  nativeNotificationFallback: true,
  syncEnabled: false,
};

export const INITIAL_SEED_REMINDERS: Reminder[] = [
  {
    id: 'seed-hydration',
    title: 'Drink a glass of water',
    description: 'Keep your hydration on track. Sip slowly and refresh!',
    categoryId: 'hydration',
    categoryName: 'Hydration & Water Breaks',
    categoryIcon: 'Droplets',
    categoryColor: '#0ea5e9',
    schedule: {
      type: 'interval',
      time: '09:00',
      intervalMinutes: 60,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    },
    snoozeDurationMinutes: 10,
    priority: 'normal',
    avatarId: 'pip-penguin',
    soundEffect: 'water',
    enabled: true,
    missedPolicy: 'catch_up_immediate',
    nextOccurrence: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'seed-posture',
    title: 'Posture Reset & Eye Break',
    description: 'Look 20 feet away for 20 seconds, roll shoulders back, take a deep breath.',
    categoryId: 'posture',
    categoryName: 'Eye Breaks & Posture Reset',
    categoryIcon: 'Eye',
    categoryColor: '#6366f1',
    schedule: {
      type: 'daily',
      time: '14:30',
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    },
    snoozeDurationMinutes: 10,
    priority: 'normal',
    avatarId: 'maya-yogi',
    soundEffect: 'gentle',
    enabled: true,
    missedPolicy: 'skip_to_next',
    nextOccurrence: new Date(Date.now() + 120 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'seed-movement',
    title: 'Daily Movement & Walk',
    description: 'Get some steps, stretch legs, and refresh your mind.',
    categoryId: 'exercise',
    categoryName: 'Exercise & Movement',
    categoryIcon: 'Activity',
    categoryColor: '#10b981',
    schedule: {
      type: 'daily',
      time: '17:30',
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    },
    snoozeDurationMinutes: 15,
    priority: 'high',
    avatarId: 'sparky-rover',
    soundEffect: 'fanfare',
    enabled: true,
    missedPolicy: 'notify_missed',
    nextOccurrence: new Date(Date.now() + 360 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export interface IPlatformAdapter {
  isDesktop(): boolean;
  getDiagnostics(): Promise<AppDiagnostics>;
  requestNotificationPermission(): Promise<boolean>;
  showNativeNotification(title: string, body: string, icon?: string): void;
  showCompanionOverlay(payload: ReminderTriggerPayload): void;
  closeCompanionOverlay(): void;
  getReminders(): Promise<Reminder[]>;
  saveReminder(reminder: Reminder): Promise<Reminder>;
  deleteReminder(id: string): Promise<boolean>;
  getSettings(): Promise<AppSettings>;
  saveSettings(settings: Partial<AppSettings>): Promise<AppSettings>;
  getAvatars(): Promise<Avatar[]>;
  saveAvatar(avatar: Avatar): Promise<Avatar>;
  deleteAvatar(id: string): Promise<boolean>;
  getHistory(): Promise<ReminderHistoryRecord[]>;
  recordHistory(record: ReminderHistoryRecord): Promise<void>;
  openDashboard(): void;
  hideToTray(): void;
  quitApp(): void;
  onReminderTriggered(callback: (payload: ReminderTriggerPayload) => void): () => void;
  onReminderActioned(callback: (data: { reminderId: string; action: ReminderAction }) => void): () => void;
}

// Browser Implementation
export class BrowserPlatformAdapter implements IPlatformAdapter {
  private reminderListeners: Set<(payload: ReminderTriggerPayload) => void> = new Set();
  private actionListeners: Set<(data: { reminderId: string; action: ReminderAction }) => void> = new Set();

  public isDesktop(): boolean {
    return false;
  }

  public async getDiagnostics(): Promise<AppDiagnostics> {
    const reminders = await this.getReminders();
    return {
      platform: 'web',
      os: 'browser',
      backgroundServiceActive: true,
      notificationsPermitted: typeof window !== 'undefined' && 'Notification' in window ? Notification.permission === 'granted' : false,
      webPushSupported: typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window,
      activeRemindersCount: reminders.filter((r) => r.enabled).length,
      storageType: 'localStorage / IndexedDB',
    };
  }

  public async requestNotificationPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    try {
      const res = await Notification.requestPermission();
      return res === 'granted';
    } catch {
      return false;
    }
  }

  public showNativeNotification(title: string, body: string, icon?: string): void {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: icon || '/favicon.ico',
        });
      } catch {
        // Notification fallback
      }
    }
  }

  public showCompanionOverlay(payload: ReminderTriggerPayload): void {
    this.reminderListeners.forEach((fn) => fn(payload));
  }

  public closeCompanionOverlay(): void {
    // web handles via state
  }

  public async getReminders(): Promise<Reminder[]> {
    if (typeof window === 'undefined') return INITIAL_SEED_REMINDERS;
    const raw = localStorage.getItem('pulse_buddy_reminders');
    if (!raw) {
      localStorage.setItem('pulse_buddy_reminders', JSON.stringify(INITIAL_SEED_REMINDERS));
      return INITIAL_SEED_REMINDERS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_SEED_REMINDERS;
    }
  }

  public async saveReminder(reminder: Reminder): Promise<Reminder> {
    const list = await this.getReminders();
    const idx = list.findIndex((r) => r.id === reminder.id);
    let updated: Reminder[];
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = reminder;
    } else {
      updated = [reminder, ...list];
    }
    localStorage.setItem('pulse_buddy_reminders', JSON.stringify(updated));
    return reminder;
  }

  public async deleteReminder(id: string): Promise<boolean> {
    const list = await this.getReminders();
    const filtered = list.filter((r) => r.id !== id);
    localStorage.setItem('pulse_buddy_reminders', JSON.stringify(filtered));
    return true;
  }

  public async getSettings(): Promise<AppSettings> {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS;
    const raw = localStorage.getItem('pulse_buddy_settings');
    if (!raw) return DEFAULT_SETTINGS;
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  public async saveSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
    const current = await this.getSettings();
    const merged = { ...current, ...patch };
    localStorage.setItem('pulse_buddy_settings', JSON.stringify(merged));
    return merged;
  }

  public async getAvatars(): Promise<Avatar[]> {
    const builtin = [...BUILTIN_AVATARS];
    if (typeof window === 'undefined') return builtin;
    const raw = localStorage.getItem('pulse_buddy_custom_avatars');
    if (!raw) return builtin;
    try {
      const customs: Avatar[] = JSON.parse(raw);
      return [...builtin, ...customs];
    } catch {
      return builtin;
    }
  }

  public async saveAvatar(avatar: Avatar): Promise<Avatar> {
    const raw = localStorage.getItem('pulse_buddy_custom_avatars');
    let list: Avatar[] = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex((a) => a.id === avatar.id);
    if (idx >= 0) {
      list[idx] = avatar;
    } else {
      list = [avatar, ...list];
    }
    localStorage.setItem('pulse_buddy_custom_avatars', JSON.stringify(list));
    return avatar;
  }

  public async deleteAvatar(id: string): Promise<boolean> {
    const raw = localStorage.getItem('pulse_buddy_custom_avatars');
    if (!raw) return false;
    let list: Avatar[] = JSON.parse(raw);
    list = list.filter((a) => a.id !== id);
    localStorage.setItem('pulse_buddy_custom_avatars', JSON.stringify(list));
    return true;
  }

  public async getHistory(): Promise<ReminderHistoryRecord[]> {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem('pulse_buddy_history');
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public async recordHistory(record: ReminderHistoryRecord): Promise<void> {
    const list = await this.getHistory();
    const updated = [record, ...list];
    localStorage.setItem('pulse_buddy_history', JSON.stringify(updated.slice(0, 500)));
  }

  public openDashboard(): void {
    window.focus();
  }

  public hideToTray(): void {
    // web noop
  }

  public quitApp(): void {
    // web noop
  }

  public onReminderTriggered(callback: (payload: ReminderTriggerPayload) => void): () => void {
    this.reminderListeners.add(callback);
    return () => this.reminderListeners.delete(callback);
  }

  public onReminderActioned(callback: (data: { reminderId: string; action: ReminderAction }) => void): () => void {
    this.actionListeners.add(callback);
    return () => this.actionListeners.delete(callback);
  }
}

// Desktop Implementation using window.pulseBuddyAPI IPC bridge
export class DesktopPlatformAdapter implements IPlatformAdapter {
  private fallback: BrowserPlatformAdapter = new BrowserPlatformAdapter();

  private get bridge(): any {
    if (typeof window !== 'undefined' && (window as any).pulseBuddyAPI) {
      return (window as any).pulseBuddyAPI;
    }
    return null;
  }

  public isDesktop(): boolean {
    return !!this.bridge;
  }

  public async getDiagnostics(): Promise<AppDiagnostics> {
    if (this.bridge?.getDiagnostics) {
      return this.bridge.getDiagnostics();
    }
    return this.fallback.getDiagnostics();
  }

  public async requestNotificationPermission(): Promise<boolean> {
    return true; // Native desktop notifications always have OS capability
  }

  public showNativeNotification(title: string, body: string, icon?: string): void {
    if (this.bridge?.showNotification) {
      this.bridge.showNotification(title, body, icon);
    } else {
      this.fallback.showNativeNotification(title, body, icon);
    }
  }

  public showCompanionOverlay(payload: ReminderTriggerPayload): void {
    if (this.bridge?.showCompanion) {
      this.bridge.showCompanion(payload);
    } else {
      this.fallback.showCompanionOverlay(payload);
    }
  }

  public closeCompanionOverlay(): void {
    if (this.bridge?.closeCompanion) {
      this.bridge.closeCompanion();
    } else {
      this.fallback.closeCompanionOverlay();
    }
  }

  public async getReminders(): Promise<Reminder[]> {
    if (this.bridge?.getReminders) {
      return this.bridge.getReminders();
    }
    return this.fallback.getReminders();
  }

  public async saveReminder(reminder: Reminder): Promise<Reminder> {
    if (this.bridge?.saveReminder) {
      return this.bridge.saveReminder(reminder);
    }
    return this.fallback.saveReminder(reminder);
  }

  public async deleteReminder(id: string): Promise<boolean> {
    if (this.bridge?.deleteReminder) {
      return this.bridge.deleteReminder(id);
    }
    return this.fallback.deleteReminder(id);
  }

  public async getSettings(): Promise<AppSettings> {
    if (this.bridge?.getSettings) {
      return this.bridge.getSettings();
    }
    return this.fallback.getSettings();
  }

  public async saveSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
    if (this.bridge?.saveSettings) {
      return this.bridge.saveSettings(settings);
    }
    return this.fallback.saveSettings(settings);
  }

  public async getAvatars(): Promise<Avatar[]> {
    if (this.bridge?.getAvatars) {
      return this.bridge.getAvatars();
    }
    return this.fallback.getAvatars();
  }

  public async saveAvatar(avatar: Avatar): Promise<Avatar> {
    if (this.bridge?.saveAvatar) {
      return this.bridge.saveAvatar(avatar);
    }
    return this.fallback.saveAvatar(avatar);
  }

  public async deleteAvatar(id: string): Promise<boolean> {
    if (this.bridge?.deleteAvatar) {
      return this.bridge.deleteAvatar(id);
    }
    return this.fallback.deleteAvatar(id);
  }

  public async getHistory(): Promise<ReminderHistoryRecord[]> {
    if (this.bridge?.getHistory) {
      return this.bridge.getHistory();
    }
    return this.fallback.getHistory();
  }

  public async recordHistory(record: ReminderHistoryRecord): Promise<void> {
    if (this.bridge?.recordHistory) {
      return this.bridge.recordHistory(record);
    }
    return this.fallback.recordHistory(record);
  }

  public openDashboard(): void {
    if (this.bridge?.openDashboard) {
      this.bridge.openDashboard();
    } else {
      this.fallback.openDashboard();
    }
  }

  public hideToTray(): void {
    if (this.bridge?.hideToTray) {
      this.bridge.hideToTray();
    }
  }

  public quitApp(): void {
    if (this.bridge?.quitApp) {
      this.bridge.quitApp();
    }
  }

  public onReminderTriggered(callback: (payload: ReminderTriggerPayload) => void): () => void {
    if (this.bridge?.onReminderTriggered) {
      return this.bridge.onReminderTriggered(callback);
    }
    return this.fallback.onReminderTriggered(callback);
  }

  public onReminderActioned(callback: (data: { reminderId: string; action: ReminderAction }) => void): () => void {
    if (this.bridge?.onReminderActioned) {
      return this.bridge.onReminderActioned(callback);
    }
    return this.fallback.onReminderActioned(callback);
  }
}

let platformInstance: IPlatformAdapter | null = null;

export function getPlatform(): IPlatformAdapter {
  if (!platformInstance) {
    if (typeof window !== 'undefined' && (window as any).pulseBuddyAPI) {
      platformInstance = new DesktopPlatformAdapter();
    } else {
      platformInstance = new BrowserPlatformAdapter();
    }
  }
  return platformInstance;
}
