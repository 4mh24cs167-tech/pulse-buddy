import React, { useState, useEffect, useRef } from 'react';
import { Reminder, Avatar, AnimationState, ReminderAction } from '@pulse-buddy/shared-types';
import { AvatarStateMachine } from '@pulse-buddy/avatar';
import { soundEngine } from './soundEngine';
import { AvatarRenderer } from './AvatarRenderer';
import { CheckCircle2, Clock, X, ExternalLink, Sparkles, ChevronDown } from 'lucide-react';
import confetti from 'canvas-confetti';

export type FloatingPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center';

export interface FloatingAvatarReminderProps {
  reminder: Reminder;
  avatar: Avatar;
  speechText?: string;
  position?: FloatingPosition;
  size?: number | 'small' | 'medium' | 'large';
  onAction: (action: ReminderAction, reminderId: string, snoozeMinutes?: number) => void;
  onOpenDashboard?: () => void;
  onClose?: () => void;
  autoDismissSeconds?: number;
  testMode?: boolean;
}

type LifecyclePhase = 'enter' | 'greet' | 'interactive' | 'reaction' | 'exit';

export const FloatingAvatarReminder: React.FC<FloatingAvatarReminderProps> = ({
  reminder,
  avatar,
  speechText = 'Hey there! Time for your reminder.',
  position = 'bottom-right',
  size = 'medium',
  onAction,
  onOpenDashboard,
  onClose,
  autoDismissSeconds = 45,
  testMode = false,
}) => {
  const [phase, setPhase] = useState<LifecyclePhase>('enter');
  const [avatarState, setAvatarState] = useState<AnimationState>('enter');
  const [fsm] = useState(() => new AvatarStateMachine('enter'));
  const [snoozeMenuOpen, setSnoozeMenuOpen] = useState(false);
  const [reactionMessage, setReactionMessage] = useState<string | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const activeTimersRef = useRef<number[]>([]);

  // Resolve pixel size from size prop
  const resolvedSize =
    typeof size === 'number'
      ? size
      : size === 'small'
      ? 160
      : size === 'large'
      ? 260
      : 210;

  // Reduced motion preference detection
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mediaQuery.matches);

      const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, []);

  // Safe timeout helper that tracks timers for total cleanup
  const safeTimeout = (fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    activeTimersRef.current.push(id);
    return id;
  };

  // Entrance & Lifecycle Sequence
  useEffect(() => {
    // 1. Play reminder chime
    soundEngine.play(reminder.soundEffect || 'chime');

    // Subscribe to FSM
    const unsubscribeFsm = fsm.subscribe((newState) => {
      setAvatarState(newState);
    });

    // Step A: Enter animation (0ms - 400ms)
    // Step B: Greet animation (400ms)
    safeTimeout(() => {
      setPhase('greet');
      fsm.handleEvent('due');
    }, 450);

    // Step C: Interactive state (800ms)
    safeTimeout(() => {
      setPhase('interactive');
    }, 850);

    // Auto-dismiss countdown if untouched
    if (autoDismissSeconds > 0 && !testMode) {
      safeTimeout(() => {
        handleDismiss();
      }, autoDismissSeconds * 1000);
    }

    return () => {
      unsubscribeFsm();
      fsm.dispose();
      activeTimersRef.current.forEach((id) => clearTimeout(id));
      activeTimersRef.current = [];
    };
  }, [reminder.id, fsm]);

  // Keyboard accessibility (Escape key to dismiss)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ACTION: Done (Celebration)
  const handleDone = () => {
    if (phase === 'reaction' || phase === 'exit') return;

    setPhase('reaction');
    setReactionMessage('Awesome job! Recorded as completed! 🎉');
    fsm.handleEvent('completed');
    soundEngine.playCelebrationFanfare();

    try {
      confetti({
        particleCount: 75,
        spread: 65,
        origin: { y: 0.75 },
        zIndex: 10000,
      });
    } catch {
      // Confetti fallback
    }

    // Reaction duration then exit smoothly
    safeTimeout(() => {
      triggerExit('completed');
    }, 2000);
  };

  // ACTION: Snooze (Acknowledgment)
  const handleSnooze = (minutes: number) => {
    if (phase === 'reaction' || phase === 'exit') return;

    setSnoozeMenuOpen(false);
    setPhase('reaction');
    setReactionMessage(`Snoozed for ${minutes} min! See you soon! ⏰`);
    fsm.handleEvent('snoozed');
    soundEngine.playSnoozeClick();

    safeTimeout(() => {
      triggerExit('snoozed', minutes);
    }, 1300);
  };

  // ACTION: Dismiss
  const handleDismiss = () => {
    if (phase === 'reaction' || phase === 'exit') return;

    setPhase('reaction');
    setReactionMessage('Got it! Dismissed for now. 👋');
    fsm.handleEvent('dismissed');

    safeTimeout(() => {
      triggerExit('dismissed');
    }, 500);
  };

  // EXIT TRANSITION
  const triggerExit = (action: ReminderAction, snoozeMinutes?: number) => {
    setPhase('exit');

    // Wait for exit CSS transition before dispatching action and unmounting
    const exitDuration = prefersReducedMotion ? 150 : 380;
    safeTimeout(() => {
      onAction(action, reminder.id, snoozeMinutes);
      if (onClose) onClose();
    }, exitDuration);
  };

  // Position CSS classes
  const getPositionClass = () => {
    switch (position) {
      case 'bottom-left':
        return 'bottom-4 left-4 sm:bottom-6 sm:left-6';
      case 'top-right':
        return 'top-4 right-4 sm:top-6 sm:right-6';
      case 'top-left':
        return 'top-4 left-4 sm:top-6 sm:left-6';
      case 'center':
        return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
      case 'bottom-right':
      default:
        return 'bottom-4 right-4 sm:bottom-6 sm:right-6';
    }
  };

  // Animation transition styling based on lifecycle phase
  const getMotionStyle = () => {
    if (prefersReducedMotion) {
      return phase === 'exit' ? 'opacity-0' : 'opacity-100';
    }

    if (phase === 'enter') {
      return 'translate-y-12 scale-90 opacity-0 pointer-events-none';
    }

    if (phase === 'exit') {
      return 'translate-y-10 scale-95 opacity-0 pointer-events-none transition-all duration-350 ease-in';
    }

    return 'translate-y-0 scale-100 opacity-100 transition-all duration-500 ease-out';
  };

  // Speech bubble position relative to avatar
  const isLeftAlign = position === 'bottom-left' || position === 'top-left';

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-label={`${reminder.title} - ${avatar.name}`}
      aria-live="polite"
      className={`fixed z-[9999] select-none pointer-events-auto flex flex-col items-center ${
        isLeftAlign ? 'sm:items-start' : 'sm:items-end'
      } ${getPositionClass()} ${getMotionStyle()}`}
    >
      {/* =========================================================================
          SPEECH BUBBLE COMPONENT
          ========================================================================= */}
      <div
        className={`relative mb-3 max-w-[340px] sm:max-w-[380px] w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-3xl p-4 sm:p-5 shadow-2xl border border-slate-200/90 dark:border-slate-800 text-slate-800 dark:text-slate-100 transition-all duration-300 ${
          phase === 'enter' ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
        }`}
      >
        {/* Header Pill: Category & Close */}
        <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full shadow-sm animate-pulse"
              style={{ backgroundColor: reminder.categoryColor || '#0ea5e9' }}
            />
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {reminder.categoryName || 'Reminder'}
            </span>
            {testMode && (
              <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 rounded-full border border-amber-300 dark:border-amber-800">
                Test Preview
              </span>
            )}
          </div>

          <button
            onClick={handleDismiss}
            title="Dismiss reminder"
            aria-label="Dismiss reminder"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X size={15} />
          </button>
        </div>

        {/* Reminder Title */}
        <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight mb-1 tracking-tight">
          {reminder.title}
        </h3>

        {/* Contextual Companion Message */}
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-snug mb-3">
          {reactionMessage || speechText}
        </p>

        {/* Action Controls (Hidden during celebration/exit reactions) */}
        {phase !== 'reaction' && phase !== 'exit' && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {/* Done Button */}
            <button
              onClick={handleDone}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-bold rounded-2xl shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
            >
              <CheckCircle2 size={16} />
              Done
            </button>

            {/* Snooze Dropdown Menu */}
            <div className="relative">
              <button
                onClick={() => setSnoozeMenuOpen(!snoozeMenuOpen)}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-2xl active:scale-95 transition-all"
              >
                <Clock size={15} />
                <span>Snooze</span>
                <ChevronDown size={13} className={`transition-transform ${snoozeMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {snoozeMenuOpen && (
                <div className="absolute bottom-full mb-2 left-0 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 py-1.5 min-w-[140px] z-50 animate-in fade-in zoom-in-95 duration-150">
                  {[5, 10, 15, 30].map((mins) => (
                    <button
                      key={mins}
                      onClick={() => handleSnooze(mins)}
                      className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition flex items-center justify-between"
                    >
                      <span>{mins} minutes</span>
                      {reminder.snoozeDurationMinutes === mins && (
                        <span className="text-[10px] text-sky-500 font-bold">Default</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Dashboard / Dismiss secondary options */}
            {onOpenDashboard && (
              <button
                onClick={onOpenDashboard}
                title="Open in Pulse Buddy"
                aria-label="Open dashboard"
                className="p-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-2xl transition"
              >
                <ExternalLink size={15} />
              </button>
            )}

            <button
              onClick={handleDismiss}
              className="px-3 py-2 text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Speech Bubble Arrow Tail pointing towards avatar */}
        <div
          className={`absolute -bottom-2 w-4 h-4 bg-white/95 dark:bg-slate-900/95 rotate-45 border-r border-b border-slate-200/90 dark:border-slate-800 ${
            isLeftAlign ? 'left-10' : 'right-10'
          }`}
        />
      </div>

      {/* =========================================================================
          ANIMATED AVATAR (VIDEO CHROMA-KEY OR BUILT-IN CHARACTER RIG)
          ========================================================================= */}
      <div className="relative flex items-center justify-center filter drop-shadow-2xl">
        <AvatarRenderer
          avatar={avatar}
          state={avatarState}
          size={resolvedSize}
          className="transition-transform duration-300"
        />
      </div>
    </div>
  );
};
