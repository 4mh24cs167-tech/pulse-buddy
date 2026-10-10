import { Reminder, AppSettings, ReminderHistoryRecord, Avatar } from '@pulse-buddy/shared-types';

export interface SyncPayload {
  version: number;
  exportedAt: string;
  reminders: Reminder[];
  settings: AppSettings;
  history: ReminderHistoryRecord[];
  customAvatars: Avatar[];
}

/**
 * Validates and merges cloud or remote data with local state.
 * Uses updated-at timestamps with last-write-wins conflict resolution.
 */
export function reconcileReminders(local: Reminder[], remote: Reminder[]): Reminder[] {
  const mergedMap = new Map<string, Reminder>();

  for (const item of local) {
    mergedMap.set(item.id, item);
  }

  for (const remoteItem of remote) {
    const existing = mergedMap.get(remoteItem.id);
    if (!existing) {
      mergedMap.set(remoteItem.id, remoteItem);
    } else {
      const localTime = new Date(existing.updatedAt).getTime();
      const remoteTime = new Date(remoteItem.updatedAt).getTime();
      if (remoteTime > localTime) {
        mergedMap.set(remoteItem.id, remoteItem);
      }
    }
  }

  return Array.from(mergedMap.values());
}

/**
 * Reconciles history records (set union by record ID).
 */
export function reconcileHistory(
  local: ReminderHistoryRecord[],
  remote: ReminderHistoryRecord[]
): ReminderHistoryRecord[] {
  const map = new Map<string, ReminderHistoryRecord>();
  for (const item of local) {
    map.set(item.id, item);
  }
  for (const item of remote) {
    if (!map.has(item.id)) {
      map.set(item.id, item);
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime()
  );
}

/**
 * Generates Supabase PostgreSQL schema for cross-device sync.
 */
export function getSupabaseSchemaSQL(): string {
  return `
-- Pulse Buddy Supabase Synchronization Schema
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Reminders Table
create table if not exists public.reminders (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  description text,
  category_id text not null,
  schedule jsonb not null,
  snooze_duration_minutes int default 10,
  priority text default 'normal',
  avatar_id text default 'default',
  sound_effect text default 'chime',
  enabled boolean default true,
  missed_policy text default 'catch_up_immediate',
  next_occurrence timestamptz not null,
  last_triggered_at timestamptz,
  last_completed_at timestamptz,
  created_at timestamptz default timezone('utc'::text, now()),
  updated_at timestamptz default timezone('utc'::text, now())
);

-- Reminder History Table
create table if not exists public.reminder_history (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  reminder_id text not null,
  reminder_title text not null,
  category_id text not null,
  action text not null,
  scheduled_for timestamptz not null,
  performed_at timestamptz default timezone('utc'::text, now()),
  snooze_delay_minutes int,
  note text
);

-- User Settings Table
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  settings jsonb not null,
  updated_at timestamptz default timezone('utc'::text, now())
);

-- RLS (Row Level Security)
alter table public.reminders enable row level security;
alter table public.reminder_history enable row level security;
alter table public.user_settings enable row level security;

create policy "Users can manage own reminders"
  on public.reminders for all
  using (auth.uid() = user_id);

create policy "Users can manage own history"
  on public.reminder_history for all
  using (auth.uid() = user_id);

create policy "Users can manage own settings"
  on public.user_settings for all
  using (auth.uid() = user_id);
  `.trim();
}
