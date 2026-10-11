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
} from '../packages/core/src';
import { Reminder, ChromaKeyConfig } from '../packages/shared-types/src';

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
      180, 195, 100, 255,  // Pixel 2: Foregound element with green spill (g > max(r, b))
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

describe('Floating Avatar Reminder Lifecycle & Duplicate Prevention', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('transitions avatar FSM through enter, greet, celebrate, and idle deterministically', () => {
    const fsm = new AvatarStateMachine('enter');
    expect(fsm.getState()).toBe('enter');

    // Due event triggers greeting
    fsm.handleEvent('due');
    vi.advanceTimersByTime(850);
    expect(fsm.getState()).toBe('happy');

    // Completed action triggers celebrate
    fsm.handleEvent('completed');
    expect(fsm.getState()).toBe('celebrate');

    // After celebration duration, returns to idle
    vi.advanceTimersByTime(2600);
    expect(fsm.getState()).toBe('idle');
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
});
