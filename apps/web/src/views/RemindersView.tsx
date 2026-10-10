import React, { useState } from 'react';
import { Reminder, ReminderCategory, Avatar, RecurrenceSchedule, MissedReminderPolicy, SoundEffectType, ReminderPriority } from '@pulse-buddy/shared-types';
import { DEFAULT_CATEGORIES, calculateNextOccurrence } from '@pulse-buddy/core';
import { soundEngine } from '@pulse-buddy/ui';
import {
  Plus,
  Search,
  Filter,
  Clock,
  Volume2,
  Trash2,
  Copy,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';

interface RemindersViewProps {
  reminders: Reminder[];
  avatars: Avatar[];
  onSaveReminder: (reminder: Reminder) => void;
  onDeleteReminder: (id: string) => void;
  onTriggerTest: (reminderId: string) => void;
}

export const RemindersView: React.FC<RemindersViewProps> = ({
  reminders,
  avatars,
  onSaveReminder,
  onDeleteReminder,
  onTriggerTest,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('hydration');
  const [formScheduleType, setFormScheduleType] = useState<'daily' | 'interval' | 'weekly' | 'once'>('daily');
  const [formTime, setFormTime] = useState('09:00');
  const [formIntervalMinutes, setFormIntervalMinutes] = useState(60);
  const [formDaysOfWeek, setFormDaysOfWeek] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri
  const [formDate, setFormDate] = useState('');
  const [formSnoozeMins, setFormSnoozeMins] = useState(10);
  const [formPriority, setFormPriority] = useState<ReminderPriority>('normal');
  const [formAvatarId, setFormAvatarId] = useState('pip-penguin');
  const [formSound, setFormSound] = useState<SoundEffectType>('chime');
  const [formMissedPolicy, setFormMissedPolicy] = useState<MissedReminderPolicy>('catch_up_immediate');

  const openNewModal = () => {
    setEditingReminder(null);
    setFormTitle('');
    setFormDescription('');
    setFormCategoryId('hydration');
    setFormScheduleType('interval');
    setFormTime('09:00');
    setFormIntervalMinutes(60);
    setFormDaysOfWeek([1, 2, 3, 4, 5]);
    setFormDate('');
    setFormSnoozeMins(10);
    setFormPriority('normal');
    setFormAvatarId('pip-penguin');
    setFormSound('water');
    setFormMissedPolicy('catch_up_immediate');
    setIsModalOpen(true);
  };

  const openEditModal = (r: Reminder) => {
    setEditingReminder(r);
    setFormTitle(r.title);
    setFormDescription(r.description || '');
    setFormCategoryId(r.categoryId);
    setFormScheduleType(r.schedule.type as any);
    setFormTime(r.schedule.time || '09:00');
    setFormIntervalMinutes(r.schedule.intervalMinutes || 60);
    setFormDaysOfWeek(r.schedule.daysOfWeek || [1, 2, 3, 4, 5]);
    setFormDate(r.schedule.date || '');
    setFormSnoozeMins(r.snoozeDurationMinutes || 10);
    setFormPriority(r.priority);
    setFormAvatarId(r.avatarId);
    setFormSound(r.soundEffect);
    setFormMissedPolicy(r.missedPolicy);
    setIsModalOpen(true);
  };

  const handleDuplicate = (r: Reminder) => {
    const duplicated: Reminder = {
      ...r,
      id: `rem-${Date.now()}`,
      title: `${r.title} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onSaveReminder(duplicated);
  };

  const handleToggleEnabled = (r: Reminder) => {
    const updated: Reminder = {
      ...r,
      enabled: !r.enabled,
      updatedAt: new Date().toISOString(),
    };
    onSaveReminder(updated);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const category = DEFAULT_CATEGORIES.find((c) => c.id === formCategoryId);

    const schedule: RecurrenceSchedule = {
      type: formScheduleType,
      time: formTime,
      intervalMinutes: formIntervalMinutes,
      daysOfWeek: formDaysOfWeek,
      date: formDate,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    };

    const nextOcc = calculateNextOccurrence(schedule, new Date());

    const reminder: Reminder = {
      id: editingReminder ? editingReminder.id : `rem-${Date.now()}`,
      title: formTitle.trim(),
      description: formDescription.trim() || undefined,
      categoryId: formCategoryId,
      categoryName: category?.name || 'Reminder',
      categoryColor: category?.color || '#0ea5e9',
      categoryIcon: category?.icon || 'Bell',
      schedule,
      snoozeDurationMinutes: formSnoozeMins,
      priority: formPriority,
      avatarId: formAvatarId,
      soundEffect: formSound,
      enabled: editingReminder ? editingReminder.enabled : true,
      missedPolicy: formMissedPolicy,
      nextOccurrence: nextOcc.toISOString(),
      createdAt: editingReminder ? editingReminder.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveReminder(reminder);
    setIsModalOpen(false);
  };

  const filteredReminders = reminders.filter((r) => {
    const matchesSearch =
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      (r.description && r.description.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || r.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Reminders & Schedules
          </h2>
          <p className="text-sm text-slate-500">
            Configure multi-category reminders with recurring schedules and personalized companions.
          </p>
        </div>

        <button
          onClick={openNewModal}
          className="flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm rounded-2xl shadow-sm transition active:scale-95"
        >
          <Plus size={18} />
          Create Reminder
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reminders by title or notes..."
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
        >
          <option value="all">All Categories ({reminders.length})</option>
          {DEFAULT_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Reminder Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredReminders.map((reminder) => {
          const isEnabled = reminder.enabled;
          const assignedAvatar = avatars.find((a) => a.id === reminder.avatarId) || avatars[0];

          return (
            <div
              key={reminder.id}
              className={`flex flex-col justify-between p-5 rounded-3xl border transition-all ${
                isEnabled
                  ? 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200/50 dark:border-slate-800/50 opacity-60'
              }`}
            >
              <div>
                {/* Header row: category badge + toggle */}
                <div className="flex items-center justify-between mb-3">
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider"
                    style={{
                      backgroundColor: `${reminder.categoryColor}18`,
                      color: reminder.categoryColor || '#0ea5e9',
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: reminder.categoryColor || '#0ea5e9' }}
                    />
                    {reminder.categoryName || 'Reminder'}
                  </span>

                  {/* Enable / Pause Toggle */}
                  <button
                    onClick={() => handleToggleEnabled(reminder)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isEnabled ? 'bg-sky-600' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        isEnabled ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                  {reminder.title}
                </h3>
                {reminder.description && (
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {reminder.description}
                  </p>
                )}

                {/* Recurrence metadata */}
                <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Clock size={13} className="text-slate-400" />
                    Next: {new Date(reminder.nextOccurrence).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span>•</span>
                  <span className="capitalize">{reminder.schedule.type}</span>
                  <span>•</span>
                  <span>Companion: {assignedAvatar?.name || 'Pip'}</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between gap-1 pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => onTriggerTest(reminder.id)}
                  title="Test Companion Trigger"
                  className="p-1.5 text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 rounded-xl transition flex items-center gap-1 text-xs font-semibold"
                >
                  <Play size={14} /> Test
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleDuplicate(reminder)}
                    title="Duplicate Reminder"
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                  >
                    <Copy size={15} />
                  </button>
                  <button
                    onClick={() => openEditModal(reminder)}
                    title="Edit Reminder"
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                  >
                    <Edit2 size={15} />
                  </button>
                  <button
                    onClick={() => onDeleteReminder(reminder.id)}
                    title="Delete Reminder"
                    className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredReminders.length === 0 && (
          <div className="col-span-full py-16 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
            <Clock size={40} className="mx-auto mb-3 text-slate-300" />
            <p className="font-semibold text-slate-600 dark:text-slate-300">No reminders match your filter</p>
            <p className="text-xs text-slate-400 mt-1">Try another search keyword or create a new reminder.</p>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                {editingReminder ? 'Edit Reminder' : 'Create New Reminder'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Reminder Title *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Sip a cold glass of water"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Optional Description / Notes
                </label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="e.g. 500ml water bottle refill"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Activity Category
                </label>
                <select
                  value={formCategoryId}
                  onChange={(e) => setFormCategoryId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  {DEFAULT_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Medical Disclaimer Banner if Medication selected */}
              {formCategoryId === 'medication' && (
                <div className="flex items-start gap-2.5 p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs text-amber-700 dark:text-amber-300">
                  <AlertTriangle size={18} className="shrink-0 mt-0.5 text-amber-500" />
                  <div>
                    <span className="font-bold">Medical Disclaimer:</span> Pulse Buddy stores medication reminder schedules only as entered by you. It does not provide medical advice or infer dosages. Take only medications as prescribed by your doctor.
                  </div>
                </div>
              )}

              {/* Schedule Type */}
              <div className="grid grid-cols-4 gap-2 pt-1">
                {[
                  { id: 'interval', label: 'Interval' },
                  { id: 'daily', label: 'Daily' },
                  { id: 'weekly', label: 'Weekly' },
                  { id: 'once', label: 'One-Time' },
                ].map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setFormScheduleType(type.id as any)}
                    className={`py-2 text-xs font-bold rounded-xl border transition ${
                      formScheduleType === type.id
                        ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-500 text-sky-600 dark:text-sky-400'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>

              {/* Schedule Details */}
              {formScheduleType === 'interval' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Repeat Every (Minutes)
                  </label>
                  <select
                    value={formIntervalMinutes}
                    onChange={(e) => setFormIntervalMinutes(Number(e.target.value))}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm"
                  >
                    <option value={15}>Every 15 minutes</option>
                    <option value={30}>Every 30 minutes</option>
                    <option value={45}>Every 45 minutes</option>
                    <option value={60}>Every 1 hour (Hydration standard)</option>
                    <option value={90}>Every 90 minutes (Focus blocks)</option>
                    <option value={120}>Every 2 hours</option>
                  </select>
                </div>
              )}

              {formScheduleType === 'daily' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Daily Trigger Time
                  </label>
                  <input
                    type="time"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm"
                  />
                </div>
              )}

              {formScheduleType === 'weekly' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                      Days of the Week
                    </label>
                    <input
                      type="time"
                      value={formTime}
                      onChange={(e) => setFormTime(e.target.value)}
                      className="px-3 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => {
                      const isSelected = formDaysOfWeek.includes(idx);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setFormDaysOfWeek(formDaysOfWeek.filter((d) => d !== idx));
                            } else {
                              setFormDaysOfWeek([...formDaysOfWeek, idx]);
                            }
                          }}
                          className={`py-1.5 text-xs font-bold rounded-xl transition ${
                            isSelected
                              ? 'bg-sky-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {formScheduleType === 'once' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Time
                    </label>
                    <input
                      type="time"
                      value={formTime}
                      onChange={(e) => setFormTime(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Companion Avatar & Sound Selection */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Assigned Avatar
                  </label>
                  <select
                    value={formAvatarId}
                    onChange={(e) => setFormAvatarId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-medium"
                  >
                    {avatars.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                      Chime Sound
                    </label>
                    <button
                      type="button"
                      onClick={() => soundEngine.play(formSound)}
                      className="text-xs text-sky-600 font-semibold hover:underline flex items-center gap-1"
                    >
                      <Volume2 size={12} /> Test
                    </button>
                  </div>
                  <select
                    value={formSound}
                    onChange={(e) => setFormSound(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-medium"
                  >
                    <option value="water">💧 Water Bubble</option>
                    <option value="chime">🔔 Marimba Chime</option>
                    <option value="bell">✨ Singing Bell</option>
                    <option value="fanfare">🎺 Fanfare</option>
                    <option value="gentle">🌿 Gentle Pulse</option>
                    <option value="none">Mute (No Sound)</option>
                  </select>
                </div>
              </div>

              {/* Snooze & Missed policy */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Snooze Delay
                  </label>
                  <select
                    value={formSnoozeMins}
                    onChange={(e) => setFormSnoozeMins(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs"
                  >
                    <option value={5}>5 minutes</option>
                    <option value={10}>10 minutes</option>
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Missed / Wake Policy
                  </label>
                  <select
                    value={formMissedPolicy}
                    onChange={(e) => setFormMissedPolicy(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs"
                  >
                    <option value="catch_up_immediate">Catch up immediately</option>
                    <option value="notify_missed">Log missed, notify</option>
                    <option value="skip_to_next">Skip to next schedule</option>
                  </select>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-2xl shadow-sm transition active:scale-95"
                >
                  {editingReminder ? 'Save Changes' : 'Create Reminder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
