import fs from 'fs';
import path from 'path';
import { generateFrameSvg, AVATARS_DIR } from './svg-frame-template.mjs';

console.log('🎨 Generating 12 Unique Animated SVG Game Character Avatars...\n');

/* ==========================================================================
   1. CLUMSY BARBARIAN (character_01_clumsy_barbarian.svg)
   Comedic situation: Tiny muscle barbarian struggling under an enormous stone hammer,
   trembling, leaning backwards, eyes wide in panic, sweat beads flying!
   ========================================================================== */
function buildClumsyBarbarian() {
  const customDefs = `
    <radialGradient id="barbarianBg" cx="50%" cy="50%" r="65%">
      <stop offset="0%" stop-color="#7f1d1d" />
      <stop offset="60%" stop-color="#450a0a" />
      <stop offset="100%" stop-color="#180404" />
    </radialGradient>
    <linearGradient id="hammerStone" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#94a3b8" />
      <stop offset="50%" stop-color="#64748b" />
      <stop offset="100%" stop-color="#334155" />
    </linearGradient>
    <linearGradient id="hammerRune" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#fb923c" />
      <stop offset="100%" stop-color="#ef4444" />
    </linearGradient>
  `;

  const inner = `
    <style>
      @keyframes barbarianWobble {
        0%, 100% { transform: rotate(0deg); }
        25% { transform: rotate(-14deg) translateY(6px); }
        50% { transform: rotate(2deg) scale(0.96, 1.04); }
        75% { transform: rotate(10deg) translateY(4px); }
      }
      @keyframes hammerTilt {
        0%, 100% { transform: rotate(0deg); }
        25% { transform: rotate(-22deg) translateX(-10px); }
        50% { transform: rotate(3deg) translateY(12px); }
        75% { transform: rotate(16deg) translateX(8px); }
      }
      @keyframes eyePanic {
        0%, 100% { transform: scale(1); }
        15%, 65% { transform: scale(1.15, 0.9); }
        35% { transform: scale(0.9, 1.15); }
      }
      @keyframes sweatFly {
        0% { opacity: 0; transform: translate(0, 0) scale(0.5); }
        50% { opacity: 1; transform: translate(14px, -18px) scale(1.2); }
        100% { opacity: 0; transform: translate(26px, -30px) scale(0.2); }
      }
      @keyframes emberFloat {
        0% { transform: translateY(0) translateX(0); opacity: 0.8; }
        100% { transform: translateY(-160px) translateX(25px); opacity: 0; }
      }
      .barbarian-anim-group { transform-origin: 256px 420px; animation: barbarianWobble 2.8s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite; }
      .hammer-anim-group { transform-origin: 190px 320px; animation: hammerTilt 2.8s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite; }
      .eye-anim { animation: eyePanic 1.4s ease-in-out infinite; transform-origin: center; }
      .sweat-drop1 { animation: sweatFly 1.8s ease-out infinite; }
      .sweat-drop2 { animation: sweatFly 1.8s 0.9s ease-out infinite; }
      .ember1 { animation: emberFloat 3s linear infinite; }
      .ember2 { animation: emberFloat 4s 1.5s linear infinite; }
    </style>

    <!-- BACKGROUND -->
    <g id="background">
      <rect x="44" y="44" width="424" height="424" fill="url(#barbarianBg)" />
      <!-- Volcanic Embers -->
      <circle cx="120" cy="400" r="3" fill="#f97316" class="ember1" />
      <circle cx="380" cy="380" r="4" fill="#ef4444" class="ember2" />
      <circle cx="200" cy="420" r="2.5" fill="#facc15" class="ember1" style="animation-delay:0.8s;" />
    </g>

    <!-- CHARACTER SHADOW -->
    <g id="character-shadow">
      <ellipse cx="256" cy="430" rx="90" ry="24" fill="#000" opacity="0.45" />
    </g>

    <!-- WHOLE BARBARIAN ACTOR -->
    <g id="character-animation" class="barbarian-anim-group">
      <!-- LEGS & BOOTS -->
      <g id="character-legs">
        <rect x="210" y="370" width="36" height="48" rx="10" fill="#78350f" stroke="#0f172a" stroke-width="4" />
        <rect x="266" y="370" width="36" height="48" rx="10" fill="#78350f" stroke="#0f172a" stroke-width="4" />
        <!-- Fur boot cuffs -->
        <rect x="204" y="360" width="48" height="18" rx="8" fill="#d97706" />
        <rect x="260" y="360" width="48" height="18" rx="8" fill="#d97706" />
      </g>

      <!-- TORSO & BELT -->
      <g id="character-body">
        <path d="M190 280 Q256 260 322 280 L315 370 Q256 385 197 370 Z" fill="#b45309" stroke="#0f172a" stroke-width="4" />
        <!-- Muscle shading -->
        <path d="M226 295 Q256 285 286 295 L280 340 Q256 350 232 340 Z" fill="#d97706" opacity="0.4" />
        <!-- Huge Studded Belt -->
        <rect x="188" y="340" width="136" height="24" rx="6" fill="#451a03" stroke="#0f172a" stroke-width="3" />
        <circle cx="256" cy="352" r="14" fill="#f59e0b" stroke="#0f172a" stroke-width="3" />
        <rect x="250" y="346" width="12" height="12" fill="#78350f" />
      </g>

      <!-- HEAD & HELMET -->
      <g id="character-head">
        <!-- Wild Orange Beard -->
        <path d="M185 250 C170 330 220 365 256 365 C292 365 342 330 327 250 Z" fill="#ea580c" stroke="#0f172a" stroke-width="4" />
        <!-- Face base -->
        <ellipse cx="256" cy="240" rx="55" ry="46" fill="#fed7aa" stroke="#0f172a" stroke-width="4" />
        <!-- Open Gasping Mouth -->
        <ellipse cx="256" cy="272" rx="18" ry="14" fill="#450a0a" stroke="#0f172a" stroke-width="3" />
        <path d="M246 266 Q256 270 266 266" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" />
        
        <!-- Big Panicked Eyes -->
        <g id="character-eyes" class="eye-anim">
          <ellipse cx="236" cy="235" rx="16" ry="20" fill="#fff" stroke="#0f172a" stroke-width="3.5" />
          <ellipse cx="276" cy="235" rx="16" ry="20" fill="#fff" stroke="#0f172a" stroke-width="3.5" />
          <!-- Trembling pupils looking UP at the falling hammer -->
          <circle cx="232" cy="226" r="8" fill="#0f172a" />
          <circle cx="272" cy="226" r="8" fill="#0f172a" />
          <circle cx="230" cy="223" r="3" fill="#fff" />
          <circle cx="270" cy="223" r="3" fill="#fff" />
        </g>

        <!-- Red Strained Nose -->
        <ellipse cx="256" cy="246" rx="12" ry="9" fill="#f87171" stroke="#0f172a" stroke-width="2.5" />

        <!-- Iron Horned Helmet -->
        <path d="M196 230 C196 170 316 170 316 230 Z" fill="#64748b" stroke="#0f172a" stroke-width="4" />
        <rect x="194" y="222" width="124" height="14" rx="4" fill="#334155" stroke="#0f172a" stroke-width="3" />
        <!-- Left Horn (Large, Curved) -->
        <path d="M200 224 C150 210 130 150 145 120 C155 155 190 190 206 210 Z" fill="#fef08a" stroke="#0f172a" stroke-width="3.5" />
        <!-- Right Horn (Broken / Chipped comically) -->
        <path d="M312 224 C340 210 355 180 348 160 L334 175 C330 195 316 210 306 215 Z" fill="#fef08a" stroke="#0f172a" stroke-width="3.5" />
      </g>

      <!-- SWEAT PARTICLES -->
      <g id="character-effects">
        <path d="M320 200 Q330 190 325 180 Q320 190 320 200 Z" fill="#38bdf8" class="sweat-drop1" />
        <path d="M190 195 Q180 185 185 175 Q190 185 190 195 Z" fill="#38bdf8" class="sweat-drop2" />
      </g>

      <!-- MASSIVE OVERSIZED STONE WARHAMMER -->
      <g id="character-weapon" class="hammer-anim-group">
        <!-- Long Wood Handle Gripped by Hands -->
        <rect x="180" y="140" width="22" height="230" rx="8" fill="#78350f" stroke="#0f172a" stroke-width="4" transform="rotate(-25 190 250)" />
        <!-- Leather grip wrap -->
        <path d="M172 260 L188 280 M176 285 L192 305 M180 310 L196 330" stroke="#fde047" stroke-width="3.5" stroke-linecap="round" />

        <!-- Barbarian Straining Arms -->
        <g id="character-arms">
          <ellipse cx="206" cy="300" rx="18" ry="14" fill="#fed7aa" stroke="#0f172a" stroke-width="3.5" />
          <ellipse cx="230" cy="285" rx="18" ry="14" fill="#fed7aa" stroke="#0f172a" stroke-width="3.5" />
        </g>

        <!-- Gigantic Stone Hammer Head (5x bigger than barbarian head!) -->
        <g transform="translate(100, 40) rotate(-25)">
          <rect x="0" y="0" width="160" height="110" rx="18" fill="url(#hammerStone)" stroke="#0f172a" stroke-width="5" />
          <!-- Stone bevel & cracks -->
          <path d="M20 20 L50 40 L40 70 L80 90" fill="none" stroke="#1e293b" stroke-width="4" />
          <polygon points="12,12 148,12 138,28 22,28" fill="#cbd5e1" opacity="0.6" />
          <!-- Glowing Magic Rune etched in stone -->
          <path d="M70 35 L90 55 L70 75 M90 35 L70 55 L90 75" fill="none" stroke="url(#hammerRune)" stroke-width="5" stroke-linecap="round" />
        </g>
      </g>
    </g>
  `;

  return generateFrameSvg(inner, customDefs);
}

/* ==========================================================================
   2. FLYING DUCK PILOT (character_02_flying_duck_pilot.svg)
   Comedic situation: Desperately trying to control an absurdly tiny airplane,
   propeller buzzing wildly, aviator scarf waving, bill chattering in panic!
   ========================================================================== */
function buildFlyingDuckPilot() {
  const customDefs = `
    <radialGradient id="duckSkyBg" cx="50%" cy="40%" r="70%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="60%" stop-color="#0284c7" />
      <stop offset="100%" stop-color="#082f49" />
    </radialGradient>
    <linearGradient id="planeRed" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ef4444" />
      <stop offset="50%" stop-color="#dc2626" />
      <stop offset="100%" stop-color="#991b1b" />
    </linearGradient>
  `;

  const inner = `
    <style>
      @keyframes planeTurbulence {
        0%, 100% { transform: translateY(0px) rotate(0deg); }
        25% { transform: translateY(-12px) rotate(-7deg); }
        50% { transform: translateY(8px) rotate(4deg); }
        75% { transform: translateY(-6px) rotate(-3deg); }
      }
      @keyframes propellerSpin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      @keyframes scarfFlutter {
        0%, 100% { transform: rotate(0deg) skewY(0deg); }
        50% { transform: rotate(-12deg) skewY(-8deg); }
      }
      @keyframes billChatter {
        0%, 100% { transform: scaleY(1); }
        50% { transform: scaleY(1.25); }
      }
      @keyframes cloudDrift {
        0% { transform: translateX(0); }
        100% { transform: translateX(-180px); }
      }
      .plane-anim { transform-origin: 256px 300px; animation: planeTurbulence 2.2s ease-in-out infinite; }
      .prop-blade { transform-origin: 256px 390px; animation: propellerSpin 0.12s linear infinite; }
      .scarf-tail { transform-origin: 190px 240px; animation: scarfFlutter 0.6s ease-in-out infinite; }
      .duck-bill { transform-origin: 256px 225px; animation: billChatter 0.4s ease-in-out infinite; }
      .cloud-move { animation: cloudDrift 5s linear infinite; }
    </style>

    <!-- SKY BACKGROUND WITH SPEED CLOUDS -->
    <g id="background">
      <rect x="44" y="44" width="424" height="424" fill="url(#duckSkyBg)" />
      <!-- Drifting cartoon clouds -->
      <g class="cloud-move" opacity="0.5">
        <path d="M420 120 Q440 100 460 120 Q480 120 480 140 Q480 160 450 160 L400 160 Q390 140 420 120 Z" fill="#fff" />
        <path d="M300 200 Q320 180 340 200 Q360 200 360 220 L280 220 Q280 200 300 200 Z" fill="#fff" opacity="0.6" />
      </g>
    </g>

    <!-- PLANE & DUCK COMPOSITION -->
    <g id="character-animation" class="plane-anim">
      <!-- FLAPPING SCARF TAIL (BEHIND DUCK) -->
      <g id="character-clothing" class="scarf-tail">
        <path d="M190 235 C140 230 110 210 80 230 C100 250 140 260 185 248 Z" fill="#ef4444" stroke="#0f172a" stroke-width="3.5" />
      </g>

      <!-- DUCK PILOT -->
      <g id="character-body">
        <!-- Plump Yellow Body -->
        <ellipse cx="256" cy="245" rx="68" ry="60" fill="#facc15" stroke="#0f172a" stroke-width="4" />
        <!-- Wings gripping the sides -->
        <path d="M185 240 C170 265 195 295 210 290 Z" fill="#eab308" stroke="#0f172a" stroke-width="3.5" />
        <path d="M327 240 C342 265 317 295 302 290 Z" fill="#eab308" stroke="#0f172a" stroke-width="3.5" />
      </g>

      <!-- DUCK HEAD -->
      <g id="character-head">
        <ellipse cx="256" cy="180" rx="58" ry="52" fill="#facc15" stroke="#0f172a" stroke-width="4" />

        <!-- Big Panicked Aviator Eyes -->
        <g id="character-eyes">
          <ellipse cx="236" cy="175" rx="17" ry="22" fill="#fff" stroke="#0f172a" stroke-width="3.5" />
          <ellipse cx="276" cy="175" rx="17" ry="22" fill="#fff" stroke="#0f172a" stroke-width="3.5" />
          <!-- Swirling dizzy/panicked pupils -->
          <circle cx="238" cy="176" r="7.5" fill="#0f172a" />
          <circle cx="274" cy="176" r="7.5" fill="#0f172a" />
          <circle cx="236" cy="172" r="2.5" fill="#fff" />
          <circle cx="272" cy="172" r="2.5" fill="#fff" />
        </g>

        <!-- Wide Orange Quacking Bill -->
        <g id="character-mouth" class="duck-bill">
          <path d="M216 205 Q256 195 296 205 C304 225 284 240 256 240 C228 240 208 225 216 205 Z" fill="#f97316" stroke="#0f172a" stroke-width="3.5" />
          <path d="M228 215 Q256 220 284 215" stroke="#9a3412" stroke-width="3" fill="none" />
          <circle cx="244" cy="208" r="2" fill="#7c2d12" />
          <circle cx="268" cy="208" r="2" fill="#7c2d12" />
        </g>

        <!-- Red Scarf Collar -->
        <path d="M210 230 Q256 245 302 230 Q308 250 256 255 Q204 250 210 230 Z" fill="#ef4444" stroke="#0f172a" stroke-width="3.5" />

        <!-- Leather Aviator Helmet with Goggles -->
        <path d="M198 175 C198 120 314 120 314 175 C314 185 308 210 306 220 L292 215 L296 185 L216 185 L220 215 L206 220 Z" fill="#78350f" stroke="#0f172a" stroke-width="4" />
        <!-- Ear Flaps -->
        <rect x="194" y="175" width="16" height="35" rx="8" fill="#9a3412" stroke="#0f172a" stroke-width="3" />
        <rect x="302" y="175" width="16" height="35" rx="8" fill="#9a3412" stroke="#0f172a" stroke-width="3" />
        
        <!-- Big Round Aviator Goggles on Brow -->
        <g id="character-goggles">
          <rect x="212" y="138" width="88" height="10" rx="4" fill="#1e293b" />
          <circle cx="236" cy="142" r="18" fill="#38bdf8" stroke="#f59e0b" stroke-width="4" />
          <circle cx="276" cy="142" r="18" fill="#38bdf8" stroke="#f59e0b" stroke-width="4" />
          <!-- Lens glint -->
          <path d="M228 134 Q238 132 244 140" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" />
          <path d="M268 134 Q278 132 284 140" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" />
        </g>
      </g>

      <!-- MICRO BI-PLANE FUSELAGE -->
      <g id="character-airplane">
        <!-- Upper Wing -->
        <rect x="116" y="270" width="280" height="20" rx="8" fill="#eab308" stroke="#0f172a" stroke-width="4" />
        <!-- Cockpit Body -->
        <path d="M180 290 Q256 275 332 290 L310 400 Q256 420 202 400 Z" fill="url(#planeRed)" stroke="#0f172a" stroke-width="4.5" />
        <!-- Wing Struts -->
        <line x1="160" y1="290" x2="180" y2="340" stroke="#0f172a" stroke-width="4" />
        <line x1="352" y1="290" x2="332" y2="340" stroke="#0f172a" stroke-width="4" />
        <!-- Lower Wing -->
        <rect x="136" y="340" width="240" height="18" rx="7" fill="#eab308" stroke="#0f172a" stroke-width="4" />

        <!-- Propeller Hub and Spinning Blur -->
        <circle cx="256" cy="390" r="38" fill="rgba(255,255,255,0.25)" stroke="#38bdf8" stroke-width="2" stroke-dasharray="8 6" />
        <!-- Spinning 3-blade Propeller -->
        <g class="prop-blade">
          <ellipse cx="256" cy="345" rx="8" ry="40" fill="#f8fafc" stroke="#0f172a" stroke-width="3" />
          <ellipse cx="295" cy="412" rx="40" ry="8" fill="#f8fafc" stroke="#0f172a" stroke-width="3" transform="rotate(30 295 412)" />
          <ellipse cx="217" cy="412" rx="40" ry="8" fill="#f8fafc" stroke="#0f172a" stroke-width="3" transform="rotate(-30 217 412)" />
        </g>
        <!-- Center Spinner Nose Cone -->
        <circle cx="256" cy="390" r="14" fill="#facc15" stroke="#0f172a" stroke-width="3.5" />
      </g>
    </g>
  `;

  return generateFrameSvg(inner, customDefs);
}

// Generate the first 2 characters
fs.writeFileSync(path.join(AVATARS_DIR, 'character_01_clumsy_barbarian.svg'), buildClumsyBarbarian(), 'utf8');
console.log('✓ character_01_clumsy_barbarian.svg generated');

fs.writeFileSync(path.join(AVATARS_DIR, 'character_02_flying_duck_pilot.svg'), buildFlyingDuckPilot(), 'utf8');
console.log('✓ character_02_flying_duck_pilot.svg generated');
