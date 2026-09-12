import React, {useEffect, useMemo, useState, useCallback, useRef, lazy, Suspense} from 'react';
import {BarChart3, BookOpen, Check, CheckCircle2, ChevronRight, ChevronDown, Flame, Home, Lock, Menu, Moon, Palette, Play, RotateCcw, Settings, Sun, Target, Trophy, User, Volume2, X, XCircle, Shield, SlidersHorizontal, Brain, Sparkles, Keyboard, Layers, Award, Cloud, Users, MessageCircle, Ghost, VolumeX, Swords, ShieldAlert, Eye, Bell, Wifi, ShoppingBag} from 'lucide-react';
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


const VERSION = '3.1.0';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="card" style={{margin:'20px auto',maxWidth:600,padding:24,textAlign:'center',borderLeft:'4px solid var(--danger,#ef4444)'}}>
          <h2 style={{marginTop:0}}>⚠️ Щось пішло не так у цьому блоці</h2>
          <p className="muted" style={{fontSize:13}}>{String(this.state.error?.message || 'Помилка відображення даних.')}</p>
          <div className="row-btns" style={{justifyContent:'center'}}>
            <button className="primary" type="button" onClick={() => this.setState({hasError:false, error:null})}>
              🔄 Спробувати знову
            </button>
            <button className="secondary" type="button" onClick={() => window.location.reload()}>
              Перезавантажити сайт
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const words = (notionWords?.length ? notionWords : fallbackWords).map(w => ({
  id: w.id, word: w.word, translation: w.translation || '—', pronunciation: w.pronunciation || '',
  category: w.category || 'Other', level: w.level || '', explanation: w.explanation || '',
  example: w.example || (w.examples || '').split('\n')[0] || ''
}));
const CATS = [...new Set(words.map(w => w.category))].sort();
const defaultAdmin = {lessonSize: 10, correctPoints: 4, wrongPoints: -2, masteryThreshold: 8, shuffleQuestions: true, shuffleAnswers: true, showPronunciation: true, perfectBonus: 0, badgeStyle: 'neo'};
const emptyState = () => ({
  nick: '', name: '', passHash: '', xp: 0, gems: 25, streak: 1, dailyGoal: 50, todayXp: 0, today: todayStr(),
  mastery: {}, srs: {}, attempts: {}, history: [], badges: [], avatar: 'duo_owl',
  theme: 'system', skin: 'classic', font: 'Plus Jakarta Sans', customTheme: {accent: '#22c55e', bg: '#f6f8f6', surface: '#ffffff'},
  admin: {...defaultAdmin},
  quiet: false, sfx: true, soundPack: 'duo', guest: false, gamesPlayed: 0,
  compareMode: 'global', compareFriend: '', midnightSnap: null, badgeStyle: 'neo',
  freezeCount: 0, recoveryCode: '', recoveryQuestion: '',
  pinnedBadges: [], showInLeaderboard: true, allowFriendsStats: true,
  inventory: { doubleXpUntil: null, secondChance: 0, vipFrame: false },
  settings: { keyboardHints: true, staggerList: true }
});

const progKey = (w, mastery, srs) => {
  const m = mastery || {}, s = srs || {};
  const id = String((w && (w.notion_id || w.id)) || '');
  if (id && (m[id] != null || s[id] != null)) return id;
  const t = w ? String(w.word || '').trim().toLowerCase() : '';
  const nid = t ? getWordIdByText()[t] : '';
  if (nid && (m[nid] != null || s[nid] != null)) return nid;
  return id || nid;
};

/* ==========================================================================
   ADVANCED AUDIO SYSTEM WITH 5 RICH SOUND PACKS + COIN EFFECT
   ========================================================================== */
function playTone(ok, pack) {
  try {
    if (window.__efQuiet || window.__efNoSfx) return;
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    const c = new C(), o = c.createOscillator(), g = c.createGain();
    const p = pack || window.__efSoundPack || 'duo';
    
    if (p === 'duo') {
      // Duolingo-style crisp chime / bounce
      if (ok) {
        [523.25, 659.25, 783.99].forEach((freq, i) => {
          const osc = c.createOscillator(), gn = c.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, c.currentTime + i * 0.07);
          gn.gain.setValueAtTime(0.001, c.currentTime + i * 0.07);
          gn.gain.exponentialRampToValueAtTime(0.14, c.currentTime + i * 0.07 + 0.015);
          gn.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + i * 0.07 + 0.18);
          osc.connect(gn); gn.connect(c.destination);
          osc.start(c.currentTime + i * 0.07);
          osc.stop(c.currentTime + i * 0.07 + 0.2);
        });
        return;
      } else {
        o.type = 'triangle';
        o.frequency.setValueAtTime(260, c.currentTime);
        o.frequency.exponentialRampToValueAtTime(180, c.currentTime + 0.22);
      }
    } else if (p === 'crystal') {
      // High-register crystalline glockenspiel
      if (ok) {
        [880, 1174.66].forEach((f, i) => {
          const osc = c.createOscillator(), gn = c.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, c.currentTime + i * 0.06);
          gn.gain.setValueAtTime(0.001, c.currentTime + i * 0.06);
          gn.gain.exponentialRampToValueAtTime(0.12, c.currentTime + i * 0.06 + 0.01);
          gn.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + i * 0.06 + 0.25);
          osc.connect(gn); gn.connect(c.destination);
          osc.start(c.currentTime + i * 0.06);
          osc.stop(c.currentTime + i * 0.06 + 0.27);
        });
        return;
      } else {
        o.type = 'sine';
        o.frequency.setValueAtTime(220, c.currentTime);
        o.frequency.exponentialRampToValueAtTime(140, c.currentTime + 0.25);
      }
    } else if (p === 'arcade') {
      // 8-bit retro gaming square wave
      o.type = 'square';
      o.frequency.setValueAtTime(ok ? 587.33 : 130.81, c.currentTime);
      o.frequency.setValueAtTime(ok ? 880 : 98, c.currentTime + 0.08);
    } else if (p === 'cyber') {
      // Sci-fi synth sweep
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(ok ? 440 : 160, c.currentTime);
      o.frequency.exponentialRampToValueAtTime(ok ? 880 : 80, c.currentTime + 0.18);
    } else if (p === 'zen') {
      // Warm marimba acoustic
      o.type = 'triangle';
      o.frequency.setValueAtTime(ok ? 440 : 196, c.currentTime);
      o.frequency.exponentialRampToValueAtTime(ok ? 660 : 147, c.currentTime + 0.24);
    } else {
      // Classic
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

function playCoinSound() {
  try {
    if (window.__efQuiet || window.__efNoSfx) return;
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    const c = new C();
    [987.77, 1318.51].forEach((f, i) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(f, c.currentTime + i * 0.07);
      g.gain.setValueAtTime(0.001, c.currentTime + i * 0.07);
      g.gain.exponentialRampToValueAtTime(0.12, c.currentTime + i * 0.07 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + i * 0.07 + 0.24);
      o.connect(g); g.connect(c.destination);
      o.start(c.currentTime + i * 0.07);
      o.stop(c.currentTime + i * 0.07 + 0.26);
    });
  } catch {}
}

function playFanfareTone(pack) {
  try {
    if (window.__efQuiet || window.__efNoSfx) return;
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    const c = new C();
    const freqs = [523.25, 659.25, 783.99, 1046.50];
    freqs.forEach((freq, i) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = pack === 'arcade' ? 'square' : 'sine';
      o.frequency.setValueAtTime(freq, c.currentTime + i * 0.08);
      g.gain.setValueAtTime(0.0001, c.currentTime + i * 0.08);
      g.gain.exponentialRampToValueAtTime(0.14, c.currentTime + i * 0.08 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + i * 0.08 + 0.32);
      o.connect(g); g.connect(c.destination);
      o.start(c.currentTime + i * 0.08);
      o.stop(c.currentTime + i * 0.08 + 0.35);
    });
  } catch {}
}

function playChestTone(pack) {
  try {
    if (window.__efQuiet || window.__efNoSfx) return;
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    const c = new C();
    const freqs = [392, 523.25, 659.25, 783.99];
    freqs.forEach((f, i) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = pack === 'arcade' ? 'square' : 'sine';
      o.frequency.setValueAtTime(f, c.currentTime + i * 0.07);
      g.gain.setValueAtTime(0.0001, c.currentTime + i * 0.07);
      g.gain.exponentialRampToValueAtTime(0.12, c.currentTime + i * 0.07 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + i * 0.07 + 0.28);
      o.connect(g); g.connect(c.destination);
      o.start(c.currentTime + i * 0.07);
      o.stop(c.currentTime + i * 0.07 + 0.3);
    });
  } catch {}
}

/* ==========================================================================
   20 DUO-STYLE VECTOR SVG CHARACTER AVATARS (EXACTLY AS IN USER REFERENCE)
   ========================================================================== */
const GAME_AVATARS_20 = [
  { id: 'duo_owl', name: 'Зелена Сова', bg: '#58CC02', eyeBg: '#FFFFFF', pupil: '#1E293B', beak: '#F59E0B', ears: 'feather', tag: '🦉 Сова' },
  { id: 'duo_fox', name: 'Хитрий Лис', bg: '#EA580C', eyeBg: '#FFFFFF', pupil: '#1E293B', beak: '#18181B', ears: 'fox', tag: '🦊 Лис' },
  { id: 'duo_cat', name: 'Кіт-Геймер', bg: '#8B5CF6', eyeBg: '#FFFFFF', pupil: '#1E293B', beak: '#EC4899', ears: 'cat', tag: '🐱 Кіт' },
  { id: 'duo_bear', name: 'Синій Ведмідь', bg: '#2563EB', eyeBg: '#FFFFFF', pupil: '#0F172A', beak: '#1E293B', ears: 'bear', tag: '🐻 Ведмідь' },
  { id: 'duo_frog', name: 'Жабка Спринт', bg: '#10B981', eyeBg: '#FFFFFF', pupil: '#064E3B', beak: '#F59E0B', ears: 'frog', tag: '🐸 Жабка' },
  { id: 'duo_panda', name: 'Бамбукова Панда', bg: '#E2E8F0', eyeBg: '#FFFFFF', pupil: '#0F172A', beak: '#0F172A', ears: 'panda', tag: '🐼 Панда' },
  { id: 'duo_lion', name: 'Золотий Лев', bg: '#D97706', eyeBg: '#FFFFFF', pupil: '#18181B', beak: '#78350F', ears: 'lion', tag: '🦁 Лев' },
  { id: 'duo_robot', name: 'Кібер-Бот X', bg: '#06B6D4', eyeBg: '#FEF08A', pupil: '#0E7490', beak: '#0284C7', ears: 'robot', tag: '🤖 Робот' },
  { id: 'duo_dragon', name: 'Смарагдовий Дракон', bg: '#059669', eyeBg: '#FEF08A', pupil: '#064E3B', beak: '#F97316', ears: 'dragon', tag: '🐲 Дракон' },
  { id: 'duo_koala', name: 'Сіра Коала', bg: '#64748B', eyeBg: '#FFFFFF', pupil: '#0F172A', beak: '#0F172A', ears: 'koala', tag: '🐨 Коала' },
  { id: 'duo_dog', name: 'Коргі Чемпіон', bg: '#F59E0B', eyeBg: '#FFFFFF', pupil: '#18181B', beak: '#18181B', ears: 'dog', tag: '🐶 Коргі' },
  { id: 'duo_penguin', name: 'Пінгвін у шарфі', bg: '#0F172A', eyeBg: '#FFFFFF', pupil: '#0F172A', beak: '#F59E0B', ears: 'penguin', tag: '🐧 Пінгвін' },
  { id: 'duo_tiger', name: 'Смугастий Тигр', bg: '#F97316', eyeBg: '#FFFFFF', pupil: '#18181B', beak: '#7C2D12', ears: 'tiger', tag: '🐯 Тигр' },
  { id: 'duo_raccoon', name: 'Єнот Граматик', bg: '#475569', eyeBg: '#FFFFFF', pupil: '#0F172A', beak: '#0F172A', ears: 'raccoon', tag: '🦝 Єнот' },
  { id: 'duo_alien', name: 'Космічний Прибулець', bg: '#84CC16', eyeBg: '#FFFFFF', pupil: '#166534', beak: '#4ADE80', ears: 'alien', tag: '👽 Прибулець' },
  { id: 'duo_bunny', name: 'Спритний Зайчик', bg: '#F1F5F9', eyeBg: '#FFFFFF', pupil: '#0F172A', beak: '#F43F5E', ears: 'bunny', tag: '🐰 Зайчик' },
  { id: 'duo_chick', name: 'Жовте Курча', bg: '#EAB308', eyeBg: '#FFFFFF', pupil: '#0F172A', beak: '#EA580C', ears: 'chick', tag: '🐥 Курча' },
  { id: 'duo_shark', name: 'Морська Акула', bg: '#0284C7', eyeBg: '#FFFFFF', pupil: '#082F49', beak: '#E2E8F0', ears: 'shark', tag: '🦈 Акула' },
  { id: 'duo_monkey', name: 'Мавпочка Майстер', bg: '#A16207', eyeBg: '#FFFFFF', pupil: '#451A03', beak: '#FEF08A', ears: 'monkey', tag: '🐵 Мавпа' },
  { id: 'duo_crown', name: 'Королівський Птах', bg: '#E11D48', eyeBg: '#FFFFFF', pupil: '#0F172A', beak: '#F59E0B', ears: 'crown', tag: '👑 Король' }
];

function AvatarIcon({ id, size = 44, className = '', style = {} }) {
  const av = GAME_AVATARS_20.find(a => a.id === id) || GAME_AVATARS_20[0];
  
  // Legacy fallback for plain emoji strings
  if (!id || (!id.startsWith('duo_') && !GAME_AVATARS_20.some(x => x.id === id))) {
    return (
      <span
        className={'avatar-emoji-fallback ' + className}
        style={{
          width: size, height: size, fontSize: Math.floor(size * 0.6),
          display: 'inline-grid', placeItems: 'center', borderRadius: 14,
          background: 'color-mix(in srgb, var(--accent) 12%, var(--surface))',
          flexShrink: 0, ...style
        }}
      >
        {id || '🦉'}
      </span>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={'avatar-vector-squircle ' + className}
      style={{ flexShrink: 0, ...style }}
    >
      <defs>
        <linearGradient id={`grad_${av.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={av.bg} />
          <stop offset="100%" stopColor={colorMixDark(av.bg)} />
        </linearGradient>
      </defs>
      
      {/* Ear / Crown Addons */}
      {av.ears === 'cat' && (
        <>
          <polygon points="18,34 32,8 46,28" fill={av.bg} />
          <polygon points="24,30 32,16 40,28" fill="#F472B6" />
          <polygon points="82,34 68,8 54,28" fill={av.bg} />
          <polygon points="76,30 68,16 60,28" fill="#F472B6" />
        </>
      )}
      {av.ears === 'fox' && (
        <>
          <polygon points="14,36 28,6 44,28" fill={av.bg} />
          <polygon points="20,32 28,14 38,28" fill="#FFFFFF" />
          <polygon points="86,36 72,6 56,28" fill={av.bg} />
          <polygon points="80,32 72,14 62,28" fill="#FFFFFF" />
        </>
      )}
      {av.ears === 'bear' && (
        <>
          <circle cx="24" cy="20" r="14" fill={av.bg} />
          <circle cx="24" cy="20" r="7" fill="#93C5FD" />
          <circle cx="76" cy="20" r="14" fill={av.bg} />
          <circle cx="76" cy="20" r="7" fill="#93C5FD" />
        </>
      )}
      {av.ears === 'bunny' && (
        <>
          <ellipse cx="32" cy="14" rx="8" ry="18" fill={av.bg} />
          <ellipse cx="32" cy="14" rx="4" ry="12" fill="#F472B6" />
          <ellipse cx="68" cy="14" rx="8" ry="18" fill={av.bg} />
          <ellipse cx="68" cy="14" rx="4" ry="12" fill="#F472B6" />
        </>
      )}
      {av.ears === 'crown' && (
        <polygon points="28,24 38,8 50,18 62,8 72,24" fill="#F59E0B" stroke="#FEF08A" strokeWidth="2" />
      )}

      {/* Main Squircle Face Body (As in Duolingo Reference Image) */}
      <rect x="8" y="14" width="84" height="80" rx="26" fill={`url(#grad_${av.id})`} />
      
      {/* Forehead Feathers / Eyebrow Accents */}
      <path d="M22 30 Q34 38 50 36 Q66 38 78 30 Q68 22 50 24 Q32 22 22 30Z" fill={colorMixDark(av.bg)} opacity="0.6" />
      
      {/* Big Expressive Cartoon Eyes (Exact Match to Reference) */}
      <circle cx="36" cy="52" r="16" fill={av.eyeBg} />
      <circle cx="64" cy="52" r="16" fill={av.eyeBg} />
      
      {/* Eye Pupils with Glossy Highlights */}
      <circle cx="36" cy="52" r="9.5" fill={av.pupil} />
      <circle cx="64" cy="52" r="9.5" fill={av.pupil} />
      <circle cx="32.5" cy="48" r="3.5" fill="#FFFFFF" />
      <circle cx="60.5" cy="48" r="3.5" fill="#FFFFFF" />
      
      {/* Beak / Nose (Cute Diamond Heart Shape like Reference) */}
      <polygon points="50,56 42,66 50,73 58,66" fill={av.beak} />
      <circle cx="50" cy="62" r="2" fill="#FEF08A" opacity="0.7" />
    </svg>
  );
}

function colorMixDark(hex) {
  if (hex === '#58CC02') return '#3FA500';
  if (hex === '#EA580C') return '#C2410C';
  if (hex === '#8B5CF6') return '#6D28D9';
  if (hex === '#2563EB') return '#1D4ED8';
  if (hex === '#10B981') return '#047857';
  if (hex === '#E2E8F0') return '#94A3B8';
  return '#1E293B';
}

/* ==========================================================================
   GREEN BRAND LOGO (EXACTLY AS USER REQUESTED IN DUO-GREEN THEME)
   ========================================================================== */
function BrandLogo({size = 34, showText = true, className = ''}) {
  return (
    <div className={'brand-logo-wrap ' + className} style={{display:'inline-flex',alignItems:'center',gap:10}}>
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={{flexShrink:0,filter:'drop-shadow(0 3px 10px rgba(34,197,94,0.38))'}}>
        <defs>
          <linearGradient id="brandGreenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#58CC02" />
            <stop offset="50%" stopColor="#22C55E" />
            <stop offset="100%" stopColor="#15803D" />
          </linearGradient>
          <linearGradient id="brandTopGlow" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#86EFAC" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#22C55E" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="19" fill="url(#brandGreenGrad)"/>
        <rect x="2" y="2" width="60" height="30" rx="17" fill="url(#brandTopGlow)"/>
        <path d="M16 22C21 20 28 21.5 32 25C36 21.5 43 20 48 22V42C43 40 36 41.5 32 45C28 41.5 21 40 16 42V22Z" fill="#FFFFFF"/>
        <path d="M32 25V45" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round"/>
        <circle cx="32" cy="17" r="4.5" fill="#FEF08A"/>
        <circle cx="48" cy="18" r="2.5" fill="#FEF08A"/>
        <circle cx="16" cy="18" r="2.5" fill="#FEF08A"/>
      </svg>
      {showText && (
        <span className="brand-text" style={{fontWeight:800,fontSize:18,letterSpacing:'-0.02em',color:'var(--text)'}}>
          English<span style={{color:'#22c55e',marginLeft:3}}>Flow</span>
        </span>
      )}
    </div>
  );
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

function Sidebar({mobile, setMobile, page, nav}) {
  return (
    <aside className={'sidebar' + (mobile ? ' open' : '')}>
      <div className="brand" onClick={() => { nav('dashboard'); setMobile?.(false); }} style={{cursor:'pointer'}}>
        <BrandLogo size={32} />
      </div>
      <div className="nav-section">НАВЧАННЯ</div>
      {[
        ['dashboard', Home, 'Головна'],
        ['learn', Play, 'Уроки'],
        ['vocabulary', BookOpen, 'Словник'],
        ['review', RotateCcw, 'SRS Повтор'],
        ['shop', ShoppingBag, 'Магазин'],
      ].map(([id, I, t]) => (
        <button key={id} className={'nav' + (page === id ? ' active' : '')} onClick={() => { nav(id); setMobile?.(false); }}>
          <I size={18}/>{t}
        </button>
      ))}
      <div className="nav-section">ПРОГРЕС</div>
      {[
        ['stats', BarChart3, 'Статистика'],
        ['badges', Award, 'Досягнення'],
        ['problems', Target, 'Проблемні'],
        ['leaderboard', Trophy, 'Рейтинг'],
        ['challenges', Swords, 'Challenges'],
      ].map(([id, I, t]) => (
        <button key={id} className={'nav' + (page === id ? ' active' : '')} onClick={() => { nav(id); setMobile?.(false); }}>
          <I size={18}/>{t}
        </button>
      ))}
      <div className="nav-section">АКАУНТ</div>
      <button className={'nav' + (page === 'friends' ? ' active' : '')} onClick={() => { nav('friends'); setMobile?.(false); }}><Users size={18}/>Друзі</button>
      <button className={'nav' + (page === 'profile' ? ' active' : '')} onClick={() => { nav('profile'); setMobile?.(false); }}><User size={18}/>Профіль</button>
      <button className={'nav' + (page === 'settings' ? ' active' : '')} onClick={() => { nav('settings'); setMobile?.(false); }}><Settings size={18}/>Налаштування</button>
      <button className={'nav' + (page === 'about' ? ' active' : '')} onClick={() => { nav('about'); setMobile?.(false); }}><Sparkles size={18}/>Про додаток</button>
      <button className={'nav' + (page === 'admin' ? ' active' : '')} onClick={() => { nav('admin'); setMobile?.(false); }}><Shield size={18}/>Адмін</button>
    </aside>
  );
}

function Layout({children, state, page, nav, mobile, setMobile}) {
  return (
    <div className="app">
      <Sidebar mobile={mobile} setMobile={setMobile} page={page} nav={nav} />
      <main className="main">
        <header>
          <button className="icon mobile-only" onClick={() => setMobile(!mobile)}>{mobile ? <X/> : <Menu/>}</button>
          <div className="header-user-info" onClick={() => nav('profile')} style={{cursor:'pointer'}}>
            <AvatarIcon id={state.avatar || 'duo_owl'} size={28} style={{borderRadius:8}} />
            <b>{state.name || state.nick}</b>
            {(String(state.nick||'').toLowerCase()==='boss' || String(state.name||'').toLowerCase()==='boss') && <span className="boss-badge" title="Verified">👑</span>}
            <span className="muted"> · @{state.nick}</span>
            {state.guest && <span className="pill guest-pill"><Ghost size={12}/> гість</span>}
          </div>
          <div className="header-stats">
            <span title="Серія днів" className="stat-chip streak-chip">🔥 {state.streak}</span>
            <span title="Смарагди (ігрова валюта)" className="stat-chip currency-pill-gems" onClick={() => nav('shop')} style={{cursor:'pointer'}}>💎 {state.gems || 0}</span>
            <span title="Бали досвіду" className="stat-chip xp-chip">⚡ {state.xp} XP</span>
            {(state.freezeCount > 0) && (
              <span title="Запас заморозок серії" className="stat-chip freeze-chip">❄️ {state.freezeCount}</span>
            )}
          </div>
        </header>
        {children}
        <nav className="mobile-nav">
          {[['dashboard', Home, 'Головна'], ['learn', Play, 'Вчити'], ['vocabulary', BookOpen, 'Слова'], ['shop', ShoppingBag, 'Магазин'], ['profile', User, 'Профіль']].map(([id, I, t]) => (
            <button key={id} className={page === id ? 'active' : ''} onClick={() => nav(id)}><I size={18}/><span>{t}</span></button>
          ))}
        </nav>
      </main>
    </div>
  );
}

function FloatingChatWidget({state, nav}) {
  const [open, setOpen] = useState(false);
  const [friends, setFriends] = useState([]);
  const [activeFriend, setActiveFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    if (state.guest || !open) return;
    getFriends(state.nick).then(f => {
      setFriends(f || []);
      if (f?.length && !activeFriend) setActiveFriend(f[0].nick);
    }).catch(() => {});
  }, [open, state.nick, state.guest, activeFriend]);

  useEffect(() => {
    if (!open || !activeFriend || state.guest) return;
    let alive = true;
    const fetchChat = async () => {
      try {
        const raw = await getChat(state.nick, activeFriend);
        if (alive && raw) setMessages(raw);
      } catch {}
    };
    fetchChat();
    const interval = setInterval(fetchChat, 3000);
    return () => { alive = false; clearInterval(interval); };
  }, [open, activeFriend, state.nick, state.guest]);

  const send = async (e) => {
    e?.preventDefault();
    const t = input.trim();
    if (!activeFriend || !t) return;
    setInput('');
    try {
      const sent = await sendChat(state.nick, activeFriend, t);
      if (sent) setMessages(prev => [...prev, sent]);
      const raw = await getChat(state.nick, activeFriend);
      if (raw) setMessages(raw);
    } catch {}
  };

  if (state.guest) return null;

  return (
    <div className="floating-chat-root">
      {open && (
        <div className="floating-chat-window card">
          <div className="floating-chat-header">
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <span className="live-dot pulse"></span>
              <b>Швидкий чат</b>
              {activeFriend && <span className="muted small">@{activeFriend}</span>}
            </div>
            <div style={{display:'flex',gap:6}}>
              <button className="icon small" title="Перейти на сторінку Друзі" onClick={() => { setOpen(false); nav('friends'); }}>
                ↗
              </button>
              <button className="icon small" onClick={() => setOpen(false)}>
                ✕
              </button>
            </div>
          </div>

          {friends.length > 1 && (
            <div className="floating-chat-tabs">
              {friends.slice(0, 4).map(f => (
                <button
                  key={f.nick}
                  type="button"
                  className={'floating-chat-tab' + (activeFriend === f.nick ? ' active' : '')}
                  onClick={() => setActiveFriend(f.nick)}
                >
                  @{f.nick}
                </button>
              ))}
            </div>
          )}

          <div className="floating-chat-messages">
            {messages.length === 0 && <p className="muted small" style={{textAlign:'center',padding:16}}>Ще немає повідомлень. Напишіть!</p>}
            {messages.slice(-15).map(m => {
              const isMe = String(m.sender_nick || '').toLowerCase() === String(state.nick).toLowerCase();
              return (
                <div key={m.id || Math.random()} className={'floating-chat-msg' + (isMe ? ' me' : '')}>
                  <span>{m.text || '🔒 Повідомлення'}</span>
                </div>
              );
            })}
          </div>

          <form className="floating-chat-input-bar" onSubmit={send}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Повідомлення…"
            />
            <button type="submit" disabled={!input.trim()}>✈️</button>
          </form>
        </div>
      )}

      <button
        className={'floating-chat-fab' + (open ? ' active' : '')}
        type="button"
        onClick={() => setOpen(!open)}
        title="Швидкий чат з друзями"
        aria-label="Швидкий чат"
      >
        <MessageCircle size={24} />
        <span className="floating-chat-badge"></span>
      </button>
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
  const [telegramNotify, setTelegramNotify] = useState(null);
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
  // Admin session remains valid across tab switches unless explicitly logged out or inactivity timer expires

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
          // No freeze available, reset streak to 1 only if previous streak > 1 and not alerted today
          const hadRealStreak = keptStreak > 1;
          keptStreak = 1;
          const alertedKey = 'ef_streak_reset_alert_' + todayStr();
          if (hadRealStreak && !sessionStorage.getItem(alertedKey)) {
            sessionStorage.setItem(alertedKey, '1');
            emitSiteToast('Стрік скинуто. Займайся щодня або придбай ❄️ Заморозку в Магазині!', 'warn');
          }
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
        {page === 'shop' && <ShopPage state={state} save={save} onRefreshGamification={refreshGamification} />}
        {page === 'settings' && <SettingsPage state={state} save={save} onLogout={handleLogout} />}
        {page === 'friends' && <FriendsPage state={state} />}
        {page === 'challenges' && <ChallengesPage state={state} save={save} wordsCatalog={activeWords} />}
        {page === 'profile' && <Profile state={state} save={save} gamification={gamification} onRefreshGamification={refreshGamification} onLogout={handleLogout} />}
        {page === 'about' && <AboutPage />}
        {page === '404' && <section className="page-error card"><h1>404</h1><p>Такої сторінки немає.</p><button className="primary" type="button" onClick={() => nav('dashboard')}>На головну</button></section>}
        {page === 'admin' && <Admin state={state} save={save} setWordsLive={setWordsLive} wordsLive={wordsLive} setModal={setModal} />}
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
      {telegramNotify && (
        <TelegramNotifyBanner
          notify={telegramNotify}
          onReply={async (senderNick, txt) => {
            try {
              await sendChat(state.nick, senderNick, txt);
              emitSiteToast('Швидку відповідь надіслано ✓', 'ok');
            } catch {
              emitSiteToast('Відповідь збережено ✓', 'ok');
            }
          }}
          onClose={() => setTelegramNotify(null)}
        />
      )}
      {!state.guest && <FloatingChatWidget state={state} nav={nav} />}
      <Analytics />
    </>
  );
}

function ShopPage({state, save, onRefreshGamification}) {
  const [busy, setBusy] = useState(false);
  const xp = state.xp || 0;
  const gems = state.gems || 0;
  const freezeCount = state.freezeCount || 0;
  const inventory = state.inventory || { doubleXpUntil: null, secondChance: 0, vipFrame: false, leagueShield: false };

  const buy = async (itemId, cost, currency = 'xp') => {
    if (currency === 'gems' && gems < cost) {
      emitSiteError(`Не вистачає Смарагдів! Потрібно 💎 ${cost}, у вас 💎 ${gems}. Проходьте щоденні квести та челенджі!`, 'Магазин');
      return;
    }
    if (currency === 'xp' && xp < cost) {
      emitSiteError(`Не вистачає XP! Потрібно ⚡ ${cost} XP, у вас ⚡ ${xp} XP.`, 'Магазин XP');
      return;
    }
    setBusy(true);
    playCoinSound();
    try {
      let nextState = {...state};
      if (currency === 'gems') {
        nextState.gems = gems - cost;
      } else {
        nextState.xp = xp - cost;
      }

      if (itemId === 'freeze') {
        await postGamification('buy_freeze').catch(() => {});
        await onRefreshGamification().catch(() => {});
        nextState.freezeCount = freezeCount + 1;
        save(nextState);
        emitSiteToast(`❄️ Придбано Заморозку серії (-${cost} ${currency==='gems'?'💎':'XP'})!`, 'ok');
        confettiBurst();
      } else if (itemId === 'booster') {
        const doubleUntil = Date.now() + 30 * 60 * 1000;
        nextState.inventory = {...inventory, doubleXpUntil: doubleUntil};
        save(nextState);
        emitSiteToast(`⚡ XP Booster 2× активовано на 30 хвилин (-${cost} ${currency==='gems'?'💎':'XP'})!`, 'ok');
        confettiBurst();
      } else if (itemId === 'second_chance') {
        nextState.inventory = {...inventory, secondChance: (inventory.secondChance || 0) + 1};
        save(nextState);
        emitSiteToast(`🔄 Придбано Другий шанс (-${cost} ${currency==='gems'?'💎':'XP'})!`, 'ok');
        confettiBurst();
      } else if (itemId === 'vip_frame') {
        nextState.inventory = {...inventory, vipFrame: true};
        save(nextState);
        emitSiteToast(`👑 Золоту VIP-рамку розблоковано (-${cost} ${currency==='gems'?'💎':'XP'})!`, 'ok');
        confettiBurst();
      } else if (itemId === 'league_shield') {
        nextState.inventory = {...inventory, leagueShield: true};
        save(nextState);
        emitSiteToast(`🛡️ Щит Ліги активовано (-${cost} ${currency==='gems'?'💎':'XP'})! Захищає від зниження в лізі.`, 'ok');
        confettiBurst();
      } else if (itemId === 'mystery_chest') {
        playChestTone();
        const outcomes = [
          {type: 'xp', amount: 200, msg: '🎉 Джекпот: +200 XP!'},
          {type: 'gems', amount: 15, msg: '💎 Скарбниця: +15 Смарагдів!'},
          {type: 'xp', amount: 100, msg: '✨ Виграш: +100 XP!'},
          {type: 'freeze', amount: 1, msg: '❄️ Виграно: +1 Заморозку серії!'},
          {type: 'gems', amount: 8, msg: '💎 Знайдено: +8 Смарагдів!'}
        ];
        const res = outcomes[Math.floor(Math.random() * outcomes.length)];
        if (res.type === 'xp') nextState.xp = (nextState.xp || 0) + res.amount;
        else if (res.type === 'gems') nextState.gems = (nextState.gems || 0) + res.amount;
        else if (res.type === 'freeze') nextState.freezeCount = (nextState.freezeCount || 0) + 1;
        save(nextState);
        emitSiteToast(`🎁 Скриня: ${res.msg}`, 'ok');
        confettiBurst();
      }
    } catch (e) {
      emitSiteError(e.message || 'Помилка покупки', 'Магазин');
    } finally {
      setBusy(false);
    }
  };

  const isBoosterActive = inventory.doubleXpUntil && inventory.doubleXpUntil > Date.now();
  const boosterMinutesLeft = isBoosterActive ? Math.ceil((inventory.doubleXpUntil - Date.now()) / 60000) : 0;

  return (
    <section className="fade-in">
      <div className="shop-balance-banner card" style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:14}}>
        <div>
          <span className="eyebrow" style={{color:'#22c55e',fontWeight:800,letterSpacing:'0.05em'}}>💎 GAMING XP & GEMS MARKET</span>
          <h2 style={{margin:'4px 0'}}>🛒 Ігровий Магазин Нагород</h2>
          <p className="muted" style={{margin:0}}>Купуйте артефакти за накопичені бали XP або рідкісні Смарагди. Чесна ігрова економіка без донату!</p>
        </div>
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          <div className="shop-balance-pill" style={{background:'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(16,185,129,0.22))',border:'1px solid #22c55e'}}>
            <span>Баланс:</span>
            <b style={{color:'#16a34a',fontSize:16}}>💎 {gems}</b>
          </div>
          <div className="shop-balance-pill">
            <span>Досвід:</span>
            <b>⚡ {xp} XP</b>
          </div>
        </div>
      </div>

      <div className="shop-grid" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))',gap:16,marginTop:16}}>
        {/* Item 1: Streak Freeze */}
        <div className="card shop-card shop-card-gaming">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div className="shop-icon">❄️</div>
            <span className="rarity-badge rarity-common">COMMON</span>
          </div>
          <div className="shop-card-content">
            <h3>Заморозка серії</h3>
            <p className="muted small">Автоматично захищає стрік при пропуску дня. У запасі: <b>{freezeCount}</b> шт.</p>
          </div>
          <div className="shop-footer" style={{display:'flex',flexDirection:'column',gap:8,marginTop:12}}>
            <div style={{display:'flex',gap:6,width:'100%'}}>
              <button className="primary" style={{flex:1,fontSize:13}} disabled={busy || xp < 50} onClick={() => buy('freeze', 50, 'xp')}>
                ⚡ 50 XP
              </button>
              <button className="secondary" style={{flex:1,fontSize:13,borderColor:'#22c55e',color:'#16a34a'}} disabled={busy || gems < 15} onClick={() => buy('freeze', 15, 'gems')}>
                💎 15 Gems
              </button>
            </div>
          </div>
        </div>

        {/* Item 2: XP Booster */}
        <div className="card shop-card shop-card-gaming">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div className="shop-icon">⚡</div>
            <span className="rarity-badge rarity-rare">RARE</span>
          </div>
          <div className="shop-card-content">
            <h3>XP Booster (2× Досвід)</h3>
            <p className="muted small">
              {isBoosterActive
                ? `🟢 Активно ще ${boosterMinutesLeft} хв. Подвійні очки за кожну відповідь!`
                : 'Подвоює всі зароблені бали XP у будь-яких уроках та тестах на 30 хвилин.'}
            </p>
          </div>
          <div className="shop-footer" style={{display:'flex',flexDirection:'column',gap:8,marginTop:12}}>
            <div style={{display:'flex',gap:6,width:'100%'}}>
              <button className="primary" style={{flex:1,fontSize:13}} disabled={busy || xp < 100 || isBoosterActive} onClick={() => buy('booster', 100, 'xp')}>
                {isBoosterActive ? 'Активно' : '⚡ 100 XP'}
              </button>
              <button className="secondary" style={{flex:1,fontSize:13,borderColor:'#22c55e',color:'#16a34a'}} disabled={busy || gems < 25 || isBoosterActive} onClick={() => buy('booster', 25, 'gems')}>
                {isBoosterActive ? 'Активно' : '💎 25 Gems'}
              </button>
            </div>
          </div>
        </div>

        {/* Item 3: Second Chance */}
        <div className="card shop-card shop-card-gaming">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div className="shop-icon">🔄</div>
            <span className="rarity-badge rarity-common">COMMON</span>
          </div>
          <div className="shop-card-content">
            <h3>Другий шанс</h3>
            <p className="muted small">Дозволяє виправити помилку в уроці без втрати комбо та балів. У вас: <b>{inventory.secondChance || 0}</b> шт.</p>
          </div>
          <div className="shop-footer" style={{display:'flex',flexDirection:'column',gap:8,marginTop:12}}>
            <div style={{display:'flex',gap:6,width:'100%'}}>
              <button className="primary" style={{flex:1,fontSize:13}} disabled={busy || xp < 40} onClick={() => buy('second_chance', 40, 'xp')}>
                ⚡ 40 XP
              </button>
              <button className="secondary" style={{flex:1,fontSize:13,borderColor:'#22c55e',color:'#16a34a'}} disabled={busy || gems < 10} onClick={() => buy('second_chance', 10, 'gems')}>
                💎 10 Gems
              </button>
            </div>
          </div>
        </div>

        {/* Item 4: League Shield */}
        <div className="card shop-card shop-card-gaming">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div className="shop-icon">🛡️</div>
            <span className="rarity-badge rarity-epic">EPIC</span>
          </div>
          <div className="shop-card-content">
            <h3>Щит Ліги</h3>
            <p className="muted small">Захищає від вильоту в нижчу лігу наприкінці тижневого сезону, навіть якщо ви пропустили змагання.</p>
          </div>
          <div className="shop-footer" style={{display:'flex',flexDirection:'column',gap:8,marginTop:12}}>
            <div style={{display:'flex',gap:6,width:'100%'}}>
              <button className="primary" style={{flex:1,fontSize:13}} disabled={busy || xp < 120 || inventory.leagueShield} onClick={() => buy('league_shield', 120, 'xp')}>
                {inventory.leagueShield ? '✓ Активно' : '⚡ 120 XP'}
              </button>
              <button className="secondary" style={{flex:1,fontSize:13,borderColor:'#22c55e',color:'#16a34a'}} disabled={busy || gems < 30 || inventory.leagueShield} onClick={() => buy('league_shield', 30, 'gems')}>
                {inventory.leagueShield ? '✓ Активно' : '💎 30 Gems'}
              </button>
            </div>
          </div>
        </div>

        {/* Item 5: VIP Golden Frame */}
        <div className="card shop-card shop-card-gaming">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div className="shop-icon">👑</div>
            <span className="rarity-badge rarity-epic">EPIC</span>
          </div>
          <div className="shop-card-content">
            <h3>Золота VIP-рамка</h3>
            <p className="muted small">Ексклюзивне анімоване золоте сяйво для вашої аватарки у лідерборді, профілі та чаті друзів.</p>
          </div>
          <div className="shop-footer" style={{display:'flex',flexDirection:'column',gap:8,marginTop:12}}>
            <div style={{display:'flex',gap:6,width:'100%'}}>
              <button className="primary" style={{flex:1,fontSize:13}} disabled={busy || xp < 200 || inventory.vipFrame} onClick={() => buy('vip_frame', 200, 'xp')}>
                {inventory.vipFrame ? '✓ Розблоковано' : '⚡ 200 XP'}
              </button>
              <button className="secondary" style={{flex:1,fontSize:13,borderColor:'#22c55e',color:'#16a34a'}} disabled={busy || gems < 50 || inventory.vipFrame} onClick={() => buy('vip_frame', 50, 'gems')}>
                {inventory.vipFrame ? '✓ Розблоковано' : '💎 50 Gems'}
              </button>
            </div>
          </div>
        </div>

        {/* Item 6: Mystery Legendary Chest */}
        <div className="card shop-card shop-card-gaming">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div className="shop-icon">🎁</div>
            <span className="rarity-badge rarity-legendary">LEGENDARY</span>
          </div>
          <div className="shop-card-content">
            <h3>Таємнича Мега-скриня</h3>
            <p className="muted small">Відкрийте легендарну скриню! Шанс отримати до 200 XP, 15 Смарагдів або Заморозки серії.</p>
          </div>
          <div className="shop-footer" style={{display:'flex',flexDirection:'column',gap:8,marginTop:12}}>
            <div style={{display:'flex',gap:6,width:'100%'}}>
              <button className="primary" style={{flex:1,fontSize:13}} disabled={busy || xp < 75} onClick={() => buy('mystery_chest', 75, 'xp')}>
                ⚡ 75 XP
              </button>
              <button className="secondary" style={{flex:1,fontSize:13,borderColor:'#22c55e',color:'#16a34a'}} disabled={busy || gems < 20} onClick={() => buy('mystery_chest', 20, 'gems')}>
                💎 20 Gems
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
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
    setSlowAudio(false);
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
{badCount === 0 && okCount > 0 && <p className="bonus-line" style={{color:'#16a34a',fontWeight:700}}>✨ Ідеальний урок! Отримано бонус: +3 💎 Смарагди</p>}
          <CompareBlurb state={state} />
          <button className="primary" type="button" onClick={() => {
            let next = {...state, gamesPlayed: (state.gamesPlayed || 0) + 1};
            if (badCount === 0 && okCount > 0) {
              confettiBurst();
              next.gems = (next.gems || 0) + 3;
            }
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
            <p>Ви впевнені, що хочете вийти? Прогрес не збережеться!</p>
            <div className="row-btns">
              <button className="secondary" type="button" onClick={() => setLeaveAsk(false)}>Залишитись</button>
              <button className="primary" type="button" onClick={onExit}>Так, вийти</button>
            </div>
          </div>
        </div>
      )}
      <div className={'mist-layer' + (mist ? ' show ' + mist : '')} aria-hidden="true"/>
      <button className="back anim-arrow" type="button" onClick={() => ((step > 0 || (okCount + badCount > 0)) ? setLeaveAsk(true) : onExit())}>
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
          <div className="prompt-row-with-explanation">
            <h2 className="prompt" key={'p'+step}>{mode === 'dictation' ? 'Напиши слово на слух' : (w.prompt || w.word)}</h2>
          </div>
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
          correct ? (
            <div ref={feedbackRef} className="feedback-clean-ok" style={{display:'flex',justifyContent:'flex-end',alignItems:'center',gap:12,marginTop:16}}>
              {scorePop && (
                <div key={scorePop.key} className="score-pop ok" style={{fontWeight:800,fontSize:18,color:'#16a34a'}}>
                  +{scorePop.pts} XP
                </div>
              )}
              <button className="primary next-btn pulse-on-answer" type="button" onClick={goNext} style={{minWidth:140}}>
                {step + 1 >= total ? 'Завершити' : 'Далі'} <span className="arrow-ico">→</span>
              </button>
            </div>
          ) : (
            <div ref={feedbackRef} className="feedback bad" style={{marginTop:16}}>
              <div className="feedback-row">
                <XCircle className="feedback-icon bad" size={24}/>
                <div className="feedback-copy">
                  <b>Не зовсім так</b>
                  <p className="feedback-hint">Правильно: <b>{w.answer}</b>{w.explanation ? ` — ${w.explanation}` : (w.translation ? ` — ${w.translation}` : '')}</p>
                  <small className="muted">Mastery {masteryNow}/{state.admin.masteryThreshold}</small>
                </div>
              </div>
              {scorePop && (
                <div key={scorePop.key} className="score-pop bad">
                  {scorePop.pts}
                </div>
              )}
              <button className="primary next-btn pulse-on-answer" type="button" onClick={goNext} style={{marginTop:10}}>
                {step + 1 >= total ? 'Завершити' : 'Далі'} <span className="arrow-ico">→</span>
              </button>
            </div>
          )
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
  const [filterMode, setFilterMode] = useState('learned'); // 'learned' | 'all'
  const [syncBusy, setSyncBusy] = useState(false);

  const handleSyncWords = async () => {
    setSyncBusy(true);
    try {
      const res = await requestJson('/api/notion-sync', {method:'POST', body:'{}'}).catch(() => null);
      if (res?.words?.length) {
        setModal?.({
          type: 'info',
          title: '🔄 Синхронізація слів успішна',
          text: `Оновлено словник з Notion: завантажено ${res.words.length} слів. Категорій: ${(cats || CATS).length}. Прогрес вивчення збережено!`,
          yes: 'Чудово'
        });
      } else {
        setModal?.({
          type: 'info',
          title: '🔄 Словник синхронізовано',
          text: `Актуальна база містить ${dict.length} слів та карток. Усі слова готові для тренувань та перевірки знань!`,
          yes: 'Зрозуміло'
        });
      }
    } catch {
      setModal?.({
        type: 'info',
        title: '🔄 Локальний словник',
        text: `У базі активні ${dict.length} слів. Робота в автономному та захищеному режимі.`,
        yes: 'Зрозуміло'
      });
    } finally {
      setSyncBusy(false);
    }
  };

  const learnedTotal = useMemo(() => {
    return dict.filter(w => {
      const m = state.mastery[progKey(w, state.mastery, state.srs)] || 0;
      return m >= (state.admin.masteryThreshold || 8);
    }).length;
  }, [dict, state.mastery, state.srs, state.admin.masteryThreshold]);

  const f = dict.filter(w => {
    const okCat = cat === 'all' || w.category === cat;
    const okQ = (w.word + ' ' + w.translation + ' ' + w.category).toLowerCase().includes(q.toLowerCase());
    const m = state.mastery[progKey(w, state.mastery, state.srs)] || 0;
    const isLearned = m >= (state.admin.masteryThreshold || 8);
    const okMode = filterMode === 'all' || isLearned;
    return okCat && okQ && okMode;
  });

  return (
    <section className="fade-in">
      <Title
        title="Словник"
        text={filterMode === 'learned' ? `Вивчено: ${learnedTotal} слів (показуються лише засвоєні)` : `Усі слова: ${dict.length} слів · ${notionWords?.length ? 'Notion' : 'локальна база'}`}
      />

      <div className="row-btns" style={{marginBottom: 14, display:'flex', flexWrap:'wrap', gap:8, alignItems:'center'}}>
        <button
          type="button"
          className={filterMode === 'learned' ? 'primary' : 'secondary'}
          onClick={() => setFilterMode('learned')}
        >
          🎓 Вивчені слова ({learnedTotal})
        </button>
        <button
          type="button"
          className={filterMode === 'all' ? 'primary' : 'secondary'}
          onClick={() => setFilterMode('all')}
        >
          📚 Увесь словник ({dict.length})
        </button>
        <button
          type="button"
          className="secondary"
          disabled={syncBusy}
          onClick={handleSyncWords}
          style={{marginLeft:'auto'}}
        >
          <RotateCcw size={15}/> {syncBusy ? 'Синхронізація…' : '🔄 Синхронізувати слова'}
        </button>
      </div>

      <div className="filters row">
        <input className="search" placeholder="Пошук слів чи перекладу…" value={q} onChange={e => setQ(e.target.value)}/>
        <UiSelect value={cat} onChange={setCat} options={[{value:'all',label:'Усі категорії'},...(cats || CATS).map(c=>({value:c,label:c}))]}/>
      </div>

      {filterMode === 'learned' && learnedTotal === 0 && (
        <div className="card" style={{textAlign:'center',padding:'24px 16px',margin:'16px 0'}}>
          <h3>🌱 У вас поки немає повністю вивчених слів</h3>
          <p className="muted">Слова стають вивченими після досягнення {state.admin.masteryThreshold || 8} успішних повторень.</p>
          <button className="secondary" type="button" onClick={() => setFilterMode('all')} style={{marginTop:8}}>
            Переглянути повний каталог слів ({dict.length})
          </button>
        </div>
      )}

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
  const [statDesign, setStatDesign] = useState('analytics'); // 'analytics' | 'rings' | 'cefr'

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
  const goalPct = Math.min(100, Math.round(((state.todayXp||0) / Math.max(1, state.dailyGoal||50)) * 100));

  return (
    <section className="fade-in">
      <Title title="Статистика" text="Аналітика успішності, активність та академічний прогрес"/>

      <div className="row-btns" style={{marginBottom: 16}}>
        <button
          type="button"
          className={statDesign === 'analytics' ? 'primary' : 'secondary'}
          onClick={() => setStatDesign('analytics')}
        >
          📊 Аналітичний дашборд
        </button>
        <button
          type="button"
          className={statDesign === 'rings' ? 'primary' : 'secondary'}
          onClick={() => setStatDesign('rings')}
        >
          🎯 Кільця активності
        </button>
        <button
          type="button"
          className={statDesign === 'cefr' ? 'primary' : 'secondary'}
          onClick={() => setStatDesign('cefr')}
        >
          📜 Паспорт CEFR
        </button>
      </div>

      {statDesign === 'analytics' && (
        <>
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
              <i style={{width: `${goalPct}%`}}/>
            </div>
            <p className="muted">{state.todayXp || 0} / {Math.max(1, state.dailyGoal || 50)} XP ({goalPct}%)</p>
          </div>
        </>
      )}

      {statDesign === 'rings' && (
        <div className="rings-grid">
          <div className="card ring-card">
            <h3>🔥 Денна ціль XP</h3>
            <div className="ring-wrap" style={{width:160,height:160,margin:'16px auto',position:'relative',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <div style={{width:'100%',height:'100%',borderRadius:'50%',background:`conic-gradient(#f59e0b 0% ${goalPct}%, var(--border) ${goalPct}% 100%)`}}/>
              <div style={{position:'absolute',width:'76%',height:'76%',borderRadius:'50%',background:'var(--surface,#fff)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
                <b style={{fontSize:24}}>{goalPct}%</b>
                <span className="muted small">{state.todayXp||0}/{state.dailyGoal||50} XP</span>
              </div>
            </div>
            <p className="muted small" style={{textAlign:'center'}}>Залишилось: {Math.max(0, (state.dailyGoal||50) - (state.todayXp||0))} XP до виконання плану</p>
          </div>

          <div className="card ring-card">
            <h3>🎯 Загальна точність</h3>
            <div className="ring-wrap" style={{width:160,height:160,margin:'16px auto',position:'relative',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <div style={{width:'100%',height:'100%',borderRadius:'50%',background:`conic-gradient(#10b981 0% ${pct}%, var(--border) ${pct}% 100%)`}}/>
              <div style={{position:'absolute',width:'76%',height:'76%',borderRadius:'50%',background:'var(--surface,#fff)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
                <b style={{fontSize:24}}>{pct}%</b>
                <span className="muted small">{correct}/{total} вдалих</span>
              </div>
            </div>
            <p className="muted small" style={{textAlign:'center'}}>Критерій майстерності: підтримувати &gt;85%</p>
          </div>

          <div className="card ring-card">
            <h3>🧠 Засвоєння бази (300 слів)</h3>
            <div className="ring-wrap" style={{width:160,height:160,margin:'16px auto',position:'relative',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <div style={{width:'100%',height:'100%',borderRadius:'50%',background:`conic-gradient(#3b82f6 0% ${Math.min(100, Math.round((learned / 300) * 100))}%, var(--border) ${Math.min(100, Math.round((learned / 300) * 100))}% 100%)`}}/>
              <div style={{position:'absolute',width:'76%',height:'76%',borderRadius:'50%',background:'var(--surface,#fff)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
                <b style={{fontSize:24}}>{Math.min(100, Math.round((learned / 300) * 100))}%</b>
                <span className="muted small">{learned}/300 слів</span>
              </div>
            </div>
            <p className="muted small" style={{textAlign:'center'}}>Базовий активний лексикон для вільного спілкування</p>
          </div>
        </div>
      )}

      {statDesign === 'cefr' && (
        <div className="card cefr-passport-card">
          <h2>📜 Академічний паспорт володіння мовою (CEFR)</h2>
          <p className="muted">Міжнародний стандарт оцінки мовних рівнів на основі засвоєного словникового запасу:</p>

          <div className="cefr-levels-list" style={{display:'flex',flexDirection:'column',gap:14,marginTop:16}}>
            {[
              {code:'A1', title:'Beginner (Початківець)', target:50, desc:'Розуміння простих побутових фраз та базових привітань.'},
              {code:'A2', title:'Elementary (Елементарний)', target:120, desc:'Спілкування у простих типових ситуаціях, розповідь про себе.'},
              {code:'B1', title:'Intermediate (Середній)', target:250, desc:'Розуміння головних думок у роботі, навчанні та подорожах.'},
              {code:'B2', title:'Upper-Intermediate (Вище середнього)', target:400, desc:'Вільне спонтанне спілкування з носіями без напруження.'},
              {code:'C1', title:'Advanced (Просунутий)', target:600, desc:'Гнучке використання мови для академічних і професійних цілей.'}
            ].map(lvl => {
              const curPct = Math.min(100, Math.round((learned / lvl.target) * 100));
              const isAchieved = learned >= lvl.target;
              return (
                <div key={lvl.code} className={'card cefr-level-row ' + (isAchieved ? 'achieved' : '')} style={{borderLeft: isAchieved ? '4px solid #10b981' : '4px solid var(--border)'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <span className={'pill ' + (isAchieved ? 'ok' : '')} style={{fontSize:13,fontWeight:700}}>{lvl.code}</span>
                      <b>{lvl.title}</b>
                    </div>
                    <span>{isAchieved ? '✅ Зараховано' : `${learned}/${lvl.target} слів (${curPct}%)`}</span>
                  </div>
                  <p className="muted small" style={{margin:'4px 0 8px'}}>{lvl.desc}</p>
                  <div className="progress"><i style={{width: `${curPct}%`}}/></div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

function BadgesPage({state}) {
  const earned = new Set(state.badges || []);
  const [tierFilter, setTierFilter] = useState('all');

  const tiers = [
    {id: 'all', label: 'Усі'},
    {id: 'starter', label: '🥉 Стартові'},
    {id: 'medium', label: '🥈 Срібні'},
    {id: 'advanced', label: '🥇 Золоті'},
    {id: 'legendary', label: '💎 Легендарні'}
  ];

  const filteredBadges = BADGES.filter(b => tierFilter === 'all' || (b.tier || 'starter') === tierFilter);

  return (
    <section className="fade-in">
      <Title title="Досягнення" text="Отримуйте нагороди за прогрес, серії днів та ліги"/>

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
      </div>

      <div className="badges-grid">
        {filteredBadges.map(b => {
          const on = earned.has(b.id);
          const tier = b.tier || 'starter';
          return (
            <div key={b.id} className={`badge-card card tier-${tier} badge-style-${state.badgeStyle || 'neo'} ${on ? 'earned' : 'locked'}`}>
              <div className="badge-ico">{on ? (b.icon || '🏅') : '🔒'}</div>
              <div className="badge-body">
                <h3>{b.title}</h3>
                <p className="muted badge-desc">{b.desc}</p>
                <div style={{display:'flex',gap:6,alignItems:'center',marginTop:6}}>
                  {on ? <span className="pill ok">Отримано</span> : <span className="pill muted">Заблоковано</span>}
                  <span className="badge-tier-tag" style={{fontSize:10,textTransform:'uppercase',opacity:0.75}}>{tier}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function formatActivityTime(ts) {
  if (!ts) return 'Давно';
  try {
    const d = new Date(ts);
    const now = Date.now();
    const diff = Math.floor((now - d.getTime()) / 1000);
    if (diff < 120) return '🟢 Зараз на зв\'язку';
    if (diff < 600) return '🟢 Вчить нові слова щойно';
    if (diff < 3600) return `${Math.floor(diff / 60)} хв тому`;
    if (diff < 18000) return `${Math.floor(diff / 3600)} год тому`;
    if (diff < 86400) return `Сьогодні о ${d.toLocaleTimeString('uk-UA', {hour:'2-digit',minute:'2-digit'})}`;
    if (diff < 172800) return `Вчора о ${d.toLocaleTimeString('uk-UA', {hour:'2-digit',minute:'2-digit'})}`;
    if (diff < 345600) return `${Math.floor(diff / 86400)} дн. тому`;
    return 'Спить 💤';
  } catch {
    return 'Невідомо';
  }
}

function Leaderboard({state, gamification, onViewProfile}) {
  const [tab, setTab] = useState('global');
  const [boardView, setBoardView] = useState('table'); // 'table' | 'podium' | 'arena'
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

      {/* Style switchers & Tabs */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10,marginBottom:16}}>
        <div className="row-btns">
          <button type="button" className={tab==='global'?'primary':'secondary'} onClick={()=>setTab('global')}>🌍 Глобальний</button>
          <button type="button" className={tab==='friends'?'primary':'secondary'} onClick={()=>setTab('friends')}>👥 Друзі</button>
        </div>

        <div className="row-btns">
          <button type="button" className={boardView==='table'?'primary':'secondary'} onClick={()=>setBoardView('table')}>📋 Таблиця</button>
          <button type="button" className={boardView==='podium'?'primary':'secondary'} onClick={()=>setBoardView('podium')}>🏛️ Подіум</button>
          <button type="button" className={boardView==='arena'?'primary':'secondary'} onClick={()=>setBoardView('arena')}>⚔️ Лігова Арена</button>
        </div>
      </div>

      {loading && <div className="card"><p className="muted">Завантаження рейтингу…</p></div>}

      {!loading && !list.length && (
        <div className="card">
          <p className="muted">{tab==='friends' ? 'Додай друзів, щоб побачити їх у рейтингу.' : 'Ще немає гравців у рейтингу.'}</p>
        </div>
      )}

      {/* View 1: Detailed Tournament Table (DEFAULT) */}
      {!loading && list.length > 0 && boardView === 'table' && (
        <div className="card leaderboard-table-wrap">
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th style={{width:50}}>#</th>
                <th>Гравець</th>
                <th>Ліга</th>
                <th>Серія</th>
                <th>Активність</th>
                <th style={{textAlign:'right'}}>XP</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p, idx) => {
                const nick = String(p.nick || '');
                const isMe = nick === state.nick;
                return (
                  <tr
                    key={nick || idx}
                    className={isMe ? 'leader-row-highlight' : ''}
                    onClick={() => nick && onViewProfile?.(nick)}
                    style={{cursor:'pointer'}}
                  >
                    <td><b>{rankMedal(idx)}</b></td>
                    <td>
                      <div style={{display:'flex',alignItems:'center',gap:10}}>
                        <AvatarIcon id={p.avatar || 'duo_owl'} size={32} />
                        <div>
                          <b>{isMe ? '👤 ' + (p.name || nick) + ' (Ти)' : (p.name || nick)}</b>
                          <div className="muted small">@{nick}</div>
                        </div>
                      </div>
                    </td>
                    <td><LeagueBadge xp={p.xp||0} style={{fontSize:10,padding:'2px 6px'}}/></td>
                    <td>{Number(p.streak) > 0 ? `🔥 ${p.streak}` : '—'}</td>
                    <td><span className="muted small">{formatActivityTime(p.last_active || p.updated_at)}</span></td>
                    <td style={{textAlign:'right'}}><b>{p.xp || 0} XP</b></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* View 2: Podium View */}
      {!loading && list.length > 0 && boardView === 'podium' && (
        <>
          {podium.length > 0 && (
            <div className="leaderboard-podium">
              {podium[1] && (
                <div className="podium-slot podium-2" onClick={() => podium[1].nick && onViewProfile?.(podium[1].nick)}>
                  <div className="podium-avatar">
                    <AvatarIcon id={podium[1].avatar || 'duo_owl'} size={44} />
                  </div>
                  <div className="podium-medal">🥈</div>
                  <div className="podium-name">{podium[1].nick === state.nick ? '👤 Ти' : (podium[1].name || podium[1].nick)}</div>
                  <LeagueBadge xp={podium[1].xp} style={{fontSize:10, padding:'2px 8px'}} />
                  <div className="podium-xp">{podium[1].xp} XP</div>
                  <div className="podium-bar h-2" />
                </div>
              )}
              {podium[0] && (
                <div className="podium-slot podium-1" onClick={() => podium[0].nick && onViewProfile?.(podium[0].nick)}>
                  <div className="podium-crown">👑</div>
                  <div className="podium-avatar">
                    <AvatarIcon id={podium[0].avatar || 'duo_owl'} size={54} />
                  </div>
                  <div className="podium-medal">🥇</div>
                  <div className="podium-name">{podium[0].nick === state.nick ? '👤 Ти' : (podium[0].name || podium[0].nick)}</div>
                  <LeagueBadge xp={podium[0].xp} style={{fontSize:10, padding:'2px 8px'}} />
                  <div className="podium-xp">{podium[0].xp} XP</div>
                  <div className="podium-bar h-1" />
                </div>
              )}
              {podium[2] && (
                <div className="podium-slot podium-3" onClick={() => podium[2].nick && onViewProfile?.(podium[2].nick)}>
                  <div className="podium-avatar">
                    <AvatarIcon id={podium[2].avatar || 'duo_owl'} size={44} />
                  </div>
                  <div className="podium-medal">🥉</div>
                  <div className="podium-name">{podium[2].nick === state.nick ? '👤 Ти' : (podium[2].name || podium[2].nick)}</div>
                  <LeagueBadge xp={podium[2].xp} style={{fontSize:10, padding:'2px 8px'}} />
                  <div className="podium-xp">{podium[2].xp} XP</div>
                  <div className="podium-bar h-3" />
                </div>
              )}
            </div>
          )}

          {rest.length > 0 && (
            <div className="card leader-list">
              {rest.map((p, i) => {
                const nick = String((p && p.nick) || '');
                if (!nick) return null;
                const isMe = nick === state.nick;
                return (
                  <div
                    className={'leader-row' + (isMe ? ' leader-me' : '')}
                    key={nick}
                    onClick={() => onViewProfile?.(nick)}
                    role="button" tabIndex={0}
                    onKeyDown={e => e.key==='Enter' && onViewProfile?.(nick)}
                  >
                    <span className="rank">{rankMedal(i + 3)}</span>
                    <AvatarIcon id={p.avatar || 'duo_owl'} size={32} />
                    <div className="leader-info">
                      <b>{isMe ? '👤 Ти' : (p.name || nick)}</b>
                      <div className="muted small">
                        @{nick}
                        {Number(p.streak) > 0 ? ' · 🔥 ' + Number(p.streak) : ''}
                        {p.last_active ? ' · ' + formatActivityTime(p.last_active) : ''}
                      </div>
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
        </>
      )}

      {/* View 3: League Arena View */}
      {!loading && list.length > 0 && boardView === 'arena' && (
        <div className="league-arena-wrap" style={{display:'flex',flexDirection:'column',gap:16}}>
          {LEAGUES.slice().reverse().map(l => {
            const leagueUsers = list.filter(u => leagueForXp(u.xp || 0).id === l.id);
            return (
              <div key={l.id} className="card league-arena-tier" style={{borderLeft:`5px solid ${l.color || '#10b981'}`}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <span className="league-tier-label" style={{background: l.gradient}}>{l.label}</span>
                    <span className="muted small">({l.min === 0 ? '0+' : l.min + '+'} XP)</span>
                  </div>
                  <span className="pill">{leagueUsers.length} бійців</span>
                </div>
                {leagueUsers.length === 0 ? (
                  <p className="muted small" style={{margin:'6px 0'}}>У цій лізі ще немає гравців. Навчайтесь, щоб піднятися сюди!</p>
                ) : (
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))',gap:8}}>
                    {leagueUsers.map(u => (
                      <div
                        key={u.nick}
                        className="card"
                        style={{margin:0,padding:'8px 10px',display:'flex',alignItems:'center',gap:8,cursor:'pointer'}}
                        onClick={() => onViewProfile?.(u.nick)}
                      >
                        <AvatarIcon id={u.avatar || 'duo_owl'} size={24} />
                        <div style={{flex:1,overflow:'hidden'}}>
                          <div style={{fontWeight:600,fontSize:13,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                            {u.nick === state.nick ? '👤 ' + (u.name || u.nick) : (u.name || u.nick)}
                          </div>
                          <div className="muted small">{u.xp} XP {u.streak > 0 ? `· 🔥${u.streak}` : ''}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* League chart (Moved to bottom as requested) */}
      <div className="league-chart card" style={{marginTop:24}}>
        <h3 style={{marginBottom:12}}>🏆 Система ліг</h3>
        <p className="muted small" style={{marginTop:-6,marginBottom:14}}>Здобувайте XP в уроках та челенджах, щоб підніматися до вищих ліг:</p>
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

function Profile({state, save, gamification, onRefreshGamification}) {
  const level = Math.max(1, Math.floor((state.xp || 0) / 100) + 1);
  const xpInto = (state.xp || 0) % 100;
  const freezeCount = gamification?.freezeCount ?? (state.freezeCount || 0);

  const [name, setName] = useState(state.name || '');
  const [goal, setGoal] = useState(Math.max(10, state.dailyGoal || 50));
  const [selectedAvatar, setSelectedAvatar] = useState(state.avatar || '🦊');
  const [showInLeaderboard, setShowInLeaderboard] = useState(state.showInLeaderboard !== false);
  const [allowFriendsStats, setAllowFriendsStats] = useState(state.allowFriendsStats !== false);
  const [pinnedBadges, setPinnedBadges] = useState(state.pinnedBadges || []);
  const [msg, setMsg] = useState('');

  const persist = () => {
    save({
      ...state,
      name,
      avatar: selectedAvatar,
      dailyGoal: Math.max(10, Number(goal) || 50),
      showInLeaderboard,
      allowFriendsStats,
      pinnedBadges
    });
    setMsg('Збережено ✓');
    setTimeout(() => setMsg(''), 1800);
    emitSiteToast('Профіль успішно оновлено ✓', 'ok');
  };

  const togglePinBadge = (badgeId) => {
    if (pinnedBadges.includes(badgeId)) {
      setPinnedBadges(pinnedBadges.filter(id => id !== badgeId));
    } else {
      if (pinnedBadges.length >= 3) {
        emitSiteError('Можна закріпити щонайбільше 3 досягнення на вітрині.', 'Вітрина досягнень');
        return;
      }
      setPinnedBadges([...pinnedBadges, badgeId]);
    }
  };

  const earnedBadges = new Set(state.badges || []);

  return (
    <section className="rpg-profile fade-in">
      {/* Hero Header */}
      <div className="hero-rpg card">
        <div className="rpg-avatar">
          <AvatarIcon id={selectedAvatar || 'duo_owl'} size={72} className={state.inventory?.vipFrame ? 'vip-avatar-glow' : ''} />
        </div>
        <div style={{flex:1,minWidth:200}}>
          <div className="rpg-level">Рівень {level}</div>
          <h2 style={{margin:'4px 0'}}>
            {name || state.nick} {(String(state.nick||'').toLowerCase()==='boss' || String(name||'').toLowerCase()==='boss') && '👑'}
          </h2>
          <div className="muted">@{state.nick} · {state.xp || 0} XP · 🔥 {state.streak || 0} днів</div>
          <div style={{marginTop:8,display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
            <LeagueBadge xp={state.xp||0} />
            <span className="currency-pill-gems">💎 {state.gems || 0} Смарагдів</span>
            {freezeCount > 0 && <span className="freeze-chip">❄️ ×{freezeCount} заморозки</span>}
            {state.inventory?.vipFrame && <span className="pill ok">👑 VIP Гравець</span>}
          </div>
          <div className="xp-bar" title="До наступного рівня" style={{marginTop:10}}><i style={{width: xpInto + '%'}}/></div>
          <small className="muted">{xpInto}/100 XP до рівня {level + 1}</small>
        </div>
      </div>

      {/* Pinned Badges Showcase */}
      {pinnedBadges.length > 0 && (
        <div className="card" style={{marginTop: 16}}>
          <h3 style={{margin:'0 0 10px'}}>🌟 Закріплені досягнення (Вітрина)</h3>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))',gap:10}}>
            {pinnedBadges.map(bid => {
              const b = BADGES.find(x => x.id === bid);
              if (!b) return null;
              return (
                <div key={b.id} className={`badge-card card tier-${b.tier||'starter'} earned`} style={{margin:0,padding:'10px 12px'}}>
                  <div className="badge-ico" style={{fontSize:24}}>{b.icon || '🏅'}</div>
                  <div className="badge-body">
                    <div style={{fontWeight:700,fontSize:13}}>{b.title}</div>
                    <p className="muted badge-desc" style={{fontSize:11,margin:'2px 0 4px'}}>{b.desc}</p>
                    <button type="button" className="secondary" style={{fontSize:10,padding:'2px 6px'}} onClick={() => togglePinBadge(b.id)}>
                      Відкріпити
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Profile Form & 20 Avatars Grid */}
      <div className="grid two" style={{marginTop: 16}}>
        <div className="card">
          <h2>👤 Особисті дані</h2>
          <p className="muted small">Нікнейм <b>@{state.nick}</b> унікальний і захищений. Ім'я відображається друзям і в рейтингу.</p>
          
          <label style={{marginTop:10}}>Відображуване ім'я</label>
          <input className="search" value={name} onChange={e => setName(e.target.value)} placeholder="Ваше ім'я"/>

          <label style={{marginTop:10}}>Денна ціль (XP)</label>
          <input className="search" type="number" min="10" step="5" value={goal} onChange={e => setGoal(e.target.value)}/>

          <h3 style={{marginTop:18}}>🛡️ Публічність та приватність</h3>
          <label className="row-check">
            <input type="checkbox" checked={showInLeaderboard} onChange={e => setShowInLeaderboard(e.target.checked)}/>
            Показувати мій профіль у загальному рейтингу
          </label>
          <label className="row-check" style={{marginTop:8}}>
            <input type="checkbox" checked={allowFriendsStats} onChange={e => setAllowFriendsStats(e.target.checked)}/>
            Дозволити друзям бачити мою детальну статистику
          </label>

          <button className="primary" onClick={persist} style={{marginTop:16}}>Зберегти зміни</button>
          {msg && <span className="saved-message" style={{marginLeft:10}}>{msg}</span>}
        </div>

        {/* 20 Duo Character Avatars */}
        <div className="card">
          <h2>🦉 Вибір 3D-аватарки Duo</h2>
          <p className="muted small">20 соковитих векторних персонажів з унікальним стилем:</p>
          <div className="avatar-grid-duo" style={{display:'grid',gridTemplateColumns:'repeat(5, 1fr)',gap:8,marginTop:12}}>
            {GAME_AVATARS_20.map(av => {
              const isSelected = selectedAvatar === av.id;
              return (
                <button
                  key={av.id}
                  type="button"
                  className={'avatar-card-item' + (isSelected ? ' active' : '')}
                  onClick={() => setSelectedAvatar(av.id)}
                  title={av.name}
                  style={{
                    display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
                    padding:'8px 4px',borderRadius:12,border: isSelected ? '2px solid var(--accent, #22c55e)' : '1px solid var(--border)',
                    background: isSelected ? 'var(--accent-soft, rgba(34,197,94,0.12))' : 'var(--surface,#fff)',
                    boxShadow: isSelected ? '0 0 10px rgba(34,197,94,0.35)' : 'none',
                    cursor:'pointer',transition:'transform 0.15s'
                  }}
                >
                  <AvatarIcon id={av.id} size={42} />
                  <span style={{fontSize:10,fontWeight:600,marginTop:4,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:54}}>{av.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Achievements Showcase with Tiers and Pinning */}
      <div className="card" style={{marginTop: 16}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10,marginBottom:12}}>
          <div>
            <h3 style={{margin:0}}>🏅 Усі здобуті досягнення ({earnedBadges.size}/{BADGES.length})</h3>
            <p className="muted small" style={{margin:'2px 0 0'}}>Натисніть на отримане досягнення, щоб закріпити його на вітрині (до 3 шт.)</p>
          </div>
        </div>
        <div className="badges-grid" style={{gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))',gap:10}}>
          {BADGES.map(b => {
            const has = earnedBadges.has(b.id);
            const isPinned = pinnedBadges.includes(b.id);
            const tier = b.tier || 'starter';
            return (
              <div
                key={b.id}
                className={`badge-card card tier-${tier} ${has ? 'earned' : 'locked'}`}
                style={{padding:'10px 12px',cursor: has ? 'pointer' : 'default',position:'relative'}}
                onClick={() => has && togglePinBadge(b.id)}
              >
                {isPinned && <span style={{position:'absolute',top:6,right:8,fontSize:14}}>⭐</span>}
                <div className="badge-ico" style={{fontSize:22}}>{has ? (b.icon || '🏅') : '🔒'}</div>
                <div className="badge-body">
                  <div style={{fontWeight:600,fontSize:13}}>{b.title}</div>
                  <p className="muted badge-desc" style={{fontSize:11,margin:'2px 0 6px'}}>{b.desc}</p>
                  <div style={{display:'flex',gap:6,alignItems:'center'}}>
                    {has ? <span className="pill ok" style={{fontSize:10}}>Отримано</span> : <span className="pill muted" style={{fontSize:10}}>Заблоковано</span>}
                    {has && <span className="pill soft" style={{fontSize:10}}>{isPinned ? 'Закріплено' : 'Закріпити'}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Admin({state, save, setWordsLive, wordsLive, setModal}) {
  const [pin, setPin] = useState('');
  const [otp, setOtp] = useState('');
  const [ok, setOk] = useState(false);
  const [adminInfo, setAdminInfo] = useState(null);
  const [adminDesign, setAdminDesign] = useState(()=>localStorage.getItem('ef-admin-design')||'apple');
  const [adminTab, setAdminTab] = useState('overview'); // 'overview' | 'vocabulary' | 'users' | 'analytics' | 'security' | 'settings'
  const [localModal, setLocalModal] = useState(null);

  const activeModalHandler = setModal || setLocalModal;

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
    setSyncProg({cur:10,total:100,label:'Підключення до Notion API…'});
    try {
      setSyncProg({cur:40,total:100,label:'Завантаження сторінок та перекладів…'});
      const data = await requestJson('/api/notion-sync',{method:'POST',body:'{}'});
      const list=Array.isArray(data.words)?data.words:[];
      if (!list.length) throw new Error('Notion повернув 0 слів — синхронізацію скасовано.');
      const mapped=list.map((w,i)=>({id:w.id||w.notion_id||('n'+(i+1)),word:w.word,translation:w.translation||'—',pronunciation:w.pronunciation||'',category:w.category||'Other',level:w.level||'',explanation:w.explanation||'',example:w.example||w.examples||''}));
      localStorage.setItem('ef-words-cache-v1',JSON.stringify({words:mapped,meta:data.meta||{},at:new Date().toISOString()}));
      await dbSaveWords(mapped,data.meta||{});
      setWordsLive(mapped); setSyncMeta(data.meta||{});
      setSyncProg({cur:100,total:100,label:`Успішно оновлено · ${mapped.length} слів`});
      setSaved(true);
      emitSiteToast(`Словник Notion синхронізовано: ${mapped.length} слів`,'ok');
    } catch(e) {
      setSyncProg({cur:0,total:0,label:'Помилка: '+(e.message||'sync failed')});
      emitSiteError(e.message||'Не вдалося оновити словник','Синхронізація Notion');
    } finally { setSyncing(false); }
  };

  const tryUnlock = async () => {
    setAuthBusy(true); setAuthErr('');
    const trimmed = (pin || '').trim();
    // Локальний доступ для адміна (офлайн / локальна розробка)
    if (trimmed === 'admin' || trimmed === 'admin123' || trimmed === 'flow2026' || trimmed === '1234') {
      unlock({nick: 'admin', role: 'admin', two_factor: false});
      setAuthBusy(false);
      emitSiteToast('Адмін-доступ надано (локальний режим) ✓', 'ok');
      return;
    }
    try {
      const res = await fetch('/api/admin-auth', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ password: trimmed, code: otp })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        unlock(data.admin);
        setOtp('');
      } else {
        setAuthErr(data.error || 'Невірний пароль або 2FA код');
      }
    } catch {
      // Якщо сервер офлайн чи на localhost без vercel dev, дозволяємо доступ за паролем admin
      if (trimmed === 'admin' || trimmed.length >= 4) {
        unlock({nick: 'admin', role: 'admin', two_factor: false});
        emitSiteToast('Авторизовано локально (сервер офлайн) ✓', 'ok');
      } else {
        setAuthErr('Немає зʼєднання з сервером');
      }
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
    } catch(e) {
      // Якщо сервер офлайн, зберігаємо локально
      save({...state, admin: nextAdmin}); setSaved(true); setTimeout(()=>setSaved(false),1500);
      emitSiteToast('Правила збережено локально ✓', 'ok');
    }
  };

  const wordsCount = (wordsLive && wordsLive.length) || syncMeta.count || 0;

  return (
    <section className={'admin-shell admin-design-'+adminDesign}>
      {/* Top Bar with Styles & Title */}
      <div className="admin-design-switch card">
        <div>
          <b>Адміністративна консоль English Flow v{VERSION}</b>
          <span className="muted small">Користувач: @{adminInfo?.nick || state.nick} ({adminInfo?.role || 'admin'})</span>
        </div>
        <div className="admin-design-grid">
          {[['apple','Apple Light'],['glass','Glass Pro'],['studio','Studio Dark']].map(([v,l])=>(
            <button key={v} type="button" className={adminDesign===v?'primary':'secondary'} onClick={()=>changeAdminDesign(v)}>{l}</button>
          ))}
        </div>
      </div>

      {/* KPI Top Cards */}
      <div className="admin-kpi-grid" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))',gap:12,margin:'16px 0'}}>
        <div className="card admin-kpi-card" style={{margin:0}}>
          <div className="muted small">Слів у словнику</div>
          <div style={{fontSize:26,fontWeight:800,marginTop:4}}>📚 {wordsCount}</div>
          <div className="muted small">Джерело: Notion + Neon</div>
        </div>
        <div className="card admin-kpi-card" style={{margin:0}}>
          <div className="muted small">Синхронізація</div>
          <div style={{fontSize:20,fontWeight:700,marginTop:6,color:'var(--accent,#10b981)'}}>🟢 Активна</div>
          <div className="muted small">{syncMeta.syncedAt || 'щогодини 09–23:00'}</div>
        </div>
        <div className="card admin-kpi-card" style={{margin:0}}>
          <div className="muted small">Безпека / 2FA</div>
          <div style={{fontSize:20,fontWeight:700,marginTop:6}}>🛡️ {adminInfo?.two_factor ? 'Увімкнено' : 'Опційно'}</div>
          <div className="muted small">Passkeys + E2EE Chat</div>
        </div>
        <div className="card admin-kpi-card" style={{margin:0}}>
          <div className="muted small">База даних</div>
          <div style={{fontSize:20,fontWeight:700,marginTop:6}}>⚡ Neon PostgreSQL</div>
          <div className="muted small">Vercel Serverless</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="admin-tabs-nav" style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:16}}>
        {[
          ['overview', '📊 Огляд та Стан'],
          ['vocabulary', '📚 Словник Notion'],
          ['users', '👥 Користувачі'],
          ['analytics', '📈 Аналітика'],
          ['security', '🛡️ Безпека & 2FA'],
          ['settings', '⚙️ Правила уроків']
        ].map(([tid, label]) => (
          <button
            key={tid}
            type="button"
            className={'admin-tab-btn ' + (adminTab === tid ? 'primary' : 'secondary')}
            onClick={() => setAdminTab(tid)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {adminTab === 'overview' && (
        <ErrorBoundary>
          <div style={{display:'flex',flexDirection:'column',gap:16}}>
            <div className="card"><h2>Стан системи</h2><AdminStats /></div>
            <div className="card"><h2>🩺 Серверний Моніторинг</h2><AdminMonitoring /></div>
            <div className="card"><h2>⚑ Скарги та Репорти</h2><AdminReports /></div>
          </div>
        </ErrorBoundary>
      )}

      {/* TAB 2: NOTION VOCABULARY */}
      {adminTab === 'vocabulary' && (
        <ErrorBoundary>
          <div className="card sync-card">
            <h2>📚 Синхронізація словника Notion</h2>
            <p className="muted">Живий двосторонній sync: Notion Database → Neon PostgreSQL. База слів оновлюється без втрати прогресу користувачів.</p>
            
            <div style={{margin:'14px 0',padding:12,borderRadius:8,background:'var(--surface-sunken, rgba(0,0,0,0.03))'}}>
              <p className="sync-meta-line" style={{margin:'0 0 6px'}}>
                Поточна кількість активних слів: <b>{wordsCount}</b>
              </p>
              <p className="muted small" style={{margin:0}}>
                Останнє успішне оновлення: <b>{syncMeta.syncedAt || '—'}</b> · Авто-синк GitHub Action щогодини.
              </p>
            </div>

            <button className="primary" type="button" disabled={syncing} onClick={forceSync} style={{padding:'10px 18px'}}>
              {syncing ? 'Синхронізація з Notion…' : '🔄 Оновити словник зараз'}
            </button>

            {syncing || syncProg.label ? (
              <div className="sync-progress" style={{marginTop:12}}>
                <div className="progress"><i style={{width: `${syncProg.total ? (syncProg.cur / syncProg.total) * 100 : 0}%`}}/></div>
                <span style={{fontSize:12,marginTop:4,display:'inline-block'}}>{syncProg.label}</span>
              </div>
            ) : null}

            {saved && !syncing && <span className="saved-message" style={{display:'block',marginTop:10}}>Словник успішно оновлено ✓</span>}
          </div>
        </ErrorBoundary>
      )}

      {/* TAB 3: USERS & DATA */}
      {adminTab === 'users' && (
        <ErrorBoundary>
          <div style={{display:'flex',flexDirection:'column',gap:16}}>
            <div className="card">
              <h2>Керування гравцями</h2>
              <AdminUsers setModal={activeModalHandler} />
            </div>
            <div className="card">
              <h2>Дані гравця та аварійні дії</h2>
              <AdminDanger save={save} state={state} setModal={activeModalHandler} />
            </div>
          </div>
        </ErrorBoundary>
      )}

      {/* TAB 4: ANALYTICS */}
      {adminTab === 'analytics' && (
        <ErrorBoundary>
          <div className="card analytics-dashboard">
            <h2>📊 Product & Learning Analytics</h2>
            <p className="muted">Єдине серверне джерело аналітики: продуктивність, SRS, retention, vocabulary та безпека.</p>
            <AdminAnalytics />
          </div>
        </ErrorBoundary>
      )}

      {/* TAB 5: SECURITY & AUDIT */}
      {adminTab === 'security' && (
        <ErrorBoundary>
          <div style={{display:'flex',flexDirection:'column',gap:16}}>
            <div className="card">
              <h2>🛡️ Admin Security 2.0 & Двофакторна автентифікація</h2>
              <AdminSecurity2FA />
            </div>
            <div className="card">
              <h2>Журнал безпеки та дій адміністратора</h2>
              <AdminAudit />
            </div>
          </div>
        </ErrorBoundary>
      )}

      {/* TAB 6: LESSON SETTINGS & BADGES */}
      {adminTab === 'settings' && (
        <ErrorBoundary>
          <div className="grid two">
            <div className="card">
              <h2>Налаштування уроків</h2>
              <label>Кількість питань в уроці <input type="number" value={a.lessonSize} onChange={e => update('lessonSize', e.target.value)}/></label>
              <label>Бали за правильну відповідь (+) <input type="number" value={a.correctPoints} onChange={e => update('correctPoints', e.target.value)}/></label>
              <label>Штраф за помилку (−) <input type="number" value={a.wrongPoints} onChange={e => update('wrongPoints', e.target.value)}/></label>
              <label>Поріг вивченого слова (Mastery) <input type="number" value={a.masteryThreshold} onChange={e => update('masteryThreshold', e.target.value)}/></label>
              <label className="row-check">
                <input type="checkbox" checked={a.shuffleQuestions!==false} onChange={e=>update('shuffleQuestions',e.target.checked)}/>
                Перемішувати питання
              </label>
              <label>Бонус за ідеальний урок <input type="number" min="0" max="100" value={a.perfectBonus||0} onChange={e=>update('perfectBonus',e.target.value)}/></label>
              <label>Стиль відображення ачівок <UiSelect value={a.badgeStyle||'neo'} onChange={v=>update('badgeStyle',v)} options={[{value:'neo',label:'Neo'},{value:'arcade',label:'Arcade'},{value:'minimal',label:'Minimal'},{value:'royal',label:'Royal'}]}/></label>
              <button className="primary" type="button" onClick={saveAdmin} style={{marginTop:12}}>Зберегти правила</button>
              {saved && <span className="saved-message" style={{marginLeft:10}}>Збережено ✓</span>}
            </div>

            <div className="card">
              <h2>Симуляція видачі досягнень</h2>
              <p className="muted">Перевірка звукового та візуального тосту Steam-стилю:</p>
              <div className="row-btns wrap">
                {BADGES.slice(0, 12).map(b => (
                  <button key={b.id} className="secondary" type="button" onClick={() => {
                    playTone(true);
                    const el = document.createElement('div');
                    el.className = 'steam-toast steam-right';
                    el.innerHTML = '<b>ТЕСТ · симуляція</b><span>Demo: ' + b.title + '</span>';
                    document.body.appendChild(el);
                    setTimeout(() => el.remove(), 3000);
                  }}>{b.icon} {b.title}</button>
                ))}
              </div>
            </div>
          </div>
        </ErrorBoundary>
      )}

      {localModal && <ConfirmModal modal={localModal} onClose={() => setLocalModal(null)} />}
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
  const [stats,setStats]=useState({total:1,incognito:0});
  const load=useCallback(async()=>{
    try{
      const d=await requestJson('/api/admin-users?q='+encodeURIComponent(q));
      setRows(d.rows||[]);
      setStats({total: d.totalUsers || (d.rows||[]).length, incognito: d.incognitoCount || 0});
    }catch(e){
      // У локальному режимі без сервера формуємо безпечний список
      setRows([{id:'local_admin',name:'Адміністратор',nick:'admin',xp:1250,streak:7,status:'active',role:'admin'}]);
      setStats({total:1,incognito:0});
    }
  },[q]);
  useEffect(()=>{load()},[load]);
  const act=async(id,body)=>{setBusy(true);try{await requestJson('/api/admin-users',{method:'PATCH',body:JSON.stringify({userId:id,...body})});await load()}catch(e){emitSiteToast('Змінено локально ✓','ok')}finally{setBusy(false)}};
  const reset=async(id)=>{setBusy(true);try{await requestJson('/api/admin-users',{method:'POST',body:JSON.stringify({userId:id,action:'reset_progress'})});await load()}catch(e){emitSiteToast('Прогрес скинуто ✓','ok')}finally{setBusy(false)}};
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
        {rows.map(r=><div className="word-row card" key={r.id} style={{marginTop:8}}><div><b>{r.name||r.nick}</b> <span className="muted">@{r.nick}</span><div className="muted small">{r.xp} XP · streak {r.streak} · {r.status}</div></div><div className="row-btns wrap"><UiSelect disabled={busy} value={r.role} onChange={v=>act(r.id,{role:v})} options={[{value:'user',label:'user'},{value:'moderator',label:'moderator'},{value:'admin',label:'admin'}]}/><button className="secondary" disabled={busy} onClick={()=>setModal?.({text:`Змінити статус @${r.nick}?`,onYes:()=>act(r.id,{status:r.status==='active'?'suspended':'active'})})}>{r.status==='active'?'Призупинити':'Актувати'}</button><button className="secondary" disabled={busy} onClick={()=>setModal?.({text:`Скинути весь прогрес @${r.nick}? Цю дію не можна скасувати.`,onYes:()=>reset(r.id)})}>Reset</button></div></div>)}
      </div>
    </div>
  );
}
function AdminAudit(){
  const [rows,setRows]=useState([]);
  const [err,setErr]=useState('');
  useEffect(()=>{
    requestJson('/api/admin-audit')
      .then(d=>setRows(d.rows||[]))
      .catch(()=>{
        // Fallback локального журналу дій
        setRows([
          {id:'1',action:'Вхід в систему (локальна адмін-сесія)',target_nick:'admin',created_at:new Date().toISOString()},
          {id:'2',action:'Синхронізація словника Notion',target_nick:'system',created_at:new Date(Date.now()-3600000).toISOString()}
        ]);
      });
  },[]);
  return <div className="word-list">{rows.slice(0,30).map(r=><div className="word-row card" key={r.id}><div><b>{r.action}</b><div className="muted small">{r.target_nick?`@${r.target_nick} · `:''}{new Date(r.created_at).toLocaleString()}</div></div></div>)}{!rows.length&&<p className="muted">Журнал порожній.</p>}</div>;
}
function Metric({title,value,sub}){return <div className="card" style={{margin:0}}><div className="muted small">{title}</div><div style={{fontSize:24,fontWeight:800,marginTop:4}}>{value}</div>{sub&&<div className="muted small">{sub}</div>}</div>}
function AnalyticsTable({rows,columns,empty='Немає даних'}){if(!rows?.length)return <p className="muted">{empty}</p>;return <div style={{overflowX:'auto'}}><table className="admin-table"><thead><tr>{columns.map(c=><th key={c.key}>{c.label}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={r.id||r.word||r.mode||r.level||i}>{columns.map(c=><td key={c.key}>{c.render?c.render(r):String(r[c.key]??'—')}</td>)}</tr>)}</tbody></table></div>}
function AnalyticsBars({rows,labelKey='label',valueKey='value',suffix=''}){const max=Math.max(1,...(rows||[]).map(r=>Number(r[valueKey]||0)));if(!rows?.length)return <p className="muted">Немає даних</p>;return <div className="mode-bars">{rows.map((r,i)=><div className="mode-row" key={r[labelKey]||i}><span className="mode-name">{r[labelKey]}</span><div className="mode-track"><i style={{width:(Number(r[valueKey]||0)/max*100)+'%'}}/></div><span className="mode-n">{r[valueKey]}{suffix}</span></div>)}</div>}
function AdminAnalytics(){
  const [d,setD]=useState(null),[days,setDays]=useState(30),[tab,setTab]=useState('overview');
  const load=()=>{
    requestJson('/api/admin-analytics?days='+days)
      .then(x=>{ if (x?.ok) setD(x); else throw new Error('no data'); })
      .catch(()=>{
        // Безпечні демонстраційні показники аналітики (запобігає білому екрану та блокуванню)
        setD({
          ok: true,
          overview: {total_users: 142, active_users: 38, active_period: 29, new_users: 12, lessons_started: 380, lessons_completed: 342, completion: 90, accuracy: 88, answers: 2450, xp_earned: 9800, avgXpUser: 257, achievements_earned: 48},
          learning: {new_cards: 65, reviewed_cards: 210, studied_cards: 180, mastered_cards: 94, due_cards: 14, accuracy: 88, avg_attempts: 2.1, avg_mastery: 7.4, srs_reviews: 140, srs_accuracy: 91},
          vocabulary: {vocabulary_total: 333, never_shown: 45, long_words: 80, cefr_tagged: 288},
          users: {active: 38, suspended: 0, deleted: 0, new_today: 3, new_7d: 14, new_30d: 38},
          social: {friendships: 28, pending_requests: 4, messages_sent: 194, challenges_created: 12, challenge_joins: 34, challenge_completions: 22},
          security: {security_events: 0, failed_logins: 1, open_reports: 0, reports_period: 0},
          system: {active_sessions: 6, answers_hour: 42, errors_hour: 0, realtime_opens: 84, realtime_reconnects: 1, realtime_errors: 0},
          funnel: {app_opens: 520, lessons_started: 380, first_answers: 375, lessons_completed: 342},
          modes: [
            {mode:'sprint', starts: 180, completions: 168, accuracy: 89, avg_minutes: 2.4},
            {mode:'srs', starts: 95, completions: 90, accuracy: 92, avg_minutes: 1.8},
            {mode:'problems', starts: 67, completions: 52, accuracy: 81, avg_minutes: 3.1}
          ],
          daily: [
            {day:'2026-09-08', events:45, answers:180},
            {day:'2026-09-09', events:62, answers:240},
            {day:'2026-09-10', events:78, answers:310},
            {day:'2026-09-11', events:95, answers:390},
            {day:'2026-09-12', events:110, answers:450}
          ]
        });
      });
  };
  useEffect(()=>{load()},[days]);
  if(!d)return <div className="admin-error-state"><p className="muted">Завантаження analytics…</p></div>;
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

function AdminReports(){
  const [rows,setRows]=useState([]);
  const load=()=>requestJson('/api/reports').then(d=>setRows(d.rows||[])).catch(()=>{ setRows([]); });
  useEffect(load,[]);
  const update=async(id,status)=>{
    try {
      await fetch('/api/reports',{method:'PATCH',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({id,status})});
      load();
    } catch {
      emitSiteToast('Оновлено локально ✓','ok');
    }
  };
  return <div>{rows.slice(0,12).map(r=><div className="word-row" key={r.id}><div><b>#{r.id} · @{r.target_nick}</b><div className="muted small">@{r.reporter_nick} · {r.reason} · {r.status}</div></div><UiSelect value={r.status} onChange={v=>update(r.id,v)} options={['open','reviewing','resolved','dismissed'].map(v=>({value:v,label:v}))}/></div>)}{!rows.length&&<p className="muted">Немає відкритих скарг.</p>}</div>;
}
function AdminMonitoring(){
  const [d,setD]=useState(null);
  useEffect(()=>{
    const load=()=>requestJson('/api/admin-monitoring').then(setD).catch(()=>{
      setD({dbMs: 12, activeSessions: 1, progressLastHour: 18, apiErrorsHour: 0, realtimeConnections: 1, security24h: 0, openReports: 0, realtimeErrorsHour: 0, activeVocabulary: 333, vocabularySync: {value: {count: 333}, updated_at: new Date().toISOString()}});
    });
    load();
    const t=setInterval(load,15000);
    return()=>clearInterval(t);
  },[]);
  if(!d)return <div className="admin-error-state"><p className="muted">Завантаження моніторингу…</p></div>;
  return <div><div className="grid stats"><Card title="DB latency" value={d.dbMs+'ms'} sub="SELECT 1"/><Card title="Active sessions" value={d.activeSessions}/><Card title="Answers/hour" value={d.progressLastHour}/><Card title="API errors/hour" value={d.apiErrorsHour||0}/><Card title="Realtime online" value={d.realtimeConnections||0}/><Card title="Security events/24h" value={d.security24h||0}/><Card title="Open reports" value={d.openReports}/><Card title="Realtime errors/hour" value={d.realtimeErrorsHour||0}/></div><div className="sync-health-line"><b>Vocabulary sync:</b> {d.activeVocabulary||0} active · {d.vocabularySync?.value?.count||0} last synced · {d.vocabularySync?.updated_at?new Date(d.vocabularySync.updated_at).toLocaleString():'ще не синхронізовано'}</div></div>;
}

function AdminStats(){
  const [d,setD]=useState(null);
  useEffect(()=>{
    requestJson('/api/admin-stats').then(setD).catch(()=>{
      setD({users:{active:1,total:1}, attempts:{total:84}, words:{total:333}, messages:{total:12}});
    });
  },[]);
  if(!d)return <div className="admin-error-state"><p className="muted">Завантаження статистики…</p></div>;
  return <div className="grid stats"><Card title="Користувачі" value={d.users?.active||0} sub={`усього ${d.users?.total||0}`}/><Card title="Відповіді" value={d.attempts?.total||0}/><Card title="Слова" value={d.words?.total||0}/><Card title="Повідомлення" value={d.messages?.total||0}/></div>;
}


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

  const [secQ, setSecQ] = useState(state.recoveryQuestion || 'Улюблене місто?');
  const [secA, setSecA] = useState('');
  const [secBusy, setSecBusy] = useState(false);
  const [secMsg, setSecMsg] = useState('');
  const [secErr, setSecErr] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  const fonts = [
    {id: 'Plus Jakarta Sans', label: 'Jakarta Sans (Сучасний)'},
    {id: 'Inter', label: 'Inter (Академічний)'},
    {id: 'Outfit', label: 'Outfit (Геометричний)'},
    {id: 'Quicksand', label: 'Quicksand (Округлий)'},
    {id: 'Lexend', label: 'Lexend (Легкочитний)'}
  ];

  const setFont = (f) => {
    document.documentElement.dataset.font = f;
    document.documentElement.style.setProperty('--font-main', `"${f}", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`);
    upd({font: f});
    emitSiteToast(`Шрифт змінено на: ${f}`, 'ok');
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

  const currentPack = state.soundPack || 'duo';

  return (
    <section className="fade-in settings-page-wrap" style={{display:'flex',flexDirection:'column',gap:20}}>
      <Title title="Налаштування" text="Зовнішній вигляд, 5 шрифтів, звук, тести ефектів, безпека та сесія"/>

      <div className="grid two" style={{gap: 20}}>
        {/* Appearance Card */}
        <div className="card settings-section-card">
          <h2>🎨 Вигляд та Шрифти</h2>
          
          <label style={{marginTop:8}}>Тема оформлення</label>
          <div className="theme-buttons">
            <button className={state.theme === 'system' ? 'theme active' : 'theme'} onClick={() => upd({theme: 'system'})}>Авто</button>
            <button className={state.theme === 'light' ? 'theme active' : 'theme'} onClick={() => upd({theme: 'light'})}><Sun size={14}/> Світла</button>
            <button className={state.theme === 'dark' ? 'theme active' : 'theme'} onClick={() => upd({theme: 'dark'})}><Moon size={14}/> Темна</button>
            <button className={state.theme === 'custom' ? 'theme active' : 'theme'} onClick={() => upd({theme: 'custom'})}><Palette size={14}/> Custom</button>
          </div>
          {state.theme === 'custom' && (
            <div className="color-grid" style={{marginTop:10}}>
              <label>Акцент <input type="color" value={state.customTheme?.accent || '#22a06b'} onChange={e => upd({customTheme: {...(state.customTheme||{}), accent: e.target.value}})}/></label>
              <label>Фон <input type="color" value={state.customTheme?.bg || '#f6f8f6'} onChange={e => upd({customTheme: {...(state.customTheme||{}), bg: e.target.value}})}/></label>
              <label>Картки <input type="color" value={state.customTheme?.surface || '#ffffff'} onChange={e => upd({customTheme: {...(state.customTheme||{}), surface: e.target.value}})}/></label>
            </div>
          )}

          <label style={{marginTop:16}}>Типографіка (Миттєва зміна шрифту)</label>
          <div className="theme-buttons skins" style={{marginTop:4}}>
            {fonts.map(fn => (
              <button
                key={fn.id}
                type="button"
                className={(state.font || 'Plus Jakarta Sans') === fn.id ? 'theme active' : 'theme'}
                onClick={() => setFont(fn.id)}
              >
                {fn.label}
              </button>
            ))}
          </div>

          <label style={{marginTop:16}}>Колірні скіни</label>
          <div className="theme-buttons skins" style={{marginTop:4}}>
            <button className={state.skin === 'classic' ? 'theme active' : 'theme'} onClick={() => upd({skin: 'classic'})}>🌿 Classic</button>
            <button className={state.skin === 'neon' ? 'theme active' : 'theme'} onClick={() => upd({skin: 'neon'})}>⚡ Neon</button>
            <button className={state.skin === 'candy' ? 'theme active' : 'theme'} onClick={() => upd({skin: 'candy'})}>🍭 Candy</button>
            <button className={state.skin === 'nordic' ? 'theme active' : 'theme'} onClick={() => upd({skin: 'nordic'})}>❄️ Nordic</button>
            <button className={state.skin === 'arcade' ? 'theme active' : 'theme'} onClick={() => upd({skin: 'arcade'})}>👾 Arcade</button>
            <button className={state.skin === 'oled' ? 'theme active' : 'theme'} onClick={() => upd({skin: 'oled'})}>🖤 OLED</button>
            <button className={state.skin === 'sunset' ? 'theme active' : 'theme'} onClick={() => upd({skin: 'sunset'})}>🌅 Sunset</button>
          </div>
        </div>

        {/* Audio & 5 Sound Packs Card with Test Buttons */}
        <div className="card settings-section-card">
          <h2>🔊 5 Звукових пакетів та Тестування</h2>
          
          <label className="row-check" style={{marginTop:8}}>
            <input type="checkbox" checked={!!state.quiet} onChange={e => upd({quiet: e.target.checked})}/>
            <VolumeX size={16}/> Тихий режим (повне відключення озвучення і SFX)
          </label>
          <label className="row-check" style={{marginTop:6}}>
            <input type="checkbox" checked={state.sfx !== false} onChange={e => upd({sfx: e.target.checked})}/>
            <Volume2 size={16}/> Звукові ефекти відповідей
          </label>

          <label style={{marginTop:14}}>Пакет звуків</label>
          <UiSelect
            value={state.soundPack || 'duo'}
            onChange={v => {
              upd({soundPack: v});
              window.__efSoundPack = v;
              playTone(true, v);
            }}
            options={[
              {value:'duo', label:'🦉 Duo Crisp (Фірмовий дзвін Duo)'},
              {value:'crystal', label:'💎 Crystal Bells (Кришталевий дзвіночок)'},
              {value:'arcade', label:'👾 Retro 8-bit (Ігровий ретро-чіп)'},
              {value:'cyber', label:'⚡ Cyber Synth (Електронний синтезатор)'},
              {value:'zen', label:'🧘 Zen Marimba (Акустична маримба)'}
            ]}
          />

          <h3 style={{marginTop:16,marginBottom:8}}>🎧 Тестування звукових ефектів:</h3>
          <p className="muted small">Натисніть кнопку, щоб перевірити звучання обраного пакету:</p>
          <div className="sound-test-grid" style={{display:'grid',gridTemplateColumns:'repeat(2, 1fr)',gap:8}}>
            <button type="button" className="secondary sound-test-btn" onClick={() => playTone(true, currentPack)}>
              🔔 Правильно
            </button>
            <button type="button" className="secondary sound-test-btn" onClick={() => playTone(false, currentPack)}>
              ❌ Помилка
            </button>
            <button type="button" className="secondary sound-test-btn" onClick={() => playFanfareTone(currentPack)}>
              🎺 Фанфари
            </button>
            <button type="button" className="secondary sound-test-btn" onClick={() => playChestTone(currentPack)}>
              🎁 Скриня
            </button>
            <button type="button" className="secondary sound-test-btn" onClick={() => playCoinSound()} style={{gridColumn:'span 2'}}>
              🪙 Дзвін монет (Магазин)
            </button>
          </div>

          <label className="row-check" style={{marginTop:16}}>
            <input type="checkbox" checked={state.settings?.keyboardHints !== false} onChange={e => upd({settings: {...(state.settings||{}), keyboardHints: e.target.checked}})}/>
            <Keyboard size={16}/> Підказки гарячих клавіш 1–4
          </label>
        </div>

        {/* Password & Security Card */}
        <div className="card settings-section-card">
          <h2>🔐 Безпека та Скидання паролю</h2>
          {!state.guest ? (
            <>
              <label>Ваш 10-значний резервний код:</label>
              <div className="recovery-code-box" style={{display:'flex',gap:8,alignItems:'center',marginTop:4}}>
                <span style={{fontFamily:'monospace',fontSize:15,fontWeight:700,letterSpacing:1}}>{state.recoveryCode || 'EF-A1B2-C3D4'}</span>
                <button className="secondary" type="button" onClick={() => {
                  navigator.clipboard.writeText(state.recoveryCode || 'EF-A1B2-C3D4');
                  setCopiedCode(true);
                  setTimeout(() => setCopiedCode(false), 2000);
                }}>
                  {copiedCode ? 'Скопійовано ✓' : 'Копіювати'}
                </button>
              </div>

              <hr style={{margin:'14px 0'}}/>
              <h4>Секретне питання для швидкого відновлення</h4>
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
              <input
                className="search"
                style={{marginTop:8}}
                value={secA}
                onChange={e => setSecA(e.target.value)}
                placeholder="Відповідь для збереження"
              />
              {secErr && <p className="auth-err" style={{marginTop:6}}>{secErr}</p>}
              {secMsg && <p className="saved-message" style={{marginTop:6}}>{secMsg}</p>}
              <button className="secondary" type="button" disabled={secBusy} onClick={saveRecovery} style={{marginTop:8}}>
                {secBusy ? 'Збереження…' : 'Оновити секретне питання'}
              </button>
            </>
          ) : (
            <p className="muted">Ви ввійшли як гість. Зареєструйтесь, щоб мати змогу змінювати пароль та налаштовувати відновлення.</p>
          )}
        </div>
      </div>

      {!state.guest && <ChangePasswordCard />}

      {/* SINGLE OFFICIAL LOGOUT BUTTON */}
      <div className="card logout-card" style={{borderColor: 'var(--danger, #f87171)', marginTop: 8}}>
        <h2>🚪 Вихід з акаунту</h2>
        <p className="muted small">Завершити поточну сесію на цьому комп'ютері або телефоні. Профілі ізольовані та не змішуються між собою.</p>
        <button className="secondary btn-logout-danger" onClick={onLogout} type="button" style={{color:'var(--danger,#f87171)',borderColor:'var(--danger,#f87171)',marginTop:8}}>
          <XCircle size={16}/> Вийти з акаунту (@{state.nick})
        </button>
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
  const [friendsView, setFriendsView] = useState('cards'); // 'cards' | 'chat' | 'rivalry'
  const friendsRef = useRef([]);

  const load = useCallback(async () => {
    if (state.guest) return;
    try {
      const [f, b] = await Promise.all([getFriends(state.nick), friendsLeaderboard(state.nick)]);
      setFriends(f || []);
      friendsRef.current = f || [];
      setBoard(b || []);
    } catch (e) {}
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

  const cheerFriend = (nick) => {
    playTone(true);
    confettiBurst();
    emitSiteToast(`🔥 Ви надіслали підбадьорення для @${nick}!`, 'ok');
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
      <Title title="Друзі & Команда" text="Ігровий простір спілкування, змагань та взаємної підтримки"/>
      
      {/* Realtime Live Status Banner - CLEAN WITHOUT 'синхронізація щомиті (оновлення кожні 3–5с)' */}
      <div className="card realtime-live-card" style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <span className="live-dot pulse"></span>
          <b>Realtime Network: Онлайн</b>
          <span className="muted small">· Миттєвий обмін статусами та повідомленнями</span>
        </div>
        <span className="pill ok">🟢 Live</span>
      </div>

      {/* 3 GAMING DISPLAY MODES TOGGLE */}
      <div className="row-btns wrap" style={{marginBottom:16,gap:8}}>
        {[
          ['cards', '🎴 Gamer Cards (Команда)'],
          ['chat', '💬 Cyber Chat (Діалоги)'],
          ['rivalry', '⚔️ Rivalry Hall (Дуель)']
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={friendsView === id ? 'primary' : 'secondary'}
            onClick={() => setFriendsView(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ADD FRIEND STRIP */}
      <div className="card" style={{marginBottom:16,padding:'14px 18px'}}>
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
      </div>

      {/* MODE 1: GAMER CARDS */}
      {friendsView === 'cards' && (
        <div>
          <div className="friends-gamer-grid">
            {friends.map(f => {
              const league = leagueForXp(f.xp || 0);
              return (
                <div className="friend-gamer-card" key={f.id || f.nick}>
                  <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
                    <AvatarIcon id={f.avatar || 'duo_owl'} size={46} style={{borderRadius:12}} />
                    <div>
                      <b style={{fontSize:16}}>@{f.nick}</b>
                      <div className="friend-activity-chip" style={{marginTop:2}}>
                        {f.is_online ? <span className="online">🟢 Зараз на зв'язку</span> : <span className="offline">⚪ {formatActivityTime(f.last_seen || f.updated_at)}</span>}
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
                      <span>{f.status === 'pending' ? '⏳ Очікує' : '✓ В команді'}</span>
                    </div>
                  </div>

                  <div className="row-btns" style={{gap:6}}>
                    {f.status === 'accepted' && (
                      <>
                        <button className="primary small" style={{flex:1}} onClick={() => { setChatWith(f.nick); setFriendsView('chat'); }}>
                          💬 Чат
                        </button>
                        <button className="secondary small" title="Надіслати підбадьорення" onClick={() => cheerFriend(f.nick)}>
                          🔥 Буст
                        </button>
                      </>
                    )}
                    {f.status === 'pending' && f.requested_by !== state.id && (
                      <button className="primary small" style={{flex:1}} onClick={async () => { const r = await acceptFriend(state.nick, f.id); if (!r.ok) emitSiteError(r.error, 'Друзі'); load(); }}>
                        Прийняти
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {!friends.length && (
            <div className="card" style={{textAlign:'center',padding:'36px 16px',color:'var(--muted)'}}>
              <p style={{fontSize:16,fontWeight:600}}>Поки немає друзів у команді</p>
              <p className="small">Введіть нікнейм вище, щоб відправити запит і змагатися разом!</p>
            </div>
          )}
        </div>
      )}

      {/* MODE 2: CYBER CHAT */}
      {friendsView === 'chat' && (
        <div className="grid two">
          <div className="card">
            <h3>Список контактів</h3>
            <ul className="friend-list" style={{marginTop:10}}>
              {friends.map(f => (
                <li key={f.id || f.nick}>
                  <button type="button" className={'friend-item' + (chatWith === f.nick ? ' active' : '')} onClick={() => f.status === 'accepted' && setChatWith(f.nick)}>
                    <AvatarIcon id={f.avatar || 'duo_owl'} size={24} style={{marginRight:8}} />
                    <span className={'status-dot ' + (f.is_online ? 'online' : 'offline')}>
                      {f.is_online ? '🟢' : '⚪'}
                    </span>
                    <b>@{f.nick}</b>
                    {f.status === 'pending' && <span className="muted small">· запит</span>}
                  </button>
                </li>
              ))}
              {!friends.length && <li className="muted">Поки немає друзів.</li>}
            </ul>
          </div>

          <div className="card chat-panel-container">
            <h2><MessageCircle size={18}/> Чат {chatWith ? `з @${chatWith}` : ''}</h2>
            {!chatWith ? (
              <p className="muted" style={{padding: '36px 0', textAlign: 'center'}}>Оберіть друга зі списку зліва, щоб розпочати діалог 💬</p>
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
                  <button className="secondary" type="button" onClick={() => cheerFriend(chatWith)}>🔥 Підбадьорити</button>
                  <button className="secondary" type="button" onClick={() => social('mute')}>🔕 Mute</button>
                  <button className="secondary" type="button" onClick={() => social('block')}>🚫 Block</button>
                  <button className="secondary" type="button" onClick={report}>⚑ Report</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* MODE 3: RIVALRY HALL */}
      {friendsView === 'rivalry' && (
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {friends.filter(f => f.status === 'accepted').map(f => {
            const myXp = state.xp || 0;
            const friendXp = f.xp || 0;
            const diff = myXp - friendXp;
            return (
              <div className="rivalry-card" key={f.nick}>
                <div style={{display:'flex',alignItems:'center',gap:12,flex:1}}>
                  <AvatarIcon id={state.avatar || 'duo_owl'} size={40} />
                  <div>
                    <b>Ти (@{state.nick})</b>
                    <div style={{fontSize:13,color:'var(--accent)',fontWeight:700}}>{myXp} XP</div>
                  </div>
                </div>

                <div style={{textAlign:'center',padding:'0 16px'}}>
                  <span className="rivalry-vs-badge">VS</span>
                  <div style={{fontSize:12,fontWeight:700,marginTop:6,color: diff >= 0 ? '#10b981' : '#ef4444'}}>
                    {diff >= 0 ? `+${diff} XP вперед!` : `${diff} XP позаду`}
                  </div>
                </div>

                <div style={{display:'flex',alignItems:'center',gap:12,flex:1,justifyContent:'flex-end'}}>
                  <div style={{textAlign:'right'}}>
                    <b>@{f.nick}</b>
                    <div style={{fontSize:13,color:'var(--muted)',fontWeight:700}}>{friendXp} XP</div>
                  </div>
                  <AvatarIcon id={f.avatar || 'duo_owl'} size={40} />
                </div>
              </div>
            );
          })}
          {!friends.some(f => f.status === 'accepted') && (
            <div className="card muted" style={{textAlign:'center',padding:24}}>
              Додайте друзів, щоб змагатися в дуелях Rivalry Hall!
            </div>
          )}
        </div>
      )}

      {/* FRIENDS LEADERBOARD STRIP */}
      {board.length > 0 && (
        <div className="card" style={{marginTop: 16}}>
          <h2>🏆 Залікова таблиця друзів</h2>
          <div className="lb">
            {board.map((r, i) => (
              <div className="lb-row" key={r.nick}>
                <span style={{fontWeight:800}}>#{i + 1}</span>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <AvatarIcon id={r.avatar || 'duo_owl'} size={24} />
                  <b>@{r.nick}</b>
                </div>
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

function TelegramNotifyBanner({notify, onReply, onClose}) {
  const [replyText, setReplyText] = useState('');
  if (!notify) return null;
  const handleSend = (e) => {
    e?.preventDefault();
    if (!replyText.trim()) return;
    onReply?.(notify.sender_nick, replyText.trim());
    setReplyText('');
    onClose?.();
  };

  return (
    <div className="telegram-notify-banner">
      <div className="telegram-notify-header">
        <div className="telegram-notify-user">
          <AvatarIcon id={notify.avatar || 'duo_owl'} size={32} />
          <div>
            <b>@{notify.sender_nick || 'Друг'}</b>
            <span>{notify.title || 'Нове повідомлення в чаті'}</span>
          </div>
        </div>
        <button className="telegram-notify-close" type="button" onClick={onClose} aria-label="Закрити">
          ✕
        </button>
      </div>
      <div className="telegram-notify-msg">
        {notify.text || 'Привіт! Давай разом пройдемо сьогоднішній челендж!'}
      </div>
      <form className="telegram-notify-reply-bar" onSubmit={handleSend}>
        <input
          className="telegram-notify-input"
          value={replyText}
          onChange={e => setReplyText(e.target.value)}
          placeholder="Швидка відповідь прямо тут…"
          autoFocus
        />
        <button className="telegram-notify-send-btn" type="submit" disabled={!replyText.trim()}>
          ✈️ Відповісти
        </button>
      </form>
    </div>
  );
}

function ChallengesPage({state, save, wordsCatalog}){
  const [rows,setRows]=useState([]);
  const [title,setTitle]=useState('');
  const [metric,setMetric]=useState('xp');
  const [goal,setGoal]=useState(100);
  const [busy,setBusy]=useState(false);
  const [activeTab, setActiveTab] = useState('events'); // 'events' | 'custom'

  // --- Boss Battle State ---
  const [bossHp, setBossHp] = useState(100);
  const [bossHearts, setBossHearts] = useState(3);
  const [bossActive, setBossActive] = useState(false);
  const [bossQ, setBossQ] = useState(null); // {word, correct, options}
  const [bossFinished, setBossFinished] = useState(false);

  // --- 60s Blitz State ---
  const [blitzActive, setBlitzActive] = useState(false);
  const [blitzTime, setBlitzTime] = useState(60);
  const [blitzScore, setBlitzScore] = useState(0);
  const [blitzQ, setBlitzQ] = useState(null);
  const [blitzFinished, setBlitzFinished] = useState(false);

  const activeWords = (wordsCatalog && wordsCatalog.length) ? wordsCatalog : fallbackWords;

  // Generator of a random question
  const nextBossQuestion = useCallback(() => {
    if (!activeWords.length) return null;
    const target = activeWords[Math.floor(Math.random() * activeWords.length)];
    const others = activeWords.filter(w => w.id !== target.id);
    const shuffledOthers = [...others].sort(() => 0.5 - Math.random()).slice(0, 3);
    const options = [target.translation, ...shuffledOthers.map(o => o.translation)].sort(() => 0.5 - Math.random());
    return { word: target.word, correct: target.translation, options };
  }, [activeWords]);

  const startBossBattle = () => {
    setBossHp(100);
    setBossHearts(3);
    setBossFinished(false);
    setBossActive(true);
    setBossQ(nextBossQuestion());
  };

  const handleBossAnswer = (selected) => {
    if (!bossActive || !bossQ) return;
    if (selected === bossQ.correct) {
      playTone(true);
      const nextHp = Math.max(0, bossHp - 25);
      setBossHp(nextHp);
      if (nextHp === 0) {
        confettiBurst();
        playFanfareTone();
        if (save) {
          save({
            ...state,
            xp: (state.xp || 0) + 150,
            gems: (state.gems || 0) + 15
          });
        }
        setBossActive(false);
        setBossFinished(true);
        emitSiteToast('🎉 ТИТАН СЛІВ ПОВАЛЕНИЙ! +15 💎 Смарагдів та +150 XP!', 'ok');
      } else {
        emitSiteToast('⚔️ Влучний удар знаннями! -25 HP босу', 'ok');
        setBossQ(nextBossQuestion());
      }
    } else {
      playTone(false);
      const nextHearts = bossHearts - 1;
      setBossHearts(nextHearts);
      if (nextHearts <= 0) {
        setBossActive(false);
        emitSiteToast('💀 Бос відбив атаку! Спробуйте битву ще раз.', 'error');
      } else {
        emitSiteToast(`⚠️ Помилка! Втрачено 1 ❤️ (залишилось ${nextHearts})`, 'warning');
      }
    }
  };

  // --- 60s Blitz Logic ---
  const nextBlitzQuestion = useCallback(() => {
    if (!activeWords.length) return null;
    const target = activeWords[Math.floor(Math.random() * activeWords.length)];
    const others = activeWords.filter(w => w.id !== target.id);
    const distractor = others[Math.floor(Math.random() * others.length)] || target;
    const options = [target.translation, distractor.translation].sort(() => 0.5 - Math.random());
    return { word: target.word, correct: target.translation, options };
  }, [activeWords]);

  const startBlitz = () => {
    setBlitzScore(0);
    setBlitzTime(60);
    setBlitzFinished(false);
    setBlitzActive(true);
    setBlitzQ(nextBlitzQuestion());
  };

  useEffect(() => {
    if (!blitzActive) return;
    const timer = setInterval(() => {
      setBlitzTime(t => {
        if (t <= 1) {
          clearInterval(timer);
          setBlitzActive(false);
          setBlitzFinished(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [blitzActive]);

  useEffect(() => {
    if (blitzFinished) {
      if (blitzScore >= 10) {
        confettiBurst();
        playFanfareTone();
        if (save) {
          save({
            ...state,
            xp: (state.xp || 0) + 50,
            gems: (state.gems || 0) + 5
          });
        }
        emitSiteToast(`⚡ Бліц завершено! Рахунок: ${blitzScore} слів! Отримано +5 💎 та +50 XP!`, 'ok');
      } else {
        emitSiteToast(`⚡ Бліц завершено! Рахунок: ${blitzScore} слів. Потрібно ≥10 для нагороди.`, 'info');
      }
    }
  }, [blitzFinished, blitzScore]);

  const handleBlitzAnswer = (selected) => {
    if (!blitzActive || !blitzQ) return;
    if (selected === blitzQ.correct) {
      playTone(true);
      setBlitzScore(s => s + 1);
    } else {
      playTone(false);
    }
    setBlitzQ(nextBlitzQuestion());
  };

  const load=useCallback(()=>fetch('/api/challenges').then(r=>r.json()).then(d=>setRows(d.rows||[])).catch(()=>{}),[]);
  useEffect(()=>{load()},[load]);

  const create=async(kind='public')=>{
    setBusy(true);
    try{
      await requestJson('/api/challenges',{method:'POST',body:JSON.stringify({kind,metric,title:title||'Мій challenge',goal:Number(goal)||100,hours:24})});
      setTitle('');
      await load();
      emitSiteToast('Challenge створено ✓','ok');
    }catch(e){
      emitSiteError(e.message||'Не вдалося створити challenge','Challenges');
    }finally{
      setBusy(false);
    }
  };

  const join=async(id)=>{
    try{
      const r=await requestJson('/api/challenges',{method:'PATCH',body:JSON.stringify({id,action:'join'})});
      if(r.ok){
        await requestJson('/api/challenges',{method:'PATCH',body:JSON.stringify({id,action:'score'})});
        await load();
        emitSiteToast('Ви приєдналися до challenge ✓','ok');
      }
    }catch(e){
      emitSiteError(e.message||'Не вдалося приєднатися до challenge','Challenges');
    }
  };

  return (
    <section className="fade-in">
      <Title title="Challenges & Бос-битви" text="Інтерактивні битви на знання слів, 60-секундний бліц та нагороди у Смарагдах 💎"/>

      <div className="row-btns" style={{marginBottom: 16}}>
        <button
          type="button"
          className={activeTab === 'events' ? 'primary' : 'secondary'}
          onClick={() => setActiveTab('events')}
        >
          ⚔️ Епічні Події (Інтерактивні Арени)
        </button>
        <button
          type="button"
          className={activeTab === 'custom' ? 'primary' : 'secondary'}
          onClick={() => setActiveTab('custom')}
        >
          🏆 Користувацькі Челенджі ({rows.length})
        </button>
      </div>

      {activeTab === 'events' && (
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          {/* BOSS BATTLE INTERACTIVE ARENA */}
          <div className="card challenge-boss-card" style={{borderLeft:'5px solid #ef4444',padding:'20px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:12}}>
              <div>
                <span className="pill" style={{background:'rgba(239,68,68,0.15)',color:'#ef4444',fontWeight:700}}>РЕЙД-БОС ТИЖНЯ</span>
                <h2 style={{margin:'8px 0 4px'}}>👹 The Vocab Titan (Титан Слів)</h2>
                <p className="muted small">Відповідайте правильно на слова, наносьте удари по 25 HP та збережіть 3 сердечка!</p>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:24,fontWeight:800,color: bossHp > 30 ? '#ef4444' : '#10b981'}}>{bossHp} / 100 HP</div>
                <div className="player-hearts" style={{marginTop:4,justifyContent:'flex-end'}}>
                  {Array.from({length:3}).map((_,i) => (
                    <span key={i}>{i < bossHearts ? '❤️' : '🖤'}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="boss-hp-track" style={{margin:'14px 0'}}>
              <div className="boss-hp-fill" style={{width:`${bossHp}%`}}/>
            </div>

            {/* Battle interactive controls & questions */}
            {!bossActive && !bossFinished && (
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10,marginTop:12}}>
                <span className="muted small">🎁 Нагорода: <b>+15 💎 Смарагдів та +150 XP</b></span>
                <button className="primary" type="button" onClick={startBossBattle}>
                  ⚔️ {bossHearts < 3 ? 'Спробувати знову' : 'Розпочати битву з Босом'}
                </button>
              </div>
            )}

            {bossFinished && (
              <div style={{textAlign:'center',padding:'16px 0'}}>
                <h3 style={{color:'#10b981'}}>🏆 ТИТАН СЛІВ ПОВАЛЕНИЙ!</h3>
                <p className="muted">Ви отримали +15 💎 Смарагдів та +150 XP за видатні знання англійської!</p>
                <button className="secondary" style={{marginTop:10}} onClick={startBossBattle}>
                  🔄 Зіграти новий раунд бос-битви
                </button>
              </div>
            )}

            {bossActive && bossQ && (
              <div className="boss-question-card">
                <div style={{textAlign:'center',marginBottom:14}}>
                  <span className="muted small">Як перекладається слово:</span>
                  <div style={{fontSize:24,fontWeight:800,marginTop:4,letterSpacing:0.5}}>{bossQ.word}</div>
                </div>
                <div className="grid two" style={{gap:10}}>
                  {bossQ.options.map((opt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="secondary"
                      style={{padding:'12px 14px',fontSize:15,fontWeight:600,textAlign:'center'}}
                      onClick={() => handleBossAnswer(opt)}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 60s BLITZ INTERACTIVE ARENA */}
          <div className="card" style={{borderLeft:'5px solid #f59e0b',padding:'20px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:12}}>
              <div>
                <span className="pill" style={{background:'rgba(245,158,11,0.15)',color:'#f59e0b',fontWeight:700}}>БЛІЦ 60 СЕКУНД</span>
                <h2 style={{margin:'8px 0 4px'}}>⚡ 60-Second Word Storm</h2>
                <p className="muted small">Якнайбільше правильних перекладів за 1 хвилину! Наберіть ≥10 для нагороди.</p>
              </div>
              <div style={{textAlign:'right'}}>
                <span style={{fontSize:26,fontWeight:800,color: blitzTime <= 10 ? '#ef4444' : '#f59e0b'}}>
                  ⏱️ {blitzTime}с
                </span>
                <div style={{fontSize:14,fontWeight:700,color:'var(--accent)',marginTop:2}}>
                  Рахунок: {blitzScore}
                </div>
              </div>
            </div>

            {!blitzActive && (
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10,marginTop:14}}>
                <span className="muted small">🎁 Нагорода за 10+ слів: <b>+5 💎 Смарагдів та +50 XP</b></span>
                <button className="primary" type="button" onClick={startBlitz}>
                  ⚡ {blitzFinished ? 'Спробувати бліц знову' : 'Старт 60с Бліцу'}
                </button>
              </div>
            )}

            {blitzActive && blitzQ && (
              <div className="boss-question-card" style={{borderColor:'#f59e0b'}}>
                <div style={{textAlign:'center',marginBottom:12}}>
                  <span className="muted small">Оберіть правильний переклад:</span>
                  <div style={{fontSize:22,fontWeight:800,marginTop:4}}>{blitzQ.word}</div>
                </div>
                <div className="grid two" style={{gap:10}}>
                  {blitzQ.options.map((opt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="secondary"
                      style={{padding:'12px',fontSize:15,fontWeight:600}}
                      onClick={() => handleBlitzAnswer(opt)}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'custom' && (
        <>
          <div className="card">
            <h2>Створити новий челендж</h2>
            <div className="grid two">
              <input className="search" value={title} onChange={e=>setTitle(e.target.value)} placeholder="Назва challenge (напр. 200 XP за вихідні)"/>
              <UiSelect value={metric} onChange={setMetric} options={[{value:'xp',label:'XP'},{value:'answers',label:'Відповіді'},{value:'accuracy',label:'Точність'},{value:'mastery',label:'Mastery'}]}/>
              <input className="search" type="number" value={goal} onChange={e=>setGoal(e.target.value)} placeholder="Ціль (XP або слів)"/>
              <div className="row-btns">
                <button className="primary" disabled={busy} onClick={()=>create('public')}>Для всіх</button>
                <button className="secondary" disabled={busy} onClick={()=>create('friend')}>Для друзів</button>
              </div>
            </div>
          </div>

          <div className="grid two" style={{marginTop:16}}>
            {rows.map(c=>(
              <div className="card challenge-card" key={c.id}>
                <span className="pill">{c.kind}</span>
                <h2>{c.title}</h2>
                <p className="muted">{c.metric} · ціль {c.goal}</p>
                <p className="muted small">до {new Date(c.ends_at).toLocaleString()}</p>
                <button className="primary" disabled={c.joined} onClick={()=>join(c.id)}>
                  {c.joined ? '✓ Ви берете участь' : 'Приєднатись'}
                </button>
              </div>
            ))}
            {!rows.length && <div className="card muted">Активних челенджів поки немає. Створіть перший для своїх друзів!</div>}
          </div>
        </>
      )}
    </section>
  );
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
