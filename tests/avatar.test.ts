import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  AvatarStateMachine,
  hexToRgb,
  applyChromaKeyToImageData,
  generateAvatarPrompts,
} from '../packages/avatar/src';
import { ChromaKeyConfig } from '../packages/shared-types/src';

describe('Avatar State Machine & Behavior Controller', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes to idle state', () => {
    const fsm = new AvatarStateMachine();
    expect(fsm.getState()).toBe('idle');
  });

  it('maps "due" event to enter then happy greeting', () => {
    const fsm = new AvatarStateMachine();
    fsm.handleEvent('due');
    expect(fsm.getState()).toBe('enter');

    vi.advanceTimersByTime(850);
    expect(fsm.getState()).toBe('happy');
  });

  it('maps "completed" event to celebrate then returns to idle', () => {
    const fsm = new AvatarStateMachine();
    fsm.handleEvent('completed');
    expect(fsm.getState()).toBe('celebrate');

    vi.advanceTimersByTime(2600);
    expect(fsm.getState()).toBe('idle');
  });

  it('maps "snoozed" event to acknowledge then returns to idle', () => {
    const fsm = new AvatarStateMachine();
    fsm.handleEvent('snoozed');
    expect(fsm.getState()).toBe('acknowledge');

    vi.advanceTimersByTime(1600);
    expect(fsm.getState()).toBe('idle');
  });

  it('clears pending timers when reset or new transition occurs without overlapping loops', () => {
    const fsm = new AvatarStateMachine();
    fsm.transition('enter', 1000, 'happy');

    // Interrupt before timer completes
    fsm.transition('celebrate', 2000, 'idle');
    expect(fsm.getState()).toBe('celebrate');

    // Advance 1000ms: should NOT transition to 'happy' because timer was superseded
    vi.advanceTimersByTime(1000);
    expect(fsm.getState()).toBe('celebrate');

    // Advance another 1000ms: now reaches 2000ms, transitions to 'idle'
    vi.advanceTimersByTime(1000);
    expect(fsm.getState()).toBe('idle');
  });
});

describe('Chroma-Key Processing Pipeline', () => {
  it('parses hex colors to RGB accurately', () => {
    const green = hexToRgb('#00FF00');
    expect(green).toEqual({ r: 0, g: 255, b: 0 });

    const red = hexToRgb('#FF0000');
    expect(red).toEqual({ r: 255, g: 0, b: 0 });
  });

  it('renders green screen pixels transparent and leaves non-green pixels opaque', () => {
    const config: ChromaKeyConfig = {
      enabled: true,
      keyColor: '#00FF00',
      similarity: 0.35,
      smoothness: 0.1,
      spillSuppression: 0.45,
    };

    // Simulate 2 pixels in ImageData: 1 pure green, 1 pure blue
    const data = new Uint8ClampedArray([
      0, 255, 0, 255, // Pixel 1: Pure Green
      30, 40, 220, 255, // Pixel 2: Blue foreground character
    ]);

    const fakeImageData = {
      data,
      width: 2,
      height: 1,
      colorSpace: 'srgb',
    } as unknown as ImageData;

    applyChromaKeyToImageData(fakeImageData, config);

    // Pixel 1 (green) should be keyed out (alpha = 0)
    expect(data[3]).toBe(0);

    // Pixel 2 (blue) should remain visible
    expect(data[7]).toBeGreaterThan(200);
  });
});

describe('AI Avatar Prompt Wizard', () => {
  it('generates prompt containing specified chroma-key green requirements', () => {
    const prompts = generateAvatarPrompts({
      characterType: 'robot',
      characterName: 'Bolt',
      appearanceDescription: 'Sleek silver android with blue glowing eyes',
      clothingOrTexture: 'matte titanium plating',
      visualStyle: 'pixar-3d',
      personality: 'energetic',
      reminderCategory: 'Hydration',
      targetAction: 'offering a water bottle with a robotic wave',
      framing: 'full-body',
      targetTool: 'google-flow',
    });

    expect(prompts.videoPrompt).toContain('RGB (0, 255, 0)');
    expect(prompts.videoPrompt).toContain('chroma-key green');
    expect(prompts.videoPrompt).toContain('Bolt');
    expect(prompts.videoPrompt).toContain('matte titanium plating');
    expect(prompts.recommendedSettings.backgroundHex).toBe('#00FF00');
  });
});
