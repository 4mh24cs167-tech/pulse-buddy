import React, { useState, useEffect } from 'react';
import { Reminder, Avatar, AppSettings, HabitStats } from '@pulse-buddy/shared-types';
import { AvatarRenderer, soundEngine } from '@pulse-buddy/ui';
import {
  Sparkles,
  Clock,
  CheckCircle2,
  Plus,
  Flame,
  Award,
  Calendar,
  Volume2,
  ChevronRight,
  ShieldCheck,
  Play,
  RotateCcw,
} from 'lucide-react';
import { formatDistanceToNow, parseISO, isAfter } from 'date-fns';

interface DashboardViewProps {
  reminders: Reminder[];
  avatars: Avatar[];
  settings: AppSettings;
  stats: HabitStats;
  activeCompanion: Avatar;
  onQuickAdd: (title: string, categoryId: string, minutesFromNow: number) => void;
  onTriggerTest: (reminderId?: string) => void;
  onCompleteReminder: (reminderId: string) => void;
  onNavigateToTab: (tab: 'reminders' | 'studio' | 'history' | 'settings') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  reminders,
  avatars,
  settings,
  stats,
  activeCompanion,
  onQuickAdd,
  onTriggerTest,
  onCompleteReminder,
  onNavigateToTab,
}) => {
  const [quickTitle, setQuickTitle] = useState('');
  const [quickCat, setQuickCat] = useState('hydration');
  const [quickMins, setQuickMins] = useState(30);
  const [companionState, setCompanionState] = useState<'idle' | 'happy' | 'celebrate' | 'concerned' | 'thinking'>('idle');

  // Find next reminder
  const enabledReminders = reminders.filter((r) => r.enabled);
  const sorted = [...enabledReminders].sort(
    (a, b) => new Date(a.nextOccurrence).getTime() - new Date(b.nextOccurrence).getTime()
  );
  const nextReminder = sorted[0];

  const triggerCompanionEmotion = (state: 'idle' | 'happy' | 'celebrate' | 'concerned' | 'thinking') => {
    setCompanionState(state);
    if (state === 'celebrate') {
      soundEngine.playCelebrationFanfare();
    } else {
      soundEngine.play('chime');
    }
    setTimeout(() => {
      setCompanionState('idle');
    }, 3000);
  };

  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    onQuickAdd(quickTitle.trim(), quickCat, quickMins);
    setQuickTitle('');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Welcome & Platform Status Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-gradient-to-r from-sky-500/10 via-brand-500/5 to-purple-500/10 border border-sky-100 dark:border-sky-900/40 rounded-3xl">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider bg-sky-500 text-white rounded-full">
              Companion Active
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Desktop background engine running quietly
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Welcome back to Pulse Buddy
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-xl">
            Your animated companion <span className="font-semibold text-sky-600 dark:text-sky-400">{activeCompanion.name}</span> will pop up when tasks become due, keeping your habits delightful and on track.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onTriggerTest(nextReminder?.id)}
            className="flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm rounded-2xl shadow-md transition-all active:scale-95"
          >
            <Play size={16} />
            Test Desktop Overlay
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Current Streak</span>
            <Flame size={20} className="text-amber-500" />
          </div>
          <div className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">
            {stats.currentStreak} <span className="text-sm font-medium text-slate-500">days</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Best: {stats.longestStreak} days</p>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Today's Progress</span>
            <CheckCircle2 size={20} className="text-emerald-500" />
          </div>
          <div className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">
            {stats.todayCompleted} <span className="text-sm font-medium text-slate-500">done</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">{stats.completionRate}% completion rate</p>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Reminders</span>
            <Clock size={20} className="text-sky-500" />
          </div>
          <div className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">
            {enabledReminders.length} <span className="text-sm font-medium text-slate-500">active</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">{reminders.length} total configured</p>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Lifetime</span>
            <Award size={20} className="text-purple-500" />
          </div>
          <div className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">
            {stats.totalCompleted} <span className="text-sm font-medium text-slate-500">wins</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Recorded in local log</p>
        </div>
      </div>

      {/* Main Grid: Next Reminder Hero + Companion Showcase */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Next Reminder Hero (Col 7) */}
        <div className="lg:col-span-7 flex flex-col justify-between p-7 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 px-3 py-1 rounded-full border border-sky-100 dark:border-sky-900">
                Next Upcoming Reminder
              </span>
              {nextReminder && (
                <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                  <Clock size={13} />
                  {formatDistanceToNow(parseISO(nextReminder.nextOccurrence), { addSuffix: true })}
                </span>
              )}
            </div>

            {nextReminder ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    {nextReminder.title}
                  </h3>
                  {nextReminder.description && (
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                      {nextReminder.description}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase"
                    style={{
                      backgroundColor: `${nextReminder.categoryColor}20`,
                      color: nextReminder.categoryColor || '#0ea5e9',
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: nextReminder.categoryColor || '#0ea5e9' }}
                    />
                    {nextReminder.categoryName || 'Reminder'}
                  </span>

                  <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full font-medium">
                    Scheduled: {new Date(nextReminder.nextOccurrence).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>

                  <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full font-medium capitalize">
                    {nextReminder.schedule.type} recurrence
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500">
                <Clock size={36} className="mx-auto mb-2 text-slate-400" />
                <p className="font-semibold">No reminders scheduled</p>
                <p className="text-xs mt-1">Create a reminder or use the quick add bar below.</p>
              </div>
            )}
          </div>

          {nextReminder && (
            <div className="flex items-center gap-3 pt-6 border-t border-slate-100 dark:border-slate-800 mt-6">
              <button
                onClick={() => onCompleteReminder(nextReminder.id)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-2xl shadow-sm transition active:scale-95"
              >
                <CheckCircle2 size={18} />
                Mark as Completed Now
              </button>
              <button
                onClick={() => onTriggerTest(nextReminder.id)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-sm rounded-2xl transition"
              >
                Preview Overlay
              </button>
            </div>
          )}
        </div>

        {/* Companion Interactive Showcase (Col 5) */}
        <div className="lg:col-span-5 flex flex-col items-center justify-between p-7 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm text-center">
          <div className="w-full flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Default Companion
            </span>
            <button
              onClick={() => onNavigateToTab('studio')}
              className="text-xs text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 font-semibold"
            >
              Change in Studio <ChevronRight size={14} />
            </button>
          </div>

          {/* Avatar Rig with live emotion testing */}
          <div className="py-2 flex flex-col items-center">
            <AvatarRenderer avatar={activeCompanion} state={companionState} size={180} />
            <h4 className="text-lg font-extrabold text-slate-900 dark:text-white mt-3">
              {activeCompanion.name}
            </h4>
            <p className="text-xs text-slate-500 max-w-xs mt-0.5 line-clamp-2">
              {activeCompanion.description}
            </p>
          </div>

          {/* Emotion State Trigger Buttons */}
          <div className="w-full pt-4 border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs text-slate-400 mb-2 font-medium">Test companion reaction states:</p>
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => triggerCompanionEmotion('happy')}
                className="px-2 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition"
              >
                Wave 👋
              </button>
              <button
                onClick={() => triggerCompanionEmotion('celebrate')}
                className="px-2 py-1.5 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-xl transition"
              >
                Celebrate 🎉
              </button>
              <button
                onClick={() => triggerCompanionEmotion('concerned')}
                className="px-2 py-1.5 text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 rounded-xl transition"
              >
                Concerned 🥺
              </button>
              <button
                onClick={() => triggerCompanionEmotion('thinking')}
                className="px-2 py-1.5 text-xs font-semibold bg-sky-50 hover:bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 rounded-xl transition"
              >
                Thinking 🤔
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Add Bar */}
      <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
          <Plus size={16} className="text-sky-500" />
          Quick Add Reminder
        </h3>

        <form onSubmit={handleQuickAddSubmit} className="flex flex-col md:flex-row items-center gap-3">
          <input
            type="text"
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            placeholder="e.g. Sip 500ml water, Take Vitamin D, Stretch neck & shoulders..."
            className="flex-1 w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />

          <select
            value={quickCat}
            onChange={(e) => setQuickCat(e.target.value)}
            className="w-full md:w-auto px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="hydration">💧 Hydration</option>
            <option value="posture">👀 Posture & Eye Break</option>
            <option value="medication">💊 Medication</option>
            <option value="exercise">🏃 Exercise & Walk</option>
            <option value="meals">🍎 Meal / Snack</option>
            <option value="work">💼 Work Sprint</option>
            <option value="studying">📚 Study Session</option>
            <option value="habits">⭐ Habit</option>
          </select>

          <select
            value={quickMins}
            onChange={(e) => setQuickMins(Number(e.target.value))}
            className="w-full md:w-auto px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value={15}>In 15 mins</option>
            <option value={30}>In 30 mins</option>
            <option value={45}>In 45 mins</option>
            <option value={60}>In 1 hour</option>
            <option value={120}>In 2 hours</option>
          </select>

          <button
            type="submit"
            className="w-full md:w-auto px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm rounded-2xl shadow-sm transition active:scale-95 whitespace-nowrap"
          >
            Add Reminder
          </button>
        </form>
      </div>

      {/* Today's Schedule List */}
      <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar size={18} className="text-sky-500" />
            Scheduled Queue
          </h3>
          <button
            onClick={() => onNavigateToTab('reminders')}
            className="text-xs text-sky-600 dark:text-sky-400 font-semibold hover:underline flex items-center gap-1"
          >
            Manage All ({reminders.length}) <ChevronRight size={14} />
          </button>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {enabledReminders.slice(0, 5).map((reminder) => (
            <div key={reminder.id} className="py-3.5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: reminder.categoryColor || '#0ea5e9' }}
                />
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                    {reminder.title}
                  </h4>
                  <p className="text-xs text-slate-500">
                    {new Date(reminder.nextOccurrence).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {reminder.categoryName || 'Reminder'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onCompleteReminder(reminder.id)}
                  title="Mark done"
                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl transition"
                >
                  <CheckCircle2 size={20} />
                </button>
              </div>
            </div>
          ))}

          {enabledReminders.length === 0 && (
            <p className="py-6 text-center text-xs text-slate-400">
              No active reminders in the queue.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
