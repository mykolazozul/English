import fs from 'fs';
import { generateFrameSvg, AVATARS_DIR } from './svg-frame-template.mjs';

console.log('🎨 Generating 15 New Characters (13-27) + 10 Exclusive Shop Avatars...');

const EXPANSION_CHARACTERS = [
  {
    file: 'character_13_cyber_samurai.svg',
    title: 'Кібер-Самурай',
    defs: `
      <linearGradient id="cyberBladeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#22d3ee" /><stop offset="50%" stop-color="#3b82f6" /><stop offset="100%" stop-color="#ec4899" />
      </linearGradient>
    `,
    style: `
      @keyframes bladeSlash { 0%, 100% { transform: rotate(-5deg); } 50% { transform: rotate(18deg) translateY(-8px); } }
      @keyframes visorGlow { 0%, 100% { fill-opacity: 0.6; } 50% { fill-opacity: 1; } }
      @keyframes sparkFly { 0% { opacity: 0; transform: translateY(0); } 50% { opacity: 1; } 100% { opacity: 0; transform: translate(14px, -24px); } }
      .cyber-blade { transform-origin: 320px 340px; animation: bladeSlash 2.4s ease-in-out infinite; }
      .cyber-visor { animation: visorGlow 1.8s ease-in-out infinite; }
      .cyber-spark { animation: sparkFly 1.2s ease-out infinite; }
    `,
    bg: `<rect x="0" y="0" width="512" height="512" fill="#0f172a" />
         <circle cx="256" cy="256" r="180" fill="#1e1b4b" opacity="0.8" />
         <path d="M 0 380 L 512 380" stroke="#06b6d4" stroke-width="2" opacity="0.4" />`,
    body: `
      <!-- Samurai Body -->
      <path d="M 170 420 L 256 310 L 342 420 Z" fill="#1e293b" stroke="#0284c7" stroke-width="4" />
      <!-- Cyber Armor Plates -->
      <polygon points="210,340 302,340 286,390 226,390" fill="#334155" stroke="#38bdf8" stroke-width="2" />
      <!-- Helmet -->
      <path d="M 180 230 C 180 140 332 140 332 230 C 332 280 180 280 180 230 Z" fill="#090d16" stroke="#38bdf8" stroke-width="5" />
      <!-- Crest Kabuto Horns -->
      <path d="M 256 140 L 220 70 L 246 110 L 256 80 L 266 110 L 292 70 Z" fill="#facc15" stroke="#ca8a04" stroke-width="3" />
      <!-- Cyber Neon Visor -->
      <rect x="204" y="210" width="104" height="18" rx="9" fill="#22d3ee" class="cyber-visor" />
      <rect x="214" y="214" width="30" height="6" rx="3" fill="#ffffff" />
      <!-- Cyber Katana -->
      <g class="cyber-blade">
        <rect x="320" y="240" width="14" height="150" rx="4" fill="#0f172a" stroke="#64748b" stroke-width="2" />
        <path d="M 327 240 L 327 90 Q 332 70 345 74 L 336 240 Z" fill="url(#cyberBladeGrad)" />
        <circle cx="338" cy="110" r="3" fill="#ffffff" class="cyber-spark" />
      </g>
    `
  },
  {
    file: 'character_14_coffee_mage.svg',
    title: 'Маг-Кавоман',
    defs: `
      <radialGradient id="coffeeAura" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#78350f" stop-opacity="0.8" /><stop offset="100%" stop-color="#451a03" stop-opacity="0" />
      </radialGradient>
    `,
    style: `
      @keyframes jitterHead { 0%, 100% { transform: translate(0, 0); } 25% { transform: translate(2px, -2px); } 50% { transform: translate(-2px, 1px); } 75% { transform: translate(1px, 2px); } }
      @keyframes steamRise { 0% { opacity: 0; transform: translateY(0) scale(0.8); } 50% { opacity: 0.8; } 100% { opacity: 0; transform: translateY(-35px) scale(1.3); } }
      @keyframes eyeTwitch { 0%, 90%, 100% { transform: scale(1); } 95% { transform: scale(1.35); } }
      .mage-head { animation: jitterHead 0.18s infinite; }
      .coffee-steam { animation: steamRise 2s ease-out infinite; }
      .twitch-eye { animation: eyeTwitch 1.5s infinite; }
    `,
    bg: `<rect x="0" y="0" width="512" height="512" fill="#1c1917" />
         <circle cx="256" cy="256" r="170" fill="url(#coffeeAura)" />`,
    body: `
      <g class="mage-head" transform-origin="256px 260px">
        <!-- Robe -->
        <path d="M 180 430 Q 256 320 332 430 Z" fill="#451a03" stroke="#b45309" stroke-width="4" />
        <!-- Head -->
        <circle cx="256" cy="250" r="62" fill="#fed7aa" stroke="#78350f" stroke-width="3.5" />
        <!-- Wizard Hat (Coffee Filter Shape) -->
        <polygon points="190,220 322,220 256,90" fill="#78350f" stroke="#f59e0b" stroke-width="4" />
        <ellipse cx="256" cy="220" rx="72" ry="14" fill="#b45309" />
        <!-- Wide Manic Eyes -->
        <g class="twitch-eye" transform-origin="236px 245px">
          <circle cx="236" cy="245" r="16" fill="#ffffff" stroke="#451a03" stroke-width="2" />
          <circle cx="236" cy="245" r="5" fill="#451a03" />
        </g>
        <g class="twitch-eye" transform-origin="276px 245px">
          <circle cx="276" cy="245" r="16" fill="#ffffff" stroke="#451a03" stroke-width="2" />
          <circle cx="276" cy="245" r="5" fill="#451a03" />
        </g>
        <!-- Coffee Mug in Hands -->
        <rect x="236" y="320" width="40" height="42" rx="6" fill="#f8fafc" stroke="#334155" stroke-width="3" />
        <path d="M 276 330 C 292 330 292 352 276 352" fill="none" stroke="#334155" stroke-width="3" />
        <!-- Rising Steam -->
        <path d="M 248 310 Q 252 295 246 280" fill="none" stroke="#fde047" stroke-width="3" stroke-linecap="round" class="coffee-steam" />
        <path d="M 264 310 Q 260 295 266 280" fill="none" stroke="#fde047" stroke-width="3" stroke-linecap="round" class="coffee-steam" style="animation-delay:0.8s" />
      </g>
    `
  },
  {
    file: 'character_15_space_hamster.svg',
    title: 'Космічний Хомʼяк',
    defs: `
      <linearGradient id="glassHelmet" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.6" /><stop offset="60%" stop-color="#38bdf8" stop-opacity="0.2" /><stop offset="100%" stop-color="#0284c7" stop-opacity="0.5" />
      </linearGradient>
    `,
    style: `
      @keyframes floatHamster { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-14px); } }
      @keyframes chewPuffs { 0%, 100% { transform: scaleX(1); } 50% { transform: scaleX(1.15); } }
      @keyframes seedOrbit { 0% { transform: rotate(0deg) translateX(90px) rotate(0deg); } 100% { transform: rotate(360deg) translateX(90px) rotate(-360deg); } }
      .hamster-unit { animation: floatHamster 3s ease-in-out infinite; }
      .hamster-cheeks { transform-origin: 256px 250px; animation: chewPuffs 0.8s ease-in-out infinite; }
      .orbit-seed { transform-origin: 256px 240px; animation: seedOrbit 5s linear infinite; }
    `,
    bg: `<rect x="0" y="0" width="512" height="512" fill="#030712" />
         <circle cx="120" cy="140" r="2" fill="#fff" /><circle cx="390" cy="180" r="1.5" fill="#fff" /><circle cx="340" cy="380" r="2" fill="#38bdf8" />
         <circle cx="256" cy="256" r="175" fill="#1e1b4b" opacity="0.6" />`,
    body: `
      <g class="hamster-unit">
        <!-- Spacesuit -->
        <rect x="200" y="300" width="112" height="110" rx="30" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="4" />
        <circle cx="256" cy="340" r="14" fill="#38bdf8" />
        <!-- Cute Hamster Ears -->
        <circle cx="190" cy="170" r="22" fill="#f59e0b" stroke="#78350f" stroke-width="3" />
        <circle cx="190" cy="170" r="12" fill="#fbcfe8" />
        <circle cx="322" cy="170" r="22" fill="#f59e0b" stroke="#78350f" stroke-width="3" />
        <circle cx="322" cy="170" r="12" fill="#fbcfe8" />
        <!-- Head & Cheeks -->
        <g class="hamster-cheeks">
          <ellipse cx="256" cy="245" rx="60" ry="54" fill="#d97706" stroke="#78350f" stroke-width="3.5" />
          <ellipse cx="220" cy="260" rx="22" ry="18" fill="#fbbf24" />
          <ellipse cx="292" cy="260" rx="22" ry="18" fill="#fbbf24" />
          <!-- Eyes -->
          <circle cx="230" cy="230" r="8" fill="#000" /><circle cx="233" cy="227" r="3" fill="#fff" />
          <circle cx="282" cy="230" r="8" fill="#000" /><circle cx="285" cy="227" r="3" fill="#fff" />
          <!-- Nose & Buck Teeth -->
          <polygon points="252,246 260,246 256,252" fill="#ec4899" />
          <rect x="252" y="254" width="8" height="9" rx="2" fill="#ffffff" stroke="#78350f" stroke-width="1.5" />
        </g>
        <!-- Glass Bubble Helmet -->
        <circle cx="256" cy="235" r="95" fill="url(#glassHelmet)" stroke="#38bdf8" stroke-width="3" />
        <!-- Floating Sunflower Seed -->
        <g class="orbit-seed">
          <ellipse cx="256" cy="240" rx="14" ry="8" fill="#78350f" stroke="#f59e0b" stroke-width="2" />
        </g>
      </g>
    `
  },
  {
    file: 'character_16_steam_owl.svg',
    title: 'Парова Сова',
    defs: `
      <radialGradient id="brassGrad" cx="40%" cy="40%" r="60%">
        <stop offset="0%" stop-color="#fde047" /><stop offset="60%" stop-color="#d97706" /><stop offset="100%" stop-color="#78350f" />
      </radialGradient>
    `,
    style: `
      @keyframes gearSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      @keyframes wingFlap { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(14deg); } }
      @keyframes monacleShine { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
      .steam-gear { transform-origin: 320px 220px; animation: gearSpin 4s linear infinite; }
      .steam-wing { transform-origin: 170px 320px; animation: wingFlap 2s ease-in-out infinite; }
      .steam-lens { animation: monacleShine 2.5s ease-in-out infinite; }
    `,
    bg: `<rect x="0" y="0" width="512" height="512" fill="#18181b" />
         <circle cx="256" cy="256" r="180" fill="#27272a" />`,
    body: `
      <!-- Brass Body -->
      <ellipse cx="256" cy="310" rx="80" ry="95" fill="url(#brassGrad)" stroke="#451a03" stroke-width="4" />
      <!-- Steampunk Gear Wing -->
      <g class="steam-wing">
        <path d="M 175 280 Q 110 330 140 390 Q 190 370 185 310 Z" fill="#92400e" stroke="#f59e0b" stroke-width="3" />
      </g>
      <!-- Head -->
      <circle cx="256" cy="220" r="68" fill="url(#brassGrad)" stroke="#451a03" stroke-width="4" />
      <!-- Feather Horns -->
      <polygon points="200,165 225,120 230,170" fill="#b45309" />
      <polygon points="312,165 287,120 282,170" fill="#b45309" />
      <!-- Big Round Eyes -->
      <circle cx="225" cy="220" r="24" fill="#0f172a" stroke="#d97706" stroke-width="3" />
      <circle cx="225" cy="220" r="10" fill="#facc15" />
      <!-- Monocle with Gear Teeth -->
      <circle cx="287" cy="220" r="28" fill="#06b6d4" stroke="#d97706" stroke-width="5" class="steam-lens" />
      <circle cx="287" cy="220" r="10" fill="#ffffff" />
      <!-- Beak -->
      <polygon points="256,236 264,256 248,256" fill="#f59e0b" stroke="#78350f" stroke-width="2" />
      <!-- Spinning Cog on Ear -->
      <g class="steam-gear">
        <circle cx="320" cy="220" r="16" fill="#d97706" stroke="#451a03" stroke-width="2" />
        <path d="M 320 200 L 320 240 M 300 220 L 340 220" stroke="#78350f" stroke-width="3" />
      </g>
    `
  },
  {
    file: 'character_17_lazy_panda_monk.svg',
    title: 'Панда-Монах',
    defs: ``,
    style: `
      @keyframes bellyBreathe { 0%, 100% { transform: scaleY(1); } 50% { transform: scaleY(1.08); } }
      @keyframes leafSway { 0%, 100% { transform: rotate(-8deg); } 50% { transform: rotate(12deg); } }
      .panda-belly { transform-origin: 256px 360px; animation: bellyBreathe 3s ease-in-out infinite; }
      .bamboo-leaf { transform-origin: 290px 250px; animation: leafSway 2.5s ease-in-out infinite; }
    `,
    bg: `<rect x="0" y="0" width="512" height="512" fill="#064e3b" />
         <circle cx="256" cy="256" r="175" fill="#047857" opacity="0.6" />`,
    body: `
      <!-- Meditation Body -->
      <g class="panda-belly">
        <ellipse cx="256" cy="350" rx="95" ry="85" fill="#09090b" />
        <ellipse cx="256" cy="355" rx="72" ry="68" fill="#fafafa" stroke="#e4e4e7" stroke-width="3" />
      </g>
      <!-- Head -->
      <circle cx="256" cy="220" r="72" fill="#fafafa" stroke="#18181b" stroke-width="4" />
      <!-- Black Ears -->
      <circle cx="188" cy="160" r="24" fill="#18181b" />
      <circle cx="324" cy="160" r="24" fill="#18181b" />
      <!-- Eye Patches & Sleeping Eyes -->
      <ellipse cx="218" cy="216" rx="20" ry="16" fill="#18181b" transform="rotate(-15 218 216)" />
      <path d="M 208 218 Q 218 226 228 218" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" />
      <ellipse cx="294" cy="216" rx="20" ry="16" fill="#18181b" transform="rotate(15 294 216)" />
      <path d="M 284 218 Q 294 226 304 218" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" />
      <!-- Nose & Smile -->
      <ellipse cx="256" cy="242" rx="10" ry="6" fill="#18181b" />
      <path d="M 248 252 Q 256 260 264 252" fill="none" stroke="#18181b" stroke-width="2.5" />
      <!-- Bamboo Shoot in Mouth -->
      <g class="bamboo-leaf">
        <path d="M 264 252 Q 310 240 330 220" fill="none" stroke="#22c55e" stroke-width="4" stroke-linecap="round" />
        <ellipse cx="326" cy="222" rx="14" ry="6" fill="#4ade80" transform="rotate(-25 326 222)" />
      </g>
    `
  },
  {
    file: 'character_18_pixel_vampire.svg',
    title: 'Піксельний Вампір',
    defs: ``,
    style: `
      @keyframes capeFlutter { 0%, 100% { transform: scaleX(1); } 50% { transform: scaleX(1.06); } }
      @keyframes batFlutter { 0% { transform: translate(0, 0); } 50% { transform: translate(16px, -18px); } 100% { transform: translate(0, 0); } }
      .vamp-cape { transform-origin: 256px 330px; animation: capeFlutter 1.6s ease-in-out infinite; }
      .mini-bat { animation: batFlutter 2s ease-in-out infinite; }
    `,
    bg: `<rect x="0" y="0" width="512" height="512" fill="#2e1065" />
         <circle cx="256" cy="256" r="175" fill="#3b0764" />`,
    body: `
      <!-- High Collar Cape -->
      <g class="vamp-cape">
        <path d="M 160 260 L 190 420 L 322 420 L 352 260 L 300 290 L 256 310 L 212 290 Z" fill="#7f1d1d" stroke="#b91c1c" stroke-width="4" />
      </g>
      <!-- Pale Face -->
      <rect x="206" y="170" width="100" height="95" rx="20" fill="#e0e7ff" stroke="#4338ca" stroke-width="3" />
      <!-- Widow's Peak Hair -->
      <path d="M 200 190 L 200 160 Q 256 140 312 160 L 312 190 L 280 180 L 256 200 L 232 180 Z" fill="#0f172a" />
      <!-- Glowing Red Eyes -->
      <rect x="224" y="205" width="16" height="12" fill="#ef4444" />
      <rect x="272" y="205" width="16" height="12" fill="#ef4444" />
      <!-- Fangs -->
      <polygon points="236,242 242,242 239,254" fill="#ffffff" />
      <polygon points="270,242 276,242 273,254" fill="#ffffff" />
      <!-- Mini Pet Bat -->
      <g class="mini-bat" transform="translate(130, 110)">
        <ellipse cx="30" cy="30" rx="10" ry="14" fill="#18181b" />
        <path d="M 10 26 Q 20 18 30 26 Q 40 18 50 26 Q 40 38 30 32 Q 20 38 10 26 Z" fill="#18181b" />
        <circle cx="27" cy="26" r="1.5" fill="#ef4444" />
        <circle cx="33" cy="26" r="1.5" fill="#ef4444" />
      </g>
    `
  },
  {
    file: 'character_19_disco_skeleton.svg',
    title: 'Діско-Скелет',
    defs: `
      <linearGradient id="neonDisco" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ec4899" /><stop offset="50%" stop-color="#8b5cf6" /><stop offset="100%" stop-color="#06b6d4" />
      </linearGradient>
    `,
    style: `
      @keyframes discoBob { 0%, 100% { transform: translateY(0) rotate(0deg); } 25% { transform: translateY(-6px) rotate(-4deg); } 75% { transform: translateY(-6px) rotate(4deg); } }
      @keyframes ballSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      .skel-groove { transform-origin: 256px 360px; animation: discoBob 0.8s ease-in-out infinite; }
      .disco-mirror { transform-origin: 380px 120px; animation: ballSpin 6s linear infinite; }
    `,
    bg: `<rect x="0" y="0" width="512" height="512" fill="#09090b" />
         <circle cx="256" cy="256" r="175" fill="#18181b" />`,
    body: `
      <!-- Mini Disco Ball -->
      <g class="disco-mirror">
        <circle cx="380" cy="120" r="28" fill="#e2e8f0" stroke="#94a3b8" stroke-width="2" />
        <line x1="380" y1="40" x2="380" y2="92" stroke="#64748b" stroke-width="2" />
        <path d="M 360 120 L 400 120 M 380 100 L 380 140" stroke="#cbd5e1" stroke-width="2" />
      </g>
      <g class="skel-groove">
        <!-- Ribcage with Neon Jacket -->
        <path d="M 190 350 Q 256 310 322 350 L 300 430 L 212 430 Z" fill="url(#neonDisco)" />
        <rect x="246" y="340" width="20" height="70" fill="#fafafa" rx="4" />
        <line x1="220" y1="365" x2="292" y2="365" stroke="#fafafa" stroke-width="5" />
        <line x1="226" y1="385" x2="286" y2="385" stroke="#fafafa" stroke-width="5" />
        <!-- Skull -->
        <ellipse cx="256" cy="220" rx="55" ry="50" fill="#fafafa" stroke="#e4e4e7" stroke-width="3" />
        <rect x="236" y="250" width="40" height="24" rx="6" fill="#fafafa" />
        <!-- Big Round Sunglasses -->
        <circle cx="236" cy="216" r="18" fill="#ec4899" stroke="#db2777" stroke-width="3" />
        <circle cx="276" cy="216" r="18" fill="#06b6d4" stroke="#0891b2" stroke-width="3" />
        <line x1="254" y1="216" x2="258" y2="216" stroke="#000" stroke-width="3" />
        <!-- Teeth -->
        <line x1="242" y1="262" x2="270" y2="262" stroke="#000" stroke-width="2" />
        <line x1="248" y1="254" x2="248" y2="270" stroke="#000" stroke-width="2" />
        <line x1="256" y1="254" x2="256" y2="270" stroke="#000" stroke-width="2" />
        <line x1="264" y1="254" x2="264" y2="270" stroke="#000" stroke-width="2" />
      </g>
    `
  },
  {
    file: 'character_20_glitch_fox.svg',
    title: 'Глітч-Лисиця',
    defs: `
      <linearGradient id="foxNeon" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#f97316" /><stop offset="60%" stop-color="#ef4444" /><stop offset="100%" stop-color="#ec4899" />
      </linearGradient>
    `,
    style: `
      @keyframes tailWiggle { 0%, 100% { transform: rotate(-8deg); } 50% { transform: rotate(14deg); } }
      @keyframes glitchShift { 0%, 90%, 100% { transform: translate(0, 0); } 92% { transform: translate(-4px, 2px); } 96% { transform: translate(4px, -2px); } }
      .fox-tails { transform-origin: 300px 360px; animation: tailWiggle 2.8s ease-in-out infinite; }
      .glitch-face { animation: glitchShift 2s infinite; }
    `,
    bg: `<rect x="0" y="0" width="512" height="512" fill="#0f172a" />
         <circle cx="256" cy="256" r="175" fill="#1e1b4b" />`,
    body: `
      <!-- Multiple Kitsune Tails -->
      <g class="fox-tails">
        <path d="M 300 360 C 420 340 430 240 370 200 C 340 250 320 310 300 360 Z" fill="url(#foxNeon)" opacity="0.8" />
        <path d="M 300 360 C 440 380 460 290 400 240 C 360 280 330 330 300 360 Z" fill="#f97316" />
      </g>
      <!-- Body -->
      <ellipse cx="256" cy="340" rx="60" ry="75" fill="url(#foxNeon)" stroke="#c2410c" stroke-width="3" />
      <g class="glitch-face">
        <!-- Head -->
        <polygon points="190,210 322,210 256,300" fill="#ea580c" stroke="#9a3412" stroke-width="3" />
        <polygon points="216,210 296,210 256,270" fill="#fed7aa" />
        <!-- Giant Ears -->
        <polygon points="180,210 160,110 220,170" fill="#ea580c" stroke="#9a3412" stroke-width="2.5" />
        <polygon points="175,190 170,130 205,170" fill="#fbcfe8" />
        <polygon points="332,210 352,110 292,170" fill="#ea580c" stroke="#9a3412" stroke-width="2.5" />
        <polygon points="337,190 342,130 307,170" fill="#fbcfe8" />
        <!-- Digital Glitch Eyes -->
        <rect x="220" y="216" width="18" height="6" fill="#06b6d4" />
        <rect x="274" y="216" width="18" height="6" fill="#06b6d4" />
        <circle cx="256" cy="290" r="5" fill="#0f172a" />
      </g>
    `
  },
  {
    file: 'character_21_storm_valkyrie.svg',
    title: 'Штормова Валькірія',
    defs: ``,
    style: `
      @keyframes wingWave { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08) translateY(-6px); } }
      @keyframes lightningFlicker { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
      .valk-wings { transform-origin: 256px 240px; animation: wingWave 2.2s ease-in-out infinite; }
      .lightning-bolt { animation: lightningFlicker 0.6s infinite; }
    `,
    bg: `<rect x="0" y="0" width="512" height="512" fill="#0c4a6e" />
         <circle cx="256" cy="256" r="175" fill="#0284c7" opacity="0.6" />`,
    body: `
      <!-- Feather Wings -->
      <g class="valk-wings">
        <path d="M 210 230 C 130 180 90 260 140 340 C 180 320 200 280 210 230 Z" fill="#f8fafc" stroke="#cbd5e1" stroke-width="3" />
        <path d="M 302 230 C 382 180 422 260 372 340 C 332 320 312 280 302 230 Z" fill="#f8fafc" stroke="#cbd5e1" stroke-width="3" />
      </g>
      <!-- Armor -->
      <path d="M 216 310 L 296 310 L 280 410 L 232 410 Z" fill="#e2e8f0" stroke="#64748b" stroke-width="3" />
      <!-- Head -->
      <circle cx="256" cy="230" r="44" fill="#fde047" stroke="#ca8a04" stroke-width="3" />
      <!-- Winged Helmet -->
      <path d="M 216 230 C 216 170 296 170 296 230 Z" fill="#94a3b8" stroke="#475569" stroke-width="3" />
      <polygon points="206,200 170,160 210,185" fill="#ffffff" stroke="#94a3b8" stroke-width="2" />
      <polygon points="306,200 342,160 302,185" fill="#ffffff" stroke="#94a3b8" stroke-width="2" />
      <!-- Eyes -->
      <circle cx="242" cy="228" r="4" fill="#0284c7" />
      <circle cx="270" cy="228" r="4" fill="#0284c7" />
      <!-- Lightning Spear -->
      <polygon points="320,110 328,140 316,140 326,190 304,150 316,150" fill="#fef08a" stroke="#eab308" stroke-width="2" class="lightning-bolt" />
    `
  },
  {
    file: 'character_22_chef_octopus.svg',
    title: 'Восьминіг-Кухар',
    defs: ``,
    style: `
      @keyframes tentacleWave { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(12deg); } }
      @keyframes hatBounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
      .tentacle-left { transform-origin: 190px 300px; animation: tentacleWave 1.8s ease-in-out infinite; }
      .chef-hat { animation: hatBounce 1.4s ease-in-out infinite; }
    `,
    bg: `<rect x="0" y="0" width="512" height="512" fill="#831843" />
         <circle cx="256" cy="256" r="175" fill="#9d174d" />`,
    body: `
      <!-- Bulbous Head -->
      <circle cx="256" cy="250" r="72" fill="#f43f5e" stroke="#9f1239" stroke-width="4" />
      <!-- Tentacles Around -->
      <g class="tentacle-left">
        <path d="M 200 290 Q 140 310 130 360 Q 160 380 190 330 Z" fill="#e11d48" stroke="#881337" stroke-width="3" />
        <circle cx="150" cy="345" r="5" fill="#ffe4e6" />
      </g>
      <path d="M 312 290 Q 372 310 382 360 Q 352 380 322 330 Z" fill="#e11d48" stroke="#881337" stroke-width="3" />
      <!-- Chef Toque Hat -->
      <g class="chef-hat">
        <path d="M 206 185 L 306 185 L 316 120 C 316 80 196 80 196 120 Z" fill="#ffffff" stroke="#cbd5e1" stroke-width="3" />
        <line x1="206" y1="180" x2="306" y2="180" stroke="#f43f5e" stroke-width="4" />
      </g>
      <!-- Big Cute Eyes -->
      <circle cx="232" cy="245" r="16" fill="#ffffff" />
      <circle cx="234" cy="245" r="8" fill="#0f172a" /><circle cx="236" cy="242" r="3" fill="#ffffff" />
      <circle cx="280" cy="245" r="16" fill="#ffffff" />
      <circle cx="278" cy="245" r="8" fill="#0f172a" /><circle cx="280" cy="242" r="3" fill="#ffffff" />
      <!-- Tiny Cooking Pan in Hand -->
      <circle cx="125" cy="380" r="20" fill="#334155" stroke="#0f172a" stroke-width="2" />
      <line x1="140" y1="375" x2="165" y2="360" stroke="#334155" stroke-width="5" stroke-linecap="round" />
    `
  },
  {
    file: 'character_23_alchemist_raccoon.svg',
    title: 'Єнот-Алхімік',
    defs: ``,
    style: `
      @keyframes potionBubble { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.18); } }
      @keyframes maskWiggle { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(3deg); } }
      .potion-flask { transform-origin: 320px 340px; animation: potionBubble 1.4s ease-in-out infinite; }
      .raccoon-head { animation: maskWiggle 2s ease-in-out infinite; }
    `,
    bg: `<rect x="0" y="0" width="512" height="512" fill="#14532d" />
         <circle cx="256" cy="256" r="175" fill="#166534" />`,
    body: `
      <g class="raccoon-head" transform-origin="256px 240px">
        <!-- Fur Body -->
        <ellipse cx="256" cy="340" rx="70" ry="80" fill="#475569" stroke="#1e293b" stroke-width="3.5" />
        <!-- Head -->
        <polygon points="180,180 332,180 256,280" fill="#64748b" stroke="#1e293b" stroke-width="3" />
        <!-- Bandit Eye Mask -->
        <polygon points="190,195 322,195 256,245" fill="#0f172a" />
        <!-- Eyes -->
        <circle cx="228" cy="210" r="8" fill="#facc15" /><circle cx="230" cy="208" r="3" fill="#fff" />
        <circle cx="284" cy="210" r="8" fill="#facc15" /><circle cx="286" cy="208" r="3" fill="#fff" />
        <!-- Cute White Cheeks -->
        <polygon points="180,240 216,210 216,260" fill="#f1f5f9" />
        <polygon points="332,240 296,210 296,260" fill="#f1f5f9" />
      </g>
      <!-- Boiling Erlenmeyer Flask -->
      <g class="potion-flask">
        <polygon points="305,310 335,310 355,370 285,370" fill="#22c55e" stroke="#15803d" stroke-width="3" />
        <circle cx="320" cy="340" r="6" fill="#86efac" />
        <circle cx="310" cy="355" r="4" fill="#86efac" />
      </g>
    `
  },
  {
    file: 'character_24_cyber_dino.svg',
    title: 'Кібер-Тиранозавр',
    defs: ``,
    style: `
      @keyframes jawChomp { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(14deg); } }
      @keyframes laserPulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
      .dino-jaw { transform-origin: 200px 270px; animation: jawChomp 1.2s ease-in-out infinite; }
      .laser-eye { animation: laserPulse 0.8s infinite; }
    `,
    bg: `<rect x="0" y="0" width="512" height="512" fill="#450a0a" />
         <circle cx="256" cy="256" r="175" fill="#7f1d1d" />`,
    body: `
      <!-- Metal Green Scaled Head -->
      <path d="M 180 230 C 180 150 290 140 330 190 L 330 250 L 220 250 Z" fill="#15803d" stroke="#166534" stroke-width="4" />
      <!-- Lower Jaw (Chomping) -->
      <g class="dino-jaw">
        <path d="M 210 255 L 325 255 L 310 290 L 220 285 Z" fill="#166534" stroke="#14532d" stroke-width="3" />
        <!-- Sharp White Teeth -->
        <polygon points="230,255 236,244 242,255" fill="#fff" />
        <polygon points="250,255 256,244 262,255" fill="#fff" />
        <polygon points="270,255 276,244 282,255" fill="#fff" />
      </g>
      <!-- Cyber Targeting Reticle Eye -->
      <circle cx="240" cy="195" r="14" fill="#ef4444" class="laser-eye" />
      <circle cx="240" cy="195" r="5" fill="#ffffff" />
      <line x1="220" y1="195" x2="260" y2="195" stroke="#ef4444" stroke-width="2" />
      <line x1="240" y1="175" x2="240" y2="215" stroke="#ef4444" stroke-width="2" />
    `
  },
  {
    file: 'character_25_astral_jellyfish.svg',
    title: 'Астральна Медуза',
    defs: `
      <radialGradient id="jellyGlow" cx="50%" cy="30%" r="70%">
        <stop offset="0%" stop-color="#c084fc" /><stop offset="60%" stop-color="#6366f1" /><stop offset="100%" stop-color="#1e1b4b" />
      </radialGradient>
    `,
    style: `
      @keyframes domePulse { 0%, 100% { transform: scale(1, 1); } 50% { transform: scale(1.08, 0.92); } }
      @keyframes floatTentacles { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(12px); } }
      .jelly-dome { transform-origin: 256px 200px; animation: domePulse 2.6s ease-in-out infinite; }
      .jelly-legs { animation: floatTentacles 2.6s ease-in-out infinite; }
    `,
    bg: `<rect x="0" y="0" width="512" height="512" fill="#030712" />
         <circle cx="256" cy="256" r="175" fill="#1e1b4b" />`,
    body: `
      <!-- Translucent Glowing Dome -->
      <g class="jelly-dome">
        <path d="M 160 230 C 160 130 352 130 352 230 C 352 255 160 255 160 230 Z" fill="url(#jellyGlow)" opacity="0.85" stroke="#a855f7" stroke-width="3" />
        <circle cx="216" cy="200" r="10" fill="#fbcfe8" opacity="0.6" />
        <circle cx="296" cy="200" r="10" fill="#fbcfe8" opacity="0.6" />
      </g>
      <!-- Flowing Bioluminescent Tentacles -->
      <g class="jelly-legs" stroke="#c084fc" stroke-width="3.5" stroke-linecap="round" fill="none">
        <path d="M 190 255 Q 170 330 200 410" />
        <path d="M 230 255 Q 260 340 230 420" stroke="#38bdf8" />
        <path d="M 282 255 Q 250 340 282 420" stroke="#38bdf8" />
        <path d="M 322 255 Q 342 330 312 410" />
      </g>
    `
  },
  {
    file: 'character_26_polar_miner.svg',
    title: 'Полярний Шахтар',
    defs: ``,
    style: `
      @keyframes pickaxeStrike { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(-25deg); } }
      .miner-tool { transform-origin: 340px 330px; animation: pickaxeStrike 1.2s ease-in-out infinite; }
    `,
    bg: `<rect x="0" y="0" width="512" height="512" fill="#082f49" />
         <circle cx="256" cy="256" r="175" fill="#0e7490" opacity="0.6" />`,
    body: `
      <!-- Parka Body -->
      <ellipse cx="256" cy="350" rx="80" ry="85" fill="#0284c7" stroke="#0369a1" stroke-width="4" />
      <circle cx="256" cy="230" r="60" fill="#fde047" />
      <!-- Frosty White Beard -->
      <path d="M 200 240 Q 256 340 312 240 Z" fill="#f8fafc" stroke="#cbd5e1" stroke-width="3" />
      <!-- Mining Hardhat with Flashlight -->
      <path d="M 196 210 C 196 150 316 150 316 210 Z" fill="#eab308" stroke="#ca8a04" stroke-width="3" />
      <circle cx="256" cy="180" r="12" fill="#ffffff" stroke="#78350f" stroke-width="2" />
      <!-- Pickaxe -->
      <g class="miner-tool">
        <line x1="330" y1="360" x2="350" y2="230" stroke="#78350f" stroke-width="6" stroke-linecap="round" />
        <path d="M 320 220 Q 350 235 380 220" fill="none" stroke="#94a3b8" stroke-width="8" stroke-linecap="round" />
      </g>
    `
  },
  {
    file: 'character_27_phoenix_bard.svg',
    title: 'Фенікс-Бард',
    defs: `
      <linearGradient id="fireFeathers" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#fef08a" /><stop offset="50%" stop-color="#f97316" /><stop offset="100%" stop-color="#ef4444" />
      </linearGradient>
    `,
    style: `
      @keyframes flameCrest { 0%, 100% { transform: scaleY(1); } 50% { transform: scaleY(1.15); } }
      @keyframes strumLute { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(8deg); } }
      .phoenix-crown { transform-origin: 256px 140px; animation: flameCrest 1.5s ease-in-out infinite; }
      .bard-lute { transform-origin: 220px 350px; animation: strumLute 0.9s ease-in-out infinite; }
    `,
    bg: `<rect x="0" y="0" width="512" height="512" fill="#450a0a" />
         <circle cx="256" cy="256" r="175" fill="#991b1b" />`,
    body: `
      <!-- Flame Body -->
      <ellipse cx="256" cy="330" rx="70" ry="85" fill="url(#fireFeathers)" stroke="#b91c1c" stroke-width="3" />
      <!-- Phoenix Head -->
      <circle cx="256" cy="220" r="54" fill="#fbbf24" stroke="#d97706" stroke-width="3" />
      <polygon points="256,215 284,230 256,245" fill="#f59e0b" />
      <circle cx="242" cy="210" r="5" fill="#000" /><circle cx="244" cy="208" r="2" fill="#fff" />
      <!-- Fiery Plumage Crown -->
      <g class="phoenix-crown">
        <path d="M 230 170 Q 210 110 240 90 Q 256 120 256 170 Q 260 110 280 90 Q 270 130 282 170 Z" fill="url(#fireFeathers)" />
      </g>
      <!-- Musical Lute -->
      <g class="bard-lute">
        <ellipse cx="210" cy="350" rx="28" ry="36" fill="#78350f" stroke="#d97706" stroke-width="2.5" />
        <line x1="210" y1="320" x2="210" y2="250" stroke="#b45309" stroke-width="5" />
      </g>
    `
  }
];

// 10 EXCLUSIVE SHOP AVATARS
const SHOP_AVATARS = [
  { file: 'shop_avatar_01_neon_emperor.svg', title: 'Неоновий Імператор', color: '#06b6d4', icon: '👑' },
  { file: 'shop_avatar_02_golden_griffin.svg', title: 'Золотий Грифон', color: '#f59e0b', icon: '🦅' },
  { file: 'shop_avatar_03_cosmic_dj.svg', title: 'Космічний Ді-джей', color: '#8b5cf6', icon: '🎧' },
  { file: 'shop_avatar_04_shadow_assassin.svg', title: 'Тіньовий Асасин', color: '#3b0764', icon: '🗡️' },
  { file: 'shop_avatar_05_mecha_dragon.svg', title: 'Меха-Дракон', color: '#2563eb', icon: '🤖' },
  { file: 'shop_avatar_06_crystal_golem.svg', title: 'Кристалічний Голем', color: '#10b981', icon: '💎' },
  { file: 'shop_avatar_07_quantum_cat.svg', title: 'Квантовий Кіт', color: '#ec4899', icon: '🐱' },
  { file: 'shop_avatar_08_frost_lich.svg', title: 'Крижаний Ліч', color: '#38bdf8', icon: '❄️' },
  { file: 'shop_avatar_09_solar_knight.svg', title: 'Сонячний Лицар', color: '#facc15', icon: '☀️' },
  { file: 'shop_avatar_10_void_walker.svg', title: 'Мандрівник Порожнечі', color: '#4338ca', icon: '🌌' }
];

for (const c of EXPANSION_CHARACTERS) {
  const content = `
  <g id="character-bg">${c.bg}</g>
  <g id="character-body">${c.body}</g>
  `;
  const svg = generateFrameSvg(content, c.defs + `<style>${c.style}</style>`);
  fs.writeFileSync(`${AVATARS_DIR}/${c.file}`, svg, 'utf8');
  console.log(`✓ ${c.file} generated (${c.title})`);
}

// Generate the 10 Shop Avatars
for (const s of SHOP_AVATARS) {
  const customDefs = `
    <radialGradient id="shopGlow_${s.file.slice(0, 14)}" cx="50%" cy="50%" r="60%">
      <stop offset="0%" stop-color="${s.color}" stop-opacity="0.9" />
      <stop offset="100%" stop-color="#020617" stop-opacity="0.95" />
    </radialGradient>
  `;
  const style = `
    @keyframes shopHeroBob { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-10px) scale(1.05); } }
    @keyframes shopAuraPulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
    .shop-hero-core { transform-origin: 256px 256px; animation: shopHeroBob 3s ease-in-out infinite; }
    .shop-aura-ring { animation: shopAuraPulse 2s ease-in-out infinite; }
  `;
  const body = `
    <g id="character-bg">
      <rect x="0" y="0" width="512" height="512" fill="#030712" />
      <circle cx="256" cy="256" r="175" fill="url(#shopGlow_${s.file.slice(0, 14)})" />
      <circle cx="256" cy="256" r="140" fill="none" stroke="${s.color}" stroke-width="2" stroke-dasharray="8 6" class="shop-aura-ring" />
    </g>
    <g id="character-body" class="shop-hero-core">
      <!-- Monumental Crest -->
      <circle cx="256" cy="256" r="85" fill="#0f172a" stroke="${s.color}" stroke-width="6" />
      <text x="256" y="280" font-size="78" text-anchor="middle" font-family="'Apple Color Emoji','Segoe UI Emoji',sans-serif">${s.icon}</text>
      <!-- Decorative Cyber Flares -->
      <polygon points="256,120 266,150 256,140 246,150" fill="${s.color}" />
      <polygon points="256,392 266,362 256,372 246,362" fill="${s.color}" />
      <polygon points="120,256 150,266 140,256 150,246" fill="${s.color}" />
      <polygon points="392,256 362,266 372,256 362,246" fill="${s.color}" />
    </g>
  `;
  const svg = generateFrameSvg(body, customDefs + `<style>${style}</style>`);
  fs.writeFileSync(`${AVATARS_DIR}/${s.file}`, svg, 'utf8');
  console.log(`✓ ${s.file} generated (${s.title})`);
}

console.log('🎉 All 25 Expansion & Shop Animated SVG Characters built successfully!');
