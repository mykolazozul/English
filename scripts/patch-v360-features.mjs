import fs from 'node:fs';

const appPath = 'src/App.jsx';
let content = fs.readFileSync(appPath, 'utf8');

// 1. Web Audio Soundscape per Tier for Achievements
const oldBadgeListener = `  useEffect(() => {
    const onBadge = (e) => {
      if (e?.detail) setEpicBadge(e.detail);
    };
    window.addEventListener('ef-badge-unlocked', onBadge);
    return () => window.removeEventListener('ef-badge-unlocked', onBadge);
  }, []);`;

const newBadgeListener = `  useEffect(() => {
    let timer = null;
    const onBadge = (e) => {
      if (e?.detail) {
        setEpicBadge(e.detail);
        playBadgeTierSound(e.detail.tier || 'starter');
        confettiBurst();
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => setEpicBadge(null), 5000);
      }
    };
    window.addEventListener('ef-badge-unlocked', onBadge);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener('ef-badge-unlocked', onBadge);
    };
  }, []);`;

content = content.replace(oldBadgeListener, newBadgeListener);

// Insert playBadgeTierSound helper right before sound functions or Layout
const soundHelperCode = `
function playBadgeTierSound(tier = 'starter') {
  if (typeof window === 'undefined' || window.__efNoSfx) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const freqs = tier === 'legendary' ? [784, 987, 1174, 1568]
      : tier === 'advanced' ? [659, 830, 988, 1318]
      : tier === 'secret' ? [440, 554, 659, 880, 1108]
      : tier === 'medium' ? [587, 740, 880]
      : [523, 659];
    
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = tier === 'legendary' ? 'sine' : (tier === 'secret' ? 'triangle' : 'sine');
      osc.frequency.setValueAtTime(f, ctx.currentTime + idx * 0.09);
      gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.09 + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.09);
      osc.stop(ctx.currentTime + idx * 0.09 + 0.5);
    });
  } catch {}
}
`;

content = content.replace('function playChestTone(pack) {', soundHelperCode + '\nfunction playChestTone(pack) {');

// 2. Expand MYSTERY_CHEST_ITEMS with +35, +45, +50 coins
const oldMysteryItems = `const MYSTERY_CHEST_ITEMS = [
  { id: 'coins_25', name: '+25 Золотих Монет', icon: '🪙', rarity: 'blue', type: 'gems', amount: 25, color: '#3b82f6' },
  { id: 'second_chance', name: 'Стирач помилок', icon: '🔄', rarity: 'blue', type: 'second_chance', amount: 1, color: '#3b82f6' },`;

const newMysteryItems = `const MYSTERY_CHEST_ITEMS = [
  { id: 'coins_25', name: '+25 Золотих Монет', icon: '🪙', rarity: 'blue', type: 'gems', amount: 25, color: '#3b82f6' },
  { id: 'coins_35', name: '+35 Золотих Монет', icon: '🪙', rarity: 'blue', type: 'gems', amount: 35, color: '#3b82f6' },
  { id: 'coins_45', name: '+45 Золотих Монет', icon: '🪙', rarity: 'blue', type: 'gems', amount: 45, color: '#3b82f6' },
  { id: 'coins_50', name: '+50 Золотих Монет', icon: '🪙', rarity: 'blue', type: 'gems', amount: 50, color: '#3b82f6' },
  { id: 'second_chance', name: 'Стирач помилок', icon: '🔄', rarity: 'blue', type: 'second_chance', amount: 1, color: '#3b82f6' },`;

content = content.replace(oldMysteryItems, newMysteryItems);

// 3. Add new shop items: Cosmic frame in FRAMES
const oldFrames = `  const FRAMES = [
    { id: 'cosmetic_frame_gold', css: 'frame-gold', name: '👑 Золота рамка', rarity: 'RARE', cost: 45 },`;

const newFrames = `  const FRAMES = [
    { id: 'cosmetic_frame_cosmic', css: 'frame-cosmic', name: '🌌 Космічна VIP Рамка', rarity: 'LEGENDARY', cost: 60 },
    { id: 'cosmetic_frame_gold', css: 'frame-gold', name: '👑 Золота рамка', rarity: 'RARE', cost: 45 },`;

content = content.replace(oldFrames, newFrames);

// 4. Update SettingsPage ICON_STYLES_10 with 10 distinct icon sets
const oldIconStyles = `const ICON_STYLES_10 = [
  {id: 'lucide_minimal', name: '1. Clean Monoline', icon: '📐', desc: 'Мінімалістичні неоморфічні тонкі лінії'},
  {id: 'duotone_emerald', name: '2. Emerald Duotone', icon: '💎', desc: 'Смарагдові двохтонові векторні іконки'},
  {id: 'cyber_neon', name: '3. Cyberpunk Glow', icon: '⚡', desc: 'Неонове футуристичне сяйво'},
  {id: 'isometric_3d', name: '4. Isometric 3D', icon: '🧊', desc: 'Ізометричні об\\'ємні векторні фігури'},
  {id: 'flat_vibrant', name: '5. Flat Vibrant', icon: '🎨', desc: 'Контрастні соковиті пласкі піктограми'},
  {id: 'material_sharp', name: '6. Material Sharp', icon: '⏹️', desc: 'Строгі геометричні форми Google'},
  {id: 'hand_drawn', name: '7. Hand-Crafted', icon: '✏️', desc: 'Живий авторський ескізний штрих'},
  {id: 'glass_pro', name: '8. Liquid Glass', icon: '🔮', desc: 'Напівпрозоре матове рідке скло'},
  {id: 'retro_pixel', name: '9. Retro 8-bit', icon: '👾', desc: 'Піксельна аркадна естетика'},
  {id: 'golden_luxury', name: '10. Gold Luxury', icon: '👑', desc: 'Золоті витончені королівські контури'}
];`;

const newIconStyles = `const ICON_STYLES_10 = [
  {id: 'lucide_minimal', name: '1. Clean Monoline', icon: '📐', desc: 'Мінімалістичні неоморфічні тонкі лінії', preview: ['📐', '⚡', '🎯', '🏆', '🏛️', '🛡️']},
  {id: 'duotone_emerald', name: '2. Emerald Duotone', icon: '💎', desc: 'Смарагдові двохтонові векторні іконки', preview: ['📗', '🔋', '❇️', '🥇', '🌿', '🔰']},
  {id: 'cyber_neon', name: '3. Cyberpunk Glow', icon: '⚡', desc: 'Неонове футуристичне сяйво', preview: ['🔮', '⚡', '👁️‍🗨️', '🌌', '🏙️', '💠']},
  {id: 'isometric_3d', name: '4. Isometric 3D', icon: '🧊', desc: 'Ізометричні об\\'ємні векторні фігури', preview: ['📦', '💥', '🎲', '🏅', '🏰', '🛡️']},
  {id: 'flat_vibrant', name: '5. Flat Vibrant', icon: '🎨', desc: 'Контрастні соковиті пласкі піктограми', preview: ['📚', '⚡', '🎯', '🏆', '🎪', '🛡️']},
  {id: 'material_sharp', name: '6. Material Sharp', icon: '⏹️', desc: 'Строгі геометричні форми Google', preview: ['📄', '⚡', '🎯', '🏆', '🏢', '🛡️']},
  {id: 'hand_drawn', name: '7. Hand-Crafted', icon: '✏️', desc: 'Живий авторський ескізний штрих', preview: ['📜', '⚡', '🏹', '🎗️', '🛖', '🛡️']},
  {id: 'glass_pro', name: '8. Liquid Glass', icon: '🔮', desc: 'Напівпрозоре матове рідке скло', preview: ['💎', '💡', '🫧', '✨', '🏛️', '🛡️']},
  {id: 'retro_pixel', name: '9. Retro 8-bit', icon: '👾', desc: 'Піксельна аркадна естетика', preview: ['👾', '🕹️', '👾', '👑', '🏰', '⚔️']},
  {id: 'golden_luxury', name: '10. Gold Luxury', icon: '👑', desc: 'Золоті витончені королівські контури', preview: ['📙', '⭐', '⚜️', '👑', '🏯', '🛡️']}
];`;

content = content.replace(oldIconStyles, newIconStyles);

// Update icon tray rendering in SettingsPage
const oldIconTray = `                    {/* Expandable Icon Pack Tray */}
                    <div className="icon-style-preview-tray" style={{display:'flex',alignItems:'center',gap:10,padding:'6px 10px',background:'rgba(0,0,0,0.18)',borderRadius:8,marginTop:4}}>
                      <span title="Словник">📖</span>
                      <span title="Досвід">⚡</span>
                      <span title="Ціль">🎯</span>
                      <span title="Рейтинг">🏆</span>
                      <span title="Крамниця">🏰</span>
                      <span title="Профіль">🛡️</span>
                    </div>`;

const newIconTray = `                    {/* 10 Thematically Distinct Icon Pack Trays */}
                    <div className="icon-style-preview-tray" style={{display:'flex',alignItems:'center',gap:12,padding:'6px 12px',background:'rgba(0,0,0,0.18)',borderRadius:8,marginTop:4}}>
                      {(s.preview || ['📖', '⚡', '🎯', '🏆', '🏰', '🛡️']).map((pIco, pIdx) => (
                        <span key={pIdx} style={{fontSize:16}}>{pIco}</span>
                      ))}
                    </div>`;

content = content.replace(oldIconTray, newIconTray);

// 5. BadgesPage: Add Live Style Switcher
const oldBadgesPageTop = `      <div className="row-btns" style={{marginBottom: 16}}>
        {tiers.map(t => (
          <button
            key={t.id}
            type="button"
            className={tierFilter === t.id ? 'primary' : 'secondary'}
            onClick={() => setTierFilter(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>`;

const newBadgesPageTop = `      {/* Badge Visual Style Switcher directly on page */}
      <div className="card" style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10,marginBottom:16,padding:'10px 16px'}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <b style={{fontSize:13}}>🎨 Стиль оформлення значків:</b>
        </div>
        <div className="row-btns" style={{gap:6}}>
          {[
            ['neo', '✨ Neo RPG'],
            ['enamel', '🛡️ Enamel'],
            ['crystal', '💎 3D Crystal'],
            ['gold', '🪙 Gold']
          ].map(([stId, stLabel]) => (
            <button
              key={stId}
              type="button"
              className={(state.badgeStyle || 'neo') === stId ? 'primary small' : 'secondary small'}
              onClick={() => save?.({...state, badgeStyle: stId})}
            >
              {stLabel}
            </button>
          ))}
        </div>
      </div>

      <div className="row-btns" style={{marginBottom: 16}}>
        {tiers.map(t => (
          <button
            key={t.id}
            type="button"
            className={tierFilter === t.id ? 'primary' : 'secondary'}
            onClick={() => setTierFilter(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>`;

content = content.replace(oldBadgesPageTop, newBadgesPageTop);

fs.writeFileSync(appPath, content, 'utf8');
console.log('Successfully patched v3.6.0 features batch!');
