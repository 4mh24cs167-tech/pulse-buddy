import React from 'react';
import { ReminderHistoryRecord, HabitStats } from '@pulse-buddy/shared-types';
import {
  Flame,
  Award,
  CheckCircle2,
  Clock,
  XCircle,
  TrendingUp,
  Calendar,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';

interface HistoryViewProps {
  history: ReminderHistoryRecord[];
  stats: HabitStats;
  onClearHistory?: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  history,
  stats,
  onClearHistory,
}) => {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Header */}
      <div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          History & Habit Analytics
        </h2>
        <p className="text-sm text-slate-500">
          Transparent activity logs and verified streak statistics without inflated numbers.
        </p>
      </div>

      {/* Habit Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Current Streak</span>
            <Flame size={22} className="text-amber-500" />
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white">
            {stats.currentStreak} <span className="text-sm font-semibold text-slate-500">days</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Contiguous days with verified actions</p>
        </div>

        <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Longest Streak</span>
            <Award size={22} className="text-sky-500" />
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white">
            {stats.longestStreak} <span className="text-sm font-semibold text-slate-500">days</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">All-time personal record</p>
        </div>

        <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Verified Completion</span>
            <CheckCircle2 size={22} className="text-emerald-500" />
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white">
            {stats.completionRate}%
          </div>
          <p className="text-xs text-slate-400 mt-1">{stats.totalCompleted} completed of {stats.totalScheduled} total</p>
        </div>

        <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Today's Ratio</span>
            <TrendingUp size={22} className="text-purple-500" />
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white">
            {stats.todayCompleted} <span className="text-sm font-semibold text-slate-500">done</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">{stats.todayTotal} reminders handled today</p>
        </div>
      </div>

      {/* Category Breakdown Progress */}
      <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Sparkles size={18} className="text-sky-500" />
          Completions by Activity Category
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(stats.categoryBreakdown).map(([category, count]) => (
            <div key={category} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 capitalize">
                <span>{category}</span>
                <span>{count} wins</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-sky-500 h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, Math.round((count / Math.max(1, stats.totalCompleted)) * 100))}%`,
                  }}
                />
              </div>
            </div>
          ))}

          {Object.keys(stats.categoryBreakdown).length === 0 && (
            <p className="text-xs text-slate-400 col-span-2 py-4 text-center">
              Complete reminders to see activity breakdown statistics.
            </p>
          )}
        </div>
      </div>

      {/* Detailed Activity Log Table */}
      <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock size={18} className="text-sky-500" />
            Activity Log ({history.length} events)
          </h3>

          {history.length > 0 && onClearHistory && (
            <button
              onClick={onClearHistory}
              className="text-xs text-slate-400 hover:text-rose-500 font-semibold transition"
            >
              Clear Log
            </button>
          )}
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {history.map((record) => {
            let actionBadgeClass = 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
            let actionIcon = <Clock size={14} />;

            if (record.action === 'completed') {
              actionBadgeClass = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300';
              actionIcon = <CheckCircle2 size={14} />;
            } else if (record.action === 'snoozed') {
              actionBadgeClass = 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300';
              actionIcon = <Clock size={14} />;
            } else if (record.action === 'missed') {
              actionBadgeClass = 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300';
              actionIcon = <AlertCircle size={14} />;
            } else if (record.action === 'dismissed') {
              actionBadgeClass = 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
              actionIcon = <XCircle size={14} />;
            }

            return (
              <div key={record.id} className="py-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase ${actionBadgeClass}`}
                  >
                    {actionIcon}
                    {record.action}
                  </span>

                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {record.reminderTitle}
                    </h4>
                    <p className="text-xs text-slate-500">
                      Category: {record.categoryName || record.categoryId || 'General'}
                      {record.snoozeDelayMinutes && ` • Snooze: ${record.snoozeDelayMinutes}m`}
                    </p>
                  </div>
                </div>

                <div className="text-right text-xs text-slate-400 shrink-0">
                  <div>
                    {new Date(record.performedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div>
                    {new Date(record.performedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              </div>
            );
          })}

          {history.length === 0 && (
            <p className="py-12 text-center text-xs text-slate-400">
              No recorded reminder actions yet. When you complete or snooze tasks, your logs will populate here.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
