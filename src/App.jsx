import React, {useEffect, useMemo, useState, useCallback, useRef, lazy, Suspense} from 'react';
import {BarChart3, BookOpen, Check, CheckCircle2, ChevronRight, Flame, Home, Lock, Menu, Moon, Palette, Play, RotateCcw, Settings, Sun, Target, Trophy, User, Volume2, X, XCircle, Shield, SlidersHorizontal, Brain, Sparkles, Keyboard, Layers, Award, Cloud, Users, MessageCircle, Ghost, VolumeX} from 'lucide-react';
import {words as fallbackWords, rules, BADGES} from './data';
import {notionWords, notionSyncMeta} from './notionWords.generated';
import { Analytics } from '@vercel/analytics/react';
import {listProfiles, saveProfile, loadProfile, getActiveNick, cloudPull, cloudPush, cloudConfigured, isNickTaken, registerNick, setGuestSession, isGuestSession, getFriends, addFriend, getChat, sendChat, friendsLeaderboard, getDailyAverage, ensureDailyAverage} from './lib/storage';
import {onCorrect as srsOk, onWrong as srsBad, isDue, todayStr} from './lib/srs';


/** Roadmap in admin — remove only when user asks by title */
const ROADMAP_ITEMS = [
  {v:'1.4', title:'Фікс перекриття на мобільному', status:'done'},
  {v:'1.4', title:'Фікс збірки Vercel (lazy/рядок імпорту)', status:'done'},
  {v:'1.4', title:'Таблиця Roadmap в адмінці', status:'done'},
  {v:'1.4', title:'Перемикач stagger-анімації', status:'done'},
  {v:'1.4', title:'Skeleton-завантаження', status:'done'},
  {v:'1.5', title:'Вхід: нік + пароль, імʼя з профілю', status:'done'},
  {v:'1.5', title:'Адмін: лок без виходу на головну', status:'done'},
  {v:'1.5', title:'Match: слова не зникають після пари', status:'done'},
  {v:'1.5', title:'Sprint: стабільний лічильник 1→N', status:'done'},
  {v:'1.5', title:'Профіль у стилі RPG', status:'planned'},
  {v:'1.6', title:'React.lazy для Admin/Stats', status:'planned'},
  {v:'1.6', title:'E2E-чат (ключ лише на пристроях)', status:'planned'},
  {v:'1.6', title:'Адмін: пошук гравців у БД', status:'planned'},
  {v:'1.6', title:'Аналітика 1–17 з графіками', status:'planned'},
  {v:'1.6', title:'PWA / повний офлайн', status:'planned'},
];

const VERSION = '1.5-beta';
const words = (notionWords?.length ? notionWords : fallbackWords).map(w => ({
  id: w.id, word: w.word, translation: w.translation || '—', pronunciation: w.pronunciation || '',
  category: w.category || 'Other', level: w.level || '', explanation: w.explanation || '',
  example: w.example || (w.examples || '').split('\n')[0] || ''
}));
const CATS = [...new Set(words.map(w => w.category))].sort();
const defaultAdmin = {lessonSize: 10, correctPoints: 4, wrongPoints: -2, masteryThreshold: 8, shuffleAnswers: true, showPronunciation: true, adminPassword: '2468'};
const emptyState = () => ({
  nick: '', name: '', passHash: '', xp: 0, streak: 1, dailyGoal: 50, todayXp: 0, today: todayStr(),
  mastery: {}, srs: {}, attempts: {}, history: [], badges: [], avatar: '🇺🇸',
  theme: 'system', skin: 'classic', customTheme: {accent: '#22a06b', bg: '#f6f8f6', surface: '#ffffff'},
  admin: {...defaultAdmin},
  quiet: false, sfx: true, soundPack: 'auto', guest: false, gamesPlayed: 0,
  compareMode: 'global', compareFriend: '', midnightSnap: null,
  settings: { keyboardHints: true, staggerList: true }
});

function playTone(ok, pack) {
  try {
    if (window.__efQuiet || window.__efNoSfx) return;
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    const c = new C(), o = c.createOscillator(), g = c.createGain();
    const p = pack || window.__efSoundPack || 'classic';
    if (p === 'neon') {
      o.type = 'square';
      o.frequency.setValueAtTime(ok ? 880 : 110, c.currentTime);
      o.frequency.exponentialRampToValueAtTime(ok ? 1320 : 55, c.currentTime + 0.12);
      g.gain.setValueAtTime(0.0001, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.08, c.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.15);
      o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.16);
      return;
    }
    if (p === 'candy') {
      o.type = 'sine';
      o.frequency.setValueAtTime(ok ? 523 : 180, c.currentTime);
      o.frequency.exponentialRampToValueAtTime(ok ? 784 : 120, c.currentTime + 0.2);
    } else if (p === 'paper') {
      o.type = 'triangle';
      o.frequency.setValueAtTime(ok ? 440 : 160, c.currentTime);
      o.frequency.linearRampToValueAtTime(ok ? 660 : 100, c.currentTime + 0.25);
    } else {
      o.type = ok ? 'sine' : 'square';
      o.frequency.setValueAtTime(ok ? 660 : 140, c.currentTime);
      o.frequency.exponentialRampToValueAtTime(ok ? 980 : 90, c.currentTime + 0.22);
    }
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.exponentialRampToValueAtTime(ok ? 0.12 : 0.09, c.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.28);
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.3);
  } catch {}
}

function confettiBurst() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || window.__efQuiet) return;
  const root = document.createElement('div');
  root.className = 'confetti-root';
  document.body.appendChild(root);
  const colors = ['#22a06b','#f9a825','#e11d48','#3b82f6','#a855f7','#fff'];
  for (let i = 0; i < 40; i++) {
    const p = document.createElement('i');
    p.style.left = 40 + Math.random() * 20 + '%';
    p.style.background = colors[i % colors.length];
    p.style.animationDelay = (Math.random() * 0.3) + 's';
    p.style.setProperty('--dx', (Math.random() * 200 - 100) + 'px');
    p.style.setProperty('--rot', (Math.random() * 720 - 360) + 'deg');
    root.appendChild(p);
  }
  setTimeout(() => root.remove(), 1600);
}


function speak(t, rate = 0.9) {
  if (!('speechSynthesis' in window) || window.__efQuiet) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(t);
  u.lang = 'en-US';
  // browsers often clamp; slow mode uses lower rate + slightly lower pitch
  u.rate = Math.max(0.4, Math.min(1.2, rate));
  u.pitch = rate < 0.75 ? 0.85 : 1;
  speechSynthesis.speak(u);
}
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function generateExercises(w) {
  const word = w.word, tr = w.translation, ex = w.example || `I used the word "${word}" today.`;
  const gap = ex.includes(word) ? ex.replace(new RegExp(word, 'i'), '______') : `Please use ______ in a sentence. (${tr})`;
  return [
    {type: 'flashcard', front: word, back: tr},
    {type: 'quiz', prompt: `Що означає «${word}»?`, answer: tr},
    {type: 'gap', prompt: gap, answer: word},
    {type: 'transform', prompt: `Зроби питання з ідеєю: ${ex}`, answer: `...?`},
    {type: 'listening', prompt: word, answer: tr},
    {type: 'speaking', prompt: `Скажи вголос: ${word} — ${tr}`},
    {type: 'dialog', prompt: `A: Did you hear about ${word}?\\nB: Yes — it means «${tr}».`},
  ];
}

function makeQuizItems(source, size, direction, category) {
  let pool = category && category !== 'all' ? source.filter(w => w.category === category) : [...source];
  pool = shuffle(pool).slice(0, Math.min(size, pool.length));
  return pool.map(w => {
    const prompt = direction === 'en-ua' ? w.word : w.translation;
    const answer = direction === 'en-ua' ? w.translation : w.word;
    const others = source.filter(x => x.id !== w.id);
    const wrongs = shuffle(others).slice(0, 3).map(x => direction === 'en-ua' ? x.translation : x.word);
    const options = shuffle([answer, ...wrongs]);
    return {...w, prompt, answer, options, direction};
  });
}
function computeBadges(state) {
  const learned = Object.values(state.mastery || {}).filter(v => v >= (state.admin?.masteryThreshold || 8)).length;
  const earned = new Set(state.badges || []);
  const add = id => earned.add(id);
  if ((state.history || []).length > 0) add('first_steps');
  if ((state.streak || 0) >= 3) add('streak_3');
  if ((state.streak || 0) >= 7) add('streak_7');
  if (learned >= 20) add('words_20');
  if (learned >= 50) add('words_50');
  if ((state.xp || 0) >= 500) add('xp_500');
  if ((state.history || []).some(h => h.mode === 'dictation')) add('dictation');
  if ((state.history || []).some(h => h.mode === 'match' && h.correct)) add('match_master');
  return [...earned];
}

export default function App() {
  const [state, setState] = useState(() => {
    const nick = getActiveNick();
    const p = nick ? loadProfile(nick) : null;
    return p ? {...emptyState(), ...p, admin: {...defaultAdmin, ...(p.admin || {})}} : emptyState();
  });
  const [page, setPage] = useState(state.nick ? 'dashboard' : 'onboarding');
  const [mobile, setMobile] = useState(false);
  const [lessonCfg, setLessonCfg] = useState(null); // {mode, direction, category}
  const [cloudMsg, setCloudMsg] = useState('');
  const [wordsLive, setWordsLive] = useState(() => {
    try {
      const cached = localStorage.getItem('ef-words-cache-v1');
      if (cached) {
        const p = JSON.parse(cached);
        if (p?.words?.length) {
          return p.words.map(w => ({
            id: w.id, word: w.word, translation: w.translation || '—', pronunciation: w.pronunciation || '',
            category: w.category || 'Other', level: w.level || '', explanation: w.explanation || '',
            example: w.example || (w.examples || '').split('\n')[0] || ''
          }));
        }
      }
    } catch {}
    return words;
  });
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null);
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  useEffect(() => {
    const on = () => setOnline(true); const off = () => setOnline(false);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2800); };

  const save = useCallback((s) => {
    const badges = computeBadges(s);
    const next = {...s, badges};
    setState(next);
    if (next.nick) {
      saveProfile(next.nick, next);
      if (cloudConfigured()) cloudPush(next.nick, next).catch(() => {});
    }
  }, []);

  const nav = (p) => {
    if (page === 'admin' && p !== 'admin') sessionStorage.removeItem('ef-admin-ok');
    setPage(p); setMobile(false);
  };
  useEffect(() => {
    if (page !== 'admin') {
      sessionStorage.removeItem('ef-admin-ok');
      sessionStorage.removeItem('ef-admin-token');
    }
  }, [page]);

  // Hard admin session lock
  useEffect(() => {
    if (page !== 'admin') return;
    let timer = null;
    const lock = () => {
      sessionStorage.removeItem('ef-admin-ok');
      sessionStorage.removeItem('ef-admin-token');
      window.dispatchEvent(new Event('ef-admin-lock'));
      // stay on admin page — only re-show login gate
    };
    const bump = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(lock, 30000); // 30s idle
    };
    const onVis = () => { if (document.hidden) lock(); };
    const onBlur = () => lock();
    const onPageHide = () => lock();
    bump();
    window.addEventListener('mousemove', bump);
    window.addEventListener('keydown', bump);
    window.addEventListener('touchstart', bump);
    window.addEventListener('scroll', bump, true);
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('blur', onBlur);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener('mousemove', bump);
      window.removeEventListener('keydown', bump);
      window.removeEventListener('touchstart', bump);
      window.removeEventListener('scroll', bump, true);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [page]);


  useEffect(() => {
    const resolved = state.theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : state.theme;
    document.documentElement.dataset.theme = resolved === 'custom' ? 'custom' : resolved;
    document.documentElement.dataset.skin = state.skin || 'classic';
    if (state.theme === 'custom') {
      document.documentElement.style.setProperty('--accent', state.customTheme.accent);
      document.documentElement.style.setProperty('--custom-bg', state.customTheme.bg);
      document.documentElement.style.setProperty('--custom-surface', state.customTheme.surface);
    }
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (state.theme === 'system') {
        document.documentElement.dataset.theme = mq.matches ? 'dark' : 'light';
      }
    };
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, [state.theme, state.skin, state.customTheme]);
  useEffect(() => {
    window.__efQuiet = !!state.quiet;
    window.__efNoSfx = state.sfx === false;
    const pack = state.soundPack === 'auto' ? (state.skin || 'classic') : (state.soundPack || 'classic');
    window.__efSoundPack = pack;
  }, [state.quiet, state.sfx, state.soundPack, state.skin]);
  useEffect(() => {
    document.documentElement.dataset.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? '1' : '0';
    document.documentElement.dataset.stagger = state.settings?.staggerList === false ? '0' : '1';
  }, []);
  useEffect(() => { ensureDailyAverage(); }, []);
  useEffect(() => {
    const t = todayStr();
    if (!state.midnightSnap || state.midnightSnap.date !== t) {
      const total = (state.history||[]).length;
      const correct = (state.history||[]).filter(h => h.correct).length;
      const pct = total ? Math.round(correct/total*100) : 0;
      const learned = Object.values(state.mastery||{}).filter(v => v >= (state.admin?.masteryThreshold||8)).length;
      save({...state, midnightSnap: { date: t, pct, learned, xp: state.xp, streak: state.streak }});
    }
  }, [state.today]);

  // Daily reset
  useEffect(() => {
    if (state.today !== todayStr()) {
      const yesterday = state.today;
      const keptStreak = state.todayXp > 0 ? state.streak : Math.max(1, state.streak);
      // simple: if last activity was yesterday and had xp, keep; else reset handled lightly
      save({...state, today: todayStr(), todayXp: 0});
    }
  }, []);

  const learnedCount = words.filter(w => (state.mastery[w.id] || 0) >= state.admin.masteryThreshold).length;
  const dueCount = words.filter(w => isDue(state.srs[w.id], todayStr()) && (state.mastery[w.id] || 0) > 0).length;

  const startLesson = (mode, direction = 'en-ua', category = 'all') => {
    setLessonCfg({mode, direction, category});
    setPage('lesson');
  };

  const Sidebar = () => (
    <aside className={'sidebar' + (mobile ? ' open' : '')}>
      <div className="brand"><span className="brand-mark">EF</span><span>English Flow</span></div>
      <div className="nav-section">LEARN</div>
      {[
        ['dashboard', Home, 'Головна'],
        ['learn', Play, 'Навчання'],
        ['vocabulary', BookOpen, 'Слова'],
        ['review', RotateCcw, 'SRS Повтор'],
      ].map(([id, I, t]) => (
        <button key={id} className={'nav' + (page === id ? ' active' : '')} onClick={() => nav(id)}><I size={18}/>{t}</button>
      ))}
      <div className="nav-section">TRACK</div>
      {[
        ['stats', BarChart3, 'Статистика'],
        ['badges', Award, 'Бейджі'],
        ['problems', Target, 'Проблемні'],
        ['leaderboard', Trophy, 'Рейтинг'],
      ].map(([id, I, t]) => (
        <button key={id} className={'nav' + (page === id ? ' active' : '')} onClick={() => nav(id)}><I size={18}/>{t}</button>
      ))}
      <div className="nav-section">ACCOUNT</div>
      <button className={'nav' + (page === 'friends' ? ' active' : '')} onClick={() => nav('friends')}><Users size={18}/>Друзі</button>
      <button className={'nav' + (page === 'settings' ? ' active' : '')} onClick={() => nav('settings')}><Settings size={18}/>Налаштування</button>
      <button className={'nav' + (page === 'profile' ? ' active' : '')} onClick={() => nav('profile')}><User size={18}/>Профіль</button>
      <button className={'nav' + (page === 'about' ? ' active' : '')} onClick={() => nav('about')}><Sparkles size={18}/>Про додаток</button>
      <button className={'nav' + (page === 'admin' ? ' active' : '')} onClick={() => nav('admin')}><Shield size={18}/>Адмін</button>
    </aside>
  );

  const Layout = ({children}) => (
    <div className="app">
      <Sidebar />
      <main className="main">
        <header>
          <button className="icon mobile-only" onClick={() => setMobile(!mobile)}>{mobile ? <X/> : <Menu/>}</button>
          <div><b>{state.name || state.nick}</b>{String(state.nick).toLowerCase()==='boss' && <span className="boss-badge" title="Verified">👑</span>}<span className="muted"> · @{state.nick}</span>{String(state.nick).toLowerCase()==='boss' && <span className="pill ok">verified</span>}
          {state.guest && <span className="pill guest-pill"><Ghost size={12}/> гість</span>}</div>
          <div className="header-stats"><span>🔥 {state.streak}</span><span>⚡ {state.xp} XP</span></div>
        </header>
        {children}
        <nav className="mobile-nav">
          {[['dashboard', Home, 'Головна'], ['learn', Play, 'Вчити'], ['vocabulary', BookOpen, 'Слова'], ['review', RotateCcw, 'SRS'], ['profile', User, 'Профіль']].map(([id, I, t]) => (
            <button key={id} className={page === id ? 'active' : ''} onClick={() => nav(id)}><I size={18}/><span>{t}</span></button>
          ))}
        </nav>
      </main>
    </div>
  );

  if (page === 'onboarding') {
    return <><Onboarding onDone={async (nick, name) => {
      let base = emptyState();
      const local = loadProfile(nick);
      if (local) base = {...base, ...local};
      const remote = await cloudPull(nick);
      if (remote && (!local || (remote.updatedAt || '') > (local.updatedAt || ''))) base = {...base, ...remote};
      const s = {...base, nick, name: name || nick, admin: {...defaultAdmin, ...(base.admin || {})}};
      save(s); setPage('dashboard');
      setCloudMsg(remote ? 'Прогрес підтягнуто з хмари' : (local ? 'Локальний профіль' : 'Новий профіль'));
    }}/><div className="version-badge">v{VERSION}</div><Analytics /></>;
  }

  return (
    <>
      <Layout>
        {page === 'dashboard' && <Dashboard state={state} learned={learnedCount} due={dueCount} words={words.length} onLearn={() => nav('learn')} onReview={() => nav('review')} cloudMsg={cloudMsg} notionMeta={notionSyncMeta} />}
        {page === 'learn' && <Learn state={state} cats={CATS} onStart={startLesson} />}
        {page === 'vocabulary' && <Vocabulary state={state} setModal={setModal} />}
        {page === 'review' && <ReviewPage state={state} due={dueCount} onStart={() => startLesson('srs', 'en-ua', 'all')} />}
        {page === 'stats' && <Stats state={state} learned={learnedCount} />}
        {page === 'badges' && <BadgesPage state={state} />}
        {page === 'problems' && <ProblemsPage state={state} save={save} onStart={(m,d,c) => { setLessonCfg({mode:m,direction:d,category:c}); setPage('lesson'); }} />}
        {page === 'leaderboard' && <Leaderboard state={state} />}
        {page === 'settings' && <SettingsPage state={state} save={save} />}
        {page === 'friends' && <FriendsPage state={state} />}
        {page === 'profile' && <Profile state={state} save={save} />}
        {page === 'about' && <AboutPage />}
        {page === 'offline' && <section className="page-error card"><h1>Offline</h1><p>Немає зʼєднання. Перевір інтернет і спробуй знову.</p><button className="primary" type="button" onClick={() => nav('dashboard')}>На головну</button></section>}
        {page === '404' && <section className="page-error card"><h1>404</h1><p>Такої сторінки немає.</p><button className="primary" type="button" onClick={() => nav('dashboard')}>На головну</button></section>}
        {page === 'admin' && <Admin state={state} save={save} setWordsLive={setWordsLive} wordsLive={wordsLive} />}
        {page === 'lesson' && lessonCfg && (
          <Lesson
            cfg={lessonCfg}
            state={state}
            save={save}
            onExit={() => nav('learn')}
            onDone={() => nav('dashboard')}
          />
        )}
      </Layout>
      <div className="version-badge">v{VERSION}</div>
      <Toast msg={toast} />
      <ConfirmModal modal={modal} onClose={() => setModal(null)} />
      <OfflineBanner online={online} />
      <Analytics />
    </>
  );
}

function Onboarding({onDone}) {
  const [mode, setMode] = useState('login'); // login | register
  const [nick, setNick] = useState('');
  const [name, setName] = useState('');
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const validatePass = (n, nm, p) => {
    const pl = p.trim();
    const nl = n.trim().toLowerCase();
    const nml = (nm || '').trim().toLowerCase();
    if (pl.length < 6) return 'Пароль мінімум 6 символів';
    if (pl.toLowerCase() === nl) return 'Пароль не може збігатися з ніком';
    if (nml && pl.toLowerCase() === nml) return 'Пароль не може збігатися з імʼям';
    return '';
  };

  const doLogin = async () => {
    const n = nick.trim();
    if (!n || !pass) { setErr('Вкажи нік і пароль'); return; }
    setBusy(true); setErr('');
    try {
      const { hashPassword } = await import('./lib/crypto.js');
      let profile = loadProfile(n);
      if (!profile && cloudConfigured()) {
        const remote = await cloudPull(n);
        if (remote) profile = {...emptyState(), ...remote, nick: n};
      }
      if (!profile) { setErr('Акаунт не знайдено'); setBusy(false); return; }
      const h = await hashPassword(pass);
      if (profile.passHash && profile.passHash !== h) {
        setErr('Невірний пароль'); setBusy(false); return;
      }
      // legacy profiles without passHash — set on first login
      if (!profile.passHash) {
        profile = {...profile, passHash: h};
        saveProfile(n, profile);
      }
      setGuestSession(false);
      onDone(profile);
    } catch (e) {
      setErr(e.message || 'Помилка входу');
    }
    setBusy(false);
  };

  const doRegister = async () => {
    const n = nick.trim();
    const v = validatePass(n, name, pass);
    if (v) { setErr(v); return; }
    if (n.length < 2) { setErr('Нік мінімум 2 символи'); return; }
    setBusy(true); setErr('');
    try {
      if (await isNickTaken(n)) { setErr('Цей нік уже зайнятий'); setBusy(false); return; }
      const { hashPassword } = await import('./lib/crypto.js');
      const passHash = await hashPassword(pass);
      setGuestSession(false);
      const base = emptyState();
      const profile = await registerNick(n, {
        ...base, nick: n, name: name.trim() || n, passHash
      });
      onDone(profile);
    } catch (e) {
      setErr(e.message || 'Помилка реєстрації');
    }
    setBusy(false);
  };

  const guest = () => {
    setGuestSession(true);
    const g = {...emptyState(), nick: 'guest', name: 'Гість', guest: true};
    saveProfile('guest', g);
    onDone(g);
  };

  return (
    <div className="onboarding fade-in">
      <div className="welcome card">
        <div className="logo">EF</div>
        <span className="eyebrow">ENGLISH FLOW</span>
        <h1>{mode === 'login' ? 'Вхід' : 'Реєстрація'}</h1>
        <p className="muted">Нік може бути як імʼя. Пароль ≠ нік і ≠ імʼя. Імʼя підтягнеться з профілю.</p>
        <div className="row-btns" style={{marginBottom:12}}>
          <button type="button" className={'theme' + (mode==='login'?' active':'')} onClick={() => setMode('login')}>Вхід</button>
          <button type="button" className={'theme' + (mode==='register'?' active':'')} onClick={() => setMode('register')}>Реєстрація</button>
        </div>
        <label>Нік *</label>
        <input className="search" value={nick} onChange={e => setNick(e.target.value)} placeholder="твій_нік" maxLength={24} autoComplete="username"/>
        {mode === 'register' && (
          <>
            <label>Імʼя (опційно)</label>
            <input className="search" value={name} onChange={e => setName(e.target.value)} placeholder="як звертатись"/>
          </>
        )}
        <label>Пароль *</label>
        <input className="search" type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••" autoComplete={mode==='login'?'current-password':'new-password'}
          onKeyDown={e => e.key==='Enter' && (mode==='login'?doLogin():doRegister())}/>
        {err && <p className="auth-err">{err}</p>}
        <button className="primary full" type="button" disabled={busy} onClick={mode==='login'?doLogin:doRegister}>
          {busy ? '…' : (mode==='login' ? 'Увійти' : 'Створити акаунт')}
        </button>
        <button className="secondary full guest-btn" type="button" onClick={guest}>
          <Ghost size={18}/> Увійти як гість
        </button>
      </div>
    </div>
  );
}
function Dashboard({state, learned, due, words, onLearn, onReview, cloudMsg, notionMeta}) {
  return (
    <section>
      <div className="announce card">
        <span className="eyebrow">UPDATE · v1.5-beta</span>
        <h2>English Flow</h2>
        <p>Вчи слова, збирай XP, змагайся з друзями. Прогрес зберігається локально та в хмарі (якщо налаштована).</p>
      </div>
      <div className="hero">
        <div>
          <span className="eyebrow">TODAY</span>
          <h1>Привіт, {state.name || state.nick} 👋</h1>
          <p>Слів у базі: <b>{words}</b> · Вивчено: <b>{learned}</b> · На повторення SRS: <b>{due}</b></p>
          {cloudMsg && <p className="saved-message">{cloudMsg}</p>}
          <div className="row-btns">
            <button className="primary" onClick={onLearn}>Вчити <Play size={16}/></button>
            <button className="secondary" onClick={onReview}>SRS ({due})</button>
          </div>
        </div>
        <div className="hero-art">🎯</div>
      </div>
      <div className="grid stats">
        <Card icon={<Flame/>} title="Streak" value={state.streak} sub="днів" />
        <Card icon={<Sparkles/>} title="XP" value={state.xp} sub={`сьогодні ${state.todayXp}`} />
        <Card icon={<Target/>} title="Ціль" value={`${Math.min(100, Math.round((state.todayXp / state.dailyGoal) * 100))}%`} sub={`${state.todayXp}/${state.dailyGoal}`} />
        <Card icon={<Brain/>} title="Вивчено" value={learned} sub={`з ${words}`} />
      </div>
      <div className="card">
        <h2>Notion</h2>
        <p className="muted">{notionMeta?.count ? `Синхронізовано ${notionMeta.count} слів · ${notionMeta.syncedAt || ''}` : `Зараз локальний словник (${words} слів). Повну синхронізацію Notion зробимо пізніше — нагадаю.`}</p>
      </div>
    </section>
  );
}

function Learn({state, cats, onStart}) {
  const [direction, setDirection] = useState('en-ua');
  const [category, setCategory] = useState('all');
  return (
    <section>
      <Title title="Навчання" text="Обери режим. Питання стабільні в межах уроку, кнопки підсвічуються зеленим/червоним." />
      <div className="card filters">
        <label>Напрямок
          <select value={direction} onChange={e => setDirection(e.target.value)}>
            <option value="en-ua">EN → UA (що означає слово)</option>
            <option value="ua-en">UA → EN (як сказати англійською)</option>
          </select>
        </label>
        <label>Категорія
          <select value={category} onChange={e => setCategory(e.target.value)}>
            <option value="all">Усі</option>
            {cats.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
      </div>
      <div className="grid two lesson-grid">
        <div className="card lesson-card">
          <div className="lesson-icon">⚡</div>
          <span className="pill">SPRINT</span>
          <h2>Vocabulary Sprint</h2>
          <p className="muted">{state.admin.lessonSize} питань · +{state.admin.correctPoints}/{state.admin.wrongPoints} XP</p>
          <button className="primary" onClick={() => onStart('sprint', direction, category)}>Почати <Play size={16}/></button>
        </div>
        <div className="card lesson-card">
          <div className="lesson-icon">✍️</div>
          <span className="pill">DICTATION</span>
          <h2>Диктант</h2>
          <p className="muted">Введи відповідь з клавіатури</p>
          <button className="secondary" onClick={() => onStart('dictation', direction, category)}>Почати <Keyboard size={16}/></button>
        </div>
        <div className="card lesson-card">
          <div className="lesson-icon">🎯</div>
          <span className="pill">MATCH</span>
          <h2>Match</h2>
          <p className="muted">Зʼєднай слово з перекладом</p>
          <button className="secondary" onClick={() => onStart('match', direction, category)}>Грати <Layers size={16}/></button>
        </div>
        <div className="card lesson-card">
          <div className="lesson-icon">🔁</div>
          <span className="pill">SRS</span>
          <h2>Smart Review</h2>
          <p className="muted">Повторення за інтервалами</p>
          <button className="secondary" onClick={() => onStart('srs', direction, category)}>Повтор <RotateCcw size={16}/></button>
        </div>
        <div className="card lesson-card">
          <div className="lesson-icon">⚠️</div>
          <span className="pill">HARD</span>
          <h2>Лише проблемні</h2>
          <p className="muted">Слова з помилками + адаптація</p>
          <button className="secondary" onClick={() => onStart('problems', direction, category)}>Sprint</button>
        </div>
        <div className="card lesson-card">
          <div className="lesson-icon">📏</div>
          <span className="pill">LONG</span>
          <h2>Довгі слова</h2>
          <p className="muted">Більше ніж 6 літер</p>
          <button className="secondary" onClick={() => onStart('long', direction, category)}>Sprint</button>
        </div>
      </div>
      <div className="card"><h2>Граматика</h2>{rules.map(r => <div className="rule" key={r.id}><b>{r.title}</b><span>{r.explanation}</span></div>)}</div>
    </section>
  );
}

function Lesson({cfg, state, save, onExit, onDone}) {
  const mode = cfg.mode;
  const items = useMemo(() => {
    let pool = words;
    if (mode === 'srs') {
      const due = words.filter(w => isDue(state.srs[w.id], todayStr()));
      pool = due.length ? due : words;
    } else if (mode === 'problems') {
      const wrongIds = new Set();
      (state.history || []).forEach(h => { if (!h.correct) wrongIds.add(String(h.word)); });
      pool = words.filter(w => wrongIds.has(String(w.id)) || (state.mastery[w.id] || 0) === 0);
      if (pool.length < 4) pool = words;
    } else if (mode === 'long') {
      pool = words.filter(w => (w.word || '').replace(/\s/g, '').length > 6);
      if (pool.length < 4) pool = words;
    }
    if (mode === 'match') return shuffle(pool.filter(w => cfg.category === 'all' || w.category === cfg.category)).slice(0, 6);
    return makeQuizItems(pool, state.admin.lessonSize, cfg.direction, cfg.category);
  }, []);

  if (mode === 'match') return <MatchGame key="match-board" items={items} state={state} save={save} onExit={onExit} onDone={onDone} />;
  if (mode === 'dictation') return <DictationGame items={items} state={state} save={save} onExit={onExit} onDone={onDone} />;
  return <SprintGame items={items} mode={mode} state={state} save={save} onExit={onExit} onDone={onDone} />;
}

function SprintGame({items, mode, state, save, onExit, onDone}) {
  // Freeze quiz list once — never re-read from props
  const quizRef = useRef(null);
  if (!quizRef.current) {
    quizRef.current = Array.isArray(items) && items.length ? items.slice() : [];
  }
  const quiz = quizRef.current;

  const [step, setStep] = useState(0); // 0-based index
  const [picked, setPicked] = useState(null);
  const [done, setDone] = useState(false);
  const [scorePop, setScorePop] = useState(null);
  const [okCount, setOkCount] = useState(0);
  const [badCount, setBadCount] = useState(0);
  const [slowAudio, setSlowAudio] = useState(false);
  const [leaveAsk, setLeaveAsk] = useState(false);
  const [mist, setMist] = useState(null);

  const stateRef = useRef(state);
  stateRef.current = state;
  const stepRef = useRef(step);
  stepRef.current = step;
  const pickedRef = useRef(picked);
  pickedRef.current = picked;

  const w = quiz[step];
  const total = quiz.length;

  const applyAnswer = useCallback((ok, wordObj) => {
    const st = stateRef.current;
    const points = ok ? Number(st.admin.correctPoints) || 4 : Number(st.admin.wrongPoints) || -2;
    const mid = wordObj.id;
    const mastery = {...st.mastery, [mid]: Math.max(0, (st.mastery[mid] || 0) + (ok ? 1 : 0))};
    const srs = {...st.srs, [mid]: ok ? srsOk(st.srs[mid]) : srsBad(st.srs[mid])};
    const history = [...(st.history || []), {word: mid, correct: ok, points, date: new Date().toISOString(), mode: mode || 'sprint'}].slice(-2000);
    save({
      ...st, mastery, srs, history,
      xp: (st.xp || 0) + points,
      todayXp: (st.todayXp || 0) + points,
      attempts: {...(st.attempts || {}), [mid]: ((st.attempts || {})[mid] || 0) + 1}
    });
    if (ok) setOkCount(c => c + 1); else { setBadCount(c => c + 1); setSlowAudio(true); }
    setScorePop({pts: points, ok, key: Date.now()});
    setMist(ok ? 'ok' : 'bad');
    playTone(ok);
    setTimeout(() => { setScorePop(null); setMist(null); }, 700);
  }, [mode, save]);

  const answer = useCallback((opt) => {
    if (pickedRef.current !== null) return;
    const wordObj = quizRef.current[stepRef.current];
    if (!wordObj) return;
    const ok = opt === wordObj.answer;
    setPicked(opt);
    applyAnswer(ok, wordObj);
  }, [applyAnswer]);

  const goNext = useCallback(() => {
    const i = stepRef.current;
    const len = quizRef.current.length;
    setPicked(null);
    setScorePop(null);
    setMist(null);
    if (i + 1 >= len) setDone(true);
    else setStep(i + 1);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (done) return;
      const wordObj = quizRef.current[stepRef.current];
      if (pickedRef.current !== null) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goNext(); }
        return;
      }
      if (mode === 'dictation') return;
      const n = Number(e.key);
      if (n >= 1 && n <= 4 && wordObj?.options?.[n - 1] != null) {
        e.preventDefault();
        answer(wordObj.options[n - 1]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [answer, goNext, mode, done]);

  if (!total) {
    return (
      <section className="fade-in">
        <button className="back anim-arrow" type="button" onClick={onExit}>← Назад</button>
        <div className="card">Немає слів для цього уроку.</div>
      </section>
    );
  }

  if (done) {
    return (
      <section className="fade-in">
        <div className="complete card">
          <CheckCircle2 size={64}/>
          <span className="eyebrow">LESSON COMPLETE</span>
          <h1>Урок завершено</h1>
          <p>Правильно: {okCount} · Помилки: {badCount} · Питань: {total}</p>
          {badCount === 0 && okCount > 0 && (
            <p className="bonus-line">Бонус: +{Math.round(okCount * (state.admin.correctPoints || 4) * 0.1)} XP (10.0%)</p>
          )}
          <CompareBlurb state={state} />
          <button className="primary" type="button" onClick={() => {
            let next = {...state, gamesPlayed: (state.gamesPlayed || 0) + 1};
            if (badCount === 0 && okCount > 0) {
              const bonus = Math.round(okCount * (state.admin.correctPoints || 4) * 0.1);
              next = {...next, xp: next.xp + bonus, todayXp: next.todayXp + bonus};
              confettiBurst();
            }
            save(next);
            onDone();
          }}>На головну</button>
        </div>
      </section>
    );
  }

  if (!w) return null;
  const correct = picked === w.answer;
  const masteryNow = state.mastery[w.id] || 0;
  const progressPct = (step / total) * 100;

  return (
    <section className={'lesson-wrap' + (mist ? ' mist-' + mist : '')}>
      {leaveAsk && (
        <div className="ef-modal-backdrop">
          <div className="ef-modal card">
            <h2>Вийти з уроку?</h2>
            <p>Відповіді збережено, урок ще не завершено.</p>
            <div className="row-btns">
              <button className="secondary" type="button" onClick={() => setLeaveAsk(false)}>Залишитись</button>
              <button className="primary" type="button" onClick={onExit}>Вийти</button>
            </div>
          </div>
        </div>
      )}
      <div className={'mist-layer' + (mist ? ' show ' + mist : '')} aria-hidden="true"/>
      <button className="back anim-arrow" type="button" onClick={() => (step > 0 ? setLeaveAsk(true) : onExit())}>
        <span className="arrow-ico">←</span> Назад
      </button>
      <div className="lesson-progress-row">
        <Progress value={progressPct}/>
        <span className="q-count" key={'q'+step}>{step + 1}/{total}</span>
      </div>
      <div className={'lesson-card-main card' + (picked != null ? (correct ? ' flash-ok' : ' flash-bad') : '')}>
        <div className="lesson-top">
          <span className="pill">{mode === 'dictation' ? 'DICTATION' : mode === 'srs' ? 'SRS' : 'SPRINT'}</span>
          <span className="pill soft">{(w.direction || 'en-ua') === 'en-ua' ? 'EN→UA' : 'UA→EN'}</span>
          <span className={'points' + (picked != null ? (correct ? ' up' : ' down') : '')}>
            {picked != null ? (correct ? `+${state.admin.correctPoints}` : `${state.admin.wrongPoints}`) : '·'}
          </span>
        </div>
        <div className="prompt-block">
          <p className="prompt-label muted">Питання {step + 1}</p>
          <h2 className="prompt" key={'p'+step}>{mode === 'dictation' ? 'Напиши слово на слух' : (w.prompt || w.word)}</h2>
          {mode !== 'dictation' && (w.direction || 'en-ua') === 'en-ua' && (
            <p className="muted phon">{w.pronunciation} · {w.category}</p>
          )}
        </div>
        <div className="speak-row">
          <button className="speak" type="button" onClick={() => speak(w.word, slowAudio ? 0.5 : 0.9)}>
            <Volume2 size={16}/> Прослухати
          </button>
          <label className="slow-toggle right">
            <input type="checkbox" checked={slowAudio} onChange={e => setSlowAudio(e.target.checked)}/>
            повільніше
          </label>
        </div>
        {mode === 'dictation' ? (
          <DictationInput key={'d'+step} onSubmit={(val) => {
            if (pickedRef.current != null) return;
            const ok = val.trim().toLowerCase() === String(w.answer).trim().toLowerCase();
            setPicked(val);
            applyAnswer(ok, w);
          }} disabled={picked != null}/>
        ) : (
          <div className="options" key={'o'+step}>
            {(w.options || []).map((o, j) => {
              let cls = 'option';
              if (picked != null) {
                if (o === w.answer) cls += ' correct';
                else if (o === picked) cls += ' wrong';
              }
              return (
                <button key={j} type="button" className={cls} disabled={picked != null} onClick={() => answer(o)}>
                  <span className="key-hint">{j + 1}</span>{o}
                </button>
              );
            })}
          </div>
        )}
        {picked != null && (
          <div className={'feedback ' + (correct ? 'ok' : 'bad')}>
            <div className="feedback-row">
              {correct ? <CheckCircle2/> : <XCircle/>}
              <div>
                <b>{correct ? 'Правильно!' : 'Неправильно'}</b>
                <p className="muted">{w.explanation || w.translation}</p>
                <small className="muted">Mastery {masteryNow}/{state.admin.masteryThreshold}</small>
              </div>
            </div>
            {scorePop && (
              <div key={scorePop.key} className={'score-pop ' + (scorePop.ok ? 'ok' : 'bad')}>
                {scorePop.ok ? '+' : ''}{scorePop.pts}
              </div>
            )}
            <button className="primary next-btn" type="button" onClick={goNext}>
              {step + 1 >= total ? 'Завершити' : 'Далі'} <span className="arrow-ico">→</span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}


function DictationInput({onSubmit, disabled}) {
  const [val, setVal] = useState('');
  return (
    <div className="dictation-row">
      <input className="search" value={val} disabled={disabled} onChange={e => setVal(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && !disabled && onSubmit(val)} placeholder="Введи слово англійською"/>
      <button className="primary" type="button" disabled={disabled} onClick={() => onSubmit(val)}>Перевірити</button>
    </div>
  );
}


function MatchGame({items, state, save, onExit, onDone}) {
  const boardRef = useRef(null);
  if (!boardRef.current) {
    boardRef.current = {
      left: shuffle(items.map(w => ({id: w.id, text: w.word}))),
      right: shuffle(items.map(w => ({id: w.id, text: w.translation}))),
    };
  }
  const left = boardRef.current.left;
  const right = boardRef.current.right;
  const [selL, setSelL] = useState(null);
  const [selR, setSelR] = useState(null);
  const [matched, setMatched] = useState({});
  const [flash, setFlash] = useState({});
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    if (!selL || !selR) return;
    const ok = selL === selR;
    setFlash({[selL]: ok ? 'correct' : 'wrong'});
    playTone(ok);
    const st = stateRef.current;
    if (ok) {
      setMatched(m => ({...m, [selL]: true}));
      const points = st.admin.correctPoints;
      save({...st, xp: st.xp + points, todayXp: st.todayXp + points,
        history: [...st.history, {word: selL, correct: true, points, date: new Date().toISOString(), mode: 'match'}].slice(-2000)});
    } else {
      save({...st, xp: st.xp + st.admin.wrongPoints, todayXp: st.todayXp + st.admin.wrongPoints});
    }
    const t = setTimeout(() => { setSelL(null); setSelR(null); setFlash({}); }, 450);
    return () => clearTimeout(t);
  }, [selL, selR]);

  const allDone = items.length > 0 && items.every(w => matched[w.id]);
  if (allDone) return <section><div className="complete card"><h1>Match завершено 🎯</h1><button className="primary" onClick={onDone}>На головну</button></div></section>;

  return (
    <section>
      <button className="back" onClick={onExit}>← Назад</button>
      <Title title="Match" text="Обери слово і відповідний переклад"/>
      <div className="match-board">
        <div className="match-col">{left.map(x => (
          <button key={x.id} disabled={matched[x.id]} className={'option match-item' + (matched[x.id] ? ' correct matched-stay' : '') + (selL === x.id ? ' selected' : '') + (flash[x.id] ? ' ' + flash[x.id] : '')} onClick={() => setSelL(x.id)}>{x.text}</button>
        ))}</div>
        <div className="match-col">{right.map(x => (
          <button key={x.id} disabled={matched[x.id]} className={'option match-item' + (matched[x.id] ? ' correct matched-stay' : '') + (selR === x.id ? ' selected' : '') + (flash[x.id] ? ' ' + flash[x.id] : '')} onClick={() => setSelR(x.id)}>{x.text}</button>
        ))}</div>
      </div>
    </section>
  );
}

function Vocabulary({state, setModal}) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const f = words.filter(w => {
    const okCat = cat === 'all' || w.category === cat;
    const okQ = (w.word + ' ' + w.translation + ' ' + w.category).toLowerCase().includes(q.toLowerCase());
    return okCat && okQ;
  });
  return (
    <section>
      <Title title="Словник" text={`${words.length} слів · ${notionWords?.length ? 'Notion' : 'локальна база (синк пізніше)'}`}/>
      <div className="filters row">
        <input className="search" placeholder="Пошук…" value={q} onChange={e => setQ(e.target.value)}/>
        <select value={cat} onChange={e => setCat(e.target.value)}>
          <option value="all">Усі категорії</option>
          {CATS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div className="word-list">
        {f.map(w => {
          const m = state.mastery[w.id] || 0;
          const learned = m >= state.admin.masteryThreshold;
          return (
            <div className={'word-row card' + (learned ? ' learned' : '')} key={w.id}>
              <div>
                <b>{w.word}</b> <span className="muted">{w.pronunciation}</span>
                <div>{w.translation}</div>
                <small className="muted">{w.category}{w.level ? ' · ' + w.level : ''}</small>
              </div>
              <div className="word-meta">
                <span className={'pill' + (learned ? ' ok' : '')}>{learned ? 'Вивчено' : `${m}/${state.admin.masteryThreshold}`}</span>
                <button className="icon" type="button" title="Вправи" onClick={() => {
                  const ex = generateExercises(w);
                  const text = ex.map(e => `• ${e.type}: ${e.prompt || e.front || ''}`).join('\n');
                  setModal({text: 'Згенеровані вправи для «' + w.word + '»:\n' + text, onYes: () => {}});
                }}>✨</button>
                <button className="icon" type="button" onClick={() => speak(w.word)}><Volume2 size={16}/></button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}


function ProblemsPage({state, save, onStart}) {
  const [slow, setSlow] = useState(true);
  const [minErr, setMinErr] = useState(2);
  const stats = useMemo(() => {
    const map = {};
    (state.history || []).forEach(h => {
      if (!h.word) return;
      if (!map[h.word]) map[h.word] = {wrong: 0, correct: 0};
      if (h.correct) map[h.word].correct++; else map[h.word].wrong++;
    });
    return Object.entries(map)
      .map(([id, s]) => ({id, ...s, rate: s.wrong / Math.max(1, s.wrong + s.correct)}))
      .filter(x => x.wrong >= minErr && x.wrong > x.correct)
      .sort((a, b) => b.wrong - a.wrong || b.rate - a.rate);
  }, [state.history, minErr]);

  const weekAgo = Date.now() - 7 * 864e5;
  const fixedWeek = useMemo(() => {
    let n = 0;
    const by = {};
    (state.history || []).forEach(h => {
      if (!h.date || new Date(h.date).getTime() < weekAgo) return;
      if (!by[h.word]) by[h.word] = {w:0,c:0};
      if (h.correct) by[h.word].c++; else by[h.word].w++;
    });
    Object.values(by).forEach(v => { if (v.c > 0 && v.w > 0 && v.c >= v.w) n++; });
    return n;
  }, [state.history]);

  return (
    <section className="fade-in">
      <Title title="Проблемні слова" text="Фільтр помилок, спринт і прогрес за тиждень"/>
      <div className="card filters problems-toolbar">
        <div className="row-btns wrap">
          <button type="button" className={'theme' + (minErr===1?' active':'')} onClick={() => setMinErr(1)}>≥1</button>
          <button type="button" className={'theme' + (minErr===3?' active':'')} onClick={() => setMinErr(3)}>≥3 помилки</button>
          <button type="button" className="primary" onClick={() => onStart && onStart('problems', 'en-ua', 'all')}>Sprint лише по цих</button>
        </div>
        <label className="slow-toggle right">
          <input type="checkbox" checked={slow} onChange={e => setSlow(e.target.checked)}/>
          Повільне аудіо
        </label>
      </div>
      <div className="card" style={{marginBottom:12}}>
        <b>Виправлено за тиждень:</b> {fixedWeek} слів
        <div className="progress" style={{marginTop:8}}><i style={{width: Math.min(100, fixedWeek * 10) + '%'}}/></div>
      </div>
      <div className={'word-list' + (state.settings?.staggerList === false ? '' : ' stagger')}>
        {stats.length === 0 && <div className="card muted">Немає слів з ≥{minErr} помилками.</div>}
        {stats.map((s, idx) => {
          const w = words.find(x => String(x.id) === String(s.id));
          if (!w) return null;
          return (
            <div className="word-row card" key={s.id} style={{animationDelay: (idx * 0.04) + 's'}}>
              <div>
                <b>{w.word}</b> <span className="muted">{w.pronunciation}</span>
                <div>{w.translation}</div>
                <small className="muted">помилок: {s.wrong} · правильних: {s.correct}</small>
              </div>
              <div className="word-meta">
                <button className="icon" type="button" onClick={() => speak(w.word, slow ? 0.5 : 0.9)}><Volume2 size={16}/></button>
                <span className="pill">{Math.round(s.rate * 100)}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ReviewPage({state, due, onStart}) {
  return (
    <section>
      <Title title="SRS Повторення" text="Інтервали: 1 → 3 → 7 → 14 → 30 → 60 днів"/>
      <div className="card">
        <h2>На сьогодні: {due} слів</h2>
        <p className="muted">Слова зʼявляються знову саме тоді, коли майже забуваєш.</p>
        <button className="primary" onClick={onStart} disabled={due === 0 && Object.keys(state.srs).length === 0}>Почати повторення</button>
      </div>
    </section>
  );
}

function Stats({state, learned}) {
  const last7 = useMemo(() => {
    const days = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days[key] = 0;
    }
    (state.history || []).forEach(h => {
      const day = (h.date || '').slice(0, 10);
      if (day in days) days[day] += h.correct ? 1 : 0;
    });
    return Object.entries(days);
  }, [state.history]);
  const maxV = Math.max(1, ...last7.map(([, v]) => v));
  const total = (state.history || []).length;
  const correct = (state.history || []).filter(h => h.correct).length;
  const pct = total ? Math.round((correct / total) * 100) : 0;
  return (
    <section>
      <Title title="Статистика" text="Прогрес за останні дні"/>
      <Heatmap history={state.history||[]} />
      <div className="grid stats">
        <Card icon={<Target/>} title="Точність" value={pct + '%'} sub={`${correct}/${total}`}
          tone={state.midnightSnap && pct > state.midnightSnap.pct ? 'danger' : 'default'}/>
        <Card icon={<Brain/>} title="Вивчено" value={learned} sub="слів"
          tone={state.midnightSnap && learned > state.midnightSnap.learned ? 'warn' : 'default'}/>
        <Card icon={<Sparkles/>} title="XP" value={state.xp} sub={`сьогодні ${state.todayXp}`}
          tone={state.midnightSnap && state.xp > state.midnightSnap.xp ? 'orange' : 'default'}/>
        <Card icon={<Flame/>} title="Streak" value={state.streak} sub="днів" tone="fire"/>
      </div>
      <div className="card">
        <h2>Правильні відповіді · 7 днів</h2>
        <div className="chart">
          {last7.map(([day, v]) => (
            <div key={day} className="bar-wrap" title={`${day}: ${v}`}>
              <div className="bar" style={{height: `${(v / maxV) * 100}%`}}/>
              <span>{day.slice(8)}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BadgesPage({state}) {
  const earned = new Set(state.badges || []);
  return (
    <section className="fade-in">
      <Title title="Бейджі" text="Як досягнення в Steam — з анімацією отримання"/>
      <div className="badges-grid">
        {BADGES.map(b => {
          const on = earned.has(b.id);
          return (
            <div key={b.id} className={'badge-card card' + (on ? ' earned' : ' locked')}>
              <div className="badge-ico">{on ? '🏅' : '🔒'}</div>
              <h3>{b.title}</h3>
              <p className="muted">{b.desc}</p>
              {on && <span className="pill ok">Отримано</span>}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Leaderboard({state}) {
  const profiles = Object.values(listProfiles()).sort((a, b) => (b.xp || 0) - (a.xp || 0)).slice(0, 20);
  return (
    <section>
      <Title title="Рейтинг" text="Локальні профілі на цьому пристрої (+ хмара, якщо налаштована)"/>
      <div className="card">
        {profiles.length === 0 && <p className="muted">Поки немає інших профілів</p>}
        {profiles.map((p, i) => (
          <div className="leader-row" key={p.nick}>
            <span className="rank">#{i + 1}</span>
            <b>{p.nick}</b>
            <span className="muted">{p.name}</span>
            <strong>{p.xp || 0} XP</strong>
            {p.nick === state.nick && <span className="pill ok">ти</span>}
          </div>
        ))}
      </div>
    </section>
  );
}

function Profile({state, save}) {
  const [name, setName] = useState(state.name);
  const [goal, setGoal] = useState(Math.max(1, state.dailyGoal || 50));
  const [theme, setTheme] = useState(state.theme);
  const [skin, setSkin] = useState(state.skin || 'classic');
  const [accent, setAccent] = useState(state.customTheme.accent);
  const [bg, setBg] = useState(state.customTheme.bg);
  const [surface, setSurface] = useState(state.customTheme.surface);
  const [msg, setMsg] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authErr, setAuthErr] = useState('');

  const persist = () => {
    save({...state, name, dailyGoal: Math.max(10, Number(goal) || 50), theme, skin, customTheme: {accent, bg, surface}});
    setMsg('Збережено ✓'); setTimeout(() => setMsg(''), 1500);
  };

  const pullCloud = async () => {
    setSyncing(true);
    const remote = await cloudPull(state.nick);
    if (remote) { save({...state, ...remote, nick: state.nick}); setMsg('Підтягнуто з хмари ✓'); }
    else setMsg('Хмара порожня або не налаштована');
    setSyncing(false); setTimeout(() => setMsg(''), 2000);
  };

  return (
    <section>
      <Title title="Профіль" text={`Нік @${state.nick}`}/>
      <div className="grid two">
        <div className="card">
          <label>Імʼя</label>
          <input className="search" value={name} onChange={e => setName(e.target.value)}/>
          <label>Денна ціль XP</label>
          <input className="search" type="number" value={goal} onChange={e => setGoal(e.target.value)}/>
          <button className="primary" onClick={persist}>Зберегти</button>
          {msg && <span className="saved-message">{msg}</span>}
          <hr/>
          <button className="secondary" onClick={pullCloud} disabled={syncing}><Cloud size={16}/> {syncing ? '…' : 'Підтягнути з хмари'}</button>
          <p className="muted small">{cloudConfigured() ? 'Supabase підключено' : 'Додай VITE_SUPABASE_URL і VITE_SUPABASE_ANON_KEY у Vercel для крос-девайс'}</p>
        </div>
        <div className="card">
          <h2><Palette size={18}/> Тема</h2>
          <div className="theme-buttons">
            <button className={theme === 'system' ? 'theme active' : 'theme'} onClick={() => setTheme('system')}>Авто</button>
            <button className={theme === 'light' ? 'theme active' : 'theme'} onClick={() => setTheme('light')}><Sun/> Світла</button>
            <button className={theme === 'dark' ? 'theme active' : 'theme'} onClick={() => setTheme('dark')}><Moon/> Темна</button>
            <button className={theme === 'custom' ? 'theme active' : 'theme'} onClick={() => setTheme('custom')}><Palette/> Custom</button>
          </div>
          {theme === 'custom' && (
            <div className="color-grid">
              <label>Акцент <input type="color" value={accent} onChange={e => setAccent(e.target.value)}/></label>
              <label>Фон <input type="color" value={bg} onChange={e => setBg(e.target.value)}/></label>
              <label>Картки <input type="color" value={surface} onChange={e => setSurface(e.target.value)}/></label>
            </div>
          )}
          <h2 style={{marginTop: 20}}>Дизайн UI (3 варіанти)</h2>
          <div className="theme-buttons skins">
            <button className={skin === 'classic' ? 'theme active' : 'theme'} onClick={() => setSkin('classic')}>Classic Green</button>
            <button className={skin === 'neon' ? 'theme active' : 'theme'} onClick={() => setSkin('neon')}>Neon Cyber</button>
            <button className={skin === 'paper' ? 'theme active' : 'theme'} onClick={() => setSkin('paper')}>Paper Academic</button>
            <button className={skin === 'duo' ? 'theme active' : 'theme'} onClick={() => setSkin('duo')}>Duo Playful</button>
            <button className={skin === 'slate' ? 'theme active' : 'theme'} onClick={() => setSkin('slate')}>Slate Pro</button>
            <button className={skin === 'candy' ? 'theme active' : 'theme'} onClick={() => setSkin('candy')}>Candy Soft</button>
          </div>
          <button className="primary" style={{marginTop: 12}} onClick={persist}>Застосувати дизайн</button>
        </div>
      </div>
    </section>
  );
}

function Admin({state, save, setWordsLive, wordsLive}) {
  const [pin, setPin] = useState('');
  const [ok, setOk] = useState(() => sessionStorage.getItem('ef-admin-ok') === '1');
  useEffect(() => {
    const lock = () => setOk(false);
    window.addEventListener('ef-admin-lock', lock);
    return () => window.removeEventListener('ef-admin-lock', lock);
  }, []);
  const [a, setA] = useState({...state.admin});
  const [saved, setSaved] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authErr, setAuthErr] = useState('');
  const [syncProg, setSyncProg] = useState({cur:0, total:0, label:''});
  const unlock = () => { setOk(true); sessionStorage.setItem('ef-admin-ok', '1'); };
  useEffect(() => { setA({...state.admin}); }, [state.admin]);

  const forceSync = async () => {
    if (syncing) return;
    setSyncing(true);
    setSyncProg({cur: 0, total: 100, label: 'Зʼєднання зі словником…'});
    try {
      const res = await fetch((import.meta.env.BASE_URL || '/') + 'words-db.json?t=' + Date.now());
      if (!res.ok) throw new Error('Не вдалося завантажити words-db.json');
      const data = await res.json();
      const list = data.words || [];
      const total = list.length || 1;
      const mapped = [];
      for (let i = 0; i < list.length; i++) {
        const w = list[i];
        mapped.push({
          id: w.id || ('n' + (i+1)),
          word: w.word,
          translation: w.translation || '—',
          pronunciation: w.pronunciation || '',
          category: w.category || 'Other',
          explanation: w.explanation || '',
          example: (w.example || (w.examples || '').split('\n')[0] || '')
        });
        if (i % 8 === 0 || i === list.length - 1) {
          setSyncProg({cur: i + 1, total, label: 'Оновлення слів…'});
          await new Promise(r => setTimeout(r, 12));
        }
      }
      // Preserve progress: remap mastery/srs by word text when ids change
      const byText = {};
      (wordsLive || []).forEach(w => { byText[(w.word || '').toLowerCase()] = w.id; });
      const newByText = {};
      mapped.forEach(w => { newByText[(w.word || '').toLowerCase()] = w.id; });
      const mastery = {...state.mastery};
      const srs = {...state.srs};
      // keep as-is if ids stable (n1,n2...); progress keyed by id from history still works for same ids
      localStorage.setItem('ef-words-cache-v1', JSON.stringify({words: mapped, meta: data.meta || {}, at: new Date().toISOString()}));
      setWordsLive(mapped);
      setSyncProg({cur: total, total, label: 'Готово'});
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setSyncProg({cur: 0, total: 0, label: 'Помилка: ' + (e.message || 'sync failed')});
    }
    setSyncing(false);
  };

  const tryUnlock = async () => {
    setAuthBusy(true); setAuthErr('');
    try {
      const res = await fetch('/api/admin-auth', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ password: pin })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        sessionStorage.setItem('ef-admin-token', data.token || '1');
        unlock();
      } else if (res.status === 404 || res.status === 405) {
        // local fallback when API not deployed
        if (pin === (state.admin.adminPassword || '2468')) unlock();
        else setAuthErr('Невірний пароль');
      } else setAuthErr('Невірний пароль');
    } catch {
      if (pin === (state.admin.adminPassword || '2468')) unlock();
      else setAuthErr('Немає зʼєднання / невірний пароль');
    }
    setAuthBusy(false);
  };

  if (!ok) {
    return (
      <section className="admin-gate">
        <div className="card admin-gate-card">
          <div className="admin-gate-icon">🔐</div>
          <h1>Адмін-доступ</h1>
          
          <label>Пароль</label>
          <input className="search" type="password" autoFocus value={pin} onChange={e => setPin(e.target.value)} onKeyDown={e => e.key === 'Enter' && tryUnlock()}/>
          {authErr && <p className="auth-err">{authErr}</p>}
          <button className="primary full" type="button" disabled={authBusy || !pin} onClick={tryUnlock}>{authBusy ? 'Перевірка…' : 'Увійти в панель'}</button>
        </div>
      </section>
    );
  }
  const update = (k, v) => setA(x => ({...x, [k]: v}));
  const saveAdmin = () => {
    save({...state, admin: {...a, lessonSize: Math.max(3, Math.min(50, Number(a.lessonSize) || 10)), correctPoints: Number(a.correctPoints) || 4, wrongPoints: Number(a.wrongPoints) || -2, masteryThreshold: Math.max(1, Number(a.masteryThreshold) || 8)}});
    setSaved(true); setTimeout(() => setSaved(false), 1500);
  };
  return (
    <section>
      <Title title="Адмін-панель" text="Локальні правила та словник"/>
      <div className="card sync-card">
        <h2>Словник Notion</h2>
        <p className="muted">Оновлення з файлу words-db.json (генерується з Notion). Прогрес гравця не стирається.</p>
        <p className="sync-meta-line">Синхронізовано <b>{(wordsLive && wordsLive.length) || notionSyncMeta.count || 0}</b> слів · {notionSyncMeta.syncedAt || '—'}</p>
        <button className="primary" type="button" disabled={syncing} onClick={forceSync}>
          {syncing ? 'Оновлення…' : 'Оновити словник зараз'}
        </button>
        {syncing || syncProg.label ? (
          <div className="sync-progress">
            <div className="progress"><i style={{width: `${syncProg.total ? (syncProg.cur / syncProg.total) * 100 : 0}%`}}/></div>
            <span>{syncProg.label} {syncProg.total ? `${syncProg.cur} / ${syncProg.total}` : ''}</span>
          </div>
        ) : null}
        {saved && !syncing && <span className="saved-message">Словник оновлено ✓</span>}
        <p className="muted small">Автооновлення бази: щогодини 09:00–23:00 (Europe) через GitHub Action.</p>
      </div>
      
      <div className="card roadmap-panel">
        <h2>Roadmap / ідеї</h2>
        <p className="muted">По 5+ пунктів на версію. Видаляю лише ті, які ти назвеш.</p>
        <div className="roadmap-table">
          <div className="rm-head"><span>Ver</span><span>Функція</span><span>Статус</span></div>
          {ROADMAP_ITEMS.map((r,i) => (
            <div className={'rm-row ' + r.status} key={r.v + r.title + i}>
              <span className="pill">v{r.v}</span>
              <span>{r.title}</span>
              <span className={'rm-status ' + r.status}>{r.status === 'done' ? '✓ done' : 'planned'}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="card analytics-panel">
        <h2>Privacy Analytics (1–17)</h2>
        <p className="muted">Лише агрегати, без точної геолокації та без персональних даних у UI.</p>
        <AnalyticsPanel />
      </div>

      <div className="grid two">
        <div className="card">
          <h2>Урок</h2>
          <label>Питань <input type="number" value={a.lessonSize} onChange={e => update('lessonSize', e.target.value)}/></label>
          <label>Бали + <input type="number" value={a.correctPoints} onChange={e => update('correctPoints', e.target.value)}/></label>
          <label>Бали − <input type="number" value={a.wrongPoints} onChange={e => update('wrongPoints', e.target.value)}/></label>
          <label>Mastery <input type="number" value={a.masteryThreshold} onChange={e => update('masteryThreshold', e.target.value)}/></label>
          <label>Пароль адміна <input type="text" value={a.adminPassword} onChange={e => update('adminPassword', e.target.value)}/></label>
          <button className="primary" type="button" onClick={saveAdmin}>Зберегти правила</button>
        </div>
        <div className="card">
          <h2>Бейджі (тест)</h2>
          <p className="muted">Симуляція видачі як у Steam</p>
          <div className="row-btns wrap">
            {BADGES.map(b => (
              <button key={b.id} className="secondary" type="button" onClick={() => {
                if ((state.badges||[]).includes(b.id)) return;
                playTone(true);
                try {
                  const C = window.AudioContext || window.webkitAudioContext;
                  if (C && !window.__efQuiet) {
                    const c = new C(); const o = c.createOscillator(); const g = c.createGain();
                    o.type = 'sine'; o.frequency.setValueAtTime(520, c.currentTime);
                    o.frequency.exponentialRampToValueAtTime(880, c.currentTime + 0.35);
                    g.gain.setValueAtTime(0.001, c.currentTime);
                    g.gain.exponentialRampToValueAtTime(0.15, c.currentTime + 0.05);
                    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.5);
                    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.55);
                  }
                } catch {}
                const el = document.createElement('div');
                el.className = 'steam-toast steam-right';
                el.innerHTML = '<b>ТЕСТ · симуляція</b><span>Demo: ' + b.title + ' (не записано як обовʼязкове)</span>';
                document.body.appendChild(el);
                setTimeout(() => el.remove(), 3200);
                /* тест — без реального збереження ачівки */
              }}>{b.title}</button>
            ))}
          </div>
        </div>
        <div className="card">
          <h2>Дані гравця</h2>
          <AdminDanger save={save} state={state} />
        </div>
      </div>
    </section>
  );
}

function AdminDanger({save, state}) {
  const [q, setQ] = useState(null);
  if (q) return (
    <div className="ef-inline-confirm">
      <p>{q.t}</p>
      <button className="secondary" type="button" onClick={() => setQ(null)}>Скасувати</button>
      <button className="primary" type="button" onClick={() => { q.go(); setQ(null); }}>Підтвердити</button>
    </div>
  );
  return (
    <>
      <button className="secondary" type="button" onClick={() => setQ({t:'Очистити історію відповідей?', go:() => save({...state, history:[]})})}>Очистити історію</button>
      <button className="secondary" type="button" onClick={() => setQ({t:'Обнулити mastery та SRS?', go:() => save({...state, mastery:{}, srs:{}})})}>Обнулити mastery/SRS</button>
      <button className="secondary" type="button" onClick={() => setQ({t:'Обнулити XP?', go:() => save({...state, xp:0, todayXp:0})})}>Обнулити XP</button>
    </>
  );
}


function AboutPage() {
  const changelog = [
    {v:'1.5-beta', items:['Вхід нік+пароль','Адмін лок без dashboard','Sprint step fix','Match stay','Без ліан/зелених смуг','Зелений favicon','Проблемні: лише реально проблемні']},
    {v:'1.4-beta', items:['Fix Vercel build (lazy dup + string)','Mobile overlap fix','Admin roadmap table','Stagger setting','Skeleton component']},
    {v:'1.3-beta', items:['Admin lock 30s + visibility','Favicon EF','Heatmap','Problems ≥3 + sprint + week','Analytics 1-17 panel','Confetti ideal','Sound packs','Reduced motion']},
    {v:'1.2-beta', items:['Sprint 1/10 fix (hooks order)','Jungle announce','Mist OK/BAD','Stats colors vs midnight','Steam badge toast','Admin test badges','Arrow animations','Mobile polish']},
    {v:'1.1-beta', items:['Офлайн-кеш SW для words-db','SHA-256 ніки + AES імена','Унікальність ніка','Друзі + чат + рейтинг друзів','Гість (Ghost)','Тихий режим + Налаштування','Бонус 10% ідеальної гри','Клавіші 1–4','Анімації UI','Адмін пароль SHA-256']},
    {v:'1.0-beta', items:['Match/Sprint фікси','Серверний admin-auth','Boss verified']},
    {v:'0.9-beta', items:['Анонс великого оновлення на головній','Проблемні + довгі слова Sprint','Авто-тема system light/dark','Сторінка «Про додаток» + changelog','Примусове оновлення словника з прогресом','Без browser alert/confirm — свої модалки','Кнопки з чітким контрастом','Синк Notion ~333 слів у бандлі','Прогрес зберігається при оновленні бази (match by word)']},
    {v:'0.8-beta', items:['Проблемні слова','Повільне аудіо','Адмінка не викидає','Неон контраст + light/dark для скінів','Duo / Slate / Candy UI']},
    {v:'0.7-beta', items:['EN↔UA, SRS, диктант, Match','Бейджі, статистика, нік-профілі','3 дизайни Classic/Neon/Paper','Vercel base / + Analytics']},
    {v:'0.6-beta', items:['Стабільний Sprint','+4/−2 XP','Mastery 8','Vercel Analytics']},
  ];
  return (
    <section className="about-grid about-compact">
      <div className="card about-left">
        <Title title="Про додаток" text="Сюди пізніше додамо офіційний опис, політику та контакти."/>
        <p className="muted">English Flow — тренажер англійської з SRS, гейміфікацією та словником з Notion.</p>
        <p className="muted">Версія інтерфейсу: <b>v1.2-beta</b></p>
        <div className="card" style={{marginTop:12}}>
          <h3>Офлайн-кеш словника</h3>
          <p className="muted small">Словник зберігається в localStorage після синку. Наступний крок — Service Worker для повної офлайн-роботи (PWA, відкладено).</p>
        </div>
      </div>
      <div className="about-right">
        <Title title="Історія оновлень" text="Усі версії та що змінилось"/>
        {changelog.map(c => (
          <div className="card changelog-card" key={c.v}>
            <span className="pill">v{c.v}</span>
            <ul>{c.items.map((it,i) => <li key={i}>{it}</li>)}</ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function Toast({msg}) {
  if (!msg) return null;
  return <div className="ef-toast" role="status">{msg}</div>;
}

function ConfirmModal({modal, onClose}) {
  if (!modal) return null;
  return (
    <div className="ef-modal-backdrop" onClick={onClose}>
      <div className="ef-modal card" onClick={e => e.stopPropagation()}>
        <h2>Підтвердження</h2>
        <p>{modal.text}</p>
        <div className="row-btns">
          <button className="secondary" type="button" onClick={onClose}>Скасувати</button>
          <button className="primary" type="button" onClick={() => { modal.onYes?.(); onClose(); }}>Так, продовжити</button>
        </div>
      </div>
    </div>
  );
}

function OfflineBanner({online}) {
  if (online) return null;
  return <div className="ef-offline">Немає зʼєднання з мережею. Прогрес локальний; синк словника недоступний.</div>;
}


function SettingsPage({state, save}) {
  const upd = (patch) => save({...state, ...patch});
  return (
    <section className="fade-in">
      <Title title="Налаштування" text="Звук, порівняння, підказки"/>
      <div className="grid two">
        <div className="card">
          <h2>Звук</h2>
          <label className="row-check">
            <input type="checkbox" checked={!!state.quiet} onChange={e => upd({quiet: e.target.checked})}/>
            <VolumeX size={16}/> Тихий режим (TTS + SFX)
          </label>
          <label className="row-check">
            <input type="checkbox" checked={state.sfx !== false} onChange={e => upd({sfx: e.target.checked})}/>
            Звукові ефекти (окремо)
          </label>
          <label>Пакет звуків</label>
          <select className="search" value={state.soundPack || 'auto'} onChange={e => upd({soundPack: e.target.value})}>
            <option value="auto">Авто (як UI скін)</option>
            <option value="classic">Classic</option>
            <option value="neon">Neon digital blip</option>
            <option value="paper">Paper soft</option>
            <option value="candy">Candy soft</option>
          </select>
          <label className="row-check">
            <input type="checkbox" checked={state.settings?.keyboardHints !== false} onChange={e => upd({settings: {...(state.settings||{}), keyboardHints: e.target.checked}})}/>
            <Keyboard size={16}/> Підказки клавіш 1–4
          </label>
          <label className="row-check">
            <input type="checkbox" checked={state.settings?.staggerList !== false} onChange={e => upd({settings: {...(state.settings||{}), staggerList: e.target.checked}})}/>
            Stagger-анімація списків
          </label>
          <p className="muted small">Prefers-reduced-motion з системи автоматично зменшує анімації.</p>
        </div>
        <div className="card">
          <h2>Порівняння після гри</h2>
          <label>Режим</label>
          <select className="search" value={state.compareMode || 'global'} onChange={e => upd({compareMode: e.target.value})}>
            <option value="global">Зі середнім усіх гравців</option>
            <option value="friend">З конкретним другом</option>
            <option value="off">Вимкнено</option>
          </select>
          {(state.compareMode === 'friend') && (
            <>
              <label>Нік друга</label>
              <input className="search" value={state.compareFriend || ''} onChange={e => upd({compareFriend: e.target.value})} placeholder="nick_друга"/>
            </>
          )}
          <p className="muted small">Середнє по локальних профілях оновлюється раз на добу (00:00 логіка по даті).</p>
        </div>
      </div>
    </section>
  );
}

function FriendsPage({state}) {
  const [q, setQ] = useState('');
  const [msg, setMsg] = useState('');
  const [chatWith, setChatWith] = useState('');
  const [text, setText] = useState('');
  const [tick, setTick] = useState(0);
  const friends = getFriends(state.nick);
  const board = friends.length ? friendsLeaderboard(state.nick) : [];
  const messages = chatWith ? getChat(state.nick, chatWith) : [];

  const add = () => {
    const r = addFriend(state.nick, q);
    setMsg(r.ok ? 'Додано ✓' : (r.error || 'Помилка'));
    setTick(t => t + 1);
    if (r.ok) setQ('');
  };

  const send = () => {
    if (!chatWith) return;
    sendChat(state.nick, chatWith, text);
    setText('');
    setTick(t => t + 1);
  };

  return (
    <section className="fade-in" key={tick}>
      <Title title="Друзі" text="Пошук, чат і рейтинг між друзями"/>
      {state.guest && <div className="card muted">У гостьовому режимі друзі локальні лише на цьому пристрої.</div>}
      <div className="grid two">
        <div className="card">
          <h2>Додати друга</h2>
          <div className="row-btns">
            <input className="search" value={q} onChange={e => setQ(e.target.value)} placeholder="нік друга"/>
            <button className="primary" type="button" onClick={add}>Додати</button>
          </div>
          {msg && <p className="muted">{msg}</p>}
          <ul className="friend-list">
            {friends.map(f => (
              <li key={f}>
                <button type="button" className={'friend-item' + (chatWith===f?' active':'')} onClick={() => setChatWith(f)}>
                  <Users size={14}/> @{f}
                </button>
              </li>
            ))}
            {!friends.length && <li className="muted">Поки немає друзів</li>}
          </ul>
        </div>
        <div className="card">
          <h2><MessageCircle size={18}/> Чат {chatWith ? `з @${chatWith}` : ''}</h2>
          {!chatWith && <p className="muted">Обери друга зліва</p>}
          {chatWith && (
            <>
              <div className="chat-box">
                {messages.map(m => (
                  <div key={m.id} className={'chat-msg' + (m.from === state.nick ? ' me' : '')}>
                    <b>@{m.from}</b> <span className="muted small">{new Date(m.at).toLocaleTimeString()}</span>
                    <div>{m.text}</div>
                  </div>
                ))}
              </div>
              <div className="row-btns">
                <input className="search" value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key==='Enter' && send()} placeholder="повідомлення"/>
                <button className="primary" type="button" onClick={send}>Надіслати</button>
              </div>
            </>
          )}
        </div>
      </div>
      {friends.length > 0 && (
        <div className="card" style={{marginTop:16}}>
          <h2>Рейтинг друзів</h2>
          <div className="lb">
            {board.map((r,i) => (
              <div className="lb-row" key={r.nick}>
                <span>#{i+1}</span>
                <b>@{r.nick}</b>
                {String(r.nick).toLowerCase()==='boss' && ' 👑'}
                <span className="muted">{r.xp} XP</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}


function CompareBlurb({state}) {
  if (state.compareMode === 'off') return null;
  const avg = getDailyAverage();
  if (state.compareMode === 'friend' && state.compareFriend) {
    const p = loadProfile(state.compareFriend);
    const fxp = p?.xp || 0;
    const diff = state.xp - fxp;
    return <p className="muted">Порівняння з @{state.compareFriend}: ти {diff >= 0 ? 'вище' : 'нижче'} на {Math.abs(diff)} XP</p>;
  }
  const diff = state.xp - (avg.avgXp || 0);
  return <p className="muted">Середнє гравців сьогодні: {avg.avgXp} XP · ти {diff >= 0 ? '+' : ''}{diff} від середнього</p>;
}

function AnalyticsPanel() {
  const [snap, setSnap] = useState(null);
  useEffect(() => {
    const ua = navigator.userAgent || '';
    let device = 'desktop';
    if (/Mobi|Android/i.test(ua)) device = 'mobile';
    else if (/Tablet|iPad/i.test(ua)) device = 'tablet';
    let os = 'Other';
    if (/Windows/i.test(ua)) os = 'Windows';
    else if (/Mac OS/i.test(ua)) os = 'macOS';
    else if (/Android/i.test(ua)) os = 'Android';
    else if (/iPhone|iPad/i.test(ua)) os = 'iOS';
    else if (/Linux/i.test(ua)) os = 'Linux';
    let browser = 'Other';
    if (/Edg\//i.test(ua)) browser = 'Edge';
    else if (/Chrome/i.test(ua)) browser = 'Chrome';
    else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
    else if (/Firefox/i.test(ua)) browser = 'Firefox';
    const lang = navigator.language || '—';
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '—';
    const w = window.screen?.width || 0;
    let bucket = 'unknown';
    if (w < 600) bucket = 'S (<600)';
    else if (w < 1024) bucket = 'M (600–1024)';
    else if (w < 1440) bucket = 'L (1024–1440)';
    else bucket = 'XL (≥1440)';
    setSnap({
      1: 'країна — через Vercel Analytics (dashboard)',
      2: 'регіон — вимкнено (privacy)',
      3: device,
      4: os,
      5: browser,
      6: lang,
      7: tz,
      8: bucket,
      9: location.hash || location.pathname || '/',
      10: 'сесії — див. Vercel',
      11: 'час уроку — local history',
      12: 'completion — local',
      13: 'режими — local history.mode',
      14: 'категорії помилок — local',
      15: navigator.onLine ? 'online' : 'offline',
      16: document.documentElement.dataset.skin || 'classic',
      17: 'Vercel Web Analytics'
    });
  }, []);
  if (!snap) return <div className="skeleton" style={{height:120}}/>;
  const labels = {
    1:'Країна',2:'Регіон',3:'Пристрій',4:'ОС',5:'Браузер',6:'Мова',7:'Timezone',8:'Екран',
    9:'Розділ',10:'Сесії',11:'Час уроку',12:'Completion',13:'Режими',14:'Категорії',15:'Мережа',16:'Skin',17:'Vercel'
  };
  return (
    <div className="analytics-grid">
      {Object.keys(snap).map(k => (
        <div className="analytics-item" key={k}>
          <span className="an-num">{k}</span>
          <div>
            <b>{labels[k]}</b>
            <div className="muted small">{snap[k]}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Title({title, text}) { return <div className="title"><h1>{title}</h1><p className="muted">{text}</p></div>; }

function Skeleton({h=120}) {
  return <div className="skeleton" style={{height:h,width:'100%',margin:'8px 0'}} aria-hidden="true"/>;
}
function Heatmap({history}) {
  const days = [];
  const now = new Date();
  const map = {};
  (history||[]).forEach(h => {
    if (!h.date) return;
    const d = h.date.slice(0,10);
    map[d] = (map[d]||0) + 1;
  });
  for (let i = 34; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0,10);
    days.push({key, n: map[key]||0});
  }
  const max = Math.max(1, ...days.map(x => x.n));
  return (
    <div className="card fade-in">
      <h2>Heatmap · дні занять (5 тижнів)</h2>
      <div className="heatmap">
        {days.map(d => (
          <div key={d.key} className="hm-cell" title={d.key + ': ' + d.n}
            style={{opacity: d.n ? 0.25 + 0.75 * (d.n/max) : 0.12}}/>
        ))}
      </div>
      <p className="muted small">Чим яскравіше — тим більше відповідей того дня</p>
    </div>
  );
}

function Card({icon, title, value, sub, tone}) {
  return (
    <div className={'card stat tone-' + (tone || 'default')}>
      <div className="stat-top">{icon}<span>{title}</span></div>
      <strong>{value}</strong>
      <small>{sub}</small>
    </div>
  );
}
function Progress({value}) { return <div className="progress"><i style={{width: `${Math.max(0, Math.min(100, value))}%`}}/></div>; }
