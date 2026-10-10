import React, { useState, useEffect } from 'react';
import {
  Reminder,
  AppSettings,
  Avatar,
  ReminderHistoryRecord,
  HabitStats,
  AppDiagnostics,
  ReminderTriggerPayload,
  ReminderAction,
} from '@pulse-buddy/shared-types';
import { getPlatform, INITIAL_SEED_REMINDERS, DEFAULT_SETTINGS } from '@pulse-buddy/platform';
import { computeHabitStats, evaluateDueReminders, advanceReminderSchedule, calculateSnoozeTime, generateContextualSpeech } from '@pulse-buddy/core';
import { BUILTIN_AVATARS } from '@pulse-buddy/avatar';
import { CompanionBubble, soundEngine } from '@pulse-buddy/ui';
import confetti from 'canvas-confetti';

import { DashboardView } from './views/DashboardView';
import { RemindersView } from './views/RemindersView';
import { AvatarStudioView } from './views/AvatarStudioView';
import { HistoryView } from './views/HistoryView';
import { SettingsView } from './views/SettingsView';

import {
  Home,
  Clock,
  Sparkles,
  BarChart3,
  Settings as SettingsIcon,
  Bell,
  Laptop,
  Globe,
  Sun,
  Moon,
  ShieldCheck,
} from 'lucide-react';

export const App: React.FC = () => {
  const platform = getPlatform();

  // Navigation tab
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'reminders' | 'studio' | 'history' | 'settings'>('dashboard');

  // Application Data State
  const [reminders, setReminders] = useState<Reminder[]>(INITIAL_SEED_REMINDERS);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [avatars, setAvatars] = useState<Avatar[]>(BUILTIN_AVATARS);
  const [history, setHistory] = useState<ReminderHistoryRecord[]>([]);
  const [diagnostics, setDiagnostics] = useState<AppDiagnostics>({
    platform: 'web',
    os: 'browser',
    backgroundServiceActive: true,
    notificationsPermitted: false,
    webPushSupported: false,
    activeRemindersCount: 0,
    storageType: 'localStorage',
  });

  // Active in-page overlay trigger for browser mode or preview test
  const [activeTrigger, setActiveTrigger] = useState<ReminderTriggerPayload | null>(null);

  // Initialize data
  useEffect(() => {
    async function loadData() {
      try {
        const [loadedReminders, loadedSettings, loadedAvatars, loadedHistory, loadedDiag] = await Promise.all([
          platform.getReminders(),
          platform.getSettings(),
          platform.getAvatars(),
          platform.getHistory(),
          platform.getDiagnostics(),
        ]);

        setReminders(loadedReminders);
        setSettings(loadedSettings);
        setAvatars(loadedAvatars);
        setHistory(loadedHistory);
        setDiagnostics(loadedDiag);

        // Sound initial volume
        soundEngine.setVolume(loadedSettings.soundVolume);
        soundEngine.setEnabled(loadedSettings.soundEnabled);
      } catch (err) {
        console.error('Failed to load initial data:', err);
      }
    }

    loadData();

    // Listen for platform triggered reminder
    const unsubscribeTrigger = platform.onReminderTriggered((payload) => {
      setActiveTrigger(payload);
    });

    return () => {
      unsubscribeTrigger();
    };
  }, []);

  // Theme synchronization
  useEffect(() => {
    const isDark =
      settings.theme === 'dark' ||
      (settings.theme === 'system' &&
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  // Web in-browser scheduler loop (checks due reminders every 5s if in web browser)
  useEffect(() => {
    if (platform.isDesktop()) return; // Desktop uses Electron's background scheduler

    const interval = setInterval(() => {
      const now = new Date();
      const evaluation = evaluateDueReminders(reminders, now, settings);

      if (evaluation.dueToTrigger.length > 0) {
        const due = evaluation.dueToTrigger[0];
        triggerReminderInApp(due);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [reminders, settings, avatars]);

  // Compute habit stats
  const stats: HabitStats = computeHabitStats(history, reminders);

  // Active default companion
  const activeCompanion =
    avatars.find((a) => a.id === settings.defaultAvatarId) ||
    avatars[0] ||
    BUILTIN_AVATARS[0];

  const triggerReminderInApp = (reminder: Reminder) => {
    const companion =
      avatars.find((a) => a.id === reminder.avatarId) ||
      avatars.find((a) => a.id === settings.defaultAvatarId) ||
      BUILTIN_AVATARS[0];

    const speechText = generateContextualSpeech(reminder);

    const payload: ReminderTriggerPayload = {
      reminder,
      avatar: companion,
      speechText,
      scheduledTime: reminder.nextOccurrence,
    };

    if (platform.isDesktop()) {
      platform.showCompanionOverlay(payload);
    } else {
      setActiveTrigger(payload);
      if (settings.nativeNotificationFallback) {
        platform.showNativeNotification(reminder.title, speechText);
      }
    }
  };

  const handleReminderAction = async (action: ReminderAction, reminderId: string, snoozeMinutes?: number) => {
    const now = new Date();
    const reminder = reminders.find((r) => r.id === reminderId);
    if (!reminder) return;

    // Record in history
    const record: ReminderHistoryRecord = {
      id: `act-${Date.now()}-${reminder.id}`,
      reminderId: reminder.id,
      reminderTitle: reminder.title,
      categoryId: reminder.categoryId,
      categoryName: reminder.categoryName,
      action,
      scheduledFor: reminder.nextOccurrence,
      performedAt: now.toISOString(),
      snoozeDelayMinutes: snoozeMinutes,
    };

    const updatedHistory = [record, ...history];
    setHistory(updatedHistory);
    await platform.recordHistory(record);

    // Update reminder schedule
    let updatedReminder: Reminder;
    if (action === 'completed') {
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.8 } });
      updatedReminder = advanceReminderSchedule(reminder, now);
      updatedReminder.lastCompletedAt = now.toISOString();
    } else if (action === 'snoozed') {
      const snoozeMins = snoozeMinutes || reminder.snoozeDurationMinutes || 10;
      const nextTime = calculateSnoozeTime(now, snoozeMins);
      updatedReminder = {
        ...reminder,
        nextOccurrence: nextTime.toISOString(),
        updatedAt: now.toISOString(),
      };
    } else {
      // dismissed
      updatedReminder = advanceReminderSchedule(reminder, now);
    }

    const updatedList = reminders.map((r) => (r.id === reminderId ? updatedReminder : r));
    setReminders(updatedList);
    await platform.saveReminder(updatedReminder);

    setActiveTrigger(null);
  };

  const handleQuickAdd = async (title: string, categoryId: string, minutesFromNow: number) => {
    const targetDate = new Date(Date.now() + minutesFromNow * 60 * 1000);
    const newRem: Reminder = {
      id: `rem-quick-${Date.now()}`,
      title,
      categoryId,
      categoryName: categoryId.charAt(0).toUpperCase() + categoryId.slice(1),
      categoryColor: '#0ea5e9',
      schedule: {
        type: 'interval',
        time: `${String(targetDate.getHours()).padStart(2, '0')}:${String(targetDate.getMinutes()).padStart(2, '0')}`,
        intervalMinutes: minutesFromNow,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      },
      snoozeDurationMinutes: 10,
      priority: 'normal',
      avatarId: settings.defaultAvatarId,
      soundEffect: 'chime',
      enabled: true,
      missedPolicy: 'catch_up_immediate',
      nextOccurrence: targetDate.toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [newRem, ...reminders];
    setReminders(updated);
    await platform.saveReminder(newRem);
  };

  const handleSaveReminder = async (reminder: Reminder) => {
    const idx = reminders.findIndex((r) => r.id === reminder.id);
    let updated: Reminder[];
    if (idx >= 0) {
      updated = [...reminders];
      updated[idx] = reminder;
    } else {
      updated = [reminder, ...reminders];
    }
    setReminders(updated);
    await platform.saveReminder(reminder);
  };

  const handleDeleteReminder = async (id: string) => {
    const updated = reminders.filter((r) => r.id !== id);
    setReminders(updated);
    await platform.deleteReminder(id);
  };

  const handleSaveSettings = async (patch: Partial<AppSettings>) => {
    const updated = await platform.saveSettings(patch);
    setSettings(updated);
  };

  const handleSaveAvatar = async (avatar: Avatar) => {
    const updated = await platform.saveAvatar(avatar);
    const list = await platform.getAvatars();
    setAvatars(list);
  };

  const handleDeleteAvatar = async (id: string) => {
    await platform.deleteAvatar(id);
    const list = await platform.getAvatars();
    setAvatars(list);
  };

  const handleExportData = () => {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      reminders,
      settings,
      history,
      customAvatars: avatars.filter((a) => a.isCustom),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pulse-buddy-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.reminders) {
          for (const r of parsed.reminders) await platform.saveReminder(r);
        }
        if (parsed.settings) await platform.saveSettings(parsed.settings);
        if (parsed.customAvatars) {
          for (const a of parsed.customAvatars) await platform.saveAvatar(a);
        }
        window.location.reload();
      } catch (err) {
        alert('Invalid backup file JSON');
      }
    };
    reader.readAsText(file);
  };

  const handleResetData = async () => {
    if (confirm('Reset all reminders and history to default factory state?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleRequestNotificationPermission = async () => {
    const granted = await platform.requestNotificationPermission();
    const updatedDiag = await platform.getDiagnostics();
    setDiagnostics(updatedDiag);
    return granted;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Platform Badge */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-sky-500 to-cyan-400 flex items-center justify-center text-white font-black text-lg shadow-md shadow-sky-500/20">
              P
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
                  Pulse Buddy
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 rounded-full border border-sky-200 dark:border-sky-800">
                  {platform.isDesktop() ? 'Desktop App' : 'Web Companion'}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: Home },
              { id: 'reminders', label: 'Reminders', icon: Clock, count: reminders.filter((r) => r.enabled).length },
              { id: 'studio', label: 'Avatar Studio', icon: Sparkles },
              { id: 'history', label: 'Habits', icon: BarChart3 },
              { id: 'settings', label: 'Settings', icon: SettingsIcon },
            ].map((tab) => {
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setCurrentTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold transition ${
                    isActive
                      ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <tab.icon size={16} />
                  <span className="hidden sm:inline">{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className="ml-1 px-1.5 py-0.2 text-[10px] bg-slate-200 dark:bg-slate-800 rounded-full">
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentTab === 'dashboard' && (
          <DashboardView
            reminders={reminders}
            avatars={avatars}
            settings={settings}
            stats={stats}
            activeCompanion={activeCompanion}
            onQuickAdd={handleQuickAdd}
            onTriggerTest={(id) => {
              const rem = reminders.find((r) => r.id === id) || reminders[0];
              if (rem) triggerReminderInApp(rem);
            }}
            onCompleteReminder={(id) => handleReminderAction('completed', id)}
            onNavigateToTab={(tab) => setCurrentTab(tab)}
          />
        )}

        {currentTab === 'reminders' && (
          <RemindersView
            reminders={reminders}
            avatars={avatars}
            onSaveReminder={handleSaveReminder}
            onDeleteReminder={handleDeleteReminder}
            onTriggerTest={(id) => {
              const rem = reminders.find((r) => r.id === id);
              if (rem) triggerReminderInApp(rem);
            }}
          />
        )}

        {currentTab === 'studio' && (
          <AvatarStudioView
            avatars={avatars}
            defaultAvatarId={settings.defaultAvatarId}
            onSetDefaultAvatar={(id) => handleSaveSettings({ defaultAvatarId: id })}
            onSaveAvatar={handleSaveAvatar}
            onDeleteAvatar={handleDeleteAvatar}
            onTriggerTest={(avatarId) => {
              const rem = reminders[0];
              if (rem) {
                const companion = avatars.find((a) => a.id === avatarId) || activeCompanion;
                setActiveTrigger({
                  reminder: rem,
                  avatar: companion,
                  speechText: generateContextualSpeech(rem),
                  scheduledTime: rem.nextOccurrence,
                });
              }
            }}
          />
        )}

        {currentTab === 'history' && (
          <HistoryView
            history={history}
            stats={stats}
            onClearHistory={() => setHistory([])}
          />
        )}

        {currentTab === 'settings' && (
          <SettingsView
            settings={settings}
            diagnostics={diagnostics}
            onSaveSettings={handleSaveSettings}
            onRequestNotificationPermission={handleRequestNotificationPermission}
            onExportData={handleExportData}
            onImportData={handleImportData}
            onResetData={handleResetData}
          />
        )}
      </main>

      {/* In-Browser Floating Companion Overlay (when triggered in browser or preview) */}
      {activeTrigger && (
        <div
          className={`fixed z-50 pointer-events-none ${
            settings.companionPosition === 'bottom-left'
              ? 'bottom-6 left-6'
              : settings.companionPosition === 'top-right'
              ? 'top-6 right-6'
              : settings.companionPosition === 'top-left'
              ? 'top-6 left-6'
              : settings.companionPosition === 'center'
              ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
              : 'bottom-6 right-6'
          }`}
        >
          <CompanionBubble
            reminder={activeTrigger.reminder}
            avatar={activeTrigger.avatar}
            speechText={activeTrigger.speechText}
            onAction={handleReminderAction}
            onClose={() => setActiveTrigger(null)}
            autoDismissSeconds={settings.displayDurationSeconds}
          />
        </div>
      )}
    </div>
  );
};
