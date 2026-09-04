import React, {useEffect, useMemo, useState, useCallback, useRef} from 'react';
import {BarChart3, BookOpen, Check, CheckCircle2, ChevronRight, Flame, Home, Lock, Menu, Moon, Palette, Play, RotateCcw, Settings, Sun, Target, Trophy, User, Volume2, X, XCircle, Shield, SlidersHorizontal, Brain, Sparkles, Keyboard, Layers, Award, Cloud} from 'lucide-react';
import {words as fallbackWords, rules, BADGES} from './data';
import {notionWords, notionSyncMeta} from './notionWords.generated';
import { Analytics } from '@vercel/analytics/react';
import {listProfiles, saveProfile, loadProfile, getActiveNick, cloudPull, cloudPush, cloudConfigured} from './lib/storage';
import {onCorrect as srsOk, onWrong as srsBad, isDue, todayStr} from './lib/srs';

const VERSION = '1.0-beta';
const words = (notionWords?.length ? notionWords : fallbackWords).map(w => ({
  id: w.id, word: w.word, translation: w.translation || '—', pronunciation: w.pronunciation || '',
  category: w.category || 'Other', level: w.level || '', explanation: w.explanation || '',
  example: w.example || (w.examples || '').split('\n')[0] || ''
}));
const CATS = [...new Set(words.map(w => w.category))].sort();
const defaultAdmin = {lessonSize: 10, correctPoints: 4, wrongPoints: -2, masteryThreshold: 8, shuffleAnswers: true, showPronunciation: true, adminPassword: '2468'};
const emptyState = () => ({
  nick: '', name: '', xp: 0, streak: 1, dailyGoal: 50, todayXp: 0, today: todayStr(),
  mastery: {}, srs: {}, attempts: {}, history: [], badges: [], avatar: '🇺🇸',
  theme: 'system', skin: 'classic', customTheme: {accent: '#22a06b', bg: '#f6f8f6', surface: '#ffffff'},
  admin: {...defaultAdmin}
});

function playTone(ok) {
  try {
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    const c = new C(), o = c.createOscillator(), g = c.createGain();
    o.type = ok ? 'sine' : 'square';
    o.frequency.setValueAtTime(ok ? 660 : 140, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(ok ? 980 : 90, c.currentTime + 0.22);
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.exponentialRampToValueAtTime(ok ? 0.12 : 0.09, c.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.28);
    o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.3);
    setTimeout(() => c.close(), 400);
  } catch {}
}
function speak(t, rate = 0.9) {
  if (!('speechSynthesis' in window)) return;
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
    if (page !== 'admin') sessionStorage.removeItem('ef-admin-ok');
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
          <div><b>{state.name || state.nick}</b>{String(state.nick).toLowerCase()==='boss' && <span className="boss-badge" title="Verified">👑</span>}<span className="muted"> · @{state.nick}</span>{String(state.nick).toLowerCase()==='boss' && <span className="pill ok">verified</span>}</div>
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
        {page === 'problems' && <ProblemsPage state={state} save={save} />}
        {page === 'leaderboard' && <Leaderboard state={state} />}
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
  const [nick, setNick] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <div className="onboarding">
      <div className="welcome card">
        <div className="logo">EF</div>
        <span className="eyebrow">ENGLISH LEARNING PLATFORM</span>
        <h1>English Flow</h1>
        <p className="muted">Унікальний нік зберігає прогрес. Введи той самий нік на іншому пристрої — дані підтягнуться (якщо налаштована хмара або це той самий браузер).</p>
        <label>Нік (унікальний)</label>
        <input className="search" placeholder="mykola_flow" value={nick} onChange={e => setNick(e.target.value.trim().toLowerCase().replace(/[^a-z0-9_]/g, ''))} />
        <label>Імʼя</label>
        <input className="search" placeholder="Микола" value={name} onChange={e => setName(e.target.value)} />
        <button className="primary full" disabled={!nick || busy} onClick={async () => { setBusy(true); await onDone(nick, name); setBusy(false); }}>
          {busy ? 'Завантаження…' : 'Почати'} <ChevronRight size={17}/>
        </button>
        <p className="muted small">{cloudConfigured() ? '☁️ Хмара Supabase активна' : '💾 Локальні профілі (додай Supabase для крос-девайс)'}</p>
      </div>
    </div>
  );
}

function Dashboard({state, learned, due, words, onLearn, onReview, cloudMsg, notionMeta}) {
  return (
    <section>
      <div className="announce card">
        <span className="eyebrow"> annouce · v0.9-beta</span>
        <h2>🚀 Велике оновлення вже тут</h2>
        <p>Проблемні слова, Sprint лише по складних, адаптація після помилок, генерація вправ, синк словника, changelog і нові дизайни. Прогрес зберігається при оновленні бази.</p>
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

  if (mode === 'match') return <MatchGame items={items} state={state} save={save} onExit={onExit} onDone={onDone} />;
  if (mode === 'dictation') return <DictationGame items={items} state={state} save={save} onExit={onExit} onDone={onDone} />;
  return <SprintGame items={items} mode={mode} state={state} save={save} onExit={onExit} onDone={onDone} />;
}

function SprintGame({items, mode, state, save, onExit, onDone}) {
  const itemsRef = useRef(items);
  const list = itemsRef.current || items || [];
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState(null);
  const [done, setDone] = useState(false);
  const [scorePop, setScorePop] = useState(null);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionWrong, setSessionWrong] = useState(0);
  const [slowAudio, setSlowAudio] = useState(false);
  const [leaveAsk, setLeaveAsk] = useState(false);

  const w = list[index];

  const applyAnswer = (ok) => {
    const points = ok ? state.admin.correctPoints : state.admin.wrongPoints;
    const mid = w.id;
    const mastery = {...state.mastery, [mid]: Math.max(0, (state.mastery[mid] || 0) + (ok ? 1 : 0))};
    const srs = {...state.srs, [mid]: ok ? srsOk(state.srs[mid]) : srsBad(state.srs[mid])};
    const history = [...state.history, {word: mid, correct: ok, points, date: new Date().toISOString(), mode: mode || 'sprint'}].slice(-2000);
    const next = {
      ...state, mastery, srs, history,
      xp: state.xp + points,
      todayXp: state.todayXp + points,
      attempts: {...state.attempts, [mid]: (state.attempts[mid] || 0) + 1}
    };
    if (ok) setSessionCorrect(c => c + 1); else { setSessionWrong(c => c + 1); setSlowAudio(true); }
    setScorePop({pts: points, ok, key: Date.now()});
    playTone(ok);
    save(next);
    setTimeout(() => setScorePop(null), 900);
  };

  const answer = (opt) => {
    if (picked !== null || !w) return;
    const ok = opt === w.answer;
    setPicked(opt);
    applyAnswer(ok);
  };

  const goNext = () => {
    setPicked(null);
    setScorePop(null);
    setIndex(i => {
      if (i >= list.length - 1) { setDone(true); return i; }
      return i + 1;
    });
  };

  const tryExit = () => {
    if (index > 0 && !done) setLeaveAsk(true);
    else onExit();
  };

  if (done || !list.length) {
    return (
      <section>
        <div className="complete card">
          <CheckCircle2 size={64}/>
          <span className="eyebrow">LESSON COMPLETE</span>
          <h1>Урок завершено 🎉</h1>
          <p>Правильно: {sessionCorrect} · Помилки: {sessionWrong} · Питань: {list.length}</p>
          <button className="primary" type="button" onClick={onDone}>На головну</button>
        </div>
      </section>
    );
  }

  if (!w) return null;
  const correct = picked === w.answer;
  const masteryNow = state.mastery[w.id] || 0;

  return (
    <section>
      {leaveAsk && (
        <div className="ef-modal-backdrop">
          <div className="ef-modal card">
            <h2>Вийти з уроку?</h2>
            <p>Прогрес відповідей уже збережено, але урок ще не завершено.</p>
            <div className="row-btns">
              <button className="secondary" type="button" onClick={() => setLeaveAsk(false)}>Залишитись</button>
              <button className="primary" type="button" onClick={onExit}>Вийти</button>
            </div>
          </div>
        </div>
      )}
      <button className="back" type="button" onClick={tryExit}>← Назад</button>
      <div className="lesson-progress-row">
        <Progress value={(list.length ? index / list.length : 0) * 100}/>
        <span>{index + 1}/{list.length}</span>
      </div>
      <div className={'lesson question card' + (picked !== null ? (correct ? ' flash-correct' : ' flash-wrong') : '')}>
        <div className="lesson-top">
          <span className="pill">{mode === 'srs' ? 'SRS' : 'SPRINT'} · {w.direction === 'en-ua' ? 'EN→UA' : 'UA→EN'}</span>
          <span className={'points' + (picked !== null ? (correct ? ' positive' : ' negative') : '')}>
            {picked !== null ? (correct ? `+${state.admin.correctPoints}` : `${state.admin.wrongPoints}`) : 'XP'}
          </span>
          {scorePop && <span key={scorePop.key} className={'score-float ' + (scorePop.ok ? 'up' : 'down')}>{scorePop.pts > 0 ? '+' : ''}{scorePop.pts}</span>}
        </div>
        <h1>{w.direction === 'en-ua' ? <>Що означає <em>{w.prompt}</em>?</> : <>Як англійською: <em>{w.prompt}</em>?</>}</h1>
        {state.admin.showPronunciation && w.direction === 'en-ua' && <p className="muted">{w.pronunciation} · {w.category}</p>}
        <div className="speak-row">
        <button className="speak" type="button" onClick={() => speak(w.word, slowAudio ? 0.55 : 0.9)}><Volume2/> Прослухати</button>
        <label className="slow-toggle"><input type="checkbox" checked={slowAudio} onChange={e => setSlowAudio(e.target.checked)}/> повільніше</label>
      </div>
        <div className="options">
          {w.options.map((o, j) => {
            let cls = 'option';
            if (picked !== null) {
              if (o === w.answer) cls += ' correct';
              else if (o === picked) cls += ' wrong';
              else cls += ' dimmed';
            }
            return (
              <button key={`${w.id}-${index}-${j}`} type="button" disabled={picked !== null} className={cls} onClick={() => answer(o)}>{o}</button>
            );
          })}
        </div>
        {picked !== null && (
          <div className={'feedback ' + (correct ? 'feedback-correct' : 'feedback-wrong')}>
            <div className="feedback-icon">{correct ? <CheckCircle2/> : <XCircle/>}</div>
            <div className="feedback-copy">
              <strong>{correct ? 'Правильно!' : 'Неправильно'}</strong>
              <span>{correct ? `+${state.admin.correctPoints} XP` : `${state.admin.wrongPoints} XP · Відповідь: ${w.answer}`}</span>
              {w.example && <small>{w.example}</small>}
              <small>Mastery: {masteryNow}/{state.admin.masteryThreshold}{masteryNow >= state.admin.masteryThreshold ? ' · Вивчено ✓' : ''}</small>
            </div>
            <button className="primary" type="button" onClick={goNext}>{index >= list.length - 1 ? 'Завершити' : 'Далі'} <ChevronRight size={16}/></button>
          </div>
        )}
      </div>
    </section>
  );
}

function DictationGame({items, state, save, onExit, onDone}) {
  const [index, setIndex] = useState(0);
  const [val, setVal] = useState('');
  const [picked, setPicked] = useState(null);
  const [done, setDone] = useState(false);
  const w = items[index];
  const check = () => {
    if (picked !== null || !w) return;
    const ok = val.trim().toLowerCase() === String(w.answer).trim().toLowerCase();
    setPicked(ok ? 'ok' : 'bad');
    const points = ok ? state.admin.correctPoints : state.admin.wrongPoints;
    const mid = w.id;
    const mastery = {...state.mastery, [mid]: Math.max(0, (state.mastery[mid] || 0) + (ok ? 1 : 0))};
    const srs = {...state.srs, [mid]: ok ? srsOk(state.srs[mid]) : srsBad(state.srs[mid])};
    playTone(ok);
    save({...state, mastery, srs, xp: state.xp + points, todayXp: state.todayXp + points,
      history: [...state.history, {word: mid, correct: ok, points, date: new Date().toISOString(), mode: 'dictation'}].slice(-2000)});
  };
  const goNext = () => {
    if (index >= items.length - 1) { setDone(true); return; }
    setIndex(i => i + 1); setVal(''); setPicked(null);
  };
  if (done) return <section><div className="complete card"><h1>Диктант завершено</h1><button className="primary" onClick={onDone}>На головну</button></div></section>;
  if (!w) return null;
  return (
    <section>
      <button className="back" onClick={onExit}>← Назад</button>
      <Progress value={(index / items.length) * 100}/>
      <div className={'lesson question card' + (picked === 'ok' ? ' flash-correct' : picked === 'bad' ? ' flash-wrong' : '')}>
        <span className="pill">DICTATION {index + 1}/{items.length}</span>
        <h1>{w.direction === 'en-ua' ? <>Переклад слова <em>{w.prompt}</em></> : <>Англійською: <em>{w.prompt}</em></>}</h1>
        <input className="search" autoFocus value={val} disabled={picked !== null} onChange={e => setVal(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && check()} placeholder="Введи відповідь…"/>
        {picked === null ? <button className="primary" onClick={check}>Перевірити</button> : (
          <div className={'feedback ' + (picked === 'ok' ? 'feedback-correct' : 'feedback-wrong')}>
            <strong>{picked === 'ok' ? 'Правильно!' : `Відповідь: ${w.answer}`}</strong>
            <button className="primary" onClick={goNext}>Далі</button>
          </div>
        )}
      </div>
    </section>
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
          <button key={x.id} disabled={matched[x.id]} className={'option' + (matched[x.id] ? ' correct' : '') + (selL === x.id ? ' selected' : '') + (flash[x.id] ? ' ' + flash[x.id] : '')} onClick={() => setSelL(x.id)}>{x.text}</button>
        ))}</div>
        <div className="match-col">{right.map(x => (
          <button key={x.id} disabled={matched[x.id]} className={'option' + (matched[x.id] ? ' correct' : '') + (selR === x.id ? ' selected' : '') + (flash[x.id] ? ' ' + flash[x.id] : '')} onClick={() => setSelR(x.id)}>{x.text}</button>
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


function ProblemsPage({state, save}) {
  const stats = useMemo(() => {
    const map = {};
    (state.history || []).forEach(h => {
      if (!h.word) return;
      if (!map[h.word]) map[h.word] = {wrong: 0, correct: 0};
      if (h.correct) map[h.word].correct++; else map[h.word].wrong++;
    });
    return Object.entries(map)
      .map(([id, s]) => ({id, ...s, rate: s.wrong / Math.max(1, s.wrong + s.correct)}))
      .filter(x => x.wrong > 0)
      .sort((a, b) => b.wrong - a.wrong || b.rate - a.rate);
  }, [state.history]);
  const [slow, setSlow] = useState(true);
  return (
    <section>
      <Title title="Проблемні слова" text="Слова з найбільшою кількістю помилок. Увімкни повільне прослуховування."/>
      <div className="card filters row">
        <label style={{display:'flex',alignItems:'center',gap:8}}>
          <input type="checkbox" checked={slow} onChange={e => setSlow(e.target.checked)}/>
          Повільне аудіо (на слух)
        </label>
      </div>
      <div className="word-list">
        {stats.length === 0 && <div className="card muted">Помилок ще немає — так тримати.</div>}
        {stats.map(s => {
          const w = words.find(x => String(x.id) === String(s.id));
          if (!w) return null;
          return (
            <div className="word-row card" key={s.id}>
              <div>
                <b>{w.word}</b> <span className="muted">{w.pronunciation}</span>
                <div>{w.translation}</div>
                <small className="muted">помилок: {s.wrong} · правильних: {s.correct}</small>
              </div>
              <div className="word-meta">
                <button className="icon" onClick={() => speak(w.word, slow ? 0.55 : 0.9)}><Volume2 size={16}/></button>
                <span className="pill">{Math.round(s.rate * 100)}% err</span>
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
      <div className="grid stats">
        <Card icon={<Target/>} title="Точність" value={pct + '%'} sub={`${correct}/${total}`}/>
        <Card icon={<Brain/>} title="Вивчено" value={learned} sub="слів"/>
        <Card icon={<Sparkles/>} title="XP" value={state.xp} sub={`сьогодні ${state.todayXp}`}/>
        <Card icon={<Flame/>} title="Streak" value={state.streak} sub="днів"/>
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
    <section>
      <Title title="Бейджі" text="Досягнення за прогрес"/>
      <div className="grid two">
        {BADGES.map(b => (
          <div key={b.id} className={'card badge-card' + (earned.has(b.id) ? ' earned' : ' locked')}>
            <div className="badge-icon">{b.icon}</div>
            <div><b>{b.title}</b><p className="muted">{b.desc}</p>{earned.has(b.id) ? <span className="pill ok">Отримано</span> : <span className="pill">Закрито</span>}</div>
          </div>
        ))}
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
  const [goal, setGoal] = useState(state.dailyGoal);
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
          <p className="muted">Серверна перевірка пароля. Сесія скидається при виході з розділу.</p>
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
    {v:'0.9-beta', items:['Анонс великого оновлення на головній','Проблемні + довгі слова Sprint','Авто-тема system light/dark','Сторінка «Про додаток» + changelog','Примусове оновлення словника з прогресом','Без browser alert/confirm — свої модалки','Кнопки з чітким контрастом','Синк Notion ~333 слів у бандлі','Прогрес зберігається при оновленні бази (match by word)']},
    {v:'0.8-beta', items:['Проблемні слова','Повільне аудіо','Адмінка не викидає','Неон контраст + light/dark для скінів','Duo / Slate / Candy UI']},
    {v:'0.7-beta', items:['EN↔UA, SRS, диктант, Match','Бейджі, статистика, нік-профілі','3 дизайни Classic/Neon/Paper','Vercel base / + Analytics']},
    {v:'0.6-beta', items:['Стабільний Sprint','+4/−2 XP','Mastery 8','Vercel Analytics']},
  ];
  return (
    <section className="about-grid">
      <div className="card about-left">
        <Title title="Про додаток" text="Сюди пізніше додамо офіційний опис, політику та контакти."/>
        <p className="muted">English Flow — тренажер англійської з SRS, гейміфікацією та словником з Notion.</p>
        <p className="muted">Версія інтерфейсу: <b>v0.9-beta</b></p>
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

function Title({title, text}) { return <div className="title"><h1>{title}</h1><p className="muted">{text}</p></div>; }
function Card({icon, title, value, sub}) { return <div className="card stat"><div className="stat-top">{icon}<span>{title}</span></div><strong>{value}</strong><small>{sub}</small></div>; }
function Progress({value}) { return <div className="progress"><i style={{width: `${Math.max(0, Math.min(100, value))}%`}}/></div>; }
