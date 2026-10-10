import { AnimationState, ReminderAction } from '@pulse-buddy/shared-types';

export interface StateTransitionConfig {
  from: AnimationState | '*';
  to: AnimationState;
  durationMs?: number;
  autoTransitionTo?: AnimationState;
}

export type StateChangeCallback = (state: AnimationState, prevState: AnimationState) => void;

/**
 * Avatar Behavior Controller managing deterministic states, avoiding overlapping loops
 * and orphaned timers.
 */
export class AvatarStateMachine {
  private currentState: AnimationState = 'idle';
  private previousState: AnimationState = 'idle';
  private transitionTimer: any = null;
  private listeners: Set<StateChangeCallback> = new Set();

  constructor(initialState: AnimationState = 'idle') {
    this.currentState = initialState;
    this.previousState = initialState;
  }

  public getState(): AnimationState {
    return this.currentState;
  }

  public getPreviousState(): AnimationState {
    return this.previousState;
  }

  public subscribe(callback: StateChangeCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notify(newState: AnimationState, oldState: AnimationState): void {
    this.listeners.forEach((fn) => fn(newState, oldState));
  }

  /**
   * Safely transitions to a new state with optional automatic return.
   */
  public transition(targetState: AnimationState, autoReturnDurationMs?: number, returnToState: AnimationState = 'idle'): void {
    if (this.transitionTimer) {
      clearTimeout(this.transitionTimer);
      this.transitionTimer = null;
    }

    const prev = this.currentState;
    this.previousState = prev;
    this.currentState = targetState;
    this.notify(targetState, prev);

    if (autoReturnDurationMs && autoReturnDurationMs > 0) {
      this.transitionTimer = setTimeout(() => {
        this.transitionTimer = null;
        this.transition(returnToState);
      }, autoReturnDurationMs);
    }
  }

  /**
   * Translates reminder lifecycle events to deterministic avatar states.
   */
  public handleEvent(event: 'due' | 'completed' | 'snoozed' | 'dismissed' | 'missed' | 'habit_goal'): void {
    switch (event) {
      case 'due':
        // Entrance -> draw attention
        this.transition('enter', 800, 'happy');
        break;

      case 'completed':
        // Smile & brief celebration, then idle
        this.transition('celebrate', 2500, 'idle');
        break;

      case 'snoozed':
        // Acknowledge, then calm idle
        this.transition('acknowledge', 1500, 'idle');
        break;

      case 'missed':
        // Gentle concerned expression
        this.transition('concerned', 3000, 'idle');
        break;

      case 'habit_goal':
        // Enthusiastic celebration
        this.transition('celebrate', 3500, 'happy');
        break;

      case 'dismissed':
        // Acknowledge and calm exit
        this.transition('acknowledge', 1000, 'exit');
        break;

      default:
        this.transition('idle');
        break;
    }
  }

  public reset(): void {
    if (this.transitionTimer) {
      clearTimeout(this.transitionTimer);
      this.transitionTimer = null;
    }
    this.currentState = 'idle';
    this.previousState = 'idle';
    this.notify('idle', 'idle');
  }

  public dispose(): void {
    if (this.transitionTimer) {
      clearTimeout(this.transitionTimer);
      this.transitionTimer = null;
    }
    this.listeners.clear();
  }
}
