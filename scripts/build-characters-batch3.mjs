import fs from 'fs';
import path from 'path';
import { generateFrameSvg, AVATARS_DIR } from './svg-frame-template.mjs';

/* ==========================================================================
   5. SLEEPY DRAGON (character_05_sleepy_dragon.svg)
   Comedic situation: Nodding off to sleep in a nightcap, snoring softly,
   when suddenly he sneezes a tiny blast of flame that startles him awake!
   ========================================================================== */
function buildSleepyDragon() {
  const customDefs = `
    <radialGradient id="dragonCaveBg" cx="50%" cy="45%" r="70%">
      <stop offset="0%" stop-color="#581c87" />
      <stop offset="55%" stop-color="#2e1065" />
      <stop offset="100%" stop-color="#0f051d" />
    </radialGradient>
    <linearGradient id="dragonScales" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#c084fc" />
      <stop offset="40%" stop-color="#a855f7" />
      <stop offset="100%" stop-color="#7e22ce" />
    </linearGradient>
    <linearGradient id="dragonBelly" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#67e8f9" />
      <stop offset="100%" stop-color="#06b6d4" />
    </linearGradient>
    <linearGradient id="flameGrad" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#ef4444" />
      <stop offset="50%" stop-color="#f97316" />
      <stop offset="100%" stop-color="#fde047" />
    </linearGradient>
  `;

  const inner = `
    <style>
      @keyframes dragonNodAndSneeze {
        0%, 35% { transform: rotate(0deg) translateY(0); }
        45% { transform: rotate(10deg) translateY(14px); } /* Droop asleep */
        60% { transform: rotate(14deg) translateY(18px); }
        66% { transform: rotate(-12deg) translateY(-8px) scale(1.08); } /* Sudden Sneeze! */
        72% { transform: rotate(-4deg) translateY(-2px); }
        85%, 100% { transform: rotate(0deg) translateY(0); }
      }
      @keyframes flameBurst {
        0%, 64% { transform: scale(0); opacity: 0; }
        66% { transform: scale(1.3); opacity: 1; }
        72% { transform: scale(0.6) translate(40px, -20px); opacity: 0; }
        100% { transform: scale(0); opacity: 0; }
      }
      @keyframes pomPomSway {
        0%, 100% { transform: rotate(0deg); }
        50% { transform: rotate(-24deg); }
      }
      @keyframes bellyBreathe {
        0%, 100% { transform: scale(1, 1); }
        50% { transform: scale(1.04, 1.02); }
      }
      @keyframes zzzFloatAnim {
        0% { transform: translate(0, 0) scale(0.5); opacity: 0; }
        40% { opacity: 0.8; }
        64% { opacity: 0.8; }
        66% { opacity: 0; } /* Poofed by sneeze! */
        100% { transform: translate(40px, -60px) scale(1.2); opacity: 0; }
      }
      .dragon-head-group { transform-origin: 256px 260px; animation: dragonNodAndSneeze 4.5s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite; }
      .flame-sneeze { transform-origin: 310px 245px; animation: flameBurst 4.5s ease-out infinite; }
      .pompom-anim { transform-origin: 200px 85px; animation: pomPomSway 2.2s ease-in-out infinite; }
      .belly-breathe { transform-origin: 256px 360px; animation: bellyBreathe 3s ease-in-out infinite; }
      .zzz-text { animation: zzzFloatAnim 4.5s ease-out infinite; }
    </style>

    <!-- BACKGROUND -->
    <g id="background">
      <rect x="44" y="44" width="424" height="424" fill="url(#dragonCaveBg)" />
      <!-- Starry cave crystals -->
      <polygon points="120,100 126,115 140,120 126,125 120,140 114,125 100,120 114,115" fill="#e9d5ff" opacity="0.4" />
      <polygon points="400,160 405,172 418,176 405,180 400,192 395,180 382,176 395,172" fill="#e9d5ff" opacity="0.3" />
      
      <!-- Cartoon Zzz Floating -->
      <text x="320" y="160" font-family="Arial, sans-serif" font-weight="900" font-size="28" fill="#facc15" class="zzz-text">Z z z</text>
    </g>

    <!-- CHARACTER SHADOW -->
    <g id="character-shadow">
      <ellipse cx="256" cy="435" rx="95" ry="22" fill="#000" opacity="0.5" />
    </g>

    <!-- DRAGON BODY -->
    <g id="character-body" class="belly-breathe">
      <!-- Stubby Dragon Tail curled to side -->
      <path d="M190 380 C130 395 110 350 95 320 C105 320 130 350 170 365 Z" fill="url(#dragonScales)" stroke="#0f172a" stroke-width="4" />
      <!-- Tail spade/heart -->
      <path d="M95 320 L75 300 L105 295 Z" fill="#06b6d4" stroke="#0f172a" stroke-width="3" />

      <!-- Cute Tiny Dragon Wings -->
      <path d="M175 260 C130 230 110 170 145 155 C160 195 175 230 195 255 Z" fill="#06b6d4" stroke="#0f172a" stroke-width="3.5" />
      <path d="M337 260 C382 230 402 170 367 155 C352 195 337 230 317 255 Z" fill="#06b6d4" stroke="#0f172a" stroke-width="3.5" />

      <!-- Chubby Round Body -->
      <ellipse cx="256" cy="335" rx="76" ry="72" fill="url(#dragonScales)" stroke="#0f172a" stroke-width="4.5" />

      <!-- Soft Teal Belly Plates -->
      <ellipse cx="256" cy="348" rx="46" ry="52" fill="url(#dragonBelly)" stroke="#0f172a" stroke-width="3.5" />
      <path d="M225 330 Q256 340 287 330" stroke="#0891b2" stroke-width="3" fill="none" />
      <path d="M220 360 Q256 370 292 360" stroke="#0891b2" stroke-width="3" fill="none" />

      <!-- Claws / Feet -->
      <ellipse cx="210" cy="405" rx="22" ry="14" fill="url(#dragonScales)" stroke="#0f172a" stroke-width="3.5" />
      <ellipse cx="302" cy="405" rx="22" ry="14" fill="url(#dragonScales)" stroke="#0f172a" stroke-width="3.5" />
    </g>

    <!-- HEAD & NIGHTCAP (ANIMATED NOD & SNEEZE) -->
    <g id="character-head" class="dragon-head-group">
      <!-- Head Base -->
      <ellipse cx="256" cy="210" rx="66" ry="58" fill="url(#dragonScales)" stroke="#0f172a" stroke-width="4.5" />
      <!-- Chubby Cheeks -->
      <circle cx="210" cy="235" r="16" fill="#f472b6" opacity="0.4" />
      <circle cx="302" cy="235" r="16" fill="#f472b6" opacity="0.4" />

      <!-- Cute Horn Nubs -->
      <path d="M216 165 C205 130 195 120 185 110 C205 125 218 145 224 165 Z" fill="#fef08a" stroke="#0f172a" stroke-width="3" />
      <path d="M296 165 C307 130 317 120 327 110 C307 125 294 145 288 165 Z" fill="#fef08a" stroke="#0f172a" stroke-width="3" />

      <!-- Heavy Sleepy Eyelids & Eyes -->
      <g id="character-eyes">
        <ellipse cx="232" cy="205" rx="16" ry="14" fill="#fff" stroke="#0f172a" stroke-width="3.5" />
        <ellipse cx="280" cy="205" rx="16" ry="14" fill="#fff" stroke="#0f172a" stroke-width="3.5" />
        <!-- Closed drooping eyelid curve -->
        <path d="M216 205 Q232 215 248 205" stroke="#0f172a" stroke-width="4.5" fill="none" stroke-linecap="round" />
        <path d="M264 205 Q280 215 296 205" stroke="#0f172a" stroke-width="4.5" fill="none" stroke-linecap="round" />
      </g>

      <!-- Snout with Nostrils -->
      <path d="M236 230 Q256 220 276 230 Q286 255 256 260 Q226 255 236 230 Z" fill="#c084fc" stroke="#0f172a" stroke-width="3.5" />
      <!-- Nostrils puffing -->
      <ellipse cx="248" cy="242" rx="4" ry="5" fill="#4c1d95" />
      <ellipse cx="264" cy="242" rx="4" ry="5" fill="#4c1d95" />

      <!-- STRIPED SLEEPY NIGHTCAP -->
      <g id="character-nightcap">
        <!-- Cap Base -->
        <path d="M206 175 C206 125 280 100 290 85 C270 120 250 140 230 160 Z" fill="#ef4444" stroke="#0f172a" stroke-width="3.5" />
        <!-- Stripes -->
        <path d="M216 160 L246 135" stroke="#fff" stroke-width="8" stroke-linecap="round" />
        <path d="M236 135 L266 110" stroke="#fff" stroke-width="8" stroke-linecap="round" />
        <!-- Fluffy white rim -->
        <rect x="200" y="165" width="112" height="18" rx="9" fill="#f8fafc" stroke="#0f172a" stroke-width="3.5" />
        <!-- Cap Tail hanging down with Pom-Pom (ANIMATED) -->
        <g class="pompom-anim">
          <path d="M290 85 C320 70 335 110 320 145" stroke="#ef4444" stroke-width="12" fill="none" stroke-linecap="round" />
          <circle cx="320" cy="150" r="15" fill="#f8fafc" stroke="#0f172a" stroke-width="3" />
        </g>
      </g>

      <!-- FLAME BURST (SNEEZE EFFECT) -->
      <g id="character-effects" class="flame-sneeze">
        <path d="M275 240 Q330 200 370 230 Q340 255 380 270 Q320 270 275 250 Z" fill="url(#flameGrad)" stroke="#7c2d12" stroke-width="3" />
        <!-- Sparks -->
        <circle cx="390" cy="220" r="4" fill="#fde047" />
        <circle cx="400" cy="260" r="3" fill="#f97316" />
        <circle cx="360" cy="290" r="3.5" fill="#fde047" />
      </g>
    </g>
  `;

  return generateFrameSvg(inner, customDefs);
}

/* ==========================================================================
   6. ANGRY WIZARD (character_06_angry_wizard.svg)
   Comedic situation: Exploded his own spell in his face! Covered in soot,
   beard smoking, bushy eyebrows twitching in rage, holding a crackling staff!
   ========================================================================== */
function buildAngryWizard() {
  const customDefs = `
    <radialGradient id="wizardTowerBg" cx="50%" cy="40%" r="70%">
      <stop offset="0%" stop-color="#701a75" />
      <stop offset="50%" stop-color="#4a044e" />
      <stop offset="100%" stop-color="#19021e" />
    </radialGradient>
    <radialGradient id="magicOrbGrad" cx="35%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#fdf4ff" />
      <stop offset="35%" stop-color="#f472b6" />
      <stop offset="70%" stop-color="#c026d3" />
      <stop offset="100%" stop-color="#4a044e" />
    </radialGradient>
  `;

  const inner = `
    <style>
      @keyframes orbPulse {
        0%, 100% { transform: scale(1) translateY(0); filter: drop-shadow(0 0 10px #f472b6); }
        50% { transform: scale(1.15) translateY(-8px); filter: drop-shadow(0 0 24px #e879f9); }
      }
      @keyframes smokePuff {
        0% { transform: translateY(0) scale(0.6); opacity: 0; }
        40% { opacity: 0.7; }
        100% { transform: translateY(-70px) scale(1.3); opacity: 0; }
      }
      @keyframes browTwitch {
        0%, 100% { transform: translateY(0); }
        25% { transform: translateY(4px) rotate(-3deg); }
        50% { transform: translateY(-2px); }
        75% { transform: translateY(3px) rotate(3deg); }
      }
      @keyframes hatTipWiggle {
        0%, 100% { transform: rotate(0deg); }
        35% { transform: rotate(-12deg); }
        70% { transform: rotate(8deg); }
      }
      .magic-orb-anim { transform-origin: 380px 180px; animation: orbPulse 1.8s ease-in-out infinite; }
      .smoke-1 { animation: smokePuff 2.5s ease-out infinite; }
      .smoke-2 { animation: smokePuff 2.5s 1.2s ease-out infinite; }
      .brow-anim { animation: browTwitch 1.2s ease-in-out infinite; }
      .hat-tip { transform-origin: 256px 90px; animation: hatTipWiggle 2s ease-in-out infinite; }
    </style>

    <!-- ARCANE BACKGROUND -->
    <g id="background">
      <rect x="44" y="44" width="424" height="424" fill="url(#wizardTowerBg)" />
      <!-- Arcane runic circle behind wizard -->
      <circle cx="256" cy="240" r="140" fill="none" stroke="#a21caf" stroke-width="2" stroke-dasharray="14 10" opacity="0.3" />
      <polygon points="256,120 360,300 152,300" fill="none" stroke="#e879f9" stroke-width="1.5" opacity="0.25" />
    </g>

    <!-- CHARACTER SHADOW -->
    <g id="character-shadow">
      <ellipse cx="256" cy="435" rx="85" ry="20" fill="#000" opacity="0.5" />
    </g>

    <!-- WIZARD ACTOR -->
    <g id="character-animation">
      <!-- ROBES -->
      <g id="character-body">
        <!-- Deep Navy Blue Robe with gold stars -->
        <path d="M190 280 Q256 265 322 280 L345 425 Q256 445 167 425 Z" fill="#1e1b4b" stroke="#0f172a" stroke-width="4.5" />
        <!-- Gold Crescent Moon Buckle -->
        <path d="M246 385 C260 385 270 395 270 410 C256 410 246 400 246 385 Z" fill="#facc15" />
      </g>

      <!-- STAFF WITH HOVERING ORB -->
      <g id="character-weapon">
        <!-- Gnarled Wooden Staff -->
        <path d="M375 140 Q385 280 370 430" stroke="#78350f" stroke-width="14" fill="none" stroke-linecap="round" />
        <!-- Staff Top Fork Holding Orb -->
        <path d="M360 170 Q350 140 370 120 M385 170 Q405 140 385 120" stroke="#78350f" stroke-width="10" fill="none" stroke-linecap="round" />
        
        <!-- Hovering Crackling Magic Orb (ANIMATED) -->
        <g class="magic-orb-anim">
          <circle cx="378" cy="115" r="28" fill="url(#magicOrbGrad)" stroke="#fdf4ff" stroke-width="2.5" />
          <!-- Lightning sparks crackling around orb -->
          <path d="M365 105 L372 115 L368 125" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" />
          <path d="M385 102 L392 112 L388 122" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round" />
        </g>

        <!-- Wizard Hand Gripping Staff -->
        <circle cx="372" cy="275" r="15" fill="#fde047" stroke="#0f172a" stroke-width="3" />
      </g>

      <!-- BUSHY BEARD & SOOT-STAINED FACE -->
      <g id="character-head">
        <!-- Long White Wizard Beard with charred black tips -->
        <path d="M185 240 C165 350 200 405 256 410 C312 405 347 350 327 240 Z" fill="#f8fafc" stroke="#0f172a" stroke-width="4" />
        <!-- Black soot patches from spell explosion! -->
        <ellipse cx="256" cy="385" rx="36" ry="18" fill="#1e293b" opacity="0.8" />
        <circle cx="215" cy="255" r="16" fill="#1e293b" opacity="0.5" />
        <circle cx="295" cy="255" r="16" fill="#1e293b" opacity="0.5" />

        <!-- Face Skin -->
        <ellipse cx="256" cy="225" rx="54" ry="46" fill="#fed7aa" stroke="#0f172a" stroke-width="4" />

        <!-- Crooked Round Golden Glasses -->
        <g transform="rotate(-6 256 220)">
          <circle cx="234" cy="220" r="18" fill="rgba(255,255,255,0.7)" stroke="#ca8a04" stroke-width="3.5" />
          <circle cx="278" cy="220" r="18" fill="rgba(255,255,255,0.7)" stroke="#ca8a04" stroke-width="3.5" />
          <line x1="252" y1="220" x2="260" y2="220" stroke="#ca8a04" stroke-width="3.5" />
        </g>

        <!-- Angry Furious Eyes -->
        <g id="character-eyes">
          <circle cx="234" cy="219" r="6" fill="#0f172a" />
          <circle cx="278" cy="219" r="6" fill="#0f172a" />
        </g>

        <!-- Bushy Furious Eyebrows (ANIMATED TWITCH) -->
        <g class="brow-anim">
          <path d="M214 206 L248 214" stroke="#f8fafc" stroke-width="7" stroke-linecap="round" />
          <path d="M298 206 L264 214" stroke="#f8fafc" stroke-width="7" stroke-linecap="round" />
        </g>

        <!-- Grumbling Zig-Zag Mouth -->
        <path d="M242 260 L248 255 L254 262 L260 256 L266 261" stroke="#7f1d1d" stroke-width="3.5" fill="none" stroke-linecap="round" />

        <!-- TALL POINTY WIZARD HAT -->
        <g id="character-hat">
          <!-- Hat Wide Brim -->
          <ellipse cx="256" cy="180" rx="90" ry="24" fill="#312e81" stroke="#0f172a" stroke-width="4" />
          <ellipse cx="256" cy="178" rx="86" ry="20" fill="#4338ca" />
          <!-- Gold Buckle Band -->
          <rect x="210" y="150" width="92" height="16" fill="#ca8a04" stroke="#0f172a" stroke-width="2.5" />
          <!-- Floppy Cone Tip (ANIMATED WIGGLE) -->
          <path d="M210 152 C220 90 240 50 300 45 C280 90 290 120 302 152 Z" fill="#312e81" stroke="#0f172a" stroke-width="4" class="hat-tip" />
          <!-- Star print on hat -->
          <polygon points="256,95 260,105 270,107 262,114 264,124 256,118 248,124 250,114 242,107 252,105" fill="#facc15" />
        </g>
      </g>

      <!-- SMOKE PUFFS RISING FROM CHARRED BEARD (ANIMATED) -->
      <g id="character-effects">
        <circle cx="220" cy="360" r="12" fill="#94a3b8" class="smoke-1" />
        <circle cx="280" cy="370" r="10" fill="#94a3b8" class="smoke-2" />
      </g>
    </g>
  `;

  return generateFrameSvg(inner, customDefs);
}

fs.writeFileSync(path.join(AVATARS_DIR, 'character_05_sleepy_dragon.svg'), buildSleepyDragon(), 'utf8');
console.log('✓ character_05_sleepy_dragon.svg generated');

fs.writeFileSync(path.join(AVATARS_DIR, 'character_06_angry_wizard.svg'), buildAngryWizard(), 'utf8');
console.log('✓ character_06_angry_wizard.svg generated');
