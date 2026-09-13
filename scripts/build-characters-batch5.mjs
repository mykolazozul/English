import fs from 'fs';
import path from 'path';
import { generateFrameSvg, AVATARS_DIR } from './svg-frame-template.mjs';

/* ==========================================================================
   9. GOBLIN ENGINEER (character_09_goblin_engineer.svg)
   Comedic situation: Frantically tightening a bolt on an enormous ticking bomb,
   brass goggles gleaming, ears flapping with manic glee as the fuse sizzles!
   ========================================================================== */
function buildGoblinEngineer() {
  const customDefs = `
    <radialGradient id="forgeBg" cx="50%" cy="45%" r="70%">
      <stop offset="0%" stop-color="#78350f" />
      <stop offset="50%" stop-color="#451a03" />
      <stop offset="100%" stop-color="#1c1917" />
    </radialGradient>
    <linearGradient id="goblinSkin" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#84cc16" />
      <stop offset="50%" stop-color="#65a30d" />
      <stop offset="100%" stop-color="#4d7c0f" />
    </linearGradient>
    <linearGradient id="brassGoggles" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a" />
      <stop offset="50%" stop-color="#d97706" />
      <stop offset="100%" stop-color="#78350f" />
    </linearGradient>
  `;

  const inner = `
    <style>
      @keyframes wrenchTurnAnim {
        0%, 100% { transform: rotate(0deg); }
        30% { transform: rotate(-28deg); }
        45% { transform: rotate(8deg); }
        60% { transform: rotate(-24deg); }
      }
      @keyframes fuseSparkleAnim {
        0%, 100% { transform: scale(1) rotate(0deg); opacity: 1; }
        50% { transform: scale(1.4) rotate(180deg); opacity: 0.8; }
      }
      @keyframes earFlapAnim {
        0%, 100% { transform: rotate(0deg); }
        50% { transform: rotate(12deg); }
      }
      @keyframes gearRotate {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      @keyframes bombTicking {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }
      .wrench-anim { transform-origin: 320px 330px; animation: wrenchTurnAnim 1.6s ease-in-out infinite; }
      .fuse-spark { transform-origin: 236px 260px; animation: fuseSparkleAnim 0.3s linear infinite; }
      .left-ear { transform-origin: 200px 200px; animation: earFlapAnim 1.2s ease-in-out infinite; }
      .right-ear { transform-origin: 312px 200px; animation: earFlapAnim 1.2s 0.6s ease-in-out infinite; }
      .bg-gear { transform-origin: 120px 140px; animation: gearRotate 12s linear infinite; }
      .bomb-actor { transform-origin: 256px 370px; animation: bombTicking 0.8s ease-in-out infinite; }
    </style>

    <!-- FORGE BACKGROUND WITH SPINNING GEAR -->
    <g id="background">
      <rect x="44" y="44" width="424" height="424" fill="url(#forgeBg)" />
      <!-- Spinning Clockwork Gear -->
      <g class="bg-gear" opacity="0.35">
        <circle cx="120" cy="140" r="50" fill="none" stroke="#d97706" stroke-width="14" stroke-dasharray="14 10" />
        <circle cx="120" cy="140" r="20" fill="#78350f" stroke="#0f172a" stroke-width="4" />
      </g>
    </g>

    <!-- CHARACTER SHADOW -->
    <g id="character-shadow">
      <ellipse cx="256" cy="435" rx="90" ry="20" fill="#000" opacity="0.5" />
    </g>

    <!-- TICKING MECHANICAL BOMB (FRONT) -->
    <g id="character-bomb" class="bomb-actor">
      <!-- Big Black Cast Iron Bomb -->
      <circle cx="256" cy="370" r="62" fill="#1e293b" stroke="#0f172a" stroke-width="5" />
      <!-- Metal Rivets and skull print on bomb -->
      <path d="M246 360 Q256 350 266 360 L262 375 L250 375 Z" fill="#ef4444" />
      <circle cx="250" cy="365" r="2.5" fill="#0f172a" />
      <circle cx="262" cy="365" r="2.5" fill="#0f172a" />
      <!-- Bomb Neck -->
      <rect x="244" y="295" width="24" height="18" rx="4" fill="#64748b" stroke="#0f172a" stroke-width="3" />
      <!-- Curved Rope Fuse -->
      <path d="M256 295 Q270 270 236 260" fill="none" stroke="#ca8a04" stroke-width="5" stroke-linecap="round" />
      <!-- Sizzling Fuse Spark (ANIMATED) -->
      <g class="fuse-spark">
        <polygon points="236,245 240,256 252,260 240,264 236,275 232,264 220,260 232,256" fill="#facc15" />
        <circle cx="236" cy="260" r="4" fill="#ef4444" />
      </g>
    </g>

    <!-- GOBLIN BODY -->
    <g id="character-animation">
      <!-- Slender Green Goblin Torso in Leather Apron -->
      <g id="character-body">
        <ellipse cx="256" cy="290" rx="55" ry="60" fill="url(#goblinSkin)" stroke="#0f172a" stroke-width="4" />
        <!-- Tool Belt & Apron -->
        <path d="M220 260 L292 260 L285 320 L227 320 Z" fill="#78350f" stroke="#0f172a" stroke-width="3" />
        <!-- Dynamite Stick in pocket -->
        <rect x="228" y="275" width="8" height="22" fill="#ef4444" rx="2" />
        <rect x="238" y="278" width="8" height="20" fill="#ef4444" rx="2" />
      </g>

      <!-- GIANT WRENCH (CRANKING BOLT) -->
      <g id="character-weapon" class="wrench-anim">
        <!-- Huge Steel Adjustable Wrench -->
        <rect x="305" y="250" width="18" height="120" rx="6" fill="#94a3b8" stroke="#0f172a" stroke-width="3.5" transform="rotate(35 314 310)" />
        <!-- Wrench Head Jaws clamped on bomb nut -->
        <g transform="translate(260, 340)">
          <path d="M0 0 L25 -10 L35 10 L10 20 Z" fill="#64748b" stroke="#0f172a" stroke-width="3" />
        </g>
        <!-- Goblin clawed hand gripping handle -->
        <circle cx="340" cy="285" r="14" fill="url(#goblinSkin)" stroke="#0f172a" stroke-width="3" />
      </g>

      <!-- GOBLIN HEAD & EARS -->
      <g id="character-head">
        <!-- Giant Pointy Goblin Ears (ANIMATED FLAP) -->
        <g class="left-ear">
          <path d="M205 195 C150 190 90 145 70 120 C110 145 160 175 205 185 Z" fill="url(#goblinSkin)" stroke="#0f172a" stroke-width="4" />
          <path d="M185 185 C145 180 105 145 90 130 C120 145 155 170 185 180 Z" fill="#f472b6" opacity="0.4" />
        </g>
        <g class="right-ear">
          <path d="M307 195 C362 190 422 145 442 120 C402 145 352 175 307 185 Z" fill="url(#goblinSkin)" stroke="#0f172a" stroke-width="4" />
          <path d="M327 185 C367 180 407 145 422 130 C392 145 357 170 327 180 Z" fill="#f472b6" opacity="0.4" />
        </g>

        <!-- Main Goblin Head -->
        <ellipse cx="256" cy="190" rx="58" ry="50" fill="url(#goblinSkin)" stroke="#0f172a" stroke-width="4" />

        <!-- Wide Manic Grin with Sharp Yellow Teeth -->
        <g id="character-mouth">
          <path d="M220 205 Q256 240 292 205 Q256 220 220 205 Z" fill="#450a0a" stroke="#0f172a" stroke-width="3.5" />
          <!-- Sharp fangs sticking out -->
          <polygon points="230,208 234,220 238,209" fill="#fef08a" />
          <polygon points="246,211 250,224 254,212" fill="#fef08a" />
          <polygon points="262,212 266,224 270,211" fill="#fef08a" />
          <polygon points="278,209 282,220 286,208" fill="#fef08a" />
        </g>

        <!-- Long Warty Goblin Nose -->
        <path d="M256 180 C265 195 270 205 260 215 C250 212 248 195 256 180 Z" fill="#65a30d" stroke="#0f172a" stroke-width="2.5" />
        <circle cx="262" cy="205" r="2" fill="#451a03" />

        <!-- Crazy Asymmetrical Steampunk Goggles -->
        <g id="character-goggles">
          <rect x="200" y="145" width="112" height="12" rx="4" fill="#451a03" />
          <!-- Left Small Lens -->
          <circle cx="228" cy="150" r="20" fill="#38bdf8" stroke="url(#brassGoggles)" stroke-width="5" />
          <!-- Right Massive Triple-Magnifier Lens -->
          <circle cx="284" cy="150" r="26" fill="#facc15" stroke="url(#brassGoggles)" stroke-width="6" />
          <!-- Goggle Crosshairs -->
          <line x1="284" y1="128" x2="284" y2="172" stroke="#0f172a" stroke-width="2" opacity="0.6" />
          <line x1="262" y1="150" x2="306" y2="150" stroke="#0f172a" stroke-width="2" opacity="0.6" />
          <!-- Eyeballs looking wild behind lenses -->
          <circle cx="228" cy="150" r="7" fill="#0f172a" />
          <circle cx="284" cy="150" r="10" fill="#0f172a" />
        </g>
      </g>
    </g>
  `;

  return generateFrameSvg(inner, customDefs);
}

/* ==========================================================================
   10. TINY GIANT (character_10_tiny_giant.svg)
   Comedic situation: A 30cm stone colossus on a small pebble, flexing his
   tiny granite biceps with ferocious effort, while a pink flower sways on his head!
   ========================================================================== */
function buildTinyGiant() {
  const customDefs = `
    <radialGradient id="mountainBg" cx="50%" cy="40%" r="70%">
      <stop offset="0%" stop-color="#3f3f46" />
      <stop offset="50%" stop-color="#27272a" />
      <stop offset="100%" stop-color="#09090b" />
    </radialGradient>
    <linearGradient id="graniteRock" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#a1a1aa" />
      <stop offset="45%" stop-color="#71717a" />
      <stop offset="100%" stop-color="#3f3f46" />
    </linearGradient>
    <linearGradient id="runeGlow" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#0284c7" />
    </linearGradient>
  `;

  const inner = `
    <style>
      @keyframes colossusFlexAnim {
        0%, 100% { transform: scale(1, 1); }
        40% { transform: scale(1.08, 0.96) translateY(4px); } /* Maximum flex! */
        45% { transform: scale(1.10, 0.95); }
        60% { transform: scale(0.98, 1.02); }
      }
      @keyframes flowerBreeze {
        0%, 100% { transform: rotate(0deg); }
        50% { transform: rotate(18deg); }
      }
      @keyframes butterflyHover {
        0%, 100% { transform: translate(140px, 180px); }
        35% { transform: translate(160px, 155px); }
        70% { transform: translate(130px, 170px); }
      }
      @keyframes wingFlap {
        0%, 100% { transform: scaleX(1); }
        50% { transform: scaleX(0.2); }
      }
      @keyframes runePulse {
        0%, 100% { opacity: 0.6; filter: drop-shadow(0 0 4px #38bdf8); }
        50% { opacity: 1; filter: drop-shadow(0 0 12px #38bdf8); }
      }
      .flex-actor { transform-origin: 256px 420px; animation: colossusFlexAnim 2.4s cubic-bezier(0.68, -0.55, 0.27, 1.55) infinite; }
      .daisy-anim { transform-origin: 270px 150px; animation: flowerBreeze 2.2s ease-in-out infinite; }
      .butterfly-group { animation: butterflyHover 4s ease-in-out infinite; }
      .b-wing { transform-origin: center; animation: wingFlap 0.2s linear infinite; }
      .rune-crack { animation: runePulse 2s ease-in-out infinite; }
    </style>

    <!-- MOUNTAIN PEAKS BACKGROUND -->
    <g id="background">
      <rect x="44" y="44" width="424" height="424" fill="url(#mountainBg)" />
      <!-- Sharp Granite Peak Silhouettes -->
      <polygon points="44,380 140,240 240,380" fill="#18181b" />
      <polygon points="260,380 370,220 468,380" fill="#18181b" />
    </g>

    <!-- BUTTERFLY HOVERING (COMEDIC CONTRAST) -->
    <g class="butterfly-group">
      <ellipse cx="0" cy="0" rx="3" ry="8" fill="#18181b" />
      <g class="b-wing">
        <circle cx="-7" cy="-3" r="6" fill="#facc15" />
        <circle cx="7" cy="-3" r="6" fill="#facc15" />
      </g>
    </g>

    <!-- TINY MOUND & SHADOW -->
    <g id="character-shadow">
      <ellipse cx="256" cy="425" rx="80" ry="18" fill="#000" opacity="0.6" />
      <!-- Small pebble mound -->
      <polygon points="180,435 256,415 332,435" fill="#52525b" stroke="#0f172a" stroke-width="3" />
    </g>

    <!-- WHOLE STONE GIANT (ANIMATED BICEP FLEX) -->
    <g id="character-animation" class="flex-actor">
      <!-- STONE LEGS -->
      <g id="character-legs">
        <rect x="205" y="375" width="42" height="45" rx="10" fill="url(#graniteRock)" stroke="#0f172a" stroke-width="4.5" />
        <rect x="265" y="375" width="42" height="45" rx="10" fill="url(#graniteRock)" stroke="#0f172a" stroke-width="4.5" />
      </g>

      <!-- CHISELED GRANITE TORSO -->
      <g id="character-body">
        <!-- Angular Rock Plates -->
        <polygon points="180,260 256,245 332,260 315,385 197,385" fill="url(#graniteRock)" stroke="#0f172a" stroke-width="5" />
        
        <!-- Glowing Cyan Arcane Cracks (ANIMATED PULSE) -->
        <g class="rune-crack">
          <path d="M225 285 L256 315 L245 345 L265 375" stroke="url(#runeGlow)" stroke-width="4.5" fill="none" stroke-linecap="round" />
          <path d="M256 315 L285 300 L295 335" stroke="url(#runeGlow)" stroke-width="4" fill="none" stroke-linecap="round" />
        </g>
      </g>

      <!-- COMICALLY FLEXED BICEPS (ARMS UP) -->
      <g id="character-arms">
        <!-- Left Arm Flexing Up -->
        <path d="M185 270 C140 260 120 220 135 180 C155 185 170 215 190 240 Z" fill="url(#graniteRock)" stroke="#0f172a" stroke-width="4.5" />
        <!-- Huge Stone Fist -->
        <circle cx="138" cy="180" r="22" fill="url(#graniteRock)" stroke="#0f172a" stroke-width="4" />
        <!-- Bicep muscle peak -->
        <ellipse cx="160" cy="225" rx="14" ry="18" fill="url(#graniteRock)" stroke="#0f172a" stroke-width="3" />

        <!-- Right Arm Flexing Up -->
        <path d="M327 270 C372 260 392 220 377 180 C357 185 342 215 322 240 Z" fill="url(#graniteRock)" stroke="#0f172a" stroke-width="4.5" />
        <!-- Huge Stone Fist -->
        <circle cx="374" cy="180" r="22" fill="url(#graniteRock)" stroke="#0f172a" stroke-width="4" />
        <!-- Bicep muscle peak -->
        <ellipse cx="352" cy="225" rx="14" ry="18" fill="url(#graniteRock)" stroke="#0f172a" stroke-width="3" />
      </g>

      <!-- STONE BLOCK HEAD -->
      <g id="character-head">
        <!-- Angular Granite Head -->
        <polygon points="196,155 256,140 316,155 322,235 256,245 190,235" fill="url(#graniteRock)" stroke="#0f172a" stroke-width="5" />

        <!-- Chiseled Brow -->
        <polygon points="205,175 256,185 307,175 302,192 256,200 210,192" fill="#52525b" stroke="#0f172a" stroke-width="3" />

        <!-- Glowing Blue Rune Eyes -->
        <g id="character-eyes">
          <polygon points="222,195 242,198 238,206 220,202" fill="#38bdf8" filter="drop-shadow(0 0 6px #38bdf8)" />
          <polygon points="290,195 270,198 274,206 292,202" fill="#38bdf8" filter="drop-shadow(0 0 6px #38bdf8)" />
        </g>

        <!-- Ferocious Stone Roar Mouth -->
        <polygon points="236,218 276,218 270,236 242,236" fill="#18181b" stroke="#0f172a" stroke-width="3" />
        <rect x="246" y="218" width="8" height="5" fill="#f8fafc" />
        <rect x="258" y="218" width="8" height="5" fill="#f8fafc" />

        <!-- CUTE PINK DAISY SPROUTED IN HEAD CRACK (ANIMATED SWAY) -->
        <g id="character-flower" class="daisy-anim">
          <!-- Green stem emerging from skull crack -->
          <path d="M266 148 Q270 125 264 105" stroke="#22c55e" stroke-width="4" fill="none" stroke-linecap="round" />
          <!-- Daisy Flower Petals -->
          <g transform="translate(264, 105)">
            <circle cx="0" cy="-10" r="6" fill="#f472b6" />
            <circle cx="10" cy="-3" r="6" fill="#f472b6" />
            <circle cx="7" cy="8" r="6" fill="#f472b6" />
            <circle cx="-7" cy="8" r="6" fill="#f472b6" />
            <circle cx="-10" cy="-3" r="6" fill="#f472b6" />
            <!-- Yellow Flower Center -->
            <circle cx="0" cy="0" r="6" fill="#facc15" stroke="#78350f" stroke-width="1.5" />
          </g>
        </g>
      </g>
    </g>
  `;

  return generateFrameSvg(inner, customDefs);
}

fs.writeFileSync(path.join(AVATARS_DIR, 'character_09_goblin_engineer.svg'), buildGoblinEngineer(), 'utf8');
console.log('✓ character_09_goblin_engineer.svg generated');

fs.writeFileSync(path.join(AVATARS_DIR, 'character_10_tiny_giant.svg'), buildTinyGiant(), 'utf8');
console.log('✓ character_10_tiny_giant.svg generated');
