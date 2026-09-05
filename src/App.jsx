import React, {useEffect, useMemo, useState, useCallback, useRef, lazy, Suspense} from 'react';
import {BarChart3, BookOpen, Check, CheckCircle2, ChevronRight, ChevronDown, Flame, Home, Lock, Menu, Moon, Palette, Play, RotateCcw, Settings, Sun, Target, Trophy, User, Volume2, X, XCircle, Shield, SlidersHorizontal, Brain, Sparkles, Keyboard, Layers, Award, Cloud, Users, MessageCircle, Ghost, VolumeX, Swords, ShieldAlert, Eye, Bell, Wifi} from 'lucide-react';
import {words as fallbackWords, rules, BADGES} from './data';
import {notionWords, notionSyncMeta} from './notionWords.generated';
import { Analytics } from '@vercel/analytics/react';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import {listProfiles, saveProfile, loadProfile, getActiveNick, cloudPull, cloudPush, cloudConfigured, isNickTaken, registerNick, setGuestSession, isGuestSession, getFriends, addFriend, acceptFriend, getChat, sendChat, registerChatDevice, getChatDevice, getChatDevices, getMyChatDevices, revokeChatDevice, friendsLeaderboard, getDailyAverage, ensureDailyAverage, serverAuth, loadCloudVocabulary, cloudRecordProgress, cloudStartLesson, cloudFinishLesson, serverMe, loadServerConfig} from './lib/storage';
import {onCorrect as srsOk, onWrong as srsBad, isDue, todayStr} from './lib/srs';
import {dbPutProfile, dbGetProfile, dbListProfiles, dbSaveWords, dbLoadWords} from './lib/db.js';
import {createRealtime} from './lib/realtime.js';
import {ensureChatIdentity,publicKeyPayload,encryptChatPayload,decryptChatText,encryptAttachment,decryptAttachment,fingerprint,rotateChatIdentity,trustKey,trustedKey,untrustKey} from './lib/e2e-chat.js';
import {track} from './lib/analytics.js';


/** Roadmap in admin — remove only when user asks by title */
const ROADMAP_ITEMS = [
  {v:'2.3.0', title:'Learning Engine: no endless loading + server answer verification', status:'done'},
  {v:'2.3.0', title:'Lesson session freeze: exact word set stored in DB', status:'done'},
  {v:'2.3.0', title:'Safe Notion sync + admin-only sync metadata', status:'done'},
  {v:'2.3.0', title:'Admin security hardening + session expiry recovery', status:'done'},
  {v:'2.3.0', title:'Realtime status + ping + chat privacy parity', status:'done'},
  {v:'2.3.0', title:'Custom dropdowns/modals + 3 admin test designs', status:'done'},
  {v:'2.3.0', title:'RPG profile + animated emoji feedback on Home/Stats', status:'done'},
  {v:'2.4.0', title:'E2E chat with device-only P-256 keys + encrypted Neon messages', status:'done'},
  {v:'2.5.0', title:'Admin 2.0: bootstrap, roles, 2FA/TOTP, session hardening and Security Lab', status:'done'},
  {v:'2.5.0', title:'Chat Security 2.0: fingerprints, key rotation, multi-device, revoke and encrypted attachments', status:'done'},
  {v:'2.5.0', title:'Playwright E2E + security regression suite: auth, IDOR, XSS, CSRF, fuzz and rate limits', status:'done'},
  {v:'2.4.0', title:'Admin/Stats lazy loading + security/session recovery', status:'done'},
  {v:'2.2.2', title:'Vercel Hobby: 1 Serverless Function gateway', status:'done'},
  {v:'2.2.0', title:'Product & Learning Analytics 1–17', status:'done'},

  {v:'future', title:'WebAuthn/passkeys + verified device signatures', status:'planned'},
];

const VERSION = '2.5.0';
const words = (notionWords?.length ? notionWords : fallbackWords).map(w => ({
  id: w.id, word: w.word, translation: w.translation || '—', pronunciation: w.pronunciation || '',
  category: w.category || 'Other', level: w.level || '', explanation: w.explanation || '',
  example: w.example || (w.examples || '').split('\n')[0] || ''
}));
const CATS = [...new Set(words.map(w => w.category))].sort();
const defaultAdmin = {lessonSize: 10, correctPoints: 4, wrongPoints: -2, masteryThreshold: 8, shuffleQuestions: true, shuffleAnswers: true, showPronunciation: true, perfectBonus: 0, badgeStyle: 'neo'};
const emptyState = () => ({
  nick: '', name: '', passHash: '', xp: 0, streak: 1, dailyGoal: 50, todayXp: 0, today: todayStr(),
  mastery: {}, srs: {}, attempts: {}, history: [], badges: [], avatar: '🇺🇸',
  theme: 'system', skin: 'classic', customTheme: {accent: '#22a06b', bg: '#f6f8f6', surface: '#ffffff'},
  admin: {...defaultAdmin},
  quiet: false, sfx: true, soundPack: 'auto', guest: false, gamesPlayed: 0,
  compareMode: 'global', compareFriend: '', midnightSnap: null, badgeStyle: 'neo',
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
function newEventId(){try{return crypto.randomUUID()}catch{return `${Date.now()}-${Math.random().toString(36).slice(2)}`}}
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

async function requestJson(path, options={}) {
  const res = await fetch(path, {credentials:'include', ...options, headers:{'Content-Type':'application/json', ...(options.headers||{})}});
  const data = await res.json().catch(()=>({}));
  if (!res.ok) {
    const e=new Error(data.error || `HTTP ${res.status}`); e.status=res.status; e.data=data;
    if (res.status===401 && !String(path).startsWith('/api/auth') && !String(path).startsWith('/api/admin-auth')) {
      window.dispatchEvent(new CustomEvent('ef-auth-expired',{detail:{path,message:e.message}}));
    }
    throw e;
  }
  return data;
}
function emitSiteError(message, title='Помилка') {
  window.dispatchEvent(new CustomEvent('ef-error', {detail:{message:String(message||'Невідома помилка'), title}}));
}
function emitSiteToast(message, kind='info') {
  window.dispatchEvent(new CustomEvent('ef-toast', {detail:{message:String(message||''),kind}}));
}

function UiSelect({value,onChange,options=[],className='',disabled=false}) {
  const [open,setOpen]=useState(false);
  const ref=useRef(null);
  const selected=options.find(o=>String(o.value)===String(value)) || options[0] || {label:''};
  useEffect(()=>{
    const close=e=>{if(!ref.current?.contains(e.target))setOpen(false)};
    document.addEventListener('mousedown',close);
    return()=>document.removeEventListener('mousedown',close);
  },[]);
  return <div ref={ref} className={'ui-select '+className}>
    <button type="button" disabled={disabled} className="ui-select-trigger" aria-haspopup="listbox" aria-expanded={open} onClick={()=>setOpen(x=>!x)}><span>{selected?.label}</span><ChevronDown size={15}/></button>
    {open&&<div className="ui-select-menu" role="listbox">{options.map(o=><button type="button" role="option" aria-selected={String(o.value)===String(value)} key={String(o.value)} className={'ui-select-option'+(String(o.value)===String(value)?' selected':'')} onClick={()=>{onChange(o.value);setOpen(false)}}>{o.label}</button>)}</div>}
  </div>;
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
    const wrongs = [];
    for (const x of shuffle(others)) {
      const value = direction === 'en-ua' ? x.translation : x.word;
      if (!value || value === answer || wrongs.includes(value)) continue;
      wrongs.push(value);
      if (wrongs.length === 3) break;
    }
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
  useEffect(() => {
    const onExpired = e => {
      if (state.guest) return;
      setPage('onboarding');
      setLessonCfg(null);
      setModal({type:'error',title:'Сесію завершено',text:'Сервер більше не приймає цю сесію. Увійди ще раз — локальний профіль залишиться на пристрої.'});
    };
    window.addEventListener('ef-auth-expired', onExpired);
    return () => window.removeEventListener('ef-auth-expired', onExpired);
  }, [state.guest]);
  useEffect(() => {
    if (!navigator.onLine) return;
    loadServerConfig().then(cfg => { if (Object.keys(cfg).length) setState(prev => ({...prev,admin:{...prev.admin,...cfg}})); }).catch(() => {});
    serverMe().then(async me => {
      if (!me?.user) return;
      await flushProgressQueue().catch(()=>{});
      const remote = await cloudPull(me.user.nick);
      if (remote) { setState(prev => ({...prev,...remote,id:me.user.id,nick:me.user.nick,role:me.user.role,guest:false,admin:{...defaultAdmin,...(prev.admin||{}),...(remote.admin||{})}})); setPage('dashboard'); }
    }).catch(() => {});
  }, []);
  useEffect(() => { track('app_open',{page:location.pathname}); }, []);
  useEffect(() => { if (state.nick) track('page_view',{page}); }, [page, state.nick]);
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2800); };

  const profileSyncTimer = useRef(null);
  const save = useCallback((s) => {
    const next = {...s, badges: s.guest ? computeBadges(s) : (s.badges || [])};
    setState(next);
    if (next.nick) {
      saveProfile(next.nick, next);
      try { dbPutProfile(next); } catch {}
      if (cloudConfigured() && !next.guest) {
        if (profileSyncTimer.current) clearTimeout(profileSyncTimer.current);
        profileSyncTimer.current = setTimeout(() => cloudPush(next.nick, next).catch(() => {}), 900);
      }
    }
  }, []);

  const nav = (p) => {
    setPage(p); setMobile(false);
  };
  useEffect(() => {
    if (page !== 'admin') fetch('/api/admin-auth',{method:'DELETE',credentials:'include'}).catch(()=>{});
  }, [page]);

  // Admin inactivity lock: cookie is authoritative; never use sessionStorage.
  useEffect(() => {
    if (page !== 'admin') return;
    let timer = null, hiddenAt = 0;
    const lock = () => {
      fetch('/api/admin-auth',{method:'DELETE',credentials:'include'}).catch(()=>{});
      window.dispatchEvent(new Event('ef-admin-lock'));
    };
    const bump = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(lock, 5 * 60 * 1000);
    };
    const onVis = () => {
      if (document.hidden) hiddenAt = Date.now();
      else { if (hiddenAt && Date.now()-hiddenAt > 2*60*1000) lock(); hiddenAt=0; bump(); }
    };
    bump();
    window.addEventListener('mousemove', bump); window.addEventListener('keydown', bump); window.addEventListener('touchstart', bump); window.addEventListener('scroll', bump, true);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener('mousemove', bump); window.removeEventListener('keydown', bump); window.removeEventListener('touchstart', bump); window.removeEventListener('scroll', bump, true);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [page]);

  useEffect(()=>{
    const onToast=e=>{const m=e.detail?.message;if(m){setToast(m);setTimeout(()=>setToast(null),2800)}};
    const onError=e=>setModal({type:'error',title:e.detail?.title||'Помилка',text:e.detail?.message||'Невідома помилка'});
    window.addEventListener('ef-toast',onToast); window.addEventListener('ef-error',onError);
    return()=>{window.removeEventListener('ef-toast',onToast);window.removeEventListener('ef-error',onError)};
  },[]);

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
    (async () => {
      try {
        const {words: idbWords} = await dbLoadWords();
        if (idbWords?.length && (!wordsLive || wordsLive.length < idbWords.length)) {
          setWordsLive(idbWords);
        }
      } catch {}
    })();
  }, []);
  useEffect(() => {
    (async () => {
      try {
        const remoteWords = await loadCloudVocabulary();
        if (remoteWords?.length) {
          const mapped = remoteWords.map(w => ({id:w.id,word:w.word,translation:w.translation||'—',pronunciation:w.pronunciation||'',category:w.category||'Other',level:w.level||'',explanation:w.explanation||'',example:w.example||''}));
          setWordsLive(mapped);
          try { localStorage.setItem('ef-words-cache-v1', JSON.stringify({words:mapped,meta:{count:mapped.length,source:'neon'},at:new Date().toISOString()})); } catch {}
        }
      } catch {}
    })();
  }, []);


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

  const activeWords = wordsLive?.length ? wordsLive : words;
  const activeCats = [...new Set(activeWords.map(w => w.category))].sort();
  const learnedCount = activeWords.filter(w => (state.mastery[w.id] || 0) >= state.admin.masteryThreshold).length;
  const dueCount = activeWords.filter(w => isDue(state.srs[w.id], todayStr()) && (state.mastery[w.id] || 0) > 0).length;

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
        ['challenges', Swords, 'Challenges'],
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
          <div><b>{state.name || state.nick}</b>{(String(state.nick||'').toLowerCase()==='boss' || String(state.name||'').toLowerCase()==='boss') && <span className="boss-badge" title="Verified">👑</span>}<span className="muted"> · @{state.nick}</span>{(String(state.nick||'').toLowerCase()==='boss' || String(state.name||'').toLowerCase()==='boss') && <span className="pill ok">verified</span>}
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
    return <><Onboarding onDone={async (payload, maybeName) => {
      // Accept profile object OR (nick, name) for compatibility
      let nick, name, profile;
      if (payload && typeof payload === 'object' && payload.nick) {
        profile = payload;
        nick = String(profile.nick);
        name = profile.name || nick;
      } else {
        nick = String(payload || '').trim();
        name = maybeName || nick;
        profile = null;
      }
      if (!nick) return;
      let base = emptyState();
      const local = loadProfile(nick);
      if (local) base = {...base, ...local};
      if (profile) base = {...base, ...profile};
      try {
        const remote = await cloudPull(nick);
        if (remote && (!local || (remote.updatedAt || '') > (local?.updatedAt || ''))) {
          base = {...base, ...remote};
        }
      } catch {}
      const s = {
        ...emptyState(),
        ...base,
        nick,
        name: name || base.name || nick,
        admin: {...defaultAdmin, ...(base.admin || {})},
        guest: !!base.guest
      };
      save(s);
      setPage('dashboard');
      setCloudMsg(local || profile ? 'Профіль готовий' : 'Новий профіль');
    }}/><div className="version-badge">v{VERSION}</div><Analytics /></>;
  }

  return (
    <>
      <Layout>
        {page === 'dashboard' && <Dashboard state={state} learned={learnedCount} due={dueCount} words={activeWords.length} onLearn={() => nav('learn')} onReview={() => nav('review')} cloudMsg={cloudMsg} />}
        {page === 'learn' && <Learn state={state} cats={activeCats} onStart={startLesson} />}
        {page === 'vocabulary' && <Vocabulary state={state} setModal={setModal} wordsCatalog={activeWords} cats={activeCats} />}
        {page === 'review' && <ReviewPage state={state} due={dueCount} onStart={() => startLesson('srs', 'en-ua', 'all')} />}
        {page === 'stats' && <Stats state={state} learned={learnedCount} />}
        {page === 'badges' && <BadgesPage state={state} />}
        {page === 'problems' && <ProblemsPage state={state} save={save} wordsCatalog={wordsLive} onStart={(m,d,c) => { setLessonCfg({mode:m,direction:d,category:c}); setPage('lesson'); }} />}
        {page === 'leaderboard' && <Leaderboard state={state} />}
        {page === 'settings' && <SettingsPage state={state} save={save} />}
        {page === 'friends' && <FriendsPage state={state} />}
        {page === 'challenges' && <ChallengesPage state={state} />}
        {page === 'profile' && <Profile state={state} save={save} />}
        {page === 'about' && <AboutPage />}
        {page === '404' && <section className="page-error card"><h1>404</h1><p>Такої сторінки немає.</p><button className="primary" type="button" onClick={() => nav('dashboard')}>На головну</button></section>}
        {page === 'admin' && <Admin state={state} save={save} setWordsLive={setWordsLive} wordsLive={wordsLive} />}
        {page === 'lesson' && lessonCfg && (
          <Lesson
            cfg={lessonCfg}
            wordsCatalog={activeWords}
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
    if (pl.length < 12) return 'Пароль мінімум 12 символів';
    if (!/[a-z]/.test(pl) || !/[A-Z]/.test(pl) || !/[0-9]/.test(pl)) return 'Пароль має містити великі й малі літери та цифру';
    if (pl.toLowerCase() === nl) return 'Пароль не може збігатися з ніком';
    if (nml && pl.toLowerCase() === nml) return 'Пароль не може збігатися з імʼям';
    return '';
  };

  const doLogin = async () => {
    const n = nick.trim();
    if (!n || !pass) { setErr('Вкажи нік і пароль'); return; }
    setBusy(true); setErr('');
    try {
      const auth = await serverAuth('login', { nick: n, password: pass });
      if (!auth.ok) throw new Error(auth.error || 'Невірний пароль');
      let profile = null;
      const remote = await cloudPull(n);
      if (remote) profile = {...emptyState(), ...remote, nick: n, name: remote.name || auth.user?.name || n};
      if (!profile) profile = loadProfile(n);
      if (!profile) profile = {...emptyState(), nick:n, name:auth.user?.name || n, id:auth.user?.id, role:auth.user?.role};
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
      const auth = await serverAuth('register', { nick: n, name: name.trim() || n, password: pass });
      if (!auth.ok) throw new Error(auth.error || 'Помилка реєстрації');
      setGuestSession(false);
      const base = emptyState();
      const profile = await registerNick(n, { ...base, nick:n, name:name.trim()||n, id:auth.user?.id, role:auth.user?.role });
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
function Dashboard({state, learned, due, words, onLearn, onReview, cloudMsg}) {
  return (
    <section>
      <div className="announce card jungle-announce">
        <span className="vine-deco left" aria-hidden="true">🌿</span>
        <span className="vine-deco right" aria-hidden="true">🌿</span>
        <span className="eyebrow">UPDATE · v2.5.0</span>
        <h2>🚀 Велике оновлення вже тут</h2>
        <p>Sprint, SRS, друзі, бейджі. Прогрес зберігається локально та синхронізується з хмарною БД.</p>
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
      <EmojiPulse state={state}/>
      <div className="grid stats">
        <Card icon={<Flame/>} title="Streak" value={state.streak} sub="днів" />
        <Card icon={<Sparkles/>} title="XP" value={state.xp} sub={`сьогодні ${state.todayXp}`} />
        <Card icon={<Target/>} title="Ціль" value={`${Math.min(100, Math.round((state.todayXp / state.dailyGoal) * 100))}%`} sub={`${state.todayXp}/${state.dailyGoal}`} />
        <Card icon={<Brain/>} title="Вивчено" value={learned} sub={`з ${words}`} />
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
          <UiSelect value={direction} onChange={setDirection} options={[{value:'en-ua',label:'EN → UA (що означає слово)'},{value:'ua-en',label:'UA → EN (як сказати англійською)'}]}/>
        </label>
        <label>Категорія
          <UiSelect value={category} onChange={setCategory} options={[{value:'all',label:'Усі'},...cats.map(c=>({value:c,label:c}))]}/>
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
          <p className="muted">Тільки слова, де помилки переважають правильні відповіді</p>
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

function Lesson({cfg, state, save, onExit, onDone, wordsCatalog}) {
  const mode = cfg.mode;
  const [lessonId, setLessonId] = useState('');
  const [serverItems, setServerItems] = useState(null);
  const [loadError, setLoadError] = useState('');
  const catalog = (wordsCatalog && wordsCatalog.length) ? wordsCatalog : words;
  const localItems = useMemo(() => {
    let pool = catalog;
    if (mode === 'srs') {
      const due = catalog.filter(w => isDue(state.srs[w.id], todayStr()) && (state.mastery[w.id] || 0) > 0);
      pool = due;
    } else if (mode === 'problems') {
      const stats = {};
      (state.history || []).forEach(h => { const id=String(h.word); if(!stats[id]) stats[id]={w:0,c:0}; if(h.correct) stats[id].c++; else stats[id].w++; });
      const hardIds = new Set(Object.entries(stats).filter(([,v]) => v.w >= 2 && v.w > v.c).map(([id]) => id));
      pool = catalog.filter(w => hardIds.has(String(w.id)));
      // HARD never silently falls back to the whole dictionary.
      if (!pool.length) pool = []; 
    } else if (mode === 'long') {
      pool = catalog.filter(w => (w.word || '').replace(/\s/g, '').length > 6);
    }
    if (cfg.category && cfg.category !== 'all') pool = pool.filter(w => w.category === cfg.category);
    if (state.admin.shuffleQuestions !== false) pool = shuffle(pool);
    if (mode === 'match') return pool.slice(0, 6);
    return makeQuizItems(pool, state.admin.lessonSize, cfg.direction, 'all');
  }, [catalog, mode, cfg.direction, cfg.category, state]);
  const items = serverItems?.length ? serverItems : localItems;
  useEffect(() => {
    let cancelled=false;
    setLoadError(''); setLessonId(''); setServerItems(null);
    if (state.guest) return;
    if (!localItems.length) {
      const msg = mode==='problems' ? 'Поки немає проблемних слів. Вони зʼявляться після реальних помилок.' : mode==='srs' ? 'Наразі немає карток, які потрібно повторити.' : 'У словнику немає доступних слів для цього уроку.';
      setLoadError(msg); return;
    }
    const timer=setTimeout(()=>{if(!cancelled)setLoadError('Сервер не відповів вчасно. Перевір зʼєднання та спробуй ще раз.')},15000);
    cloudStartLesson(mode, Math.min(localItems.length, 100), cfg.direction, cfg.category).then(r => {
      if(cancelled)return; clearTimeout(timer); setLoadError(''); setLessonId(r.lessonId || '');
      if (Array.isArray(r.items) && r.items.length) setServerItems(r.items); else setLoadError('Сервер не повернув питання для уроку.');
    }).catch(e => { clearTimeout(timer); if(cancelled)return; setLoadError(e.status===401 ? 'Сесія закінчилась. Увійди знову.' : (e.message || 'Не вдалося створити захищену сесію.')); });
    return ()=>{cancelled=true;clearTimeout(timer)};
  }, [mode, state.guest, localItems.length, cfg.direction, cfg.category]);

  if (!state.guest && (!lessonId || !serverItems?.length)) return <section><button className="back" onClick={onExit}>← Назад</button><div className="card lesson-loading-card"><h2>{loadError ? 'Не вдалося підготувати урок' : 'Готуємо персональний урок…'}</h2><p className="muted">{loadError || 'Learning Engine підбирає слова та створює захищену сесію.'}</p>{loadError&&<div className="row-btns"><button className="primary" onClick={()=>{setLoadError('');setLessonId('');setServerItems(null)}}>Спробувати ще раз</button><button className="secondary" onClick={onExit}>Назад</button></div>}</div></section>;
  if (mode === 'match') return <MatchGame key="match-board" items={items} state={state} save={save} onExit={onExit} onDone={onDone} lessonId={lessonId} direction={cfg.direction} />;
  if (mode === 'dictation') return <SprintGame items={items} mode={mode} state={state} save={save} onExit={onExit} onDone={onDone} lessonId={lessonId} direction={cfg.direction} />; 
  return <SprintGame items={items} mode={mode} state={state} save={save} onExit={onExit} onDone={onDone} lessonId={lessonId} direction={cfg.direction} />;
}

function SprintGame({items, mode, state, save, onExit, onDone, lessonId}) {
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
  const pendingProgress = useRef([]);

  const stateRef = useRef(state);
  stateRef.current = state;
  const stepRef = useRef(step);
  stepRef.current = step;
  const pickedRef = useRef(picked);
  pickedRef.current = picked;

  const w = quiz[step];
  const total = quiz.length;

  const applyAnswer = useCallback((ok, wordObj, submittedAnswer) => {
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
    if (!st.guest) {
      const pending = cloudRecordProgress({notion_id: mid, mode: mode || 'sprint', answer: String(submittedAnswer ?? ''), direction: wordObj.direction || 'en-ua', event_id: newEventId(), lesson_id: lessonId || ''})
        .then(r => { if (r?.user) { const cur=stateRef.current, card=r.card; save({...cur, xp:r.user.xp, streak:r.user.streak, todayXp:r.user.todayXp, today:r.user.today, badges:[...new Set([...(cur.badges||[]), ...(r.earned||[])])], ...(card ? {mastery:{...cur.mastery,[card.notion_id]:card.mastery},srs:{...cur.srs,[card.notion_id]:card.srs},attempts:{...cur.attempts,[card.notion_id]:card.attempts}} : {})}); } return r; })
        .catch(() => null);
      pendingProgress.current.push(pending);
    }
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
    applyAnswer(ok, wordObj, opt);
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
{badCount === 0 && okCount > 0 && <p className="bonus-line">Ідеальний урок ✓</p>}
          <CompareBlurb state={state} />
          <button className="primary" type="button" onClick={() => {
            let next = {...state, gamesPlayed: (state.gamesPlayed || 0) + 1};
            if (badCount === 0 && okCount > 0) confettiBurst();
            save(next);
            if (!state.guest && lessonId) Promise.allSettled(pendingProgress.current).then(() => cloudFinishLesson(lessonId).then(r => { if(r?.user) save({...stateRef.current,...r.user}); }).catch(() => {}));
            onDone();
          }}>На головну</button>
        </div>
      </section>
    );
  }

  if (!w) return null;
  const correct = picked === w.answer;
  const masteryNow = state.mastery[w.id] || 0;
  const progressPct = ((step + 1) / total) * 100;

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
            applyAnswer(ok, w, val);
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


function MatchGame({items, state, save, onExit, onDone, lessonId, direction='en-ua'}) {
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
  const pendingProgress = useRef([]);

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
      if (!st.guest) pendingProgress.current.push(cloudRecordProgress({notion_id: selL, mode:'match', answer:selR, direction, quality:4, event_id:newEventId(), lesson_id:lessonId||''}).then(r=>{if(r?.user){const cur=stateRef.current,c=r.card;save({...cur,xp:r.user.xp,streak:r.user.streak,todayXp:r.user.todayXp,today:r.user.today,badges:[...new Set([...(cur.badges||[]),...(r.earned||[])])],...(c?{mastery:{...cur.mastery,[c.notion_id]:c.mastery},srs:{...cur.srs,[c.notion_id]:c.srs},attempts:{...cur.attempts,[c.notion_id]:c.attempts}}:{})})}return r}).catch(()=>null));
    } else {
      save({...st, xp: st.xp + st.admin.wrongPoints, todayXp: st.todayXp + st.admin.wrongPoints});
      if (!st.guest) pendingProgress.current.push(cloudRecordProgress({notion_id: selL, mode:'match', answer:selR, direction, quality:1, event_id:newEventId(), lesson_id:lessonId||''}).then(r=>{if(r?.user){const cur=stateRef.current,c=r.card;save({...cur,xp:r.user.xp,streak:r.user.streak,todayXp:r.user.todayXp,today:r.user.today,badges:[...new Set([...(cur.badges||[]),...(r.earned||[])])],...(c?{mastery:{...cur.mastery,[c.notion_id]:c.mastery},srs:{...cur.srs,[c.notion_id]:c.srs},attempts:{...cur.attempts,[c.notion_id]:c.attempts}}:{})})}return r}).catch(()=>null));
    }
    const t = setTimeout(() => { setSelL(null); setSelR(null); setFlash({}); }, 450);
    return () => clearTimeout(t);
  }, [selL, selR]);

  const allDone = items.length > 0 && items.every(w => matched[w.id]);
  if (allDone) return <section><div className="complete card"><h1>Match завершено 🎯</h1><button className="primary" onClick={() => { if (!state.guest && lessonId) Promise.allSettled(pendingProgress.current).then(() => cloudFinishLesson(lessonId).then(r => { if(r?.user) save({...stateRef.current,...r.user}); }).catch(() => {})); onDone(); }}>На головну</button></div></section>;

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

function Vocabulary({state, setModal, wordsCatalog, cats}) {
  const dict = (wordsCatalog && wordsCatalog.length) ? wordsCatalog : words;
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const f = dict.filter(w => {
    const okCat = cat === 'all' || w.category === cat;
    const okQ = (w.word + ' ' + w.translation + ' ' + w.category).toLowerCase().includes(q.toLowerCase());
    return okCat && okQ;
  });
  return (
    <section>
      <Title title="Словник" text={`${words.length} слів · ${notionWords?.length ? 'Notion' : 'локальна база (синк пізніше)'}`}/>
      <div className="filters row">
        <input className="search" placeholder="Пошук…" value={q} onChange={e => setQ(e.target.value)}/>
        <UiSelect value={cat} onChange={setCat} options={[{value:'all',label:'Усі категорії'},...(cats || CATS).map(c=>({value:c,label:c}))]}/>
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


function ProblemsPage({state, save, onStart, wordsCatalog}) {
  const dict = (wordsCatalog && wordsCatalog.length) ? wordsCatalog : words;
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
      <Title title="Проблемні слова" text="Тут показуються тільки слова, де реально є проблема: щонайменше 2 помилки і помилок більше, ніж правильних відповідей."/>
      <div className="card filters problems-toolbar">
        <div className="row-btns wrap">
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
          const w = dict.find(x => String(x.id) === String(s.id));
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
      <Title title="SRS Повторення" text="SRS v2: adaptive interval + ease + lapses"/>
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
      <EmojiPulse state={state}/>
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
      <div className="grid two">
        <div className="card">
          <h2>Точність</h2>
          <div className="donut-wrap">
            <div className="donut" style={{background: `conic-gradient(var(--accent) 0 ${pct}%, var(--border) ${pct}% 100%)`}}/>
            <div className="donut-label"><b>{pct}%</b><span className="muted">correct</span></div>
          </div>
          <p className="muted small">{correct} правильних · {total - correct} помилок · {total} всього</p>
        </div>
        <div className="card">
          <h2>Режими гри</h2>
          <ModeBars history={state.history || []} />
        </div>
      </div>
      <div className="card">
        <h2>XP сьогодні vs ціль</h2>
        <div className="xp-goal-track">
          <i style={{width: Math.min(100, Math.round(((state.todayXp||0) / Math.max(1, state.dailyGoal||50)) * 100)) + '%'}}/>
        </div>
        <p className="muted">{state.todayXp || 0} / {Math.max(1, state.dailyGoal || 50)} XP ({Math.min(100, Math.round(((state.todayXp||0) / Math.max(1, state.dailyGoal||50)) * 100))}%)</p>
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
            <div key={b.id} className={'badge-card card badge-style-' + (state.badgeStyle || 'neo') + (on ? ' earned' : ' locked')}>
              <div className="badge-ico">{on ? '🏅' : '🔒'}</div>
              <div className="badge-body">
                <h3>{b.title}</h3>
                <p className="muted badge-desc">{b.desc}</p>
                {on && <span className="pill ok">Отримано</span>}
              </div>
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
  const level = Math.max(1, Math.floor((state.xp || 0) / 100) + 1);
  const xpInto = (state.xp || 0) % 100;

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
    <section className="rpg-profile fade-in">
      <div className="hero-rpg card">
        <div className="rpg-avatar">{state.avatar || '🎓'}</div>
        <div style={{flex:1,minWidth:180}}>
          <div className="rpg-level">Рівень {level}</div>
          <h2 style={{margin:'4px 0'}}>{state.name || state.nick} {(String(state.nick||'').toLowerCase()==='boss' || String(state.name||'').toLowerCase()==='boss') && '👑'}</h2>
          <div className="muted">@{state.nick} · {state.xp || 0} XP · 🔥 {state.streak || 0}</div>
          <div className="xp-bar" title="До наступного рівня"><i style={{width: xpInto + '%'}}/></div>
          <small className="muted">{xpInto}/100 XP до рівня {level + 1}</small>
        </div>
      </div>
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
          <p className="muted small">{cloudConfigured() ? 'Neon PostgreSQL підключено через Vercel' : 'Neon ще не налаштований у Vercel'}</p>
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
  const [otp, setOtp] = useState('');
  const [ok, setOk] = useState(false);
  const [adminInfo, setAdminInfo] = useState(null);
  const [adminDesign, setAdminDesign] = useState(()=>localStorage.getItem('ef-admin-design')||'apple');
  useEffect(() => { fetch('/api/admin-auth',{credentials:'include'}).then(r=>r.ok?r.json():null).then(d=>{setOk(!!d?.ok);setAdminInfo(d?.admin||null)}).catch(()=>{setOk(false);setAdminInfo(null)}); }, []);
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
  const [syncMeta, setSyncMeta] = useState(notionSyncMeta);
  const unlock = (info=null) => { setOk(true); setAdminInfo(info||adminInfo); setPin(''); setAuthErr(''); };
  const changeAdminDesign = v => { setAdminDesign(v); localStorage.setItem('ef-admin-design',v); };
  useEffect(() => { setA({...state.admin}); }, [state.admin]);

  const forceSync = async () => {
    if (syncing) return;
    setSyncing(true); setSaved(false);
    setSyncProg({cur:0,total:100,label:'Підключення до Notion…'});
    try {
      const data = await requestJson('/api/notion-sync',{method:'POST',body:'{}'});
      const list=Array.isArray(data.words)?data.words:[];
      if (!list.length) throw new Error('Notion повернув порожній словник — оновлення скасовано.');
      const mapped=list.map((w,i)=>({id:w.id||w.notion_id||('n'+(i+1)),word:w.word,translation:w.translation||'—',pronunciation:w.pronunciation||'',category:w.category||'Other',level:w.level||'',explanation:w.explanation||'',example:w.example||w.examples||''}));
      localStorage.setItem('ef-words-cache-v1',JSON.stringify({words:mapped,meta:data.meta||{},at:new Date().toISOString()}));
      await dbSaveWords(mapped,data.meta||{});
      setWordsLive(mapped); setSyncMeta(data.meta||{});
      setSyncProg({cur:100,total:100,label:`Готово · ${mapped.length} слів`});
      setSaved(true);
      emitSiteToast(`Словник синхронізовано: ${mapped.length} слів`,'ok');
    } catch(e) {
      setSyncProg({cur:0,total:0,label:'Помилка: '+(e.message||'sync failed')});
      emitSiteError(e.message||'Не вдалося оновити словник','Синхронізація Notion');
    } finally { setSyncing(false); }
  };

  const tryUnlock = async () => {
    setAuthBusy(true); setAuthErr('');
    try {
      const res = await fetch('/api/admin-auth', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ password: pin, code: otp })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        unlock(data.admin);
        setOtp('');
      } else setAuthErr(data.error || 'Невірний пароль');
    } catch {
      setAuthErr('Немає зʼєднання з сервером');
    }
    setAuthBusy(false);
  };
  const passkeyLogin = async () => {
    setAuthBusy(true); setAuthErr('');
    try {
      const a = await requestJson('/api/admin-auth',{method:'POST',body:JSON.stringify({action:'passkey-auth-options'})});
      const response = await startAuthentication({optionsJSON:a.options});
      const v = await requestJson('/api/admin-auth',{method:'POST',body:JSON.stringify({action:'passkey-auth-verify',response})});
      if(v.ok){unlock(v.admin);emitSiteToast('Passkey підтверджено ✓','ok')}
    } catch(e){setAuthErr(e.message||'Passkey не спрацював')} finally {setAuthBusy(false)}
  };

  if (!ok) {
    return (
      <section className="admin-gate">
        <div className="card admin-gate-card">
          <div className="admin-gate-icon">🔐</div>
          <h1>Адмін-доступ</h1>
          
          <label>Пароль</label>
          <input className="search" type="password" autoFocus value={pin} onChange={e => setPin(e.target.value)} onKeyDown={e => e.key === 'Enter' && tryUnlock()} placeholder="ADMIN_PASSWORD" autoComplete="current-password"/>
          {authErr && /2FA/i.test(authErr) && <input className="search" inputMode="numeric" maxLength={6} value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,''))} onKeyDown={e=>e.key==='Enter'&&tryUnlock()} placeholder="6-значний 2FA код" autoComplete="one-time-code"/>}
          {authErr && <p className="auth-err">{authErr}</p>}
          <button className="primary full" type="button" disabled={authBusy || !pin} onClick={tryUnlock}>{authBusy ? 'Перевірка…' : 'Увійти в панель'}</button>
          <button className="secondary full" type="button" disabled={authBusy} onClick={passkeyLogin}>🔑 Увійти з Passkey</button>
        </div>
      </section>
    );
  }
  const isAdmin = adminInfo?.role === 'admin';
  const update = (k, v) => setA(x => ({...x, [k]: v}));
  const saveAdmin = async () => {
    const nextAdmin = {...a, lessonSize: Math.max(3, Math.min(50, Number(a.lessonSize) || 10)), correctPoints: Number(a.correctPoints) || 4, wrongPoints: Number(a.wrongPoints) || -2, masteryThreshold: Math.max(1, Number(a.masteryThreshold) || 8)};
    try {
      await requestJson('/api/admin-settings',{method:'PUT',body:JSON.stringify({settings:{lessonSize:nextAdmin.lessonSize,correctPoints:nextAdmin.correctPoints,wrongPoints:nextAdmin.wrongPoints,masteryThreshold:nextAdmin.masteryThreshold,shuffleQuestions:!!nextAdmin.shuffleQuestions,shuffleAnswers:!!nextAdmin.shuffleAnswers,showPronunciation:!!nextAdmin.showPronunciation,perfectBonus:Math.max(0,Math.min(100,Number(nextAdmin.perfectBonus)||0)),badgeStyle:nextAdmin.badgeStyle||'neo'}})});
      save({...state, admin: nextAdmin}); setSaved(true); setTimeout(()=>setSaved(false),1500); emitSiteToast('Правила збережено ✓','ok');
    } catch(e) { if(e.status===401||e.status===403) window.dispatchEvent(new Event('ef-admin-lock')); else emitSiteError(e.message,'Адмін-налаштування'); }
  };
  return (
    <section className={'admin-shell admin-design-'+adminDesign}>
      <div className="admin-design-switch card"><div><b>Тестовий інтерфейс</b><span className="muted small">3 стилі лише для адмін-панелі</span></div><div className="admin-design-grid">{[['apple','Apple Light'],['glass','Glass Pro'],['studio','Studio Dark']].map(([v,l])=><button key={v} type="button" className={adminDesign===v?'primary':'secondary'} onClick={()=>changeAdminDesign(v)}>{l}</button>)}</div></div>
      <Title title="Адмін-панель" text="Безпечне керування контентом, БД, синхронізацією та аналітикою"/>
      {isAdmin && <div className="card sync-card">
        <h2>Словник Notion</h2>
        <p className="muted">Живий sync: Notion → Neon. Прогрес гравців не стирається; браузерний JSON — лише кеш.</p>
        <p className="sync-meta-line"><b>{(wordsLive && wordsLive.length) || syncMeta.count || 0}</b> слів · {syncMeta.syncedAt || '—'}</p>
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
      </div>}
      
      <div className="card roadmap-panel">
        <h2>Roadmap / ідеї</h2>
        <p className="muted">Центральна панель керування: контент, правила навчання, безпека, користувачі та аналітика.</p>
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
      <div className="card"><h2>Стан системи</h2><AdminStats /></div>
      <div className="card"><h2>🛡️ Admin Security 2.0</h2><p className="muted small">Роль: <b>{adminInfo?.role||'admin'}</b> · Permissions: {adminInfo?.role==='admin'?'all':'dashboard, users, reports, monitoring'}</p><AdminSecurity2FA /></div>
      {isAdmin && <div className="card"><h2>Журнал безпеки / адмін-дій</h2><AdminAudit /></div>}
      {isAdmin && <div className="card analytics-dashboard"><h2>📊 Product & Learning Analytics</h2><p className="muted">Єдине серверне джерело аналітики: продукт, навчання, SRS, vocabulary, retention, social, security та system health. Без старих localStorage-метрик.</p><AdminAnalytics /></div>}
      <div className="card"><h2>⚑ Reports</h2><AdminReports /></div>
      <div className="card"><h2>🩺 Monitoring</h2><AdminMonitoring /></div>

      {isAdmin && <div className="grid two">
        <div className="card">
          <h2>Урок</h2>
          <label>Питань <input type="number" value={a.lessonSize} onChange={e => update('lessonSize', e.target.value)}/></label>
          <label>Бали + <input type="number" value={a.correctPoints} onChange={e => update('correctPoints', e.target.value)}/></label>
          <label>Бали − <input type="number" value={a.wrongPoints} onChange={e => update('wrongPoints', e.target.value)}/></label>
          <label>Mastery <input type="number" value={a.masteryThreshold} onChange={e => update('masteryThreshold', e.target.value)}/></label><label>Shuffle питань <input type="checkbox" checked={a.shuffleQuestions!==false} onChange={e=>update('shuffleQuestions',e.target.checked)}/></label><label>Perfect bonus <input type="number" min="0" max="100" value={a.perfectBonus||0} onChange={e=>update('perfectBonus',e.target.value)}/></label><label>Стиль ачівок <UiSelect value={a.badgeStyle||'neo'} onChange={v=>update('badgeStyle',v)} options={[{value:'neo',label:'Neo'},{value:'arcade',label:'Arcade'},{value:'minimal',label:'Minimal'},{value:'royal',label:'Royal'}]}/></label>
          <p className="muted small">Пароль адміна тепер зберігається тільки у Vercel Environment Variables як <b>ADMIN_PASSWORD</b>.</p>
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
          <h2>Керування гравцями</h2>
          <AdminUsers setModal={setModal} />
        </div>
        <div className="card">
          <h2>Дані гравця</h2>
          <AdminDanger save={save} state={state} setModal={setModal} />
        </div>
      </div>}
    </section>
  );
}
function AdminSecurity2FA(){
  const [status,setStatus]=useState(null),[secret,setSecret]=useState(''),[uri,setUri]=useState(''),[code,setCode]=useState(''),[busy,setBusy]=useState(false),[err,setErr]=useState(''),[passkeys,setPasskeys]=useState(null);
  const load=useCallback(()=>requestJson('/api/admin-auth').then(d=>setStatus(!!d.admin?.two_factor)).catch(()=>setStatus(null)),[]);
  const loadPasskeys=useCallback(()=>requestJson('/api/admin-auth',{method:'POST',body:JSON.stringify({action:'passkey-auth-options'})}).then(()=>setPasskeys(true)).catch(()=>setPasskeys(false)),[]);
  useEffect(()=>{load();loadPasskeys()},[load,loadPasskeys]);
  const setup=async()=>{setBusy(true);setErr('');try{const d=await requestJson('/api/admin-auth',{method:'POST',body:JSON.stringify({action:'2fa-setup'})});setSecret(d.secret||'');setUri(d.uri||'');setStatus(false)}catch(e){setErr(e.message)}finally{setBusy(false)}};
  const enable=async()=>{setBusy(true);setErr('');try{await requestJson('/api/admin-auth',{method:'POST',body:JSON.stringify({action:'2fa-enable',code})});setStatus(true);setSecret('');setUri('');setCode('');emitSiteToast('2FA увімкнено ✓','ok')}catch(e){setErr(e.message)}finally{setBusy(false)}};
  const registerPasskey=async()=>{setBusy(true);setErr('');try{const d=await requestJson('/api/admin-auth',{method:'POST',body:JSON.stringify({action:'passkey-register-options'})});const response=await startRegistration({optionsJSON:d.options});await requestJson('/api/admin-auth',{method:'POST',body:JSON.stringify({action:'passkey-register-verify',response})});setPasskeys(true);emitSiteToast('Passkey додано ✓','ok')}catch(e){setErr(e.message||'Не вдалося додати passkey')}finally{setBusy(false)}};
  if(status===null)return <p className="muted">Перевірка Admin Security…</p>;
  if(status)return <div className="security-2fa-ok"><span className="pill ok">✓ TOTP 2FA активна</span><div className="passkey-box"><b>Passkey: {passkeys?'доступний':'не налаштований'}</b>{passkeys===true?<span className="muted small">Цей admin має зареєстрований passkey.</span>:<button className="secondary" type="button" disabled={busy} onClick={registerPasskey}>Додати Passkey</button>}</div><p className="muted small">Для входу потрібні ADMIN_PASSWORD + 6-значний код.</p><span className="muted small">Для вимкнення потрібен пароль + код через повторну admin-авторизацію.</span><input className="search" inputMode="numeric" maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))} placeholder="код для керування"/>{err&&<p className="auth-err">{err}</p>}</div>;
  return <div><span className="pill">2FA не активна</span><div className="passkey-box"><b>Passkey: {passkeys?'доступний':'не налаштований'}</b>{passkeys===true?<span className="muted small">Можна входити без admin password через системний passkey.</span>:<button className="secondary" type="button" disabled={busy} onClick={registerPasskey}>Додати Passkey</button>}</div>{!secret?<button className="secondary" type="button" disabled={busy} onClick={setup}>Створити secret</button>:<><p className="muted small">Додай цей secret у Google/Microsoft Authenticator або інший TOTP-додаток:</p><code className="secret-code">{secret}</code><p className="muted small">URI: {uri}</p><div className="row-btns"><input className="search" inputMode="numeric" maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))} placeholder="6-значний код"/><button className="primary" disabled={busy||code.length!==6} onClick={enable}>Увімкнути 2FA</button></div></>}{err&&<p className="auth-err">{err}</p>}</div>;
}
function AdminUsers({setModal}){
  const [q,setQ]=useState(''),[rows,setRows]=useState([]),[busy,setBusy]=useState(false);
  const load=useCallback(async()=>{try{const d=await requestJson('/api/admin-users?q='+encodeURIComponent(q));setRows(d.rows||[])}catch(e){if(e.status===401||e.status===403)window.dispatchEvent(new Event('ef-admin-lock'));else emitSiteError(e.message,'Гравці')}} ,[q]);
  useEffect(()=>{load()},[load]);
  const act=async(id,body)=>{setBusy(true);try{await requestJson('/api/admin-users',{method:'PATCH',body:JSON.stringify({userId:id,...body})});await load()}catch(e){if(e.status===401||e.status===403)window.dispatchEvent(new Event('ef-admin-lock'));else emitSiteError(e.message,'Керування гравцем')}finally{setBusy(false)}};
  const reset=async(id)=>{setBusy(true);try{await requestJson('/api/admin-users',{method:'POST',body:JSON.stringify({userId:id,action:'reset_progress'})});await load()}catch(e){if(e.status===401||e.status===403)window.dispatchEvent(new Event('ef-admin-lock'));else emitSiteError(e.message,'Скидання прогресу')}finally{setBusy(false)}};
  return <div><input className="search" placeholder="Нік або імʼя" value={q} onChange={e=>setQ(e.target.value)}/><div className="player-db-list">{rows.map(r=><div className="word-row card" key={r.id} style={{marginTop:8}}><div><b>{r.name||r.nick}</b> <span className="muted">@{r.nick}</span><div className="muted small">{r.xp} XP · streak {r.streak} · {r.status}</div></div><div className="row-btns wrap"><UiSelect disabled={busy} value={r.role} onChange={v=>act(r.id,{role:v})} options={[{value:'user',label:'user'},{value:'moderator',label:'moderator'},{value:'admin',label:'admin'}]}/><button className="secondary" disabled={busy} onClick={()=>setModal?.({text:`Змінити статус @${r.nick}?`,onYes:()=>act(r.id,{status:r.status==='active'?'suspended':'active'})})}>{r.status==='active'?'Призупинити':'Активувати'}</button><button className="secondary" disabled={busy} onClick={()=>setModal?.({text:`Скинути весь прогрес @${r.nick}? Цю дію не можна скасувати.`,onYes:()=>reset(r.id)})}>Reset</button></div></div>)}</div></div>
}
function AdminAudit(){const [rows,setRows]=useState([]);const [err,setErr]=useState('');useEffect(()=>{requestJson('/api/admin-audit').then(d=>setRows(d.rows||[])).catch(e=>{setErr(e.message||'Помилка');if(e.status===401||e.status===403)window.dispatchEvent(new Event('ef-admin-lock'))})},[]);return <div className="word-list">{rows.slice(0,30).map(r=><div className="word-row card" key={r.id}><div><b>{r.action}</b><div className="muted small">{r.target_nick?`@${r.target_nick} · `:''}{new Date(r.created_at).toLocaleString()}</div></div></div>)}{err?<p className="muted">{err}</p>:!rows.length&&<p className="muted">Журнал порожній.</p>}</div>}
function Metric({title,value,sub}){return <div className="card" style={{margin:0}}><div className="muted small">{title}</div><div style={{fontSize:24,fontWeight:800,marginTop:4}}>{value}</div>{sub&&<div className="muted small">{sub}</div>}</div>}
function AnalyticsTable({rows,columns,empty='Немає даних'}){if(!rows?.length)return <p className="muted">{empty}</p>;return <div style={{overflowX:'auto'}}><table className="admin-table"><thead><tr>{columns.map(c=><th key={c.key}>{c.label}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={r.id||r.word||r.mode||r.level||i}>{columns.map(c=><td key={c.key}>{c.render?c.render(r):String(r[c.key]??'—')}</td>)}</tr>)}</tbody></table></div>}
function AnalyticsBars({rows,labelKey='label',valueKey='value',suffix=''}){const max=Math.max(1,...(rows||[]).map(r=>Number(r[valueKey]||0)));if(!rows?.length)return <p className="muted">Немає даних</p>;return <div className="mode-bars">{rows.map((r,i)=><div className="mode-row" key={r[labelKey]||i}><span className="mode-name">{r[labelKey]}</span><div className="mode-track"><i style={{width:(Number(r[valueKey]||0)/max*100)+'%'}}/></div><span className="mode-n">{r[valueKey]}{suffix}</span></div>)}</div>}
function AdminAnalytics(){
  const [d,setD]=useState(null),[days,setDays]=useState(30),[tab,setTab]=useState('overview'),[err,setErr]=useState('');
  const load=()=>requestJson('/api/admin-analytics?days='+days).then(x=>{setD(x?.ok?x:null);setErr('')}).catch(e=>{setErr(e.message||'Не вдалося завантажити analytics');if(e.status===401||e.status===403)window.dispatchEvent(new Event('ef-admin-lock'))});
  useEffect(()=>{load()},[days]);
  if(!d)return <div className="admin-error-state"><p className="muted">{err||'Завантаження analytics…'}</p>{err&&<button className="secondary" type="button" onClick={load}>Повторити</button>}</div>;
  const o=d.overview||{}, l=d.learning||{}, v=d.vocabulary||{}, u=d.users||{}, s=d.social||{}, sec=d.security||{}, sys=d.system||{}, f=d.funnel||{};
  const tabs=[['overview','Overview'],['learning','Learning'],['vocabulary','Vocabulary'],['users','Users'],['social','Social'],['security','Security'],['system','System']];
  return <div>
    <div className="row-btns" style={{flexWrap:'wrap',gap:8}}>{tabs.map(([id,label])=><button key={id} type="button" className={tab===id?'primary':'secondary'} onClick={()=>setTab(id)}>{label}</button>)}<UiSelect value={days} onChange={v=>setDays(Number(v))} options={[{value:7,label:'7 днів'},{value:30,label:'30 днів'},{value:90,label:'90 днів'}]}/></div>
    {tab==='overview'&&<>
      <div className="grid stats"><Metric title="Всього users" value={o.total_users||0}/><Metric title="Active users" value={o.active_users||0}/><Metric title={'Active / '+days+'d'} value={o.active_period||0}/><Metric title="New users" value={o.new_users||0}/><Metric title="Lessons started" value={o.lessons_started||0}/><Metric title="Lessons completed" value={o.lessons_completed||0}/><Metric title="Completion" value={(o.completion||0)+'%'}/><Metric title="Accuracy" value={(o.accuracy||0)+'%'}/><Metric title="Answers" value={o.answers||0}/><Metric title="XP earned" value={o.xp_earned||0}/><Metric title="Avg XP / active user" value={o.avgXpUser||0}/><Metric title="Achievements" value={o.achievements_earned||0}/></div>
      <h3>Daily activity</h3><div className="analytics-chart">{(d.daily||[]).map(x=>{const max=Math.max(1,...(d.daily||[]).map(z=>Number(z.events||0)));return <div className="analytics-day" key={String(x.day)} title={`${x.day}: ${x.events} events / ${x.answers} answers`}><i style={{height:(Number(x.events||0)/max*100)+'%'}}/><span>{String(x.day).slice(5)}</span></div>})}</div>
      <div className="grid two"><div><h3>Lesson funnel</h3><AnalyticsBars rows={[{label:'App opens',value:f.app_opens||0},{label:'Lessons started',value:f.lessons_started||0},{label:'Answers',value:f.first_answers||0},{label:'Completed',value:f.lessons_completed||0}]}/></div><div><h3>Retention cohorts</h3><AnalyticsTable rows={(d.retention||[]).slice(0,10)} columns={[{key:'cohort',label:'Cohort'},{key:'cohort_size',label:'Users'},{key:'d1_pct',label:'D1 %',render:r=>r.d1_pct+'%'},{key:'d7_pct',label:'D7 %',render:r=>r.d7_pct+'%'},{key:'d30_pct',label:'D30 %',render:r=>r.d30_pct+'%'}]}/></div></div>
      <h3>Modes</h3><AnalyticsTable rows={d.modes} columns={[{key:'mode',label:'Mode'},{key:'starts',label:'Starts'},{key:'completions',label:'Completed'},{key:'accuracy',label:'Accuracy',render:r=>r.accuracy+'%'},{key:'avg_minutes',label:'Avg. time',render:r=>r.avg_minutes+' min'}]}/>
    </>}
    {tab==='learning'&&<>
      <div className="grid stats"><Metric title="New cards" value={l.new_cards||0}/><Metric title="Words reviewed" value={l.reviewed_cards||0}/><Metric title="Studied cards" value={l.studied_cards||0}/><Metric title="Mastered" value={l.mastered_cards||0}/><Metric title="Due SRS" value={l.due_cards||0}/><Metric title="Accuracy" value={(l.accuracy||0)+'%'}/><Metric title="Avg attempts / word" value={l.avg_attempts||0}/><Metric title="Avg mastery" value={l.avg_mastery||0}/><Metric title="SRS reviews" value={l.srs_reviews||0}/><Metric title="SRS accuracy" value={(l.srs_accuracy||0)+'%'}/></div>
      <h3>CEFR content distribution</h3><AnalyticsBars rows={(d.levelDistribution||[]).map(x=>({label:x.level,value:x.words}))}/>
      <h3>Lesson performance</h3><AnalyticsTable rows={d.modes} columns={[{key:'mode',label:'Mode'},{key:'starts',label:'Starts'},{key:'completions',label:'Completed'},{key:'accuracy',label:'Accuracy',render:r=>r.accuracy+'%'},{key:'avg_minutes',label:'Avg time',render:r=>r.avg_minutes+' min'}]}/>
    </>}
    {tab==='vocabulary'&&<>
      <div className="grid stats"><Metric title="Vocabulary total" value={v.vocabulary_total||0}/><Metric title="Never shown" value={v.never_shown||0}/><Metric title="Long words" value={v.long_words||0}/><Metric title="CEFR tagged" value={v.cefr_tagged||0}/></div>
      <h3>Most difficult / problem words</h3><AnalyticsTable rows={d.weakWords} columns={[{key:'word',label:'Word'},{key:'level',label:'Level'},{key:'category',label:'Category'},{key:'reviews',label:'Reviews'},{key:'wrong',label:'Wrong'},{key:'error_rate',label:'Error rate',render:r=>r.error_rate+'%'}]}/>
      <h3>Most reviewed</h3><AnalyticsTable rows={d.mostReviewed} columns={[{key:'word',label:'Word'},{key:'level',label:'Level'},{key:'reviews',label:'Reviews'},{key:'correct',label:'Correct'},{key:'wrong',label:'Wrong'}]}/>
      <h3>Suspiciously high accuracy / easy words</h3><AnalyticsTable rows={d.highAccuracy} columns={[{key:'word',label:'Word'},{key:'level',label:'Level'},{key:'reviews',label:'Reviews'},{key:'accuracy',label:'Accuracy',render:r=>r.accuracy+'%'}]}/>
    </>}
    {tab==='users'&&<>
      <div className="grid stats"><Metric title="Active" value={u.active||0}/><Metric title="Suspended" value={u.suspended||0}/><Metric title="Deleted" value={u.deleted||0}/><Metric title="New today" value={u.new_today||0}/><Metric title="New 7d" value={u.new_7d||0}/><Metric title="New 30d" value={u.new_30d||0}/></div>
      <p className="muted">User-level analytics у цьому dashboard агреговані. Паролі, токени, точна геолокація та інші секрети сюди не потрапляють.</p>
    </>}
    {tab==='social'&&<div className="grid stats"><Metric title="Friendships" value={s.friendships||0}/><Metric title="Pending requests" value={s.pending_requests||0}/><Metric title={'Messages / '+days+'d'} value={s.messages_sent||0}/><Metric title="Challenges created" value={s.challenges_created||0}/><Metric title="Challenge joins" value={s.challenge_joins||0}/><Metric title="Challenge completions" value={s.challenge_completions||0}/></div>}
    {tab==='security'&&<><div className="grid stats"><Metric title={'Security events / '+days+'d'} value={sec.security_events||0}/><Metric title={'Failed logins / '+days+'d'} value={sec.failed_logins||0}/><Metric title="Open reports" value={sec.open_reports||0}/><Metric title={'Reports / '+days+'d'} value={sec.reports_period||0}/></div><h3>Top errors</h3><AnalyticsTable rows={d.errors} columns={[{key:'message',label:'Error'},{key:'n',label:'Count'}]}/></>}
    {tab==='system'&&<><div className="grid stats"><Metric title="Active sessions" value={sys.active_sessions||0}/><Metric title="Answers / hour" value={sys.answers_hour||0}/><Metric title="Errors / hour" value={sys.errors_hour||0}/><Metric title={'Realtime opens / '+days+'d'} value={sys.realtime_opens||0}/><Metric title={'Realtime reconnects / '+days+'d'} value={sys.realtime_reconnects||0}/><Metric title={'Realtime errors / '+days+'d'} value={sys.realtime_errors||0}/></div><p className="muted">DB latency та live operational health дивись у блоці Monitoring нижче.</p></>}
  </div>;
}

function AdminReports(){const [rows,setRows]=useState([]);const load=()=>requestJson('/api/reports').then(d=>setRows(d.rows||[])).catch(e=>{if(e.status===401||e.status===403)window.dispatchEvent(new Event('ef-admin-lock'));else emitSiteError(e.message,'Reports')});useEffect(load,[]);const update=async(id,status)=>{await fetch('/api/reports',{method:'PATCH',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({id,status})});load()};return <div>{rows.slice(0,12).map(r=><div className="word-row" key={r.id}><div><b>#{r.id} · @{r.target_nick}</b><div className="muted small">@{r.reporter_nick} · {r.reason} · {r.status}</div></div><UiSelect value={r.status} onChange={v=>update(r.id,v)} options={['open','reviewing','resolved','dismissed'].map(v=>({value:v,label:v}))}/></div>)}{!rows.length&&<p className="muted">Немає скарг.</p>}</div>}
function AdminMonitoring(){const [d,setD]=useState(null),[err,setErr]=useState('');useEffect(()=>{const load=()=>requestJson('/api/admin-monitoring').then(setD).catch(e=>{setErr(e.message||'Помилка');if(e.status===401||e.status===403)window.dispatchEvent(new Event('ef-admin-lock'))});load();const t=setInterval(load,15000);return()=>clearInterval(t)},[]);if(!d)return <div className="admin-error-state"><p className="muted">{err||'Завантаження…'}</p></div>;return <div><div className="grid stats"><Card title="DB latency" value={d.dbMs+'ms'} sub="SELECT 1"/><Card title="Active sessions" value={d.activeSessions}/><Card title="Answers/hour" value={d.progressLastHour}/><Card title="API errors/hour" value={d.apiErrorsHour||0}/><Card title="Realtime online" value={d.realtimeConnections||0}/><Card title="Security events/24h" value={d.security24h||0}/><Card title="Open reports" value={d.openReports}/><Card title="Realtime errors/hour" value={d.realtimeErrorsHour||0}/></div><div className="sync-health-line"><b>Vocabulary sync:</b> {d.activeVocabulary||0} active · {d.vocabularySync?.value?.count||0} last synced · {d.vocabularySync?.updated_at?new Date(d.vocabularySync.updated_at).toLocaleString():'ще не синхронізовано'}</div></div>}

function AdminStats(){const [d,setD]=useState(null),[err,setErr]=useState('');useEffect(()=>{requestJson('/api/admin-stats').then(setD).catch(e=>{setErr(e.message||'Помилка');if(e.status===401||e.status===403)window.dispatchEvent(new Event('ef-admin-lock'))})},[]);if(!d)return <div className="admin-error-state"><p className="muted">{err||'Завантаження статистики…'}</p>{err&&<button className="secondary" onClick={()=>location.reload()}>Повторити</button>}</div>;return <div className="grid stats"><Card title="Користувачі" value={d.users?.active||0} sub={`усього ${d.users?.total||0}`}/><Card title="Відповіді" value={d.attempts?.total||0}/><Card title="Слова" value={d.words?.total||0}/><Card title="Повідомлення" value={d.messages?.total||0}/></div>}


function AdminDanger({save,state,setModal}) {
  const [busy,setBusy]=useState(false);
  const action=async(type,local)=>{if(!state.id)return;setBusy(true);try{const r=await fetch('/api/admin-users',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:state.id,action:type})});if(r.ok&&local)save({...state,...local});}finally{setBusy(false)}};
  return <div className="row-btns wrap"><button className="secondary" disabled={busy} onClick={()=>setModal?.({text:'Очистити твою історію навчання? Цю дію не можна скасувати.',onYes:()=>action('clear_history',{history:[]})})}>Очистити історію</button><button className="secondary" disabled={busy} onClick={()=>setModal?.({text:'Обнулити mastery та SRS? Цю дію не можна скасувати.',onYes:()=>action('reset_srs',{mastery:{},srs:{},attempts:{}})})}>Обнулити mastery/SRS</button><button className="secondary" disabled={busy} onClick={()=>setModal?.({text:'Обнулити XP? Цю дію не можна скасувати.',onYes:()=>action('reset_xp',{xp:0,todayXp:0})})}>Обнулити XP</button></div>;
}

function AboutPage() {
  const changelog = [
    {v:'2.5.0', items:['Admin 2.0: bootstrap першого admin, рольова модель, 2FA/TOTP, session hardening та audit','Chat Security 2.0: fingerprints, key rotation, multiple devices, revoke device, encrypted attachments та integrity hash','Security Lab: Playwright E2E + auth/brute-force/session/privilege/XSS/CSRF/IDOR/fuzz/rate-limit regression tests','PWA / Offline видалено: English Flow працює як звичайний online web-app.']},
    {v:'2.4.0', items:['E2E chat: P-256 device-only keys, AES-GCM ciphertext у Neon, сервер не отримує plaintext','Admin/Stats: recovery після session expiry, monitoring errors та стабільний повторний вхід']},
    {v:'2.3.0', items:['Стабілізація Learning Engine: помилка підготовки уроку більше не зависає назавжди','Сервер перевіряє правильність відповіді, а не довіряє client-side correct','Захист уроку від відповідей по словах, яких немає в конкретній сесії','Notion Sync: безпечне оновлення, помилка не маскується старим JSON','Realtime status + ping у «Про додаток»','Chat: realtime + HTTP fallback та privacy/block checks','Адмін: 3 тестові UI-дизайни, custom modals, стабільне повторне блокування','Єдина версія інтерфейсу v2.3.0 та AI project instructions']},
    {v:'2.2.2', items:['Vercel Hobby: 25 API handlers зведено до 1 Serverless Function без втрати /api/* маршрутів','Preview deployment успішно збирається на Hobby plan']},
    {v:'2.2.1', items:['Security audit виправлено для Windows paths','Lockfile/dependencies актуалізовано','Static audit: client XP/admin bearer/password persistence/HARD fallback']},
    {v:'2.2.0', items:['Product & Learning Analytics 1–17','Retention, SRS, vocabulary, social, security та system metrics','Admin monitoring і analytics cleanup foundation']},
    {v:'2.1.0', items:['Production Neon architecture','Server-authoritative XP/SRS/progress','Friends, challenges, chat, privacy, reports','Admin sessions + audit logs']},
    {v:'2.0.0', items:['Neon-backed application source of truth','Idempotent progress events','Lesson sessions + anti-cheat limits','Persistent achievements та cross-device sync']},
    {v:'1.8-beta', items:['Vercel + Neon PostgreSQL','Повний Notion → Neon sync','Cloud profile sync','Fix Vercel JSX build','Lesson на актуальному словнику']},
    {v:'1.6-beta', items:['Фікс інкогніто/реєстрації (onDone profile)','Корона Boss','Ліани-емодзі','Sprint/Match hardening','RPG профіль','About compact','Бейджі текст знизу']},
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
        <p className="muted">Версія інтерфейсу: <b>v{VERSION}</b></p>
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
  useEffect(()=>{if(!modal)return;const onKey=e=>{if(e.key==='Escape')onClose()};document.addEventListener('keydown',onKey);return()=>document.removeEventListener('keydown',onKey)},[modal,onClose]);
  if (!modal) return null;
  const error=modal.type==='error';
  return <div className="ef-modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div className="ef-modal card" role="dialog" aria-modal="true" aria-labelledby="ef-modal-title" onMouseDown={e=>e.stopPropagation()}><h2 id="ef-modal-title">{modal.title || (error?'Помилка':'Підтвердження')}</h2><p>{modal.text}</p><div className="row-btns"><button className={error?'primary':'secondary'} type="button" onClick={onClose}>{error?'Закрити':'Скасувати'}</button>{!error&&<button className="primary" type="button" onClick={()=>{modal.onYes?.();onClose()}}>Так, продовжити</button>}</div></div></div>;
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
          <UiSelect value={state.soundPack || 'auto'} onChange={v=>upd({soundPack:v})} options={[{value:'auto',label:'Авто (як UI скін)'},{value:'classic',label:'Classic'},{value:'neon',label:'Neon digital blip'},{value:'paper',label:'Paper soft'},{value:'candy',label:'Candy soft'}]}/>
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
          <UiSelect value={state.compareMode || 'global'} onChange={v=>upd({compareMode:v})} options={[{value:'global',label:'Зі середнім усіх гравців'},{value:'friend',label:'З конкретним другом'},{value:'off',label:'Вимкнено'}]}/>
          {(state.compareMode === 'friend') && (
            <>
              <label>Нік друга</label>
              <input className="search" value={state.compareFriend || ''} onChange={e => upd({compareFriend: e.target.value})} placeholder="nick_друга"/>
            </>
          )}
          <p className="muted small">Порівняння тепер працює через серверний рейтинг, а не локальні профілі.</p>
        </div>
        <PrivacySettings />
      </div>
    </section>
  );
}

function FriendsPage({state}) {
  const [q,setQ]=useState(''),[msg,setMsg]=useState(''),[chatWith,setChatWith]=useState(null),[text,setText]=useState(''),[friends,setFriends]=useState([]),[board,setBoard]=useState([]),[messages,setMessages]=useState([]),[busy,setBusy]=useState(false),[rt,setRt]=useState('offline'),[peerDevices,setPeerDevices]=useState([]),[myDevices,setMyDevices]=useState([]),[security,setSecurity]=useState(''),[peerFp,setPeerFp]=useState(''),[trusted,setTrusted]=useState(''),[attachment,setAttachment]=useState(null);
  const rtRef=useRef(null),identityRef=useRef(null),friendsRef=useRef([]);
  const load=useCallback(async()=>{if(state.guest)return;try{const [f,b]=await Promise.all([getFriends(state.nick),friendsLeaderboard(state.nick)]);setFriends(f||[]);friendsRef.current=f||[];setBoard(b||[])}catch(e){emitSiteError(e.message||'Не вдалося завантажити друзів','Друзі')}},[state.nick,state.guest]);
  const loadDevices=useCallback(async()=>{if(state.guest)return;try{const identity=await ensureChatIdentity();identityRef.current=identity;await registerChatDevice(await publicKeyPayload());setMyDevices(await getMyChatDevices());setSecurity('E2E v2 · пристрій активний')}catch(e){if(e.status===401)return;setSecurity('E2E недоступний');emitSiteError(e.message||'Не вдалося зареєструвати E2E пристрій','Безпека чату')}},[state.guest]);
  useEffect(()=>{load();loadDevices();if(state.guest)return;let alive=true;const r=createRealtime({onStatus:setRt,onMessage:async m=>{if(m.type==='chat'&&m.message){let item=m.message;try{const sender=friendsRef.current.find(f=>String(f.id)===String(item.sender_id));const nick=sender?.nick||chatWith;if(nick){const ds=await getChatDevices(nick);const d=ds.find(x=>String(x.device_id)===String(item.sender_device_id))||ds[0];if(d?.public_key)item={...item,text:await decryptChatText(item,d.public_key)}}}catch{item={...item,text:'🔒 Не вдалося розшифрувати'}}if(alive)setMessages(x=>x.some(v=>v.id===item.id)?x:[...x,item])}if(m.type==='error')emitSiteError(m.error||'Realtime chat error','Чат')}});rtRef.current=r;return()=>{alive=false;r.close()}},[state.guest,state.nick]);
  useEffect(()=>{if(!chatWith||state.guest)return;let alive=true;(async()=>{try{const ds=await getChatDevices(chatWith);if(!ds.length){setPeerDevices([]);setPeerFp('');setTrusted('');setMessages([]);setSecurity('Друг ще не має активного E2E-пристрою');return}setPeerDevices(ds);const d=ds[0];const fp=await fingerprint(d.public_key);setPeerFp(fp);setTrusted(trustedKey(chatWith));const raw=await getChat(state.nick,chatWith);const decoded=await Promise.all((raw||[]).map(async m=>{const sender=ds.find(x=>String(x.device_id)===String(m.sender_device_id))||d;return {...m,text:m.ciphertext?await decryptChatText(m,sender.public_key):m.text||''}}));if(alive)setMessages(decoded);if(trustedKey(chatWith)&&trustedKey(chatWith)!==fp)setSecurity('⚠️ Ключ друга змінився');else setSecurity(`E2E v2 · fingerprint ${fp.slice(0,23)}`)}catch(e){if(alive){setMessages([]);emitSiteError(e.message||'Не вдалося завантажити чат','Чат')}}})();return()=>{alive=false}},[chatWith,state.nick]);
  useEffect(()=>{if(!chatWith||!rtRef.current)return;const friend=friends.find(f=>f.nick===chatWith);if(friend?.id)rtRef.current.send({type:'join_chat',userId:friend.id})},[chatWith,friends]);
  const add=async()=>{setBusy(true);const r=await addFriend(state.nick,q);setMsg(r.ok?'Запит надіслано ✓':(r.error||'Помилка'));if(r.ok){track('friend_request',{feature:'friends'});setQ('')}setBusy(false);load()};
  const send=async()=>{const t=text.trim();if(!chatWith||(!t&&!attachment))return;if(!peerDevices.length){emitSiteError('Одержувач не має активного E2E-пристрою','Чат');return}try{const payload=await encryptChatPayload(t,peerDevices);if(attachment){if(attachment.size>2*1024*1024)throw new Error('Вкладення максимум 2 MB');payload.attachment=await encryptAttachment(attachment,peerDevices)}const friend=friends.find(f=>f.nick===chatWith);let sent=null;if(!attachment&&friend?.id&&rt==='open'&&rtRef.current){const ok=rtRef.current.send({type:'chat',to:chatWith,...payload});if(!ok)sent=await sendChat(state.nick,chatWith,payload)}else sent=await sendChat(state.nick,chatWith,payload);if(sent){const shown={...sent,text:t,attachment_meta:payload.attachment?{name:payload.attachment.name,mime:payload.attachment.mime,size:payload.attachment.size}:null};setMessages(x=>x.some(v=>v.id===shown.id)?x:[...x,shown])}else if(rt!=='open')throw new Error('Не вдалося надіслати E2E повідомлення');track('chat_send',{realtime:rt,chars:t.length,e2e:true,attachment:!!attachment});setText('');setAttachment(null)}catch(e){emitSiteError(e.message||'Не вдалося надіслати повідомлення','Чат')}};
  const social=async(action)=>{if(!chatWith)return;try{await requestJson('/api/social',{method:'POST',body:JSON.stringify({nick:chatWith,action})});if(action==='block'){setChatWith(null);load()}}catch(e){emitSiteError(e.message,'Соціальні налаштування')}};
  const report=async()=>{if(!chatWith)return;try{await requestJson('/api/reports',{method:'POST',body:JSON.stringify({nick:chatWith,type:'user',reason:'Порушення правил'})});setMsg('Скаргу передано модераторам.')}catch(e){emitSiteError(e.message,'Скарга')}};
  const rotate=async()=>{try{const next=await rotateChatIdentity();await registerChatDevice(await publicKeyPayload());setMyDevices(await getMyChatDevices());setSecurity('Ключ пристрою оновлено · '+(await fingerprint(next.publicJwk)).slice(0,23));emitSiteToast('Ключ успішно ротовано ✓','ok')}catch(e){emitSiteError(e.message||'Не вдалося ротувати ключ','Безпека чату')}};
  const trust=()=>{trustKey(chatWith,peerFp);setTrusted(peerFp);setSecurity('✓ Fingerprint перевірено')};
  const openAttachment=async(m)=>{try{const sender=peerDevices.find(x=>String(x.device_id)===String(m.sender_device_id))||peerDevices[0];if(!sender?.public_key||!m.attachment_meta||!m.attachment_keys?.length)throw new Error('Немає зашифрованого вкладення для цього пристрою');const blob=await decryptAttachment({mime:m.attachment_meta.mime,keys:m.attachment_keys},sender.public_key);if(!blob)throw new Error('Цей пристрій не має ключа вкладення');const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=m.attachment_meta.name||'attachment';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}catch(e){emitSiteError(e.message||'Не вдалося розшифрувати вкладення','Чат')}};
  if(state.guest)return <section><Title title="Друзі" text="Друзі та чат доступні після входу в акаунт"/><div className="card muted">Гостьовий режим не зберігає соціальні дані в Neon.</div></section>;
  return <section className="fade-in"><Title title="Друзі" text="Neon-друзі, E2E realtime chat і змагання"/><div className="card"><span className="pill"><Wifi size={12}/> realtime: {rt}</span><span className="pill" style={{marginLeft:8}}>🔐 {security||'E2E перевіряється…'}</span></div>
    <div className="card chat-devices-card"><div className="realtime-head"><div><h2 style={{margin:0}}>Безпека чату 2.0</h2><p className="muted small">Ключі залишаються на пристроях. Сервер зберігає ciphertext.</p></div><button className="secondary" type="button" onClick={rotate}>Ротувати ключ</button></div><div className="device-list">{myDevices.map(d=><div className="device-row" key={d.device_id}><div><b>{String(d.device_id)===String(identityRef.current?.deviceId)?'Цей пристрій':'Інший пристрій'}</b><div className="muted small">v{d.key_version} · {new Date(d.updated_at).toLocaleString()}</div></div>{String(d.device_id)!==String(identityRef.current?.deviceId)&&<button className="secondary" type="button" onClick={async()=>{try{await revokeChatDevice(d.device_id);setMyDevices(await getMyChatDevices());emitSiteToast('Пристрій відкликано','ok')}catch(e){emitSiteError(e.message,'Пристрої')}}}>Відкликати</button>}</div>)}{!myDevices.length&&<p className="muted">E2E пристрій ще не зареєстровано.</p>}</div>{chatWith&&peerFp&&<div className={'fingerprint-box '+(trusted&&trusted!==peerFp?'changed':'')}><b>{trusted&&trusted!==peerFp?'⚠️ Цей ключ змінився':'Fingerprint друга'}</b><code>{peerFp}</code>{trusted===peerFp?<span className="pill ok">✓ Перевірено</span>:<button className="secondary" type="button" onClick={trust}>Позначити як перевірений</button>}</div>}</div>
    <div className="grid two"><div className="card"><h2>Додати друга</h2><div className="row-btns"><input className="search" value={q} onChange={e=>setQ(e.target.value)} placeholder="нік друга"/><button className="primary" disabled={busy||!q.trim()} onClick={add}>Додати</button></div>{msg&&<p className="muted">{msg}</p>}<ul className="friend-list">{friends.map(f=><li key={f.id||f.nick}><button type="button" className={'friend-item'+(chatWith===f.nick?' active':'')} onClick={()=>f.status==='accepted'&&setChatWith(f.nick)}><Users size={14}/> @{f.nick}{f.status==='pending'?' · запит':''}</button>{f.status==='pending'&&f.requested_by!==state.id&&<button className="secondary" onClick={async()=>{const r=await acceptFriend(state.nick,f.id);if(!r.ok)emitSiteError(r.error,'Друзі');load()}}>Прийняти</button>}</li>)}{!friends.length&&<li className="muted">Поки немає друзів</li>}</ul></div>
      <div className="card"><h2><MessageCircle size={18}/> Чат {chatWith?`з @${chatWith}`:''}</h2>{!chatWith?<p className="muted">Обери прийнятого друга зліва</p>:<><div className="chat-security"><b>🔐 End-to-end encrypted · v2</b><span className="muted small">AES-GCM · multi-device keys · integrity hash</span></div><div className="chat-box">{messages.map(m=><div key={m.id} className={'chat-msg'+(String(m.sender_id)===String(state.id)?' me':'')}><b>{String(m.sender_id)===String(state.id)?'Ти':`@${chatWith}`}</b> <span className="muted small">{new Date(m.created_at).toLocaleTimeString()}</span><div>{m.text}</div>{m.attachment_meta&&<div className="chat-attachment">📎 {m.attachment_meta.name} · {Math.round(Number(m.attachment_meta.size||0)/1024)} KB <button type="button" className="secondary attachment-open" onClick={()=>openAttachment(m)}>Розшифрувати</button></div>}</div>)}</div><div className="row-btns"><input className="search" value={text} maxLength={1000} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="зашифроване повідомлення"/><button className="secondary" type="button" onClick={()=>document.getElementById('ef-chat-attachment')?.click()}>📎</button><input id="ef-chat-attachment" hidden type="file" onChange={e=>setAttachment(e.target.files?.[0]||null)}/><button className="primary" disabled={!peerDevices.length||( !text.trim()&&!attachment)} onClick={send}>Надіслати</button></div>{attachment&&<div className="muted small">Вкладення: {attachment.name} · {Math.round(attachment.size/1024)} KB · буде зашифровано на пристрої</div>}<div className="row-btns wrap" style={{marginTop:8}}><button className="secondary" onClick={()=>social('mute')}>🔕 Mute</button><button className="secondary" onClick={()=>social('block')}>🚫 Block</button><button className="secondary" onClick={report}>⚑ Report</button></div></>}</div></div>{board.length>0&&<div className="card" style={{marginTop:16}}><h2>Рейтинг друзів</h2><div className="lb">{board.map((r,i)=><div className="lb-row" key={r.nick}><span>#{i+1}</span><b>@{r.nick}</b><span className="muted">{r.xp} XP · {r.streak}🔥</span></div>)}</div></div>}</section>;
}
function PrivacySettings(){
  const [s,setS]=useState(null);
  useEffect(()=>{fetch('/api/privacy',{credentials:'include'}).then(r=>r.json()).then(d=>setS(d.settings||{})).catch(()=>{})},[]);
  if(!s)return <div className="card"><h2>Приватність</h2><p className="muted">Завантаження…</p></div>;
  const update=(k,v)=>{const n={...s,[k]:v};setS(n);fetch('/api/privacy',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(n),credentials:'include'}).catch(()=>{})};
  return <div className="card"><h2><Eye size={18}/> Приватність</h2>{[['show_profile','Показувати профіль'],['show_leaderboard','Показувати мене в рейтингу'],['allow_friend_requests','Дозволяти запити в друзі'],['allow_messages','Дозволяти повідомлення'],['show_online','Показувати online'],['analytics_consent','Дозволяти анонімну аналітику']].map(([k,t])=><label className="row-check" key={k}><input type="checkbox" checked={s[k]!==false} onChange={e=>update(k,e.target.checked)}/>{t}</label>)}</div>;
}

function ChallengesPage({state}){
 const [rows,setRows]=useState([]),[title,setTitle]=useState(''),[metric,setMetric]=useState('xp'),[goal,setGoal]=useState(100),[busy,setBusy]=useState(false);
 const load=useCallback(()=>fetch('/api/challenges').then(r=>r.json()).then(d=>setRows(d.rows||[])).catch(()=>{}),[]); useEffect(()=>{load()},[load]);
 const create=async(kind='public')=>{setBusy(true);try{await requestJson('/api/challenges',{method:'POST',body:JSON.stringify({kind,metric,title:title||'Мій challenge',goal:Number(goal)||100,hours:24})});setTitle('');await load();emitSiteToast('Challenge створено ✓','ok')}catch(e){emitSiteError(e.message||'Не вдалося створити challenge','Challenges')}finally{setBusy(false)}};
 const join=async(id)=>{try{const r=await requestJson('/api/challenges',{method:'PATCH',body:JSON.stringify({id,action:'join'})});if(r.ok){await requestJson('/api/challenges',{method:'PATCH',body:JSON.stringify({id,action:'score'})});await load();emitSiteToast('Challenge оновлено ✓','ok')}}catch(e){emitSiteError(e.message||'Не вдалося приєднатися до challenge','Challenges')}};
 return <section className="fade-in"><Title title="Challenges" text="Окремі виклики та змагання між друзями"/><div className="card"><h2>Створити</h2><div className="grid two"><input className="search" value={title} onChange={e=>setTitle(e.target.value)} placeholder="Назва challenge"/><UiSelect value={metric} onChange={setMetric} options={[{value:'xp',label:'XP'},{value:'answers',label:'Відповіді'},{value:'accuracy',label:'Точність'},{value:'mastery',label:'Mastery'}]}/><input className="search" type="number" value={goal} onChange={e=>setGoal(e.target.value)}/><div className="row-btns"><button className="primary" disabled={busy} onClick={()=>create('public')}>Для всіх</button><button className="secondary" disabled={busy} onClick={()=>create('friend')}>Для друзів</button></div></div></div><div className="grid two">{rows.map(c=><div className="card challenge-card" key={c.id}><span className="pill">{c.kind}</span><h2>{c.title}</h2><p className="muted">{c.metric} · ціль {c.goal}</p><p className="muted small">до {new Date(c.ends_at).toLocaleString()}</p><button className="primary" disabled={c.joined} onClick={()=>join(c.id)}>{c.joined?'Ви берете участь':'Приєднатись'}</button></div>)}{!rows.length&&<div className="card muted">Активних challenges поки немає.</div>}</div></section>;
}

function CompareBlurb({state}) {
  const [rows,setRows]=useState([]);
  useEffect(()=>{if(state.guest||state.compareMode==='off')return;const fn=state.compareMode==='friend'?friendsLeaderboard(state.nick):cloudLeaderboard();fn.then(setRows).catch(()=>setRows([]))},[state.nick,state.compareMode]);
  if(state.compareMode==='off')return null;
  if(state.compareMode==='friend'&&state.compareFriend){const f=rows.find(x=>String(x.nick).toLowerCase()===String(state.compareFriend).toLowerCase());if(!f)return <p className="muted">@{state.compareFriend}: даних ще немає</p>;const diff=(state.xp||0)-(f.xp||0);return <p className="muted">Порівняння з @{f.nick}: ти {diff>=0?'вище':'нижче'} на {Math.abs(diff)} XP</p>}
  if(!rows.length)return <p className="muted">Рейтинг завантажується…</p>;
  const avg=Math.round(rows.reduce((a,x)=>a+(x.xp||0),0)/rows.length),diff=(state.xp||0)-avg;return <p className="muted">Середнє XP у рейтингу: {avg} · ти {diff>=0?'+':''}{diff}</p>;
}

function PlayerDBSearch({current, save}) {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState([]);
  useEffect(() => {
    (async () => {
      const list = await dbListProfiles();
      setRows(list || []);
    })();
  }, [current.xp, current.nick]);
  const filtered = rows.filter(r => !q || String(r.nick||'').toLowerCase().includes(q.toLowerCase()) || String(r.name||'').toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <input className="search" placeholder="Пошук за ніком…" value={q} onChange={e => setQ(e.target.value)}/>
      <div className="player-db-list">
        {filtered.length === 0 && <p className="muted">Немає профілів у IndexedDB (зʼявляться після входів на цьому пристрої).</p>}
        {filtered.map(r => (
          <div key={r.nick} className="word-row card" style={{marginTop:8}}>
            <div>
              <b>{r.name || r.nick}</b> <span className="muted">@{r.nick}</span>
              <div className="muted small">{r.xp||0} XP · streak {r.streak||0}</div>
            </div>
            <button type="button" className="secondary" onClick={() => {
              if (r.nick === current.nick) {
                save({...r, xp: 0, todayXp: 0, mastery: {}, srs: {}, history: [], badges: [], attempts: {}});
              }
            }}>Обнулити XP</button>
          </div>
        ))}
      </div>
    </div>
  );
}
function EmojiPulse({state}) {
  const total=(state.history||[]).length, correct=(state.history||[]).filter(h=>h.correct).length, pct=total?Math.round(correct/total*100):0;
  const emojis= pct>=90?['🔥','😎','🚀','🧠','🏆']: pct>=70?['🙂','💪','⚡','🎯','✨']:['🌱','🧩','📚','💡','🎮'];
  return <div className="emoji-pulse card" aria-label="Навчальний настрій"><div className="emoji-orbit">{emojis.map((e,i)=><span key={i} style={{'--i':i}}>{e}</span>)}</div><div><b>{pct>=90?'Вогонь!':pct>=70?'Гарний темп':'Починаємо розігрів'}</b><div className="muted small">Твоя точність {pct}% · streak {state.streak||0} 🔥</div></div></div>;
}

function RealtimeStatusPanel(){
  const [status,setStatus]=useState('offline'),[lastPing,setLastPing]=useState(null),[pingBusy,setPingBusy]=useState(false);
  const ref=useRef(null);
  useEffect(()=>{const r=createRealtime({onStatus:setStatus,onMessage:m=>{if(m.type==='pong'&&m.clientTs){setLastPing(Date.now()-m.clientTs);setPingBusy(false)}}});ref.current=r;return()=>r.close()},[]);
  const ping=()=>{setPingBusy(true);const sent=ref.current?.send({type:'ping',clientTs:Date.now()});if(!sent){setPingBusy(false);emitSiteToast('Realtime ще не підключений','info');return}setTimeout(()=>setPingBusy(false),3000)};
  return <div className="card realtime-panel"><div className="realtime-head"><div><h3 style={{margin:0}}>Realtime</h3><span className={'realtime-dot '+status}></span><span className="muted small">{status}</span></div><button className="secondary" type="button" onClick={ping} disabled={pingBusy}>{pingBusy?'Перевірка…':'Перевірити ping'}</button></div><p className="muted small">Підключення перевіряється автоматично. Ping показує час round-trip до realtime-сервера.</p>{lastPing!==null&&<b>{lastPing} ms</b>}</div>;
}

function Title({title, text}) { return <div className="title"><h1>{title}</h1><p className="muted">{text}</p></div>; }

function ModeBars({history}) {
  const map = {};
  (history || []).forEach(h => {
    const m = h.mode || 'sprint';
    map[m] = (map[m] || 0) + 1;
  });
  const entries = Object.entries(map).sort((a,b) => b[1]-a[1]);
  const max = Math.max(1, ...entries.map(e => e[1]));
  if (!entries.length) return <p className="muted">Ще немає даних</p>;
  return (
    <div className="mode-bars">
      {entries.map(([k,v]) => (
        <div key={k} className="mode-row">
          <span className="mode-name">{k}</span>
          <div className="mode-track"><i style={{width: (v/max*100) + '%'}}/></div>
          <span className="mode-n">{v}</span>
        </div>
      ))}
    </div>
  );
}
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
