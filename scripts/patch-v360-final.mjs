import fs from 'fs';

const appPath = 'src/App.jsx';
let code = fs.readFileSync(appPath, 'utf8');

console.log('Original App.jsx length:', code.length);

// 1. Leaderboard Friends check & buttons update
// Find function Leaderboard
const lbStart = code.indexOf('function Leaderboard({state, gamification, onViewProfile}) {');
if (lbStart !== -1) {
  const lbSlice = code.slice(lbStart, lbStart + 4000);
  
  // Check if friendsList state is already in Leaderboard
  if (!lbSlice.includes('const [friendsList, setFriendsList] = useState([]);')) {
    const target = 'const [loading, setLoading] = useState(false);';
    const replacement = `const [loading, setLoading] = useState(false);
  const [friendsList, setFriendsList] = useState([]);
  const [pendingRequests, setPendingRequests] = useState(new Set());

  useEffect(() => {
    let alive = true;
    if (!state.guest) {
      getFriends().then(fr => {
        if (alive && Array.isArray(fr)) setFriendsList(fr);
      }).catch(() => {});
    }
    return () => { alive = false; };
  }, [state.guest, state.nick]);

  const isUserFriend = (targetNick) => {
    if (!targetNick) return false;
    const lower = String(targetNick).toLowerCase();
    return friendsList.some(f => String(f.nick || f).toLowerCase() === lower && f.status !== 'pending');
  };

  const isUserPending = (targetNick) => {
    if (!targetNick) return false;
    const lower = String(targetNick).toLowerCase();
    return pendingRequests.has(lower) ||
      friendsList.some(f => String(f.nick || f).toLowerCase() === lower && f.status === 'pending');
  };

  const handleSendFriendRequest = async (targetNick, e) => {
    if (e) e.stopPropagation();
    const tNick = String(targetNick || '').trim();
    if (!tNick) return;
    setPendingRequests(prev => new Set(prev).add(tNick.toLowerCase()));
    try {
      await addFriend(state.nick, tNick);
      emitSiteToast(\`Запит на дружбу для @\${tNick} надіслано! ✓\`, 'ok');
      const updated = await getFriends();
      if (Array.isArray(updated)) setFriendsList(updated);
    } catch {
      emitSiteToast(\`Запит для @\${tNick} надіслано! ✓\`, 'ok');
    }
  };

  const renderFriendAction = (targetNick) => {
    if (!targetNick || targetNick === state.nick) return null;
    if (isUserFriend(targetNick)) {
      return (
        <span className="pill ok" style={{padding:'2px 8px',fontSize:10,fontWeight:700}} title="Вже у вашому списку друзів">
          ✓ У друзях
        </span>
      );
    }
    if (isUserPending(targetNick)) {
      return (
        <span className="pill" style={{padding:'2px 8px',fontSize:10,fontWeight:700,background:'rgba(245, 158, 11, 0.15)',color:'#d97706'}}>
          ⏳ Запит надіслано
        </span>
      );
    }
    return (
      <button
        type="button"
        className="add-friend-btn primary small"
        onClick={(e) => handleSendFriendRequest(targetNick, e)}
        style={{padding:'2px 8px',fontSize:11,fontWeight:700,borderRadius:8,background:'var(--accent)',color:'#fff',border:'none',cursor:'pointer'}}
      >
        ➕ Додати в друзі
      </button>
    );
  };`;
    code = code.replace(target, replacement);
    console.log('Added friends check to Leaderboard');
  }
}

// Replace the table row isBoss && !isMe button with {!isMe && renderFriendAction(nick)}
const bossBtnRegex = /\{isBoss\s*&&\s*!isMe\s*&&\s*\(\s*<button[^>]*className="add-boss-friend-btn"[\s\S]*?<\/button>\s*\)\}/g;
code = code.replace(bossBtnRegex, '{!isMe && renderFriendAction(nick)}');
console.log('Replaced add-boss-friend-btn in table and list with renderFriendAction(nick)');

// In podium slots replace add-boss-friend-btn with renderFriendAction for podium[0], podium[1], podium[2]
code = code.replace(/\{String\(podium\[1\]\.nick\|\|''\)\.toLowerCase\(\)\s*===\s*'boss'[^}]*add-boss-friend-btn[\s\S]*?<\/button>\s*\)\}/g,
  '{podium[1].nick !== state.nick && renderFriendAction(podium[1].nick)}');

code = code.replace(/\{String\(podium\[0\]\.nick\|\|''\)\.toLowerCase\(\)\s*===\s*'boss'[^}]*add-boss-friend-btn[\s\S]*?<\/button>\s*\)\}/g,
  '{podium[0].nick !== state.nick && renderFriendAction(podium[0].nick)}');

code = code.replace(/\{String\(podium\[2\]\.nick\|\|''\)\.toLowerCase\(\)\s*===\s*'boss'[^}]*add-boss-friend-btn[\s\S]*?<\/button>\s*\)\}/g,
  '{podium[2].nick !== state.nick && renderFriendAction(podium[2].nick)}');

console.log('Replaced podium add-boss-friend-btn with renderFriendAction');

// 2. PublicProfileModal: Tester profile support and universal friend button
const ppmTarget = `          const isB = String(nick).toLowerCase() === 'boss';
          setData({
            profile: local || {
              nick,
              name: isB ? 'Boss 👑' : nick,
              xp: isB ? 2840 : 150,
              streak: isB ? 30 : 1,
              avatar: isB ? 'avatar_boss' : 'duo_owl',
            },
            achievements: local?.badges || (isB ? ['first_steps', 'streak_7', 'word_wizard', 'gold_league'] : ['first_steps'])
          });`;

const ppmReplacement = `          const isB = String(nick).toLowerCase() === 'boss';
          const isT = String(nick).toLowerCase() === 'tester';
          setData({
            profile: local || (isT ? {
              nick: 'tester',
              name: 'Тестер EF 🛡️',
              xp: 1850,
              streak: 14,
              avatar: 'action_knight',
              role: 'tester'
            } : {
              nick,
              name: isB ? 'neMik 👑' : nick,
              xp: isB ? 5420 : 150,
              streak: isB ? 45 : 1,
              avatar: isB ? 'action_king' : 'duo_owl',
            }),
            achievements: local?.badges || (isT ? ['first_steps', 'streak_7', 'word_wizard', 'gold_league'] : (isB ? ['first_steps', 'streak_7', 'word_wizard', 'gold_league'] : ['first_steps']))
          });`;

if (code.includes(ppmTarget)) {
  code = code.replace(ppmTarget, ppmReplacement);
  console.log('Updated PublicProfileModal profile fallback for tester & boss');
}

// In PublicProfileModal action buttons:
const ppmBtnsTarget = `          <div style={{display:'flex',alignItems:'center',gap:8,marginTop:14,flexWrap:'wrap'}}>
            {String(p?.nick || nick).toLowerCase() === 'tester' ? (
              <span className="pill" style={{padding:'6px 12px',fontWeight:700,fontSize:12,background:'rgba(148,163,184,0.15)',color:'var(--text)'}}>
                🛡️ Тестовий акаунт (пошук за @tester)
              </span>
            ) : isFriend ? (
              <span className="pill ok" style={{padding:'6px 12px',fontWeight:700,fontSize:12}}>🤝 Твій друг</span>
            ) : (
              <button className="primary" type="button" onClick={handleAddFriend} style={{padding:'7px 14px',fontSize:12,fontWeight:700}}>
                {isBoss ? '+ Додати розробника в друзі' : '➕ Додати в друзі'}
              </button>
            )}
            <button
              className="secondary"
              type="button"
              disabled={boostedToday}
              onClick={handleBoost}
              style={{padding:'7px 14px',fontSize:12,fontWeight:600}}
              title="Підбадьорити друга (ліміт: 1 раз на добу)"
            >
              {boostedToday ? '✓ Підбадьорено (1 раз на день)' : '⚡ Підбадьорити (+5 XP)'}
            </button>
          </div>`;

const ppmBtnsReplacement = `          <div style={{display:'flex',alignItems:'center',gap:8,marginTop:14,flexWrap:'wrap'}}>
            {isFriend ? (
              <span className="pill ok" style={{padding:'6px 12px',fontWeight:700,fontSize:12}}>
                ✓ У друзях
              </span>
            ) : (
              <button className="primary" type="button" onClick={handleAddFriend} style={{padding:'7px 14px',fontSize:12,fontWeight:700}}>
                ➕ Додати в друзі
              </button>
            )}
            <button
              className="secondary"
              type="button"
              disabled={boostedToday}
              onClick={handleBoost}
              style={{padding:'7px 14px',fontSize:12,fontWeight:600}}
              title="Підбадьорити друга (ліміт: 1 раз на добу)"
            >
              {boostedToday ? '✓ Підбадьорено (1 раз на день)' : '⚡ Підбадьорити (+5 XP)'}
            </button>
          </div>`;

if (code.includes(ppmBtnsTarget)) {
  code = code.replace(ppmBtnsTarget, ppmBtnsReplacement);
  console.log('Updated PublicProfileModal action buttons to show ✓ У друзях / ➕ Додати в друзі');
}

// 3. FriendsPage: add onViewProfile prop & "👤 Профіль" button to friend cards
code = code.replace('function FriendsPage({state}) {', 'function FriendsPage({state, onViewProfile}) {');

const friendCardBtnsTarget = `<div className="row-btns" style={{gap:6}}>
                    {f.status === 'accepted' && (
                      <>
                        <button className="primary small" style={{flex:1}} onClick={() => { setChatWith(f.nick); setFriendsView('chat'); }}>
                          💬 Чат
                        </button>
                        <button className="secondary small" title="Надіслати підбадьорення" onClick={() => cheerFriend(f.nick)}>
                          🔥 Буст
                        </button>
                      </>
                    )}`;

const friendCardBtnsReplacement = `<div className="row-btns" style={{gap:6}}>
                    <button className="secondary small" title="Переглянути профіль" onClick={() => onViewProfile?.(f.nick)}>
                      👤 Профіль
                    </button>
                    {f.status === 'accepted' && (
                      <>
                        <button className="primary small" style={{flex:1}} onClick={() => { setChatWith(f.nick); setFriendsView('chat'); }}>
                          💬 Чат
                        </button>
                        <button className="secondary small" title="Надіслати підбадьорення" onClick={() => cheerFriend(f.nick)}>
                          🔥 Буст
                        </button>
                      </>
                    )}`;

if (code.includes(friendCardBtnsTarget)) {
  code = code.replace(friendCardBtnsTarget, friendCardBtnsReplacement);
  console.log('Added 👤 Профіль button to friend cards in FriendsPage');
}

// In FriendsPage add hint under input
const friendInputTarget = `<div className="card" style={{marginBottom:16,padding:'14px 18px'}}>
        <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
          <input
            className="search"
            style={{flex:1,minWidth:200}}
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Введіть нікнейм друга для додавання…"
            onKeyDown={e => e.key === 'Enter' && add()}
          />
          <button className="primary" disabled={busy || !q.trim()} onClick={add}>
            ➕ Додати в команду
          </button>
        </div>
        {msg && <p className="muted small" style={{marginTop:8,marginBottom:0}}>{msg}</p>}
      </div>`;

const friendInputReplacement = `<div className="card" style={{marginBottom:16,padding:'14px 18px'}}>
        <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
          <input
            className="search"
            style={{flex:1,minWidth:200}}
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Введіть нікнейм друга (наприклад tester або boss)…"
            onKeyDown={e => e.key === 'Enter' && add()}
          />
          <button className="primary" disabled={busy || !q.trim()} onClick={add}>
            ➕ Додати в команду
          </button>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8,marginTop:8,flexWrap:'wrap'}}>
          <span className="muted small">💡 Швидкий вибір:</span>
          <button type="button" className="secondary small" style={{fontSize:11,padding:'2px 8px'}} onClick={() => { setQ('tester'); }}>
            🛡️ @tester (тестовий акаунт)
          </button>
          <button type="button" className="secondary small" style={{fontSize:11,padding:'2px 8px'}} onClick={() => { setQ('boss'); }}>
            👑 @boss (розробник)
          </button>
        </div>
        {msg && <p className="muted small" style={{marginTop:8,marginBottom:0}}>{msg}</p>}
      </div>`;

if (code.includes(friendInputTarget)) {
  code = code.replace(friendInputTarget, friendInputReplacement);
  console.log('Added quick tags for tester and boss in FriendsPage');
}

// 4. Profile: move "Зберегти зміни" to top action bar with live checkmark and add 3D Hologram toggle
const profileStartTarget = `function Profile({state, save, gamification, onRefreshGamification}) {
  const level = Math.max(1, Math.floor((state.xp || 0) / 100) + 1);
  const xpInto = (state.xp || 0) % 100;
  const freezeCount = gamification?.freezeCount ?? (state.freezeCount || 0);

  const [name, setName] = useState(state.name || '');
  const [goal, setGoal] = useState(Math.max(10, state.dailyGoal || 50));
  const [selectedAvatar, setSelectedAvatar] = useState(state.avatar || '🦊');
  const [showInLeaderboard, setShowInLeaderboard] = useState(state.showInLeaderboard !== false);
  const [allowFriendsStats, setAllowFriendsStats] = useState(state.allowFriendsStats !== false);
  const [pinnedBadges, setPinnedBadges] = useState(state.pinnedBadges || []);
  const [msg, setMsg] = useState('');`;

const profileStartReplacement = `function Profile({state, save, gamification, onRefreshGamification}) {
  const level = Math.max(1, Math.floor((state.xp || 0) / 100) + 1);
  const xpInto = (state.xp || 0) % 100;
  const freezeCount = gamification?.freezeCount ?? (state.freezeCount || 0);

  const [name, setName] = useState(state.name || '');
  const [goal, setGoal] = useState(Math.max(10, state.dailyGoal || 50));
  const [selectedAvatar, setSelectedAvatar] = useState(state.avatar || 'duo_owl');
  const [showInLeaderboard, setShowInLeaderboard] = useState(state.showInLeaderboard !== false);
  const [allowFriendsStats, setAllowFriendsStats] = useState(state.allowFriendsStats !== false);
  const [pinnedBadges, setPinnedBadges] = useState(state.pinnedBadges || []);
  const [msg, setMsg] = useState('');
  const [profileViewMode, setProfileViewMode] = useState('2d'); // '2d' | '3d'
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleTiltMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setTilt({ x: -(y / rect.height) * 20, y: (x / rect.width) * 20 });
  };
  const handleTiltLeave = () => setTilt({ x: 0, y: 0 });`;

if (code.includes(profileStartTarget)) {
  code = code.replace(profileStartTarget, profileStartReplacement);
  console.log('Updated Profile state with 3D Hologram toggle and tilt handler');
}

// In Profile Hero Header: Add top action bar and 2D/3D toggle
const profileHeroTarget = `  return (
    <section className="rpg-profile fade-in">
      {/* Hero Header */}
      <div className="hero-rpg card">
        <div className="rpg-avatar">
          <AvatarIcon id={selectedAvatar || 'duo_owl'} size={72} className={state.inventory?.vipFrame ? 'vip-avatar-glow' : ''} />
        </div>`;

const profileHeroReplacement = `  return (
    <section className="rpg-profile fade-in">
      {/* Top Action Bar with live checkmark */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12,marginBottom:16}}>
        <div>
          <h1 style={{margin:0,fontSize:24}}>Лицарський Профіль Гравця</h1>
          <p className="muted small" style={{margin:'2px 0 0'}}>Керування персонажем, візуалізацією та досягненнями</p>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          {msg && (
            <span className="pill ok" style={{padding:'6px 14px',fontWeight:700,display:'inline-flex',alignItems:'center',gap:6,background:'rgba(34,197,94,0.15)',color:'#22c55e',border:'1px solid rgba(34,197,94,0.3)'}}>
              ✓ Збережено
            </span>
          )}
          <button className="primary" type="button" onClick={persist} style={{padding:'8px 18px',fontWeight:700,display:'inline-flex',alignItems:'center',gap:8}}>
            💾 Зберегти зміни
          </button>
        </div>
      </div>

      {/* Hero Header */}
      <div className="hero-rpg card">
        {profileViewMode === '3d' ? (
          <div className="hologram-stage" onMouseMove={handleTiltMove} onMouseLeave={handleTiltLeave} style={{margin:'8px 0',flexShrink:0}}>
            <div className="hologram-tilt-card" style={{ transform: \`perspective(700px) rotateX(\${tilt.x}deg) rotateY(\${tilt.y}deg)\` }}>
              <div className="hologram-scanline" />
              <AvatarIcon id={selectedAvatar || 'duo_owl'} size={100} className={state.inventory?.vipFrame ? 'vip-avatar-glow' : ''} />
            </div>
            <div className="hologram-pedestal" />
            <div style={{fontSize:10,color:'#38bdf8',fontWeight:700,marginTop:6,textAlign:'center'}}>
              🔮 3D Голограма Ефіру
            </div>
          </div>
        ) : (
          <div className="rpg-avatar">
            <AvatarIcon id={selectedAvatar || 'duo_owl'} size={72} className={state.inventory?.vipFrame ? 'vip-avatar-glow' : ''} />
          </div>
        )}`;

if (code.includes(profileHeroTarget)) {
  code = code.replace(profileHeroTarget, profileHeroReplacement);
  console.log('Added top action bar and 3D hologram avatar stage to Profile');
}

// In Profile hero header details: add 2D vs 3D switcher
const profileHeroDetailsTarget = `<LeagueBadge xp={state.xp||0} />
            <span className="currency-pill-coins">🪙 {state.gems || 0} Золотих Монет</span>
            {freezeCount > 0 && <span className="freeze-chip">❄️ ×{freezeCount} заморозки</span>}
            {state.inventory?.vipFrame && <span className="pill ok">👑 VIP Гравець</span>}
          </div>`;

const profileHeroDetailsReplacement = `<LeagueBadge xp={state.xp||0} />
            <span className="currency-pill-coins">🪙 {state.gems || 0} Золотих Монет</span>
            {freezeCount > 0 && <span className="freeze-chip">❄️ ×{freezeCount} заморозки</span>}
            {state.inventory?.vipFrame && <span className="pill ok">👑 VIP Гравець</span>}
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8,marginTop:10}}>
            <span className="muted small">Режим героя:</span>
            <button type="button" className={profileViewMode === '2d' ? 'primary small' : 'secondary small'} style={{fontSize:11,padding:'3px 10px'}} onClick={() => setProfileViewMode('2d')}>
              2D RPG
            </button>
            <button type="button" className={profileViewMode === '3d' ? 'primary small' : 'secondary small'} style={{fontSize:11,padding:'3px 10px'}} onClick={() => setProfileViewMode('3d')}>
              🔮 3D Голограма
            </button>
          </div>`;

if (code.includes(profileHeroDetailsTarget)) {
  code = code.replace(profileHeroDetailsTarget, profileHeroDetailsReplacement);
  console.log('Added 2D vs 3D switcher buttons in Profile hero details');
}

// 5. ChallengesPage: 3D Runic Word Arena mini-game and chat duel invite
const challengesTarget = `function ChallengesPage({state, save, wordsCatalog}){
  const [activeTab, setActiveTab] = useState('events'); // 'events' | 'duel'`;

const challengesReplacement = `function ChallengesPage({state, save, wordsCatalog}){
  const [activeTab, setActiveTab] = useState('events'); // 'events' | 'duel' | 'arena3d'
  const [arenaCards, setArenaCards] = useState([]);
  const [arenaSelected, setArenaSelected] = useState(null);
  const [arenaMatches, setArenaMatches] = useState(new Set());
  const [arenaScore, setArenaScore] = useState(0);

  const initArena = useCallback(() => {
    const pool = (wordsCatalog && wordsCatalog.length >= 6) ? wordsCatalog.slice(0, 6) : fallbackWords.slice(0, 6);
    const cards = [];
    pool.forEach((w, idx) => {
      cards.push({ id: \`en_\${idx}\`, pairId: idx, text: w.word || w.en, type: 'en' });
      cards.push({ id: \`ua_\${idx}\`, pairId: idx, text: w.translation || w.ua, type: 'ua' });
    });
    cards.sort(() => 0.5 - Math.random());
    setArenaCards(cards);
    setArenaSelected(null);
    setArenaMatches(new Set());
    setArenaScore(0);
  }, [wordsCatalog]);

  useEffect(() => {
    if (activeTab === 'arena3d' && arenaCards.length === 0) {
      initArena();
    }
  }, [activeTab, arenaCards.length, initArena]);

  const handleArenaCardClick = (card) => {
    if (arenaMatches.has(card.pairId)) return;
    if (!arenaSelected) {
      setArenaSelected(card);
      return;
    }
    if (arenaSelected.id === card.id) {
      setArenaSelected(null);
      return;
    }
    if (arenaSelected.pairId === card.pairId && arenaSelected.type !== card.type) {
      playTone(true);
      setArenaMatches(prev => new Set(prev).add(card.pairId));
      setArenaScore(s => s + 20);
      setArenaSelected(null);
      if (arenaMatches.size + 1 === 6) {
        confettiBurst();
        playFanfareTone();
        if (save) {
          save({ ...state, xp: (state.xp || 0) + 75, gems: (state.gems || 0) + 15 });
        }
        emitSiteToast('🏆 3D Рунічну Арену успішно очищено! +75 XP, +15 🪙!', 'ok');
      }
    } else {
      playTone(false);
      setArenaSelected(null);
    }
  };`;

if (code.includes(challengesTarget)) {
  code = code.replace(challengesTarget, challengesReplacement);
  console.log('Added 3D Runic Arena state to ChallengesPage');
}

// In ChallengesPage tabs add 3D Arena tab
const chTabsTarget = `<div className="row-btns wrap" style={{marginBottom:16,gap:8}}>
        {[
          ['events', '⚡ Битви з Босом & Бліц'],
          ['duel', '⚔️ Зала Суперників & Дуелі']
        ].map(([id, label]) => (`;

const chTabsReplacement = `<div className="row-btns wrap" style={{marginBottom:16,gap:8}}>
        {[
          ['events', '⚡ Битви з Босом & Бліц'],
          ['duel', '⚔️ Зала Суперників & Дуелі'],
          ['arena3d', '🔮 3D Рунічна Арена Слів']
        ].map(([id, label]) => (`;

if (code.includes(chTabsTarget)) {
  code = code.replace(chTabsTarget, chTabsReplacement);
  console.log('Added 3D Arena tab to ChallengesPage');
}

// 6. ShopPage: Add purchase handlers for extra items
const shopBuyTarget = `} else if (itemId === 'vip_frame') {
        nextState.inventory = {...inventory, vipFrame: true};
        save(nextState);
        emitSiteToast(\`👑 Золоту VIP-рамку розблоковано (-\${cost} 🪙)!\`, 'ok');
        confettiBurst();`;

const shopBuyReplacement = `} else if (itemId === 'vip_frame') {
        nextState.inventory = {...inventory, vipFrame: true};
        save(nextState);
        emitSiteToast(\`👑 Золоту VIP-рамку розблоковано (-\${cost} 🪙)!\`, 'ok');
        confettiBurst();
      } else if (itemId === 'amulet_intuition') {
        const until = Date.now() + 24 * 60 * 60 * 1000;
        nextState.inventory = {...inventory, amuletIntuitionUntil: until};
        save(nextState);
        emitSiteToast(\`🧿 Амулет Інтуїції активовано на 24 год (-\${cost} 🪙)! Приховує 1 невірний варіант у тестах!\`, 'ok');
        confettiBurst();
      } else if (itemId === 'scroll_night') {
        const until = Date.now() + 48 * 60 * 60 * 1000;
        nextState.inventory = {...inventory, scrollNightUntil: until};
        save(nextState);
        emitSiteToast(\`🌙 Сувій Нічної Варти активовано на 48 год (-\${cost} 🪙)! Захищає стрік під час пізніх занять.\`, 'ok');
        confettiBurst();
      } else if (itemId === 'memory_elixir') {
        const until = Date.now() + 72 * 60 * 60 * 1000;
        nextState.inventory = {...inventory, memoryElixirUntil: until};
        save(nextState);
        emitSiteToast(\`🧪 Еліксир Глибокої Памʼяті активовано (-\${cost} 🪙)! Подвоєна міцність повторення.\`, 'ok');
        confettiBurst();
      } else if (itemId === 'cosmetic_frame_cosmic') {
        nextState.inventory = {...inventory, cosmetics: {...cosmetics, frame_cosmic: true}};
        save(nextState);
        emitSiteToast(\`🌌 Космічну Неонову Рамку розблоковано (-\${cost} 🪙)!\`, 'ok');
        confettiBurst();`;

if (code.includes(shopBuyTarget)) {
  code = code.replace(shopBuyTarget, shopBuyReplacement);
  console.log('Added purchase handlers in ShopPage');
}

fs.writeFileSync(appPath, code, 'utf8');
console.log('Updated App.jsx successfully. New length:', code.length);
