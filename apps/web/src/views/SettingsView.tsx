import React, { useState } from 'react';
import { AppSettings, AppDiagnostics } from '@pulse-buddy/shared-types';
import { soundEngine } from '@pulse-buddy/ui';
import { getSupabaseSchemaSQL } from '@pulse-buddy/core';
import {
  Moon,
  Sun,
  Volume2,
  VolumeX,
  Sliders,
  Bell,
  Clock,
  Shield,
  Laptop,
  Database,
  Cloud,
  Download,
  Upload,
  RefreshCw,
  Copy,
  CheckCircle2,
  AlertCircle,
  Activity,
} from 'lucide-react';

interface SettingsViewProps {
  settings: AppSettings;
  diagnostics: AppDiagnostics;
  onSaveSettings: (settings: Partial<AppSettings>) => void;
  onRequestNotificationPermission: () => Promise<boolean>;
  onExportData: () => void;
  onImportData: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onResetData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  diagnostics,
  onSaveSettings,
  onRequestNotificationPermission,
  onExportData,
  onImportData,
  onResetData,
}) => {
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [showSqlModal, setShowSqlModal] = useState(false);

  const handleSoundVolumeChange = (vol: number) => {
    onSaveSettings({ soundVolume: vol });
    soundEngine.setVolume(vol);
  };

  const handleTestChime = () => {
    soundEngine.setVolume(settings.soundVolume);
    soundEngine.play('chime');
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(getSupabaseSchemaSQL());
    setCopiedSchema(true);
    setTimeout(() => setCopiedSchema(false), 2500);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 max-w-4xl">
      <div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          Application Preferences & Settings
        </h2>
        <p className="text-sm text-slate-500">
          Customize companion overlay positioning, sound, quiet hours, background lifecycle, and cloud synchronization.
        </p>
      </div>

      {/* 1. Theme & Appearance */}
      <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Sun size={18} className="text-amber-500" />
          Appearance & Theme
        </h3>

        <div className="grid grid-cols-3 gap-3">
          {[
            { id: 'light', label: 'Light', icon: Sun },
            { id: 'dark', label: 'Dark', icon: Moon },
            { id: 'system', label: 'System Sync', icon: Laptop },
          ].map((themeOpt) => (
            <button
              key={themeOpt.id}
              onClick={() => onSaveSettings({ theme: themeOpt.id as any })}
              className={`flex items-center justify-center gap-2 py-3 rounded-2xl border text-xs font-bold transition ${
                settings.theme === themeOpt.id
                  ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-500 text-sky-600 dark:text-sky-400'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              <themeOpt.icon size={16} />
              {themeOpt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Audio & Chimes */}
      <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Volume2 size={18} className="text-sky-500" />
            Audio Chimes & Feedback
          </h3>
          <button
            onClick={handleTestChime}
            className="text-xs text-sky-600 dark:text-sky-400 font-semibold hover:underline flex items-center gap-1"
          >
            <Volume2 size={13} /> Play Test Chime
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Enable Sound Effects
            </h4>
            <p className="text-xs text-slate-500">Play pleasant chimes when reminders trigger</p>
          </div>
          <input
            type="checkbox"
            checked={settings.soundEnabled}
            onChange={(e) => onSaveSettings({ soundEnabled: e.target.checked })}
            className="rounded text-sky-600 w-5 h-5"
          />
        </div>

        {settings.soundEnabled && (
          <div className="pt-2">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Volume Level</span>
              <span>{Math.round(settings.soundVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={settings.soundVolume}
              onChange={(e) => handleSoundVolumeChange(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
        )}
      </div>

      {/* 3. Companion Overlay Customization */}
      <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Sliders size={18} className="text-purple-500" />
          Desktop Companion Window Settings
        </h3>

        {/* Position */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            Screen Corner Placement
          </label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {[
              { id: 'bottom-right', label: 'Bottom Right' },
              { id: 'bottom-left', label: 'Bottom Left' },
              { id: 'top-right', label: 'Top Right' },
              { id: 'top-left', label: 'Top Left' },
              { id: 'center', label: 'Center Screen' },
            ].map((pos) => (
              <button
                key={pos.id}
                onClick={() => onSaveSettings({ companionPosition: pos.id as any })}
                className={`py-2 text-xs font-semibold rounded-xl border transition ${
                  settings.companionPosition === pos.id
                    ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-500 text-sky-600 dark:text-sky-400 font-bold'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                {pos.label}
              </button>
            ))}
          </div>
        </div>

        {/* Size */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            Companion Scale
          </label>
          <div className="grid grid-cols-3 gap-2">
            {['small', 'medium', 'large'].map((sz) => (
              <button
                key={sz}
                onClick={() => onSaveSettings({ companionSize: sz as any })}
                className={`py-2 text-xs capitalize rounded-xl border transition ${
                  settings.companionSize === sz
                    ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-500 text-sky-600 dark:text-sky-400 font-bold'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                {sz}
              </button>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div>
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>Overlay Display Duration Before Auto-Dismiss</span>
            <span>{settings.displayDurationSeconds} seconds</span>
          </div>
          <input
            type="range"
            min="15"
            max="120"
            step="5"
            value={settings.displayDurationSeconds}
            onChange={(e) => onSaveSettings({ displayDurationSeconds: parseInt(e.target.value, 10) })}
            className="w-full"
          />
        </div>
      </div>

      {/* 4. Quiet Hours */}
      <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock size={18} className="text-indigo-500" />
              Quiet Hours
            </h3>
            <p className="text-xs text-slate-500">Mutes non-urgent companion popups during sleep or focus hours</p>
          </div>
          <input
            type="checkbox"
            checked={settings.quietHoursEnabled}
            onChange={(e) => onSaveSettings({ quietHoursEnabled: e.target.checked })}
            className="rounded text-sky-600 w-5 h-5"
          />
        </div>

        {settings.quietHoursEnabled && (
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Quiet Hours Start
              </label>
              <input
                type="time"
                value={settings.quietHoursStart}
                onChange={(e) => onSaveSettings({ quietHoursStart: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Quiet Hours End
              </label>
              <input
                type="time"
                value={settings.quietHoursEnd}
                onChange={(e) => onSaveSettings({ quietHoursEnd: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs"
              />
            </div>
          </div>
        )}
      </div>

      {/* 5. Desktop Background Behavior */}
      <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Shield size={18} className="text-emerald-500" />
          Desktop Background Lifecycle & System Tray
        </h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Close to tray instead of quitting
              </h4>
              <p className="text-xs text-slate-500">
                Keeps companion engine scheduling in the background when the main window is closed
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.closeToTray}
              onChange={(e) => onSaveSettings({ closeToTray: e.target.checked })}
              className="rounded text-sky-600 w-5 h-5"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Launch at login
              </h4>
              <p className="text-xs text-slate-500">
                Starts Pulse Buddy automatically on Windows startup or macOS login
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.launchAtLogin}
              onChange={(e) => onSaveSettings({ launchAtLogin: e.target.checked })}
              className="rounded text-sky-600 w-5 h-5"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Native OS notification fallback
              </h4>
              <p className="text-xs text-slate-500">
                Shows system notification alongside companion overlay
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.nativeNotificationFallback}
              onChange={(e) => onSaveSettings({ nativeNotificationFallback: e.target.checked })}
              className="rounded text-sky-600 w-5 h-5"
            />
          </div>
        </div>
      </div>

      {/* 6. System Diagnostics Panel */}
      <div className="p-6 bg-slate-50 dark:bg-slate-900/60 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-2">
          <Activity size={16} className="text-sky-500" />
          Platform Health & Diagnostics
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
            <span className="text-slate-400 block mb-0.5">Platform Target</span>
            <span className="font-bold text-slate-800 dark:text-slate-100 uppercase">{diagnostics.platform} ({diagnostics.os})</span>
          </div>

          <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
            <span className="text-slate-400 block mb-0.5">Background Engine</span>
            <span className="font-bold text-emerald-600 flex items-center gap-1">
              <CheckCircle2 size={13} /> Active
            </span>
          </div>

          <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
            <span className="text-slate-400 block mb-0.5">Notifications</span>
            <span className="font-bold text-slate-800 dark:text-slate-100">
              {diagnostics.notificationsPermitted ? 'Permitted ✓' : 'Click to Request'}
            </span>
          </div>

          <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
            <span className="text-slate-400 block mb-0.5">Storage Persistence</span>
            <span className="font-bold text-slate-800 dark:text-slate-100">{diagnostics.storageType}</span>
          </div>
        </div>

        {!diagnostics.notificationsPermitted && (
          <button
            onClick={onRequestNotificationPermission}
            className="mt-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-sm transition"
          >
            Request Notification Permission
          </button>
        )}
      </div>

      {/* 7. Cloud Synchronization (Supabase) */}
      <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Cloud size={18} className="text-sky-500" />
              Cross-Device Cloud Synchronization (Supabase)
            </h3>
            <p className="text-xs text-slate-500">
              Sync reminders, habits, and avatars seamlessly between desktop and mobile web.
            </p>
          </div>
          <input
            type="checkbox"
            checked={settings.syncEnabled}
            onChange={(e) => onSaveSettings({ syncEnabled: e.target.checked })}
            className="rounded text-sky-600 w-5 h-5"
          />
        </div>

        {settings.syncEnabled && (
          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Supabase Project URL
              </label>
              <input
                type="text"
                value={settings.supabaseUrl || ''}
                onChange={(e) => onSaveSettings({ supabaseUrl: e.target.value })}
                placeholder="https://xyzcompany.supabase.co"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Supabase Anon / Public Key
              </label>
              <input
                type="password"
                value={settings.supabaseAnonKey || ''}
                onChange={(e) => onSaveSettings({ supabaseAnonKey: e.target.value })}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-mono"
              />
            </div>

            <button
              onClick={() => setShowSqlModal(true)}
              className="text-xs text-sky-600 dark:text-sky-400 font-semibold hover:underline flex items-center gap-1"
            >
              <Database size={13} /> View PostgreSQL RLS Schema
            </button>
          </div>
        )}
      </div>

      {/* 8. Data Export & Backup */}
      <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Database size={18} className="text-indigo-500" />
          Backup, Export, and Privacy
        </h3>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onExportData}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-2xl transition"
          >
            <Download size={14} /> Export All Data (JSON)
          </button>

          <label className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-2xl transition cursor-pointer">
            <Upload size={14} /> Import Backup
            <input type="file" accept=".json" onChange={onImportData} className="hidden" />
          </label>

          <button
            onClick={onResetData}
            className="flex items-center gap-1.5 px-4 py-2.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-bold text-xs rounded-2xl transition"
          >
            Reset to Default Seeds
          </button>
        </div>
      </div>

      {/* SQL Modal */}
      {showSqlModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h4 className="font-bold text-slate-900 dark:text-white">Supabase SQL Schema</h4>
              <button
                onClick={() => setShowSqlModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                Close ✕
              </button>
            </div>

            <pre className="p-4 bg-slate-950 text-slate-300 font-mono text-xs rounded-2xl max-h-72 overflow-y-auto">
              {getSupabaseSchemaSQL()}
            </pre>

            <div className="flex justify-end gap-2">
              <button
                onClick={handleCopySql}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl"
              >
                {copiedSchema ? 'Copied ✓' : 'Copy SQL Schema'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
