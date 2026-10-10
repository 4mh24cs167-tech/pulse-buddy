import React, { useState } from 'react';
import { Avatar, AnimationState, ChromaKeyConfig, AvatarCategory } from '@pulse-buddy/shared-types';
import { AvatarRenderer, soundEngine } from '@pulse-buddy/ui';
import { generateAvatarPrompts, PromptWizardInput } from '@pulse-buddy/avatar';
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
} from 'lucide-react';

interface AvatarStudioViewProps {
  avatars: Avatar[];
  defaultAvatarId: string;
  onSetDefaultAvatar: (id: string) => void;
  onSaveAvatar: (avatar: Avatar) => void;
  onDeleteAvatar: (id: string) => void;
  onTriggerTest: (avatarId: string) => void;
}

export const AvatarStudioView: React.FC<AvatarStudioViewProps> = ({
  avatars,
  defaultAvatarId,
  onSetDefaultAvatar,
  onSaveAvatar,
  onDeleteAvatar,
  onTriggerTest,
}) => {
  const [activeTab, setActiveTab] = useState<'gallery' | 'studio'>('gallery');
  const [galleryFilter, setGalleryFilter] = useState<string>('all');
  const [testState, setTestState] = useState<AnimationState>('idle');
  const [copiedPrompt, setCopiedPrompt] = useState(false);

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

    const isVid = file.type.startsWith('video/');
    setUploadedFileType(isVid ? 'video' : 'image');

    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedFileUrl(event.target?.result as string);
      setStudioStep(4); // Advance to preview and chroma key adjustment
    };
    reader.readAsDataURL(file);
  };

  const handleSaveCustomAvatar = () => {
    if (!uploadedFileUrl) return;

    const newAvatar: Avatar = {
      id: `avatar-${Date.now()}`,
      name: customAvatarName.trim() || 'Custom Buddy',
      description: `User custom ${uploadedFileType} companion`,
      type: uploadedFileType,
      category: customAvatarCategory,
      supportedStates: ['idle', 'enter', 'happy', 'concerned', 'acknowledge', 'celebrate', 'exit'],
      previewUrl: uploadedFileUrl,
      sourceUrl: uploadedFileUrl,
      chromaKeyConfig: uploadedFileType === 'video' ? chromaKeyConfig : undefined,
      isCustom: true,
      createdAt: new Date().toISOString(),
    };

    onSaveAvatar(newAvatar);
    setActiveTab('gallery');
    setStudioStep(1);
    setUploadedFileUrl(null);
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
                  Step 4: Preview, Chroma-Key Adjustment, and Import
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Upload your generated image or green-screen video file, calibrate color distance and edge smoothness, and save to your companion library.
                </p>
              </div>

              {/* Upload Drop Area */}
              {!uploadedFileUrl ? (
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-sky-500 rounded-3xl p-10 text-center space-y-3 cursor-pointer bg-slate-50/50 dark:bg-slate-800/30 transition">
                  <Upload size={36} className="mx-auto text-sky-500" />
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Choose an image (PNG, JPG, WebP) or video (MP4, WebM)
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Max file size: 25MB. Processed safely in your local browser/desktop sandbox.
                    </p>
                  </div>
                  <label className="inline-block px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-2xl cursor-pointer transition">
                    Browse File
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  {/* Left Column: Transparency Checkerboard Preview Box */}
                  <div className="md:col-span-6 flex flex-col items-center justify-center p-6 bg-checkerboard rounded-3xl border border-slate-300 dark:border-slate-700 min-h-[300px]">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-white/80 dark:bg-slate-900/80 px-2 py-0.5 rounded-md mb-3">
                      Live Transparency Checkerboard Preview
                    </span>

                    {uploadedFileType === 'video' ? (
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
                        alt="Uploaded Avatar"
                        className="max-h-64 object-contain rounded-2xl drop-shadow-md"
                      />
                    )}
                  </div>

                  {/* Right Column: Chroma-Key Sliders & Naming */}
                  <div className="md:col-span-6 space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Companion Name *
                      </label>
                      <input
                        type="text"
                        value={customAvatarName}
                        onChange={(e) => setCustomAvatarName(e.target.value)}
                        placeholder="e.g. Zen Master Tanuki"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Library Category
                      </label>
                      <select
                        value={customAvatarCategory}
                        onChange={(e) => setCustomAvatarCategory(e.target.value as any)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs"
                      >
                        <option value="animals">Animals</option>
                        <option value="humans">Humans</option>
                        <option value="robots">Robots</option>
                        <option value="vehicles">Vehicles</option>
                        <option value="fantasy">Fantasy Characters</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>

                    {/* Chroma-Key Settings (for Green Screen) */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                          <Sliders size={14} className="text-sky-500" /> Chroma-Key Green Removal
                        </span>
                        <input
                          type="checkbox"
                          checked={chromaKeyConfig.enabled}
                          onChange={(e) => setChromaKeyConfig({ ...chromaKeyConfig, enabled: e.target.checked })}
                          className="rounded text-sky-600"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                          <span>Similarity Tolerance</span>
                          <span>{Math.round(chromaKeyConfig.similarity * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0.1"
                          max="0.8"
                          step="0.01"
                          value={chromaKeyConfig.similarity}
                          onChange={(e) => setChromaKeyConfig({ ...chromaKeyConfig, similarity: parseFloat(e.target.value) })}
                          className="w-full"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                          <span>Edge Smoothness</span>
                          <span>{Math.round(chromaKeyConfig.smoothness * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0.01"
                          max="0.4"
                          step="0.01"
                          value={chromaKeyConfig.smoothness}
                          onChange={(e) => setChromaKeyConfig({ ...chromaKeyConfig, smoothness: parseFloat(e.target.value) })}
                          className="w-full"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                          <span>Green-Spill Suppression</span>
                          <span>{Math.round(chromaKeyConfig.spillSuppression * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0.0"
                          max="1.0"
                          step="0.05"
                          value={chromaKeyConfig.spillSuppression}
                          onChange={(e) => setChromaKeyConfig({ ...chromaKeyConfig, spillSuppression: parseFloat(e.target.value) })}
                          className="w-full"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <button
                        onClick={() => setUploadedFileUrl(null)}
                        className="px-4 py-2 text-xs font-semibold text-rose-500 hover:bg-rose-50 rounded-xl"
                      >
                        Discard
                      </button>
                      <button
                        onClick={handleSaveCustomAvatar}
                        className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl shadow-sm transition active:scale-95"
                      >
                        Save to Avatar Library ✓
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-4">
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
