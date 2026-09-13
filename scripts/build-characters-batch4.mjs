import fs from 'fs';
import path from 'path';
import { generateFrameSvg, AVATARS_DIR } from './svg-frame-template.mjs';

/* ==========================================================================
   7. NINJA CAT (character_07_ninja_cat.svg)
   Comedic situation: Trying to look like a deadly, ultra-serious shinobi assassin,
   holding a fish kunai, but his fluffy tail is frantically twitching in excitement!
   ========================================================================== */
function buildNinjaCat() {
  const customDefs = `
    <radialGradient id="ninjaMoonBg" cx="65%" cy="35%" r="70%">
      <stop offset="0%" stop-color="#1e293b" />
      <stop offset="50%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#020617" />
    </radialGradient>
    <radialGradient id="fullMoonGrad" cx="40%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="80%" stop-color="#f8fafc" />
      <stop offset="100%" stop-color="#cbd5e1" />
    </radialGradient>
    <linearGradient id="catFur" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#334155" />
      <stop offset="50%" stop-color="#1e293b" />
      <stop offset="100%" stop-color="#090d16" />
    </linearGradient>
  `;

  const inner = `
    <style>
      @keyframes tailFrenzy {
        0%, 100% { transform: rotate(0deg); }
        20% { transform: rotate(24deg) scaleY(1.05); }
        40% { transform: rotate(-18deg); }
        60% { transform: rotate(28deg); }
        80% { transform: rotate(-12deg); }
      }
      @keyframes ribbonWave {
        0%, 100% { transform: rotate(0deg) skewX(0deg); }
        50% { transform: rotate(-16deg) skewX(-10deg); }
      }
      @keyframes earAlert {
        0%, 80%, 100% { transform: rotate(0deg); }
        85% { transform: rotate(-8deg); }
        90% { transform: rotate(6deg); }
      }
      @keyframes pupilNarrow {
        0%, 100% { transform: scaleX(1); }
        45%, 55% { transform: scaleX(0.35); }
      }
      .tail-anim { transform-origin: 190px 380px; animation: tailFrenzy 1.4s ease-in-out infinite; }
      .ribbon-anim { transform-origin: 310px 175px; animation: ribbonWave 0.9s ease-in-out infinite; }
      .left-ear-anim { transform-origin: 215px 170px; animation: earAlert 3s ease-in-out infinite; }
      .right-ear-anim { transform-origin: 295px 170px; animation: earAlert 3s 0.6s ease-in-out infinite; }
      .pupil-anim { transform-origin: center; animation: pupilNarrow 3.2s ease-in-out infinite; }
    </style>

    <!-- MOONLIT ROOFTOP BACKGROUND -->
    <g id="background">
      <rect x="44" y="44" width="424" height="424" fill="url(#ninjaMoonBg)" />
      <!-- Giant Crescent / Full Moon -->
      <circle cx="340" cy="140" r="60" fill="url(#fullMoonGrad)" filter="drop-shadow(0 0 16px rgba(255,255,255,0.4))" />
      <!-- Rooftop Tiles Silhouette -->
      <polygon points="44,468 44,420 200,380 340,410 468,390 468,468" fill="#020617" opacity="0.6" />
    </g>

    <!-- CHARACTER SHADOW -->
    <g id="character-shadow">
      <ellipse cx="256" cy="435" rx="85" ry="20" fill="#000" opacity="0.5" />
    </g>

    <!-- CRAZY TWITCHING TAIL (BEHIND BODY) -->
    <g id="character-tail" class="tail-anim">
      <path d="M190 380 C120 370 70 280 110 210 C125 210 135 240 120 270 C105 310 145 350 190 365 Z" fill="url(#catFur)" stroke="#0f172a" stroke-width="4" />
      <!-- White fluffy tail tip -->
      <path d="M110 210 C125 210 135 240 120 250 C105 240 100 220 110 210 Z" fill="#f8fafc" />
    </g>

    <!-- NINJA HEADBAND RIBBON TAILS (FLUTTERING) -->
    <g id="character-headband-tails" class="ribbon-anim">
      <path d="M305 175 C370 170 410 145 440 165 C410 185 360 195 305 185 Z" fill="#ef4444" stroke="#0f172a" stroke-width="3" />
      <path d="M305 182 C360 185 395 170 425 195 C395 205 350 205 305 190 Z" fill="#dc2626" stroke="#0f172a" stroke-width="2.5" />
    </g>

    <!-- NINJA CAT BODY -->
    <g id="character-animation">
      <!-- Shinobi Vest & Body -->
      <g id="character-body">
        <!-- Sleek Black Cat Body -->
        <ellipse cx="256" cy="330" rx="68" ry="72" fill="url(#catFur)" stroke="#0f172a" stroke-width="4.5" />
        <!-- Dark Shinobi Gi Tunic -->
        <path d="M210 270 L256 340 L302 270 L315 375 L197 375 Z" fill="#0f172a" stroke="#334155" stroke-width="3" />
        <!-- Red Belt Sash -->
        <rect x="200" y="350" width="112" height="16" rx="4" fill="#ef4444" stroke="#0f172a" stroke-width="2.5" />
        <!-- Silver Shuriken on Sash -->
        <polygon points="256,350 260,358 268,358 262,364 264,372 256,366 248,372 250,364 244,358 252,358" fill="#cbd5e1" stroke="#0f172a" stroke-width="1.5" />
      </g>

      <!-- PAWS HOLDING FISH KUNAI DAGGER -->
      <g id="character-weapon">
        <!-- Paws -->
        <circle cx="215" cy="325" r="16" fill="url(#catFur)" stroke="#0f172a" stroke-width="3.5" />
        <circle cx="275" cy="315" r="16" fill="url(#catFur)" stroke="#0f172a" stroke-width="3.5" />
        
        <!-- Shiny Silver Fish Kunai Dagger -->
        <g transform="translate(230, 280) rotate(-35)">
          <!-- Fish Blade Body -->
          <path d="M0 0 C25 -10 60 -5 85 0 C60 5 25 10 0 0 Z" fill="#94a3b8" stroke="#0f172a" stroke-width="3" />
          <!-- Fish Tail Fin -->
          <polygon points="85,0 105,-15 95,0 105,15" fill="#64748b" stroke="#0f172a" stroke-width="2.5" />
          <!-- Fish Eye on Kunai -->
          <circle cx="20" cy="0" r="4" fill="#facc15" stroke="#0f172a" stroke-width="1.5" />
          <!-- Handle Wrap -->
          <rect x="-30" y="-5" width="30" height="10" rx="3" fill="#78350f" stroke="#0f172a" stroke-width="2" />
          <!-- Kunai Ring at End -->
          <circle cx="-35" cy="0" r="8" fill="none" stroke="#64748b" stroke-width="3.5" />
        </g>
      </g>

      <!-- HEAD & EARS COMPOSITION -->
      <g id="character-head">
        <!-- Pointy Cat Ears (ANIMATED TWITCH) -->
        <g class="left-ear-anim">
          <polygon points="195,190 205,115 240,165" fill="url(#catFur)" stroke="#0f172a" stroke-width="4" />
          <polygon points="205,180 210,130 232,165" fill="#f472b6" opacity="0.6" />
        </g>
        <g class="right-ear-anim">
          <polygon points="317,190 307,115 272,165" fill="url(#catFur)" stroke="#0f172a" stroke-width="4" />
          <polygon points="307,180 302,130 280,165" fill="#f472b6" opacity="0.6" />
        </g>

        <!-- Round Cat Head -->
        <ellipse cx="256" cy="210" rx="64" ry="54" fill="url(#catFur)" stroke="#0f172a" stroke-width="4.5" />

        <!-- Red Ninja Forehead Band -->
        <path d="M198 185 Q256 175 314 185 L312 205 Q256 195 200 205 Z" fill="#ef4444" stroke="#0f172a" stroke-width="3" />
        <ellipse cx="256" cy="190" rx="14" ry="7" fill="#cbd5e1" stroke="#0f172a" stroke-width="2" />

        <!-- Big Luminous Golden Cat Eyes (ANIMATED SLIT NARROWING) -->
        <g id="character-eyes">
          <ellipse cx="230" cy="215" rx="18" ry="16" fill="#facc15" stroke="#0f172a" stroke-width="3.5" />
          <ellipse cx="282" cy="215" rx="18" ry="16" fill="#facc15" stroke="#0f172a" stroke-width="3.5" />
          <!-- Pupils (ANIMATED SLITS) -->
          <g class="pupil-anim">
            <ellipse cx="230" cy="215" rx="5" ry="14" fill="#0f172a" />
            <ellipse cx="282" cy="215" rx="5" ry="14" fill="#0f172a" />
          </g>
          <!-- Eye highlights -->
          <circle cx="226" cy="210" r="3" fill="#fff" />
          <circle cx="278" cy="210" r="3" fill="#fff" />
        </g>

        <!-- Tiny Pink Nose & Whiskers -->
        <polygon points="256,230 250,224 262,224" fill="#f472b6" stroke="#0f172a" stroke-width="1.5" />
        <!-- Ninja Mask Cloth covering mouth -->
        <path d="M225 235 Q256 240 287 235 L280 260 Q256 268 232 260 Z" fill="#0f172a" stroke="#334155" stroke-width="2.5" />
        
        <!-- Whiskers -->
        <line x1="205" y1="230" x2="165" y2="225" stroke="#f8fafc" stroke-width="2.5" stroke-linecap="round" />
        <line x1="205" y1="240" x2="160" y2="245" stroke="#f8fafc" stroke-width="2.5" stroke-linecap="round" />
        <line x1="307" y1="230" x2="347" y2="225" stroke="#f8fafc" stroke-width="2.5" stroke-linecap="round" />
        <line x1="307" y1="240" x2="352" y2="245" stroke="#f8fafc" stroke-width="2.5" stroke-linecap="round" />
      </g>
    </g>
  `;

  return generateFrameSvg(inner, customDefs);
}

/* ==========================================================================
   8. PIRATE FROG (character_08_pirate_frog.svg)
   Comedic situation: Serious pirate captain in a grand tricorn hat, with a skull
   eyepatch and gold cutlass, but his long tongue keeps zipping out to catch a fly!
   ========================================================================== */
function buildPirateFrog() {
  const customDefs = `
    <radialGradient id="pirateCoveBg" cx="50%" cy="45%" r="70%">
      <stop offset="0%" stop-color="#0f766e" />
      <stop offset="55%" stop-color="#042f2e" />
      <stop offset="100%" stop-color="#011616" />
    </radialGradient>
    <linearGradient id="frogSkin" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#84cc16" />
      <stop offset="50%" stop-color="#65a30d" />
      <stop offset="100%" stop-color="#3f6212" />
    </linearGradient>
    <linearGradient id="goldCutlass" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a" />
      <stop offset="50%" stop-color="#eab308" />
      <stop offset="100%" stop-color="#a16207" />
    </linearGradient>
  `;

  const inner = `
    <style>
      @keyframes throatCroak {
        0%, 100% { transform: scale(1, 1); }
        35% { transform: scale(1.18, 1.15) translateY(4px); }
        45% { transform: scale(0.96, 0.98); }
      }
      @keyframes tongueSnap {
        0%, 55%, 100% { transform: scaleX(0); opacity: 0; }
        60% { transform: scaleX(1); opacity: 1; }
        65% { transform: scaleX(0.2); opacity: 0; }
      }
      @keyframes flyBuzzLoop {
        0% { transform: translate(320px, 140px); }
        25% { transform: translate(350px, 115px); }
        50% { transform: translate(380px, 150px); }
        75% { transform: translate(335px, 170px); }
        100% { transform: translate(320px, 140px); }
      }
      @keyframes earringSwing {
        0%, 100% { transform: rotate(0deg); }
        50% { transform: rotate(18deg); }
      }
      .throat-puff { transform-origin: 256px 285px; animation: throatCroak 2.8s ease-in-out infinite; }
      .tongue-anim { transform-origin: 256px 255px; animation: tongueSnap 2.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite; }
      .fly-group { animation: flyBuzzLoop 2.8s linear infinite; }
      .earring-anim { transform-origin: 175px 230px; animation: earringSwing 1.8s ease-in-out infinite; }
    </style>

    <!-- PIRATE LAGOON BACKGROUND -->
    <g id="background">
      <rect x="44" y="44" width="424" height="424" fill="url(#pirateCoveBg)" />
      <!-- Tropical Bubbles -->
      <circle cx="120" cy="160" r="12" fill="none" stroke="#5eead4" stroke-width="2" opacity="0.4" />
      <circle cx="390" cy="380" r="16" fill="none" stroke="#5eead4" stroke-width="2" opacity="0.4" />
    </g>

    <!-- BUZZING CARTOON FLY -->
    <g id="character-effects" class="fly-group">
      <!-- Wings blur -->
      <ellipse cx="-4" cy="-5" rx="7" ry="4" fill="#e2e8f0" opacity="0.7" />
      <ellipse cx="4" cy="-5" rx="7" ry="4" fill="#e2e8f0" opacity="0.7" />
      <circle cx="0" cy="0" r="5" fill="#0f172a" />
    </g>

    <!-- CHARACTER SHADOW -->
    <g id="character-shadow">
      <ellipse cx="256" cy="435" rx="90" ry="20" fill="#000" opacity="0.5" />
    </g>

    <!-- FROG BODY -->
    <g id="character-body">
      <!-- Big Round Green Frog Body -->
      <ellipse cx="256" cy="350" rx="78" ry="70" fill="url(#frogSkin)" stroke="#0f172a" stroke-width="4.5" />
      
      <!-- Crimson Captain Frock Coat -->
      <path d="M190 280 L160 410 L220 420 L240 350 L256 360 L272 350 L292 420 L352 410 L322 280 Z" fill="#991b1b" stroke="#0f172a" stroke-width="4" />
      <!-- Gold Coat Buttons -->
      <circle cx="210" cy="340" r="5" fill="#facc15" stroke="#78350f" stroke-width="1.5" />
      <circle cx="215" cy="375" r="5" fill="#facc15" stroke="#78350f" stroke-width="1.5" />
      <circle cx="302" cy="340" r="5" fill="#facc15" stroke="#78350f" stroke-width="1.5" />
      <circle cx="297" cy="375" r="5" fill="#facc15" stroke="#78350f" stroke-width="1.5" />
      <!-- White Ruffled Jabot Cravat -->
      <path d="M244 285 L268 285 L264 330 L256 335 L248 330 Z" fill="#f8fafc" stroke="#0f172a" stroke-width="2.5" />
    </g>

    <!-- GOLD CUTLASS WEAPON -->
    <g id="character-weapon">
      <!-- Frog webbed hand holding blade -->
      <circle cx="160" cy="330" r="16" fill="url(#frogSkin)" stroke="#0f172a" stroke-width="3" />
      <!-- Golden Curved Cutlass -->
      <g transform="translate(145, 330) rotate(-55)">
        <path d="M0 -15 C20 -40 50 -80 30 -120 C10 -90 -10 -50 0 -15 Z" fill="url(#goldCutlass)" stroke="#0f172a" stroke-width="3.5" />
        <!-- Handguard -->
        <path d="M-12 -12 Q-20 10 5 8" stroke="#ca8a04" stroke-width="6" fill="none" />
        <!-- Handle -->
        <rect x="-4" y="-8" width="8" height="22" rx="3" fill="#78350f" stroke="#0f172a" stroke-width="2" />
      </g>
    </g>

    <!-- FROG HEAD & THROAT SAC -->
    <g id="character-head">
      <!-- Throat Sac (INFLATES ON CROAK) -->
      <ellipse cx="256" cy="285" rx="46" ry="32" fill="#bef264" stroke="#0f172a" stroke-width="3.5" class="throat-puff" />

      <!-- Main Wide Frog Head -->
      <ellipse cx="256" cy="225" rx="78" ry="46" fill="url(#frogSkin)" stroke="#0f172a" stroke-width="4.5" />

      <!-- Massive Bulbous Left Eye (Looking at fly) -->
      <g id="character-eyes">
        <circle cx="305" cy="180" r="28" fill="url(#frogSkin)" stroke="#0f172a" stroke-width="4" />
        <circle cx="305" cy="180" r="21" fill="#fef08a" stroke="#0f172a" stroke-width="3" />
        <circle cx="312" cy="174" r="9" fill="#0f172a" />
        <circle cx="310" cy="170" r="3" fill="#fff" />
      </g>

      <!-- Right Eye with Skull Eyepatch -->
      <g id="character-eyepatch">
        <circle cx="207" cy="180" r="28" fill="url(#frogSkin)" stroke="#0f172a" stroke-width="4" />
        <!-- Black Eyepatch Dome -->
        <circle cx="207" cy="180" r="22" fill="#0f172a" stroke="#334155" stroke-width="3" />
        <!-- Eyepatch Strap -->
        <line x1="160" y1="195" x2="256" y2="165" stroke="#0f172a" stroke-width="4" />
        <!-- Mini skull emblem on eyepatch -->
        <circle cx="207" cy="178" r="7" fill="#fff" />
        <rect x="204" y="184" width="6" height="4" fill="#fff" />
      </g>

      <!-- Golden Earring (ANIMATED SWING) -->
      <g class="earring-anim">
        <circle cx="168" cy="240" r="10" fill="none" stroke="#eab308" stroke-width="4" />
      </g>

      <!-- Mouth Line -->
      <path d="M195 255 Q256 270 317 255" stroke="#3f6212" stroke-width="5" fill="none" stroke-linecap="round" />

      <!-- LONG SNAPPING TONGUE (ANIMATED) -->
      <g id="character-mouth" class="tongue-anim">
        <path d="M256 255 Q300 210 340 160" stroke="#f43f5e" stroke-width="12" fill="none" stroke-linecap="round" />
        <!-- Sticky tip -->
        <circle cx="342" cy="158" r="10" fill="#e11d48" />
      </g>

      <!-- GRAND PIRATE TRICORN HAT -->
      <g id="character-hat">
        <!-- Tricorn Crown -->
        <path d="M160 170 C160 110 352 110 352 170 Z" fill="#1e293b" stroke="#0f172a" stroke-width="4" />
        <!-- Tricorn Upturned Brims -->
        <path d="M140 180 C180 120 332 120 372 180 C390 120 360 80 256 75 C152 80 122 120 140 180 Z" fill="#0f172a" stroke="#475569" stroke-width="3.5" />
        <!-- Gold Trim on Hat -->
        <path d="M142 175 C180 125 332 125 370 175" stroke="#eab308" stroke-width="4" fill="none" />
        <!-- White Feather Plumage -->
        <path d="M290 110 Q340 80 370 95 Q340 115 290 110 Z" fill="#f8fafc" stroke="#0f172a" stroke-width="2.5" />
      </g>
    </g>
  `;

  return generateFrameSvg(inner, customDefs);
}

fs.writeFileSync(path.join(AVATARS_DIR, 'character_07_ninja_cat.svg'), buildNinjaCat(), 'utf8');
console.log('✓ character_07_ninja_cat.svg generated');

fs.writeFileSync(path.join(AVATARS_DIR, 'character_08_pirate_frog.svg'), buildPirateFrog(), 'utf8');
console.log('✓ character_08_pirate_frog.svg generated');
