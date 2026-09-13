import fs from 'node:fs';

const appPath = 'src/App.jsx';
let content = fs.readFileSync(appPath, 'utf8');

console.log('Original App.jsx size:', content.length);

// 1. Strict Admin Security Fix: Remove state?.name === 'boss' vulnerability
content = content.replace(
  "const isAdmin = state?.role === 'admin' || String(state?.nick).toLowerCase() === 'boss' || String(state?.name).toLowerCase() === 'boss';",
  "const isAdmin = state?.role === 'admin' || String(state?.nick).toLowerCase() === 'boss';"
);
content = content.replace(
  "const isBoss = String(u.nick||'').toLowerCase() === 'boss' || String(u.name||'').toLowerCase() === 'boss';",
  "const isBoss = String(u.nick||'').toLowerCase() === 'boss';"
);
content = content.replace(
  "{name || state.nick} {(String(state.nick||'').toLowerCase()==='boss' || String(name||'').toLowerCase()==='boss') && '👑'}",
  "{name || state.nick} {String(state.nick||'').toLowerCase()==='boss' && '👑'}"
);

// 2. Sidebar Navigation: Move challenges to НАВЧАННЯ
const oldSidebarNav = `      <div className="nav-section">НАВЧАННЯ</div>
      {[
        ['dashboard', Home, 'Головна'],
        ['learn', Play, 'Уроки'],
        ['vocabulary', BookOpen, 'Словник'],
        ['review', RotateCcw, 'SRS Повтор'],
        ['shop', ShoppingBag, 'Магазин'],
      ].map(([id, I, t]) => (`;

const newSidebarNav = `      <div className="nav-section">НАВЧАННЯ</div>
      {[
        ['dashboard', Home, 'Головна'],
        ['learn', Play, 'Уроки'],
        ['vocabulary', BookOpen, 'Словник'],
        ['review', RotateCcw, 'SRS Повтор'],
        ['challenges', Swords, 'Арена & Дуелі'],
        ['shop', ShoppingBag, 'Магазин'],
      ].map(([id, I, t]) => (`;

content = content.replace(oldSidebarNav, newSidebarNav);

// Remove challenges from ПРОГРЕС in sidebar
const oldProgressNav = `      <div className="nav-section">ПРОГРЕС</div>
      {[
        ['stats', BarChart3, 'Статистика'],
        ['badges', Award, 'Досягнення'],
        ['problems', Target, 'Проблемні'],
        ['leaderboard', Trophy, 'Рейтинг'],
        ['challenges', Swords, 'Challenges'],
      ].map(([id, I, t]) => (`;

const newProgressNav = `      <div className="nav-section">ПРОГРЕС</div>
      {[
        ['stats', BarChart3, 'Статистика'],
        ['badges', Award, 'Досягнення'],
        ['problems', Target, 'Проблемні'],
        ['leaderboard', Trophy, 'Рейтинг'],
      ].map(([id, I, t]) => (`;

content = content.replace(oldProgressNav, newProgressNav);

// Only show Admin in sidebar if isAdmin
content = content.replace(
  `<button className={'nav nav-admin' + (page === 'admin' ? ' active' : '')} onClick={() => { nav('admin'); setMobile?.(false); }}><Shield size={18}/>Адмін</button>`,
  `{isAdmin && <button className={'nav nav-admin' + (page === 'admin' ? ' active' : '')} onClick={() => { nav('admin'); setMobile?.(false); }}><Shield size={18}/>Адмін</button>}`
);

// 3. Pass onViewProfile to FriendsPage and save to BadgesPage
content = content.replace(
  "{page === 'badges' && <BadgesPage state={state} />}",
  "{page === 'badges' && <BadgesPage state={state} save={save} />}"
);
content = content.replace(
  "{page === 'friends' && <FriendsPage state={state} />}",
  "{page === 'friends' && <FriendsPage state={state} onViewProfile={setPublicProfileNick} />}"
);

// 4. Replace Смарагдів with Золотих Монет
content = content.replace(
  `<span className="currency-pill-gems">💎 {state.gems || 0} Смарагдів</span>`,
  `<span className="currency-pill-coins">🪙 {state.gems || 0} Золотих Монет</span>`
);
content = content.replace(
  "emitSiteToast('🎉 ТИТАН СЛІВ ПОВАЛЕНИЙ! +15 💎 Смарагдів та +150 XP!', 'ok');",
  "emitSiteToast('🎉 ТИТАН СЛІВ ПОВАЛЕНИЙ! +15 🪙 Золотих Монет та +150 XP!', 'ok');"
);
content = content.replace(
  `<span className="muted small">🎁 Нагорода: <b>+15 💎 Смарагдів та +150 XP</b> · ⏱️ <b>30с на слово</b></span>`,
  `<span className="muted small">🎁 Нагорода: <b>+15 🪙 Золотих Монет та +150 XP</b> · ⏱️ <b>30с на слово</b></span>`
);
content = content.replace(
  `<p className="muted">Ви отримали +15 💎 Смарагдів та +150 XP за видатні знання англійської!</p>`,
  `<p className="muted">Ви отримали +15 🪙 Золотих Монет та +150 XP за видатні знання англійської!</p>`
);
content = content.replace(
  `<span className="muted small">🎁 Нагорода за 10+ слів: <b>+5 💎 Смарагдів та +50 XP</b></span>`,
  `<span className="muted small">🎁 Нагорода за 10+ слів: <b>+5 🪙 Золотих Монет та +50 XP</b></span>`
);

// 5. Empty league text: "Ти можеш стати першим!"
content = content.replace(
  `<p className="muted small" style={{margin:'6px 0'}}>У цій лізі ще немає гравців. Навчайтесь, щоб піднятися сюди!</p>`,
  `<p className="muted small" style={{margin:'6px 0'}}>У цій лізі ще немає гравців. Навчайтесь, щоб піднятися сюди. Ти можеш стати першим!</p>`
);

// 6. Shop cleanup: remove Edara dialogue bar and redundant text
const oldShopSub = `<p className="tavern-wood-sub">
            Підсилюйте прогрес та відкривайте анімованих персонажів! Усі товари купуються виключно за <b>🪙 Золоті Монети</b>. Бали <b>⚡ XP</b> є мірилом зусиль і їх неможливо купити!
          </p>`;
const newShopSub = `<p className="tavern-wood-sub">
            Підсилюйте прогрес та відкривайте ексклюзивні бустери й анімованих персонажів!
          </p>`;
content = content.replace(oldShopSub, newShopSub);

const oldEdara = `      {/* 🧝‍♀️ Mentor Edara Dialogue Bar at the bottom */}
      <div className="tavern-keeper-dialogue-bar">
        <div className="tavern-keeper-avatar-wrap">
          <span className="tavern-keeper-avatar">🧝‍♀️</span>
        </div>
        <div className="tavern-keeper-text-box">
          <div className="tavern-keeper-name">Наставниця Едара</div>
          <p className="tavern-keeper-quote">
            «Ласкаво прошу до нашої Крамниці Знань! Тут зібрано виключно корисні підсилювачі для вивчення англійської: стирачі помилок, захист ударного режиму та ексклюзивні анімовані аватари героїв. Усі розрахунки ведуться виключно у Золотих Монетах!»
          </p>
        </div>
        <button
          type="button"
          className="tavern-rules-link-btn"
          onClick={() => setShowEconomyModal(true)}
        >
          📜 Економіка сайту ➔
        </button>
      </div>`;
content = content.replace(oldEdara, '');

// 7. Fix AvatarIcon call in Shop card line 3278
content = content.replace(
  '<AvatarIcon av={avData} size={76} />',
  '<AvatarIcon id={item.id} av={avData} size={76} />'
);

// 8. Onboarding Login Logo fix: replace EF with BrandLogo
content = content.replace(
  '<div className="logo">EF</div>',
  `<div className="logo" style={{display:'inline-flex',justifyContent:'center',alignItems:'center',marginBottom:8,background:'transparent'}}>
          <BrandLogo size={52} />
        </div>`
);

fs.writeFileSync(appPath, content, 'utf8');
console.log('Applied initial batch of App.jsx updates cleanly. New size:', content.length);
