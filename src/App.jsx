import React, {useEffect, useMemo, useState, useCallback, useRef, lazy, Suspense} from 'react';
import {BarChart3, BookOpen, Check, CheckCircle2, ChevronRight, ChevronDown, Flame, Home, Lock, Menu, Moon, Palette, Play, RotateCcw, Settings, Sun, Target, Trophy, User, Volume2, X, XCircle, Shield, SlidersHorizontal, Brain, Sparkles, Keyboard, Layers, Award, Cloud, Users, MessageCircle, Ghost, VolumeX, Swords, ShieldAlert, Eye, Bell, Wifi} from 'lucide-react';
import {words as fallbackWords, rules, BADGES, LEAGUES, leagueForXp} from './data';
import {notionWords, notionSyncMeta} from './notionWords.generated';
import { Analytics } from '@vercel/analytics/react';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import {saveProfile, loadProfile, getActiveNick, cloudPull, cloudPush, cloudConfigured, isNickTaken, registerNick, setGuestSession, isGuestSession, getFriends, addFriend, acceptFriend, getChat, sendChat, registerChatDevice, getChatDevice, getChatDevices, getMyChatDevices, revokeChatDevice, friendsLeaderboard, getDailyAverage, ensureDailyAverage, serverAuth, loadCloudVocabulary, cloudRecordProgress, cloudStartLesson, cloudFinishLesson, flushProgressQueue, serverMe, loadServerConfig, cloudLeaderboard, getWordIdByText, getGamification, postGamification, getPublicProfile, serverLogout, changePassword, getRecoveryQuestion, resetPasswordWithRecovery, setRecoveryQuestion} from './lib/storage';
import {onCorrect as srsOk, onWrong as srsBad, isDue, todayStr} from './lib/srs';
import {dbPutProfile, dbGetProfile, dbListProfiles, dbSaveWords, dbLoadWords} from './lib/db.js';
import {createRealtime} from './lib/realtime.js';
import {ensureChatIdentity,publicKeyPayload,encryptChatPayload,decryptChatText,encryptAttachment,decryptAttachment,fingerprint,rotateChatIdentity,trustKey,trustedKey,untrustKey} from './lib/e2e-chat.js';
import {track} from './lib/analytics.js';


/** Roadmap in admin — remove only when user asks by title */
const ROADMAP_ITEMS = [
  {v:'2.9.0', title:'Gamification Pro: Leagues (100-3500+ XP), Streak Freeze auto-shield, Quests, Gift Chest, Badges, Forgot Password & 3 Radical Layouts', status:'done'},
  {v:'2.8.0', title:'Fix Lesson loading, Logout button & profile isolation, simple reliable Chat, Live Realtime 5s, Custom Checkboxes & 3 new radical interfaces, Password change', status:'done'},
  {v:'2.7.0', title:'Gamification v3: Leagues, Streak Freeze, Daily Quests, Gift Box, Public Profiles', status:'done'},
  {v:'2.6.1', title:'Fix 1/10 counter, auto-advance, universal Notion sync & UI-UX polish', status:'done'},
  {v:'2.6.0', title:'Bugfix & stability: correct learned/SRS counts, guest mode, session UX, cloud-only leaderboard', status:'done'},
  {v:'2.5.0', title:'Admin 2.0: bootstrap, roles, 2FA/TOTP, session hardening and Security Lab', status:'done'},
  {v:'2.5.0', title:'Chat Security 2.0: fingerprints, key rotation, multi-device, revoke and encrypted attachments', status:'done'},
  {v:'2.5.0', title:'Playwright E2E + security regression suite: auth, IDOR, XSS, CSRF, fuzz and rate limits', status:'done'},
  {v:'2.4.0', title:'Admin/Stats lazy loading + security/session recovery', status:'done'},
  {v:'2.3.0', title:'Learning Engine: no endless loading + server answer verification', status:'done'},
  {v:'2.3.0', title:'Lesson session freeze: exact word set stored in DB', status:'done'},
  {v:'2.3.0', title:'Safe Notion sync + admin-only sync metadata', status:'done'},
  {v:'2.3.0', title:'Admin security hardening + session expiry recovery', status:'done'},
  {v:'2.3.0', title:'Realtime status + ping + chat privacy parity', status:'done'},
  {v:'2.3.0', title:'Custom dropdowns/modals + 3 admin test designs', status:'done'},
  {v:'2.3.0', title:'RPG profile + animated emoji feedback on Home/Stats', status:'done'},
  {v:'2.2.2', title:'Vercel Hobby: 1 Serverless Function gateway', status:'done'},
  {v:'2.2.0', title:'Product & Learning Analytics 1–17', status:'done'},

  {v:'future', title:'WebAuthn/passkeys + verified device signatures', status:'planned'},
];

const VERSION = '2.9.0';
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
  theme: 'system', skin: 'classic', layout: 'sidebar', customTheme: {accent: '#22a06b', bg: '#f6f8f6', surface: '#ffffff'},
  admin: {...defaultAdmin},
  quiet: false, sfx: true, soundPack: 'auto', guest: false, gamesPlayed: 0,
  compareMode: 'global', compareFriend: '', midnightSnap: null, badgeStyle: 'neo',
  freezeCount: 0, recoveryCode: '', recoveryQuestion: '',
  settings: { keyboardHints: true, staggerList: true }
});
// Resolve a word's progress key across id schemes. The cloud marks each word by its
// Notion page id (notion_id), but the bundled/IndexedDB copies historically used
// "n1..n333" or legacy integer ids — so counts silently read 0 when the two disagree.
// Fall back through a word-text → notion_id index so "Вивчено / SRS due" are right
// no matter which word source renders, and T0D0AY no longer flashes zero twice.
const progKey = (w, mastery, srs) => {
  const m = mastery || {}, s = srs || {};
  const id = String((w && (w.notion_id || w.id)) || '');
  if (id && (m[id] != null || s[id] != null)) return id;
  const t = w ? String(w.word || '').trim().toLowerCase() : '';
  const nid = t ? getWordIdByText()[t] : '';
  if (nid && (m[nid] != null || s[nid] != null)) return nid;
  return id || nid;
};

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
    if (res.status===401 && !String(path).startsWith('/api/auth') && !String(path).startsWith('/api/admin')) {
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
function computeBadges(state, gamification) {
  const learned = Object.values(state.mastery || {}).filter(v => v >= (state.admin?.masteryThreshold || 8)).length;
  const earned = new Set(state.badges || []);
  const add = id => earned.add(id);
  if ((state.history || []).length > 0) add('first_steps');
  if ((state.streak || 0) >= 3) add('streak_3');
  if ((state.streak || 0) >= 7) add('streak_7');
  if (learned >= 20) add('words_20');
  if (learned >= 50) add('words_50');
  if (learned >= 100) add('word_wizard');
  if ((state.xp || 0) >= 200) add('league_silver');
  if ((state.xp || 0) >= 500) add('xp_500');
  if ((state.xp || 0) >= 1000) add('league_platinum');
  if ((state.xp || 0) >= 2000) add('league_diamond');
  if ((state.history || []).some(h => h.mode === 'dictation')) add('dictation');
  if ((state.history || []).some(h => h.mode === 'match' && h.correct)) add('match_master');
  if ((state.freezeCount || 0) > 0 || (gamification?.freezeCount || 0) > 0) add('freeze_master');
  return [...earned];
}

function LayoutSwitcher({layout, onSelect}) {
  const layouts = [
    {id: 'sidebar', label: 'Сайдбар', icon: '📑'},
    {id: 'top-nav', label: 'Верхній', icon: '🧭'},
    {id: 'bottom-dock', label: 'Док', icon: '⚓'},
    {id: 'zen', label: 'Дзен', icon: '🧘'}
  ];
  return (
    <div className="layout-switcher" title="Структурне розташування меню">
      {layouts.map(l => (
        <button
          key={l.id}
          type="button"
          className={'layout-btn' + ((layout || 'sidebar') === l.id ? ' active' : '')}
          onClick={() => onSelect(l.id)}
          title={`Макет: ${l.label}`}
        >
          <span>{l.icon}</span> <span>{l.label}</span>
        </button>
      ))}
    </div>
  );
}

function Sidebar({mobile, setMobile, page, nav, onLogout}) {
  return (
    <aside className={'sidebar' + (mobile ? ' open' : '')}>
      <div className="brand" onClick={() => nav('dashboard')} style={{cursor:'pointer'}}><span className="brand-mark">EF</span><span>English Flow</span></div>
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
      {onLogout && (
        <button className="nav nav-logout" onClick={onLogout} title="Вийти з акаунту" type="button">
          <XCircle size={18}/>Вихід
        </button>
      )}
    </aside>
  );
}

function TopNavHeader({state, page, nav, onLogout, layout, setLayout}) {
  return (
    <header className="top-nav-header">
      <div className="brand" onClick={() => nav('dashboard')} style={{cursor:'pointer'}}>
        <span className="brand-mark">EF</span>
        <span>English Flow</span>
      </div>
      <nav className="top-nav-tabs">
        {[
          ['dashboard', Home, 'Головна'],
          ['learn', Play, 'Вчити'],
          ['vocabulary', BookOpen, 'Слова'],
          ['review', RotateCcw, 'SRS'],
          ['leaderboard', Trophy, 'Рейтинг'],
          ['badges', Award, 'Бейджі'],
          ['stats', BarChart3, 'Статистика'],
          ['friends', Users, 'Друзі'],
          ['profile', User, 'Профіль'],
          ['settings', Settings, 'Опції'],
          ['admin', Shield, 'Адмін']
        ].map(([id, I, t]) => (
          <button key={id} className={'top-nav-tab' + (page === id ? ' active' : '')} onClick={() => nav(id)} type="button">
            <I size={15}/> <span>{t}</span>
          </button>
        ))}
      </nav>
      <div className="header-stats">
        <LayoutSwitcher layout={layout} onSelect={setLayout} />
        <span>🔥 {state.streak}</span>
        <span>⚡ {state.xp} XP</span>
        <button className="btn-logout-header" onClick={onLogout} title="Вийти з акаунту" type="button">
          <XCircle size={15}/> <span>Вихід</span>
        </button>
      </div>
    </header>
  );
}

function BottomDock({page, nav, onLogout}) {
  return (
    <nav className="command-dock">
      {[
        ['dashboard', Home, 'Головна'],
        ['learn', Play, 'Вчити'],
        ['vocabulary', BookOpen, 'Слова'],
        ['review', RotateCcw, 'SRS'],
        ['leaderboard', Trophy, 'Рейтинг'],
        ['badges', Award, 'Бейджі'],
        ['friends', Users, 'Друзі'],
        ['profile', User, 'Профіль'],
        ['settings', Settings, 'Опції'],
        ['admin', Shield, 'Адмін']
      ].map(([id, I, t]) => (
        <button key={id} className={'dock-item' + (page === id ? ' active' : '')} onClick={() => nav(id)} type="button" title={t}>
          <I size={18}/>
          <span>{t}</span>
        </button>
      ))}
      <div className="dock-divider" />
      <button className="dock-item" onClick={onLogout} type="button" title="Вийти" style={{color:'var(--danger, #ef4444)'}}>
        <XCircle size={18}/>
        <span>Вихід</span>
      </button>
    </nav>
  );
}

function ZenHeader({state, page, nav, onLogout, layout, setLayout, zenOpen, setZenOpen}) {
  return (
    <>
      <div className="zen-header">
        <button className="secondary" onClick={() => setZenOpen(true)} type="button" style={{display:'inline-flex',alignItems:'center',gap:6}}>
          <Menu size={16}/> <span>Меню</span>
        </button>
        <div style={{fontWeight:600}}>
          <span>English Flow</span>
          <span className="muted"> · {page}</span>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <LayoutSwitcher layout={layout} onSelect={setLayout} />
          <span>⚡ {state.xp} XP</span>
          <button className="btn-logout-header" onClick={onLogout} title="Вийти" type="button">
            <XCircle size={15}/>
          </button>
        </div>
      </div>
      {zenOpen && (
        <div className="zen-drawer-overlay" onClick={() => setZenOpen(false)}>
          <div className="zen-drawer" onClick={e => e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
              <div className="brand"><span className="brand-mark">EF</span><span>English Flow</span></div>
              <button className="icon" onClick={() => setZenOpen(false)}><X size={18}/></button>
            </div>
            <div className="nav-section">НАВІГАЦІЯ</div>
            {[
              ['dashboard', Home, 'Головна'],
              ['learn', Play, 'Навчання'],
              ['vocabulary', BookOpen, 'Слова'],
              ['review', RotateCcw, 'SRS Повтор'],
              ['leaderboard', Trophy, 'Рейтинг'],
              ['badges', Award, 'Бейджі'],
              ['stats', BarChart3, 'Статистика'],
              ['friends', Users, 'Друзі'],
              ['profile', User, 'Профіль'],
              ['settings', Settings, 'Налаштування'],
              ['about', Sparkles, 'Про додаток'],
              ['admin', Shield, 'Адмін']
            ].map(([id, I, t]) => (
              <button key={id} className={'nav' + (page === id ? ' active' : '')} onClick={() => { nav(id); setZenOpen(false); }}>
                <I size={18}/> {t}
              </button>
            ))}
            <hr style={{margin:'12px 0'}}/>
            <button className="nav nav-logout" onClick={onLogout} type="button">
              <XCircle size={18}/> Вийти з акаунту
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function Layout({children, state, page, nav, mobile, setMobile, onLogout, layout, setLayout}) {
  const [zenOpen, setZenOpen] = useState(false);
  const curLayout = layout || state.layout || 'sidebar';

  if (curLayout === 'top-nav') {
    return (
      <div className="app" data-layout="top-nav">
        <main className="main">
          <TopNavHeader state={state} page={page} nav={nav} onLogout={onLogout} layout={curLayout} setLayout={setLayout} />
          {children}
        </main>
      </div>
    );
  }

  if (curLayout === 'bottom-dock') {
    return (
      <div className="app" data-layout="bottom-dock">
        <main className="main">
          <header>
            <div className="brand" onClick={() => nav('dashboard')} style={{cursor:'pointer'}}>
              <span className="brand-mark">EF</span>
              <span>English Flow</span>
            </div>
            <div>
              <b>{state.name || state.nick}</b>
              <span className="muted"> · @{state.nick}</span>
            </div>
            <div className="header-stats">
              <LayoutSwitcher layout={curLayout} onSelect={setLayout} />
              <span>🔥 {state.streak}</span>
              <span>⚡ {state.xp} XP</span>
              <button className="btn-logout-header" onClick={onLogout} title="Вийти з акаунту" type="button">
                <XCircle size={15}/> <span>Вихід</span>
              </button>
            </div>
          </header>
          {children}
          <BottomDock page={page} nav={nav} onLogout={onLogout} />
        </main>
      </div>
    );
  }

  if (curLayout === 'zen') {
    return (
      <div className="app" data-layout="zen">
        <main className="main">
          <ZenHeader state={state} page={page} nav={nav} onLogout={onLogout} layout={curLayout} setLayout={setLayout} zenOpen={zenOpen} setZenOpen={setZenOpen} />
          {children}
        </main>
      </div>
    );
  }

  // Default: sidebar
  return (
    <div className="app" data-layout="sidebar">
      <Sidebar mobile={mobile} setMobile={setMobile} page={page} nav={nav} onLogout={onLogout} />
      <main className="main">
        <header>
          <button className="icon mobile-only" onClick={() => setMobile(!mobile)}>{mobile ? <X/> : <Menu/>}</button>
          <div>
            <b>{state.name || state.nick}</b>
            {(String(state.nick||'').toLowerCase()==='boss' || String(state.name||'').toLowerCase()==='boss') && <span className="boss-badge" title="Verified">👑</span>}
            <span className="muted"> · @{state.nick}</span>
            {(String(state.nick||'').toLowerCase()==='boss' || String(state.name||'').toLowerCase()==='boss') && <span className="pill ok">verified</span>}
            {state.guest && <span className="pill guest-pill"><Ghost size={12}/> гість</span>}
          </div>
          <div className="header-stats">
            <LayoutSwitcher layout={curLayout} onSelect={setLayout} />
            <span>🔥 {state.streak}</span>
            <span>⚡ {state.xp} XP</span>
            <button className="btn-logout-header" onClick={onLogout} title="Вийти з акаунту" type="button">
              <XCircle size={15}/> <span>Вихід</span>
            </button>
          </div>
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
  // Gamification state
  const [gamification, setGamification] = useState(null);
  const [giftModal, setGiftModal] = useState(false);
  const [publicProfileNick, setPublicProfileNick] = useState(null);
  const refreshGamification = useCallback(async () => {
    if (state.guest) return;
    try { const g = await getGamification(); if (g?.ok) { setGamification(g); if (g.giftAvailable) setGiftModal(true); } } catch {}
  }, [state.guest]);
  useEffect(() => {
    const onExpired = e => {
      if (state.guest) return;
      const path = String((e && e.detail && e.detail.path) || '');
      // The lesson flow already surfaces a stale session inline with a retry.
      // Don't ALSO yank the user off the lesson onto the auth screen.
      if (path.startsWith('/api/lessons')) return;
      // For other resources keep the current page and offer a re-login button
      // instead of silently dumping the user onto the auth screen.
      setModal({type:'error',title:'Сесію завершено',text:'Сервер більше не приймає цю сесію. Увійди ще раз — локальний профіль залишиться на пристрої.',yes:'Увійти знову',onYes:()=>{setLessonCfg(null);setPage('onboarding')}});
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
  // Load gamification on page load for authenticated users
  useEffect(() => { if (state.nick && !state.guest) refreshGamification(); }, [state.nick, state.guest]);
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
    document.documentElement.dataset.layout = state.layout || 'sidebar';
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
  }, [state.theme, state.skin, state.layout, state.customTheme]);
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

  // Daily reset with automatic Streak Freeze shield
  useEffect(() => {
    if (state.today !== todayStr()) {
      const yesterdayXp = Number(state.todayXp || 0);
      let keptStreak = Number(state.streak || 1);
      let newFreezeCount = Number(state.freezeCount || 0);

      if (yesterdayXp === 0) {
        // Missed yesterday! Check if we have freeze protection
        const availableFreezes = (gamification?.freezeCount != null) ? Number(gamification.freezeCount) : newFreezeCount;
        if (availableFreezes > 0) {
          // Freeze protects streak!
          newFreezeCount = Math.max(0, availableFreezes - 1);
          postGamification('use_freeze').catch(() => {});
          emitSiteToast('❄️ Заморозка врятувала твій стрік від пропуску! Серію збережено.', 'ok');
        } else {
          // No freeze available, reset streak to 1
          keptStreak = 1;
          emitSiteToast('Стрік скинуто. Займайся щодня або придбай ❄️ Заморозку у Профілі!', 'warn');
        }
      } else {
        keptStreak = Math.max(1, (state.streak || 0) + 1);
      }

      save({
        ...state,
        today: todayStr(),
        todayXp: 0,
        streak: keptStreak,
        freezeCount: newFreezeCount
      });
      refreshGamification();
    }
  }, [state.today]);

  const activeWords = wordsLive?.length ? wordsLive : words;
  const activeCats = [...new Set(activeWords.map(w => w.category))].sort();
  const progressOf = (w) => ({ k: progKey(w, state.mastery, state.srs), m: state.mastery || {}, sp: state.srs || {} });
  const learnedCount = activeWords.filter(w => { const {k,m} = progressOf(w); return (m[k] || 0) >= state.admin.masteryThreshold; }).length;
  const dueCount = activeWords.filter(w => { const {k,m,sp} = progressOf(w); return isDue(sp[k], todayStr()) && (m[k] || 0) > 0; }).length;

  const startLesson = (mode, direction = 'en-ua', category = 'all') => {
    setLessonCfg({mode, direction, category});
    setPage('lesson');
  };

  const handleLogout = useCallback(async () => {
    try {
      await serverLogout();
    } catch {}
    setLessonCfg(null);
    setState(emptyState());
    setPage('onboarding');
    emitSiteToast('Ви вийшли з акаунту', 'info');
  }, []);

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
      <Layout state={state} page={page} nav={nav} mobile={mobile} setMobile={setMobile} onLogout={handleLogout} layout={state.layout || 'sidebar'} setLayout={(l) => save({...state, layout: l})}>
        {page === 'dashboard' && <Dashboard state={state} learned={learnedCount} due={dueCount} words={activeWords.length} onLearn={() => nav('learn')} onReview={() => nav('review')} cloudMsg={cloudMsg} quests={gamification?.quests} giftAvailable={gamification?.giftAvailable} onOpenGift={() => setGiftModal(true)} />}
        {page === 'learn' && <Learn state={state} cats={activeCats} onStart={startLesson} />}
        {page === 'vocabulary' && <Vocabulary state={state} setModal={setModal} wordsCatalog={activeWords} cats={activeCats} />}
        {page === 'review' && <ReviewPage state={state} due={dueCount} onStart={() => startLesson('srs', 'en-ua', 'all')} />}
        {page === 'stats' && <Stats state={state} learned={learnedCount} />}
        {page === 'badges' && <BadgesPage state={state} />}
        {page === 'problems' && <ProblemsPage state={state} save={save} wordsCatalog={wordsLive} onStart={(m,d,c) => { setLessonCfg({mode:m,direction:d,category:c}); setPage('lesson'); }} />}
        {page === 'leaderboard' && <Leaderboard state={state} gamification={gamification} onViewProfile={setPublicProfileNick} />}
        {page === 'settings' && <SettingsPage state={state} save={save} onLogout={handleLogout} />}
        {page === 'friends' && <FriendsPage state={state} />}
        {page === 'challenges' && <ChallengesPage state={state} />}
        {page === 'profile' && <Profile state={state} save={save} gamification={gamification} onRefreshGamification={refreshGamification} onLogout={handleLogout} />}
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
            onDone={() => { nav('dashboard'); refreshGamification(); }}
          />
        )}
      </Layout>
      <div className="version-badge">v{VERSION}</div>
      <Toast msg={toast} />
      <ConfirmModal modal={modal} onClose={() => setModal(null)} />
      {giftModal && <DailyGiftModal onClose={() => setGiftModal(false)} onOpen={async () => {
        try {
          const r = await postGamification('open_gift');
          if (r?.ok) {
            const msgs = {xp_100:'🎉 +100 XP!', xp_50:'✨ +50 XP!', xp_25:'🎊 +25 XP!', freeze:'❄️ +1 Заморозка стріку!'};
            emitSiteToast(msgs[r.prize] || '🎁 Приз отримано!', 'ok');
            if (r.xpGain > 0) save({...state, xp: (state.xp||0) + r.xpGain});
            confettiBurst();
            refreshGamification();
          }
        } catch {}
        setGiftModal(false);
      }} />}
      {publicProfileNick && <PublicProfileModal nick={publicProfileNick} onClose={() => setPublicProfileNick(null)} />}
      <Analytics />
    </>
  );
}

function ForgotPasswordModal({onClose, onDone}) {
  const [step, setStep] = useState(1);
  const [nick, setNick] = useState('');
  const [question, setQuestion] = useState('');
  const [hasQuestion, setHasQuestion] = useState(false);
  const [answerOrCode, setAnswerOrCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [success, setSuccess] = useState('');

  const lookupNick = async () => {
    const n = nick.trim();
    if (!n) { setErr('Вкажіть нік'); return; }
    setBusy(true); setErr('');
    try {
      const res = await getRecoveryQuestion(n);
      if (!res.ok) throw new Error(res.error || 'Користувача не знайдено');
      setQuestion(res.question || '');
      setHasQuestion(Boolean(res.hasQuestion));
      setStep(2);
    } catch (e) {
      setErr(e.message || 'Помилка пошуку акаунту');
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async () => {
    const n = nick.trim();
    const ac = answerOrCode.trim();
    if (!ac) { setErr('Вкажіть відповідь або 10-значний резервний код'); return; }
    if (newPassword.length < 8) { setErr('Новий пароль має бути не менше 8 символів'); return; }
    if (newPassword !== confirmPass) { setErr('Паролі не збігаються'); return; }
    setBusy(true); setErr('');
    try {
      const res = await resetPasswordWithRecovery(n, ac, newPassword);
      if (!res.ok) throw new Error(res.error || 'Помилка відновлення паролю');
      setSuccess('Пароль відновлено! Перенаправляємо на вхід…');
      setTimeout(() => {
        onDone(n);
      }, 1500);
    } catch (e) {
      setErr(e.message || 'Невірна відповідь або резервний код');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ef-modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="ef-modal card forgot-password-modal" role="dialog" aria-modal="true" onMouseDown={e => e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <h2 style={{margin:0}}>🔑 Відновлення паролю</h2>
          <button className="icon" type="button" onClick={onClose}><X size={18}/></button>
        </div>

        {success ? (
          <div style={{textAlign:'center',padding:'16px 0'}}>
            <div style={{fontSize:44,marginBottom:8}}>✅</div>
            <p style={{color:'var(--accent)',fontWeight:600}}>{success}</p>
          </div>
        ) : step === 1 ? (
          <div>
            <p className="muted">Введіть ваш нік, щоб перевірити секретне питання або використати резервний код відновлення:</p>
            <label>Нік акаунту</label>
            <input className="search" value={nick} onChange={e => setNick(e.target.value)} placeholder="твій_нік" autoFocus onKeyDown={e => e.key === 'Enter' && lookupNick()}/>
            {err && <p className="auth-err">{err}</p>}
            <div className="row-btns" style={{marginTop:16}}>
              <button className="secondary" type="button" onClick={onClose}>Скасувати</button>
              <button className="primary" type="button" disabled={busy} onClick={lookupNick}>
                {busy ? 'Пошук…' : 'Знайти акаунт'}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p className="muted" style={{marginBottom:10}}>Акаунт: <b>@{nick}</b></p>
            {hasQuestion ? (
              <div style={{background:'color-mix(in srgb, var(--surface) 50%, var(--border))',borderRadius:10,padding:'10px 14px',marginBottom:12}}>
                <small className="muted">Секретне питання:</small>
                <div style={{fontWeight:600,marginTop:2}}>{question}</div>
              </div>
            ) : (
              <p className="muted small" style={{marginBottom:12}}>ℹ️ Секретне питання не встановлено. Використайте 10-значний резервний код (EF-XXXX-XXXX).</p>
            )}

            <label>{hasQuestion ? 'Відповідь на питання АБО Резервний код' : 'Резервний код (EF-XXXX-XXXX)'}</label>
            <input className="search" value={answerOrCode} onChange={e => setAnswerOrCode(e.target.value)} placeholder={hasQuestion ? 'відповідь або EF-XXXX-XXXX' : 'EF-XXXX-XXXX'} autoFocus/>

            <label style={{marginTop:8}}>Новий пароль (мін. 8 символів)</label>
            <input className="search" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••"/>

            <label style={{marginTop:8}}>Підтвердження нового пароля</label>
            <input className="search" type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && handleReset()}/>

            {err && <p className="auth-err">{err}</p>}

            <div className="row-btns" style={{marginTop:16}}>
              <button className="secondary" type="button" onClick={() => setStep(1)}>Назад</button>
              <button className="primary" type="button" disabled={busy} onClick={handleReset}>
                {busy ? 'Збереження…' : 'Відновити пароль'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function NewAccountRecoveryModal({code, onProceed}) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="ef-modal-backdrop" role="presentation">
      <div className="ef-modal card" role="dialog" aria-modal="true" style={{maxWidth:480}}>
        <div style={{textAlign:'center',fontSize:44,marginBottom:8}}>🔐</div>
        <h2>Збережи свій код відновлення!</h2>
        <p className="muted">Це твій персональний 10-значний ключ відновлення доступу. Якщо забудеш пароль, ти зможеш миттєво відновити акаунт за цим кодом.</p>
        <div className="recovery-code-box">
          <span>{code}</span>
          <button className="secondary" type="button" onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
            {copied ? 'Скопійовано ✓' : 'Копіювати'}
          </button>
        </div>
        <p className="muted small">Код також завжди доступний у твоєму Профілі в будь-який момент.</p>
        <button className="primary full" type="button" onClick={onProceed}>
          Я зберіг код · Почати навчання 🚀
        </button>
      </div>
    </div>
  );
}

function Onboarding({onDone}) {
  const [mode, setMode] = useState('login'); // login | register
  const [nick, setNick] = useState('');
  const [name, setName] = useState('');
  const [pass, setPass] = useState('');
  const [secQuestion, setSecQuestion] = useState('Улюблене місто?');
  const [secAnswer, setSecAnswer] = useState('');
  const [forgotOpen, setForgotOpen] = useState(false);
  const [createdProfile, setCreatedProfile] = useState(null);
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
      if (remote) profile = {...emptyState(), ...remote, nick: n, name: remote.name || auth.user?.name || n, recoveryCode: auth.recovery_code || remote.recoveryCode};
      if (!profile) profile = loadProfile(n);
      if (!profile) profile = {...emptyState(), nick:n, name:auth.user?.name || n, id:auth.user?.id, role:auth.user?.role, recoveryCode: auth.recovery_code};
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
      const auth = await serverAuth('register', {
        nick: n,
        name: name.trim() || n,
        password: pass,
        recoveryQuestion: secAnswer.trim() ? secQuestion : null,
        recoveryAnswer: secAnswer.trim() ? secAnswer.trim() : null
      });
      if (!auth.ok) throw new Error(auth.error || 'Помилка реєстрації');
      setGuestSession(false);
      const base = emptyState();
      const profile = await registerNick(n, {
        ...base,
        nick: n,
        name: name.trim() || n,
        id: auth.user?.id,
        role: auth.user?.role,
        recoveryCode: auth.recovery_code,
        recoveryQuestion: secAnswer.trim() ? secQuestion : ''
      });
      if (auth.recovery_code) {
        setCreatedProfile(profile);
      } else {
        onDone(profile);
      }
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

        {mode === 'login' && (
          <button type="button" className="forgot-pass-btn" onClick={() => setForgotOpen(true)}>
            Забули пароль?
          </button>
        )}

        {mode === 'register' && (
          <div style={{marginTop: 8, padding:'10px 12px', background:'color-mix(in srgb, var(--surface) 40%, var(--border))', borderRadius: 12}}>
            <small className="muted" style={{display:'block',marginBottom:4}}>Секретне питання для відновлення (опційно):</small>
            <UiSelect
              value={secQuestion}
              onChange={setSecQuestion}
              options={[
                {value:'Улюблене місто?',label:'Улюблене місто?'},
                {value:'Перша школа або вчитель?',label:'Перша школа або вчитель?'},
                {value:'Кличка першого улюбленця?',label:'Кличка першого улюбленця?'},
                {value:'Улюблена страва або десерт?',label:'Улюблена страва або десерт?'},
                {value:'Дівоче прізвище матері?',label:'Дівоче прізвище матері?'}
              ]}
            />
            <input className="search" style={{marginTop:6}} value={secAnswer} onChange={e => setSecAnswer(e.target.value)} placeholder="Відповідь на питання" />
          </div>
        )}

        {err && <p className="auth-err">{err}</p>}
        <button className="primary full" type="button" disabled={busy} onClick={mode==='login'?doLogin:doRegister} style={{marginTop:12}}>
          {busy ? '…' : (mode==='login' ? 'Увійти' : 'Створити акаунт')}
        </button>
        <button className="secondary full guest-btn" type="button" onClick={guest}>
          <Ghost size={18}/> Увійти як гість
        </button>
      </div>

      {forgotOpen && (
        <ForgotPasswordModal
          onClose={() => setForgotOpen(false)}
          onDone={(recoveredNick) => {
            setForgotOpen(false);
            setNick(recoveredNick);
            setMode('login');
            setPass('');
            emitSiteToast('Пароль оновлено! Увійдіть з новим паролем', 'ok');
          }}
        />
      )}

      {createdProfile && (
        <NewAccountRecoveryModal
          code={createdProfile.recoveryCode}
          onProceed={() => {
            const p = createdProfile;
            setCreatedProfile(null);
            onDone(p);
          }}
        />
      )}
    </div>
  );
}
function LeagueBadge({xp, style={}}) {
  const l = leagueForXp(xp);
  return (
    <span className={'league-badge league-'+l.id} style={{background: l.gradient, ...style}} title={l.label}>
      {l.label}
    </span>
  );
}

function DailyQuests({quests}) {
  if (!quests || !quests.length) return null;
  const real = quests.filter(q => q.quest_type !== '_bonus');
  const allDone = real.length > 0 && real.every(q => q.completed);
  return (
    <div className="quests-panel card">
      <div className="quests-header">
        <span className="eyebrow">DAILY QUESTS</span>
        <span className="quest-date">{new Date().toLocaleDateString('uk-UA', {weekday:'short',day:'numeric',month:'short'})}</span>
        {allDone && <span className="pill ok">✓ Всі виконано!</span>}
      </div>
      <div className="quests-list">
        {real.map(q => {
          const pct = Math.min(100, Math.round((Number(q.progress)||0) / Math.max(1, Number(q.goal)) * 100));
          return (
            <div key={q.quest_type} className={'quest-item' + (q.completed ? ' completed' : '')}>
              <div className="quest-icon">{q.icon || '🎯'}</div>
              <div className="quest-body">
                <div className="quest-label">{q.label}</div>
                <div className="quest-track">
                  <div className="quest-bar"><i style={{width: pct+'%'}}/></div>
                  <span className="quest-count">{q.completed ? '✓' : `${q.progress}/${q.goal}`}</span>
                </div>
              </div>
              <div className="quest-xp">+{q.xp_reward} XP</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Dashboard({state, learned, due, words, onLearn, onReview, cloudMsg, quests, giftAvailable, onOpenGift}) {
  const league = leagueForXp(state.xp || 0);
  return (
    <section>
      <div className="announce card jungle-announce">
        <span className="vine-deco left" aria-hidden="true">🌿</span>
        <span className="vine-deco right" aria-hidden="true">🌿</span>
        <span className="eyebrow">UPDATE · v2.9.0</span>
        <h2>🏆 Ліги, Скриня, 3 Нові Макети та Захист Стріку</h2>
        <p>Оновлена система ліг по очках XP (100, 200, 500...), 3 структурні макети навігації (Сайдбар, Верхній, Док, Дзен), відновлення паролю та щоденні квести.</p>
      </div>

      {giftAvailable && (
        <div className="gift-banner card">
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <span style={{fontSize:32}} aria-hidden="true">🎁</span>
            <div>
              <div style={{fontWeight:700,fontSize:15}}>Твоя щоденна скриня готова до відкриття!</div>
              <p className="muted small" style={{margin:0}}>Відкрий зараз і отримай гарантований XP або заморозку стріку.</p>
            </div>
          </div>
          <button className="primary" type="button" onClick={onOpenGift} style={{whiteSpace:'nowrap'}}>
            🎁 Відкрити
          </button>
        </div>
      )}

      <div className="hero">
        <div>
          <span className="eyebrow">TODAY</span>
          <h1>Привіт, {state.name || state.nick} 👋</h1>
          <div className="hero-league-row">
            <LeagueBadge xp={state.xp || 0} />
            {state.streak > 0 && <span className="freeze-chip">🔥 {state.streak} днів</span>}
          </div>
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
      <DailyQuests quests={quests} />
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
  const [retry, setRetry] = useState(0);
  const [useLocalFallback, setUseLocalFallback] = useState(false);
  const catalog = (wordsCatalog && wordsCatalog.length) ? wordsCatalog : words;

  // Snapshot initial question pool ONCE when lesson starts or on retry.
  // CRITICAL: Do NOT list `state` in dependencies, otherwise every answer re-shuffles the quiz and resets to 1/10!
  const initialLocalItems = useMemo(() => {
    let pool = catalog;
    if (mode === 'srs') {
      const due = catalog.filter(w => { const k = progKey(w, state.mastery, state.srs); return isDue(state.srs[k], todayStr()) && (state.mastery[k] || 0) > 0; });
      pool = due.length ? due : catalog;
    } else if (mode === 'problems') {
      const stats = {};
      (state.history || []).forEach(h => { const id=String(h.word); if(!stats[id]) stats[id]={w:0,c:0}; if(h.correct) stats[id].c++; else stats[id].w++; });
      const hardIds = new Set(Object.entries(stats).filter(([,v]) => v.w >= 2 && v.w > v.c).map(([id]) => id));
      pool = catalog.filter(w => hardIds.has(progKey(w, state.mastery, state.srs) || String(w.id)));
      if (!pool.length) pool = []; 
    } else if (mode === 'long') {
      pool = catalog.filter(w => (w.word || '').replace(/\s/g, '').length > 6);
    }
    if (cfg.category && cfg.category !== 'all') pool = pool.filter(w => w.category === cfg.category);
    if (state.admin.shuffleQuestions !== false) pool = shuffle(pool);
    if (mode === 'match') return pool.slice(0, 6);
    return makeQuizItems(pool, state.admin.lessonSize, cfg.direction, 'all');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog, mode, cfg.direction, cfg.category, retry]);

  const items = (serverItems?.length && !useLocalFallback) ? serverItems : initialLocalItems;

  useEffect(() => {
    let cancelled = false;
    setLoadError(''); setLessonId(''); setServerItems(null); setUseLocalFallback(false);
    if (state.guest) return;
    if (!initialLocalItems.length) {
      const msg = mode==='problems' ? 'Поки немає проблемних слів. Вони зʼявляться після реальних помилок.' : mode==='srs' ? 'Наразі немає карток, які потрібно повторити.' : 'У словнику немає доступних слів для цього уроку.';
      setLoadError(msg); return;
    }
    // Fall back to local items if cloud session takes more than 6s so the user is never stuck
    const timer = setTimeout(() => {
      if (!cancelled) setUseLocalFallback(true);
    }, 6000);

    cloudStartLesson(mode, Math.min(initialLocalItems.length, 100), cfg.direction, cfg.category).then(r => {
      if (cancelled) return;
      clearTimeout(timer);
      setLoadError('');
      setLessonId(r.lessonId || '');
      if (Array.isArray(r.items) && r.items.length) {
        setServerItems(r.items);
      } else {
        setUseLocalFallback(true);
      }
    }).catch(e => {
      clearTimeout(timer);
      if (cancelled) return;
      if (initialLocalItems.length) {
        setUseLocalFallback(true);
      } else {
        setLoadError(e.status===401 ? 'Сесія закінчилась. Увійди знову.' : (e.message || 'Не вдалося створити захищену сесію.'));
      }
    });
    return () => { cancelled = true; clearTimeout(timer); };
  }, [mode, state.guest, cfg.direction, cfg.category, retry]);

  if (!state.guest && !useLocalFallback && (!lessonId || !serverItems?.length)) {
    return (
      <section>
        <button className="back" onClick={onExit}>← Назад</button>
        <div className="card lesson-loading-card">
          <h2>{loadError ? 'Не вдалося підготувати урок' : 'Готуємо персональний урок…'}</h2>
          <p className="muted">{loadError || 'Learning Engine підбирає слова та створює захищену сесію.'}</p>
          {loadError && (
            <div className="row-btns">
              <button className="primary" onClick={() => { setLoadError(''); setLessonId(''); setServerItems(null); setRetry(r => r + 1); }}>Спробувати ще раз</button>
              {initialLocalItems.length > 0 && (
                <button className="secondary" onClick={() => setUseLocalFallback(true)}>Грати офлайн</button>
              )}
              <button className="secondary" onClick={onExit}>Назад</button>
            </div>
          )}
        </div>
      </section>
    );
  }

  const lessonKey = `${lessonId || (useLocalFallback ? 'local' : 'init')}-${mode}-${cfg.direction || 'en-ua'}-${cfg.category || 'all'}-${retry}`;
  if (mode === 'match') return <MatchGame key={`match-${lessonKey}`} items={items} state={state} save={save} onExit={onExit} onDone={onDone} lessonId={lessonId} direction={cfg.direction} />;
  return <SprintGame key={`sprint-${lessonKey}`} items={items} mode={mode} state={state} save={save} onExit={onExit} onDone={onDone} lessonId={lessonId} direction={cfg.direction} />;
}

function SprintGame({items, mode, state, save, onExit, onDone, lessonId}) {
  // Freeze quiz list once per lesson mount
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
  const [combo, setCombo] = useState(0);
  const [comboPop, setComboPop] = useState(null);
  const pendingProgress = useRef([]);
  const autoAdvanceTimer = useRef(null);
  const feedbackRef = useRef(null);

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
    if (ok) {
      setOkCount(c => c + 1);
      postGamification('quest_progress', { quest_type: 'streak_answers', delta: 1 }).catch(() => {});
      if (mode === 'sprint' && points > 0) postGamification('quest_progress', { quest_type: 'sprint', delta: points }).catch(() => {});
      setCombo(prev => {
        const next = prev + 1;
        if (next > 0 && next % 5 === 0) {
          // Festive mini-celebration (confetti burst) for every 5 perfect answers in a row!
          confettiBurst();
          setComboPop(`${next} ПОСПІЛЬ! 🔥`);
          emitSiteToast(`Серія: ${next} правильних відповідей поспіль! 🔥`, 'ok');
          setTimeout(() => setComboPop(null), 2200);
        }
        return next;
      });
    } else {
      setBadCount(c => c + 1);
      setSlowAudio(true);
      setCombo(0);
    }
    setScorePop({pts: points, ok, key: Date.now()});
    setMist(ok ? 'ok' : 'bad');
    playTone(ok);
    setTimeout(() => { setScorePop(null); setMist(null); }, 700);
  }, [mode, save, lessonId]);

  const goNext = useCallback(() => {
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = null;
    }
    const i = stepRef.current;
    const len = quizRef.current.length;
    setPicked(null);
    setScorePop(null);
    setMist(null);
    if (i + 1 >= len) {
      setDone(true);
    } else {
      setStep(i + 1);
      try {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch {}
    }
  }, []);

  const answer = useCallback((opt) => {
    if (pickedRef.current !== null) return;
    const wordObj = quizRef.current[stepRef.current];
    if (!wordObj) return;
    const ok = opt === wordObj.answer;
    setPicked(opt);
    applyAnswer(ok, wordObj, opt);

    // Auto-advance to next question upon correct answer after pleasant 1050ms pause
    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    if (ok) {
      autoAdvanceTimer.current = setTimeout(() => {
        goNext();
      }, 1050);
    }
  }, [applyAnswer, goNext]);

  // Clean up auto-advance timer on unmount
  useEffect(() => {
    return () => {
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    };
  }, []);

  // Auto-scroll feedback into view so Next button is immediately visible on mobile
  useEffect(() => {
    if (picked !== null && feedbackRef.current) {
      try {
        feedbackRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } catch {}
    }
  }, [picked]);

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
            postGamification('quest_progress', { quest_type: 'lesson', delta: 1 }).catch(() => {});
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
          {combo >= 2 && (
            <span className="pill combo-pill" key={'combo'+combo}>
              <Flame size={12} className="fire-icon"/> {combo} поспіль
            </span>
          )}
          <span className={'points' + (picked != null ? (correct ? ' up' : ' down') : '')}>
            {picked != null ? (correct ? `+${state.admin.correctPoints}` : `${state.admin.wrongPoints}`) : '·'}
          </span>
        </div>
        {comboPop && (
          <div className="combo-toast-banner" key={comboPop}>
            <Sparkles size={16} className="sparkle-ico"/>
            <span>{comboPop}</span>
            <Sparkles size={16} className="sparkle-ico"/>
          </div>
        )}
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
            const ok = val.trim().toLowerCase() === String(w.word || w.answer).trim().toLowerCase();
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
          <div ref={feedbackRef} className={'feedback ' + (correct ? 'ok' : 'bad')}>
            <div className="feedback-row">
              {correct ? <CheckCircle2 className="feedback-icon ok" size={24}/> : <XCircle className="feedback-icon bad" size={24}/>}
              <div className="feedback-copy">
                <b>{correct ? 'Чудово! Правильно' : 'Не зовсім так'}</b>
                <p className="feedback-hint">{w.explanation || w.translation}</p>
                <small className="muted">Mastery {masteryNow}/{state.admin.masteryThreshold}</small>
              </div>
            </div>
            {scorePop && (
              <div key={scorePop.key} className={'score-pop ' + (scorePop.ok ? 'ok' : 'bad')}>
                {scorePop.ok ? '+' : ''}{scorePop.pts}
              </div>
            )}
            <button className="primary next-btn pulse-on-answer" type="button" onClick={goNext}>
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
      <Title title="Словник" text={`${dict.length} слів · ${notionWords?.length ? 'Notion' : 'локальна база (синк пізніше)'}`}/>
      <div className="filters row">
        <input className="search" placeholder="Пошук…" value={q} onChange={e => setQ(e.target.value)}/>
        <UiSelect value={cat} onChange={setCat} options={[{value:'all',label:'Усі категорії'},...(cats || CATS).map(c=>({value:c,label:c}))]}/>
      </div>
      <div className="word-list">
        {f.map(w => {
          const m = state.mastery[progKey(w, state.mastery, state.srs)] || 0;
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

function Leaderboard({state, gamification, onViewProfile}) {
  const [tab, setTab] = useState('global');
  const [loading, setLoading] = useState(!gamification);
  const [rows, setRows] = useState(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      let g = gamification?.leaderboard?.global || [];
      let fr = gamification?.leaderboard?.friends || [];
      if (!g.length) {
        try { const r = await cloudLeaderboard(); if (Array.isArray(r)) g = r; } catch {}
      }
      if (!fr.length && !state.guest) {
        try { const f = await friendsLeaderboard(); if (Array.isArray(f)) fr = f; } catch {}
      }
      if (alive) {
        setRows({
          global: g.map(x => ({...x, xp: Number(x.xp)||0, league: leagueForXp(x.xp)})),
          friends: fr.map(x => ({...x, xp: Number(x.xp)||0, league: leagueForXp(x.xp)}))
        });
        setLoading(false);
      }
    };
    load();
    return () => { alive = false; };
  }, [gamification, state.guest]);

  const list = rows ? (tab === 'global' ? (rows.global || []) : (rows.friends || [])) : [];
  const podium = list.slice(0, 3);
  const rest = list.slice(3);

  const rankMedal = (i) => ['🥇','🥈','🥉'][i] || `#${i+1}`;

  return (
    <section className="fade-in">
      <Title title="Рейтинг" text="Глобальний та серед друзів · Ліги по очках XP" />

      {/* League chart */}
      <div className="league-chart card">
        <h3 style={{marginBottom:12}}>Система ліг</h3>
        <div className="league-tiers">
          {LEAGUES.slice().reverse().map(l => {
            const active = leagueForXp(state.xp||0).id === l.id;
            return (
              <div key={l.id} className={'league-tier' + (active ? ' active' : '')} title={l.min + '+ XP'}>
                <span className="league-tier-label" style={{background: l.gradient}}>{l.label}</span>
                <span className="league-tier-xp">{l.min === 0 ? '0+' : l.min+'+'} XP</span>
                {active && <span className="pill ok" style={{fontSize:10}}>Ти тут</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <div className="row-btns" style={{marginBottom:16}}>
        <button type="button" className={tab==='global'?'primary':'secondary'} onClick={()=>setTab('global')}>🌍 Глобальний</button>
        <button type="button" className={tab==='friends'?'primary':'secondary'} onClick={()=>setTab('friends')}>👥 Друзі</button>
      </div>

      {loading && <div className="card"><p className="muted">Завантаження рейтингу…</p></div>}

      {!loading && !list.length && (
        <div className="card">
          <p className="muted">{tab==='friends' ? 'Додай друзів, щоб побачити їх у рейтингу.' : 'Ще немає гравців у рейтингу.'}</p>
        </div>
      )}

      {/* Podium Top-3 */}
      {!loading && podium.length > 0 && (
        <div className="leaderboard-podium">
          {/* Silver (2nd) */}
          {podium[1] && (
            <div className="podium-slot podium-2" onClick={() => podium[1].nick && onViewProfile?.(podium[1].nick)}>
              <div className="podium-avatar">{podium[1].avatar || '🎓'}</div>
              <div className="podium-medal">🥈</div>
              <div className="podium-name">{podium[1].nick === state.nick ? '👤 Ти' : (podium[1].name || podium[1].nick)}</div>
              <LeagueBadge xp={podium[1].xp} style={{fontSize:10, padding:'2px 8px'}} />
              <div className="podium-xp">{podium[1].xp} XP</div>
              <div className="podium-bar h-2" />
            </div>
          )}
          {/* Gold (1st) */}
          {podium[0] && (
            <div className="podium-slot podium-1" onClick={() => podium[0].nick && onViewProfile?.(podium[0].nick)}>
              <div className="podium-crown">👑</div>
              <div className="podium-avatar">{podium[0].avatar || '🎓'}</div>
              <div className="podium-medal">🥇</div>
              <div className="podium-name">{podium[0].nick === state.nick ? '👤 Ти' : (podium[0].name || podium[0].nick)}</div>
              <LeagueBadge xp={podium[0].xp} style={{fontSize:10, padding:'2px 8px'}} />
              <div className="podium-xp">{podium[0].xp} XP</div>
              <div className="podium-bar h-1" />
            </div>
          )}
          {/* Bronze (3rd) */}
          {podium[2] && (
            <div className="podium-slot podium-3" onClick={() => podium[2].nick && onViewProfile?.(podium[2].nick)}>
              <div className="podium-avatar">{podium[2].avatar || '🎓'}</div>
              <div className="podium-medal">🥉</div>
              <div className="podium-name">{podium[2].nick === state.nick ? '👤 Ти' : (podium[2].name || podium[2].nick)}</div>
              <LeagueBadge xp={podium[2].xp} style={{fontSize:10, padding:'2px 8px'}} />
              <div className="podium-xp">{podium[2].xp} XP</div>
              <div className="podium-bar h-3" />
            </div>
          )}
        </div>
      )}

      {/* Rest of list */}
      {!loading && rest.length > 0 && (
        <div className="card leader-list">
          {rest.map((p, i) => {
            const nick = String((p && p.nick) || '');
            if (!nick) return null;
            const isMe = nick === state.nick;
            const league = leagueForXp(p.xp || 0);
            return (
              <div
                className={'leader-row' + (isMe ? ' leader-me' : '')}
                key={nick}
                onClick={() => onViewProfile?.(nick)}
                role="button" tabIndex={0}
                onKeyDown={e => e.key==='Enter' && onViewProfile?.(nick)}
              >
                <span className="rank">{rankMedal(i + 3)}</span>
                <span className="leader-avatar">{p.avatar || '🎓'}</span>
                <div className="leader-info">
                  <b>{isMe ? '👤 Ти' : (p.name || nick)}</b>
                  <div className="muted small">@{nick}{Number(p.streak) > 0 ? ' · 🔥' + Number(p.streak) : ''}</div>
                </div>
                <div className="leader-right">
                  <LeagueBadge xp={p.xp||0} style={{fontSize:10,padding:'2px 8px'}}/>
                  <strong className="leader-xp">{Number(p.xp)||0} XP</strong>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function DailyGiftModal({onClose, onOpen}) {
  const [opened, setOpened] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <div className="ef-modal-backdrop" role="presentation" onMouseDown={e => { if (e.target===e.currentTarget) onClose(); }}>
      <div className="ef-modal card gift-modal" role="dialog" aria-modal="true" onMouseDown={e=>e.stopPropagation()}>
        <div className={'gift-box' + (opened ? ' opening' : '')} aria-hidden="true">
          <div className="gift-lid">🎁</div>
        </div>
        <h2>Щоденний подарунок!</h2>
        <p className="muted">Відкривай скриню кожен день та отримуй XP або заморозку стріку.</p>
        {!opened && (
          <button className="primary" style={{marginTop:16}} disabled={busy} onClick={async () => {
            setBusy(true); setOpened(true);
            await onOpen();
            setBusy(false);
          }}>
            {busy ? '…' : '🎁 Відкрити скриню'}
          </button>
        )}
        <button className="secondary" style={{marginTop:8}} onClick={onClose}>Пізніше</button>
      </div>
    </div>
  );
}

function PublicProfileModal({nick, onClose}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    getPublicProfile(nick).then(r => {
      if (alive) { setData(r); setLoading(false); }
    }).catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [nick]);
  const p = data?.profile;
  const earned = new Set(data?.achievements || []);
  const league = leagueForXp(p?.xp || 0);
  return (
    <div className="ef-modal-backdrop" role="presentation" onMouseDown={e => { if (e.target===e.currentTarget) onClose(); }}>
      <div className="ef-modal card public-profile-modal" role="dialog" aria-modal="true" onMouseDown={e=>e.stopPropagation()}>
        <button className="icon" style={{alignSelf:'flex-end',marginBottom:-8}} onClick={onClose}><X size={18}/></button>
        {loading && <p className="muted">Завантаження…</p>}
        {!loading && !p && <p className="muted">Профіль не знайдено або прихований.</p>}
        {!loading && p && (<>
          <div className="pub-profile-hero">
            <div className="rpg-avatar" style={{fontSize:40}}>{p.avatar || '🎓'}</div>
            <div>
              <h2 style={{margin:'4px 0'}}>{p.name || p.nick}</h2>
              <div className="muted">@{p.nick}</div>
              <LeagueBadge xp={p.xp||0} style={{marginTop:6,display:'inline-block'}} />
            </div>
          </div>
          <div className="grid stats" style={{marginTop:16}}>
            <Card icon={<Sparkles/>} title="XP" value={p.xp||0} sub="" />
            <Card icon={<Flame/>} title="Streak" value={p.streak||0} sub="днів" />
          </div>
          {data?.achievements?.length > 0 && (
            <div style={{marginTop:16}}>
              <h3 style={{marginBottom:8}}>🏅 Бейджі</h3>
              <div className="pub-badges">
                {BADGES.filter(b => earned.has(b.id)).map(b => (
                  <div key={b.id} className="pub-badge" title={b.desc}>
                    <span>{b.icon}</span>
                    <span className="pub-badge-title">{b.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>)}
      </div>
    </div>
  );
}



function ChangePasswordCard() {
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e?.preventDefault();
    setErr(''); setMsg('');
    if (!oldPass || !newPass) {
      setErr('Заповніть усі поля');
      return;
    }
    if (newPass.length < 8) {
      setErr('Новий пароль має бути не менше 8 символів');
      return;
    }
    if (newPass !== confirmPass) {
      setErr('Нові паролі не співпадають');
      return;
    }
    setBusy(true);
    try {
      const res = await changePassword(oldPass, newPass);
      if (!res.ok) throw new Error(res.error || 'Помилка зміни паролю');
      setMsg('Пароль успішно змінено ✓');
      setOldPass(''); setNewPass(''); setConfirmPass('');
    } catch (error) {
      setErr(error.message || 'Не вдалося змінити пароль');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card change-password-card" style={{marginTop: 16}}>
      <h3>🔒 Зміна паролю</h3>
      <p className="muted small">Введіть поточний пароль та новий (мінімум 8 символів).</p>
      <form onSubmit={submit}>
        <label>Поточний пароль</label>
        <input className="search" type="password" value={oldPass} onChange={e => setOldPass(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
        <label>Новий пароль</label>
        <input className="search" type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="Мінімум 8 символів" autoComplete="new-password" />
        <label>Підтвердження нового паролю</label>
        <input className="search" type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} placeholder="Повторіть новий пароль" autoComplete="new-password" />
        {err && <p className="auth-err" style={{marginTop: 8}}>{err}</p>}
        {msg && <p className="saved-message" style={{marginTop: 8}}>{msg}</p>}
        <button className="primary" type="submit" disabled={busy} style={{marginTop: 12}}>
          {busy ? 'Збереження…' : 'Змінити пароль'}
        </button>
      </form>
    </div>
  );
}

function Profile({state, save, gamification, onRefreshGamification, onLogout}) {
  const level = Math.max(1, Math.floor((state.xp || 0) / 100) + 1);
  const xpInto = (state.xp || 0) % 100;
  const freezeCount = gamification?.freezeCount ?? (state.freezeCount || 0);
  const [freezeBusy, setFreezeBusy] = useState(false);

  const [name, setName] = useState(state.name);
  const [goal, setGoal] = useState(Math.max(1, state.dailyGoal || 50));
  const [theme, setTheme] = useState(state.theme);
  const [skin, setSkin] = useState(state.skin || 'classic');
  const [layout, setLayout] = useState(state.layout || 'sidebar');
  const [accent, setAccent] = useState(state.customTheme.accent);
  const [bg, setBg] = useState(state.customTheme.bg);
  const [surface, setSurface] = useState(state.customTheme.surface);
  const [msg, setMsg] = useState('');
  const [syncing, setSyncing] = useState(false);

  // Recovery settings in profile
  const [secQ, setSecQ] = useState(state.recoveryQuestion || 'Улюблене місто?');
  const [secA, setSecA] = useState('');
  const [secBusy, setSecBusy] = useState(false);
  const [secMsg, setSecMsg] = useState('');
  const [secErr, setSecErr] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  const persist = () => {
    save({...state, name, dailyGoal: Math.max(10, Number(goal) || 50), theme, skin, layout, customTheme: {accent, bg, surface}});
    setMsg('Збережено ✓'); setTimeout(() => setMsg(''), 1500);
  };

  const pullCloud = async () => {
    setSyncing(true);
    const remote = await cloudPull(state.nick);
    if (remote) { save({...state, ...remote, nick: state.nick}); setMsg('Підтягнуто з хмари ✓'); }
    else setMsg('Хмара порожня або не налаштована');
    setSyncing(false); setTimeout(() => setMsg(''), 2000);
  };

  const saveRecovery = async () => {
    if (!secA.trim()) { setSecErr('Введіть відповідь на питання'); return; }
    setSecBusy(true); setSecErr(''); setSecMsg('');
    try {
      const res = await setRecoveryQuestion(secQ, secA.trim());
      if (!res.ok) throw new Error(res.error || 'Помилка збереження');
      save({...state, recoveryQuestion: secQ});
      setSecMsg('Секретне питання оновлено ✓');
      setSecA('');
      setTimeout(() => setSecMsg(''), 2500);
    } catch (e) {
      setSecErr(e.message || 'Не вдалося зберегти');
    } finally {
      setSecBusy(false);
    }
  };

  const earnedBadges = new Set(state.badges || []);

  return (
    <section className="rpg-profile fade-in">
      <div className="hero-rpg card">
        <div className="rpg-avatar">{state.avatar || '🎓'}</div>
        <div style={{flex:1,minWidth:180}}>
          <div className="rpg-level">Рівень {level}</div>
          <h2 style={{margin:'4px 0'}}>{state.name || state.nick} {(String(state.nick||'').toLowerCase()==='boss' || String(state.name||'').toLowerCase()==='boss') && '👑'}</h2>
          <div className="muted">@{state.nick} · {state.xp || 0} XP · 🔥 {state.streak || 0}</div>
          <div style={{marginTop:8,display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
            <LeagueBadge xp={state.xp||0} />
            {freezeCount > 0 && <span className="freeze-chip">❄️ ×{freezeCount} заморозки</span>}
          </div>
          <div className="xp-bar" title="До наступного рівня"><i style={{width: xpInto + '%'}}/></div>
          <small className="muted">{xpInto}/100 XP до рівня {level + 1}</small>
        </div>
      </div>

      {/* Freeze actions */}
      {!state.guest && (
        <div className="card freeze-section">
          <h3>❄️ Заморозка стріку</h3>
          <p className="muted small">Захисти свій стрік, якщо пропустиш день. Купуй за 50 XP або використовуй наявні.</p>
          <div className="row-btns">
            <button className="secondary" disabled={freezeBusy || (state.xp||0) < 50} onClick={async () => {
              setFreezeBusy(true);
              try { await postGamification('buy_freeze'); await onRefreshGamification(); emitSiteToast('❄️ Придбано заморозку стріку (-50 XP)', 'ok'); } catch {}
              setFreezeBusy(false);
            }}>💰 Купити ({(state.xp||0) < 50 ? 'потрібно 50 XP' : '-50 XP'})</button>
            {freezeCount > 0 && <button className="secondary" disabled={freezeBusy} onClick={async () => {
              setFreezeBusy(true);
              try { await postGamification('use_freeze'); await onRefreshGamification(); emitSiteToast('❄️ Заморозку активовано!', 'ok'); } catch {}
              setFreezeBusy(false);
            }}>❄️ Активувати заморозку</button>}
          </div>
          {freezeBusy && <p className="muted small">…</p>}
        </div>
      )}

      {/* Badges Showcase */}
      <div className="card" style={{marginTop: 16}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <h3 style={{margin:0}}>🏅 Вітрина бейджів ({earnedBadges.size}/{BADGES.length})</h3>
          <span className="muted small">Секретні досягнення та ліги</span>
        </div>
        <div className="badges-grid" style={{gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))',gap:10}}>
          {BADGES.map(b => {
            const has = earnedBadges.has(b.id);
            return (
              <div key={b.id} className={'badge-card card' + (has ? ' earned' : ' locked')} style={{padding:'10px 12px'}}>
                <div className="badge-ico" style={{fontSize:22}}>{has ? '🏅' : '🔒'}</div>
                <div className="badge-body">
                  <div style={{fontWeight:600,fontSize:13}}>{b.title}</div>
                  <p className="muted badge-desc" style={{fontSize:11,margin:'2px 0 6px'}}>{b.desc}</p>
                  {has ? <span className="pill ok" style={{fontSize:10}}>Отримано</span> : <span className="pill" style={{fontSize:10,opacity:0.6}}>Заблоковано</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Title title="Профіль та Налаштування" text={`Нік @${state.nick}`}/>
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
          <h2><Palette size={18}/> Тема та Дизайн</h2>
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

          <h3 style={{marginTop: 18}}>3 кардинальні структурні макети</h3>
          <p className="muted small">Розташування меню та кнопок в інтерфейсі:</p>
          <div className="theme-buttons skins">
            <button className={layout === 'sidebar' ? 'theme active' : 'theme'} onClick={() => { setLayout('sidebar'); save({...state, layout: 'sidebar'}); }}>📑 Класичний Сайдбар</button>
            <button className={layout === 'top-nav' ? 'theme active' : 'theme'} onClick={() => { setLayout('top-nav'); save({...state, layout: 'top-nav'}); }}>🧭 Верхній Острівець</button>
            <button className={layout === 'bottom-dock' ? 'theme active' : 'theme'} onClick={() => { setLayout('bottom-dock'); save({...state, layout: 'bottom-dock'}); }}>⚓ Командний Док</button>
            <button className={layout === 'zen' ? 'theme active' : 'theme'} onClick={() => { setLayout('zen'); save({...state, layout: 'zen'}); }}>🧘 Дзен-Фокус</button>
          </div>

          <h3 style={{marginTop: 18}}>🎨 Колірні скіни</h3>
          <p className="muted small">Оберіть візуальну палітру сайту:</p>
          <div className="theme-buttons skins">
            <button className={skin === 'classic' ? 'theme active' : 'theme'} onClick={() => { setSkin('classic'); save({...state, skin: 'classic'}); }}>🌿 Classic Green</button>
            <button className={skin === 'neon' ? 'theme active' : 'theme'} onClick={() => { setSkin('neon'); save({...state, skin: 'neon'}); }}>⚡ Cyberpunk Neon</button>
            <button className={skin === 'candy' ? 'theme active' : 'theme'} onClick={() => { setSkin('candy'); save({...state, skin: 'candy'}); }}>🍭 Candy Pop</button>
            <button className={skin === 'nordic' ? 'theme active' : 'theme'} onClick={() => { setSkin('nordic'); save({...state, skin: 'nordic'}); }}>❄️ Nordic Minimalist</button>
            <button className={skin === 'arcade' ? 'theme active' : 'theme'} onClick={() => { setSkin('arcade'); save({...state, skin: 'arcade'}); }}>👾 8-Bit Arcade</button>
            <button className={skin === 'oled' ? 'theme active' : 'theme'} onClick={() => { setSkin('oled'); save({...state, skin: 'oled'}); }}>🖤 Midnight OLED</button>
            <button className={skin === 'sunset' ? 'theme active' : 'theme'} onClick={() => { setSkin('sunset'); save({...state, skin: 'sunset'}); }}>🌅 Warm Sunset</button>
          </div>
          <button className="primary" style={{marginTop: 12}} onClick={persist}>Застосувати налаштування</button>
        </div>
      </div>

      {/* Password Recovery & Backup Code */}
      {!state.guest && (
        <div className="card" style={{marginTop: 16}}>
          <h3>🔐 Відновлення паролю та Резервний код</h3>
          <p className="muted small">Збережіть ваш 10-значний резервний код. Він дозволить відновити доступ до акаунту в разі втрати пароля без потреби в електронній пошті.</p>

          <label>Ваш резервний код відновлення:</label>
          <div className="recovery-code-box">
            <span>{state.recoveryCode || 'EF-A1B2-C3D4'}</span>
            <button className="secondary" type="button" onClick={() => {
              navigator.clipboard.writeText(state.recoveryCode || 'EF-A1B2-C3D4');
              setCopiedCode(true);
              setTimeout(() => setCopiedCode(false), 2000);
            }}>
              {copiedCode ? 'Скопійовано ✓' : 'Копіювати'}
            </button>
          </div>

          <hr style={{margin:'14px 0'}}/>
          <h4>Секретне питання для швидкого скидання пароля</h4>
          <label>Питання</label>
          <UiSelect
            value={secQ}
            onChange={setSecQ}
            options={[
              {value:'Улюблене місто?',label:'Улюблене місто?'},
              {value:'Перша школа або вчитель?',label:'Перша школа або вчитель?'},
              {value:'Кличка першого улюбленця?',label:'Кличка першого улюбленця?'},
              {value:'Улюблена страва або десерт?',label:'Улюблена страва або десерт?'},
              {value:'Дівоче прізвище матері?',label:'Дівоче прізвище матері?'}
            ]}
          />
          <label style={{marginTop:8}}>Відповідь на питання</label>
          <input className="search" value={secA} onChange={e => setSecA(e.target.value)} placeholder="Введіть нову відповідь для збереження"/>
          {secErr && <p className="auth-err" style={{marginTop:6}}>{secErr}</p>}
          {secMsg && <p className="saved-message" style={{marginTop:6}}>{secMsg}</p>}
          <button className="secondary" type="button" disabled={secBusy} onClick={saveRecovery} style={{marginTop:10}}>
            {secBusy ? 'Збереження…' : 'Оновити секретне питання'}
          </button>
        </div>
      )}

      {!state.guest && <ChangePasswordCard />}

      <div className="card logout-card" style={{marginTop: 16, borderColor: 'var(--danger, #f87171)'}}>
        <h3>🚪 Вихід з акаунту</h3>
        <p className="muted small">Завершити поточну сесію на цьому пристрої. Профілі не змішуються.</p>
        <button className="secondary btn-logout-danger" onClick={onLogout} type="button">
          <XCircle size={16}/> Вийти з акаунту (@{state.nick})
        </button>
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
  const [stats,setStats]=useState({total:0,incognito:0});
  const load=useCallback(async()=>{
    try{
      const d=await requestJson('/api/admin-users?q='+encodeURIComponent(q));
      setRows(d.rows||[]);
      setStats({total: d.totalUsers || (d.rows||[]).length, incognito: d.incognitoCount || 0});
    }catch(e){
      if(e.status===401||e.status===403)window.dispatchEvent(new Event('ef-admin-lock'));
      else emitSiteError(e.message,'Гравці');
    }
  },[q]);
  useEffect(()=>{load()},[load]);
  const act=async(id,body)=>{setBusy(true);try{await requestJson('/api/admin-users',{method:'PATCH',body:JSON.stringify({userId:id,...body})});await load()}catch(e){if(e.status===401||e.status===403)window.dispatchEvent(new Event('ef-admin-lock'));else emitSiteError(e.message,'Керування гравцем')}finally{setBusy(false)}};
  const reset=async(id)=>{setBusy(true);try{await requestJson('/api/admin-users',{method:'POST',body:JSON.stringify({userId:id,action:'reset_progress'})});await load()}catch(e){if(e.status===401||e.status===403)window.dispatchEvent(new Event('ef-admin-lock'));else emitSiteError(e.message,'Скидання прогресу')}finally{setBusy(false)}};
  return (
    <div>
      <div className="grid stats" style={{marginBottom:16}}>
        <div className="card" style={{margin:0}}>
          <div className="muted small">Зареєстрованих користувачів</div>
          <div style={{fontSize:24,fontWeight:800,marginTop:4}}>{stats.total}</div>
        </div>
        <div className="card" style={{margin:0}}>
          <div className="muted small">Інкогніто / гості (активні)</div>
          <div style={{fontSize:24,fontWeight:800,marginTop:4}}>👻 {stats.incognito}</div>
        </div>
      </div>
      <input className="search" placeholder="Нік або імʼя" value={q} onChange={e=>setQ(e.target.value)}/>
      <div className="player-db-list">
        {rows.map(r=><div className="word-row card" key={r.id} style={{marginTop:8}}><div><b>{r.name||r.nick}</b> <span className="muted">@{r.nick}</span><div className="muted small">{r.xp} XP · streak {r.streak} · {r.status}</div></div><div className="row-btns wrap"><UiSelect disabled={busy} value={r.role} onChange={v=>act(r.id,{role:v})} options={[{value:'user',label:'user'},{value:'moderator',label:'moderator'},{value:'admin',label:'admin'}]}/><button className="secondary" disabled={busy} onClick={()=>setModal?.({text:`Змінити статус @${r.nick}?`,onYes:()=>act(r.id,{status:r.status==='active'?'suspended':'active'})})}>{r.status==='active'?'Призупинити':'Активувати'}</button><button className="secondary" disabled={busy} onClick={()=>setModal?.({text:`Скинути весь прогрес @${r.nick}? Цю дію не можна скасувати.`,onYes:()=>reset(r.id)})}>Reset</button></div></div>)}
      </div>
    </div>
  );
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
    {v:'2.9.0', items:['Оновлена система ліг по очках XP з чіткими порогами: 🌱 Новачок (0), 🥉 Бронза (100), 🥈 Срібло (200), 🥇 Золото (500), 💎 Платина (1000), 🔮 Діамант (2000), 👑 Легенда (3500+ XP)','❄️ Streak Freeze (Авто-захист стріку): при зміні дня автоматично рятує серію днів, якщо вчора не було набрано XP; купівля за 50 XP у Профілі','3 кардинальні структурні макети: 📑 Класичний Сайдбар, 🧭 Верхній Острівець (Top Navbar без бічного меню), ⚓ Командний Док (macOS/iPad floating dock знизу) та 🧘 Дзен-Фокус (мінімалістичний картковий режим без відволікань)','3 нові візуальні теми/скіни: 👾 Retro 8-Bit Arcade, 🖤 Midnight OLED (100% глибокий чорний для збереження батареї) та 🌅 Warm Sunset (затишний коралово-персиковий градієнт)','🔑 Самовідновлення паролю («Забули пароль?»): відновлення через секретні питання або персональний 10-значний резервний код (EF-XXXX-XXXX) без сторонньої пошти','🎁 Щоденна скриня подарунків: сяючий банер на головній щодня з випадковим призом XP або безкоштовною заморозкою','🏅 Розширена вітрина бейджів: нові досягнення (Майстер слів, Заморозка, лігові бейджі Срібла/Платини/Діаманта) з переглядом у власному та публічних профілях','🎯 Живе оновлення прогресу Щоденних квестів під час проходження уроків та спринту']},
    {v:'2.8.0', items:['Виправлено скидання уроку (1/10 loop): Layout та Sidebar винесені за межі App, відповіді більше не перезапускають урок з 1-го питання','Додано кнопку «Вихід» у шапці, сайдбарі, профілі та налаштуваннях: повне завершення сесії та ізоляція профілів (ніки не змішуються)','Повний редизайн чату: видалено заплутаний Fingerprint/ротацію ключів, чат тепер простий та швидкий як у звичайному месенджері','Виправлено помилку «Зашифроване повідомлення (цей пристрій не має ключа)» — повідомлення одразу читаються з будь-якого авторизованого пристрою','Live Realtime (5с): автоматичне оновлення списку друзів, онлайн-статусу (🟢 / ⚪) та повідомлень','Зміна паролю в Профілі з перевіркою старого паролю та валідацією','3 кардинально різні інтерфейси: Cyberpunk Neon, Playful Kids/Candy Pop, Nordic Minimalist + Classic з кастомними checkbox/input/button','Статистика адмінки: показ кількості зареєстрованих користувачів та активних інкогніто-гостей']},
    {v:'2.7.0', items:['Гейміфікація v3: Ліги за очками (Бронза, Срібло, Золото, Платина, Алмаз, Майстер, Легенда)','Заморозка стріку (Streak Freeze): купівля за XP та захист від пропуску днів','Щоденні квести (Daily Quests) з нагородами XP','Подарункова скриня (Gift Box) за щоденну активність','Публічні профілі гравців для перегляду досягнень іншими користувачами']},
    {v:'2.6.1', items:['Виправлено зависання лічильника 1/10 у всіх завданнях (Sprint/SRS/Problems/Dictation)','Додано авто-перехід (1с) при правильній відповіді без зайвих кліків','Надійна синхронізація таблиць Notion: підтримка databases/data_sources та будь-яких назв колонок','Оновлено скрипт sync:notion з авто-підтягуванням .env та прямим записом у Neon','Додано роль UI/UX Дизайнера та покращено мобільний вигляд feedback/кнопок']},
    {v:'2.6.0', items:['Коректний рахунок «Вивчено» та «На повторення SRS»: узгодження id між хмарою (Notion id) та локальним словником (match by word)','Виправлено хибне «Сесію завершено» при вході в гостьовий режим','Вхід у завдання більше не викидає на екран реєстрації при простроченій сесії — підказка «Увійти знову»','Рейтинг тепер показує тільки хмарний рейтинг','Фікс стартового cloud-pull, що тихо помирав і лишав лічильники на нулі']},
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
  const hasAction=typeof modal.onYes==='function';
  return <div className="ef-modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div className="ef-modal card" role="dialog" aria-modal="true" aria-labelledby="ef-modal-title" onMouseDown={e=>e.stopPropagation()}><h2 id="ef-modal-title">{modal.title || (error?'Помилка':'Підтвердження')}</h2><p>{modal.text}</p><div className="row-btns"><button className={error&&!hasAction?'primary':'secondary'} type="button" onClick={onClose}>{error?'Закрити':'Скасувати'}</button>{!error&&<button className="primary" type="button" onClick={()=>{modal.onYes?.();onClose()}}>{modal.yes||'Так, продовжити'}</button>}{error&&hasAction&&<button className="primary" type="button" onClick={()=>{modal.onYes();onClose()}}>{modal.yes||'Увійти знову'}</button>}</div></div></div>;
}



function SettingsPage({state, save, onLogout}) {
  const upd = (patch) => save({...state, ...patch});
  return (
    <section className="fade-in">
      <Title title="Налаштування" text="Звук, інтерфейс, порівняння, підказки"/>
      <div className="grid two">
        <div className="card">
          <h2>Звук</h2>
          <label className="row-check">
            <input type="checkbox" checked={!!state.quiet} onChange={e => upd({quiet: e.target.value})}/>
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
          <h2>🧭 Структурний макет</h2>
          <p className="muted small">3 кардинальні макети розміщення кнопок і меню:</p>
          <div className="theme-buttons skins" style={{marginBottom: 16}}>
            <button className={(state.layout || 'sidebar') === 'sidebar' ? 'theme active' : 'theme'} onClick={() => upd({layout: 'sidebar'})}>📑 Класичний Сайдбар</button>
            <button className={(state.layout || 'sidebar') === 'top-nav' ? 'theme active' : 'theme'} onClick={() => upd({layout: 'top-nav'})}>🧭 Верхній Острівець</button>
            <button className={(state.layout || 'sidebar') === 'bottom-dock' ? 'theme active' : 'theme'} onClick={() => upd({layout: 'bottom-dock'})}>⚓ Командний Док</button>
            <button className={(state.layout || 'sidebar') === 'zen' ? 'theme active' : 'theme'} onClick={() => upd({layout: 'zen'})}>🧘 Дзен-Фокус</button>
          </div>

          <h2>🎨 Колірні скіни</h2>
          <p className="muted small">Візуальна палітра інтерфейсу:</p>
          <div className="theme-buttons skins">
            <button className={state.skin === 'classic' ? 'theme active' : 'theme'} onClick={() => upd({skin: 'classic'})}>🌿 Classic</button>
            <button className={state.skin === 'neon' ? 'theme active' : 'theme'} onClick={() => upd({skin: 'neon'})}>⚡ Cyberpunk Neon</button>
            <button className={state.skin === 'candy' ? 'theme active' : 'theme'} onClick={() => upd({skin: 'candy'})}>🍭 Candy Pop</button>
            <button className={state.skin === 'nordic' ? 'theme active' : 'theme'} onClick={() => upd({skin: 'nordic'})}>❄️ Nordic Minimalist</button>
            <button className={state.skin === 'arcade' ? 'theme active' : 'theme'} onClick={() => upd({skin: 'arcade'})}>👾 8-Bit Arcade</button>
            <button className={state.skin === 'oled' ? 'theme active' : 'theme'} onClick={() => upd({skin: 'oled'})}>🖤 Midnight OLED</button>
            <button className={state.skin === 'sunset' ? 'theme active' : 'theme'} onClick={() => upd({skin: 'sunset'})}>🌅 Warm Sunset</button>
          </div>
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
        <div className="card" style={{borderColor: 'var(--danger, #f87171)'}}>
          <h2>🚪 Вихід з акаунту</h2>
          <p className="muted small">Завершити сесію на цьому пристрої.</p>
          <button className="secondary btn-logout-danger" onClick={onLogout} type="button">
            <XCircle size={16}/> Вийти з акаунту (@{state.nick})
          </button>
        </div>
      </div>
    </section>
  );
}

function FriendsPage({state}) {
  const [q, setQ] = useState('');
  const [msg, setMsg] = useState('');
  const [chatWith, setChatWith] = useState(null);
  const [text, setText] = useState('');
  const [friends, setFriends] = useState([]);
  const [board, setBoard] = useState([]);
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);
  const friendsRef = useRef([]);

  const load = useCallback(async () => {
    if (state.guest) return;
    try {
      const [f, b] = await Promise.all([getFriends(state.nick), friendsLeaderboard(state.nick)]);
      setFriends(f || []);
      friendsRef.current = f || [];
      setBoard(b || []);
    } catch (e) {
      emitSiteError(e.message || 'Не вдалося завантажити друзів', 'Друзі');
    }
  }, [state.nick, state.guest]);

  // Live polling every 5s for friends list and online status
  useEffect(() => {
    if (state.guest) return;
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [load, state.guest]);

  // Live polling every 3s for chat messages when a chat is open
  useEffect(() => {
    if (!chatWith || state.guest) return;
    let alive = true;
    const fetchChat = async () => {
      try {
        const raw = await getChat(state.nick, chatWith);
        if (alive && raw) setMessages(raw);
      } catch {}
    };
    fetchChat();
    const interval = setInterval(fetchChat, 3000);
    return () => { alive = false; clearInterval(interval); };
  }, [chatWith, state.nick, state.guest]);

  const add = async () => {
    setBusy(true);
    const r = await addFriend(state.nick, q);
    setMsg(r.ok ? 'Запит надіслано ✓' : (r.error || 'Помилка'));
    if (r.ok) {
      track('friend_request', { feature: 'friends' });
      setQ('');
    }
    setBusy(false);
    load();
  };

  const send = async () => {
    const t = text.trim();
    if (!chatWith || !t) return;
    setText('');
    try {
      const sent = await sendChat(state.nick, chatWith, t);
      if (sent) {
        setMessages(prev => prev.some(x => x.id === sent.id) ? prev : [...prev, sent]);
      }
      const raw = await getChat(state.nick, chatWith);
      if (raw) setMessages(raw);
      track('chat_send', { chars: t.length });
    } catch (e) {
      emitSiteError(e.message || 'Не вдалося надіслати повідомлення', 'Чат');
    }
  };

  const social = async (action) => {
    if (!chatWith) return;
    try {
      await requestJson('/api/social', { method: 'POST', body: JSON.stringify({ nick: chatWith, action }) });
      if (action === 'block') { setChatWith(null); load(); }
    } catch (e) { emitSiteError(e.message, 'Соціальні налаштування'); }
  };

  const report = async () => {
    if (!chatWith) return;
    try {
      await requestJson('/api/reports', { method: 'POST', body: JSON.stringify({ nick: chatWith, type: 'user', reason: 'Порушення правил' }) });
      setMsg('Скаргу передано модераторам.');
    } catch (e) { emitSiteError(e.message, 'Скарга'); }
  };

  if (state.guest) return <section><Title title="Друзі" text="Друзі та чат доступні після входу в акаунт"/><div className="card muted">Гостьовий режим не зберігає соціальні дані в Neon.</div></section>;

  return (
    <section className="fade-in">
      <Title title="Друзі" text="Онлайн-чат, друзі та живе змагання"/>
      
      {/* Realtime Live Status Banner */}
      <div className="card realtime-live-card" style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <span className="live-dot pulse"></span>
          <b>Realtime: Онлайн</b>
          <span className="muted small">· синхронізація щомиті (оновлення кожні 3–5с)</span>
        </div>
        <span className="pill ok">🟢 Live</span>
      </div>

      <div className="grid two">
        <div className="card">
          <h2>Додати друга</h2>
          <div className="row-btns">
            <input className="search" value={q} onChange={e => setQ(e.target.value)} placeholder="нік друга" onKeyDown={e => e.key === 'Enter' && add()}/>
            <button className="primary" disabled={busy || !q.trim()} onClick={add}>Додати</button>
          </div>
          {msg && <p className="muted" style={{marginTop: 8}}>{msg}</p>}

          <h3 style={{marginTop: 20, marginBottom: 8}}>Мої друзі</h3>
          <ul className="friend-list">
            {friends.map(f => (
              <li key={f.id || f.nick}>
                <button type="button" className={'friend-item' + (chatWith === f.nick ? ' active' : '')} onClick={() => f.status === 'accepted' && setChatWith(f.nick)}>
                  <span className={'status-dot ' + (f.is_online ? 'online' : 'offline')} title={f.is_online ? 'Онлайн' : 'Не в мережі'}>
                    {f.is_online ? '🟢' : '⚪'}
                  </span>
                  <b>@{f.nick}</b>
                  {f.status === 'pending' && <span className="muted small">· запит</span>}
                  {f.is_online ? <span className="online-tag">онлайн</span> : <span className="offline-tag">не в мережі</span>}
                </button>
                {f.status === 'pending' && f.requested_by !== state.id && (
                  <button className="secondary" onClick={async () => { const r = await acceptFriend(state.nick, f.id); if (!r.ok) emitSiteError(r.error, 'Друзі'); load(); }}>Прийняти</button>
                )}
              </li>
            ))}
            {!friends.length && <li className="muted">Поки немає друзів. Введіть нік вище!</li>}
          </ul>
        </div>

        <div className="card chat-panel-container">
          <h2><MessageCircle size={18}/> Чат {chatWith ? `з @${chatWith}` : ''}</h2>
          {!chatWith ? (
            <p className="muted" style={{padding: '24px 0', textAlign: 'center'}}>Оберіть друга зі списку зліва, щоб відкрити чат 💬</p>
          ) : (
            <>
              <div className="chat-box">
                {messages.length === 0 && <p className="muted" style={{textAlign: 'center', padding: 24}}>Ще немає повідомлень. Напишіть першим!</p>}
                {messages.map(m => {
                  const isMe = String(m.sender_id) === String(state.id) || String(m.sender_nick || '').toLowerCase() === String(state.nick).toLowerCase();
                  const content = m.text || (m.ciphertext ? '🔒 Повідомлення' : '—');
                  return (
                    <div key={m.id || Math.random()} className={'chat-msg' + (isMe ? ' me' : '')}>
                      <div className="chat-msg-header">
                        <b>{isMe ? 'Ти' : `@${chatWith}`}</b>
                        <span className="muted small" style={{marginLeft: 8}}>
                          {new Date(m.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="chat-msg-body">{content}</div>
                    </div>
                  );
                })}
              </div>
              <div className="row-btns" style={{marginTop: 10}}>
                <input className="search" value={text} maxLength={1000} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Напишіть повідомлення…"/>
                <button className="primary" disabled={!text.trim()} onClick={send}>Надіслати</button>
              </div>
              <div className="row-btns wrap" style={{marginTop: 12}}>
                <button className="secondary" type="button" onClick={() => social('mute')}>🔕 Mute</button>
                <button className="secondary" type="button" onClick={() => social('block')}>🚫 Block</button>
                <button className="secondary" type="button" onClick={report}>⚑ Report</button>
              </div>
            </>
          )}
        </div>
      </div>

      {board.length > 0 && (
        <div className="card" style={{marginTop: 16}}>
          <h2>Рейтинг друзів</h2>
          <div className="lb">
            {board.map((r, i) => (
              <div className="lb-row" key={r.nick}>
                <span>#{i + 1}</span>
                <b>@{r.nick}</b>
                <span className="muted">{r.xp} XP · {r.streak}🔥</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
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
  const [lastPing, setLastPing] = useState(null);
  const [pingBusy, setPingBusy] = useState(false);
  const ping = () => {
    setPingBusy(true);
    const start = Date.now();
    fetch('/api/health').then(() => {
      setLastPing(Date.now() - start);
      setPingBusy(false);
    }).catch(() => {
      setLastPing(Date.now() - start);
      setPingBusy(false);
    });
  };
  return (
    <div className="card realtime-panel">
      <div className="realtime-head">
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span className="realtime-dot open"></span>
          <h3 style={{margin:0}}>Realtime: Live</h3>
        </div>
        <button className="secondary" type="button" onClick={ping} disabled={pingBusy}>{pingBusy ? 'Перевірка…' : 'Перевірити ping'}</button>
      </div>
      <p className="muted small">Синхронізація друзів, рейтингу та чату виконується щомиті (кожні 3–5 секунд).</p>
      {lastPing !== null && <p style={{marginTop: 8}}><b>Ping: {lastPing} ms ✓</b></p>}
    </div>
  );
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
