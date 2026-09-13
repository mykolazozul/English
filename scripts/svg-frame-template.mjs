import fs from 'fs';
import path from 'path';

const AVATARS_DIR = 'public/avatars';
if (!fs.existsSync(AVATARS_DIR)) {
  fs.mkdirSync(AVATARS_DIR, { recursive: true });
}

// Shared Futuristic Metallic Frame Template (Dark Steel, Beveled UI Border, Cyan Edge Glow, Gold Corner Clamps)
function generateFrameSvg(innerElements, customDefs = '', filterId = '') {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <!-- Master Metallic UI Gradients -->
    <linearGradient id="frameBevelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#334155" />
      <stop offset="25%" stop-color="#1e293b" />
      <stop offset="70%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#020617" />
    </linearGradient>
    <linearGradient id="steelTrimGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#64748b" />
      <stop offset="50%" stop-color="#334155" />
      <stop offset="100%" stop-color="#1e293b" />
    </linearGradient>
    <linearGradient id="cyanNeonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="50%" stop-color="#0284c7" />
      <stop offset="100%" stop-color="#0369a1" />
    </linearGradient>
    <linearGradient id="goldPlateGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a" />
      <stop offset="40%" stop-color="#eab308" />
      <stop offset="100%" stop-color="#a16207" />
    </linearGradient>
    <linearGradient id="lightSweepGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="rgba(56,189,248,0)" />
      <stop offset="50%" stop-color="rgba(56,189,248,0.5)" />
      <stop offset="100%" stop-color="rgba(56,189,248,0)" />
    </linearGradient>

    <!-- Clip Path for Inside the Avatar Screen -->
    <clipPath id="avatarScreenClip">
      <rect x="44" y="44" width="424" height="424" rx="28" />
    </clipPath>

    ${customDefs}
  </defs>

  <style>
    /* Frame continuous subtle animations */
    @keyframes framePulse {
      0%, 100% { stroke-opacity: 0.6; filter: drop-shadow(0 0 6px rgba(56,189,248,0.3)); }
      50% { stroke-opacity: 1; filter: drop-shadow(0 0 14px rgba(56,189,248,0.8)); }
    }
    @keyframes sweepMove {
      0% { transform: translateX(-400px); }
      50%, 100% { transform: translateX(500px); }
    }
    .frame-neon-glow {
      animation: framePulse 4s ease-in-out infinite;
    }
    .frame-sweep-line {
      animation: sweepMove 6s ease-in-out infinite;
    }
  </style>

  <!-- BACKGROUND & CHARACTER CONTENT (CLIPPED TO SCREEN) -->
  <g clip-path="url(#avatarScreenClip)">
    ${innerElements}
  </g>

  <!-- ================= MASTER FUTURISTIC METALLIC FRAME ================= -->
  <g id="frame">
    <!-- Outer Shadow Layer -->
    <rect x="18" y="18" width="476" height="476" rx="42" fill="none" stroke="#020617" stroke-width="12" opacity="0.9" />

    <!-- Main Outer Beveled Steel Shell -->
    <rect x="24" y="24" width="464" height="464" rx="38" fill="none" stroke="url(#frameBevelGrad)" stroke-width="26" />
    
    <!-- Outer Highlight Rim -->
    <rect x="37" y="37" width="438" height="438" rx="32" fill="none" stroke="url(#steelTrimGrad)" stroke-width="4" opacity="0.8" />

    <!-- Neon Cyan Inner Cyber Border -->
    <rect x="44" y="44" width="424" height="424" rx="28" fill="none" stroke="url(#cyanNeonGrad)" stroke-width="5" class="frame-neon-glow" />

    <!-- Corner Armor Clamp 1: Top-Left -->
    <g transform="translate(24, 24)">
      <polygon points="0,0 48,0 24,24 0,48" fill="url(#goldPlateGrad)" />
      <polygon points="4,4 40,4 20,24 4,40" fill="#1e293b" />
      <circle cx="16" cy="16" r="4.5" fill="#fef08a" stroke="#78350f" stroke-width="1.5" />
    </g>

    <!-- Corner Armor Clamp 2: Top-Right -->
    <g transform="translate(488, 24) scale(-1, 1)">
      <polygon points="0,0 48,0 24,24 0,48" fill="url(#goldPlateGrad)" />
      <polygon points="4,4 40,4 20,24 4,40" fill="#1e293b" />
      <circle cx="16" cy="16" r="4.5" fill="#fef08a" stroke="#78350f" stroke-width="1.5" />
    </g>

    <!-- Corner Armor Clamp 3: Bottom-Left -->
    <g transform="translate(24, 488) scale(1, -1)">
      <polygon points="0,0 48,0 24,24 0,48" fill="url(#goldPlateGrad)" />
      <polygon points="4,4 40,4 20,24 4,40" fill="#1e293b" />
      <circle cx="16" cy="16" r="4.5" fill="#fef08a" stroke="#78350f" stroke-width="1.5" />
    </g>

    <!-- Corner Armor Clamp 4: Bottom-Right -->
    <g transform="translate(488, 488) scale(-1, -1)">
      <polygon points="0,0 48,0 24,24 0,48" fill="url(#goldPlateGrad)" />
      <polygon points="4,4 40,4 20,24 4,40" fill="#1e293b" />
      <circle cx="16" cy="16" r="4.5" fill="#fef08a" stroke="#78350f" stroke-width="1.5" />
    </g>

    <!-- Decorative Edge Screws / Rivets -->
    <circle cx="256" cy="31" r="3.5" fill="#94a3b8" stroke="#0f172a" stroke-width="1.5" />
    <circle cx="256" cy="481" r="3.5" fill="#94a3b8" stroke="#0f172a" stroke-width="1.5" />
    <circle cx="31" cy="256" r="3.5" fill="#94a3b8" stroke="#0f172a" stroke-width="1.5" />
    <circle cx="481" cy="256" r="3.5" fill="#94a3b8" stroke="#0f172a" stroke-width="1.5" />

    <!-- Top Bevel Light Sweep Shimmer Line -->
    <rect x="60" y="32" width="200" height="4" fill="url(#lightSweepGrad)" class="frame-sweep-line" />
  </g>
</svg>`;
}

export { generateFrameSvg, AVATARS_DIR };
