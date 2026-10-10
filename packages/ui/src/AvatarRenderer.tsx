import React, { useEffect, useRef } from 'react';
import { Avatar, AnimationState, ChromaKeyConfig } from '@pulse-buddy/shared-types';
import { WebGLChromaKeyRenderer, applyChromaKeyToImageData } from '@pulse-buddy/avatar';

interface AvatarRendererProps {
  avatar: Avatar;
  state: AnimationState;
  className?: string;
  size?: number; // width/height in px
  showEffects?: boolean;
}

export const AvatarRenderer: React.FC<AvatarRendererProps> = ({
  avatar,
  state,
  className = '',
  size = 220,
  showEffects = true,
}) => {
  // If video avatar with chroma-key
  if (avatar.type === 'video' && avatar.sourceUrl) {
    return (
      <VideoChromaKeyAvatar
        videoSrc={avatar.sourceUrl}
        chromaKeyConfig={avatar.chromaKeyConfig}
        size={size}
        className={className}
      />
    );
  }

  // If custom static image avatar
  if (avatar.type === 'image' && avatar.sourceUrl) {
    return (
      <ImageAvatar
        imageSrc={avatar.sourceUrl}
        state={state}
        size={size}
        className={className}
      />
    );
  }

  // Built-in character rigs
  return (
    <div
      className={`relative inline-flex items-center justify-center select-none transition-transform duration-300 ${className}`}
      style={{ width: size, height: size }}
    >
      {renderBuiltinRig(avatar.id, state, size)}
    </div>
  );
};

function renderBuiltinRig(avatarId: string, state: AnimationState, size: number) {
  switch (avatarId) {
    case 'dr-robo':
      return <DrRoboRig state={state} size={size} />;
    case 'maya-yogi':
      return <MayaYogiRig state={state} size={size} />;
    case 'sparky-rover':
      return <SparkyRoverRig state={state} size={size} />;
    case 'ember-dragon':
      return <EmberDragonRig state={state} size={size} />;
    case 'cosmo-astronaut':
      return <CosmoAstronautRig state={state} size={size} />;
    case 'pip-penguin':
    default:
      return <PipPenguinRig state={state} size={size} />;
  }
}

/* =========================================================================
   1. PIP THE PENGUIN RIG
   ========================================================================= */
const PipPenguinRig: React.FC<{ state: AnimationState; size: number }> = ({ state, size }) => {
  const isCelebrating = state === 'celebrate';
  const isConcerned = state === 'concerned';
  const isAcknowledge = state === 'acknowledge';
  const isEnter = state === 'enter';

  const bounceClass = isCelebrating
    ? 'animate-bounce'
    : isEnter
    ? 'animate-pulse'
    : '';

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={`drop-shadow-lg ${bounceClass}`}
      style={{
        transform: isConcerned
          ? 'rotate(-6deg)'
          : isAcknowledge
          ? 'scale(1.05)'
          : 'scale(1)',
        transition: 'transform 0.3s ease-in-out',
      }}
    >
      {/* Shadows */}
      <ellipse cx="100" cy="185" rx="55" ry="10" fill="rgba(0,0,0,0.15)" />

      {/* Feet */}
      <ellipse cx="75" cy="180" rx="16" ry="8" fill="#f97316" />
      <ellipse cx="125" cy="180" rx="16" ry="8" fill="#f97316" />

      {/* Main Body */}
      <ellipse cx="100" cy="115" rx="60" ry="70" fill="#1e293b" />

      {/* White Belly */}
      <ellipse cx="100" cy="125" rx="42" ry="52" fill="#f8fafc" />

      {/* Cyan Scarf */}
      <path
        d="M60 100 Q100 120 140 100 Q100 85 60 100 Z"
        fill="#06b6d4"
      />
      <rect x="115" y="100" width="16" height="30" rx="4" fill="#0891b2" />

      {/* Flippers */}
      {isCelebrating ? (
        <>
          {/* Arms raised celebrating */}
          <path d="M42 110 Q20 70 30 55 Q48 75 52 105 Z" fill="#1e293b" />
          <path d="M158 110 Q180 70 170 55 Q152 75 148 105 Z" fill="#1e293b" />
        </>
      ) : isAcknowledge ? (
        <>
          {/* Right wing waving */}
          <path d="M45 115 Q30 140 40 155 Z" fill="#1e293b" />
          <path d="M155 110 Q185 85 180 70 Q160 85 150 115 Z" fill="#1e293b" />
        </>
      ) : (
        <>
          {/* Normal resting flippers */}
          <path d="M48 110 Q32 140 40 160 Q52 145 54 115 Z" fill="#1e293b" />
          <path d="M152 110 Q168 140 160 160 Q148 145 146 115 Z" fill="#1e293b" />
        </>
      )}

      {/* Face & Eyes */}
      {isCelebrating ? (
        // Happy arch eyes
        <>
          <path d="M78 78 Q86 68 94 78" stroke="#0f172a" strokeWidth="4" strokeLinecap="round" fill="none" />
          <path d="M106 78 Q114 68 122 78" stroke="#0f172a" strokeWidth="4" strokeLinecap="round" fill="none" />
        </>
      ) : isConcerned ? (
        // Concerned wide eyes
        <>
          <circle cx="86" cy="74" r="6" fill="#0f172a" />
          <circle cx="114" cy="74" r="6" fill="#0f172a" />
          <path d="M76 65 Q86 70 94 66" stroke="#475569" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M106 66 Q114 70 124 65" stroke="#475569" strokeWidth="3" strokeLinecap="round" fill="none" />
        </>
      ) : (
        // Bright open eyes with specular highlight
        <>
          <ellipse cx="86" cy="75" rx="7" ry="8" fill="#0f172a" />
          <circle cx="84" cy="72" r="2.5" fill="#ffffff" />
          <ellipse cx="114" cy="75" rx="7" ry="8" fill="#0f172a" />
          <circle cx="112" cy="72" r="2.5" fill="#ffffff" />
        </>
      )}

      {/* Cute Blush */}
      <circle cx="70" cy="85" r="7" fill="#fb7185" opacity="0.6" />
      <circle cx="130" cy="85" r="7" fill="#fb7185" opacity="0.6" />

      {/* Orange Beak */}
      <path d="M90 83 Q100 81 110 83 Q100 98 90 83 Z" fill="#f97316" />

      {/* Celebration sparkles if celebrating */}
      {isCelebrating && (
        <g className="animate-spin" style={{ transformOrigin: '100px 100px' }}>
          <polygon points="30,40 33,48 41,51 33,54 30,62 27,54 19,51 27,48" fill="#eab308" />
          <polygon points="170,40 173,48 181,51 173,54 170,62 167,54 159,51 167,48" fill="#eab308" />
          <polygon points="100,20 102,26 108,28 102,30 100,36 98,30 92,28 98,26" fill="#38bdf8" />
        </g>
      )}
    </svg>
  );
};

/* =========================================================================
   2. DR. ROBO CARETAKER RIG
   ========================================================================= */
const DrRoboRig: React.FC<{ state: AnimationState; size: number }> = ({ state, size }) => {
  const isCelebrating = state === 'celebrate';
  const isConcerned = state === 'concerned';
  const isThinking = state === 'thinking';

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={`drop-shadow-lg ${isCelebrating ? 'animate-bounce' : ''}`}
    >
      {/* Floating Hover Shadow */}
      <ellipse cx="100" cy="182" rx="40" ry="8" fill="rgba(0,0,0,0.18)" />

      {/* Thruster Glow */}
      <path d="M85 160 Q100 185 115 160 Z" fill="#38bdf8" opacity="0.8" />
      <path d="M92 160 Q100 178 108 160 Z" fill="#ffffff" />

      {/* Main Body Sphere */}
      <circle cx="100" cy="110" r="52" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="3" />

      {/* Heart monitor chest line */}
      <rect x="75" y="130" width="50" height="18" rx="6" fill="#0f172a" />
      <path
        d="M80 139 L88 139 L92 133 L96 145 L100 136 L104 139 L120 139"
        fill="none"
        stroke={isCelebrating ? '#22c55e' : '#38bdf8'}
        strokeWidth="2.5"
      />

      {/* Floating Ear Pods */}
      <circle cx="40" cy="98" r="12" fill="#0284c7" />
      <circle cx="160" cy="98" r="12" fill="#0284c7" />

      {/* Antenna */}
      <line x1="100" y1="58" x2="100" y2="35" stroke="#94a3b8" strokeWidth="4" />
      <circle cx="100" cy="30" r="8" fill={isCelebrating ? '#eab308' : '#38bdf8'} />

      {/* Visor Display */}
      <rect x="62" y="72" width="76" height="42" rx="14" fill="#0f172a" />

      {/* LED Eyes */}
      {isCelebrating ? (
        // Glowing star / happy eyes
        <>
          <path d="M74 92 Q82 82 90 92" stroke="#22c55e" strokeWidth="4" strokeLinecap="round" fill="none" />
          <path d="M110 92 Q118 82 126 92" stroke="#22c55e" strokeWidth="4" strokeLinecap="round" fill="none" />
        </>
      ) : isConcerned ? (
        // Alert Amber eyes
        <>
          <circle cx="82" cy="93" r="5" fill="#f59e0b" />
          <circle cx="118" cy="93" r="5" fill="#f59e0b" />
        </>
      ) : isThinking ? (
        // Thinking pulse scanner
        <>
          <rect x="75" y="90" width="50" height="6" rx="3" fill="#38bdf8" />
        </>
      ) : (
        // Cheerful blue LEDs
        <>
          <circle cx="82" cy="92" r="6" fill="#38bdf8" />
          <circle cx="118" cy="92" r="6" fill="#38bdf8" />
        </>
      )}
    </svg>
  );
};

/* =========================================================================
   3. MAYA THE MINDFUL YOGI RIG
   ========================================================================= */
const MayaYogiRig: React.FC<{ state: AnimationState; size: number }> = ({ state, size }) => {
  const isCelebrating = state === 'celebrate';
  const isConcerned = state === 'concerned';

  return (
    <svg viewBox="0 0 200 200" width={size} height={size} className="drop-shadow-lg">
      <ellipse cx="100" cy="180" rx="45" ry="8" fill="rgba(0,0,0,0.12)" />

      {/* Hair bun */}
      <circle cx="100" cy="42" r="16" fill="#451a03" />

      {/* Human Torso in Teal Athleisure */}
      <path d="M70 115 L130 115 L122 170 L78 170 Z" fill="#0d9488" />

      {/* Human Neck & Head */}
      <rect x="94" y="90" width="12" height="15" fill="#fcd34d" />
      <ellipse cx="100" cy="74" rx="26" ry="28" fill="#fcd34d" />

      {/* Hair Front */}
      <path d="M74 65 Q100 48 126 65 Q120 54 100 50 Q80 54 74 65 Z" fill="#451a03" />

      {/* Arms */}
      {isCelebrating ? (
        // Victory V-pose arms
        <>
          <path d="M70 120 L40 70" stroke="#fcd34d" strokeWidth="12" strokeLinecap="round" />
          <path d="M130 120 L160 70" stroke="#fcd34d" strokeWidth="12" strokeLinecap="round" />
        </>
      ) : (
        // Resting mindful arms / prayer gesture
        <>
          <path d="M70 120 Q85 145 100 135" stroke="#fcd34d" strokeWidth="10" strokeLinecap="round" fill="none" />
          <path d="M130 120 Q115 145 100 135" stroke="#fcd34d" strokeWidth="10" strokeLinecap="round" fill="none" />
        </>
      )}

      {/* Eyes & Smile */}
      {isConcerned ? (
        <>
          <circle cx="90" cy="74" r="3" fill="#1e293b" />
          <circle cx="110" cy="74" r="3" fill="#1e293b" />
          <path d="M94 85 Q100 82 106 85" stroke="#1e293b" strokeWidth="2" strokeLinecap="round" fill="none" />
        </>
      ) : (
        // Serene peaceful closed eyes & smile
        <>
          <path d="M85 74 Q90 79 95 74" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M105 74 Q110 79 115 74" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M92 84 Q100 90 108 84" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        </>
      )}

      {/* Calming glow ring */}
      <circle cx="100" cy="100" r="85" fill="none" stroke="#2dd4bf" strokeWidth="2" strokeDasharray="6 8" opacity="0.4" />
    </svg>
  );
};

/* =========================================================================
   4. SPARKY ROCKET ROVER RIG
   ========================================================================= */
const SparkyRoverRig: React.FC<{ state: AnimationState; size: number }> = ({ state, size }) => {
  const isCelebrating = state === 'celebrate';

  return (
    <svg viewBox="0 0 200 200" width={size} height={size} className={`drop-shadow-lg ${isCelebrating ? 'animate-bounce' : ''}`}>
      <ellipse cx="100" cy="180" rx="60" ry="10" fill="rgba(0,0,0,0.18)" />

      {/* Rover Chassis */}
      <rect x="50" y="95" width="100" height="45" rx="14" fill="#ef4444" stroke="#b91c1c" strokeWidth="3" />

      {/* Cabin Dome Glass */}
      <path d="M70 95 Q100 55 130 95 Z" fill="#67e8f9" opacity="0.8" stroke="#0891b2" strokeWidth="2" />

      {/* Wheels */}
      <circle cx="65" cy="150" r="18" fill="#1e293b" stroke="#64748b" strokeWidth="6" />
      <circle cx="135" cy="150" r="18" fill="#1e293b" stroke="#64748b" strokeWidth="6" />

      {/* Headlights */}
      <circle cx="146" cy="115" r="7" fill="#fef08a" />

      {/* Rocket Flame if Celebrating */}
      {isCelebrating ? (
        <path d="M50 115 Q20 115 10 115 Q30 105 45 110 Z" fill="#f97316" />
      ) : (
        <line x1="75" y1="65" x2="75" y2="45" stroke="#94a3b8" strokeWidth="3" />
      )}
      <circle cx="75" cy="42" r="5" fill="#f59e0b" />
    </svg>
  );
};

/* =========================================================================
   5. EMBER THE COZY DRAGON RIG
   ========================================================================= */
const EmberDragonRig: React.FC<{ state: AnimationState; size: number }> = ({ state, size }) => {
  const isCelebrating = state === 'celebrate';

  return (
    <svg viewBox="0 0 200 200" width={size} height={size} className="drop-shadow-lg">
      <ellipse cx="100" cy="180" rx="50" ry="9" fill="rgba(0,0,0,0.15)" />

      {/* Dragon Wings */}
      <path d="M60 110 Q20 70 50 50 Q65 75 70 105 Z" fill="#9333ea" />
      <path d="M140 110 Q180 70 150 50 Q135 75 130 105 Z" fill="#9333ea" />

      {/* Main Body */}
      <ellipse cx="100" cy="120" rx="46" ry="52" fill="#a855f7" />

      {/* Golden Horns */}
      <path d="M78 68 Q70 45 80 40 Q86 55 86 68 Z" fill="#eab308" />
      <path d="M122 68 Q130 45 120 40 Q114 55 114 68 Z" fill="#eab308" />

      {/* Head */}
      <circle cx="100" cy="85" r="32" fill="#c084fc" />

      {/* Snout */}
      <ellipse cx="100" cy="98" rx="18" ry="12" fill="#e9d5ff" />
      <circle cx="94" cy="96" r="2" fill="#6b21a8" />
      <circle cx="106" cy="96" r="2" fill="#6b21a8" />

      {/* Eyes */}
      <ellipse cx="88" cy="80" rx="6" ry="7" fill="#581c87" />
      <circle cx="86" cy="78" r="2" fill="#ffffff" />
      <ellipse cx="112" cy="80" rx="6" ry="7" fill="#581c87" />
      <circle cx="110" cy="78" r="2" fill="#ffffff" />

      {/* Sparkles / Fire Puff */}
      {isCelebrating && (
        <circle cx="100" cy="70" r="8" fill="#facc15" className="animate-ping" opacity="0.8" />
      )}
    </svg>
  );
};

/* =========================================================================
   6. COSMO ASTRONAUT RIG
   ========================================================================= */
const CosmoAstronautRig: React.FC<{ state: AnimationState; size: number }> = ({ state, size }) => {
  const isCelebrating = state === 'celebrate';

  return (
    <svg viewBox="0 0 200 200" width={size} height={size} className="drop-shadow-lg">
      <ellipse cx="100" cy="180" rx="40" ry="8" fill="rgba(0,0,0,0.14)" />

      {/* Spacesuit Body */}
      <rect x="70" y="105" width="60" height="60" rx="20" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="3" />

      {/* Helmet */}
      <circle cx="100" cy="75" r="38" fill="#f8fafc" stroke="#94a3b8" strokeWidth="3" />

      {/* Gold Reflective Visor */}
      <ellipse cx="100" cy="75" rx="26" ry="20" fill="#f59e0b" stroke="#d97706" strokeWidth="2" />
      <path d="M85 68 Q100 62 115 68" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.8" />

      {/* Oxygen Chest Controls */}
      <rect x="85" y="120" width="30" height="20" rx="4" fill="#3b82f6" />
      <circle cx="93" cy="130" r="3" fill="#22c55e" />
      <circle cx="107" cy="130" r="3" fill="#ef4444" />

      {/* Thumbs up gloved arm */}
      {isCelebrating ? (
        <path d="M130 115 L155 90 L160 80" stroke="#f1f5f9" strokeWidth="12" strokeLinecap="round" />
      ) : (
        <path d="M130 120 L150 140" stroke="#f1f5f9" strokeWidth="10" strokeLinecap="round" />
      )}
    </svg>
  );
};

/* =========================================================================
   7. CUSTOM IMAGE AVATAR
   ========================================================================= */
const ImageAvatar: React.FC<{
  imageSrc: string;
  state: AnimationState;
  size: number;
  className?: string;
}> = ({ imageSrc, state, size, className = '' }) => {
  let motionStyle = 'translate-y-0';
  if (state === 'celebrate') motionStyle = 'animate-bounce';
  if (state === 'concerned') motionStyle = 'rotate-3 scale-95';
  if (state === 'enter') motionStyle = 'scale-105';

  return (
    <div
      className={`relative flex items-center justify-center transition-all duration-300 ${motionStyle} ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src={imageSrc}
        alt="Custom Avatar"
        className="max-w-full max-h-full object-contain filter drop-shadow-md select-none"
      />
    </div>
  );
};

/* =========================================================================
   8. VIDEO CHROMA-KEY AVATAR (WEBGL RENDERER)
   ========================================================================= */
const VideoChromaKeyAvatar: React.FC<{
  videoSrc: string;
  chromaKeyConfig?: ChromaKeyConfig;
  size: number;
  className?: string;
}> = ({ videoSrc, chromaKeyConfig, size, className = '' }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<WebGLChromaKeyRenderer | null>(null);

  const defaultConfig: ChromaKeyConfig = {
    enabled: true,
    keyColor: '#00FF00',
    similarity: 0.35,
    smoothness: 0.1,
    spillSuppression: 0.45,
    ...chromaKeyConfig,
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      rendererRef.current = new WebGLChromaKeyRenderer(canvas);
    } catch {
      // WebGL not supported, fallback handled
    }

    return () => {
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    let animId: number;

    const renderLoop = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && !video.paused && !video.ended) {
        if (rendererRef.current) {
          rendererRef.current.render(video, defaultConfig);
        } else {
          // 2D canvas fallback
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            if (defaultConfig.enabled) {
              const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              applyChromaKeyToImageData(imgData, defaultConfig);
              ctx.putImageData(imgData, 0, 0);
            }
          }
        }
      }
      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, [defaultConfig]);

  return (
    <div
      className={`relative inline-block ${className}`}
      style={{ width: size, height: size }}
    >
      <video
        ref={videoRef}
        src={videoSrc}
        autoPlay
        loop
        muted
        playsInline
        crossOrigin="anonymous"
        className="hidden"
      />
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="w-full h-full object-contain pointer-events-none drop-shadow-lg"
      />
    </div>
  );
};
