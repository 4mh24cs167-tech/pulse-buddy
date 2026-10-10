import React, { useState, useEffect } from 'react';
import { Reminder, Avatar, AnimationState, ReminderAction } from '@pulse-buddy/shared-types';
import { AvatarStateMachine } from '@pulse-buddy/avatar';
import { soundEngine } from './soundEngine';
import { AvatarRenderer } from './AvatarRenderer';
import { CheckCircle2, Clock, X, ExternalLink, Sparkles } from 'lucide-react';

export interface CompanionBubbleProps {
  reminder: Reminder;
  avatar: Avatar;
  speechText: string;
  onAction: (action: ReminderAction, reminderId: string, snoozeMinutes?: number) => void;
  onOpenDashboard?: () => void;
  onClose?: () => void;
  autoDismissSeconds?: number;
}

export const CompanionBubble: React.FC<CompanionBubbleProps> = ({
  reminder,
  avatar,
  speechText,
  onAction,
  onOpenDashboard,
  onClose,
  autoDismissSeconds = 45,
}) => {
  const [fsm] = useState(() => new AvatarStateMachine('enter'));
  const [state, setState] = useState<AnimationState>('enter');
  const [snoozeMenuOpen, setSnoozeMenuOpen] = useState(false);
  const [isDoneCelebrating, setIsDoneCelebrating] = useState(false);

  useEffect(() => {
    // Play reminder sound
    soundEngine.play(reminder.soundEffect || 'chime');

    const unsubscribe = fsm.subscribe((newState) => {
      setState(newState);
    });

    // Enter -> happy/greet
    fsm.handleEvent('due');

    // Auto dismiss timer if untouched
    const dismissTimer = setTimeout(() => {
      onAction('dismissed', reminder.id);
      if (onClose) onClose();
    }, autoDismissSeconds * 1000);

    return () => {
      unsubscribe();
      clearTimeout(dismissTimer);
      fsm.dispose();
    };
  }, [reminder, fsm]);

  const handleDone = () => {
    setIsDoneCelebrating(true);
    fsm.handleEvent('completed');
    soundEngine.playCelebrationFanfare();

    setTimeout(() => {
      onAction('completed', reminder.id);
      if (onClose) onClose();
    }, 2200);
  };

  const handleSnooze = (minutes: number) => {
    fsm.handleEvent('snoozed');
    soundEngine.playSnoozeClick();
    setSnoozeMenuOpen(false);

    setTimeout(() => {
      onAction('snoozed', reminder.id, minutes);
      if (onClose) onClose();
    }, 1200);
  };

  const handleDismiss = () => {
    fsm.handleEvent('dismissed');
    setTimeout(() => {
      onAction('dismissed', reminder.id);
      if (onClose) onClose();
    }, 800);
  };

  return (
    <div className="relative flex flex-col items-center justify-end select-none pointer-events-auto p-4 max-w-[360px] animate-in fade-in zoom-in-95 duration-300">
      {/* Speech Bubble */}
      <div className="relative mb-3 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl p-4 shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 transition-all">
        {/* Category Badge & Close X */}
        <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: reminder.categoryColor || '#38bdf8' }}
            />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {reminder.categoryName || 'Reminder'}
            </span>
          </div>

          <button
            onClick={handleDismiss}
            title="Dismiss"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Reminder Title */}
        <h4 className="text-base font-bold text-slate-900 dark:text-white leading-tight mb-1">
          {reminder.title}
        </h4>

        {/* Companion Speech Line */}
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-snug mb-3">
          {isDoneCelebrating ? 'Awesome job! Recorded as completed! 🎉' : speechText}
        </p>

        {/* Action Buttons */}
        {!isDoneCelebrating && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {/* Done Button */}
            <button
              onClick={handleDone}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95"
            >
              <CheckCircle2 size={16} />
              Done
            </button>

            {/* Snooze Button */}
            <div className="relative">
              <button
                onClick={() => setSnoozeMenuOpen(!snoozeMenuOpen)}
                className="flex items-center justify-center gap-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition-all active:scale-95"
              >
                <Clock size={15} />
                Snooze
              </button>

              {/* Snooze dropdown options */}
              {snoozeMenuOpen && (
                <div className="absolute bottom-full mb-1 left-0 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1 min-w-[120px] z-50">
                  <button
                    onClick={() => handleSnooze(5)}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                  >
                    5 minutes
                  </button>
                  <button
                    onClick={() => handleSnooze(10)}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                  >
                    10 minutes
                  </button>
                  <button
                    onClick={() => handleSnooze(15)}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                  >
                    15 minutes
                  </button>
                  <button
                    onClick={() => handleSnooze(30)}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                  >
                    30 minutes
                  </button>
                </div>
              )}
            </div>

            {/* Open Dashboard Link */}
            {onOpenDashboard && (
              <button
                onClick={onOpenDashboard}
                title="Open in Pulse Buddy"
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-all"
              >
                <ExternalLink size={15} />
              </button>
            )}
          </div>
        )}

        {/* Speech Bubble Tail pointing down */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white/95 dark:bg-slate-900/95 rotate-45 border-r border-b border-slate-200 dark:border-slate-800" />
      </div>

      {/* Animated Avatar */}
      <div className="relative">
        <AvatarRenderer avatar={avatar} state={state} size={190} />
      </div>
    </div>
  );
};
