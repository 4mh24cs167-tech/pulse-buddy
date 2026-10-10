import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import {
  Reminder,
  AppSettings,
  Avatar,
  ReminderHistoryRecord,
} from '@pulse-buddy/shared-types';

export interface DesktopStoreData {
  version: number;
  reminders: Reminder[];
  settings: AppSettings;
  customAvatars: Avatar[];
  history: ReminderHistoryRecord[];
}

const DEFAULT_SETTINGS: AppSettings = {
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

const SEED_REMINDERS: Reminder[] = [
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
      timeZone: 'UTC',
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
      timeZone: 'UTC',
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
];

export class DesktopStore {
  private filePath: string;
  private data: DesktopStoreData;

  constructor() {
    try {
      const userDataDir = app.getPath('userData');
      if (!fs.existsSync(userDataDir)) {
        fs.mkdirSync(userDataDir, { recursive: true });
      }
      this.filePath = path.join(userDataDir, 'pulse-buddy-store.json');
    } catch {
      this.filePath = path.join(process.cwd(), 'pulse-buddy-store.json');
    }

    this.data = this.load();
  }

  private load(): DesktopStoreData {
    if (fs.existsSync(this.filePath)) {
      try {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          version: 1,
          reminders: parsed.reminders || SEED_REMINDERS,
          settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
          customAvatars: parsed.customAvatars || [],
          history: parsed.history || [],
        };
      } catch (err) {
        console.error('Failed to parse desktop store, using defaults:', err);
      }
    }

    const initial: DesktopStoreData = {
      version: 1,
      reminders: SEED_REMINDERS,
      settings: DEFAULT_SETTINGS,
      customAvatars: [],
      history: [],
    };
    this.saveDirect(initial);
    return initial;
  }

  private saveDirect(data: DesktopStoreData): void {
    try {
      const tempPath = `${this.filePath}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tempPath, this.filePath);
    } catch (err) {
      console.error('Failed to save desktop store to disk:', err);
    }
  }

  public getReminders(): Reminder[] {
    return this.data.reminders;
  }

  public saveReminder(reminder: Reminder): Reminder {
    const list = this.data.reminders;
    const idx = list.findIndex((r) => r.id === reminder.id);
    if (idx >= 0) {
      list[idx] = reminder;
    } else {
      list.unshift(reminder);
    }
    this.saveDirect(this.data);
    return reminder;
  }

  public deleteReminder(id: string): boolean {
    this.data.reminders = this.data.reminders.filter((r) => r.id !== id);
    this.saveDirect(this.data);
    return true;
  }

  public getSettings(): AppSettings {
    return this.data.settings;
  }

  public saveSettings(patch: Partial<AppSettings>): AppSettings {
    this.data.settings = { ...this.data.settings, ...patch };
    this.saveDirect(this.data);
    return this.data.settings;
  }

  public getCustomAvatars(): Avatar[] {
    return this.data.customAvatars;
  }

  public saveCustomAvatar(avatar: Avatar): Avatar {
    const list = this.data.customAvatars;
    const idx = list.findIndex((a) => a.id === avatar.id);
    if (idx >= 0) {
      list[idx] = avatar;
    } else {
      list.unshift(avatar);
    }
    this.saveDirect(this.data);
    return avatar;
  }

  public deleteCustomAvatar(id: string): boolean {
    this.data.customAvatars = this.data.customAvatars.filter((a) => a.id !== id);
    this.saveDirect(this.data);
    return true;
  }

  public getHistory(): ReminderHistoryRecord[] {
    return this.data.history;
  }

  public recordHistory(record: ReminderHistoryRecord): void {
    this.data.history.unshift(record);
    if (this.data.history.length > 500) {
      this.data.history = this.data.history.slice(0, 500);
    }
    this.saveDirect(this.data);
  }
}
