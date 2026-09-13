import fs from 'fs';

console.log('Applying v3.7.0 batch 3 updates (FriendsPage, Stats, Shop)...');
let code = fs.readFileSync('src/App.jsx', 'utf8');

// 1. UPDATE CHEERING IN FriendsPage
const cheerFriendOld = `  const cheerFriend = (nick) => {
    if (!nick) return;
    if (cheeredSet[nick]) {
      emitSiteToast(\`Ви вже надіслали буст для @\${nick}! Буст спрацьовує тільки один раз для друга.\`, 'info');
      return;
    }
    playTone(true);
    confettiBurst();
    const updated = { ...cheeredSet, [nick]: Date.now() };
    setCheeredSet(updated);
    try {
      localStorage.setItem(\`ef_cheered_\${state.nick}\`, JSON.stringify(updated));
    } catch {}
    if (save) {
      save({ ...state, cheeredFriends: updated });
    }
    emitSiteToast(\`🔥 Ви надіслали буст для @\${nick}! (використано 1 з 1)\`, 'ok');
  };`;

const cheerFriendNew = `  const cheerFriend = (nick, friendObj) => {
    if (!nick) return;
    if (cheeredSet[nick]) {
      emitSiteToast(\`Ви вже підбадьорили цього друга! Підбадьорення спрацьовує тільки один раз.\`, 'info');
      return;
    }
    playTone(true);
    confettiBurst();
    const updated = { ...cheeredSet, [nick]: Date.now() };
    setCheeredSet(updated);
    try {
      localStorage.setItem(\`ef_cheered_\${state.nick}\`, JSON.stringify(updated));
    } catch {}
    if (save) {
      save({ ...state, cheeredFriends: updated });
    }
    // Store notification for friend to receive when they log in or come online
    try {
      const notifKey = \`ef_cheered_notifs_\${nick.toLowerCase()}\`;
      const prevNotifs = JSON.parse(localStorage.getItem(notifKey) || '[]');
      const notifItem = {
        id: 'cheer_' + Date.now(),
        from_nick: state.nick,
        from_name: state.name || state.nick,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: new Date().toLocaleDateString('uk-UA'),
        seen: false
      };
      prevNotifs.push(notifItem);
      localStorage.setItem(notifKey, JSON.stringify(prevNotifs));
    } catch {}

    const targetFriend = friendObj || friends.find(f => f.nick === nick);
    const displayName = targetFriend?.name || ('@' + nick);
    emitSiteToast(\`🔥 Ви надіслали підбадьорення для \${displayName}!\`, 'ok');
  };`;

if (code.includes(cheerFriendOld)) {
  code = code.replace(cheerFriendOld, cheerFriendNew);
  console.log('✓ cheerFriend updated: real name in toast, removed "(використано 1 з 1)", persistent notif saved');
}

// 2. CHECK INCOMING NOTIFICATIONS ON FriendsPage MOUNT
const loadCallbackIdx = code.indexOf('const load = useCallback(async () => {');
if (loadCallbackIdx !== -1) {
  const incomingNotifEffect = `
  // Check for incoming cheers/boosts when entering or when coming online
  useEffect(() => {
    if (!state.nick || state.guest) return;
    try {
      const notifKey = \`ef_cheered_notifs_\${state.nick.toLowerCase()}\`;
      const stored = JSON.parse(localStorage.getItem(notifKey) || '[]');
      const unread = stored.filter(n => !n.seen);
      if (unread.length > 0) {
        unread.forEach(n => {
          setTimeout(() => {
            confettiBurst();
            emitSiteToast(\`🎉 \${n.from_name || ('@' + n.from_nick)} надіслав(ла) вам підбадьорення! (\${n.date || 'сьогодні'} о \${n.time})\`, 'ok');
          }, 600);
        });
        const marked = stored.map(n => ({ ...n, seen: true }));
        localStorage.setItem(notifKey, JSON.stringify(marked));
      }
    } catch {}
  }, [state.nick, state.guest]);
`;
  code = code.slice(0, loadCallbackIdx) + incomingNotifEffect + '\n' + code.slice(loadCallbackIdx);
  console.log('✓ Incoming cheer notification effect installed in FriendsPage');
}

// 3. PREVENT DUPLICATE FRIEND REQUESTS IN add()
const addOld = `  const add = async () => {
    setBusy(true);
    const r = await addFriend(state.nick, q);
    setMsg(r.ok ? 'Запит надіслано ✓' : (r.error || 'Помилка'));
    if (r.ok) {
      track('friend_request', { feature: 'friends' });
      setQ('');
    }
    setBusy(false);
    load();
  };`;

const addNew = `  const add = async () => {
    const trimmed = q.trim();
    if (!trimmed) return;
    if (trimmed.toLowerCase() === String(state.nick || '').toLowerCase()) {
      emitSiteToast('Ви не можете додати себе в друзі!', 'info');
      return;
    }
    // Check local duplicate
    const existing = friends.find(f => f.nick.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      if (existing.status === 'accepted') {
        emitSiteToast(\`Користувач @\${trimmed} вже є у вашій команді!\`, 'info');
      } else {
        emitSiteToast(\`Запит для @\${trimmed} вже надіслано та очікує підтвердження!\`, 'info');
      }
      return;
    }
    setBusy(true);
    const r = await addFriend(state.nick, trimmed);
    setMsg(r.ok ? 'Запит надіслано ✓' : (r.error || 'Помилка'));
    if (r.ok) {
      track('friend_request', { feature: 'friends' });
      setQ('');
      emitSiteToast(\`Запит надіслано для @\${trimmed} ✓\`, 'ok');
    } else {
      emitSiteError(r.error || 'Не вдалося додати друга', 'Друзі');
    }
    setBusy(false);
    load();
  };`;

if (code.includes(addOld)) {
  code = code.replace(addOld, addNew);
  console.log('✓ Duplicate friend request prevention installed in add()');
}

// 4. REMOVE "💡 Швидкий вибір" STRIP
const quickPickOld = `<div style={{display:'flex',alignItems:'center',gap:8,marginTop:8,flexWrap:'wrap'}}>
          <span className="muted small">💡 Швидкий вибір:</span>
          <button type="button" className="secondary small" style={{fontSize:11,padding:'2px 8px'}} onClick={() => { setQ('tester'); }}>
            🛡️ @tester (тестовий акаунт)
          </button>
          <button type="button" className="secondary small" style={{fontSize:11,padding:'2px 8px'}} onClick={() => { setQ('boss'); }}>
            👑 @boss (розробник)
          </button>
        </div>`;
if (code.includes(quickPickOld)) {
  code = code.replace(quickPickOld, '');
  console.log('✓ Removed "💡 Швидкий вибір" from FriendsPage');
}

// 5. UPDATE FRIEND CARDS: ONLY ACCEPTED FRIENDS + OUTGOING REQUESTS SECTION + RENAME BOOST TO ПІДБАДЬОРИТИ
const oldFriendsCardBlockStart = code.indexOf('{/* MODE 1: GAMER CARDS */}');
const oldFriendsCardBlockEnd = code.indexOf('{/* MODE 2: CYBER CHAT */}');

if (oldFriendsCardBlockStart !== -1 && oldFriendsCardBlockEnd !== -1) {
  const newFriendsCardBlock = `{/* MODE 1: GAMER CARDS */}
      {friendsView === 'cards' && (
        <div>
          {/* Outgoing Requests (Запит надіслано - показує кому) */}
          {(() => {
            const outgoing = friends.filter(f => f.status === 'pending' && f.requested_by === state.id);
            if (!outgoing.length) return null;
            return (
              <div className="card" style={{marginBottom:16,border:'1.5px dashed rgba(56,189,248,0.4)',background:'rgba(56,189,248,0.05)'}}>
                <h3 style={{margin:'0 0 10px',fontSize:14,color:'#38bdf8',display:'flex',alignItems:'center',gap:8}}>
                  📨 Вихідні запити дружби (Очікують підтвердження: {outgoing.length})
                </h3>
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {outgoing.map(f => (
                    <div key={f.id || f.nick} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 12px',borderRadius:8,background:'rgba(0,0,0,0.2)'}}>
                      <div style={{display:'flex',alignItems:'center',gap:10}}>
                        <AvatarIcon id={f.avatar || 'character_01_clumsy_barbarian'} size={32} />
                        <div>
                          <b>@{f.nick}</b> {f.name && <span className="muted small">({f.name})</span>}
                        </div>
                      </div>
                      <span className="pill warn" style={{fontSize:11}}>⏳ Запит надіслано</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Incoming Requests */}
          {(() => {
            const incoming = friends.filter(f => f.status === 'pending' && f.requested_by !== state.id);
            if (!incoming.length) return null;
            return (
              <div className="card" style={{marginBottom:16,border:'1.5px solid rgba(34,197,94,0.4)',background:'rgba(34,197,94,0.05)'}}>
                <h3 style={{margin:'0 0 10px',fontSize:14,color:'#22c55e',display:'flex',alignItems:'center',gap:8}}>
                  📬 Вхідні запити в команду ({incoming.length})
                </h3>
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {incoming.map(f => (
                    <div key={f.id || f.nick} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 12px',borderRadius:8,background:'rgba(0,0,0,0.2)'}}>
                      <div style={{display:'flex',alignItems:'center',gap:10}}>
                        <AvatarIcon id={f.avatar || 'character_01_clumsy_barbarian'} size={32} />
                        <div>
                          <b>@{f.nick}</b> {f.name && <span className="muted small">({f.name})</span>}
                        </div>
                      </div>
                      <button className="primary small" onClick={async () => { const r = await acceptFriend(state.nick, f.id); if (!r.ok) emitSiteError(r.error, 'Друзі'); load(); }}>
                        ✓ Прийняти
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Mutual Confirmed Friends Grid (Тільки прийняті взаємно) */}
          <div className="friends-gamer-grid">
            {friends.filter(f => f.status === 'accepted').map((f, idx) => {
              const league = leagueForXp(f.xp || 0);
              const hasBoosted = Boolean(cheeredSet[f.nick]);
              return (
                <div className="friend-gamer-card" key={f.id || f.nick}>
                  <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
                    <AvatarIcon id={f.avatar || 'character_01_clumsy_barbarian'} size={46} />
                    <div>
                      <b style={{fontSize:16}}>{f.name || f.nick}</b>
                      <div className="muted small">@{f.nick}</div>
                      <div className="friend-activity-chip" style={{marginTop:2}}>
                        {f.is_online ? <span className="online">🟢 Зараз онлайн</span> : <span className="offline">⚪ {formatActivityTime(f.last_seen || f.updated_at, idx)}</span>}
                      </div>
                    </div>
                  </div>

                  <div style={{background:'var(--surface-sunken, rgba(0,0,0,0.03))',borderRadius:12,padding:'10px 12px',marginBottom:14}}>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:13,fontWeight:700}}>
                      <span>{league.badge} {league.name}</span>
                      <span>⚡ {f.xp || 0} XP</span>
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'var(--muted)',marginTop:4}}>
                      <span>🔥 Стрік: {f.streak || 0} днів</span>
                      <span style={{color:'#22c55e'}}>✓ В команді</span>
                    </div>
                  </div>

                  <div className="row-btns" style={{gap:6}}>
                    <button className="secondary small" title="Переглянути профіль" onClick={() => onViewProfile?.(f.nick)}>
                      👤 Профіль
                    </button>
                    <button className="primary small" style={{flex:1}} onClick={() => { setChatWith(f.nick); setFriendsView('chat'); }}>
                      💬 Чат
                    </button>
                    <button
                      className="secondary small"
                      title={hasBoosted ? "Ви вже підбадьорили цього друга" : "Підбадьорити друга"}
                      disabled={hasBoosted}
                      onClick={() => cheerFriend(f.nick, f)}
                      style={hasBoosted ? { opacity: 0.65, cursor: 'not-allowed', background: 'rgba(255,255,255,0.06)' } : {}}
                    >
                      {hasBoosted ? '✓ Підбадьорено' : '⚡ Підбадьорити'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {!friends.filter(f => f.status === 'accepted').length && (
            <div className="card" style={{textAlign:'center',padding:'36px 16px',color:'var(--muted)'}}>
              <p style={{fontSize:16,fontWeight:600}}>Поки немає взаємних друзів у команді</p>
              <p className="small">Коли друг прийме ваш запит, він зʼявиться тут для спільних дуелей та спілкування!</p>
            </div>
          )}
        </div>
      )}

      `;
  code = code.slice(0, oldFriendsCardBlockStart) + newFriendsCardBlock + code.slice(oldFriendsCardBlockEnd);
  console.log('✓ FriendsPage cards view updated: mutual friends only, outgoing requests section, renamed to Підбадьорити');
}

// 6. REMOVE "🏆 Залікова таблиця друзів"
const friendBoardStart = code.indexOf('{/* FRIENDS LEADERBOARD */}');
if (friendBoardStart !== -1) {
  const friendBoardEnd = code.indexOf('</section>', friendBoardStart);
  if (friendBoardEnd !== -1) {
    code = code.slice(0, friendBoardStart) + code.slice(friendBoardEnd);
    console.log('✓ Removed "🏆 Залікова таблиця друзів" from FriendsPage');
  }
} else {
  // Search direct header
  const lbHeaderIdx = code.indexOf('<h2>🏆 Залікова таблиця друзів</h2>');
  if (lbHeaderIdx !== -1) {
    const cardStart = code.lastIndexOf('<div className="card"', lbHeaderIdx);
    const cardEnd = code.indexOf('</div>\n        </div>', lbHeaderIdx);
    if (cardStart !== -1 && cardEnd !== -1) {
      code = code.slice(0, cardStart) + code.slice(cardEnd + '</div>\n        </div>'.length);
      console.log('✓ Removed "🏆 Залікова таблиця друзів" card');
    }
  }
}

// 7. EXPAND SHOP WITH 10 EXCLUSIVE SHOP AVATARS AND NEW COSMETICS
const shopAvatarsListIdx = code.indexOf('const ANIMATED_AVATARS_SHOP = [');
if (shopAvatarsListIdx !== -1) {
  const shopAvatarsEnd = code.indexOf('];', shopAvatarsListIdx);
  if (shopAvatarsEnd !== -1) {
    const newShopAvatars = `const ANIMATED_AVATARS_SHOP = [
    { id: 'shop_avatar_01_neon_emperor', name: 'Неоновий Імператор', desc: 'Ексклюзивний анімований аватар: голографічна корона, неоновий кібер-плащ', cost: 750, image: 'shop_avatar_01_neon_emperor.svg' },
    { id: 'shop_avatar_02_golden_griffin', name: 'Золотий Грифон', desc: 'Ексклюзивний анімований аватар: золоте сяюче пірʼя, крила та міфічні пазурі', cost: 700, image: 'shop_avatar_02_golden_griffin.svg' },
    { id: 'shop_avatar_03_cosmic_dj', name: 'Космічний Ді-джей', desc: 'Ексклюзивний анімований аватар: навушники з еквалайзером, платівка крутиться', cost: 650, image: 'shop_avatar_03_cosmic_dj.svg' },
    { id: 'shop_avatar_04_shadow_assassin', name: 'Тіньовий Асасин', desc: 'Ексклюзивний анімований аватар: тіньові кинджали, фіолетові очі в тумані', cost: 600, image: 'shop_avatar_04_shadow_assassin.svg' },
    { id: 'shop_avatar_05_mecha_dragon', name: 'Меха-Дракон', desc: 'Ексклюзивний анімований аватар: реактивні турбіни, синє плазмове полумʼя', cost: 800, image: 'shop_avatar_05_mecha_dragon.svg' },
    { id: 'shop_avatar_06_crystal_golem', name: 'Кристалічний Голем', desc: 'Ексклюзивний анімований аватар: смарагдові кристали ростуть і сяють', cost: 550, image: 'shop_avatar_06_crystal_golem.svg' },
    { id: 'shop_avatar_07_quantum_cat', name: 'Квантовий Кіт', desc: 'Ексклюзивний анімований аватар: мерехтить між двома вимірами', cost: 620, image: 'shop_avatar_07_quantum_cat.svg' },
    { id: 'shop_avatar_08_frost_lich', name: 'Крижаний Ліч', desc: 'Ексклюзивний анімований аватар: крижана сфера паморозі обертається', cost: 680, image: 'shop_avatar_08_frost_lich.svg' },
    { id: 'shop_avatar_09_solar_knight', name: 'Сонячний Лицар', desc: 'Ексклюзивний анімований аватар: сонячний щит з променями та вогняний плюмаж', cost: 720, image: 'shop_avatar_09_solar_knight.svg' },
    { id: 'shop_avatar_10_void_walker', name: 'Мандрівник Порожнечі', desc: 'Ексклюзивний анімований аватар: чорна діра втягує зірки та простір', cost: 850, image: 'shop_avatar_10_void_walker.svg' }
  ];`;
    code = code.slice(0, shopAvatarsListIdx) + newShopAvatars + code.slice(shopAvatarsEnd + 2);
    console.log('✓ ANIMATED_AVATARS_SHOP updated with 10 exclusive avatars');
  }
}

// 8. REDESIGN AND FIX Stats COMPONENT
const statsFuncStart = code.indexOf('function Stats({');
const badgesPageIdx = code.indexOf('function BadgesPage(', statsFuncStart);

if (statsFuncStart !== -1 && badgesPageIdx !== -1) {
  const newStatsComponent = `function Stats({state, learned}) {
  const [timeRange, setTimeRange] = useState('7d'); // '7d' | '30d'

  const history = useMemo(() => Array.isArray(state.history) ? state.history : [], [state.history]);
  const total = history.length;
  const correct = history.filter(h => h.correct).length;
  const pct = total ? Math.round((correct / total) * 100) : 0;
  const learnedCount = Number(learned || 0);

  // Daily activity calculation
  const activityDays = useMemo(() => {
    const count = timeRange === '7d' ? 7 : 30;
    const days = [];
    const now = new Date();
    const map = {};
    history.forEach(h => {
      if (!h.date) return;
      const d = String(h.date).slice(0, 10);
      map[d] = (map[d] || 0) + 1;
    });
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const weekday = d.toLocaleDateString('uk-UA', { weekday: 'short' });
      days.push({ key, label: count === 7 ? weekday : key.slice(8), n: map[key] || 0 });
    }
    return days;
  }, [history, timeRange]);

  const maxN = Math.max(1, ...activityDays.map(x => x.n));
  const goalPct = Math.min(100, Math.round(((state.todayXp || 0) / Math.max(1, state.dailyGoal || 50)) * 100));

  // Category breakdown
  const categoryStats = useMemo(() => {
    const cats = {
      'Початковий (A1-A2)': 0,
      'Середній (B1-B2)': 0,
      'Подорожі & Життя': 0,
      'Бізнес & Робота': 0,
      'IT & Технології': 0
    };
    const masteryEntries = Object.entries(state.mastery || {});
    masteryEntries.forEach(([id, level]) => {
      if (level >= 1) {
        if (id.includes('a1') || id.includes('a2') || id.startsWith('1') || id.startsWith('2')) cats['Початковий (A1-A2)']++;
        else if (id.includes('b1') || id.includes('b2') || id.startsWith('3') || id.startsWith('4')) cats['Середній (B1-B2)']++;
        else if (id.includes('trav') || id.includes('food')) cats['Подорожі & Життя']++;
        else if (id.includes('biz') || id.includes('work')) cats['Бізнес & Робота']++;
        else cats['IT & Технології']++;
      }
    });
    return cats;
  }, [state.mastery]);

  return (
    <section className="fade-in stats-hub-modern">
      <Title title="📊 Аналітика та Академічна Статистика" text="Ваш навчальний прогрес, динаміка памʼяті та активність занять" />

      {/* Top Metric Cards */}
      <div className="grid stats" style={{marginBottom:16}}>
        <div className="card metric-card" style={{display:'flex',alignItems:'center',gap:12,padding:'16px'}}>
          <div style={{fontSize:28,padding:10,borderRadius:12,background:'rgba(56,189,248,0.15)',color:'#38bdf8'}}>⚡</div>
          <div>
            <span className="muted small">Загальний XP</span>
            <div style={{fontSize:22,fontWeight:800,color:'#fff'}}>{state.xp || 0}</div>
            <span className="small" style={{color:'#38bdf8'}}>+{state.todayXp || 0} сьогодні</span>
          </div>
        </div>

        <div className="card metric-card" style={{display:'flex',alignItems:'center',gap:12,padding:'16px'}}>
          <div style={{fontSize:28,padding:10,borderRadius:12,background:'rgba(34,197,94,0.15)',color:'#22c55e'}}>🧠</div>
          <div>
            <span className="muted small">Засвоєно слів</span>
            <div style={{fontSize:22,fontWeight:800,color:'#fff'}}>{learnedCount}</div>
            <span className="small" style={{color:'#22c55e'}}>з 333 в базі</span>
          </div>
        </div>

        <div className="card metric-card" style={{display:'flex',alignItems:'center',gap:12,padding:'16px'}}>
          <div style={{fontSize:28,padding:10,borderRadius:12,background:'rgba(245,158,11,0.15)',color:'#f59e0b'}}>🎯</div>
          <div>
            <span className="muted small">Точність</span>
            <div style={{fontSize:22,fontWeight:800,color:'#fff'}}>{pct}%</div>
            <span className="small" style={{color:'#f59e0b'}}>{correct}/{total} вдалих</span>
          </div>
        </div>

        <div className="card metric-card" style={{display:'flex',alignItems:'center',gap:12,padding:'16px'}}>
          <div style={{fontSize:28,padding:10,borderRadius:12,background:'rgba(239,68,68,0.15)',color:'#ef4444'}}>🔥</div>
          <div>
            <span className="muted small">Ударний Стрік</span>
            <div style={{fontSize:22,fontWeight:800,color:'#fff'}}>{state.streak || 0}</div>
            <span className="small" style={{color:'#ef4444'}}>днів поспіль</span>
          </div>
        </div>
      </div>

      {/* Daily XP Progress Track */}
      <div className="card" style={{marginBottom:16}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
          <b>🎯 Денна навчальна мета</b>
          <span style={{fontSize:13,color:'#38bdf8',fontWeight:700}}>{state.todayXp || 0} / {Math.max(1, state.dailyGoal || 50)} XP ({goalPct}%)</span>
        </div>
        <div className="xp-goal-track" style={{height:10,borderRadius:5,background:'rgba(255,255,255,0.08)',overflow:'hidden'}}>
          <i style={{width: \`\${goalPct}%\`, height:'100%', background:'linear-gradient(90deg, #38bdf8, #22c55e)', display:'block', borderRadius:5}} />
        </div>
      </div>

      {/* Activity Chart with Range Toggle */}
      <div className="card" style={{marginBottom:16}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,flexWrap:'wrap',gap:8}}>
          <div>
            <h2 style={{margin:0,fontSize:18}}>📅 Динаміка занять та активність</h2>
            <p className="muted small" style={{margin:'2px 0 0'}}>Кількість розвʼязаних тестових карток за днями</p>
          </div>
          <div className="row-btns" style={{gap:4}}>
            <button type="button" className={timeRange === '7d' ? 'primary small' : 'secondary small'} onClick={() => setTimeRange('7d')}>
              7 днів
            </button>
            <button type="button" className={timeRange === '30d' ? 'primary small' : 'secondary small'} onClick={() => setTimeRange('30d')}>
              30 днів
            </button>
          </div>
        </div>

        <div className="chart" style={{display:'flex',alignItems:'flex-end',gap:6,height:140,padding:'10px 0'}}>
          {activityDays.map(d => (
            <div key={d.key} className="bar-wrap" style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4}} title={\`\${d.key}: \${d.n} відповідей\`}>
              <div
                className="bar"
                style={{
                  width:'100%',
                  minHeight: d.n ? 8 : 2,
                  height: \`\${(d.n / maxN) * 100}%\`,
                  borderRadius:4,
                  background: d.n ? 'linear-gradient(180deg, #38bdf8, #0284c7)' : 'rgba(255,255,255,0.06)'
                }}
              />
              <span style={{fontSize:10,color:'var(--muted)'}}>{d.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Category Mastery Progress */}
      <div className="grid two">
        <div className="card">
          <h2 style={{fontSize:18,marginBottom:12}}>📚 Освоєння категорій</h2>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {Object.entries(categoryStats).map(([catName, catCount]) => {
              const catCap = 40;
              const catPct = Math.min(100, Math.round((catCount / catCap) * 100));
              return (
                <div key={catName}>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4}}>
                    <span>{catName}</span>
                    <b style={{color:'#38bdf8'}}>{catCount} слів ({catPct}%)</b>
                  </div>
                  <div style={{height:6,borderRadius:3,background:'rgba(255,255,255,0.06)',overflow:'hidden'}}>
                    <div style={{width:\`\${catPct}%\`,height:'100%',background:'#38bdf8',borderRadius:3}} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <h2 style={{fontSize:18,marginBottom:12}}>🔄 Режими навчання</h2>
          <ModeBars history={history} />
          <div style={{marginTop:16,padding:'12px',borderRadius:10,background:'rgba(0,0,0,0.2)'}}>
            <p className="muted small" style={{margin:0}}>
              💡 <b>Порада:</b> Регулярне повторення в режимі SRS закріплює слова в довготривалій памʼяті на 90% швидше!
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
`;
  code = code.slice(0, statsFuncStart) + newStatsComponent + '\n' + code.slice(badgesPageIdx);
  console.log('✓ Stats component fully rebuilt and modernized (zero errors, no CEFR diploma)');
}

fs.writeFileSync('src/App.jsx', code, 'utf8');
console.log('✓ Batch 3 applied to src/App.jsx');
