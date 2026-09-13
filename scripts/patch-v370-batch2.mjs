import fs from 'fs';

console.log('Applying v3.7.0 batch 2 updates to src/App.jsx...');
let code = fs.readFileSync('src/App.jsx', 'utf8');

// 1. PUBLIC PROFILE MODAL: REMOVE "(1 раз на день)" AND USE "✓ Підбадьорено"
code = code.replace(
  "{boostedToday ? '✓ Підбадьорено (1 раз на день)' : '⚡ Підбадьорити (+5 XP)'}",
  "{boostedToday ? '✓ Підбадьорено' : '⚡ Підбадьорити (+5 XP)'}"
);

// 2. IN PROFILE: INSTANT SAVE ON AVATAR CLICK
const avatarClickOld = "onClick={() => setSelectedAvatar(av.id)}";
const avatarClickNew = "onClick={() => { setSelectedAvatar(av.id); save({ ...state, avatar: av.id }); emitSiteToast(`Аватар встановлено: «${av.name}»`, 'ok'); }}";
code = code.replace(avatarClickOld, avatarClickNew);

// 3. CURRENCY PILL IN TOP NAV: USE AncientCoinIcon
code = code.replace(
  '<span className="currency-pill-coins">🪙 {state.gems || 0} Золотих Монет</span>',
  '<span className="currency-pill-coins" style={{display:\'inline-flex\',alignItems:\'center\',gap:6}}><AncientCoinIcon size={18}/> {state.gems || 0} Золотих Монет</span>'
);

// 4. ICON STYLE PREVIEW PACK (FIX SCREENSHOT 3)
const iconPreviewComponent = `
function IconStylePreviewTray({ styleId }) {
  const packs = {
    lucide_minimal: [
      { label: 'Словник', icon: '📖', color: '#94a3b8' },
      { label: 'Енергія', icon: '⚡', color: '#94a3b8' },
      { label: 'Ціль', icon: '🎯', color: '#94a3b8' },
      { label: 'Кубок', icon: '🏆', color: '#94a3b8' },
      { label: 'Замок', icon: '🏰', color: '#94a3b8' },
      { label: 'Щит', icon: '🛡️', color: '#94a3b8' },
      { label: 'Опції', icon: '⚙️', color: '#94a3b8' },
      { label: 'Чат', icon: '💬', color: '#94a3b8' }
    ],
    duotone_emerald: [
      { label: 'Словник', icon: '📗', color: '#10b981' },
      { label: 'Енергія', icon: '🔋', color: '#34d399' },
      { label: 'Ціль', icon: '❇️', color: '#10b981' },
      { label: 'Кубок', icon: '🥇', color: '#34d399' },
      { label: 'Замок', icon: '🌿', color: '#10b981' },
      { label: 'Щит', icon: '🔰', color: '#34d399' },
      { label: 'Опції', icon: '⚙️', color: '#10b981' },
      { label: 'Чат', icon: '🟢', color: '#34d399' }
    ],
    cyber_neon: [
      { label: 'Словник', icon: '🔮', color: '#06b6d4' },
      { label: 'Енергія', icon: '⚡', color: '#ec4899' },
      { label: 'Ціль', icon: '💠', color: '#06b6d4' },
      { label: 'Кубок', icon: '🏆', color: '#facc15' },
      { label: 'Замок', icon: '🏙️', color: '#06b6d4' },
      { label: 'Щит', icon: '🛡️', color: '#ec4899' },
      { label: 'Опції', icon: '⚙️', color: '#06b6d4' },
      { label: 'Чат', icon: '💬', color: '#ec4899' }
    ],
    isometric_3d: [
      { label: 'Словник', icon: '📦', color: '#6366f1' },
      { label: 'Енергія', icon: '💥', color: '#f59e0b' },
      { label: 'Ціль', icon: '🎲', color: '#6366f1' },
      { label: 'Кубок', icon: '🏅', color: '#f59e0b' },
      { label: 'Замок', icon: '🏰', color: '#6366f1' },
      { label: 'Щит', icon: '🛡️', color: '#f59e0b' },
      { label: 'Опції', icon: '⚙️', color: '#6366f1' },
      { label: 'Чат', icon: '📫', color: '#f59e0b' }
    ],
    flat_vibrant: [
      { label: 'Словник', icon: '📚', color: '#ef4444' },
      { label: 'Енергія', icon: '⚡', color: '#f59e0b' },
      { label: 'Ціль', icon: '🎯', color: '#10b981' },
      { label: 'Кубок', icon: '🏆', color: '#facc15' },
      { label: 'Замок', icon: '🎪', color: '#8b5cf6' },
      { label: 'Щит', icon: '🛡️', color: '#3b82f6' },
      { label: 'Опції', icon: '⚙️', color: '#64748b' },
      { label: 'Чат', icon: '💌', color: '#ec4899' }
    ],
    material_sharp: [
      { label: 'Словник', icon: '📄', color: '#e2e8f0' },
      { label: 'Енергія', icon: '⚡', color: '#38bdf8' },
      { label: 'Ціль', icon: '🎯', color: '#e2e8f0' },
      { label: 'Кубок', icon: '🏆', color: '#38bdf8' },
      { label: 'Замок', icon: '🏢', color: '#e2e8f0' },
      { label: 'Щит', icon: '🛡️', color: '#38bdf8' },
      { label: 'Опції', icon: '⚙️', color: '#e2e8f0' },
      { label: 'Чат', icon: '💬', color: '#38bdf8' }
    ],
    hand_drawn: [
      { label: 'Словник', icon: '📜', color: '#fb923c' },
      { label: 'Енергія', icon: '⚡', color: '#fde047' },
      { label: 'Ціль', icon: '🏹', color: '#fb923c' },
      { label: 'Кубок', icon: '🎗️', color: '#fde047' },
      { label: 'Замок', icon: '🛖', color: '#fb923c' },
      { label: 'Щит', icon: '🛡️', color: '#fde047' },
      { label: 'Опції', icon: '✏️', color: '#fb923c' },
      { label: 'Чат', icon: '🕊️', color: '#fde047' }
    ],
    glass_pro: [
      { label: 'Словник', icon: '💎', color: '#67e8f9' },
      { label: 'Енергія', icon: '💡', color: '#fde047' },
      { label: 'Ціль', icon: '🫧', color: '#67e8f9' },
      { label: 'Кубок', icon: '✨', color: '#fde047' },
      { label: 'Замок', icon: '🏛️', color: '#67e8f9' },
      { label: 'Щит', icon: '🛡️', color: '#fde047' },
      { label: 'Опції', icon: '🔮', color: '#67e8f9' },
      { label: 'Чат', icon: '💭', color: '#fde047' }
    ],
    retro_pixel: [
      { label: 'Словник', icon: '👾', color: '#22c55e' },
      { label: 'Енергія', icon: '🕹️', color: '#eab308' },
      { label: 'Ціль', icon: '🎯', color: '#22c55e' },
      { label: 'Кубок', icon: '👑', color: '#eab308' },
      { label: 'Замок', icon: '🏰', color: '#22c55e' },
      { label: 'Щит', icon: '⚔️', color: '#eab308' },
      { label: 'Опції', icon: '⚙️', color: '#22c55e' },
      { label: 'Чат', icon: '💾', color: '#eab308' }
    ],
    golden_luxury: [
      { label: 'Словник', icon: '📙', color: '#f59e0b' },
      { label: 'Енергія', icon: '⭐', color: '#fde047' },
      { label: 'Ціль', icon: '⚜️', color: '#f59e0b' },
      { label: 'Кубок', icon: '👑', color: '#fde047' },
      { label: 'Замок', icon: '🏯', color: '#f59e0b' },
      { label: 'Щит', icon: '🛡️', color: '#fde047' },
      { label: 'Опції', icon: '⚙️', color: '#f59e0b' },
      { label: 'Чат', icon: '📜', color: '#fde047' }
    ]
  };

  const list = packs[styleId] || packs.lucide_minimal;
  return (
    <div className="icon-style-preview-tray" style={{display:'flex',alignItems:'center',gap:12,padding:'6px 12px',background:'rgba(0,0,0,0.28)',borderRadius:10,marginTop:6}}>
      {list.map((item, idx) => (
        <span
          key={idx}
          title={item.label}
          style={{
            fontSize: 16,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            filter: \`drop-shadow(0 0 3px \${item.color}80)\`
          }}
        >
          {item.icon}
        </span>
      ))}
    </div>
  );
}
`;

// Insert IconStylePreviewTray right before SettingsPage
const settingsPageIdx = code.indexOf('function SettingsPage(');
if (settingsPageIdx !== -1) {
  code = code.slice(0, settingsPageIdx) + iconPreviewComponent + '\n' + code.slice(settingsPageIdx);
  console.log('✓ IconStylePreviewTray component inserted');
}

// Replace the old hardcoded preview tray in SettingsPage
const oldTrayTarget = `<div className="icon-style-preview-tray" style={{display:'flex',alignItems:'center',gap:10,padding:'6px 10px',background:'rgba(0,0,0,0.18)',borderRadius:8,marginTop:4}}>
                      <span title="Словник">📖</span>
                      <span title="Досвід">⚡</span>
                      <span title="Ціль">🎯</span>
                      <span title="Рейтинг">🏆</span>
                      <span title="Замок">🏰</span>
                      <span title="Щит">🛡️</span>
                      <span title="Налаштування">⚙️</span>
                      <span title="Чат">💬</span>
                    </div>`;

if (code.includes(oldTrayTarget)) {
  code = code.replace(oldTrayTarget, `<IconStylePreviewTray styleId={s.id} />`);
  console.log('✓ Replaced hardcoded icon preview tray with dynamic stylized IconStylePreviewTray');
}

// 5. ROCK-SOLID STATE PERSISTENCE: SAFE MERGE ON serverMe() / cloudPull()
const serverMeOld = `    serverMe().then(async me => {
      if (!me?.user) return;
      await flushProgressQueue().catch(()=>{});
      const remote = await cloudPull(me.user.nick);
      if (remote) { setState(prev => ({...prev,...remote,id:me.user.id,nick:me.user.nick,role:me.user.role,guest:false,admin:{...defaultAdmin,...(prev.admin||{}),...(remote.admin||{})}})); setPage('dashboard'); }
    }).catch(() => {});`;

const serverMeNew = `    serverMe().then(async me => {
      if (!me?.user) return;
      await flushProgressQueue().catch(()=>{});
      const remote = await cloudPull(me.user.nick);
      if (remote) {
        setState(prev => {
          const mergedXp = Math.max(prev.xp || 0, remote.xp || 0);
          const mergedGems = Math.max(prev.gems || 0, remote.gems || 0);
          const mergedStreak = Math.max(prev.streak || 0, remote.streak || 0);
          const mergedTodayXp = Math.max(prev.todayXp || 0, remote.todayXp || 0);
          const mergedBadges = [...new Set([...(prev.badges || []), ...(remote.badges || [])])];
          const mergedAvatar = prev.avatar || remote.avatar || 'character_01_clumsy_barbarian';
          const mergedInventory = { ...(remote.inventory || {}), ...(prev.inventory || {}) };
          const mergedMastery = { ...(remote.mastery || {}) };
          Object.entries(prev.mastery || {}).forEach(([k, v]) => {
            mergedMastery[k] = Math.max(mergedMastery[k] || 0, v || 0);
          });
          const next = {
            ...prev,
            ...remote,
            id: me.user.id,
            nick: me.user.nick,
            role: me.user.role,
            guest: false,
            xp: mergedXp,
            gems: mergedGems,
            streak: mergedStreak,
            todayXp: mergedTodayXp,
            badges: mergedBadges,
            avatar: mergedAvatar,
            inventory: mergedInventory,
            mastery: mergedMastery,
            admin: { ...defaultAdmin, ...(prev.admin || {}), ...(remote.admin || {}) }
          };
          saveProfile(next.nick, next);
          try { localStorage.setItem('ef_state_backup', JSON.stringify(next)); } catch {}
          return next;
        });
        setPage('dashboard');
      }
    }).catch(() => {});`;

if (code.includes(serverMeOld)) {
  code = code.replace(serverMeOld, serverMeNew);
  console.log('✓ Safe state merge installed in serverMe() effect');
}

// 6. INITIAL STATE: USE ef_state_backup IF LOCAL PROFILE HAS LESS PROGRESS
const initStateOld = `  const [state, setState] = useState(() => {
    const nick = getActiveNick();
    const p = nick ? loadProfile(nick) : null;
    return p ? {...emptyState(), ...p, admin: {...defaultAdmin, ...(p.admin || {})}} : emptyState();
  });`;

const initStateNew = `  const [state, setState] = useState(() => {
    const nick = getActiveNick();
    const p = nick ? loadProfile(nick) : null;
    let backup = null;
    try { backup = JSON.parse(localStorage.getItem('ef_state_backup') || 'null'); } catch {}
    const chosen = (p && (p.xp || 0) >= (backup?.xp || 0)) ? p : (backup || p);
    return chosen ? {...emptyState(), ...chosen, admin: {...defaultAdmin, ...(chosen.admin || {})}} : emptyState();
  });`;

if (code.includes(initStateOld)) {
  code = code.replace(initStateOld, initStateNew);
  console.log('✓ Initial state fallback to ef_state_backup installed');
}

// In save(): backup state to ef_state_backup
const saveProfileOld = `    if (next.nick) {
      saveProfile(next.nick, next);
      try { dbPutProfile(next); } catch {}`;

const saveProfileNew = `    if (next.nick) {
      saveProfile(next.nick, next);
      try { localStorage.setItem('ef_state_backup', JSON.stringify(next)); } catch {}
      try { dbPutProfile(next); } catch {}`;

if (code.includes(saveProfileOld)) {
  code = code.replace(saveProfileOld, saveProfileNew);
  console.log('✓ ef_state_backup write added to save() function');
}

// 7. LISTEN TO STORAGE EVENTS FOR INTER-DEVICE / CROSS-TAB SYNC
const storageListenerSnippet = `  // Inter-tab & background sync listener
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'ef_state_backup' || e.key === 'ef-profiles-v1') {
        try {
          const nick = getActiveNick();
          if (nick) {
            const fresh = loadProfile(nick);
            if (fresh) setState(prev => ({ ...prev, ...fresh }));
          }
        } catch {}
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
`;

const appOpenTrackIdx = code.indexOf("useEffect(() => { track('app_open',{page:location.pathname}); }, []);");
if (appOpenTrackIdx !== -1) {
  code = code.slice(0, appOpenTrackIdx) + storageListenerSnippet + '\n  ' + code.slice(appOpenTrackIdx);
  console.log('✓ Inter-tab storage event listener installed');
}

fs.writeFileSync('src/App.jsx', code, 'utf8');
console.log('✓ Batch 2 applied to src/App.jsx');
