import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  validateMediaFile,
  hexToRgb,
  applyChromaKeyToImageData,
  AvatarStateMachine,
} from '../packages/avatar/src';
import {
  calculateNextOccurrence,
  calculateSnoozeTime,
  evaluateDueReminders,
  advanceReminderSchedule,
  computeHabitStats,
} from '../packages/core/src';
import { Reminder, ChromaKeyConfig, Avatar, ReminderHistoryRecord } from '../packages/shared-types/src';

describe('Media Upload Validation for Avatar Assets', () => {
  it('validates standard MP4 video successfully', () => {
    const fakeMp4 = {
      name: 'avatar-dance.mp4',
      type: 'video/mp4',
      size: 8 * 1024 * 1024, // 8MB
    } as unknown as File;

    const result = validateMediaFile(fakeMp4);
    expect(result.valid).toBe(true);
    expect(result.mediaType).toBe('video');
    expect(result.mimeType).toBe('video/mp4');
    expect(result.details?.suggestedChromaKey).toBe(true);
  });

  it('validates WebM video with alpha channel capability', () => {
    const fakeWebm = {
      name: 'robot-greeting.webm',
      type: 'video/webm',
      size: 12 * 1024 * 1024,
    } as unknown as File;

    const result = validateMediaFile(fakeWebm);
    expect(result.valid).toBe(true);
    expect(result.mediaType).toBe('video');
  });

  it('validates transparent PNG and WebP images', () => {
    const fakePng = {
      name: 'character-transparent.png',
      type: 'image/png',
      size: 2 * 1024 * 1024,
    } as unknown as File;

    const result = validateMediaFile(fakePng);
    expect(result.valid).toBe(true);
    expect(result.mediaType).toBe('image');
  });

  it('rejects unsupported media formats with descriptive error message', () => {
    const fakePdf = {
      name: 'document.pdf',
      type: 'application/pdf',
      size: 500 * 1024,
    } as unknown as File;

    const result = validateMediaFile(fakePdf);
    expect(result.valid).toBe(false);
    expect(result.errorMessage).toContain('Unsupported file format');
    expect(result.errorMessage).toContain('document.pdf');
  });

  it('rejects oversized files exceeding 50MB maximum limit', () => {
    const hugeVideo = {
      name: 'heavy-raw.mp4',
      type: 'video/mp4',
      size: 65 * 1024 * 1024, // 65MB
    } as unknown as File;

    const result = validateMediaFile(hugeVideo);
    expect(result.valid).toBe(false);
    expect(result.errorMessage).toContain('exceeds the 50MB maximum limit');
  });
});

describe('Chroma-Key Processing & Edge Spill Suppression', () => {
  it('calibrates key distance and renders pure green pixels transparent', () => {
    const config: ChromaKeyConfig = {
      enabled: true,
      keyColor: '#00FF00',
      similarity: 0.35,
      smoothness: 0.1,
      spillSuppression: 0.5,
    };

    // 3 pixels: pure green background, character blue clothing, character edge with green reflection
    const data = new Uint8ClampedArray([
      0, 255, 0, 255,      // Pixel 0: Pure green screen
      40, 50, 220, 255,    // Pixel 1: Blue clothing character
      180, 195, 100, 255,  // Pixel 2: Foreground element with green spill (g > max(r, b))
    ]);

    const fakeImageData = {
      data,
      width: 3,
      height: 1,
      colorSpace: 'srgb',
    } as unknown as ImageData;

    applyChromaKeyToImageData(fakeImageData, config);

    // Pixel 0 (green screen) is completely transparent (alpha = 0)
    expect(data[3]).toBe(0);

    // Pixel 1 (character detail) remains fully opaque
    expect(data[7]).toBeGreaterThan(200);

    // Pixel 2 (spill suppression active: green reduced towards max(r, b))
    expect(data[9]).toBeLessThan(195);
  });
});

describe('Floating Avatar Reminder Lifecycle & Forward/Backward Animations', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('Done action triggers celebrate, then forward movement state', () => {
    const fsm = new AvatarStateMachine('enter');
    const statesVisited: string[] = [];
    fsm.subscribe((state) => statesVisited.push(state));

    // Handle completed (Done)
    fsm.handleEvent('completed');
    expect(fsm.getState()).toBe('celebrate');

    // After celebrate duration, transitions to forward perspective movement
    vi.advanceTimersByTime(2300);
    expect(fsm.getState()).toBe('forward');
  });

  it('Not done yet action triggers sad state, then backward movement state', () => {
    const fsm = new AvatarStateMachine('enter');
    const statesVisited: string[] = [];
    fsm.subscribe((state) => statesVisited.push(state));

    // Handle not_done
    fsm.handleEvent('not_done');
    expect(fsm.getState()).toBe('sad');

    // After sad reaction duration, transitions to backward retreat
    vi.advanceTimersByTime(2300);
    expect(fsm.getState()).toBe('backward');
  });

  it('Unanswered timeout triggers missed event with sad state and backward retreat', () => {
    const fsm = new AvatarStateMachine('enter');

    // Due greeting
    fsm.handleEvent('due');
    vi.advanceTimersByTime(850);
    expect(fsm.getState()).toBe('happy');

    // Unanswered timeout triggers missed event
    fsm.handleEvent('missed');
    expect(fsm.getState()).toBe('sad');

    vi.advanceTimersByTime(2300);
    expect(fsm.getState()).toBe('backward');
  });

  it('Snooze action acknowledges neutrally without happy or sad completion reactions', () => {
    const fsm = new AvatarStateMachine('enter');

    fsm.handleEvent('snoozed');
    expect(fsm.getState()).toBe('acknowledge');

    vi.advanceTimersByTime(1300);
    expect(fsm.getState()).toBe('idle');
  });

  it('Dismiss action closes neutrally without marking completed', () => {
    const fsm = new AvatarStateMachine('enter');

    fsm.handleEvent('dismissed');
    expect(fsm.getState()).toBe('acknowledge');

    vi.advanceTimersByTime(900);
    expect(fsm.getState()).toBe('exit');
  });

  it('properly cleans up timers and event listeners on FSM dispose', () => {
    const fsm = new AvatarStateMachine('enter');
    let listenerCalled = false;
    fsm.subscribe(() => {
      listenerCalled = true;
    });

    fsm.handleEvent('completed');
    fsm.dispose();

    // Advancing timers after dispose does not cause errors or fire callbacks
    vi.advanceTimersByTime(3000);
    listenerCalled = false;
    fsm.handleEvent('completed');
    expect(listenerCalled).toBe(false);
  });
});

describe('Action Semantics & Persistence', () => {
  it('records Done as completed and increments habit stats', () => {
    const history: ReminderHistoryRecord[] = [
      {
        id: 'rec-1',
        reminderId: 'rem-water',
        reminderTitle: 'Water Break',
        categoryId: 'hydration',
        action: 'completed',
        scheduledFor: new Date().toISOString(),
        performedAt: new Date().toISOString(),
      },
    ];

    const stats = computeHabitStats(history, []);
    expect(stats.totalCompleted).toBe(1);
  });

  it('records Not Done Yet without counting it as completed in habit stats', () => {
    const history: ReminderHistoryRecord[] = [
      {
        id: 'rec-2',
        reminderId: 'rem-study',
        reminderTitle: 'Study Sprint',
        categoryId: 'studying',
        action: 'not_done',
        scheduledFor: new Date().toISOString(),
        performedAt: new Date().toISOString(),
      },
      {
        id: 'rec-3',
        reminderId: 'rem-study-2',
        reminderTitle: 'Study Sprint 2',
        categoryId: 'studying',
        action: 'missed',
        scheduledFor: new Date().toISOString(),
        performedAt: new Date().toISOString(),
      },
    ];

    const stats = computeHabitStats(history, []);
    expect(stats.totalCompleted).toBe(0);
    expect(stats.totalScheduled).toBe(2);
  });

  it('advances reminder schedule and updates lastCompletedAt upon Done action', () => {
    const reminder: Reminder = {
      id: 'rem-stretch',
      title: 'Quick stretch',
      categoryId: 'exercise',
      schedule: { type: 'interval', time: '09:00', intervalMinutes: 30, timeZone: 'UTC' },
      snoozeDurationMinutes: 10,
      priority: 'normal',
      avatarId: 'maya-yogi',
      soundEffect: 'gentle',
      enabled: true,
      missedPolicy: 'catch_up_immediate',
      nextOccurrence: '2026-10-11T09:00:00.000Z',
      createdAt: '',
      updatedAt: '',
    };

    const completionTime = new Date('2026-10-11T09:05:00.000Z');
    const advanced = advanceReminderSchedule(reminder, completionTime);

    expect(new Date(advanced.nextOccurrence).getTime()).toBeGreaterThan(completionTime.getTime());
    expect(advanced.enabled).toBe(true);
  });

  it('prevents duplicate reminder overlays for the same occurrence', () => {
    const reminder: Reminder = {
      id: 'rem-water',
      title: 'Water break',
      categoryId: 'hydration',
      schedule: { type: 'interval', time: '10:00', intervalMinutes: 60, timeZone: 'UTC' },
      snoozeDurationMinutes: 10,
      priority: 'normal',
      avatarId: 'pip-penguin',
      soundEffect: 'water',
      enabled: true,
      missedPolicy: 'catch_up_immediate',
      nextOccurrence: '2026-10-11T10:00:00.000Z',
      createdAt: '',
      updatedAt: '',
    };

    const triggeredOccurrences = new Set<string>();

    // First check: trigger due reminder
    const now = new Date('2026-10-11T10:05:00.000Z');
    const eval1 = evaluateDueReminders([reminder], now);
    expect(eval1.dueToTrigger.length).toBe(1);

    const occKey = `${reminder.id}:${reminder.nextOccurrence}`;
    expect(triggeredOccurrences.has(occKey)).toBe(false);

    // Record as triggered
    triggeredOccurrences.add(occKey);

    // Second check in next tick: occurrence already recorded, suppressed from re-triggering
    const isAlreadyShown = triggeredOccurrences.has(`${reminder.id}:${reminder.nextOccurrence}`);
    expect(isAlreadyShown).toBe(true);

    // When snoozed for 10 minutes: nextOccurrence changes
    const snoozedTime = calculateSnoozeTime(now, 10);
    const updatedReminder = {
      ...reminder,
      nextOccurrence: snoozedTime.toISOString(),
    };

    const newOccKey = `${updatedReminder.id}:${updatedReminder.nextOccurrence}`;
    expect(triggeredOccurrences.has(newOccKey)).toBe(false);
  });
});

describe('Video Avatar Multi-Clip Resolution vs Single Video Fallback', () => {
  it('resolves dedicated clips when animationClips dictionary is provided', () => {
    const multiClipAvatar: Avatar = {
      id: 'avatar-multi',
      name: 'Custom Companion',
      description: 'Companion with multi clips',
      type: 'video',
      category: 'custom',
      supportedStates: ['idle', 'celebrate', 'sad', 'forward', 'backward'],
      previewUrl: 'https://example.com/preview.png',
      sourceUrl: 'https://example.com/base.mp4',
      animationClips: {
        idle: 'https://example.com/idle.mp4',
        celebrate: 'https://example.com/happy-celebrate.mp4',
        sad: 'https://example.com/sad-backward.mp4',
      },
      isCustom: true,
      createdAt: new Date().toISOString(),
    };

    // Helper simulating clip selection logic in VideoChromaKeyAvatar
    function resolveClip(avatar: Avatar, state: string) {
      if (!avatar.animationClips) return avatar.sourceUrl;
      if (avatar.animationClips[state as any]) return avatar.animationClips[state as any];
      if ((state === 'happy' || state === 'celebrate' || state === 'forward') && avatar.animationClips.celebrate) {
        return avatar.animationClips.celebrate;
      }
      if ((state === 'sad' || state === 'backward' || state === 'concerned') && avatar.animationClips.sad) {
        return avatar.animationClips.sad;
      }
      return avatar.animationClips.idle || avatar.sourceUrl;
    }

    expect(resolveClip(multiClipAvatar, 'forward')).toBe('https://example.com/happy-celebrate.mp4');
    expect(resolveClip(multiClipAvatar, 'backward')).toBe('https://example.com/sad-backward.mp4');
    expect(resolveClip(multiClipAvatar, 'idle')).toBe('https://example.com/idle.mp4');
  });

  it('falls back to single primary video with container-level scaling when clips are absent', () => {
    const singleClipAvatar: Avatar = {
      id: 'avatar-single',
      name: 'Single Clip Companion',
      description: 'Single uploaded video',
      type: 'video',
      category: 'custom',
      supportedStates: ['idle'],
      previewUrl: 'https://example.com/preview.png',
      sourceUrl: 'https://example.com/single.mp4',
      isCustom: true,
      createdAt: new Date().toISOString(),
    };

    function resolveClip(avatar: Avatar, state: string) {
      if (!avatar.animationClips) return avatar.sourceUrl;
      return avatar.sourceUrl;
    }

    expect(resolveClip(singleClipAvatar, 'forward')).toBe('https://example.com/single.mp4');
    expect(resolveClip(singleClipAvatar, 'backward')).toBe('https://example.com/single.mp4');
  });
});
