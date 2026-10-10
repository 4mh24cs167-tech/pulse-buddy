import { ReminderCategory } from '@pulse-buddy/shared-types';

export const DEFAULT_CATEGORIES: ReminderCategory[] = [
  {
    id: 'hydration',
    name: 'Hydration & Water Breaks',
    icon: 'Droplets',
    color: '#0ea5e9', // Sky blue
    description: 'Keep your body and brain hydrated throughout the day with regular sips.',
    defaultSound: 'water',
    defaultAvatarId: 'pip-penguin',
    isCustom: false,
  },
  {
    id: 'medication',
    name: 'Medication & Health Supplements',
    icon: 'Pill',
    color: '#ec4899', // Pink
    description: 'Timely reminders for medications and supplements entered by you.',
    defaultSound: 'chime',
    defaultAvatarId: 'dr-robo',
    isCustom: false,
    disclaimer: 'Pulse Buddy does not provide medical advice or infer dosages. Take only medications as prescribed by your healthcare provider.',
  },
  {
    id: 'meals',
    name: 'Meals & Nourishment',
    icon: 'Utensils',
    color: '#f97316', // Orange
    description: 'Breakfast, lunch, dinner, and wholesome snacks to keep your energy steady.',
    defaultSound: 'bell',
    defaultAvatarId: 'pip-penguin',
    isCustom: false,
  },
  {
    id: 'exercise',
    name: 'Exercise & Movement',
    icon: 'Activity',
    color: '#10b981', // Emerald
    description: 'Workouts, yoga, brisk walks, stretching, and daily physical activity.',
    defaultSound: 'fanfare',
    defaultAvatarId: 'sparky-rover',
    isCustom: false,
  },
  {
    id: 'posture',
    name: 'Eye Breaks & Posture Reset',
    icon: 'Eye',
    color: '#6366f1', // Indigo
    description: '20-20-20 screen eye rule and ergonomic spine/shoulder posture resets.',
    defaultSound: 'gentle',
    defaultAvatarId: 'maya-yogi',
    isCustom: false,
  },
  {
    id: 'studying',
    name: 'Studying & Revision',
    icon: 'BookOpen',
    color: '#8b5cf6', // Violet
    description: 'Reading, exam prep, course modules, and active recall practice.',
    defaultSound: 'bell',
    defaultAvatarId: 'cosmo-astronaut',
    isCustom: false,
  },
  {
    id: 'work',
    name: 'Work Tasks & Focus Sessions',
    icon: 'Briefcase',
    color: '#3b82f6', // Blue
    description: 'Deep work blocks, deadlines, pomodoro intervals, and project reviews.',
    defaultSound: 'chime',
    defaultAvatarId: 'dr-robo',
    isCustom: false,
  },
  {
    id: 'appointments',
    name: 'Appointments & Meetings',
    icon: 'Calendar',
    color: '#eab308', // Amber
    description: 'Client syncs, doctor appointments, webinars, and important calls.',
    defaultSound: 'chime',
    defaultAvatarId: 'cosmo-astronaut',
    isCustom: false,
  },
  {
    id: 'habits',
    name: 'Daily Habits & Personal Goals',
    icon: 'Target',
    color: '#14b8a6', // Teal
    description: 'Journaling, language practice, meditation, and daily gratitude routines.',
    defaultSound: 'fanfare',
    defaultAvatarId: 'maya-yogi',
    isCustom: false,
  },
  {
    id: 'sleep',
    name: 'Sleep Routines & Wind Down',
    icon: 'Moon',
    color: '#4f46e5', // Deep Indigo
    description: 'Evening wind-down, screen shutoff, bedtime prep, and consistent wake-up.',
    defaultSound: 'gentle',
    defaultAvatarId: 'ember-dragon',
    isCustom: false,
  },
  {
    id: 'household',
    name: 'Household Tasks & Chores',
    icon: 'Home',
    color: '#84cc16', // Lime
    description: 'Laundry, watering plants, grocery runs, trash day, and tidy-up sessions.',
    defaultSound: 'bell',
    defaultAvatarId: 'sparky-rover',
    isCustom: false,
  },
  {
    id: 'personal',
    name: 'Personal & Custom Reminders',
    icon: 'Smile',
    color: '#a855f7', // Purple
    description: 'Calling loved ones, birthdays, pet care, or anything important to you.',
    defaultSound: 'chime',
    defaultAvatarId: 'pip-penguin',
    isCustom: false,
  },
];
