import fs from 'fs';
import path from 'path';
import { generateFrameSvg, AVATARS_DIR } from './svg-frame-template.mjs';

/* ==========================================================================
   11. CHICKEN WARRIOR (character_11_chicken_warrior.svg)
   Comedic situation: A rooster in a Greek Spartan helmet with a toothpick spear
   and bottlecap shield, trying to look brave while his knees knock in pure terror!
   ========================================================================== */
function buildChickenWarrior() {
  const customDefs = `
    <radialGradient id="spartanDawnBg" cx="50%" cy="40%" r="70%">
      <stop offset="0%" stop-color="#991b1b" />
      <stop offset="50%" stop-color="#450a0a" />
      <stop offset="100%" stop-color="#1c0505" />
    </radialGradient>
    <linearGradient id="spartanBronze" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fde047" />
      <stop offset="45%" stop-color="#d97706" />
      <stop offset="100%" stop-color="#78350f" />
    </linearGradient>
  `;

  const inner = `
    <style>
      @keyframes kneesKnocking {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-8px); }
        50% { transform: translateX(8px); }
        75% { transform: translateX(-6px); }
      }
      @keyframes spearTrembleAnim {
        0%, 100% { transform: rotate(0deg); }
        20% { transform: rotate(-5deg); }
        40% { transform: rotate(6deg); }
        60% { transform: rotate(-4deg); }
        80% { transform: rotate(5deg); }
      }
      @keyframes combWobbleAnim {
        0%, 100% { transform: rotate(0deg); }
        50% { transform: rotate(12deg); }
      }
      @keyframes featherDrift {
        0% { transform: translate(0, 0) rotate(0deg); opacity: 0.8; }
        100% { transform: translate(-30px, 90px) rotate(45deg); opacity: 0; }
      }
      .legs-knock { animation: kneesKnocking 0.25s linear infinite; }
      .spear-tremble { transform-origin: 340px 320px; animation: spearTrembleAnim 0.3s ease-in-out infinite; }
      .comb-wobble { transform-origin: 256px 120px; animation: combWobbleAnim 1.4s ease-in-out infinite; }
      .feather-anim { animation: featherDrift 3.5s ease-out infinite; }
    </style>

    <!-- BATTLEFIELD DAWN BACKGROUND -->
    <g id="background">
      <rect x="44" y="44" width="424" height="424" fill="url(#spartanDawnBg)" />
      <!-- Drifting battle dust / feathers -->
      <path d="M120 180 Q130 160 140 180 Q130 200 120 180 Z" fill="#fff" opacity="0.6" class="feather-anim" />
      <path d="M380 240 Q390 220 400 240 Q390 260 380 240 Z" fill="#fff" opacity="0.5" class="feather-anim" style="animation-delay: 1.8s;" />
    </g>

    <!-- CHARACTER SHADOW -->
    <g id="character-shadow">
      <ellipse cx="256" cy="435" rx="85" ry="18" fill="#000" opacity="0.5" />
    </g>

    <!-- ROOSTER ACTOR -->
    <g id="character-animation">
      <!-- KNOCKING CHICKEN LEGS (ANIMATED TREMBLING) -->
      <g id="character-legs" class="legs-knock">
        <!-- Thin yellow spindly bird legs -->
        <line x1="230" y1="375" x2="242" y2="430" stroke="#eab308" stroke-width="6" stroke-linecap="round" />
        <line x1="282" y1="375" x2="270" y2="430" stroke="#eab308" stroke-width="6" stroke-linecap="round" />
        <!-- Knees knocking point -->
        <circle cx="256" cy="405" r="7" fill="#ca8a04" opacity="0.7" />
        <!-- Bird feet with 3 claws -->
        <path d="M232 430 L242 430 L248 435 M242 430 L242 438" stroke="#ca8a04" stroke-width="4" stroke-linecap="round" />
        <path d="M260 430 L270 430 L276 435 M270 430 L270 438" stroke="#ca8a04" stroke-width="4" stroke-linecap="round" />
      </g>

      <!-- ROOSTER BODY -->
      <g id="character-body">
        <!-- Plump White Feather Body -->
        <ellipse cx="256" cy="325" rx="68" ry="62" fill="#f8fafc" stroke="#0f172a" stroke-width="4.5" />
        <!-- Bronze Cuirass Chest Guard -->
        <path d="M216 295 Q256 285 296 295 L288 360 Q256 372 224 360 Z" fill="url(#spartanBronze)" stroke="#0f172a" stroke-width="3.5" />
      </g>

      <!-- BOTTLECAP SHIELD (LEFT WING) -->
      <g id="character-shield">
        <!-- White wing holding shield -->
        <circle cx="185" cy="330" r="18" fill="#f8fafc" stroke="#0f172a" stroke-width="3" />
        <!-- Corrugated Metal Soda Bottlecap Shield -->
        <circle cx="170" cy="340" r="38" fill="#cbd5e1" stroke="#0f172a" stroke-width="4" />
        <circle cx="170" cy="340" r="30" fill="#ef4444" stroke="#0f172a" stroke-width="2.5" />
        <!-- Scratched Rooster Claw Crest on Shield -->
        <path d="M170 322 L170 358 M170 340 L158 352 M170 340 L182 352" stroke="#fff" stroke-width="4" stroke-linecap="round" />
      </g>

      <!-- TOOTHPICK SPEAR (RIGHT WING - ANIMATED TREMBLE) -->
      <g id="character-weapon" class="spear-tremble">
        <!-- White wing holding spear -->
        <circle cx="320" cy="325" r="18" fill="#f8fafc" stroke="#0f172a" stroke-width="3" />
        <!-- Sharpened Wooden Toothpick Spear -->
        <line x1="330" y1="410" x2="365" y2="170" stroke="#78350f" stroke-width="7" stroke-linecap="round" />
        <!-- Spear Tip -->
        <polygon points="365,170 356,190 374,190" fill="#cbd5e1" stroke="#0f172a" stroke-width="2.5" />
      </g>

      <!-- ROOSTER HEAD & SPARTAN HELMET -->
      <g id="character-head">
        <!-- White Feather Head -->
        <ellipse cx="256" cy="220" rx="55" ry="50" fill="#f8fafc" stroke="#0f172a" stroke-width="4" />

        <!-- Red Wattle Hanging Down (WOBBLES) -->
        <g class="comb-wobble">
          <ellipse cx="248" cy="272" rx="10" ry="18" fill="#ef4444" stroke="#0f172a" stroke-width="2.5" />
          <ellipse cx="264" cy="272" rx="10" ry="18" fill="#ef4444" stroke="#0f172a" stroke-width="2.5" />
        </g>

        <!-- Screeching Yellow Beak -->
        <g id="character-mouth">
          <!-- Open Beak in Panic Crow -->
          <polygon points="236,240 256,225 276,240 256,262" fill="#facc15" stroke="#0f172a" stroke-width="3.5" />
          <ellipse cx="256" cy="245" rx="10" ry="8" fill="#78350f" />
        </g>

        <!-- Panicked Wide Cartoon Eyes -->
        <g id="character-eyes">
          <circle cx="232" cy="215" r="15" fill="#fff" stroke="#0f172a" stroke-width="3.5" />
          <circle cx="280" cy="215" r="15" fill="#fff" stroke="#0f172a" stroke-width="3.5" />
          <!-- Pinpoint terrified pupils -->
          <circle cx="234" cy="215" r="4.5" fill="#0f172a" />
          <circle cx="278" cy="215" r="4.5" fill="#0f172a" />
        </g>

        <!-- SPARTAN CORINTHIAN HELMET -->
        <g id="character-helmet">
          <!-- Tall Red Horsehair Crest (WOBBLES) -->
          <g class="comb-wobble">
            <path d="M256 125 C230 60 280 40 310 50 C290 80 280 110 256 125 Z" fill="#dc2626" stroke="#0f172a" stroke-width="3.5" />
            <!-- Crest holder arch -->
            <path d="M225 155 Q256 130 287 155" stroke="url(#spartanBronze)" stroke-width="12" fill="none" stroke-linecap="round" />
          </g>

          <!-- Bronze Helmet Dome -->
          <path d="M205 210 C205 145 307 145 307 210 L302 245 L288 245 L288 220 L224 220 L224 245 L210 245 Z" fill="url(#spartanBronze)" stroke="#0f172a" stroke-width="4" />
          <!-- Nose Guard -->
          <rect x="252" y="195" width="8" height="28" rx="2" fill="#b45309" stroke="#0f172a" stroke-width="2" />
        </g>
      </g>
    </g>
  `;

  return generateFrameSvg(inner, customDefs);
}

/* ==========================================================================
   12. ALIEN COWBOY (character_12_alien_cowboy.svg)
   Comedic situation: Three-eyed cyan alien cowboy twirling neon rayguns,
   winking his third top eye while riding a bouncy, smiling pink space slug!
   ========================================================================== */
function buildAlienCowboy() {
  const customDefs = `
    <radialGradient id="alienNebulaBg" cx="50%" cy="40%" r="70%">
      <stop offset="0%" stop-color="#4c1d95" />
      <stop offset="50%" stop-color="#1e1b4b" />
      <stop offset="100%" stop-color="#050314" />
    </radialGradient>
    <linearGradient id="alienSkin" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2dd4bf" />
      <stop offset="50%" stop-color="#14b8a6" />
      <stop offset="100%" stop-color="#0f766e" />
    </linearGradient>
    <linearGradient id="cowboyHat" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#92400e" />
      <stop offset="50%" stop-color="#78350f" />
      <stop offset="100%" stop-color="#451a03" />
    </linearGradient>
    <linearGradient id="slugPink" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#f472b6" />
      <stop offset="100%" stop-color="#db2777" />
    </linearGradient>
  `;

  const inner = `
    <style>
      @keyframes slugBounceAnim {
        0%, 100% { transform: scale(1, 1); }
        50% { transform: scale(1.08, 0.92) translateY(4px); }
      }
      @keyframes gunSpinAnim {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      @keyframes thirdEyeWinkAnim {
        0%, 80%, 100% { transform: scaleY(1); }
        85%, 95% { transform: scaleY(0.1); }
      }
      @keyframes antennaBobAnim {
        0%, 100% { transform: rotate(0deg); }
        50% { transform: rotate(14deg); }
      }
      .slug-bounce { transform-origin: 256px 420px; animation: slugBounceAnim 1.6s ease-in-out infinite; }
      .gun-spin { transform-origin: 360px 305px; animation: gunSpinAnim 1.8s linear infinite; }
      .third-eye-wink { transform-origin: 256px 172px; animation: thirdEyeWinkAnim 3s ease-in-out infinite; }
      .antenna-anim { transform-origin: 220px 145px; animation: antennaBobAnim 1.8s ease-in-out infinite; }
    </style>

    <!-- COSMIC CANYON BACKGROUND -->
    <g id="background">
      <rect x="44" y="44" width="424" height="424" fill="url(#alienNebulaBg)" />
      <!-- Alien Double Moons -->
      <circle cx="110" cy="115" r="22" fill="#06b6d4" opacity="0.6" filter="drop-shadow(0 0 10px #06b6d4)" />
      <circle cx="390" cy="95" r="14" fill="#a855f7" opacity="0.5" />
    </g>

    <!-- CHARACTER SHADOW -->
    <g id="character-shadow">
      <ellipse cx="256" cy="435" rx="100" ry="20" fill="#000" opacity="0.5" />
    </g>

    <!-- SQUISHY PINK ALIEN SLUG-STEED (BOUNCING) -->
    <g id="character-mount" class="slug-bounce">
      <!-- Slug Body -->
      <path d="M150 425 C140 370 200 350 256 350 C312 350 372 370 362 425 C340 445 172 445 150 425 Z" fill="url(#slugPink)" stroke="#0f172a" stroke-width="4.5" />
      <!-- Slug Eyestalk & Happy Cyclops Eye -->
      <path d="M175 365 Q155 330 165 315" stroke="url(#slugPink)" stroke-width="12" fill="none" stroke-linecap="round" />
      <circle cx="165" cy="310" r="14" fill="#fff" stroke="#0f172a" stroke-width="3" />
      <circle cx="166" cy="310" r="6" fill="#3b82f6" />
      <!-- Slug Cute Smile -->
      <path d="M185 390 Q205 405 225 390" stroke="#831843" stroke-width="3" fill="none" stroke-linecap="round" />
    </g>

    <!-- ALIEN COWBOY ACTOR -->
    <g id="character-animation">
      <!-- Torso & Leather Chaps -->
      <g id="character-body">
        <ellipse cx="256" cy="295" rx="46" ry="52" fill="url(#alienSkin)" stroke="#0f172a" stroke-width="4" />
        <!-- Red Bandana -->
        <polygon points="236,258 276,258 256,285" fill="#ef4444" stroke="#0f172a" stroke-width="2.5" />
        <!-- Sheriff Star Badge -->
        <polygon points="242,282 245,288 252,289 247,294 248,301 242,297 236,301 237,294 232,289 239,288" fill="#facc15" stroke="#78350f" stroke-width="1" />
      </g>

      <!-- NEON LASER REVOLVER (RIGHT HAND - ANIMATED TRICK SPIN) -->
      <g id="character-weapon" class="gun-spin">
        <!-- Raygun body -->
        <rect x="340" y="300" width="38" height="12" rx="4" fill="#06b6d4" stroke="#0f172a" stroke-width="3" />
        <!-- Revolver handle -->
        <rect x="340" y="310" width="10" height="20" rx="3" fill="#ca8a04" stroke="#0f172a" stroke-width="2" />
        <!-- Neon Glow Barrel Fins -->
        <line x1="365" y1="296" x2="365" y2="316" stroke="#38bdf8" stroke-width="4" />
        <line x1="375" y1="296" x2="375" y2="316" stroke="#38bdf8" stroke-width="4" />
        <!-- Muzzle tip spark -->
        <circle cx="382" cy="306" r="4" fill="#67e8f9" filter="drop-shadow(0 0 6px #38bdf8)" />
      </g>

      <!-- LEFT HAND RAYGUN -->
      <g transform="translate(170, 310)">
        <rect x="-38" y="-6" width="38" height="12" rx="4" fill="#06b6d4" stroke="#0f172a" stroke-width="3" />
        <rect x="-10" y="4" width="10" height="20" rx="3" fill="#ca8a04" stroke="#0f172a" stroke-width="2" />
        <circle cx="-16" cy="0" r="14" fill="url(#alienSkin)" stroke="#0f172a" stroke-width="3" />
      </g>

      <!-- ALIEN HEAD & COWBOY HAT -->
      <g id="character-head">
        <!-- Cute Antenna Bobs under hat -->
        <g class="antenna-anim">
          <line x1="220" y1="160" x2="205" y2="125" stroke="url(#alienSkin)" stroke-width="5" stroke-linecap="round" />
          <circle cx="205" cy="120" r="8" fill="#facc15" stroke="#0f172a" stroke-width="2" />
        </g>

        <!-- Alien Turquoise Head -->
        <ellipse cx="256" cy="205" rx="55" ry="50" fill="url(#alienSkin)" stroke="#0f172a" stroke-width="4" />

        <!-- 3 GLOWING PURPLE EYES -->
        <g id="character-eyes">
          <!-- Lower Left Eye -->
          <circle cx="234" cy="210" r="14" fill="#c084fc" stroke="#0f172a" stroke-width="3" />
          <circle cx="236" cy="210" r="6" fill="#4c1d95" />
          <circle cx="234" cy="207" r="2.5" fill="#fff" />

          <!-- Lower Right Eye -->
          <circle cx="278" cy="210" r="14" fill="#c084fc" stroke="#0f172a" stroke-width="3" />
          <circle cx="276" cy="210" r="6" fill="#4c1d95" />
          <circle cx="274" cy="207" r="2.5" fill="#fff" />

          <!-- TOP THIRD FOREHEAD EYE (ANIMATED WINK) -->
          <g class="third-eye-wink">
            <circle cx="256" cy="175" r="15" fill="#f472b6" stroke="#0f172a" stroke-width="3" />
            <circle cx="256" cy="175" r="6.5" fill="#831843" />
            <circle cx="254" cy="172" r="3" fill="#fff" />
          </g>
        </g>

        <!-- Cute Smirk Mouth -->
        <path d="M246 235 Q258 245 272 236" stroke="#065f46" stroke-width="3.5" fill="none" stroke-linecap="round" />

        <!-- TALL TEN-GALLON STETSON COWBOY HAT -->
        <g id="character-hat">
          <!-- Hat Curled Wide Brim -->
          <path d="M165 170 C190 145 322 145 347 170 C360 178 335 185 256 185 C177 185 152 178 165 170 Z" fill="url(#cowboyHat)" stroke="#0f172a" stroke-width="4" />
          <!-- Neon Turquoise Hat Band -->
          <rect x="214" y="145" width="84" height="12" rx="3" fill="#2dd4bf" stroke="#0f172a" stroke-width="2" />
          <!-- Tall Crown with Creased Top -->
          <path d="M214 148 C210 90 236 70 256 80 C276 70 302 90 298 148 Z" fill="url(#cowboyHat)" stroke="#0f172a" stroke-width="4" />
        </g>
      </g>
    </g>
  `;

  return generateFrameSvg(inner, customDefs);
}

/* ==========================================================================
   MASTER GAME LOGO (public/logo.svg & public/brand_logo.svg)
   Comedic/Heroic English Flow Mascot: Wise Owl-Knight Scholar with
   winged golden helmet, open spellbook with glowing ABC letters, magical aura!
   ========================================================================== */
function buildMasterGameLogo() {
  const customDefs = `
    <radialGradient id="logoArcaneBg" cx="50%" cy="40%" r="70%">
      <stop offset="0%" stop-color="#0284c7" />
      <stop offset="45%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#020617" />
    </radialGradient>
    <linearGradient id="owlFeathers" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="50%" stop-color="#0284c7" />
      <stop offset="100%" stop-color="#0369a1" />
    </linearGradient>
    <linearGradient id="goldHelm" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a" />
      <stop offset="45%" stop-color="#eab308" />
      <stop offset="100%" stop-color="#a16207" />
    </linearGradient>
    <linearGradient id="bookCover" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f97316" />
      <stop offset="100%" stop-color="#c2410c" />
    </linearGradient>
  `;

  const inner = `
    <style>
      @keyframes bookGlowPulse {
        0%, 100% { filter: drop-shadow(0 0 10px rgba(56,189,248,0.5)); transform: scale(1); }
        50% { filter: drop-shadow(0 0 24px rgba(56,189,248,0.9)); transform: scale(1.03); }
      }
      @keyframes plumeSway {
        0%, 100% { transform: rotate(0deg); }
        50% { transform: rotate(10deg); }
      }
      @keyframes owlWink {
        0%, 75%, 100% { transform: scaleY(1); }
        80%, 90% { transform: scaleY(0.1); }
      }
      @keyframes sparkFloat {
        0% { transform: translateY(0) scale(0.6); opacity: 0; }
        50% { opacity: 1; }
        100% { transform: translateY(-80px) scale(1.2); opacity: 0; }
      }
      .book-glow { transform-origin: 256px 370px; animation: bookGlowPulse 2.4s ease-in-out infinite; }
      .plume-anim { transform-origin: 256px 85px; animation: plumeSway 1.8s ease-in-out infinite; }
      .wink-eye { transform-origin: 284px 215px; animation: owlWink 3.5s ease-in-out infinite; }
      .spark1 { animation: sparkFloat 2.8s ease-out infinite; }
      .spark2 { animation: sparkFloat 2.8s 1.4s ease-out infinite; }
    </style>

    <!-- COSMIC ARCANE BACKGROUND -->
    <g id="background">
      <rect x="44" y="44" width="424" height="424" fill="url(#logoArcaneBg)" />
      <!-- Magical Star Sparkles -->
      <polygon points="130,120 134,130 144,134 134,138 130,148 126,138 116,134 126,130" fill="#facc15" opacity="0.6" />
      <polygon points="380,140 383,148 391,151 383,154 380,162 377,154 369,151 377,148" fill="#38bdf8" opacity="0.7" />
      <!-- Rising Knowledge Sparks (ANIMATED) -->
      <circle cx="210" cy="340" r="4" fill="#38bdf8" class="spark1" />
      <circle cx="300" cy="350" r="5" fill="#facc15" class="spark2" />
    </g>

    <!-- CHARACTER SHADOW -->
    <g id="character-shadow">
      <ellipse cx="256" cy="435" rx="90" ry="20" fill="#000" opacity="0.6" />
    </g>

    <!-- OWL-KNIGHT MASCOT -->
    <g id="character-animation">
      <!-- Blue-Feather Body -->
      <g id="character-body">
        <ellipse cx="256" cy="320" rx="72" ry="68" fill="url(#owlFeathers)" stroke="#0f172a" stroke-width="4.5" />
        <!-- White/Cyan Breast Plumage -->
        <ellipse cx="256" cy="328" rx="46" ry="50" fill="#e0f2fe" stroke="#0f172a" stroke-width="3" />
        <!-- Feathery scallops -->
        <path d="M236 315 Q246 325 256 315 Q266 325 276 315" stroke="#38bdf8" stroke-width="3" fill="none" />
        <path d="M230 340 Q243 350 256 340 Q269 350 282 340" stroke="#38bdf8" stroke-width="3" fill="none" />
      </g>

      <!-- OPEN GLOWING SPELLBOOK OF ENGLISH (ANIMATED GLOW) -->
      <g id="character-book" class="book-glow">
        <!-- Book Leather Cover -->
        <path d="M170 345 L256 370 L342 345 L346 415 L256 435 L166 415 Z" fill="url(#bookCover)" stroke="#0f172a" stroke-width="4" />
        <!-- Open Pages -->
        <path d="M175 350 Q215 340 254 365 L254 425 Q215 400 172 410 Z" fill="#fef08a" stroke="#0f172a" stroke-width="3" />
        <path d="M337 350 Q297 340 258 365 L258 425 Q297 400 340 410 Z" fill="#fef08a" stroke="#0f172a" stroke-width="3" />
        <!-- Gold Letters A B C on Pages -->
        <text x="195" y="385" font-family="Arial, sans-serif" font-weight="900" font-size="20" fill="#c2410c">A</text>
        <text x="220" y="398" font-family="Arial, sans-serif" font-weight="900" font-size="16" fill="#c2410c">B</text>
        <text x="285" y="385" font-family="Arial, sans-serif" font-weight="900" font-size="20" fill="#0284c7">C</text>
        <text x="306" y="398" font-family="Arial, sans-serif" font-weight="900" font-size="16" fill="#0284c7">✦</text>
        <!-- Owl claws holding book -->
        <circle cx="210" cy="415" r="7" fill="#facc15" stroke="#78350f" stroke-width="2" />
        <circle cx="302" cy="415" r="7" fill="#facc15" stroke="#78350f" stroke-width="2" />
      </g>

      <!-- HEAD & GOLDEN KNIGHT HELMET -->
      <g id="character-head">
        <!-- Owl Head Base -->
        <ellipse cx="256" cy="210" rx="64" ry="56" fill="url(#owlFeathers)" stroke="#0f172a" stroke-width="4.5" />

        <!-- Big Expressive Cartoon Eyes (One Winking!) -->
        <g id="character-eyes">
          <!-- Left Eye (Open, Wise, Shining) -->
          <circle cx="226" cy="215" r="22" fill="#fff" stroke="#0f172a" stroke-width="4" />
          <circle cx="228" cy="215" r="11" fill="#0284c7" />
          <circle cx="228" cy="215" r="6" fill="#0f172a" />
          <circle cx="224" cy="210" r="3.5" fill="#fff" />

          <!-- Right Eye (ANIMATED WINK) -->
          <g class="wink-eye">
            <circle cx="286" cy="215" r="22" fill="#fff" stroke="#0f172a" stroke-width="4" />
            <circle cx="284" cy="215" r="11" fill="#0284c7" />
            <circle cx="284" cy="215" r="6" fill="#0f172a" />
            <circle cx="280" cy="210" r="3.5" fill="#fff" />
          </g>
        </g>

        <!-- Cute Golden Beak -->
        <polygon points="256,225 248,242 264,242" fill="#f59e0b" stroke="#0f172a" stroke-width="2.5" />

        <!-- GOLDEN WINGED KNIGHT HELMET -->
        <g id="character-helmet">
          <!-- Feather Plume (ANIMATED SWAY) -->
          <g class="plume-anim">
            <path d="M256 95 C235 45 285 25 315 35 C295 65 285 85 256 95 Z" fill="#38bdf8" stroke="#0f172a" stroke-width="3" />
            <path d="M256 95 C245 55 285 45 315 55 C290 75 280 88 256 95 Z" fill="#facc15" stroke="#0f172a" stroke-width="2.5" />
          </g>

          <!-- Golden Helmet Dome -->
          <path d="M196 195 C196 120 316 120 316 195 L306 205 L206 205 Z" fill="url(#goldHelm)" stroke="#0f172a" stroke-width="4.5" />
          <!-- Brow Plate with Cyan Gem -->
          <rect x="200" y="180" width="112" height="14" rx="4" fill="#ca8a04" stroke="#0f172a" stroke-width="2.5" />
          <polygon points="256,178 263,187 256,196 249,187" fill="#38bdf8" stroke="#0f172a" stroke-width="1.5" />
          
          <!-- Golden Wings on Helmet Sides -->
          <!-- Left Wing -->
          <path d="M198 185 C160 165 140 130 135 95 C160 115 175 145 198 165 Z" fill="url(#goldHelm)" stroke="#0f172a" stroke-width="3.5" />
          <!-- Right Wing -->
          <path d="M314 185 C352 165 372 130 377 95 C352 115 337 145 314 165 Z" fill="url(#goldHelm)" stroke="#0f172a" stroke-width="3.5" />
        </g>
      </g>
    </g>
  `;

  return generateFrameSvg(inner, customDefs);
}

fs.writeFileSync(path.join(AVATARS_DIR, 'character_11_chicken_warrior.svg'), buildChickenWarrior(), 'utf8');
console.log('✓ character_11_chicken_warrior.svg generated');

fs.writeFileSync(path.join(AVATARS_DIR, 'character_12_alien_cowboy.svg'), buildAlienCowboy(), 'utf8');
console.log('✓ character_12_alien_cowboy.svg generated');

const masterLogoSvg = buildMasterGameLogo();
fs.writeFileSync('public/logo.svg', masterLogoSvg, 'utf8');
fs.writeFileSync('public/brand_logo.svg', masterLogoSvg, 'utf8');
console.log('✓ public/logo.svg and public/brand_logo.svg generated');
