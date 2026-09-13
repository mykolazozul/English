import fs from 'fs';
import path from 'path';

const appPath = path.resolve('src/App.jsx');
let code = fs.readFileSync(appPath, 'utf8');

// 1. Version
code = code.replace("const VERSION = '3.5.0';", "const VERSION = '3.5.1';");

// 2. speak with sound caption & mobile unlock
const oldSpeak = `function speak(t, rate = 0.9) {
  if (!('speechSynthesis' in window) || window.__efQuiet) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(t);
  u.lang = 'en-US';
  // browsers often clamp; slow mode uses lower rate + slightly lower pitch
  u.rate = Math.max(0.4, Math.min(1.2, rate));
  u.pitch = rate < 0.75 ? 0.85 : 1;
  speechSynthesis.speak(u);
}`;

const newSpeak = `function speak(t, rate = 0.9, phonetic = '') {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ef-sound-caption', {
      detail: { text: String(t || ''), phonetic: String(phonetic || '') }
    }));
  }
  if (!('speechSynthesis' in window) || window.__efQuiet) return;
  try {
    speechSynthesis.cancel();
    if (speechSynthesis.paused) speechSynthesis.resume();
    const u = new SpeechSynthesisUtterance(t);
    u.lang = 'en-US';
    // browsers often clamp; slow mode uses lower rate + slightly lower pitch
    u.rate = Math.max(0.4, Math.min(1.2, rate));
    u.pitch = rate < 0.75 ? 0.85 : 1;
    speechSynthesis.speak(u);
  } catch (err) {
    console.warn('SpeechSynthesis error:', err);
  }
}`;

if (code.includes(oldSpeak)) {
  code = code.replace(oldSpeak, newSpeak);
  console.log('✓ Updated speak function with visual captions and touch resume');
} else {
  console.warn('⚠️ oldSpeak not found');
}

// 3. Layout with swipe gestures & audio context unlock
const oldLayout = `function Layout({children, state, page, nav, mobile, setMobile}) {
  const isAdmin = state?.role === 'admin' || String(state?.nick).toLowerCase() === 'boss' || String(state?.name).toLowerCase() === 'boss';
  return (
    <div className="app">`;

const newLayout = `function Layout({children, state, page, nav, mobile, setMobile}) {
  const isAdmin = state?.role === 'admin' || String(state?.nick).toLowerCase() === 'boss' || String(state?.name).toLowerCase() === 'boss';
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });

  useEffect(() => {
    const unlockAudio = () => {
      if (typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    };
    window.addEventListener('touchstart', unlockAudio, { passive: true, once: true });
    return () => window.removeEventListener('touchstart', unlockAudio);
  }, []);

  const handleTouchStart = (e) => {
    if (!e.touches || e.touches.length === 0) return;
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now()
    };
  };

  const handleTouchEnd = (e) => {
    if (!e.changedTouches || e.changedTouches.length === 0) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    const dt = Date.now() - touchStartRef.current.time;

    // Horizontal swipe detection: swipe right from screen edge opens drawer, swipe left closes
    if (Math.abs(dx) > Math.abs(dy) * 1.4 && dt < 600) {
      if (!mobile && touchStartRef.current.x < 75 && dx > 40) {
        setMobile(true);
      } else if (mobile && dx < -40) {
        setMobile(false);
      }
    }
  };

  return (
    <div className="app" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>`;

if (code.includes(oldLayout)) {
  code = code.replace(oldLayout, newLayout);
  console.log('✓ Updated Layout with swipe gestures and mobile touch handlers');
} else {
  console.warn('⚠️ oldLayout not found');
}

// 4. Header stat pill title
code = code.replace(
  'title="Древні Монети / Поінти (ігрова валюта)"',
  'title="Золоті Монети (ігрова валюта)"'
);

// 5. Add SoundCaptionOverlay definition and render
const soundCaptionOverlayDef = `/* ==========================================================================
   v3.5.1 — MOBILE SOUND TEXT CAPTION OVERLAY
   ========================================================================== */
function SoundCaptionOverlay() {
  const [caption, setCaption] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const handleCaption = (e) => {
      const { text, phonetic } = e.detail || {};
      if (!text) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      setCaption({ text, phonetic });
      timerRef.current = setTimeout(() => {
        setCaption(null);
      }, 3200);
    };

    window.addEventListener('ef-sound-caption', handleCaption);
    return () => {
      window.removeEventListener('ef-sound-caption', handleCaption);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!caption) return null;

  return (
    <div className="sound-caption-overlay" role="status" aria-live="polite">
      <div className="sound-caption-pill">
        <span className="sound-caption-wave">🔊</span>
        <span className="sound-caption-text">{caption.text}</span>
        {caption.phonetic ? (
          <span className="sound-caption-phonetic">[{caption.phonetic}]</span>
        ) : null}
      </div>
    </div>
  );
}

`;

if (!code.includes('function SoundCaptionOverlay()')) {
  code = code.replace(
    '/* ==========================================================================\n   v3.5.1 — MYSTERY CHEST OF KNOWLEDGE (200 GOLDEN COINS)\n   ========================================================================== */',
    soundCaptionOverlayDef + '/* ==========================================================================\n   v3.5.1 — MYSTERY CHEST OF KNOWLEDGE (200 GOLDEN COINS)\n   ========================================================================== */'
  );
  console.log('✓ Added SoundCaptionOverlay component definition');
}

if (!code.includes('<SoundCaptionOverlay />')) {
  code = code.replace(
    '<Toast msg={toast} />',
    '<Toast msg={toast} />\n      <SoundCaptionOverlay />'
  );
  console.log('✓ Mounted <SoundCaptionOverlay /> in root JSX');
}

// 6. Fix jackpot in CsCaseRouletteModal (strictly no XP)
const oldJackpot = `else if (won.type === 'jackpot') { rewarded.xp = (rewarded.xp || 0) + 500; rewarded.gems = (rewarded.gems || 0) + 200; }`;
const newJackpot = `else if (won.type === 'jackpot') { rewarded.gems = (rewarded.gems || 0) + 500; rewarded.inventory = { ...inv, vipFrame: true }; }`;

if (code.includes(oldJackpot)) {
  code = code.replace(oldJackpot, newJackpot);
  console.log('✓ Fixed jackpot to award +500 Золотих Монет without XP');
}

// 7. Economy Manifesto Modal
code = code.replace(
  'v3.5.0 · Принцип абсолютної академічної чесності',
  'v3.5.1 · Принцип абсолютної академічної чесності'
);
code = code.replace(
  '🪙 Золоті Монети (Dubloons) — Навчальна Нагорода:',
  '🪙 Золоті Монети — Навчальна Нагорода:'
);

// 8. Shop Header
code = code.replace(
  '<h1 className="tavern-wood-h1" style={{margin:0}}>🏛️ КРАМНИЦЯ ДУБЛОНІВ ТА БУСТЕРІВ</h1>',
  '<h1 className="tavern-wood-h1" style={{margin:0}}>🏛️ КРАМНИЦЯ ЗОЛОТИХ МОНЕТ ТА БУСТЕРІВ</h1>'
);

const oldPurseAndXp = `          {/* Glowing Coin Purse with Enhanced Yellow Glow */}
          <div className="tavern-purse-badge">
            <AncientCoinIcon size={24} className="coin-icon-svg" />
            <div style={{display:'flex',flexDirection:'column'}}>
              <span className="tavern-purse-label">Скарбниця</span>
              <b className="tavern-purse-val">{gems} 🪙</b>
            </div>
          </div>

          {/* XP League Rating Pill */}
          <div className="tavern-xp-badge">
            <span className="tavern-purse-label">Рейтинг Ліги</span>
            <b style={{color:'#facc15',fontSize:16}}>⚡ {xp} XP</b>
          </div>`;

const newPurseOnly = `          {/* Glowing Coin Purse with Enhanced Yellow Glow */}
          <div className="tavern-purse-badge">
            <AncientCoinIcon size={24} className="coin-icon-svg" />
            <div style={{display:'flex',flexDirection:'column'}}>
              <span className="tavern-purse-label">Скарбниця</span>
              <b className="tavern-purse-val">{gems} 🪙</b>
            </div>
          </div>`;

if (code.includes(oldPurseAndXp)) {
  code = code.replace(oldPurseAndXp, newPurseOnly);
  console.log('✓ Removed tavern-xp-badge from Shop header (pure coin treasury)');
}

// 9. Ancient map button price fix
code = code.replace("onClick={() => buy('ancient_map', 150)}", "onClick={() => buy('ancient_map', 200)}");

// 10. Lesson complete text
code = code.replace('+2 Древніх Поінти за урок', '+2 Золоті Монети за урок');

// 11. Comments clean-up
code = code.replace('{/* CS:GO Roulette Mystery Case Modal */}', '{/* Mystery Chest Roulette Modal */}');

fs.writeFileSync(appPath, code, 'utf8');
console.log('🚀 Successfully updated App.jsx for v3.5.1!');
