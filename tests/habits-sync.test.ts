import { describe, it, expect } from 'vitest';
import {
  computeHabitStats,
  reconcileReminders,
  reconcileHistory,
  getSupabaseSchemaSQL,
} from '../packages/core/src';
import { Reminder, ReminderHistoryRecord } from '../packages/shared-types/src';

describe('Habit Analytics & Streaks Engine', () => {
  it('calculates current streak and longest streak accurately', () => {
    const today = new Date('2026-10-10T12:00:00Z');

    const history: ReminderHistoryRecord[] = [
      {
        id: 'h1',
        reminderId: 'r1',
        reminderTitle: 'Water',
        categoryId: 'hydration',
        action: 'completed',
        scheduledFor: '2026-10-10T10:00:00Z',
        performedAt: '2026-10-10T10:05:00Z',
      },
      {
        id: 'h2',
        reminderId: 'r1',
        reminderTitle: 'Water',
        categoryId: 'hydration',
        action: 'completed',
        scheduledFor: '2026-10-09T10:00:00Z',
        performedAt: '2026-10-09T10:05:00Z',
      },
      {
        id: 'h3',
        reminderId: 'r1',
        reminderTitle: 'Water',
        categoryId: 'hydration',
        action: 'completed',
        scheduledFor: '2026-10-08T10:00:00Z',
        performedAt: '2026-10-08T10:05:00Z',
      },
    ];

    const stats = computeHabitStats(history, [], today);
    expect(stats.currentStreak).toBe(3);
    expect(stats.longestStreak).toBe(3);
    expect(stats.totalCompleted).toBe(3);
    expect(stats.completionRate).toBe(100);
    expect(stats.categoryBreakdown['hydration']).toBe(3);
  });
});

describe('Cloud Synchronization & Reconciliation', () => {
  it('reconciles reminders using last-write-wins', () => {
    const local: Reminder[] = [
      {
        id: 'r1',
        title: 'Old Title',
        categoryId: 'hydration',
        schedule: { type: 'daily', time: '10:00', timeZone: 'UTC' },
        snoozeDurationMinutes: 10,
        priority: 'normal',
        avatarId: 'pip-penguin',
        soundEffect: 'water',
        enabled: true,
        missedPolicy: 'catch_up_immediate',
        nextOccurrence: '2026-10-10T10:00:00Z',
        createdAt: '2026-10-01T00:00:00Z',
        updatedAt: '2026-10-01T10:00:00Z',
      },
    ];

    const remote: Reminder[] = [
      {
        ...local[0],
        title: 'New Cloud Title',
        updatedAt: '2026-10-05T12:00:00Z', // newer
      },
      {
        id: 'r2',
        title: 'Brand New Remote Reminder',
        categoryId: 'medication',
        schedule: { type: 'daily', time: '14:00', timeZone: 'UTC' },
        snoozeDurationMinutes: 10,
        priority: 'high',
        avatarId: 'dr-robo',
        soundEffect: 'chime',
        enabled: true,
        missedPolicy: 'catch_up_immediate',
        nextOccurrence: '2026-10-10T14:00:00Z',
        createdAt: '2026-10-05T00:00:00Z',
        updatedAt: '2026-10-05T12:00:00Z',
      },
    ];

    const merged = reconcileReminders(local, remote);
    expect(merged.length).toBe(2);

    const r1 = merged.find((r) => r.id === 'r1');
    expect(r1?.title).toBe('New Cloud Title');
  });

  it('generates valid Supabase PostgreSQL schema with RLS policies', () => {
    const sql = getSupabaseSchemaSQL();
    expect(sql).toContain('create table if not exists public.reminders');
    expect(sql).toContain('alter table public.reminders enable row level security');
    expect(sql).toContain('create policy "Users can manage own reminders"');
  });
});
