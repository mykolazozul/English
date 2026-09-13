import fs from 'node:fs';

const appPath = 'src/App.jsx';
let content = fs.readFileSync(appPath, 'utf8');

// Update AvatarIcon signature and actualId derivation
const oldStart = `function AvatarIcon({ id, size = 44, className = '', style = {}, aura = '', frame = '' }) {
  const av = GAME_AVATARS_30.find(a => a.id === id) || GAME_AVATARS_30[0];
  const wrap = (node) => (!aura && !frame ? node : (
    <span className={\`avatar-cosmetic-wrap \${aura || ''} \${frame || ''}\`} style={{display:'inline-flex',alignItems:'center',justifyContent:'center',position:'relative',borderRadius:14,flexShrink:0}}>
      {node}
    </span>
  ));
  
  if (!id || (!id.startsWith('duo_') && !id.startsWith('avatar_') && !GAME_AVATARS_30.some(x => x.id === id))) {
    return wrap(
      <span
        className={'avatar-emoji-fallback ' + className}
        style={{
          width: size, height: size, fontSize: Math.floor(size * 0.6),
          display: 'inline-grid', placeItems: 'center', borderRadius: 14,
          background: 'color-mix(in srgb, var(--accent) 12%, var(--surface))',
          flexShrink: 0, ...style
        }}
      >
        {id || '🛡️'}
      </span>
    );
  }`;

const newStart = `function AvatarIcon({ id, av: propAv, size = 44, className = '', style = {}, aura = '', frame = '' }) {
  const actualId = id || propAv?.id || (typeof propAv === 'string' ? propAv : '');
  const av = GAME_AVATARS_30.find(a => a.id === actualId) || (propAv && typeof propAv === 'object' ? propAv : GAME_AVATARS_30[0]);
  const wrap = (node) => (!aura && !frame ? node : (
    <span className={\`avatar-cosmetic-wrap \${aura || ''} \${frame || ''}\`} style={{display:'inline-flex',alignItems:'center',justifyContent:'center',position:'relative',borderRadius:14,flexShrink:0}}>
      {node}
    </span>
  ));
  
  if (!actualId || (!actualId.startsWith('duo_') && !actualId.startsWith('avatar_') && !GAME_AVATARS_30.some(x => x.id === actualId))) {
    return wrap(
      <span
        className={'avatar-emoji-fallback ' + className}
        style={{
          width: size, height: size, fontSize: Math.floor(size * 0.6),
          display: 'inline-grid', placeItems: 'center', borderRadius: 14,
          background: 'color-mix(in srgb, var(--accent) 12%, var(--surface))',
          flexShrink: 0, ...style
        }}
      >
        {actualId || '🛡️'}
      </span>
    );
  }`;

content = content.replace(oldStart, newStart);

// Now locate where anim_wizard ends, and append the 12 Series 2 archetypes
const animWizardEnd = `          <circle cx="50" cy="16" r="2" fill="#facc15"/>
          <polygon points="46,36 54,36 50,54" fill="#f8fafc"/>
        </g>
      )}`;

const series2SVGRenderers = `          <circle cx="50" cy="16" r="2" fill="#facc15"/>
          <polygon points="46,36 54,36 50,54" fill="#f8fafc"/>
        </g>
      )}

      {/* 36. Series 2: Monster Warrior with Spiked Club */}
      {av.archetype === 'series2_monster' && (
        <g>
          {/* Spiked War Club */}
          <line x1="66" y1="18" x2="84" y2="68" stroke="#78350f" strokeWidth="5" strokeLinecap="round"/>
          <polygon points="62,18 74,12 82,24 70,30" fill="#64748b"/>
          <line x1="70" y1="16" x2="66" y2="10" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="78" y1="20" x2="84" y2="14" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round"/>
          {/* Muscular Beast Body */}
          <path d="M32 46 L68 46 L62 86 L38 86 Z" fill="#15803d" stroke="#14532d" strokeWidth="2"/>
          <circle cx="50" cy="34" r="13" fill="#22c55e" stroke="#15803d" strokeWidth="1.5"/>
          {/* Horned Brow & Fangs */}
          <polygon points="41,26 35,16 43,22" fill="#fef08a"/>
          <polygon points="59,26 65,16 57,22" fill="#fef08a"/>
          <circle cx="45" cy="33" r="2" fill="#1e293b"/>
          <circle cx="55" cy="33" r="2" fill="#1e293b"/>
          <polygon points="45,40 48,35 50,40" fill="#fef08a"/>
          <polygon points="50,40 52,35 55,40" fill="#fef08a"/>
          <rect x="36" y="64" width="28" height="8" rx="2" fill="#854d0e"/>
          <circle cx="50" cy="68" r="2.5" fill="#facc15"/>
        </g>
      )}

      {/* 37. Series 2: Pilot Duck in Red Biplane */}
      {av.archetype === 'series2_pilot_duck' && (
        <g>
          {/* Biplane Wings */}
          <rect x="12" y="58" width="76" height="8" rx="4" fill="#dc2626" stroke="#991b1b" strokeWidth="1.5"/>
          {/* Cockpit & Fuselage */}
          <ellipse cx="50" cy="66" rx="26" ry="16" fill="#ef4444" stroke="#b91c1c" strokeWidth="2"/>
          {/* Propeller Arc */}
          <ellipse cx="50" cy="82" rx="30" ry="5" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2" strokeDasharray="6 4"/>
          <circle cx="50" cy="82" r="4" fill="#475569"/>
          {/* Duck Pilot Head */}
          <circle cx="50" cy="40" r="14" fill="#facc15" stroke="#ca8a04" strokeWidth="1.5"/>
          {/* Leather Helmet & Goggles */}
          <path d="M37 38 C37 25 63 25 63 38 Z" fill="#78350f"/>
          <rect x="39" y="34" width="10" height="7" rx="3" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5"/>
          <rect x="51" y="34" width="10" height="7" rx="3" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5"/>
          {/* Orange Beak */}
          <polygon points="46,44 54,44 50,51" fill="#f97316"/>
        </g>
      )}

      {/* 38. Series 2: Treant Living Oak Defender */}
      {av.archetype === 'series2_treant' && (
        <g>
          {/* Living Bark Torso */}
          <path d="M34 38 L66 38 L62 86 L38 86 Z" fill="#78350f" stroke="#451a03" strokeWidth="2"/>
          {/* Bark Lines */}
          <line x1="44" y1="46" x2="42" y2="76" stroke="#451a03" strokeWidth="2"/>
          <line x1="56" y1="46" x2="58" y2="76" stroke="#451a03" strokeWidth="2"/>
          {/* Mossy Crown Head */}
          <circle cx="50" cy="30" r="13" fill="#84cc16" stroke="#4d7c0f" strokeWidth="2"/>
          <polygon points="40,22 44,12 48,20" fill="#65a30d"/>
          <polygon points="52,20 56,12 60,22" fill="#65a30d"/>
          <circle cx="45" cy="30" r="2.5" fill="#fef08a"/>
          <circle cx="55" cy="30" r="2.5" fill="#fef08a"/>
          {/* Spiked Thorn Mace & Shield */}
          <line x1="68" y1="36" x2="84" y2="68" stroke="#451a03" strokeWidth="4.5" strokeLinecap="round"/>
          <circle cx="84" cy="68" r="6" fill="#84cc16"/>
          <path d="M16 46 Q30 46 30 70 Q24 76 16 70 Z" fill="#854d0e" stroke="#ca8a04" strokeWidth="1.5"/>
        </g>
      )}

      {/* 39. Series 2: Steel Plate Axe Knight */}
      {av.archetype === 'series2_axe_knight' && (
        <g>
          {/* Blue Battle Slash */}
          <path d="M48 12 Q86 16 82 54" stroke="#38bdf8" strokeWidth="3.5" strokeLinecap="round" fill="none" opacity="0.8"/>
          {/* Heavy Double Axe */}
          <line x1="48" y1="20" x2="78" y2="74" stroke="#475569" strokeWidth="4.5" strokeLinecap="round"/>
          <path d="M68 18 C78 12 84 26 76 34 Z" fill="#94a3b8" stroke="#cbd5e1" strokeWidth="1.5"/>
          <path d="M60 24 C54 18 64 8 72 16 Z" fill="#94a3b8" stroke="#cbd5e1" strokeWidth="1.5"/>
          {/* Armored Paladin */}
          <path d="M34 44 L66 44 L60 86 L40 86 Z" fill="#475569" stroke="#94a3b8" strokeWidth="2"/>
          <circle cx="50" cy="32" r="11" fill="#cbd5e1" stroke="#475569" strokeWidth="2"/>
          <rect x="42" y="30" width="16" height="3" rx="1.5" fill="#0284c7"/>
          <polygon points="50,16 46,24 54,24" fill="#f59e0b"/>
        </g>
      )}

      {/* 40. Series 2: Death Shadow Knight */}
      {av.archetype === 'series2_death_knight' && (
        <g>
          {/* Violet Spectral Aura */}
          <circle cx="50" cy="50" r="38" fill="rgba(168,85,247,0.18)" stroke="#a855f7" strokeWidth="1" strokeDasharray="4 3"/>
          {/* Dark Broadsword with Rune */}
          <line x1="72" y1="12" x2="68" y2="78" stroke="#1e1b4b" strokeWidth="4.5" strokeLinecap="round"/>
          <line x1="62" y1="28" x2="82" y2="28" stroke="#c084fc" strokeWidth="3"/>
          <circle cx="72" cy="18" r="3" fill="#c084fc"/>
          {/* Shadow Armor */}
          <path d="M32 44 L68 44 L62 86 L38 86 Z" fill="#1e1b4b" stroke="#6b21a8" strokeWidth="2"/>
          <circle cx="50" cy="32" r="11" fill="#2e1065" stroke="#a855f7" strokeWidth="1.5"/>
          {/* Glowing Violet Visor Eyes */}
          <ellipse cx="46" cy="32" rx="3" ry="1.5" fill="#d946ef"/>
          <ellipse cx="54" cy="32" rx="3" ry="1.5" fill="#d946ef"/>
          {/* Flowing Obsidian Cloak */}
          <path d="M30 46 Q20 64 26 84" stroke="#7c3aed" strokeWidth="3" fill="none"/>
        </g>
      )}

      {/* 41. Series 2: Heavy Axe Juggernaut */}
      {av.archetype === 'series2_heavy_axe' && (
        <g>
          {/* Crimson Plume Crest */}
          <path d="M50 12 Q56 4 64 12 Q56 20 50 22" fill="#ef4444"/>
          {/* Massive Two-Handed Halberd */}
          <line x1="32" y1="16" x2="74" y2="82" stroke="#334155" strokeWidth="5" strokeLinecap="round"/>
          <path d="M24 16 Q36 6 44 22 L28 28 Z" fill="#f87171" stroke="#b91c1c" strokeWidth="1.5"/>
          {/* Heavy Juggernaut Armor */}
          <path d="M30 42 L70 42 L64 88 L36 88 Z" fill="#7f1d1d" stroke="#ef4444" strokeWidth="2"/>
          <circle cx="50" cy="30" r="12" fill="#94a3b8" stroke="#475569" strokeWidth="2"/>
          <rect x="42" y="28" width="16" height="3" fill="#fef08a"/>
          {/* Red Belt */}
          <rect x="36" y="60" width="28" height="6" fill="#b91c1c"/>
        </g>
      )}

      {/* 42. Series 2: Hunter Fox with Recurve Bow */}
      {av.archetype === 'series2_hunter_fox' && (
        <g>
          {/* Recurve Bow & Arrow */}
          <path d="M68 20 Q84 48 68 76" stroke="#78350f" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
          <line x1="68" y1="20" x2="68" y2="76" stroke="#e2e8f0" strokeWidth="1.5"/>
          <line x1="42" y1="48" x2="76" y2="48" stroke="#f97316" strokeWidth="2.5"/>
          <polygon points="76,48 71,45 71,51" fill="#ea580c"/>
          {/* Fox Body in Ranger Hood */}
          <path d="M34 46 L62 46 L58 86 L38 86 Z" fill="#166534" stroke="#14532d" strokeWidth="2"/>
          <circle cx="48" cy="34" r="12" fill="#ea580c" stroke="#9a3412" strokeWidth="1.5"/>
          {/* White Cheeks & Fox Ears */}
          <polygon points="40,24 36,12 44,18" fill="#ea580c"/>
          <polygon points="56,24 60,12 52,18" fill="#ea580c"/>
          <circle cx="44" cy="34" r="2" fill="#1e293b"/>
          <circle cx="52" cy="34" r="2" fill="#1e293b"/>
          <polygon points="48,39 45,36 51,36" fill="#1e293b"/>
        </g>
      )}

      {/* 43. Series 2: Rogue Alien Assassin */}
      {av.archetype === 'series2_rogue_alien' && (
        <g>
          {/* Twin Emerald Energy Blades */}
          <line x1="26" y1="28" x2="16" y2="68" stroke="#10b981" strokeWidth="3" strokeLinecap="round"/>
          <line x1="74" y1="28" x2="84" y2="68" stroke="#10b981" strokeWidth="3" strokeLinecap="round"/>
          {/* Sleek Chitin Body */}
          <path d="M36 44 L64 44 L58 86 L42 86 Z" fill="#064e3b" stroke="#10b981" strokeWidth="1.5"/>
          <circle cx="50" cy="32" r="11" fill="#059669" stroke="#34d399" strokeWidth="1.5"/>
          {/* Luminous Antennae */}
          <line x1="45" y1="22" x2="38" y2="12" stroke="#34d399" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="38" cy="12" r="2" fill="#6ee7b7"/>
          <line x1="55" y1="22" x2="62" y2="12" stroke="#34d399" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="62" cy="12" r="2" fill="#6ee7b7"/>
          {/* Alien Eyes */}
          <ellipse cx="44" cy="32" rx="4" ry="2.5" fill="#a7f3d0"/>
          <ellipse cx="56" cy="32" rx="4" ry="2.5" fill="#a7f3d0"/>
        </g>
      )}

      {/* 44. Series 2: Tactical Operative Cat */}
      {av.archetype === 'series2_tactical_cat' && (
        <g>
          {/* Tactical Vest */}
          <path d="M34 46 L66 46 L62 86 L38 86 Z" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5"/>
          <rect x="42" y="52" width="16" height="12" rx="2" fill="#334155"/>
          {/* Cat Head */}
          <circle cx="50" cy="34" r="12" fill="#64748b" stroke="#334155" strokeWidth="1.5"/>
          {/* Cat Ears */}
          <polygon points="40,24 34,14 44,20" fill="#475569"/>
          <polygon points="60,24 66,14 56,20" fill="#475569"/>
          {/* Night Vision Quad-Goggles Glowing Cyan */}
          <rect x="38" y="28" width="24" height="6" rx="2" fill="#0f172a"/>
          <circle cx="42" cy="31" r="2" fill="#38bdf8"/>
          <circle cx="47" cy="31" r="2" fill="#38bdf8"/>
          <circle cx="53" cy="31" r="2" fill="#38bdf8"/>
          <circle cx="58" cy="31" r="2" fill="#38bdf8"/>
          {/* Slung Tactical Carbine */}
          <line x1="30" y1="48" x2="72" y2="78" stroke="#0f172a" strokeWidth="3.5" strokeLinecap="round"/>
        </g>
      )}

      {/* 45. Series 2: Warlock Summoner */}
      {av.archetype === 'series2_warlock' && (
        <g>
          {/* Crackling Lightning Runes */}
          <path d="M22 24 L28 34 L22 42 L30 54" stroke="#fde047" strokeWidth="2.5" fill="none"/>
          <path d="M78 24 L72 34 L78 42 L70 54" stroke="#c084fc" strokeWidth="2.5" fill="none"/>
          {/* Horned Mantle */}
          <path d="M42 22 Q32 10 28 20 Q36 24 42 24" fill="#581c87"/>
          <path d="M58 22 Q68 10 72 20 Q64 24 58 24" fill="#581c87"/>
          {/* Robes */}
          <path d="M34 42 L66 42 L70 88 L30 88 Z" fill="#3b0764" stroke="#9333ea" strokeWidth="2"/>
          <circle cx="50" cy="30" r="10" fill="#c084fc"/>
          <circle cx="46" cy="29" r="1.5" fill="#fde047"/>
          <circle cx="54" cy="29" r="1.5" fill="#fde047"/>
        </g>
      )}

      {/* 46. Series 2: Swarm Alien Insectoid */}
      {av.archetype === 'series2_swarm_alien' && (
        <g>
          {/* 4 Arms Wielding Dual Blasters */}
          <line x1="28" y1="40" x2="14" y2="40" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round"/>
          <line x1="28" y1="56" x2="14" y2="56" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round"/>
          <line x1="72" y1="40" x2="86" y2="40" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round"/>
          <line x1="72" y1="56" x2="86" y2="56" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round"/>
          {/* Amber Insect Body */}
          <path d="M36 42 L64 42 L58 86 L42 86 Z" fill="#78350f" stroke="#d97706" strokeWidth="2"/>
          <circle cx="50" cy="30" r="11" fill="#b45309" stroke="#f59e0b" strokeWidth="1.5"/>
          {/* Segmented Eyes */}
          <ellipse cx="44" cy="29" rx="3.5" ry="5" fill="#fef08a"/>
          <ellipse cx="56" cy="29" rx="3.5" ry="5" fill="#fef08a"/>
        </g>
      )}

      {/* 47. Series 2: Mountain Dwarf Berserker */}
      {av.archetype === 'series2_dwarf_berserker' && (
        <g>
          {/* Crossed Dual Bearded Axes */}
          <line x1="32" y1="24" x2="68" y2="82" stroke="#78350f" strokeWidth="4" strokeLinecap="round"/>
          <line x1="68" y1="24" x2="32" y2="82" stroke="#78350f" strokeWidth="4" strokeLinecap="round"/>
          <path d="M26 24 C20 32 32 40 38 32 Z" fill="#cbd5e1" stroke="#475569" strokeWidth="1.5"/>
          <path d="M74 24 C80 32 68 40 62 32 Z" fill="#cbd5e1" stroke="#475569" strokeWidth="1.5"/>
          {/* Sturdy Armored Dwarf Body */}
          <rect x="34" y="52" width="32" height="34" rx="6" fill="#854d0e" stroke="#451a03" strokeWidth="2"/>
          {/* Horned Iron Helm */}
          <circle cx="50" cy="38" r="12" fill="#64748b" stroke="#334155" strokeWidth="2"/>
          <path d="M38 34 Q32 20 28 24" stroke="#fef08a" strokeWidth="3" fill="none"/>
          <path d="M62 34 Q68 20 72 24" stroke="#fef08a" strokeWidth="3" fill="none"/>
          {/* Braided Fiery Orange Beard */}
          <path d="M40 44 Q50 68 50 68 Q50 68 60 44 Z" fill="#f97316"/>
          <line x1="47" y1="52" x2="47" y2="64" stroke="#ea580c" strokeWidth="1.5"/>
          <line x1="53" y1="52" x2="53" y2="64" stroke="#ea580c" strokeWidth="1.5"/>
        </g>
      )}`;

content = content.replace(animWizardEnd, series2SVGRenderers);

fs.writeFileSync(appPath, content, 'utf8');
console.log('Successfully patched AvatarIcon with full vector Series 2 characters!');
