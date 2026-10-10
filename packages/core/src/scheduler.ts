import { Reminder, RecurrenceSchedule, AppSettings, MissedReminderPolicy, ReminderCategory } from '@pulse-buddy/shared-types';
import { addMinutes, addDays, isAfter, isBefore, parseISO, startOfDay, setHours, setMinutes, setSeconds, setMilliseconds } from 'date-fns';

/**
 * Calculates the next occurrence timestamp for a given recurrence schedule.
 */
export function calculateNextOccurrence(schedule: RecurrenceSchedule, fromDate: Date = new Date()): Date {
  const [hoursStr, minutesStr] = schedule.time.split(':');
  const targetHour = parseInt(hoursStr || '9', 10);
  const targetMinute = parseInt(minutesStr || '0', 10);

  if (schedule.type === 'once') {
    if (schedule.date) {
      const [year, month, day] = schedule.date.split('-').map(Number);
      const targetDate = new Date(year, month - 1, day, targetHour, targetMinute, 0, 0);
      return targetDate;
    }
    // If no date specified for once, schedule today or tomorrow at specified time
    let target = setMilliseconds(setSeconds(setMinutes(setHours(new Date(fromDate), targetHour), targetMinute), 0), 0);
    if (!isAfter(target, fromDate)) {
      target = addDays(target, 1);
    }
    return target;
  }

  if (schedule.type === 'interval') {
    const interval = Math.max(1, schedule.intervalMinutes || 60);
    return addMinutes(fromDate, interval);
  }

  if (schedule.type === 'daily') {
    let candidate = setMilliseconds(setSeconds(setMinutes(setHours(new Date(fromDate), targetHour), targetMinute), 0), 0);
    if (!isAfter(candidate, fromDate)) {
      candidate = addDays(candidate, 1);
    }
    return candidate;
  }

  if (schedule.type === 'weekly' || schedule.type === 'custom') {
    const daysOfWeek = schedule.daysOfWeek && schedule.daysOfWeek.length > 0
      ? [...schedule.daysOfWeek].sort((a, b) => a - b)
      : [1, 2, 3, 4, 5]; // Default to weekdays Mon-Fri if empty

    // Search up to 14 days ahead for next matching day of week
    for (let offset = 0; offset <= 14; offset++) {
      const testDay = addDays(fromDate, offset);
      const dayOfWeek = testDay.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat

      if (daysOfWeek.includes(dayOfWeek)) {
        const candidate = setMilliseconds(
          setSeconds(setMinutes(setHours(testDay, targetHour), targetMinute), 0),
          0
        );
        if (isAfter(candidate, fromDate)) {
          return candidate;
        }
      }
    }
    // Fallback: 1 week ahead
    return addDays(fromDate, 7);
  }

  return addMinutes(fromDate, 30);
}

/**
 * Calculates new occurrence after a user hits Snooze.
 */
export function calculateSnoozeTime(fromDate: Date = new Date(), snoozeMinutes: number = 10): Date {
  const safeMinutes = Math.max(1, snoozeMinutes);
  return addMinutes(fromDate, safeMinutes);
}

/**
 * Check whether a given date falls inside user-configured Quiet Hours.
 */
export function isWithinQuietHours(
  settings: Pick<AppSettings, 'quietHoursEnabled' | 'quietHoursStart' | 'quietHoursEnd'>,
  date: Date = new Date()
): boolean {
  if (!settings.quietHoursEnabled) {
    return false;
  }

  const [startH, startM] = settings.quietHoursStart.split(':').map(Number);
  const [endH, endM] = settings.quietHoursEnd.split(':').map(Number);

  const currentMinutes = date.getHours() * 60 + date.getMinutes();
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (startMinutes < endMinutes) {
    // Standard span, e.g. 13:00 to 15:00
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } else {
    // Spans midnight, e.g. 22:00 to 07:00
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
}

/**
 * Result of evaluating due reminders.
 */
export interface EvaluationResult {
  dueToTrigger: Reminder[];
  missedSuppressed: Reminder[];
  deferredForQuietHours: Reminder[];
}

/**
 * Evaluates which reminders are due right now, applying catch-up policies,
 * duplicate prevention, and quiet hours.
 */
export function evaluateDueReminders(
  reminders: Reminder[],
  now: Date = new Date(),
  settings?: Pick<AppSettings, 'quietHoursEnabled' | 'quietHoursStart' | 'quietHoursEnd'>
): EvaluationResult {
  const result: EvaluationResult = {
    dueToTrigger: [],
    missedSuppressed: [],
    deferredForQuietHours: [],
  };

  const inQuietHours = settings ? isWithinQuietHours(settings, now) : false;

  for (const reminder of reminders) {
    if (!reminder.enabled) {
      continue;
    }

    const nextOcc = parseISO(reminder.nextOccurrence);
    if (isNaN(nextOcc.getTime())) {
      continue;
    }

    // Is it due?
    if (!isAfter(nextOcc, now)) {
      // Check if it's during quiet hours (unless high/urgent priority)
      if (inQuietHours && reminder.priority !== 'urgent') {
        result.deferredForQuietHours.push(reminder);
        continue;
      }

      // Check how old the due time is (e.g. system was asleep or app closed)
      const diffMinutes = (now.getTime() - nextOcc.getTime()) / (1000 * 60);

      if (diffMinutes > 120) {
        // Overdue by more than 2 hours
        if (reminder.missedPolicy === 'skip_to_next') {
          result.missedSuppressed.push(reminder);
        } else if (reminder.missedPolicy === 'notify_missed') {
          result.missedSuppressed.push(reminder);
        } else {
          // catch_up_immediate
          result.dueToTrigger.push(reminder);
        }
      } else {
        // Due recently (normal trigger)
        result.dueToTrigger.push(reminder);
      }
    }
  }

  return result;
}

/**
 * Advances reminder schedule to its next future occurrence.
 */
export function advanceReminderSchedule(reminder: Reminder, now: Date = new Date()): Reminder {
  const nextDate = calculateNextOccurrence(reminder.schedule, now);
  return {
    ...reminder,
    nextOccurrence: nextDate.toISOString(),
    lastTriggeredAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

/**
 * Generates natural contextual speech lines for the companion avatar.
 */
export function generateContextualSpeech(reminder: Reminder, category?: ReminderCategory): string {
  const title = reminder.title.trim();
  const catId = reminder.categoryId.toLowerCase();

  switch (catId) {
    case 'hydration':
      return `Hey! Time for a crisp glass of water. Stay hydrated! 💧`;
    case 'medication':
      return `Time for your scheduled health check: "${title}".`;
    case 'meals':
      return `Nutrient check! Time to enjoy your meal: "${title}". 🍎`;
    case 'exercise':
      return `Let's get moving! Time for: "${title}". You've got this! 🏃`;
    case 'posture':
      return `Eye and posture break! Look 20 feet away and roll your shoulders. 👀✨`;
    case 'studying':
      return `Focus time! Let's conquer: "${title}". 📚`;
    case 'work':
      return `Focus sprint starting: "${title}". Let's dive in! 💼`;
    case 'appointments':
      return `Upcoming appointment: "${title}". Get ready! 🗓️`;
    case 'habits':
      return `Habit streak moment! Ready for: "${title}"? ⭐`;
    case 'sleep':
      return `Wind-down time: "${title}". Rest up for tomorrow! 🌙`;
    case 'household':
      return `Quick chore check: "${title}". You'll feel great once it's done! 🧹`;
    default:
      return `Gentle reminder for: "${title}"! ✨`;
  }
}
