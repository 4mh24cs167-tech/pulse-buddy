import React, { useState } from 'react';
import { Avatar, AnimationState, ChromaKeyConfig, AvatarCategory, ReminderAction } from '@pulse-buddy/shared-types';
import { AvatarRenderer, VideoChromaKeyAvatar, soundEngine } from '@pulse-buddy/ui';
import { generateAvatarPrompts, PromptWizardInput, validateMediaFile, PULSE_BUDDY_DEMO_AVATAR } from '@pulse-buddy/avatar';
import {
  Sparkles,
  Upload,
  Video,
  Image as ImageIcon,
  Wand2,
  CheckCircle2,
  Copy,
  Sliders,
  Play,
  Trash2,
  Heart,
  Info,
  Layers,
  ArrowRight,
  ArrowLeft,
  Eye,
  Settings,
  AlertCircle,
  RefreshCw,
  Clock,
  RotateCcw,
  X,
  Bell,
  Smile,
  Frown,
  FastForward,
  Rewind,
  Check,
} from 'lucide-react';

interface AvatarStudioViewProps {
  avatars: Avatar[];
  defaultAvatarId: string;
  onSetDefaultAvatar: (id: string) => void;
  onSaveAvatar: (avatar: Avatar) => void;
  onDeleteAvatar: (id: string) => void;
  onTriggerTest: (avatarId: string, customDraft?: Avatar, initialAction?: ReminderAction | 'due', isDemoTest?: boolean) => void;
  onScheduleInstantReminder?: (avatarId: string, secondsFromNow?: number) => void;
}

export const AvatarStudioView: React.FC<AvatarStudioViewProps> = ({
  avatars,
  defaultAvatarId,
  onSetDefaultAvatar,
  onSaveAvatar,
  onDeleteAvatar,
  onTriggerTest,
  onScheduleInstantReminder,
}) => {
  const [activeTab, setActiveTab] = useState<'gallery' | 'studio'>('gallery');
  const [galleryFilter, setGalleryFilter] = useState<string>('all');
  const [testState, setTestState] = useState<AnimationState>('idle');
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadWarning, setUploadWarning] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'keyed' | 'original'>('keyed');

  // Studio Step Tracker (1: Choose Method, 2: Requirements, 3: AI Prompt, 4: Preview & Chroma)
  const [studioStep, setStudioStep] = useState<number>(1);
  const [creationMethod, setCreationMethod] = useState<'image' | 'video' | 'transparent' | 'ai_prompt'>('ai_prompt');

  // AI Prompt Wizard State
  const [wizardInput, setWizardInput] = useState<PromptWizardInput>({
    characterType: 'animal',
    characterName: 'Pip',
    appearanceDescription: 'Cheerful chubby penguin with cyan knitted scarf and bright eyes',
    clothingOrTexture: 'cyan winter knit scarf with white fringe',
    visualStyle: 'pixar-3d',
    personality: 'cheerful',
    reminderCategory: 'Hydration & Water Breaks',
    targetAction: 'raising a tall cold glass of water, sipping joyfully, and waving to celebrate',
    framing: 'full-body',
    targetTool: 'google-flow',
  });

  // Generated Prompts
  const generatedPrompts = generateAvatarPrompts(wizardInput);

  // Upload & Chroma-Key Preview State
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [uploadedFileType, setUploadedFileType] = useState<'image' | 'video'>('image');
  const [extraClips, setExtraClips] = useState<Partial<Record<AnimationState, string>>>({});
  const [showMultiClipPanel, setShowMultiClipPanel] = useState(false);
  const [customAvatarName, setCustomAvatarName] = useState('My Custom Buddy');
  const [customAvatarCategory, setCustomAvatarCategory] = useState<AvatarCategory>('custom');
  const [chromaKeyConfig, setChromaKeyConfig] = useState<ChromaKeyConfig>({
    enabled: true,
    keyColor: '#00FF00',
    similarity: 0.35,
    smoothness: 0.1,
    spillSuppression: 0.45,
  });

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(generatedPrompts.videoPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2500);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateMediaFile(file);
    if (!validation.valid) {
      setUploadError(validation.errorMessage || 'Invalid file format.');
      return;
    }

    setUploadError(null);
    setUploadWarning(validation.warningMessage || null);
    setUploadedFileType(validation.mediaType === 'video' ? 'video' : 'image');

    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedFileUrl(event.target?.result as string);
      setStudioStep(4); // Advance to preview and chroma key adjustment
    };
    reader.onerror = () => {
      setUploadError('Failed to read uploaded file. Please select another file.');
    };
    reader.readAsDataURL(file);
  };

  const handleExtraClipUpload = (stateKey: AnimationState, file: File) => {
    const validation = validateMediaFile(file);
    if (!validation.valid) {
      setUploadError(validation.errorMessage || 'Invalid video clip format.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setExtraClips((prev) => ({
        ...prev,
        [stateKey]: event.target?.result as string,
      }));
    };
    reader.readAsDataURL(file);
  };

  // Demo Companion State & Handlers
  const [demoLoadedToast, setDemoLoadedToast] = useState<string | null>(null);
  const [demoPreviewState, setDemoPreviewState] = useState<AnimationState>('idle');
  const [schedulerCountdown, setSchedulerCountdown] = useState<number | null>(null);
  const [activeTestLabel, setActiveTestLabel] = useState<string | null>(null);

  const isDemoDefault = defaultAvatarId === PULSE_BUDDY_DEMO_AVATAR.id;

  const handleLoadDemoAvatar = () => {
    onSetDefaultAvatar(PULSE_BUDDY_DEMO_AVATAR.id);
    setUploadedFileUrl(PULSE_BUDDY_DEMO_AVATAR.sourceUrl || null);
    setUploadedFileType('video');
    setCustomAvatarName(PULSE_BUDDY_DEMO_AVATAR.name);
    setCustomAvatarCategory('humans');
    setExtraClips(PULSE_BUDDY_DEMO_AVATAR.animationClips || {});
    if (PULSE_BUDDY_DEMO_AVATAR.chromaKeyConfig) {
      setChromaKeyConfig(PULSE_BUDDY_DEMO_AVATAR.chromaKeyConfig);
    }
    setDemoLoadedToast('Pulse Buddy — Demo Companion is now loaded as your active default companion!');
    setTimeout(() => setDemoLoadedToast(null), 5000);
  };

  const handleStart5sSchedulerTest = () => {
    if (schedulerCountdown !== null) return;
    setSchedulerCountdown(5);
    setActiveTestLabel('5s Background Scheduler Test Running...');
    onScheduleInstantReminder?.(PULSE_BUDDY_DEMO_AVATAR.id, 5);

    let count = 5;
    const interval = window.setInterval(() => {
      count -= 1;
      if (count <= 0) {
        clearInterval(interval);
        setSchedulerCountdown(null);
        setActiveTestLabel('Scheduled Reminder Triggered via Background Scheduler!');
        setTimeout(() => setActiveTestLabel(null), 4000);
      } else {
        setSchedulerCountdown(count);
      }
    }, 1000);
  };

  const handleResetDemo = () => {
    setDemoPreviewState('idle');
    setSchedulerCountdown(null);
    setActiveTestLabel(null);
    setDemoLoadedToast(null);
  };

  const getDraftAvatar = (): Avatar => ({
    id: `avatar-draft-${Date.now()}`,
    name: customAvatarName.trim() || 'Custom Buddy',
    description: `User custom ${uploadedFileType} companion`,
    type: uploadedFileType,
    category: customAvatarCategory,
    supportedStates: ['idle', 'enter', 'happy', 'concerned', 'sad', 'acknowledge', 'celebrate', 'forward', 'backward', 'exit'],
    previewUrl: uploadedFileUrl || '',
    sourceUrl: uploadedFileUrl || '',
    animationClips: Object.keys(extraClips).length > 0 ? extraClips : undefined,
    chromaKeyConfig: uploadedFileType === 'video' ? chromaKeyConfig : undefined,
    isCustom: true,
    createdAt: new Date().toISOString(),
  });

  const handleSaveCustomAvatar = () => {
    if (!uploadedFileUrl) return;

    const newAvatar = getDraftAvatar();
    onSaveAvatar(newAvatar);
    setActiveTab('gallery');
    setStudioStep(1);
    setUploadedFileUrl(null);
    setExtraClips({});
    setUploadError(null);
    setUploadWarning(null);
  };

  const filteredAvatars = avatars.filter((a) => {
    if (galleryFilter === 'all') return true;
    if (galleryFilter === 'custom') return a.isCustom;
    return a.category === galleryFilter;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Studio Navigation Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Avatar Studio & Library
          </h2>
          <p className="text-sm text-slate-500">
            Browse animated companions, upload custom characters, or generate green-screen video prompts for Google Flow.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
          <button
            onClick={() => setActiveTab('gallery')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
              activeTab === 'gallery'
                ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Companion Gallery
          </button>
          <button
            onClick={() => setActiveTab('studio')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition ${
              activeTab === 'studio'
                ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Wand2 size={14} />
            Custom Creator Studio
          </button>
        </div>
      </div>

      {/* =========================================================================
          TAB 1: COMPANION GALLERY
          ========================================================================= */}
      {activeTab === 'gallery' && (
        <div className="space-y-6">
          {/* =========================================================================
              READY-TO-TEST DEMO COMPANION PANEL (FEATURED SHOWCASE)
              ========================================================================= */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-sky-950 text-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-sky-500/30 relative overflow-hidden">
            {/* Subtle decorative glow */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Header Pill & Title */}
            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-800">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="px-3 py-1 text-[11px] font-black uppercase tracking-widest bg-sky-500 text-slate-950 rounded-full shadow-sm flex items-center gap-1.5">
                    <Sparkles size={13} /> Built-in Demo Companion
                  </span>
                  <span className="px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/30">
                    Pure RGB(0, 255, 0) Green Screen
                  </span>
                  <span className="px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/30">
                    H.264 Web-Ready MP4
                  </span>
                  {isDemoDefault && (
                    <span className="px-3 py-1 text-[11px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 rounded-full flex items-center gap-1">
                      <CheckCircle2 size={13} /> Active Default
                    </span>
                  )}
                </div>

                <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
                  Pulse Buddy — Demo Companion
                </h3>
                <p className="text-sm text-slate-300 max-w-2xl mt-1 leading-relaxed">
                  Real 3D animated companion featuring styled dark hair, denim jacket, grey tee, charcoal jeans, and water bottle. Includes genuine idle breathing, celebratory bottle toast, and sad backward slump clips with WebGL chroma-key transparency!
                </p>
              </div>

              {/* Load Demo Avatar Button */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <button
                  onClick={handleLoadDemoAvatar}
                  className={`px-5 py-3 rounded-2xl font-black text-xs sm:text-sm transition-all shadow-lg flex items-center justify-center gap-2 ${
                    isDemoDefault
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 ring-2 ring-emerald-400'
                      : 'bg-gradient-to-r from-sky-400 to-blue-500 hover:from-sky-300 hover:to-blue-400 text-slate-950'
                  }`}
                >
                  {isDemoDefault ? <Check size={18} /> : <Sparkles size={18} />}
                  {isDemoDefault ? 'Loaded as Active Default' : 'Load Demo Avatar'}
                </button>
                <button
                  onClick={handleResetDemo}
                  title="Reset Demo State"
                  className="px-4 py-3 rounded-2xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 transition flex items-center justify-center gap-1.5"
                >
                  <RefreshCw size={15} /> Reset Demo
                </button>
              </div>
            </div>

            {/* Demo Loaded Success Toast Banner */}
            {demoLoadedToast && (
              <div className="mb-6 p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs sm:text-sm font-semibold flex items-center gap-2 animate-in fade-in duration-300">
                <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                <span>{demoLoadedToast}</span>
              </div>
            )}

            {/* Active Test Feedback Banner */}
            {activeTestLabel && (
              <div className="mb-6 p-3 rounded-2xl bg-sky-500/20 border border-sky-500/40 text-sky-200 text-xs font-bold flex items-center gap-2 animate-pulse">
                <Play size={14} className="text-sky-400 shrink-0" />
                <span>Active Action: {activeTestLabel}</span>
              </div>
            )}

            {/* Main 2-Column Content: Left Preview / Right Test Controls */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center relative z-10">
              {/* LEFT: Live Video Chroma-Key Viewport */}
              <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 bg-slate-950/70 rounded-3xl border border-slate-800 backdrop-blur-md relative overflow-hidden group">
                {/* Transparent checkerboard background underneath */}
                <div className="w-full flex items-center justify-between mb-3 text-[11px] font-bold text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    Live WebGL Keyer
                  </span>
                  <span className="uppercase tracking-widest text-sky-400 font-extrabold text-[10px]">
                    {demoPreviewState} State
                  </span>
                </div>

                {/* Viewport Canvas */}
                <div className="relative w-full aspect-[9/16] max-h-[300px] flex items-center justify-center bg-checkerboard rounded-2xl overflow-hidden border border-slate-800">
                  <VideoChromaKeyAvatar
                    videoSrc={PULSE_BUDDY_DEMO_AVATAR.sourceUrl || ''}
                    animationClips={PULSE_BUDDY_DEMO_AVATAR.animationClips}
                    state={demoPreviewState}
                    chromaKeyConfig={PULSE_BUDDY_DEMO_AVATAR.chromaKeyConfig}
                    size={230}
                    className="filter drop-shadow-2xl"
                  />
                </div>

                {/* Quick State Toggle Selector for In-Card Preview */}
                <div className="w-full mt-4 flex items-center justify-center gap-1.5 flex-wrap">
                  {(['idle', 'happy', 'sad'] as AnimationState[]).map((st) => (
                    <button
                      key={st}
                      onClick={() => setDemoPreviewState(st)}
                      className={`px-3 py-1 text-[11px] font-bold rounded-xl transition uppercase tracking-wider ${
                        demoPreviewState === st
                          ? 'bg-sky-500 text-slate-950 shadow-md font-black'
                          : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                <div className="mt-3 text-[10px] text-slate-400 text-center font-mono">
                  Pure RGB(0, 255, 0) • 540×960 H.264 • Zero-Tolerance Keying
                </div>
              </div>

              {/* RIGHT: Test Demo Avatar Interactive Buttons Suite */}
              <div className="lg:col-span-7 flex flex-col gap-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <h4 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                    <Play size={18} className="text-sky-400" />
                    Test Demo Avatar (Interactive Suite)
                  </h4>
                  <span className="text-[11px] text-slate-400 font-semibold">
                    Instant Trigger (No Analytics Pollution)
                  </span>
                </div>

                {/* 6 Grid Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* 1. Preview Idle */}
                  <button
                    onClick={() => {
                      setDemoPreviewState('idle');
                      setActiveTestLabel('Preview Idle Animation Loop');
                    }}
                    className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 hover:border-sky-500/50 transition-all text-left group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <Eye size={18} />
                    </div>
                    <div>
                      <div className="text-xs font-black text-white group-hover:text-sky-300 transition">
                        1. Preview Idle
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                        Loops breathing, blinking, and friendly sway in the player.
                      </div>
                    </div>
                  </button>

                  {/* 2. Test Reminder Due */}
                  <button
                    onClick={() => {
                      setActiveTestLabel('Triggered Reminder Due Interactive State');
                      onTriggerTest(PULSE_BUDDY_DEMO_AVATAR.id, undefined, 'due', true);
                    }}
                    className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 hover:border-sky-500/50 transition-all text-left group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <Bell size={18} />
                    </div>
                    <div>
                      <div className="text-xs font-black text-white group-hover:text-blue-300 transition">
                        2. Test Reminder Due
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                        Pops up floating overlay in interactive mode with all buttons.
                      </div>
                    </div>
                  </button>

                  {/* 3. Test Done → Happy → Forward */}
                  <button
                    onClick={() => {
                      setActiveTestLabel('Triggered Done → Happy → Move Forward');
                      onTriggerTest(PULSE_BUDDY_DEMO_AVATAR.id, undefined, 'completed', true);
                    }}
                    className="flex items-start gap-3 p-3.5 rounded-2xl bg-emerald-950/40 hover:bg-emerald-950/70 border border-emerald-500/40 hover:border-emerald-400 transition-all text-left group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <Smile size={18} />
                    </div>
                    <div>
                      <div className="text-xs font-black text-emerald-300 group-hover:text-emerald-200 transition">
                        3. Test Done → Happy → Forward
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                        Confetti, celebration fanfare, raised bottle, and forward perspective scale.
                      </div>
                    </div>
                  </button>

                  {/* 4. Test Not Done → Sad → Backward */}
                  <button
                    onClick={() => {
                      setActiveTestLabel('Triggered Not Done → Sad → Move Backward');
                      onTriggerTest(PULSE_BUDDY_DEMO_AVATAR.id, undefined, 'not_done', true);
                    }}
                    className="flex items-start gap-3 p-3.5 rounded-2xl bg-rose-950/30 hover:bg-rose-950/60 border border-rose-500/40 hover:border-rose-400 transition-all text-left group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <Frown size={18} />
                    </div>
                    <div>
                      <div className="text-xs font-black text-rose-300 group-hover:text-rose-200 transition">
                        4. Test Not Done → Sad → Backward
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                        Sad audio tone, slump head, lowered bottle, and backward retreat.
                      </div>
                    </div>
                  </button>

                  {/* 5. Test Snooze */}
                  <button
                    onClick={() => {
                      setActiveTestLabel('Triggered Snooze Acknowledgment');
                      onTriggerTest(PULSE_BUDDY_DEMO_AVATAR.id, undefined, 'snoozed', true);
                    }}
                    className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 hover:border-sky-500/50 transition-all text-left group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <Clock size={18} />
                    </div>
                    <div>
                      <div className="text-xs font-black text-white group-hover:text-amber-300 transition">
                        5. Test Snooze
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                        Acknowledges 5 min snooze with neutral chime and smooth exit.
                      </div>
                    </div>
                  </button>

                  {/* 6. Test Dismiss */}
                  <button
                    onClick={() => {
                      setActiveTestLabel('Triggered Dismiss');
                      onTriggerTest(PULSE_BUDDY_DEMO_AVATAR.id, undefined, 'dismissed', true);
                    }}
                    className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 hover:border-sky-500/50 transition-all text-left group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-slate-700 text-slate-300 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <X size={18} />
                    </div>
                    <div>
                      <div className="text-xs font-black text-white group-hover:text-slate-200 transition">
                        6. Test Dismiss
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                        Polite goodbye speech bubble and slide down transition.
                      </div>
                    </div>
                  </button>
                </div>

                {/* 7 & 8: End-to-End Live Scheduler Test & Reset */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-950/60 to-indigo-950/60 border border-sky-500/40 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-sky-500 text-slate-950 flex items-center justify-center shrink-0 font-black text-sm shadow-md">
                      {schedulerCountdown !== null ? `${schedulerCountdown}s` : <Sparkles size={18} />}
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-black text-white">
                        End-to-End Live Scheduler Test
                      </div>
                      <div className="text-[11px] text-slate-300">
                        {schedulerCountdown !== null
                          ? `Countdown running: ${schedulerCountdown}s until in-browser background scheduler triggers!`
                          : 'Schedules a real 5-second countdown to verify autonomous reminder trigger.'}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleStart5sSchedulerTest}
                    disabled={schedulerCountdown !== null}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl font-black text-xs bg-sky-400 hover:bg-sky-300 disabled:bg-slate-700 text-slate-950 disabled:text-slate-400 transition shadow-md whitespace-nowrap"
                  >
                    {schedulerCountdown !== null ? `Triggering in ${schedulerCountdown}s...` : '⏱️ Start 5s Live Test'}
                  </button>
                </div>
              </div>
            </div>
          </div>
          {/* Categories filter bar */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'all', label: 'All Companions' },
              { id: 'animals', label: 'Animals' },
              { id: 'robots', label: 'Robots' },
              { id: 'humans', label: 'Humans' },
              { id: 'vehicles', label: 'Vehicles' },
              { id: 'fantasy', label: 'Fantasy' },
              { id: 'custom', label: 'Custom Uploads' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setGalleryFilter(f.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition ${
                  galleryFilter === f.id
                    ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-500 text-sky-600 dark:text-sky-400'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Avatar Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAvatars.map((avatar) => {
              const isDefault = avatar.id === defaultAvatarId;

              return (
                <div
                  key={avatar.id}
                  className={`flex flex-col justify-between p-6 bg-white dark:bg-slate-900 rounded-3xl border transition-all ${
                    isDefault
                      ? 'border-sky-500 ring-2 ring-sky-500/20 shadow-md'
                      : 'border-slate-200/90 dark:border-slate-800 shadow-sm'
                  }`}
                >
                  <div>
                    {/* Header: badges */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full">
                          {avatar.category}
                        </span>
                        {avatar.type === 'animated_svg' ? (
                          <span className="px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-full">
                            Full Animation Rig
                          </span>
                        ) : avatar.type === 'video' ? (
                          <span className="px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-full">
                            Chroma Video
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-full">
                            Image Physics
                          </span>
                        )}
                      </div>

                      {avatar.isCustom && (
                        <button
                          onClick={() => onDeleteAvatar(avatar.id)}
                          title="Delete custom avatar"
                          className="text-slate-400 hover:text-rose-500 transition"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>

                    {/* Avatar Preview Canvas/SVG */}
                    <div className="py-4 flex items-center justify-center">
                      <AvatarRenderer avatar={avatar} state={testState} size={160} />
                    </div>

                    <h3 className="text-lg font-black text-slate-900 dark:text-white text-center">
                      {avatar.name}
                    </h3>
                    <p className="text-xs text-slate-500 text-center mt-1">
                      {avatar.description}
                    </p>

                    {/* Supported animations info */}
                    <div className="mt-3 text-center">
                      <span className="text-[11px] text-slate-400 font-medium">
                        Supports: {avatar.supportedStates.slice(0, 5).join(', ')}...
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-5 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                    {isDefault ? (
                      <span className="flex-1 py-2 text-center text-xs font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 rounded-xl flex items-center justify-center gap-1.5">
                        <CheckCircle2 size={14} /> Active Companion
                      </span>
                    ) : (
                      <button
                        onClick={() => onSetDefaultAvatar(avatar.id)}
                        className="flex-1 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition"
                      >
                        Set as Default
                      </button>
                    )}

                    <button
                      onClick={() => onTriggerTest(avatar.id)}
                      title="Test in Reminder Window"
                      className="px-3 py-2 text-xs font-semibold text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 rounded-xl transition flex items-center gap-1"
                    >
                      <Play size={14} /> Test
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: CUSTOM AVATAR STUDIO (4-STEP GUIDED WORKFLOW)
          ========================================================================= */}
      {activeTab === 'studio' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 shadow-sm space-y-8">
          {/* Step Progress Tracker */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-5">
            {[
              { num: 1, title: 'Creation Mode' },
              { num: 2, title: 'Requirements' },
              { num: 3, title: 'AI Prompt Generator' },
              { num: 4, title: 'Chroma Preview & Import' },
            ].map((step) => (
              <div
                key={step.num}
                onClick={() => setStudioStep(step.num)}
                className={`flex items-center gap-2 cursor-pointer transition ${
                  studioStep === step.num
                    ? 'text-sky-600 dark:text-sky-400 font-bold'
                    : studioStep > step.num
                    ? 'text-emerald-600 font-semibold'
                    : 'text-slate-400 font-medium'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                    studioStep === step.num
                      ? 'bg-sky-600 text-white'
                      : studioStep > step.num
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  {step.num}
                </div>
                <span className="hidden md:inline text-xs">{step.title}</span>
              </div>
            ))}
          </div>

          {/* STEP 1: CHOOSE HOW TO CREATE AN AVATAR */}
          {studioStep === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  Step 1: Choose How to Create Your Avatar
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Select your companion creation method. We support still images, transparent media, green-screen video loops, and guided AI prompts.
                </p>
              </div>

              {/* Ready-to-Test Demo Quick Loader */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-sky-50 to-indigo-50 dark:from-sky-950/40 dark:to-indigo-950/40 border border-sky-200 dark:border-sky-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-500 text-white flex items-center justify-center shrink-0 shadow-md">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-slate-900 dark:text-white">
                      Want to inspect or customize without manual upload?
                    </h5>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      Load the pre-rendered Pulse Buddy demo companion directly into Step 4 to adjust chroma-key sliders and test transparent WebGL playback.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    handleLoadDemoAvatar();
                    setStudioStep(4);
                  }}
                  className="px-4 py-2.5 text-xs font-black bg-sky-600 hover:bg-sky-500 text-white rounded-xl transition shrink-0 shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Sparkles size={14} /> Load Demo into Editor
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    id: 'ai_prompt',
                    icon: Wand2,
                    title: 'Generate with AI Prompt (Recommended)',
                    desc: 'Build tailored, ready-to-copy prompts formatted for Google Flow, Runway, or Midjourney with uniform chroma-key green backdrops.',
                  },
                  {
                    id: 'video',
                    icon: Video,
                    title: 'Upload Green-Screen Avatar Video',
                    desc: 'Import MP4/WebM video with green background. Our real-time WebGL shader strips the background to render full skeletal animation!',
                  },
                  {
                    id: 'image',
                    icon: ImageIcon,
                    title: 'Upload Character Image',
                    desc: 'Import PNG, JPEG, or WebP. Applies tasteful entrance, idle float, celebration bounce, and emotion physics.',
                  },
                  {
                    id: 'transparent',
                    icon: Layers,
                    title: 'Upload Transparent Animated File',
                    desc: 'Import transparent WebM, animated GIF, or APNG companion with native alpha channel.',
                  },
                ].map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setCreationMethod(item.id as any);
                      setStudioStep(2);
                    }}
                    className={`p-6 rounded-3xl border cursor-pointer transition-all ${
                      creationMethod === item.id
                        ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-950/30 ring-2 ring-sky-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-3">
                      <item.icon size={20} />
                    </div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                      {item.title}
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: PRACTICAL REQUIREMENTS & GUIDELINES */}
          {studioStep === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  Step 2: Practical Requirements & Format Guidance
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Ensure your companion assets look crisp, transparent, and seamless on your desktop screen.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Image Guidelines */}
                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-200 dark:border-slate-700/60">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
                    <ImageIcon size={18} className="text-sky-500" />
                    For Still Image Avatars
                  </h4>
                  <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2 list-disc list-inside">
                    <li>Prefer high-resolution image with transparent background (PNG or WebP).</li>
                    <li>Keep the subject centered with full body visible inside the frame.</li>
                    <li>Avoid text, logos, watermarks, background furniture, or cut-off limbs.</li>
                    <li>Single still images use physics-based motion (bobbing, bounce, tilt) rather than full skeletal video rigging.</li>
                  </ul>
                </div>

                {/* Video & Chroma Guidelines */}
                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-200 dark:border-slate-700/60">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
                    <Video size={18} className="text-purple-500" />
                    For Video & Green-Screen Avatars
                  </h4>
                  <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2 list-disc list-inside">
                    <li>Use a solid, uniform <strong className="text-emerald-600 dark:text-emerald-400">RGB (0, 255, 0) #00FF00</strong> green screen background.</li>
                    <li>Ensure the character wears <strong className="text-rose-500">no green clothing</strong> to avoid unwanted transparency holes.</li>
                    <li>Keep lighting even and avoid dark shadows cast on the green background.</li>
                    <li>Duration: 3 to 6 seconds loop with stable camera and no zooming.</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4">
                <button
                  onClick={() => setStudioStep(1)}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  <ArrowLeft size={16} /> Back
                </button>
                <button
                  onClick={() => setStudioStep(creationMethod === 'ai_prompt' ? 3 : 4)}
                  className="flex items-center gap-1.5 px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-2xl shadow-sm transition active:scale-95"
                >
                  Continue <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: PERSONALIZED AI PROMPT GENERATOR */}
          {studioStep === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  Step 3: Personalized AI Prompt Generator
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Configure your character parameters. We tailor an exact solid RGB (0, 255, 0) chroma-key prompt ready to paste into Google Flow, Runway, or Midjourney.
                </p>
              </div>

              {/* Wizard Form Controls */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Character Type
                  </label>
                  <select
                    value={wizardInput.characterType}
                    onChange={(e) => setWizardInput({ ...wizardInput, characterType: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-medium"
                  >
                    <option value="animal">Animal (e.g. Penguin, Cat, Shiba Inu)</option>
                    <option value="human">Human Companion</option>
                    <option value="robot">Robot / Android</option>
                    <option value="vehicle">Vehicle / Rover</option>
                    <option value="fantasy">Fantasy Character (Dragon, Fairy)</option>
                    <option value="custom">Custom Character</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Visual Art Style
                  </label>
                  <select
                    value={wizardInput.visualStyle}
                    onChange={(e) => setWizardInput({ ...wizardInput, visualStyle: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-medium"
                  >
                    <option value="pixar-3d">Pixar/Disney 3D Animated Film</option>
                    <option value="anime-cel">Studio Ghibli Cel-Shaded Anime</option>
                    <option value="claymation">Tactile Claymation Stop-Motion</option>
                    <option value="cyberpunk-neon">Cyberpunk Neon Sci-Fi</option>
                    <option value="watercolor-storybook">Watercolor Children Storybook</option>
                    <option value="retro-pixel">16-Bit Retro Pixel Art</option>
                    <option value="hyper-real-stylized">Hyper-Real Stylized</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Personality
                  </label>
                  <select
                    value={wizardInput.personality}
                    onChange={(e) => setWizardInput({ ...wizardInput, personality: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-medium"
                  >
                    <option value="cheerful">Cheerful & Enthusiastic</option>
                    <option value="zen">Zen & Mindful</option>
                    <option value="energetic">High-Energy & Athletic</option>
                    <option value="scholarly">Scholarly & Intellectual</option>
                    <option value="cozy">Cozy & Calm</option>
                    <option value="quirky">Quirky & Playful</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Appearance & Clothing Details
                  </label>
                  <input
                    type="text"
                    value={wizardInput.appearanceDescription}
                    onChange={(e) => setWizardInput({ ...wizardInput, appearanceDescription: e.target.value })}
                    placeholder="e.g. Friendly red panda wearing cozy yellow knitted sweater and round glasses"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Target AI Tool
                  </label>
                  <select
                    value={wizardInput.targetTool}
                    onChange={(e) => setWizardInput({ ...wizardInput, targetTool: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-medium"
                  >
                    <option value="google-flow">Google Flow Video</option>
                    <option value="runway-gen">Runway Gen-3</option>
                    <option value="midjourney">Midjourney v6</option>
                    <option value="stable-diffusion">Stable Diffusion / FLUX</option>
                  </select>
                </div>
              </div>

              {/* Ready-To-Copy Generated Prompt Box */}
              <div className="p-5 bg-slate-900 text-slate-100 rounded-3xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                    <Sparkles size={14} /> Ready-To-Copy Green-Screen Prompt for Google Flow
                  </span>
                  <button
                    onClick={handleCopyPrompt}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl transition"
                  >
                    <Copy size={13} />
                    {copiedPrompt ? 'Copied to Clipboard! ✓' : 'Copy Prompt'}
                  </button>
                </div>

                <div className="p-4 bg-slate-950/80 rounded-2xl text-xs font-mono leading-relaxed max-h-48 overflow-y-auto text-slate-300 border border-slate-800">
                  {generatedPrompts.videoPrompt}
                </div>

                <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 pt-1">
                  <span>Aspect Ratio: 1:1 Square</span>
                  <span>Background: Solid RGB(0, 255, 0)</span>
                  <span>Frame Rate: 30 FPS</span>
                  <span>Duration: 4 seconds</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4">
                <button
                  onClick={() => setStudioStep(2)}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  <ArrowLeft size={16} /> Back
                </button>
                <button
                  onClick={() => setStudioStep(4)}
                  className="flex items-center gap-1.5 px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-2xl shadow-sm transition active:scale-95"
                >
                  Proceed to Import Asset <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: PREVIEW, CROP, AND CHROMA-KEY IMPORT */}
          {studioStep === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  Step 4: Preview, Chroma-Key Calibration, and Import
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Upload your avatar video or image, calibrate green-screen transparency in real time, and test your floating companion directly on the website.
                </p>
              </div>

              {/* Error and Warning Banners */}
              {uploadError && (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-2xl flex items-center justify-between gap-3 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={18} className="shrink-0 text-rose-500" />
                    <span>{uploadError}</span>
                  </div>
                  <button
                    onClick={() => setUploadError(null)}
                    className="text-rose-500 hover:text-rose-700 font-bold underline"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {uploadWarning && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900 rounded-2xl flex items-center gap-2 text-amber-700 dark:text-amber-300 text-xs font-medium">
                  <Info size={16} className="shrink-0 text-amber-500" />
                  <span>{uploadWarning}</span>
                </div>
              )}

              {/* Upload Drop Area */}
              {!uploadedFileUrl ? (
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-sky-500 rounded-3xl p-10 text-center space-y-3 cursor-pointer bg-slate-50/50 dark:bg-slate-800/30 transition">
                  <Upload size={36} className="mx-auto text-sky-500" />
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Choose an avatar video (MP4, WebM) or image (PNG, WebP, GIF)
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Supports alpha-channel WebM and green-screen chroma-key videos. Max 50MB.
                    </p>
                  </div>
                  <label className="inline-block px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-2xl cursor-pointer transition">
                    Browse File
                    <input
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime,image/png,image/webp,image/gif,image/jpeg"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  {/* Left Column: Live Transparency Checkerboard Preview */}
                  <div className="md:col-span-6 flex flex-col items-center justify-between p-6 bg-checkerboard rounded-3xl border border-slate-300 dark:border-slate-700 min-h-[360px] relative overflow-hidden">
                    {/* View Switcher: Keyed Transparent vs Raw Original */}
                    <div className="w-full flex items-center justify-between mb-4 z-10">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-3 py-1 rounded-full shadow-sm border border-slate-200/60 dark:border-slate-800">
                        {previewMode === 'keyed' ? 'Live Transparent Preview' : 'Raw Source Media'}
                      </span>

                      <div className="flex items-center gap-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-1 rounded-2xl border border-slate-200/60 dark:border-slate-800 text-[11px] font-bold">
                        <button
                          onClick={() => setPreviewMode('keyed')}
                          className={`px-2.5 py-1 rounded-xl transition ${
                            previewMode === 'keyed'
                              ? 'bg-sky-500 text-white shadow-sm'
                              : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          Transparent
                        </button>
                        <button
                          onClick={() => setPreviewMode('original')}
                          className={`px-2.5 py-1 rounded-xl transition ${
                            previewMode === 'original'
                              ? 'bg-sky-500 text-white shadow-sm'
                              : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          Raw Video
                        </button>
                      </div>
                    </div>

                    {/* Preview Viewport */}
                    <div className="my-auto py-4 flex items-center justify-center">
                      {previewMode === 'keyed' ? (
                        uploadedFileType === 'video' ? (
                          <VideoChromaKeyAvatar
                            videoSrc={uploadedFileUrl}
                            animationClips={extraClips}
                            state={testState}
                            chromaKeyConfig={chromaKeyConfig}
                            size={230}
                            className="filter drop-shadow-2xl"
                          />
                        ) : (
                          <AvatarRenderer
                            avatar={getDraftAvatar()}
                            state={testState}
                            size={230}
                            className="filter drop-shadow-2xl"
                          />
                        )
                      ) : (
                        uploadedFileType === 'video' ? (
                          <video
                            src={uploadedFileUrl}
                            controls
                            autoPlay
                            loop
                            muted
                            className="max-h-64 object-contain rounded-2xl drop-shadow-md"
                          />
                        ) : (
                          <img
                            src={uploadedFileUrl}
                            alt="Uploaded Media"
                            className="max-h-64 object-contain rounded-2xl drop-shadow-md"
                          />
                        )
                      )}
                    </div>

                    {/* Quick test animation state buttons */}
                    <div className="w-full flex flex-wrap items-center justify-center gap-1.5 pt-3 z-10">
                      {([
                        { state: 'idle', label: 'Idle' },
                        { state: 'celebrate', label: 'Done (Forward)' },
                        { state: 'sad', label: 'Not Done (Backward)' },
                        { state: 'enter', label: 'Enter' },
                      ] as const).map(({ state: st, label }) => (
                        <button
                          key={st}
                          onClick={() => setTestState(st as AnimationState)}
                          className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-lg border transition ${
                            testState === st
                              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-sm'
                              : 'bg-white/80 dark:bg-slate-900/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Right Column: Chroma-Key Calibration & Settings */}
                  <div className="md:col-span-6 space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Companion Name *
                      </label>
                      <input
                        type="text"
                        value={customAvatarName}
                        onChange={(e) => setCustomAvatarName(e.target.value)}
                        placeholder="e.g. Bolt the Robot, Aqua Buddy"
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Library Category
                      </label>
                      <select
                        value={customAvatarCategory}
                        onChange={(e) => setCustomAvatarCategory(e.target.value as any)}
                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-medium"
                      >
                        <option value="custom">Custom Avatar</option>
                        <option value="animals">Animals</option>
                        <option value="humans">Humans</option>
                        <option value="robots">Robots</option>
                        <option value="vehicles">Vehicles</option>
                        <option value="fantasy">Fantasy Characters</option>
                      </select>
                    </div>

                    {/* Chroma-Key Calibration Panel */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-3xl border border-slate-200 dark:border-slate-700/60 space-y-3.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                          <Sliders size={15} className="text-sky-500" /> Chroma-Key Green Background Removal
                        </span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={chromaKeyConfig.enabled}
                            onChange={(e) => setChromaKeyConfig({ ...chromaKeyConfig, enabled: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-600"></div>
                        </label>
                      </div>

                      {chromaKeyConfig.enabled && (
                        <div className="space-y-3 pt-1">
                          {/* Key Color Picker */}
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-slate-500">Key Color Target</span>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={chromaKeyConfig.keyColor}
                                onChange={(e) => setChromaKeyConfig({ ...chromaKeyConfig, keyColor: e.target.value })}
                                className="w-7 h-7 rounded-lg border border-slate-300 cursor-pointer overflow-hidden p-0"
                              />
                              <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 uppercase">
                                {chromaKeyConfig.keyColor}
                              </span>
                            </div>
                          </div>

                          {/* Similarity Slider */}
                          <div>
                            <div className="flex justify-between text-[11px] font-semibold text-slate-500 mb-1">
                              <span>Color Similarity Tolerance</span>
                              <span className="font-bold text-sky-600 dark:text-sky-400">
                                {Math.round(chromaKeyConfig.similarity * 100)}%
                              </span>
                            </div>
                            <input
                              type="range"
                              min="0.1"
                              max="0.85"
                              step="0.01"
                              value={chromaKeyConfig.similarity}
                              onChange={(e) => setChromaKeyConfig({ ...chromaKeyConfig, similarity: parseFloat(e.target.value) })}
                              className="w-full accent-sky-600"
                            />
                          </div>

                          {/* Edge Smoothness Slider */}
                          <div>
                            <div className="flex justify-between text-[11px] font-semibold text-slate-500 mb-1">
                              <span>Edge Softness & Smoothness</span>
                              <span className="font-bold text-sky-600 dark:text-sky-400">
                                {Math.round(chromaKeyConfig.smoothness * 100)}%
                              </span>
                            </div>
                            <input
                              type="range"
                              min="0.01"
                              max="0.4"
                              step="0.01"
                              value={chromaKeyConfig.smoothness}
                              onChange={(e) => setChromaKeyConfig({ ...chromaKeyConfig, smoothness: parseFloat(e.target.value) })}
                              className="w-full accent-sky-600"
                            />
                          </div>

                          {/* Spill Suppression Slider */}
                          <div>
                            <div className="flex justify-between text-[11px] font-semibold text-slate-500 mb-1">
                              <span>Green-Spill Suppression (Fringe Removal)</span>
                              <span className="font-bold text-sky-600 dark:text-sky-400">
                                {Math.round(chromaKeyConfig.spillSuppression * 100)}%
                              </span>
                            </div>
                            <input
                              type="range"
                              min="0.0"
                              max="1.0"
                              step="0.05"
                              value={chromaKeyConfig.spillSuppression}
                              onChange={(e) => setChromaKeyConfig({ ...chromaKeyConfig, spillSuppression: parseFloat(e.target.value) })}
                              className="w-full accent-sky-600"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Multi-State Animation Clips (Optional) */}
                    {uploadedFileType === 'video' && (
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-3xl border border-slate-200 dark:border-slate-700/60 space-y-3">
                        <button
                          type="button"
                          onClick={() => setShowMultiClipPanel(!showMultiClipPanel)}
                          className="w-full flex items-center justify-between text-left text-xs font-bold text-slate-800 dark:text-slate-100"
                        >
                          <span className="flex items-center gap-2">
                            <Layers size={15} className="text-teal-500" /> Multi-State Video Clips (Optional)
                          </span>
                          <span className="text-[11px] font-semibold text-sky-600 dark:text-sky-400">
                            {showMultiClipPanel ? 'Hide ▲' : 'Configure ▼'}
                          </span>
                        </button>

                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Pulse Buddy applies smooth 3D perspective translations and scaling automatically. You can also optionally supply dedicated clips for specific expressions.
                        </p>

                        {showMultiClipPanel && (
                          <div className="space-y-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                            {/* Happy / Celebrate / Forward clip */}
                            <div>
                              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                                <span>Done / Happy / Move Forward Clip</span>
                                {extraClips.celebrate && <span className="text-emerald-500 font-bold">Loaded ✓</span>}
                              </div>
                              <input
                                type="file"
                                accept="video/mp4,video/webm"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) handleExtraClipUpload('celebrate', f);
                                }}
                                className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-xl file:border-0 file:text-[11px] file:font-bold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100 cursor-pointer"
                              />
                            </div>

                            {/* Sad / Concerned / Backward clip */}
                            <div>
                              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                                <span>Not Done / Sad / Move Backward Clip</span>
                                {extraClips.sad && <span className="text-emerald-500 font-bold">Loaded ✓</span>}
                              </div>
                              <input
                                type="file"
                                accept="video/mp4,video/webm"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) handleExtraClipUpload('sad', f);
                                }}
                                className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-xl file:border-0 file:text-[11px] file:font-bold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100 cursor-pointer"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Live Test & Save Action Buttons */}
                    <div className="space-y-2 pt-2">
                      <button
                        onClick={() => onTriggerTest('draft', getDraftAvatar())}
                        className="w-full py-2.5 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 font-bold text-xs rounded-2xl border border-sky-200 dark:border-sky-800 transition flex items-center justify-center gap-2 active:scale-95"
                      >
                        <Play size={14} className="fill-current" />
                        Test Floating Avatar Reminder On Screen
                      </button>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {
                            setUploadedFileUrl(null);
                            setUploadError(null);
                            setUploadWarning(null);
                          }}
                          className="px-4 py-2.5 text-xs font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-2xl transition"
                        >
                          Discard
                        </button>
                        <button
                          onClick={handleSaveCustomAvatar}
                          className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl shadow-md shadow-emerald-600/20 transition active:scale-95 flex items-center justify-center gap-2"
                        >
                          <CheckCircle2 size={15} />
                          Save to Avatar Library
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setStudioStep(3)}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  <ArrowLeft size={16} /> Back to Prompt Wizard
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
