export interface PromptWizardInput {
  characterType: 'human' | 'animal' | 'robot' | 'vehicle' | 'fantasy' | 'custom';
  characterName?: string;
  appearanceDescription: string;
  clothingOrTexture: string;
  visualStyle: 'pixar-3d' | 'anime-cel' | 'claymation' | 'cyberpunk-neon' | 'watercolor-storybook' | 'retro-pixel' | 'hyper-real-stylized';
  personality: 'cheerful' | 'zen' | 'energetic' | 'scholarly' | 'cozy' | 'quirky';
  reminderCategory: string;
  targetAction: string;
  framing: 'full-body' | 'upper-body-centered';
  targetTool: 'google-flow' | 'runway-gen' | 'midjourney' | 'stable-diffusion';
}

export interface GeneratedPrompts {
  videoPrompt: string;
  imagePrompt: string;
  negativePrompt: string;
  recommendedSettings: {
    aspectRatio: string;
    fps: number;
    durationSeconds: number;
    backgroundHex: string;
  };
}

export function generateAvatarPrompts(input: PromptWizardInput): GeneratedPrompts {
  const styleDescriptions: Record<string, string> = {
    'pixar-3d': 'High-end 3D animated feature film style, subsurface scattering skin/materials, warm expressive lighting, Disney/Pixar character aesthetics',
    'anime-cel': 'Vibrant Japanese anime cel-shaded animation, crisp clean line art, expressive animated eyes, Studio Ghibli inspired warmth',
    'claymation': 'Stop-motion claymation aesthetic, tactile clay textures, subtle thumbprint details, delightful physical puppet charm',
    'cyberpunk-neon': 'Sleek futuristic cyberpunk stylized render, glowing neon accents, matte finish armor/fabric, high tech companion vibe',
    'watercolor-storybook': 'Delicate illustrated watercolor storybook art, soft pastel washes, whimsical hand-drawn contours',
    'retro-pixel': 'Premium 16-bit high-fidelity pixel art character, smooth 60fps sprite animation cycles, expressive pixel eyes',
    'hyper-real-stylized': 'Stylized semi-realistic character with expressive stylized proportions, photorealistic fabric and fur micro-detail',
  };

  const styleText = styleDescriptions[input.visualStyle] || styleDescriptions['pixar-3d'];

  const framingText =
    input.framing === 'full-body'
      ? 'Show exactly one full-body character, centered, with the head, hands, and both feet completely inside the frame.'
      : 'Show exactly one centered character from waist up, with hands and face completely inside the frame.';

  // Video prompt (specifically optimized for Google Flow and video generators)
  const videoPrompt = `Create a high-quality animated character for a personal desktop reminder companion.
Character: ${input.characterType.toUpperCase()} named "${input.characterName || 'Companion'}".
Appearance: ${input.appearanceDescription}. Clothing/Texture: ${input.clothingOrTexture}.
Personality & Emotion: ${input.personality}, warm, encouraging, and friendly.
Visual Art Style: ${styleText}.
${framingText}
Action & Animation: The character is performing an animation for a "${input.reminderCategory}" reminder: ${input.targetAction}. The animation must loop cleanly or enter from a calm idle, perform the action with lively expressive facial gestures and gestures towards the user, and transition back to a friendly welcoming idle.
Background & Chroma Key: Use a solid, perfectly uniform RGB (0, 255, 0) chroma-key green (#00FF00) background. Keep the character's face, body proportions, clothing, and accessories strictly consistent across all frames. Use smooth, natural movement, correct anatomy, stable object shapes, and realistic timing.
No environment, scenery, furniture, laptop, desk, floor shadow, text, logo, watermark, shadows on the green background, extra people, extra limbs, flicker, morphing, or camera movement. The entire background must remain uniform green in every frame.`;

  // Image prompt (for generating the base still reference or static image companion)
  const imagePrompt = `High quality character asset for desktop companion application.
Character: ${input.characterType}, ${input.appearanceDescription}, wearing ${input.clothingOrTexture}.
Expression: ${input.personality}, gentle smile, engaging eye contact with viewer.
Action Pose: ${input.targetAction}.
Art Style: ${styleText}.
${framingText}
Background: Solid chroma key screen RGB (0, 255, 0) #00FF00, studio light evenly diffused, zero cast shadows on backdrop, sharp silhouette edge separation.
Quality tags: 8k resolution, masterwork character design, pristine edge clarity, transparent sticker ready.`;

  const negativePrompt = `green clothing, green accessories matching key background, cropped head, cropped feet, cropped hands, out of frame, shadows on background, floor, background elements, furniture, wall, room, extra limbs, deformed fingers, blur, artifacts, text, signature, watermark, logo, camera pan, camera tilt, camera zoom, sudden lighting changes.`;

  return {
    videoPrompt,
    imagePrompt,
    negativePrompt,
    recommendedSettings: {
      aspectRatio: '1:1',
      fps: 30,
      durationSeconds: 4,
      backgroundHex: '#00FF00',
    },
  };
}
