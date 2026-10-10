export type AnimationState =
  | 'idle'
  | 'enter'
  | 'walk'
  | 'run'
  | 'turn'
  | 'happy'
  | 'concerned'
  | 'acknowledge'
  | 'celebrate'
  | 'thinking'
  | 'exit';

export type ReminderAction = 'completed' | 'snoozed' | 'dismissed' | 'missed';

export type ScheduleType = 'once' | 'daily' | 'interval' | 'weekly' | 'custom';

export type ReminderPriority = 'low' | 'normal' | 'high' | 'urgent';

export type MissedReminderPolicy = 'catch_up_immediate' | 'notify_missed' | 'skip_to_next';

export type SoundEffectType = 'chime' | 'water' | 'bell' | 'fanfare' | 'gentle' | 'none';

export interface RecurrenceSchedule {
  type: ScheduleType;
  time: string; // HH:mm format, e.g. "14:30"
  date?: string; // YYYY-MM-DD for one-time
  daysOfWeek?: number[]; // 0 = Sun, 1 = Mon ... 6 = Sat
  intervalMinutes?: number; // e.g., every 60 mins for hydration
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  timeZone: string; // IANA time zone, e.g. "America/New_York", "UTC"
}

export interface Reminder {
  id: string;
  title: string;
  description?: string;
  categoryId: string;
  categoryName?: string;
  categoryIcon?: string;
  categoryColor?: string;
  schedule: RecurrenceSchedule;
  snoozeDurationMinutes: number;
  priority: ReminderPriority;
  avatarId: string;
  avatarBehavior?: AnimationState;
  soundEffect: SoundEffectType;
  enabled: boolean;
  missedPolicy: MissedReminderPolicy;
  nextOccurrence: string; // ISO string
  lastTriggeredAt?: string; // ISO string
  lastCompletedAt?: string; // ISO string
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

export interface ReminderCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  defaultSound: SoundEffectType;
  defaultAvatarId?: string;
  isCustom: boolean;
  disclaimer?: string;
}

export interface ChromaKeyConfig {
  enabled: boolean;
  keyColor: string; // hex #00FF00
  similarity: number; // 0.0 - 1.0 (default 0.35)
  smoothness: number; // 0.0 - 1.0 (default 0.1)
  spillSuppression: number; // 0.0 - 1.0 (default 0.45)
}

export interface AvatarVisualEffects {
  scale?: number;
  bounceSpeed?: number;
  cropX?: number;
  cropY?: number;
  rotation?: number;
}

export type AvatarCategory = 'humans' | 'animals' | 'robots' | 'vehicles' | 'fantasy' | 'custom';
export type AvatarSourceType = 'builtin' | 'image' | 'video' | 'animated_svg';

export interface Avatar {
  id: string;
  name: string;
  description: string;
  type: AvatarSourceType;
  category: AvatarCategory;
  supportedStates: AnimationState[];
  previewUrl: string;
  sourceUrl?: string; // base64, data URL, or local file uri
  chromaKeyConfig?: ChromaKeyConfig;
  visualEffects?: AvatarVisualEffects;
  isCustom: boolean;
  isFavorite?: boolean;
  createdAt: string;
}

export interface ReminderHistoryRecord {
  id: string;
  reminderId: string;
  reminderTitle: string;
  categoryId: string;
  categoryName?: string;
  action: ReminderAction;
  scheduledFor: string; // ISO string
  performedAt: string; // ISO string
  snoozeDelayMinutes?: number;
  note?: string;
}

export interface HabitStats {
  totalCompleted: number;
  totalScheduled: number;
  currentStreak: number;
  longestStreak: number;
  completionRate: number;
  todayCompleted: number;
  todayTotal: number;
  categoryBreakdown: Record<string, number>;
}

export type CompanionPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center';
export type CompanionSize = 'small' | 'medium' | 'large';

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  soundEnabled: boolean;
  soundVolume: number; // 0.0 to 1.0
  companionPosition: CompanionPosition;
  companionSize: CompanionSize;
  displayDurationSeconds: number; // seconds to display before auto-dismissing/minimizing
  defaultAvatarId: string;
  quietHoursEnabled: boolean;
  quietHoursStart: string; // HH:mm
  quietHoursEnd: string; // HH:mm
  launchAtLogin: boolean;
  closeToTray: boolean;
  nativeNotificationFallback: boolean;
  syncEnabled: boolean;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  userToken?: string;
}

export interface ReminderTriggerPayload {
  reminder: Reminder;
  avatar: Avatar;
  speechText: string;
  scheduledTime: string;
}

export interface AppDiagnostics {
  platform: 'web' | 'electron';
  os: 'windows' | 'macos' | 'linux' | 'browser';
  backgroundServiceActive: boolean;
  notificationsPermitted: boolean;
  webPushSupported: boolean;
  nextScheduledCheck?: string;
  activeRemindersCount: number;
  lastSyncTime?: string;
  storageType: string;
}

export interface IPCApiBridge {
  getReminders: () => Promise<Reminder[]>;
  saveReminder: (reminder: Reminder) => Promise<Reminder>;
  deleteReminder: (id: string) => Promise<boolean>;
  getSettings: () => Promise<AppSettings>;
  saveSettings: (settings: Partial<AppSettings>) => Promise<AppSettings>;
  getAvatars: () => Promise<Avatar[]>;
  saveAvatar: (avatar: Avatar) => Promise<Avatar>;
  deleteAvatar: (id: string) => Promise<boolean>;
  getHistory: () => Promise<ReminderHistoryRecord[]>;
  recordHistory: (record: ReminderHistoryRecord) => Promise<void>;
  getDiagnostics: () => Promise<AppDiagnostics>;
  openDashboard: () => Promise<void>;
  hideToTray: () => Promise<void>;
  quitApp: () => Promise<void>;
  testCompanion: (reminderId?: string) => Promise<void>;
  closeCompanion: () => Promise<void>;
  respondReminderAction: (action: ReminderAction, reminderId: string, snoozeMinutes?: number) => Promise<void>;
  onReminderTriggered: (callback: (payload: ReminderTriggerPayload) => void) => () => void;
  onReminderActioned: (callback: (data: { reminderId: string; action: ReminderAction }) => void) => () => void;
}
