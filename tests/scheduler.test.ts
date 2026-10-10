import { describe, it, expect } from 'vitest';
import {
  calculateNextOccurrence,
  calculateSnoozeTime,
  isWithinQuietHours,
  evaluateDueReminders,
  advanceReminderSchedule,
  generateContextualSpeech,
} from '../packages/core/src/scheduler';
import { Reminder, RecurrenceSchedule, AppSettings } from '../packages/shared-types/src';
import { addMinutes, addDays, parseISO } from 'date-fns';

describe('Reminder Scheduling Engine', () => {
  it('calculates interval recurrence correctly', () => {
    const from = new Date('2026-10-10T10:00:00.000Z');
    const schedule: RecurrenceSchedule = {
      type: 'interval',
      time: '10:00',
      intervalMinutes: 45,
      timeZone: 'UTC',
    };
    const next = calculateNextOccurrence(schedule, from);
    expect(next.getTime()).toBe(from.getTime() + 45 * 60 * 1000);
  });

  it('calculates daily recurrence for future time today vs tomorrow', () => {
    const fromMorning = new Date('2026-10-10T08:00:00');
    const schedule: RecurrenceSchedule = {
      type: 'daily',
      time: '14:30',
      timeZone: 'UTC',
    };
    const nextToday = calculateNextOccurrence(schedule, fromMorning);
    expect(nextToday.getHours()).toBe(14);
    expect(nextToday.getMinutes()).toBe(30);
    expect(nextToday.getDate()).toBe(10);

    const fromEvening = new Date('2026-10-10T18:00:00');
    const nextTomorrow = calculateNextOccurrence(schedule, fromEvening);
    expect(nextTomorrow.getHours()).toBe(14);
    expect(nextTomorrow.getMinutes()).toBe(30);
    expect(nextTomorrow.getDate()).toBe(11);
  });

  it('calculates weekly recurrence for selected weekdays', () => {
    // 2026-10-10 is Saturday (day 6)
    const fromSat = new Date('2026-10-10T10:00:00');
    const schedule: RecurrenceSchedule = {
      type: 'weekly',
      time: '09:00',
      daysOfWeek: [1, 3], // Mon and Wed
      timeZone: 'UTC',
    };
    const next = calculateNextOccurrence(schedule, fromSat);
    expect(next.getDay()).toBe(1); // Next Monday
  });

  it('calculates snooze time deterministically', () => {
    const now = new Date('2026-10-10T12:00:00.000Z');
    const snoozed = calculateSnoozeTime(now, 10);
    expect(snoozed.getTime()).toBe(now.getTime() + 10 * 60 * 1000);
  });

  describe('Quiet Hours Evaluation', () => {
    it('correctly detects quiet hours spanning midnight', () => {
      const settings = {
        quietHoursEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
      };

      const midnight = new Date('2026-10-10T23:30:00');
      const earlyMorning = new Date('2026-10-10T05:00:00');
      const midday = new Date('2026-10-10T14:00:00');

      expect(isWithinQuietHours(settings, midnight)).toBe(true);
      expect(isWithinQuietHours(settings, earlyMorning)).toBe(true);
      expect(isWithinQuietHours(settings, midday)).toBe(false);
    });

    it('returns false when quiet hours are disabled', () => {
      const settings = {
        quietHoursEnabled: false,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
      };
      const midnight = new Date('2026-10-10T23:30:00');
      expect(isWithinQuietHours(settings, midnight)).toBe(false);
    });
  });

  describe('Due Evaluation and Missed Catch-Up Policy', () => {
    const baseReminder: Reminder = {
      id: 'rem-1',
      title: 'Hydration break',
      categoryId: 'hydration',
      schedule: {
        type: 'interval',
        time: '10:00',
        intervalMinutes: 60,
        timeZone: 'UTC',
      },
      snoozeDurationMinutes: 10,
      priority: 'normal',
      avatarId: 'pip-penguin',
      soundEffect: 'water',
      enabled: true,
      missedPolicy: 'catch_up_immediate',
      nextOccurrence: '2026-10-10T10:00:00.000Z',
      createdAt: '2026-10-10T09:00:00.000Z',
      updatedAt: '2026-10-10T09:00:00.000Z',
    };

    it('triggers immediately when due within normal threshold', () => {
      const now = new Date('2026-10-10T10:05:00.000Z');
      const result = evaluateDueReminders([baseReminder], now);
      expect(result.dueToTrigger.length).toBe(1);
      expect(result.dueToTrigger[0].id).toBe('rem-1');
    });

    it('handles missed policy after system sleep (>2 hours overdue)', () => {
      const now = new Date('2026-10-10T14:00:00.000Z'); // 4 hours late
      const skipPolicyReminder: Reminder = {
        ...baseReminder,
        missedPolicy: 'skip_to_next',
      };
      const result = evaluateDueReminders([skipPolicyReminder], now);
      expect(result.dueToTrigger.length).toBe(0);
      expect(result.missedSuppressed.length).toBe(1);
    });

    it('defers non-urgent reminders during quiet hours', () => {
      const now = new Date('2026-10-10T23:00:00');
      const reminder: Reminder = {
        ...baseReminder,
        nextOccurrence: '2026-10-10T22:30:00',
        priority: 'normal',
      };
      const settings = {
        quietHoursEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
      };
      const result = evaluateDueReminders([reminder], now, settings);
      expect(result.deferredForQuietHours.length).toBe(1);
      expect(result.dueToTrigger.length).toBe(0);
    });
  });

  describe('Speech Generation', () => {
    it('generates friendly contextual speech for hydration', () => {
      const reminder: Reminder = {
        id: 'rem-h',
        title: 'Drink 250ml water',
        categoryId: 'hydration',
        schedule: { type: 'daily', time: '10:00', timeZone: 'UTC' },
        snoozeDurationMinutes: 10,
        priority: 'normal',
        avatarId: 'pip-penguin',
        soundEffect: 'water',
        enabled: true,
        missedPolicy: 'catch_up_immediate',
        nextOccurrence: '2026-10-10T10:00:00.000Z',
        createdAt: '',
        updatedAt: '',
      };
      const speech = generateContextualSpeech(reminder);
      expect(speech).toContain('water');
    });
  });
});
