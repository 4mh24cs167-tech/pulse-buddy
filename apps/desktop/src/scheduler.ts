import { powerMonitor, Notification } from 'electron';
import { DesktopStore } from './store';
import { CompanionWindowManager } from './companionManager';
import {
  evaluateDueReminders,
  advanceReminderSchedule,
  calculateSnoozeTime,
  generateContextualSpeech,
} from '@pulse-buddy/core';
import { BUILTIN_AVATARS } from '@pulse-buddy/avatar';
import { Reminder, ReminderAction, ReminderTriggerPayload } from '@pulse-buddy/shared-types';

export class DesktopReminderScheduler {
  private store: DesktopStore;
  private companionManager: CompanionWindowManager;
  private checkInterval: NodeJS.Timeout | null = null;
  private isPaused: boolean = false;
  private lastEvaluationTime: Date = new Date();

  constructor(store: DesktopStore, companionManager: CompanionWindowManager) {
    this.store = store;
    this.companionManager = companionManager;

    // Listen to power events (system sleep / wake)
    powerMonitor.on('resume', () => {
      console.log('System resumed from sleep. Catching up on missed reminders...');
      this.checkDueReminders();
    });

    powerMonitor.on('suspend', () => {
      console.log('System entering sleep mode.');
    });
  }

  public start(): void {
    if (this.checkInterval) return;
    this.checkInterval = setInterval(() => {
      if (!this.isPaused) {
        this.checkDueReminders();
      }
    }, 5000); // Check every 5s
    this.checkDueReminders();
  }

  public stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  public pause(): void {
    this.isPaused = true;
  }

  public resume(): void {
    this.isPaused = false;
    this.checkDueReminders();
  }

  public getPausedStatus(): boolean {
    return this.isPaused;
  }

  public checkDueReminders(): void {
    const now = new Date();
    this.lastEvaluationTime = now;

    const reminders = this.store.getReminders();
    const settings = this.store.getSettings();

    const evaluation = evaluateDueReminders(reminders, now, settings);

    // Suppress overdue missed reminders without bombarding
    for (const suppressed of evaluation.missedSuppressed) {
      this.store.recordHistory({
        id: `missed-${Date.now()}-${suppressed.id}`,
        reminderId: suppressed.id,
        reminderTitle: suppressed.title,
        categoryId: suppressed.categoryId,
        categoryName: suppressed.categoryName,
        action: 'missed',
        scheduledFor: suppressed.nextOccurrence,
        performedAt: now.toISOString(),
      });
      const advanced = advanceReminderSchedule(suppressed, now);
      this.store.saveReminder(advanced);
    }

    // Trigger due reminders
    for (const reminder of evaluation.dueToTrigger) {
      this.triggerReminder(reminder);
    }
  }

  public triggerReminder(reminder: Reminder): void {
    const settings = this.store.getSettings();
    const allAvatars = [...BUILTIN_AVATARS, ...this.store.getCustomAvatars()];
    const avatar =
      allAvatars.find((a) => a.id === reminder.avatarId) ||
      allAvatars.find((a) => a.id === settings.defaultAvatarId) ||
      BUILTIN_AVATARS[0];

    const speechText = generateContextualSpeech(reminder);

    const payload: ReminderTriggerPayload = {
      reminder,
      avatar,
      speechText,
      scheduledTime: reminder.nextOccurrence,
    };

    // Show transparent companion overlay
    this.companionManager.show(
      payload,
      settings.companionPosition,
      settings.companionSize,
      settings.displayDurationSeconds,
      (action, remId, snoozeMins) => {
        this.handleAction(action as ReminderAction, remId, snoozeMins);
      }
    );

    // If native notification fallback is enabled
    if (settings.nativeNotificationFallback && Notification.isSupported()) {
      new Notification({
        title: `Pulse Buddy: ${reminder.title}`,
        body: speechText,
        silent: true, // Audio handled by avatar companion
      }).show();
    }
  }

  public handleAction(action: ReminderAction, reminderId: string, snoozeMinutes?: number): void {
    const now = new Date();
    const reminders = this.store.getReminders();
    const reminder = reminders.find((r) => r.id === reminderId);
    if (!reminder) return;

    this.store.recordHistory({
      id: `hist-${Date.now()}-${reminder.id}`,
      reminderId: reminder.id,
      reminderTitle: reminder.title,
      categoryId: reminder.categoryId,
      categoryName: reminder.categoryName,
      action,
      scheduledFor: reminder.nextOccurrence,
      performedAt: now.toISOString(),
      snoozeDelayMinutes: snoozeMinutes,
    });

    if (action === 'completed') {
      const advanced = advanceReminderSchedule(reminder, now);
      advanced.lastCompletedAt = now.toISOString();
      this.store.saveReminder(advanced);
    } else if (action === 'snoozed') {
      const snoozeMins = snoozeMinutes || reminder.snoozeDurationMinutes || 10;
      const nextTime = calculateSnoozeTime(now, snoozeMins);
      const updated: Reminder = {
        ...reminder,
        nextOccurrence: nextTime.toISOString(),
        updatedAt: now.toISOString(),
      };
      this.store.saveReminder(updated);
    } else if (action === 'dismissed') {
      const advanced = advanceReminderSchedule(reminder, now);
      this.store.saveReminder(advanced);
    }

    this.companionManager.close();
  }
}
