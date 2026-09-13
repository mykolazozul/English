import fs from 'fs';
import path from 'path';
import { generateFrameSvg, AVATARS_DIR } from './svg-frame-template.mjs';

/* ==========================================================================
   3. CONFUSED TREE WARRIOR (character_03_confused_tree_warrior.svg)
   Comedic situation: Looking at his own wooden club with utter bewilderment,
   scratching his head while 3 apples bounce/juggle above his leafy branches!
   ========================================================================== */
function buildConfusedTreeWarrior() {
  const customDefs = `
    <radialGradient id="treeForestBg" cx="50%" cy="45%" r="70%">
      <stop offset="0%" stop-color="#15803d" />
      <stop offset="50%" stop-color="#14532d" />
      <stop offset="100%" stop-color="#052e16" />
    </radialGradient>
    <linearGradient id="barkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#78350f" />
      <stop offset="50%" stop-color="#92400e" />
      <stop offset="100%" stop-color="#451a03" />
    </linearGradient>
    <linearGradient id="appleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f87171" />
      <stop offset="40%" stop-color="#ef4444" />
      <stop offset="100%" stop-color="#991b1b" />
    </linearGradient>
  `;

  const inner = `
    <style>
      @keyframes headScratchAnim {
        0%, 100% { transform: rotate(0deg); }
        30% { transform: rotate(-18deg) translateY(-8px); }
        60% { transform: rotate(-5deg) translateY(-2px); }
        80% { transform: rotate(-15deg) translateY(-6px); }
      }
      @keyframes apple1Bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-34px); }
      }
      @keyframes apple2Bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-42px); }
      }
      @keyframes apple3Bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-28px); }
      }
      @keyframes treeBreathe {
        0%, 100% { transform: scale(1, 1); }
        50% { transform: scale(1.02, 0.98); }
      }
      @keyframes leafFlutter {
        0%, 100% { transform: rotate(0deg); }
        50% { transform: rotate(15deg) translateX(4px); }
      }
      .tree-actor { transform-origin: 256px 420px; animation: treeBreathe 3s ease-in-out infinite; }
      .scratch-arm { transform-origin: 320px 290px; animation: headScratchAnim 2s ease-in-out infinite; }
      .apple-1 { animation: apple1Bounce 1.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite; }
      .apple-2 { animation: apple2Bounce 1.6s 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite; }
      .apple-3 { animation: apple3Bounce 1.6s 1s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite; }
      .leaf-mote { transform-origin: center; animation: leafFlutter 2.5s ease-in-out infinite; }
    </style>

    <!-- FOREST BACKGROUND -->
    <g id="background">
      <rect x="44" y="44" width="424" height="424" fill="url(#treeForestBg)" />
      <!-- Floating leaves -->
      <path d="M120 160 Q135 145 150 160 Q135 175 120 160 Z" fill="#86efac" opacity="0.6" class="leaf-mote" />
      <path d="M380 200 Q395 185 410 200 Q395 215 380 200 Z" fill="#4ade80" opacity="0.5" class="leaf-mote" style="animation-delay: 1.2s;" />
    </g>

    <!-- CHARACTER SHADOW -->
    <g id="character-shadow">
      <ellipse cx="256" cy="435" rx="95" ry="24" fill="#000" opacity="0.5" />
    </g>

    <!-- WHOLE TREANT ACTOR -->
    <g id="character-animation" class="tree-actor">
      <!-- MOSS & ROOT LEGS -->
      <g id="character-legs">
        <path d="M190 380 Q210 395 200 435 L230 435 Q235 395 225 380 Z" fill="#78350f" stroke="#0f172a" stroke-width="4" />
        <path d="M280 380 Q270 395 285 435 L315 435 Q305 395 320 380 Z" fill="#78350f" stroke="#0f172a" stroke-width="4" />
        <ellipse cx="215" cy="432" rx="20" ry="8" fill="#22c55e" opacity="0.8" />
        <ellipse cx="300" cy="432" rx="20" ry="8" fill="#22c55e" opacity="0.8" />
      </g>

      <!-- MASSIVE TRUNK BODY -->
      <g id="character-body">
        <path d="M185 270 C165 340 175 395 256 395 C337 395 347 340 327 270 Z" fill="url(#barkGrad)" stroke="#0f172a" stroke-width="4.5" />
        <!-- Bark texture wood rings -->
        <path d="M220 310 Q256 330 292 310" stroke="#451a03" stroke-width="4" fill="none" stroke-linecap="round" />
        <path d="M210 345 Q256 365 302 345" stroke="#451a03" stroke-width="4" fill="none" stroke-linecap="round" />
        <!-- Moss shoulder pads -->
        <ellipse cx="190" cy="275" rx="26" ry="18" fill="#22c55e" stroke="#0f172a" stroke-width="3" />
        <ellipse cx="322" cy="275" rx="26" ry="18" fill="#22c55e" stroke="#0f172a" stroke-width="3" />
      </g>

      <!-- HEAD & ANTLER BRANCHES -->
      <g id="character-head">
        <!-- Wooden face block -->
        <ellipse cx="256" cy="220" rx="60" ry="54" fill="#92400e" stroke="#0f172a" stroke-width="4.5" />

        <!-- Asymmetrical Perplexed Eyebrows -->
        <path d="M218 190 Q235 180 248 196" stroke="#451a03" stroke-width="5" fill="none" stroke-linecap="round" />
        <path d="M264 200 Q278 184 294 186" stroke="#451a03" stroke-width="5" fill="none" stroke-linecap="round" />

        <!-- Bewildered Wide Eyes -->
        <g id="character-eyes">
          <ellipse cx="234" cy="214" rx="15" ry="19" fill="#fef08a" stroke="#0f172a" stroke-width="3.5" />
          <ellipse cx="278" cy="214" rx="15" ry="19" fill="#fef08a" stroke="#0f172a" stroke-width="3.5" />
          <!-- Pupils looking cross-eyed down at his weapon -->
          <circle cx="238" cy="218" r="6" fill="#0f172a" />
          <circle cx="274" cy="218" r="6" fill="#0f172a" />
          <circle cx="236" cy="215" r="2" fill="#fff" />
          <circle cx="272" cy="215" r="2" fill="#fff" />
        </g>

        <!-- Round Confused "O" Mouth -->
        <ellipse cx="256" cy="250" rx="11" ry="14" fill="#451a03" stroke="#0f172a" stroke-width="3" />

        <!-- Wooden branch antlers with leaf clusters -->
        <!-- Left Antler -->
        <path d="M220 180 C200 130 160 110 140 85 C165 95 180 120 200 145 C210 130 220 100 230 75 C235 105 230 135 226 170 Z" fill="#78350f" stroke="#0f172a" stroke-width="4" />
        <!-- Right Antler -->
        <path d="M292 180 C312 130 352 110 372 85 C347 95 332 120 312 145 C302 130 292 100 282 75 C277 105 282 135 286 170 Z" fill="#78350f" stroke="#0f172a" stroke-width="4" />
        <!-- Leaf clusters on head -->
        <circle cx="160" cy="110" r="16" fill="#22c55e" stroke="#0f172a" stroke-width="2.5" />
        <circle cx="215" cy="95" r="14" fill="#4ade80" stroke="#0f172a" stroke-width="2.5" />
        <circle cx="350" cy="110" r="16" fill="#22c55e" stroke="#0f172a" stroke-width="2.5" />
        <circle cx="295" cy="95" r="14" fill="#4ade80" stroke="#0f172a" stroke-width="2.5" />
      </g>

      <!-- JUGGLING APPLES (ANIMATED) -->
      <g id="character-effects">
        <!-- Apple 1 (Left) -->
        <g class="apple-1">
          <circle cx="175" cy="95" r="14" fill="url(#appleGrad)" stroke="#0f172a" stroke-width="2.5" />
          <path d="M175 81 Q178 72 182 74" stroke="#451a03" stroke-width="2" fill="none" />
          <ellipse cx="171" cy="91" rx="4" ry="7" fill="#fff" opacity="0.4" />
        </g>
        <!-- Apple 2 (Center High) -->
        <g class="apple-2">
          <circle cx="256" cy="68" r="15" fill="url(#appleGrad)" stroke="#0f172a" stroke-width="2.5" />
          <path d="M256 53 Q259 44 263 46" stroke="#451a03" stroke-width="2" fill="none" />
          <ellipse cx="252" cy="64" rx="4" ry="7" fill="#fff" opacity="0.4" />
        </g>
        <!-- Apple 3 (Right) -->
        <g class="apple-3">
          <circle cx="335" cy="95" r="14" fill="url(#appleGrad)" stroke="#0f172a" stroke-width="2.5" />
          <path d="M335 81 Q338 72 342 74" stroke="#451a03" stroke-width="2" fill="none" />
          <ellipse cx="331" cy="91" rx="4" ry="7" fill="#fff" opacity="0.4" />
        </g>
      </g>

      <!-- LEFT HAND HOLDING BROKEN CLUB (PUZZLED) -->
      <g id="character-weapon">
        <path d="M185 285 C140 300 120 330 115 365 C135 360 160 335 180 305 Z" fill="#78350f" stroke="#0f172a" stroke-width="4" />
        <!-- Broken wooden club -->
        <path d="M110 350 L75 320 L95 300 L130 335 Z" fill="#92400e" stroke="#0f172a" stroke-width="3.5" />
        <!-- Broken jagged splinters -->
        <polygon points="75,320 60,310 72,305 65,295 80,300" fill="#fde68a" stroke="#0f172a" stroke-width="2" />
        <!-- Wooden hand fist -->
        <circle cx="120" cy="345" r="16" fill="#92400e" stroke="#0f172a" stroke-width="3" />
      </g>

      <!-- RIGHT HAND SCRATCHING HEAD (ANIMATED) -->
      <g id="character-arms" class="scratch-arm">
        <path d="M325 285 C370 270 385 225 365 190 C345 200 335 240 315 275 Z" fill="#78350f" stroke="#0f172a" stroke-width="4" />
        <!-- Twig fingers scratching scalp -->
        <circle cx="360" cy="188" r="16" fill="#92400e" stroke="#0f172a" stroke-width="3" />
        <line x1="352" y1="178" x2="346" y2="168" stroke="#78350f" stroke-width="3.5" stroke-linecap="round" />
        <line x1="362" y1="174" x2="360" y2="162" stroke="#78350f" stroke-width="3.5" stroke-linecap="round" />
        <line x1="372" y1="178" x2="378" y2="168" stroke="#78350f" stroke-width="3.5" stroke-linecap="round" />
      </g>
    </g>
  `;

  return generateFrameSvg(inner, customDefs);
}

/* ==========================================================================
   4. OVERCONFIDENT KNIGHT (character_04_overconfident_knight.svg)
   Comedic situation: Posing proudly with a thumbs up, but his heavy steel
   helmet visor constantly slips down over his eyes (*CLANK*), and he has to flick it back up!
   ========================================================================== */
function buildOverconfidentKnight() {
  const customDefs = `
    <radialGradient id="knightArenaBg" cx="50%" cy="40%" r="70%">
      <stop offset="0%" stop-color="#4338ca" />
      <stop offset="50%" stop-color="#1e1b4b" />
      <stop offset="100%" stop-color="#090524" />
    </radialGradient>
    <linearGradient id="armorSteel" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f1f5f9" />
      <stop offset="40%" stop-color="#cbd5e1" />
      <stop offset="75%" stop-color="#64748b" />
      <stop offset="100%" stop-color="#334155" />
    </linearGradient>
    <linearGradient id="goldFiligree" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#fef08a" />
      <stop offset="50%" stop-color="#eab308" />
      <stop offset="100%" stop-color="#a16207" />
    </linearGradient>
  `;

  const inner = `
    <style>
      @keyframes visorSlipClank {
        0%, 35% { transform: translateY(0); }
        40% { transform: translateY(32px); } /* Clank down! */
        42% { transform: translateY(28px); } /* Rebound */
        44% { transform: translateY(32px); }
        75% { transform: translateY(32px); } /* Stays stuck down */
        82% { transform: translateY(-4px); } /* Head flick! */
        86%, 100% { transform: translateY(0); }
      }
      @keyframes capeFlutter {
        0%, 100% { transform: skewY(0deg) rotate(0deg); }
        50% { transform: skewY(-5deg) rotate(-3deg); }
      }
      @keyframes plumeFlutter {
        0%, 100% { transform: rotate(0deg); }
        50% { transform: rotate(8deg); }
      }
      @keyframes glintFlash {
        0%, 70%, 100% { transform: scale(0) rotate(0deg); opacity: 0; }
        75% { transform: scale(1.2) rotate(45deg); opacity: 1; }
        80% { transform: scale(0.2) rotate(90deg); opacity: 0; }
      }
      .visor-slip { animation: visorSlipClank 3.6s cubic-bezier(0.68, -0.55, 0.27, 1.55) infinite; }
      .cape-anim { transform-origin: 256px 260px; animation: capeFlutter 2s ease-in-out infinite; }
      .plume-anim { transform-origin: 256px 110px; animation: plumeFlutter 1.6s ease-in-out infinite; }
      .star-glint { transform-origin: 220px 320px; animation: glintFlash 3.6s ease-in-out infinite; }
    </style>

    <!-- ARENA BACKGROUND -->
    <g id="background">
      <rect x="44" y="44" width="424" height="424" fill="url(#knightArenaBg)" />
      <!-- Golden light rays -->
      <polygon points="256,44 180,468 220,468" fill="#facc15" opacity="0.12" />
      <polygon points="256,44 320,468 280,468" fill="#facc15" opacity="0.12" />
    </g>

    <!-- CAPE (BEHIND BODY) -->
    <g id="character-clothing" class="cape-anim">
      <path d="M180 270 C140 330 130 400 150 435 C200 420 230 430 256 425 C282 430 312 420 362 435 C382 400 372 330 332 270 Z" fill="#7e22ce" stroke="#0f172a" stroke-width="4" />
      <path d="M150 435 Q256 415 362 435 L350 445 Q256 425 160 445 Z" fill="url(#goldFiligree)" />
    </g>

    <!-- CHARACTER SHADOW -->
    <g id="character-shadow">
      <ellipse cx="256" cy="435" rx="85" ry="20" fill="#000" opacity="0.5" />
    </g>

    <!-- KNIGHT BODY -->
    <g id="character-animation">
      <!-- LEGS -->
      <g id="character-legs">
        <rect x="212" y="380" width="34" height="45" rx="8" fill="url(#armorSteel)" stroke="#0f172a" stroke-width="4" />
        <rect x="266" y="380" width="34" height="45" rx="8" fill="url(#armorSteel)" stroke="#0f172a" stroke-width="4" />
      </g>

      <!-- BREASTPLATE & SHOULDERS -->
      <g id="character-body">
        <!-- Puffed Out Chest Plate -->
        <path d="M185 270 Q256 255 327 270 L315 385 Q256 400 197 385 Z" fill="url(#armorSteel)" stroke="#0f172a" stroke-width="4.5" />
        <!-- Golden heraldic lion / sun crest -->
        <path d="M236 300 Q256 280 276 300 L268 340 Q256 355 244 340 Z" fill="url(#goldFiligree)" stroke="#78350f" stroke-width="2.5" />
        <!-- Big Round Pauldrons (Shoulder Guards) -->
        <circle cx="178" cy="275" r="26" fill="url(#armorSteel)" stroke="#0f172a" stroke-width="4" />
        <circle cx="334" cy="275" r="26" fill="url(#armorSteel)" stroke="#0f172a" stroke-width="4" />
        <circle cx="178" cy="275" r="14" fill="url(#goldFiligree)" />
        <circle cx="334" cy="275" r="14" fill="url(#goldFiligree)" />
      </g>

      <!-- STAR SHINE GLINT ON ARMOR -->
      <g class="star-glint">
        <polygon points="220,305 225,317 237,320 225,323 220,335 215,323 203,320 215,317" fill="#fff" />
      </g>

      <!-- THUMBS-UP GAUNTLET -->
      <g id="character-arms">
        <!-- Right arm resting on hip -->
        <path d="M180 285 Q150 330 175 365" fill="none" stroke="url(#armorSteel)" stroke-width="22" stroke-linecap="round" />
        <!-- Left arm giving enthusiastic Thumbs Up -->
        <path d="M330 285 Q375 320 360 350" fill="none" stroke="url(#armorSteel)" stroke-width="22" stroke-linecap="round" />
        <!-- Gauntlet Fist with Thumbs Up -->
        <g transform="translate(360, 335)">
          <circle cx="0" cy="0" r="16" fill="url(#goldFiligree)" stroke="#0f172a" stroke-width="3" />
          <!-- Thumb pointing up -->
          <rect x="-6" y="-24" width="12" height="18" rx="6" fill="url(#goldFiligree)" stroke="#0f172a" stroke-width="3" />
        </g>
      </g>

      <!-- HELMET & FACE COMPOSITION -->
      <g id="character-head">
        <!-- Plume of Feathers on Top -->
        <g class="plume-anim">
          <path d="M256 120 C230 60 280 40 310 50 C290 80 280 100 256 120 Z" fill="#ef4444" stroke="#0f172a" stroke-width="3" />
          <path d="M256 120 C240 70 290 60 325 75 C295 95 280 110 256 120 Z" fill="#facc15" stroke="#0f172a" stroke-width="3" />
        </g>

        <!-- Steel Great Helm -->
        <path d="M196 225 C196 145 316 145 316 225 C316 270 306 280 256 285 C206 280 196 270 196 225 Z" fill="url(#armorSteel)" stroke="#0f172a" stroke-width="4.5" />
        <!-- Gold helmet brow trim -->
        <rect x="194" y="195" width="124" height="14" rx="4" fill="url(#goldFiligree)" stroke="#0f172a" stroke-width="2.5" />

        <!-- Eyes visible beneath helmet (when visor is up) -->
        <g id="character-eyes">
          <ellipse cx="236" cy="225" rx="14" ry="12" fill="#fff" stroke="#0f172a" stroke-width="3" />
          <ellipse cx="276" cy="225" rx="14" ry="12" fill="#fff" stroke="#0f172a" stroke-width="3" />
          <circle cx="238" cy="225" r="6" fill="#2563eb" />
          <circle cx="278" cy="225" r="6" fill="#2563eb" />
          <!-- Smug smile under helmet opening -->
          <path d="M246 254 Q256 262 266 254" stroke="#78350f" stroke-width="3.5" fill="none" stroke-linecap="round" />
        </g>

        <!-- SLIPPING VISOR (ANIMATED CLANK) -->
        <g id="character-visor" class="visor-slip">
          <!-- The visor plate that falls down over the eye opening -->
          <path d="M190 195 C220 185 292 185 322 195 L318 245 C285 260 227 260 194 245 Z" fill="url(#armorSteel)" stroke="#0f172a" stroke-width="4" />
          <!-- Visor Vision Slits -->
          <rect x="216" y="215" width="32" height="6" rx="2" fill="#0f172a" />
          <rect x="264" y="215" width="32" height="6" rx="2" fill="#0f172a" />
          <!-- Breathing breath holes -->
          <circle cx="236" cy="235" r="2.5" fill="#0f172a" />
          <circle cx="248" cy="235" r="2.5" fill="#0f172a" />
          <circle cx="264" cy="235" r="2.5" fill="#0f172a" />
          <circle cx="276" cy="235" r="2.5" fill="#0f172a" />
          <!-- Big gold pivot screw on visor side -->
          <circle cx="194" cy="205" r="7" fill="url(#goldFiligree)" stroke="#0f172a" stroke-width="2" />
          <circle cx="318" cy="205" r="7" fill="url(#goldFiligree)" stroke="#0f172a" stroke-width="2" />
        </g>
      </g>
    </g>
  `;

  return generateFrameSvg(inner, customDefs);
}

fs.writeFileSync(path.join(AVATARS_DIR, 'character_03_confused_tree_warrior.svg'), buildConfusedTreeWarrior(), 'utf8');
console.log('✓ character_03_confused_tree_warrior.svg generated');

fs.writeFileSync(path.join(AVATARS_DIR, 'character_04_overconfident_knight.svg'), buildOverconfidentKnight(), 'utf8');
console.log('✓ character_04_overconfident_knight.svg generated');
