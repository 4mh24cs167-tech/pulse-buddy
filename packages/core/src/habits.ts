import { ReminderHistoryRecord, HabitStats, Reminder } from '@pulse-buddy/shared-types';
import { isSameDay, subDays, parseISO, startOfDay } from 'date-fns';

/**
 * Calculates accurate streak and completion analytics from reminder history.
 */
export function computeHabitStats(
  history: ReminderHistoryRecord[],
  activeReminders: Reminder[],
  referenceDate: Date = new Date()
): HabitStats {
  const totalCompleted = history.filter((h) => h.action === 'completed').length;
  const totalScheduled = history.length;

  const today = startOfDay(referenceDate);
  const todayHistory = history.filter((h) => {
    try {
      const performed = parseISO(h.performedAt);
      return isSameDay(performed, today);
    } catch {
      return false;
    }
  });

  const todayCompleted = todayHistory.filter((h) => h.action === 'completed').length;
  const todayTotal = todayHistory.length;

  // Compute category breakdown
  const categoryBreakdown: Record<string, number> = {};
  for (const item of history) {
    if (item.action === 'completed') {
      const cat = item.categoryId || 'personal';
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1;
    }
  }

  // Calculate day-by-day streak
  // Group completion dates by YYYY-MM-DD
  const completionDays = new Set<string>();
  for (const item of history) {
    if (item.action === 'completed') {
      try {
        const d = parseISO(item.performedAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        completionDays.add(key);
      } catch {
        // ignore invalid dates
      }
    }
  }

  let currentStreak = 0;
  let checkDate = referenceDate;

  // Check if today has completions
  const todayKey = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
  if (completionDays.has(todayKey)) {
    currentStreak++;
    checkDate = subDays(checkDate, 1);
  } else {
    // If not today, check if yesterday had completion
    const yesterday = subDays(checkDate, 1);
    const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    if (completionDays.has(yesterdayKey)) {
      checkDate = yesterday;
    }
  }

  while (true) {
    const key = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
    if (completionDays.has(key)) {
      currentStreak++;
      checkDate = subDays(checkDate, 1);
    } else {
      break;
    }
  }

  // Longest streak
  // Sort distinct dates ascending and scan contiguous sequences
  const sortedDates = Array.from(completionDays).sort();
  let longestStreak = 0;
  let runningSeq = 0;
  let prevDate: Date | null = null;

  for (const dateStr of sortedDates) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const current = new Date(y, m - 1, d);

    if (prevDate) {
      const diffDays = Math.round((current.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        runningSeq++;
      } else {
        runningSeq = 1;
      }
    } else {
      runningSeq = 1;
    }

    if (runningSeq > longestStreak) {
      longestStreak = runningSeq;
    }
    prevDate = current;
  }

  if (currentStreak > longestStreak) {
    longestStreak = currentStreak;
  }

  const completionRate =
    totalScheduled > 0 ? Math.round((totalCompleted / totalScheduled) * 100) : 100;

  return {
    totalCompleted,
    totalScheduled,
    currentStreak,
    longestStreak,
    completionRate,
    todayCompleted,
    todayTotal,
    categoryBreakdown,
  };
}
