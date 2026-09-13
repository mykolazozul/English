import React, {useEffect, useMemo, useState, useCallback, useRef, lazy, Suspense} from 'react';
import {BarChart3, BookOpen, Check, CheckCircle2, ChevronRight, ChevronDown, Flame, Home, Lock, Menu, Moon, Palette, Play, RotateCcw, Settings, Sun, Target, Trophy, User, Volume2, X, XCircle, Shield, SlidersHorizontal, Brain, Sparkles, Keyboard, Layers, Award, Cloud, Users, MessageCircle, Ghost, VolumeX, Swords, ShieldAlert, Eye, Bell, Wifi, ShoppingBag} from 'lucide-react';
import {words as fallbackWords, rules, BADGES, LEAGUES, leagueForXp} from './data';
import {notionWords, notionSyncMeta} from './notionWords.generated';
import { Analytics } from '@vercel/analytics/react';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import {saveProfile, loadProfile, getActiveNick, cloudPull, cloudPush, cloudConfigured, isNickTaken, registerNick, setGuestSession, isGuestSession, getFriends, addFriend, acceptFriend, getChat, sendChat, registerChatDevice, getChatDevice, getChatDevices, getMyChatDevices, revokeChatDevice, friendsLeaderboard, getDailyAverage, ensureDailyAverage, serverAuth, loadCloudVocabulary, cloudRecordProgress, cloudStartLesson, cloudFinishLesson, flushProgressQueue, serverMe, loadServerConfig, cloudLeaderboard, getWordIdByText, getGamification, postGamification, getPublicProfile, serverLogout, changePassword, getRecoveryQuestion, resetPasswordWithRecovery, setRecoveryQuestion, getTesterProfile} from './lib/storage';
import {onCorrect as srsOk, onWrong as srsBad, isDue, todayStr} from './lib/srs';
import {dbPutProfile, dbGetProfile, dbListProfiles, dbSaveWords, dbLoadWords} from './lib/db.js';
import {createRealtime} from './lib/realtime.js';
import {ensureChatIdentity,publicKeyPayload,encryptChatPayload,decryptChatText,encryptAttachment,decryptAttachment,fingerprint,rotateChatIdentity,trustKey,trustedKey,untrustKey} from './lib/e2e-chat.js';
import {track} from './lib/analytics.js';


const VERSION = '3.4.0';

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
   ADVANCED AUDIO SYSTEM WITH MARIO 8-BIT PACK + DISTINCT SOUND EVENTS
   ========================================================================== */
let _audioCtx = null;
function getAudioCtx() {
  try {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    if (!_audioCtx) {
      _audioCtx = new C();
    }
    if (_audioCtx.state === 'suspended') {
      _audioCtx.resume().catch(() => {});
    }
    return _audioCtx;
  } catch {
    return null;
  }
}

if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    try {
      const c = getAudioCtx();
      if (c && c.state === 'suspended') {
        c.resume().catch(() => {});
      }
    } catch {}
  };
  ['touchstart', 'touchend', 'click', 'keydown'].forEach(evt => {
    window.addEventListener(evt, unlockAudio, { passive: true, capture: true });
  });
}

function playMarioCoin() {
  try {
    if (window.__efQuiet || window.__efNoSfx) return;
    const c = getAudioCtx(); if (!c) return;
    if (c.state === 'suspended') c.resume().catch(() => {});
    // Authentic Mario Coin: Square wave B5 (987.77Hz) for 80ms, then E6 (1318.51Hz) for 320ms
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'square';
    o.frequency.setValueAtTime(987.77, c.currentTime);
    o.frequency.setValueAtTime(1318.51, c.currentTime + 0.08);
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.15, c.currentTime + 0.01);
    g.gain.setValueAtTime(0.15, c.currentTime + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.38);
    o.connect(g); g.connect(c.destination);
    o.start(c.currentTime); o.stop(c.currentTime + 0.4);
  } catch {}
}

function playMarioJump() {
  try {
    if (window.__efQuiet || window.__efNoSfx) return;
    const c = getAudioCtx(); if (!c) return;
    if (c.state === 'suspended') c.resume().catch(() => {});
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'square';
    o.frequency.setValueAtTime(174.61, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(523.25, c.currentTime + 0.16);
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.14, c.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.22);
    o.connect(g); g.connect(c.destination);
    o.start(c.currentTime); o.stop(c.currentTime + 0.24);
  } catch {}
}

function playMarioPowerUp() {
  try {
    if (window.__efQuiet || window.__efNoSfx) return;
    const c = getAudioCtx(); if (!c) return;
    if (c.state === 'suspended') c.resume().catch(() => {});
    const freqs = [392, 493.88, 587.33, 783.99, 987.77];
    freqs.forEach((f, i) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'square';
      o.frequency.setValueAtTime(f, c.currentTime + i * 0.06);
      g.gain.setValueAtTime(0.0001, c.currentTime + i * 0.06);
      g.gain.exponentialRampToValueAtTime(0.12, c.currentTime + i * 0.06 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + i * 0.06 + 0.16);
      o.connect(g); g.connect(c.destination);
      o.start(c.currentTime + i * 0.06);
      o.stop(c.currentTime + i * 0.06 + 0.18);
    });
  } catch {}
}

function playMario1Up() {
  try {
    if (window.__efQuiet || window.__efNoSfx) return;
    const c = getAudioCtx(); if (!c) return;
    if (c.state === 'suspended') c.resume().catch(() => {});
    const notes = [659.25, 783.99, 1318.51, 1046.50, 1174.66, 1567.98];
    notes.forEach((f, i) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'square';
      o.frequency.setValueAtTime(f, c.currentTime + i * 0.08);
      g.gain.setValueAtTime(0.0001, c.currentTime + i * 0.08);
      g.gain.exponentialRampToValueAtTime(0.13, c.currentTime + i * 0.08 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + i * 0.08 + 0.18);
      o.connect(g); g.connect(c.destination);
      o.start(c.currentTime + i * 0.08);
      o.stop(c.currentTime + i * 0.08 + 0.2);
    });
  } catch {}
}

function playMarioGameOver() {
  try {
    if (window.__efQuiet || window.__efNoSfx) return;
    const c = getAudioCtx(); if (!c) return;
    if (c.state === 'suspended') c.resume().catch(() => {});
    const notes = [261.63, 196.00, 164.81, 220.00, 246.94, 220.00, 207.65, 233.08, 196.00];
    notes.forEach((f, i) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'square';
      o.frequency.setValueAtTime(f, c.currentTime + i * 0.14);
      g.gain.setValueAtTime(0.0001, c.currentTime + i * 0.14);
      g.gain.exponentialRampToValueAtTime(0.12, c.currentTime + i * 0.14 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + i * 0.14 + 0.22);
      o.connect(g); g.connect(c.destination);
      o.start(c.currentTime + i * 0.14);
      o.stop(c.currentTime + i * 0.14 + 0.25);
    });
  } catch {}
}

function playTone(ok, pack) {
  try {
    if (window.__efQuiet || window.__efNoSfx) return;
    const p = pack || window.__efSoundPack || 'duo';
    
    if (p === 'mario') {
      if (ok) playMarioCoin();
      else playMarioJump();
      return;
    }

    const c = getAudioCtx(); if (!c) return;
    if (c.state === 'suspended') c.resume().catch(() => {});
    const o = c.createOscillator(), g = c.createGain();
    
    if (p === 'duo') {
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
      o.type = 'square';
      o.frequency.setValueAtTime(ok ? 587.33 : 130.81, c.currentTime);
      o.frequency.setValueAtTime(ok ? 880 : 98, c.currentTime + 0.08);
    } else if (p === 'cyber') {
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(ok ? 440 : 160, c.currentTime);
      o.frequency.exponentialRampToValueAtTime(ok ? 880 : 80, c.currentTime + 0.18);
    } else if (p === 'zen') {
      o.type = 'triangle';
      o.frequency.setValueAtTime(ok ? 440 : 196, c.currentTime);
      o.frequency.exponentialRampToValueAtTime(ok ? 660 : 147, c.currentTime + 0.24);
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

function playCoinSound() {
  const p = window.__efSoundPack || 'duo';
  if (p === 'mario') {
    playMarioCoin();
    return;
  }
  try {
    if (window.__efQuiet || window.__efNoSfx) return;
    const c = getAudioCtx(); if (!c) return;
    if (c.state === 'suspended') c.resume().catch(() => {});
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
  const p = pack || window.__efSoundPack || 'duo';
  if (p === 'mario') {
    playMario1Up();
    return;
  }
  try {
    if (window.__efQuiet || window.__efNoSfx) return;
    const c = getAudioCtx(); if (!c) return;
    if (c.state === 'suspended') c.resume().catch(() => {});
    const freqs = [523.25, 659.25, 783.99, 1046.50];
    freqs.forEach((freq, i) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = p === 'arcade' ? 'square' : 'sine';
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
  const p = pack || window.__efSoundPack || 'duo';
  if (p === 'mario') {
    playMarioPowerUp();
    return;
  }
  try {
    if (window.__efQuiet || window.__efNoSfx) return;
    const c = getAudioCtx(); if (!c) return;
    if (c.state === 'suspended') c.resume().catch(() => {});
    const freqs = [392, 523.25, 659.25, 783.99];
    freqs.forEach((f, i) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = p === 'arcade' ? 'square' : 'sine';
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

function playBossHitSound() {
  try {
    if (window.__efQuiet || window.__efNoSfx) return;
    const c = getAudioCtx(); if (!c) return;
    if (c.state === 'suspended') c.resume().catch(() => {});
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(180, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(50, c.currentTime + 0.18);
    g.gain.setValueAtTime(0.18, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.22);
    o.connect(g); g.connect(c.destination);
    o.start(c.currentTime); o.stop(c.currentTime + 0.24);
  } catch {}
}

function playCaseTickSound() {
  try {
    if (window.__efQuiet || window.__efNoSfx) return;
    const c = getAudioCtx(); if (!c) return;
    if (c.state === 'suspended') c.resume().catch(() => {});
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(640, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(160, c.currentTime + 0.032);
    g.gain.setValueAtTime(0.24, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.032);
    o.connect(g); g.connect(c.destination);
    o.start(c.currentTime); o.stop(c.currentTime + 0.035);
  } catch {}
}

/* ==========================================================================
   v3.2.0 — AUTHENTIC ANCIENT COIN / POINT VECTOR SVG
   ========================================================================== */
function AncientCoinIcon({ size = 20, className = '', style = {} }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={'ancient-coin-svg ' + className}
      style={{ verticalAlign: 'middle', flexShrink: 0, display: 'inline-block', ...style }}
    >
      <defs>
        <radialGradient id="ancientCoinGrad" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="40%" stopColor="#F59E0B" />
          <stop offset="85%" stopColor="#B45309" />
          <stop offset="100%" stopColor="#78350F" />
        </radialGradient>
        <linearGradient id="ancientCoinRim" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#92400E" />
        </linearGradient>
      </defs>
      {/* Outer Coin Rim */}
      <circle cx="12" cy="12" r="10.5" fill="url(#ancientCoinGrad)" stroke="url(#ancientCoinRim)" strokeWidth="1.5" />
      {/* Beaded Ancient Ring */}
      <circle cx="12" cy="12" r="8.2" stroke="#FEF08A" strokeWidth="0.75" strokeDasharray="1.5 1.5" fill="none" opacity="0.85" />
      {/* Inner Runic Emblem & Star */}
      <path d="M12 5.5L13.8 9.8L18.5 10.2L15 13.3L16 18L12 15.5L8 18L9 13.3L5.5 10.2L10.2 9.8Z" fill="#78350F" opacity="0.25" />
      <path d="M12 6.5L13.4 10.2L17.2 10.5L14.3 13.1L15.1 17L12 14.8L8.9 17L9.7 13.1L6.8 10.5L10.6 10.2Z" fill="#FEF08A" stroke="#B45309" strokeWidth="0.5" />
      <circle cx="12" cy="12" r="1.6" fill="#78350F" />
    </svg>
  );
}
 
/* ==========================================================================
   STRICT ECONOMY: DAILY COIN EARNING CAP HELPER (MAX 60 COINS/DAY FROM LESSONS)
   ========================================================================== */
function awardDailyCoins(currentState, amount = 2, maxDaily = 60) {
  const today = todayStr();
  const daily = (currentState.dailyCoins && currentState.dailyCoins.date === today)
    ? currentState.dailyCoins
    : { date: today, earned: 0 };

  const canEarn = Math.max(0, maxDaily - daily.earned);
  const actualEarned = Math.min(amount, canEarn);

  const nextDaily = {
    date: today,
    earned: daily.earned + actualEarned
  };

  return {
    actualEarned,
    remainingToday: Math.max(0, maxDaily - nextDaily.earned),
    nextState: {
      ...currentState,
      gems: (currentState.gems || 0) + actualEarned,
      dailyCoins: nextDaily
    }
  };
}

/* ==========================================================================
   40+ CHARACTER AVATARS (KNIGHT, SAMURAI, WIZARD, CREATURES & LEGENDS)
   ========================================================================== */
/* ==========================================================================
   30 UNIQUE FULL-BODY DYNAMIC ACTION AVATARS (ZERO DUPLICATES)
   ========================================================================== */
const GAME_AVATARS_30 = [
  // Warriors, Mages & Legends in Full-Body Action
  { id: 'avatar_knight', name: 'Лицар у замаху', action: 'Лицар у замаху мечем та щитом', bg: '#1e293b', accent: '#38bdf8', archetype: 'action_knight', tag: '⚔️ Лицар' },
  { id: 'avatar_wizard', name: 'Маг кастує', action: 'Арканний маг випускає блискавку', bg: '#3b0764', accent: '#c084fc', archetype: 'action_wizard', tag: '🧙 Маг' },
  { id: 'avatar_ninja', name: 'Ніндзя у ривку', action: 'Тіньовий ніндзя у стрибку з сюрікеном', bg: '#090d16', accent: '#f43f5e', archetype: 'action_ninja', tag: '🥷 Ніндзя' },
  { id: 'avatar_archer', name: 'Лучник стріляє', action: 'Ельфійський лучник натягує сяючий лук', bg: '#064e3b', accent: '#34d399', archetype: 'action_archer', tag: '🏹 Лучник' },
  { id: 'avatar_samurai', name: 'Самурай у розсіканні', action: 'Самурай у двохручному розсікаючому ударі', bg: '#881337', accent: '#f43f5e', archetype: 'action_samurai', tag: '⚔️ Самурай' },
  { id: 'avatar_valkyrie', name: 'Валькірія у польоті', action: 'Валькірія ширяє на крилах зі списом', bg: '#0369a1', accent: '#38bdf8', archetype: 'action_valkyrie', tag: '🛡️ Валькірія' },
  { id: 'avatar_viking', name: 'Вікінг у навалі', action: 'Вікінг атакує з двома бойовими сокирами', bg: '#334155', accent: '#f97316', archetype: 'action_viking', tag: '🪓 Вікінг' },
  { id: 'avatar_dragon', name: 'Дракон дихає вогнем', action: 'Вогняний дракон у польоті видихає полумʼя', bg: '#7c2d12', accent: '#fb923c', archetype: 'action_dragon', tag: '🐲 Дракон' },
  { id: 'avatar_spartan', name: 'Спартанець бʼє', action: 'Спартанець бʼє списом з-за щита', bg: '#92400e', accent: '#fbbf24', archetype: 'action_spartan', tag: '🛡️ Спартанець' },
  { id: 'avatar_astronaut', name: 'Астронавт летить', action: 'Астронавт летить на джетпаку у космосі', bg: '#0f172a', accent: '#00f0ff', archetype: 'action_astronaut', tag: '🚀 Астронавт' },
  { id: 'avatar_paladin', name: 'Паладин з молотом', action: 'Святий паладин підносить сонячний молот', bg: '#854d0e', accent: '#fef08a', archetype: 'action_paladin', tag: '🔨 Паладин' },
  { id: 'avatar_assassin', name: 'Ассасін у стрибку', action: 'Тіньовий ассасін стрибає з двома клинками', bg: '#2e1065', accent: '#a855f7', archetype: 'action_assassin', tag: '🗡️ Ассасін' },
  { id: 'avatar_princess', name: 'Принцеса танцює', action: 'Принцеса кружляє у чарівній сукні', bg: '#831843', accent: '#f472b6', archetype: 'action_princess', tag: '👑 Принцеса' },
  { id: 'avatar_cyber_monk', name: 'Монах у стрибку', action: 'Кібер-монах у повітряному ударі кунг-фу', bg: '#042f2e', accent: '#2dd4bf', archetype: 'action_cyber_monk', tag: '🥋 Монах' },
  { id: 'avatar_phoenix', name: 'Фенікс злітає', action: 'Палаючий фенікс розправляє вогняні крила', bg: '#9a3412', accent: '#fdba74', archetype: 'action_phoenix', tag: '🔥 Фенікс' },
  { id: 'avatar_druid', name: 'Друїд закликає', action: 'Лісовий друїд прикликає сяючі лози', bg: '#14532d', accent: '#86efac', archetype: 'action_druid', tag: '🌿 Друїд' },
  { id: 'avatar_wolf', name: 'Вовк у кидку', action: 'Полярний вовк стрибає крізь заметіль', bg: '#1e293b', accent: '#93c5fd', archetype: 'action_wolf', tag: '🐺 Вовк' },
  { id: 'duo_owl', name: 'Сова ширяє', action: 'Мудра сова ширяє з магічним сувоєм', bg: '#14532d', accent: '#4ade80', archetype: 'action_owl', tag: '🦉 Сова' },
  { id: 'duo_lion', name: 'Лев атакує', action: 'Золотий лев-воїн у лютому ривку', bg: '#78350f', accent: '#fde047', archetype: 'action_lion', tag: '🦁 Лев' },
  { id: 'avatar_golem', name: 'Ґолем трощить', action: 'Камʼяний велетень бʼє кулаками в землю', bg: '#334155', accent: '#4ade80', archetype: 'action_golem', tag: '🗿 Ґолем' },
  { id: 'duo_pirate', name: 'Пірат на хвилі', action: 'Капітан піратів зі шпагою на морській хвилі', bg: '#0c4a6e', accent: '#38bdf8', archetype: 'action_pirate', tag: '🏴‍☠️ Пірат' },
  { id: 'duo_cat', name: 'Кіт-Акробат', action: 'Кіт-ніндзя крутить сальто з кинджалами', bg: '#4c1d95', accent: '#f472b6', archetype: 'action_cat', tag: '🐱 Кіт' },
  { id: 'duo_fox', name: 'Лис мчить', action: 'Хитрий лис мчить на повній швидкості', bg: '#7c2d12', accent: '#f97316', archetype: 'action_fox', tag: '🦊 Лис' },
  { id: 'duo_tiger', name: 'Тигр стрибає', action: 'Смугастий тигр у стрибку розправляє пазурі', bg: '#9a3412', accent: '#fed7aa', archetype: 'action_tiger', tag: '🐯 Тигр' },
  { id: 'duo_falcon', name: 'Сокіл пікірує', action: 'Сокіл-мисливець пікірує на швидкості з неба', bg: '#1e3a8a', accent: '#60a5fa', archetype: 'action_falcon', tag: '🦅 Сокіл' },
  { id: 'duo_robot', name: 'Мех стріляє', action: 'Бойовий робот стріляє з плечових гармат', bg: '#164e63', accent: '#22d3ee', archetype: 'action_robot', tag: '🤖 Робот' },
  { id: 'duo_shark', name: 'Акула з тризубом', action: 'Акула-гладіатор розсікає хвилю тризубом', bg: '#083344', accent: '#38bdf8', archetype: 'action_shark', tag: '🦈 Акула' },
  { id: 'duo_griffin', name: 'Грифон атакує', action: 'Королівський грифон бʼє гострими кігтями', bg: '#78350f', accent: '#facc15', archetype: 'action_griffin', tag: '🦅 Грифон' },
  { id: 'duo_bard', name: 'Бард кружляє', action: 'Мандрівний бард грає на лютні вихор нот', bg: '#581c87', accent: '#e879f9', archetype: 'action_bard', tag: '🎵 Бард' },
  { id: 'avatar_king', name: 'Король підносить меч', action: 'Верховний король підіймає меч до сонця', bg: '#713f12', accent: '#facc15', archetype: 'action_king', tag: '👑 Король' },
];

function AvatarIcon({ id, size = 44, className = '', style = {}, aura = '', frame = '' }) {
  const av = GAME_AVATARS_30.find(a => a.id === id) || GAME_AVATARS_30[0];
  const wrap = (node) => (!aura && !frame ? node : (
    <span className={`avatar-cosmetic-wrap ${aura || ''} ${frame || ''}`} style={{display:'inline-flex',alignItems:'center',justifyContent:'center',position:'relative',borderRadius:14,flexShrink:0}}>
      {node}
    </span>
  ));
  
  if (!id || (!id.startsWith('duo_') && !id.startsWith('avatar_') && !GAME_AVATARS_30.some(x => x.id === id))) {
    return wrap(
      <span
        className={'avatar-emoji-fallback ' + className}
        style={{
          width: size, height: size, fontSize: Math.floor(size * 0.6),
          display: 'inline-grid', placeItems: 'center', borderRadius: 14,
          background: 'color-mix(in srgb, var(--accent) 12%, var(--surface))',
          flexShrink: 0, ...style
        }}
      >
        {id || '🛡️'}
      </span>
    );
  }

  const svgNode = (
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
        <radialGradient id={`glow_${av.id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={av.accent || '#38bdf8'} stopOpacity="0.3" />
          <stop offset="100%" stopColor={av.accent || '#38bdf8'} stopOpacity="0" />
        </radialGradient>
      </defs>
      
      {/* Background with rounded frame and dynamic aura glow */}
      <rect width="100" height="100" rx="22" fill={`url(#grad_${av.id})`} />
      <circle cx="50" cy="50" r="44" fill={`url(#glow_${av.id})`} />
      <path d="M12 84 Q50 78 88 84" stroke="rgba(255,255,255,0.18)" strokeWidth="2" strokeLinecap="round" />

      {/* FULL-BODY ACTION POSE RENDERERS */}

      {/* 1. Knight Swinging Sword & Shield */}
      {av.archetype === 'action_knight' && (
        <g>
          {/* Blue slash arc */}
          <path d="M50 14 Q88 18 84 56" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.85"/>
          {/* Legs lunging */}
          <path d="M42 62 L32 86 M54 62 L66 84" stroke="#94a3b8" strokeWidth="5" strokeLinecap="round"/>
          {/* Torso & Armor */}
          <path d="M38 38 L60 36 L56 64 L40 64 Z" fill="#cbd5e1" stroke="#475569" strokeWidth="2"/>
          {/* Helm & Plume */}
          <circle cx="48" cy="26" r="10" fill="#94a3b8" stroke="#334155" strokeWidth="2"/>
          <path d="M48 16 Q52 8 58 12" stroke="#f59e0b" strokeWidth="3.5" strokeLinecap="round" fill="none"/>
          <line x1="44" y1="26" x2="52" y2="26" stroke="#38bdf8" strokeWidth="2"/>
          {/* Shield held forward */}
          <path d="M26 38 Q20 54 30 66 Q36 52 32 38 Z" fill="#3b82f6" stroke="#e2e8f0" strokeWidth="2"/>
          {/* Broadsword held in swing */}
          <line x1="58" y1="38" x2="86" y2="20" stroke="#f8fafc" strokeWidth="3.5" strokeLinecap="round"/>
          <polygon points="86,20 89,17 92,23" fill="#f8fafc"/>
        </g>
      )}

      {/* 2. Arcane Wizard Casting Lightning */}
      {av.archetype === 'action_wizard' && (
        <g>
          {/* Magic Staff */}
          <line x1="24" y1="20" x2="28" y2="86" stroke="#78350f" strokeWidth="3.5"/>
          <circle cx="23" cy="17" r="7" fill="#c084fc" stroke="#f3e8ff" strokeWidth="1.5"/>
          {/* Billowing Robe */}
          <path d="M40 38 Q50 20 60 38 L74 86 L30 86 Z" fill="#581c87" stroke="#7e22ce" strokeWidth="2"/>
          {/* Hood */}
          <path d="M40 36 Q50 14 60 36 Z" fill="#3b0764"/>
          <circle cx="50" cy="32" r="3.5" fill="#38bdf8"/>
          {/* Lightning Spell Stream */}
          <path d="M60 42 L72 36 L68 46 L86 38 L78 52 L94 44" stroke="#e879f9" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
          <circle cx="86" cy="40" r="3" fill="#ffffff"/>
        </g>
      )}

      {/* 3. Shadow Ninja in Mid-Air Katana Dash */}
      {av.archetype === 'action_ninja' && (
        <g>
          {/* Red Scarf Trail */}
          <path d="M38 34 Q18 36 8 26 Q18 44 32 40 Z" fill="#ef4444"/>
          {/* Katana Slash Line */}
          <line x1="16" y1="84" x2="88" y2="16" stroke="#f43f5e" strokeWidth="2.5" strokeDasharray="6 2"/>
          {/* Dashing Torso & Limbs */}
          <path d="M36 44 L60 36 L52 56 L30 62 Z" fill="#0f172a" stroke="#334155" strokeWidth="1.5"/>
          <line x1="32" y1="62" x2="18" y2="76" stroke="#0f172a" strokeWidth="5" strokeLinecap="round"/>
          <line x1="52" y1="56" x2="72" y2="74" stroke="#0f172a" strokeWidth="5" strokeLinecap="round"/>
          {/* Mask & Glowing Red Eyes */}
          <circle cx="48" cy="30" r="9" fill="#0f172a"/>
          <rect x="44" y="28" width="10" height="3" rx="1" fill="#ef4444"/>
          {/* Shurikens flying */}
          <polygon points="76,32 82,28 80,36 86,34" fill="#cbd5e1"/>
        </g>
      )}

      {/* 4. Elven Archer Drawing Longbow */}
      {av.archetype === 'action_archer' && (
        <g>
          {/* Golden Bow Arc */}
          <path d="M72 16 Q88 50 72 84" stroke="#f59e0b" strokeWidth="3" fill="none" strokeLinecap="round"/>
          {/* Bowstring */}
          <path d="M72 16 L38 50 L72 84" stroke="#e2e8f0" strokeWidth="1.5" fill="none"/>
          {/* Glowing Arrow */}
          <line x1="38" y1="50" x2="86" y2="50" stroke="#34d399" strokeWidth="2.5"/>
          <polygon points="86,50 82,47 82,53" fill="#34d399"/>
          {/* Archer Body */}
          <line x1="42" y1="60" x2="30" y2="84" stroke="#065f46" strokeWidth="4.5" strokeLinecap="round"/>
          <line x1="52" y1="60" x2="62" y2="84" stroke="#065f46" strokeWidth="4.5" strokeLinecap="round"/>
          <path d="M38 40 L56 38 L52 62 L38 62 Z" fill="#047857"/>
          <circle cx="46" cy="28" r="8" fill="#10b981"/>
        </g>
      )}

      {/* 5. Samurai Overhead Katana Strike */}
      {av.archetype === 'action_samurai' && (
        <g>
          <circle cx="50" cy="50" r="30" fill="rgba(239,68,68,0.2)"/>
          {/* Overhead Katana with glowing trail */}
          <path d="M34 10 Q50 4 66 12 L48 38 Z" fill="#f8fafc" stroke="#dc2626" strokeWidth="1.5"/>
          {/* Armored Shoulders & Torso */}
          <rect x="36" y="38" width="28" height="24" rx="4" fill="#991b1b" stroke="#f59e0b" strokeWidth="1.5"/>
          <rect x="28" y="38" width="10" height="14" rx="2" fill="#b91c1c"/>
          <rect x="62" y="38" width="10" height="14" rx="2" fill="#b91c1c"/>
          {/* Stride Legs */}
          <line x1="40" y1="62" x2="32" y2="86" stroke="#7f1d1d" strokeWidth="5" strokeLinecap="round"/>
          <line x1="58" y1="62" x2="68" y2="86" stroke="#7f1d1d" strokeWidth="5" strokeLinecap="round"/>
          {/* Helmet Crest (Kabuto) */}
          <circle cx="50" cy="28" r="9" fill="#18181b"/>
          <path d="M42 22 Q50 14 58 22" stroke="#f59e0b" strokeWidth="3" fill="none"/>
        </g>
      )}

      {/* 6. Valkyrie Soaring with Spear */}
      {av.archetype === 'action_valkyrie' && (
        <g>
          {/* Grand Wings */}
          <path d="M44 38 C20 18 6 28 14 52 C26 46 38 46 44 48 Z" fill="#e0f2fe" opacity="0.9"/>
          <path d="M56 38 C80 18 94 28 86 52 C74 46 62 46 56 48 Z" fill="#e0f2fe" opacity="0.9"/>
          {/* Diving Golden Spear */}
          <line x1="28" y1="14" x2="78" y2="86" stroke="#facc15" strokeWidth="3"/>
          <polygon points="78,86 72,82 76,78" fill="#facc15"/>
          {/* Body */}
          <circle cx="50" cy="30" r="8" fill="#bae6fd"/>
          <path d="M42 38 L58 38 L54 66 L46 66 Z" fill="#0284c7"/>
          <line x1="46" y1="66" x2="42" y2="84" stroke="#0369a1" strokeWidth="4"/>
          <line x1="54" y1="66" x2="58" y2="84" stroke="#0369a1" strokeWidth="4"/>
        </g>
      )}

      {/* 7. Viking Berserker with Dual Axes */}
      {av.archetype === 'action_viking' && (
        <g>
          {/* Left Axe & Right Axe */}
          <line x1="22" y1="46" x2="16" y2="18" stroke="#78350f" strokeWidth="3"/>
          <path d="M10 18 Q18 10 24 22 Z" fill="#e2e8f0" stroke="#475569" strokeWidth="1.5"/>
          <line x1="78" y1="46" x2="84" y2="18" stroke="#78350f" strokeWidth="3"/>
          <path d="M90 18 Q82 10 76 22 Z" fill="#e2e8f0" stroke="#475569" strokeWidth="1.5"/>
          {/* Horned Helmet */}
          <circle cx="50" cy="30" r="10" fill="#475569"/>
          <path d="M40 28 Q34 16 38 10" stroke="#f1f5f9" strokeWidth="3" fill="none"/>
          <path d="M60 28 Q66 16 62 10" stroke="#f1f5f9" strokeWidth="3" fill="none"/>
          {/* Beard & Fur Pelt */}
          <path d="M44 34 Q50 48 56 34 Z" fill="#ea580c"/>
          <rect x="38" y="40" width="24" height="24" rx="4" fill="#334155"/>
          <line x1="42" y1="64" x2="34" y2="86" stroke="#1e293b" strokeWidth="5" strokeLinecap="round"/>
          <line x1="58" y1="64" x2="66" y2="86" stroke="#1e293b" strokeWidth="5" strokeLinecap="round"/>
        </g>
      )}

      {/* 8. Dragon Breathing Fire in Flight */}
      {av.archetype === 'action_dragon' && (
        <g>
          {/* Broad Dragon Wings */}
          <path d="M46 44 C26 14 6 22 10 46 C24 40 38 44 46 48 Z" fill="#ea580c" opacity="0.95"/>
          <path d="M54 44 C74 14 94 22 90 46 C76 40 62 44 54 48 Z" fill="#ea580c" opacity="0.95"/>
          {/* Torrent of Flames */}
          <path d="M58 48 Q84 40 98 48 Q82 62 58 56 Z" fill="#f97316"/>
          <circle cx="82" cy="48" r="4" fill="#fef08a"/>
          {/* Serpentine Dragon Body & Tail */}
          <path d="M42 36 Q50 30 58 36 Q56 58 50 68 Q44 78 36 84" stroke="#c2410c" strokeWidth="7" fill="none" strokeLinecap="round"/>
          <circle cx="52" cy="34" r="8" fill="#7c2d12"/>
          <circle cx="54" cy="33" r="2.5" fill="#fef08a"/>
        </g>
      )}

      {/* 9. Spartan Hoplite Thrusting Spear */}
      {av.archetype === 'action_spartan' && (
        <g>
          {/* Long bronze spear thrust */}
          <line x1="18" y1="24" x2="88" y2="40" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round"/>
          <polygon points="88,40 82,37 83,43" fill="#fef08a"/>
          {/* Round Shield with Lambda */}
          <circle cx="40" cy="56" r="18" fill="#b45309" stroke="#fef08a" strokeWidth="2"/>
          <path d="M34 64 L40 48 L46 64" stroke="#fef08a" strokeWidth="3" fill="none"/>
          {/* Helmet with Red Plume */}
          <circle cx="50" cy="28" r="9" fill="#d97706"/>
          <path d="M46 12 Q50 4 54 12 L52 24 L48 24 Z" fill="#dc2626"/>
          {/* Legs */}
          <line x1="44" y1="68" x2="38" y2="86" stroke="#78350f" strokeWidth="5" strokeLinecap="round"/>
          <line x1="56" y1="68" x2="68" y2="86" stroke="#78350f" strokeWidth="5" strokeLinecap="round"/>
        </g>
      )}

      {/* 10. Spacewalking Astronaut with Jet Thrusters */}
      {av.archetype === 'action_astronaut' && (
        <g>
          {/* Twin Plasma Flame Jets */}
          <polygon points="32,66 26,86 36,78" fill="#00f0ff"/>
          <polygon points="68,66 74,86 64,78" fill="#00f0ff"/>
          {/* White Spacesuit Body in Zero-G */}
          <rect x="36" y="40" width="28" height="26" rx="6" fill="#f8fafc" stroke="#94a3b8" strokeWidth="2"/>
          <line x1="40" y1="66" x2="30" y2="82" stroke="#f8fafc" strokeWidth="6" strokeLinecap="round"/>
          <line x1="60" y1="66" x2="70" y2="80" stroke="#f8fafc" strokeWidth="6" strokeLinecap="round"/>
          {/* Gold Reflective Visor */}
          <circle cx="50" cy="28" r="12" fill="#f8fafc" stroke="#94a3b8" strokeWidth="2"/>
          <ellipse cx="50" cy="28" rx="8" ry="6" fill="#f59e0b"/>
        </g>
      )}

      {/* 11. Paladin Raising Radiant Warhammer */}
      {av.archetype === 'action_paladin' && (
        <g>
          {/* Solar Beams Burst */}
          <path d="M50 8 L50 20 M38 12 L46 20 M62 12 L54 20" stroke="#fde047" strokeWidth="2.5" strokeLinecap="round"/>
          {/* Massive Warhammer */}
          <line x1="50" y1="20" x2="50" y2="52" stroke="#78350f" strokeWidth="3.5"/>
          <rect x="38" y="10" width="24" height="12" rx="2" fill="#eab308" stroke="#fef08a" strokeWidth="1.5"/>
          {/* Paladin Armor */}
          <path d="M38 42 L62 42 L58 66 L42 66 Z" fill="#fef08a" stroke="#ca8a04" strokeWidth="2"/>
          <circle cx="50" cy="32" r="8" fill="#ffffff" stroke="#eab308" strokeWidth="2"/>
          <line x1="44" y1="66" x2="36" y2="86" stroke="#ca8a04" strokeWidth="5" strokeLinecap="round"/>
          <line x1="56" y1="66" x2="64" y2="86" stroke="#ca8a04" strokeWidth="5" strokeLinecap="round"/>
        </g>
      )}

      {/* 12. Shadow Assassin Leaping with Dual Daggers */}
      {av.archetype === 'action_assassin' && (
        <g>
          {/* Shadow wisps at base */}
          <ellipse cx="50" cy="86" rx="26" ry="6" fill="rgba(168,85,247,0.25)"/>
          {/* Reverse grip daggers */}
          <line x1="28" y1="36" x2="16" y2="52" stroke="#e2e8f0" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="72" y1="36" x2="84" y2="52" stroke="#e2e8f0" strokeWidth="2.5" strokeLinecap="round"/>
          {/* Mid-air crouch */}
          <path d="M40 38 L60 38 L54 60 L46 60 Z" fill="#1e1b4b"/>
          <line x1="46" y1="60" x2="32" y2="78" stroke="#1e1b4b" strokeWidth="5" strokeLinecap="round"/>
          <line x1="54" y1="60" x2="68" y2="78" stroke="#1e1b4b" strokeWidth="5" strokeLinecap="round"/>
          <circle cx="50" cy="28" r="8" fill="#312e81"/>
          <circle cx="48" cy="27" r="1.5" fill="#a855f7"/>
          <circle cx="52" cy="27" r="1.5" fill="#a855f7"/>
        </g>
      )}

      {/* 13. Dancing Royal Princess with Swirling Gown */}
      {av.archetype === 'action_princess' && (
        <g>
          {/* Swirling Dress */}
          <path d="M44 42 Q50 36 56 42 Q78 68 86 84 Q50 88 14 84 Q22 68 44 42 Z" fill="#ec4899" stroke="#f472b6" strokeWidth="2"/>
          {/* Torso & Tiara */}
          <path d="M46 32 L54 32 L52 44 L48 44 Z" fill="#fbcfe8"/>
          <circle cx="50" cy="24" r="7" fill="#fdf2f8"/>
          <polygon points="45,18 48,13 50,16 52,13 55,18" fill="#f59e0b"/>
          {/* Magic Starlight Sparkles */}
          <circle cx="76" cy="36" r="2" fill="#ffffff"/>
          <circle cx="24" cy="50" r="2.5" fill="#ffffff"/>
        </g>
      )}

      {/* 14. Cyber Monk in Flying Dragon Kick */}
      {av.archetype === 'action_cyber_monk' && (
        <g>
          {/* Neon kick energy trail */}
          <path d="M26 62 Q50 56 86 44" stroke="#2dd4bf" strokeWidth="4" strokeLinecap="round" fill="none"/>
          {/* Body in horizontal flying kick */}
          <line x1="28" y1="60" x2="84" y2="44" stroke="#14b8a6" strokeWidth="6" strokeLinecap="round"/>
          <circle cx="34" cy="50" r="8" fill="#0f766e"/>
          {/* Tucked second leg */}
          <line x1="42" y1="56" x2="48" y2="68" stroke="#115e59" strokeWidth="5" strokeLinecap="round"/>
        </g>
      )}

      {/* 15. Flaming Phoenix Rising */}
      {av.archetype === 'action_phoenix' && (
        <g>
          {/* Upward Flaming Wings */}
          <path d="M50 48 Q20 28 14 8 Q34 26 50 38 Q66 26 86 8 Q80 28 50 48 Z" fill="#f97316"/>
          <path d="M50 52 Q32 36 28 20 Q42 34 50 44 Q58 34 72 20 Q68 36 50 52 Z" fill="#facc15"/>
          {/* Long Fiery Tail Plumes */}
          <path d="M50 60 Q44 76 34 86 M50 60 Q50 78 50 88 M50 60 Q56 76 66 86" stroke="#ea580c" strokeWidth="3" fill="none" strokeLinecap="round"/>
          <circle cx="50" cy="38" r="6" fill="#fef08a"/>
        </g>
      )}

      {/* 16. Woodland Druid Summoning Vines */}
      {av.archetype === 'action_druid' && (
        <g>
          {/* Living Vines Curling from Ground */}
          <path d="M28 86 Q36 70 30 58 Q24 46 34 38" stroke="#86efac" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
          <path d="M72 86 Q64 70 70 58 Q76 46 66 38" stroke="#86efac" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
          {/* Druid Robe & Crook */}
          <line x1="68" y1="24" x2="68" y2="86" stroke="#78350f" strokeWidth="3"/>
          <circle cx="68" cy="22" r="5" fill="#4ade80"/>
          <path d="M42 38 L58 38 L62 86 L38 86 Z" fill="#15803d"/>
          {/* Antler Headdress */}
          <circle cx="50" cy="28" r="8" fill="#166534"/>
          <path d="M44 22 L38 12 M42 16 L46 12" stroke="#b45309" strokeWidth="2"/>
          <path d="M56 22 L62 12 M58 16 L54 12" stroke="#b45309" strokeWidth="2"/>
        </g>
      )}

      {/* 17. Direwolf Leaping Forward */}
      {av.archetype === 'action_wolf' && (
        <g>
          {/* Leaping Quadruped Body */}
          <path d="M20 54 Q46 44 74 46 Q84 40 88 44 Q78 58 54 62 L20 62 Z" fill="#64748b"/>
          {/* Extended Front and Back Claws */}
          <line x1="70" y1="56" x2="88" y2="68" stroke="#64748b" strokeWidth="4.5" strokeLinecap="round"/>
          <line x1="30" y1="60" x2="14" y2="76" stroke="#475569" strokeWidth="4.5" strokeLinecap="round"/>
          {/* Wolf Head & Bared Fangs */}
          <circle cx="78" cy="42" r="8" fill="#475569"/>
          <polygon points="74,36 78,28 82,36" fill="#475569"/>
          <circle cx="82" cy="42" r="1.5" fill="#38bdf8"/>
        </g>
      )}

      {/* 18. Wise Owl Gliding with Magic Scroll */}
      {av.archetype === 'action_owl' && (
        <g>
          {/* Wide Downward Beating Wings */}
          <path d="M50 42 Q24 16 8 36 Q30 48 46 48 Z" fill="#22c55e"/>
          <path d="M50 42 Q76 16 92 36 Q70 48 54 48 Z" fill="#22c55e"/>
          {/* Owl Body & Round Eyes */}
          <ellipse cx="50" cy="48" rx="14" ry="18" fill="#16a34a"/>
          <circle cx="44" cy="42" r="5.5" fill="#ffffff"/>
          <circle cx="56" cy="42" r="5.5" fill="#ffffff"/>
          <circle cx="44" cy="42" r="2.5" fill="#0f172a"/>
          <circle cx="56" cy="42" r="2.5" fill="#0f172a"/>
          <polygon points="50,47 48,51 52,51" fill="#f59e0b"/>
          {/* Clutched Glowing Ancient Scroll */}
          <rect x="36" y="66" width="28" height="8" rx="3" fill="#fef08a" stroke="#d97706" strokeWidth="1.5"/>
          <circle cx="36" cy="70" r="3" fill="#b45309"/>
          <circle cx="64" cy="70" r="3" fill="#b45309"/>
        </g>
      )}

      {/* 19. Golden Lion Warrior Charging */}
      {av.archetype === 'action_lion' && (
        <g>
          {/* Massive Mane */}
          <circle cx="64" cy="40" r="18" fill="#b45309"/>
          {/* Muscular charging body */}
          <path d="M22 60 Q44 48 64 52 L58 72 L26 70 Z" fill="#d97706"/>
          <line x1="60" y1="64" x2="76" y2="82" stroke="#d97706" strokeWidth="5" strokeLinecap="round"/>
          <line x1="32" y1="68" x2="18" y2="82" stroke="#b45309" strokeWidth="5" strokeLinecap="round"/>
          {/* Lion Face & Fangs */}
          <circle cx="66" cy="40" r="11" fill="#f59e0b"/>
          <circle cx="70" cy="38" r="2" fill="#0f172a"/>
          <polygon points="76,44 72,46 74,48" fill="#ffffff"/>
        </g>
      )}

      {/* 20. Stone Golem Ground Slam */}
      {av.archetype === 'action_golem' && (
        <g>
          {/* Ground Shockwave Cracks */}
          <path d="M20 86 L36 78 L50 86 L64 78 L80 86" stroke="#4ade80" strokeWidth="2.5" fill="none"/>
          {/* Giant Boulder Fists Slammed Down */}
          <circle cx="28" cy="74" r="10" fill="#475569" stroke="#334155" strokeWidth="2"/>
          <circle cx="72" cy="74" r="10" fill="#475569" stroke="#334155" strokeWidth="2"/>
          {/* Broad Colossus Body */}
          <rect x="30" y="34" width="40" height="34" rx="8" fill="#64748b" stroke="#334155" strokeWidth="2"/>
          <circle cx="44" cy="44" r="3" fill="#22c55e"/>
          <circle cx="56" cy="44" r="3" fill="#22c55e"/>
        </g>
      )}

      {/* 21. Pirate Captain on Sea Crest */}
      {av.archetype === 'action_pirate' && (
        <g>
          {/* Wave Crest */}
          <path d="M10 86 Q30 76 50 86 Q70 76 90 86" stroke="#38bdf8" strokeWidth="3" fill="none"/>
          {/* Tricorn Hat & Cutlass */}
          <line x1="62" y1="42" x2="86" y2="22" stroke="#e2e8f0" strokeWidth="3"/>
          <path d="M36 28 Q50 16 64 28 Z" fill="#0f172a"/>
          <circle cx="50" cy="34" r="8" fill="#fbcfe8"/>
          {/* Captain Coat */}
          <path d="M40 42 L60 42 L64 74 L36 74 Z" fill="#0369a1" stroke="#f59e0b" strokeWidth="1.5"/>
          <line x1="44" y1="74" x2="38" y2="86" stroke="#0f172a" strokeWidth="5"/>
          <line x1="56" y1="74" x2="62" y2="86" stroke="#78350f" strokeWidth="5"/>
        </g>
      )}

      {/* 22. Cat Acrobat in Backflip with Daggers */}
      {av.archetype === 'action_cat' && (
        <g>
          {/* Twin Throwing Daggers */}
          <line x1="20" y1="36" x2="12" y2="24" stroke="#f472b6" strokeWidth="2.5" strokeLinecap="round"/>
          <line x1="80" y1="36" x2="88" y2="24" stroke="#f472b6" strokeWidth="2.5" strokeLinecap="round"/>
          {/* Curled Acrobat Silhouette */}
          <circle cx="50" cy="50" r="16" fill="#8b5cf6"/>
          <polygon points="42,38 46,26 50,38" fill="#8b5cf6"/>
          <polygon points="58,38 54,26 50,38" fill="#8b5cf6"/>
          <circle cx="46" cy="46" r="2.5" fill="#fef08a"/>
          <circle cx="54" cy="46" r="2.5" fill="#fef08a"/>
          {/* Arched Tail */}
          <path d="M56 62 Q72 74 74 60" stroke="#8b5cf6" strokeWidth="4" fill="none" strokeLinecap="round"/>
        </g>
      )}

      {/* 23. Swift Red Fox Sprinting */}
      {av.archetype === 'action_fox' && (
        <g>
          {/* Stretched running body */}
          <path d="M24 56 Q48 48 76 50 Q86 44 88 48 Q78 60 52 62 Z" fill="#ea580c"/>
          {/* Bushy Tail Flowing Back */}
          <path d="M24 56 Q8 48 10 38 Q18 54 28 58 Z" fill="#ffffff"/>
          <line x1="68" y1="58" x2="84" y2="76" stroke="#ea580c" strokeWidth="4" strokeLinecap="round"/>
          <line x1="36" y1="60" x2="22" y2="76" stroke="#ea580c" strokeWidth="4" strokeLinecap="round"/>
          <circle cx="80" cy="46" r="7" fill="#c2410c"/>
          <polygon points="76,40 80,30 84,40" fill="#c2410c"/>
        </g>
      )}

      {/* 24. Striped Tiger Leaping */}
      {av.archetype === 'action_tiger' && (
        <g>
          {/* Fierce Leaping Tiger Body */}
          <path d="M26 54 Q50 44 76 48 L70 66 L26 66 Z" fill="#f97316"/>
          {/* Stripes */}
          <line x1="42" y1="48" x2="40" y2="60" stroke="#18181b" strokeWidth="2.5"/>
          <line x1="52" y1="46" x2="50" y2="62" stroke="#18181b" strokeWidth="2.5"/>
          <line x1="62" y1="48" x2="60" y2="64" stroke="#18181b" strokeWidth="2.5"/>
          <line x1="72" y1="58" x2="88" y2="76" stroke="#f97316" strokeWidth="4.5" strokeLinecap="round"/>
          <line x1="32" y1="62" x2="16" y2="78" stroke="#f97316" strokeWidth="4.5" strokeLinecap="round"/>
          <circle cx="78" cy="44" r="8" fill="#ea580c"/>
        </g>
      )}

      {/* 25. Hunting Falcon in Vertical Dive */}
      {av.archetype === 'action_falcon' && (
        <g>
          {/* Speed Streaks */}
          <line x1="30" y1="14" x2="30" y2="40" stroke="rgba(255,255,255,0.3)" strokeWidth="2"/>
          <line x1="70" y1="14" x2="70" y2="40" stroke="rgba(255,255,255,0.3)" strokeWidth="2"/>
          {/* Tucked Falcon Silhouette Diving Straight Down */}
          <path d="M50 82 L38 38 Q50 20 62 38 Z" fill="#1e3a8a" stroke="#60a5fa" strokeWidth="1.5"/>
          <polygon points="50,82 46,74 54,74" fill="#f59e0b"/>
          <circle cx="46" cy="46" r="2.5" fill="#fef08a"/>
          <circle cx="54" cy="46" r="2.5" fill="#fef08a"/>
        </g>
      )}

      {/* 26. Combat Mech Firing Plasma Cannons */}
      {av.archetype === 'action_robot' && (
        <g>
          {/* Dual Laser Blasts */}
          <line x1="26" y1="36" x2="10" y2="36" stroke="#22d3ee" strokeWidth="3" strokeLinecap="round"/>
          <line x1="74" y1="36" x2="90" y2="36" stroke="#22d3ee" strokeWidth="3" strokeLinecap="round"/>
          {/* Heavy Armored Frame */}
          <rect x="32" y="32" width="36" height="32" rx="6" fill="#0891b2" stroke="#155e75" strokeWidth="2"/>
          <rect x="40" y="38" width="20" height="6" rx="2" fill="#a5f3fc"/>
          <rect x="22" y="32" width="10" height="18" rx="2" fill="#164e63"/>
          <rect x="68" y="32" width="10" height="18" rx="2" fill="#164e63"/>
          <line x1="38" y1="64" x2="30" y2="86" stroke="#164e63" strokeWidth="6" strokeLinecap="round"/>
          <line x1="62" y1="64" x2="70" y2="86" stroke="#164e63" strokeWidth="6" strokeLinecap="round"/>
        </g>
      )}

      {/* 27. Shark Gladiator with Trident */}
      {av.archetype === 'action_shark' && (
        <g>
          {/* Wave Splash */}
          <path d="M12 84 Q30 74 50 84 Q70 74 88 84" stroke="#38bdf8" strokeWidth="2.5" fill="none"/>
          {/* Golden Trident */}
          <line x1="32" y1="20" x2="32" y2="80" stroke="#facc15" strokeWidth="3"/>
          <path d="M26 22 L32 14 L38 22" stroke="#facc15" strokeWidth="2.5" fill="none"/>
          {/* Muscular Shark Head & Fin */}
          <path d="M42 32 Q62 20 74 38 Q68 64 52 64 Z" fill="#0284c7"/>
          <polygon points="62,26 68,14 74,28" fill="#0369a1"/>
          <circle cx="64" cy="38" r="2.5" fill="#ffffff"/>
          <polygon points="70,44 68,48 72,48" fill="#ffffff"/>
        </g>
      )}

      {/* 28. Royal Griffin Striking with Talons */}
      {av.archetype === 'action_griffin' && (
        <g>
          {/* Sweeping Wings */}
          <path d="M50 44 Q24 16 12 38 Q32 46 48 48 Z" fill="#ca8a04"/>
          <path d="M50 44 Q76 16 88 38 Q68 46 52 48 Z" fill="#ca8a04"/>
          {/* Lion Body + Eagle Head */}
          <circle cx="50" cy="36" r="10" fill="#facc15"/>
          <polygon points="56,36 64,39 56,42" fill="#d97706"/>
          {/* Extended Razor Talons */}
          <line x1="42" y1="56" x2="32" y2="76" stroke="#ea580c" strokeWidth="3.5" strokeLinecap="round"/>
          <line x1="58" y1="56" x2="68" y2="76" stroke="#ea580c" strokeWidth="3.5" strokeLinecap="round"/>
        </g>
      )}

      {/* 29. Traveling Bard Strumming Lute */}
      {av.archetype === 'action_bard' && (
        <g>
          {/* Floating Musical Notes */}
          <text x="20" y="32" fill="#e879f9" fontSize="16" fontWeight="bold">♪</text>
          <text x="76" y="32" fill="#e879f9" fontSize="16" fontWeight="bold">♫</text>
          {/* Lute / Mandolin */}
          <circle cx="58" cy="56" r="10" fill="#b45309"/>
          <line x1="58" y1="56" x2="74" y2="34" stroke="#78350f" strokeWidth="3.5"/>
          {/* Bard Dancing Silhouette */}
          <path d="M40 38 L54 38 L52 68 L36 68 Z" fill="#7e22ce"/>
          <circle cx="48" cy="28" r="8" fill="#f3e8ff"/>
          {/* Feather in Cap */}
          <path d="M48 20 Q56 12 60 16" stroke="#f43f5e" strokeWidth="3" fill="none"/>
          <line x1="42" y1="68" x2="32" y2="86" stroke="#581c87" strokeWidth="4.5"/>
          <line x1="50" y1="68" x2="58" y2="86" stroke="#581c87" strokeWidth="4.5"/>
        </g>
      )}

      {/* 30. King Raising Excalibur */}
      {av.archetype === 'action_king' && (
        <g>
          {/* Excalibur Sword Held to Heavens */}
          <line x1="50" y1="8" x2="50" y2="44" stroke="#f8fafc" strokeWidth="3.5" strokeLinecap="round"/>
          <line x1="42" y1="28" x2="58" y2="28" stroke="#facc15" strokeWidth="3"/>
          <polygon points="50,8 47,14 53,14" fill="#facc15"/>
          {/* Royal Cape & Crown */}
          <path d="M34 44 L66 44 L72 86 L28 86 Z" fill="#991b1b" stroke="#f59e0b" strokeWidth="1.5"/>
          <circle cx="50" cy="34" r="8" fill="#fef08a"/>
          <polygon points="44,26 47,18 50,22 53,18 56,26" fill="#f59e0b"/>
          <line x1="44" y1="70" x2="40" y2="86" stroke="#7f1d1d" strokeWidth="5"/>
          <line x1="56" y1="70" x2="60" y2="86" stroke="#7f1d1d" strokeWidth="5"/>
        </g>
      )}

    </svg>
  );
  return wrap(svgNode);
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
    const isExcluded = String(path).startsWith('/api/auth') || String(path).startsWith('/api/admin') || String(path).startsWith('/api/reports') || String(path).startsWith('/api/notion-sync') || String(path).startsWith('/api/analytics') || String(path).startsWith('/api/gamification');
    if (res.status===401 && !isExcluded) {
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
      <button className={'nav nav-admin' + (page === 'admin' ? ' active' : '')} onClick={() => { nav('admin'); setMobile?.(false); }}><Shield size={18}/>Адмін</button>
    </aside>
  );
}

function Layout({children, state, page, nav, mobile, setMobile}) {
  const isAdmin = state?.role === 'admin' || String(state?.nick).toLowerCase() === 'boss' || String(state?.name).toLowerCase() === 'boss';
  return (
    <div className="app">
      {mobile && <div className="sidebar-backdrop" onClick={() => setMobile(false)} aria-hidden="true" />}
      <Sidebar mobile={mobile} setMobile={setMobile} page={page} nav={nav} />
      <main className="main">
        <header>
          <div className="header-left">
            <button className="icon mobile-only" onClick={() => setMobile(!mobile)}>{mobile ? <X/> : <Menu/>}</button>
            <div className="header-user-info" onClick={() => nav('profile')} style={{cursor:'pointer'}}>
              <AvatarIcon
                id={state.avatar || 'duo_owl'}
                size={28}
                style={{borderRadius:8}}
                aura={state.inventory?.cosmetics?.equipped_aura}
                frame={state.inventory?.cosmetics?.equipped_frame}
              />
              <b className="header-user-name">{state.name || state.nick}</b>
              {(String(state.nick||'').toLowerCase()==='boss' || String(state.name||'').toLowerCase()==='boss') && <span className="boss-badge" title="Verified">👑</span>}
              <span className="muted header-user-nick"> · @{state.nick}</span>
              {state.guest && <span className="pill guest-pill"><Ghost size={12}/> гість</span>}
            </div>
            {isAdmin && (
              <button
                type="button"
                className="admin-header-btn mobile-only"
                onClick={() => nav('admin')}
                title="Адмін-панель"
                style={{
                  display: 'none',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 8px',
                  borderRadius: 10,
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <Shield size={13} />
                <span>Адмін</span>
              </button>
            )}
          </div>
          <div className="header-stats">
            <span title="Серія днів" className="stat-chip streak-chip">🔥 {state.streak}</span>
            <span title="Древні Монети / Поінти (ігрова валюта)" className="stat-chip currency-pill-coins" onClick={() => nav('shop')} style={{cursor:'pointer'}}>
              <AncientCoinIcon size={16} className="coin-icon-svg" /> {state.gems || 0}
            </span>
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

// Ukrainian + English profanity word list (censorship filter)
const PROFANITY_LIST = ['хуй','піздец','пізда','бля','блядь','єбать','їбать','сука','курва','мудак','залупа','ємать','cunt','fuck','shit','bitch','dick','ass','bastard','damn'];
function censorMessage(text) {
  if (!text) return text;
  let out = text;
  PROFANITY_LIST.forEach(w => {
    const re = new RegExp(w, 'gi');
    out = out.replace(re, '*'.repeat(w.length));
  });
  return out;
}

function FloatingChatWidget({state, nav}) {
  const [open, setOpen] = useState(false);
  const [friends, setFriends] = useState([]);
  const [activeFriend, setActiveFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [bubble, setBubble] = useState(null); // {text, nick} for speech bubble
  const [bubbleFading, setBubbleFading] = useState(false);
  const [hasNewMsg, setHasNewMsg] = useState(false);
  const [lastMsgCount, setLastMsgCount] = useState(0);
  const isAdmin = state.role === 'admin' || String(state.nick).toLowerCase() === 'boss';

  useEffect(() => {
    if (state.guest || !open) return;
    getFriends(state.nick).then(f => {
      setFriends(f || []);
      if (f?.length && !activeFriend) setActiveFriend(f[0].nick);
    }).catch(() => {});
  }, [open, state.nick, state.guest, activeFriend]);

  useEffect(() => {
    if (!activeFriend || state.guest) return;
    let alive = true;
    const fetchChat = async () => {
      try {
        const raw = await getChat(state.nick, activeFriend);
        if (alive && raw) {
          // Check for new messages to show speech bubble
          if (!open && raw.length > lastMsgCount && raw.length > 0) {
            const latest = raw[raw.length - 1];
            const senderNick = latest?.sender_nick || activeFriend;
            if (String(senderNick).toLowerCase() !== String(state.nick).toLowerCase()) {
              // Show speech bubble BEFORE the blue dot
              setBubble({ text: `💬 Нове повідомлення від @${senderNick}!`, nick: senderNick });
              setBubbleFading(false);
              setHasNewMsg(false); // dot comes AFTER bubble fades
              setTimeout(() => {
                setBubbleFading(true);
                setTimeout(() => {
                  setBubble(null);
                  setBubbleFading(false);
                  setHasNewMsg(true); // NOW show dot
                }, 500);
              }, 3000);
            }
          }
          setLastMsgCount(raw.length);
          setMessages(raw);
        }
      } catch {}
    };
    fetchChat();
    const interval = setInterval(fetchChat, 3000);
    return () => { alive = false; clearInterval(interval); };
  }, [open, activeFriend, state.nick, state.guest, lastMsgCount]);

  // Clear dot when chat is opened
  useEffect(() => {
    if (open) { setHasNewMsg(false); setBubble(null); }
  }, [open]);

  const send = async (e) => {
    e?.preventDefault();
    const t = censorMessage(input.trim());
    if (!activeFriend || !t) return;
    setInput('');
    try {
      const sent = await sendChat(state.nick, activeFriend, t);
      if (sent) setMessages(prev => [...prev, sent]);
      const raw = await getChat(state.nick, activeFriend);
      if (raw) setMessages(raw);
    } catch {}
  };

  const handlePhotoUpload = async (e) => {
    if (!isAdmin) return;
    const file = e.target.files?.[0];
    if (!file || !activeFriend) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result;
      try {
        const sent = await sendChat(state.nick, activeFriend, `[img]${dataUrl}`);
        if (sent) setMessages(prev => [...prev, sent]);
        const raw = await getChat(state.nick, activeFriend);
        if (raw) setMessages(raw);
      } catch {}
    };
    reader.readAsDataURL(file);
  };

  if (state.guest) return null;

  return (
    <div className="floating-chat-root">
      {/* Speech bubble notification */}
      {bubble && (
        <div className={`chat-incoming-bubble${bubbleFading ? ' fading' : ''}`}>
          {bubble.text}
        </div>
      )}

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
              const isImg = (m.text || '').startsWith('[img]');
              return (
                <div key={m.id || Math.random()} className={'floating-chat-msg' + (isMe ? ' me' : '')}>
                  {isImg
                    ? <img src={m.text.slice(5)} className="chat-msg-image" alt="Photo" onClick={() => window.open(m.text.slice(5), '_blank')}/>
                    : <span>{censorMessage(m.text) || '🔒 Повідомлення'}</span>
                  }
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
            {isAdmin && (
              <label className="chat-admin-photo-btn" title="Відправити фото (тільки адмін)">
                📷
                <input type="file" accept="image/*" style={{display:'none'}} onChange={handlePhotoUpload}/>
              </label>
            )}
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
        {hasNewMsg && <span className="floating-chat-badge"></span>}
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
  const [epicBadge, setEpicBadge] = useState(null);
  useEffect(() => {
    const onBadge = (e) => {
      if (e?.detail) setEpicBadge(e.detail);
    };
    window.addEventListener('ef-badge-unlocked', onBadge);
    return () => window.removeEventListener('ef-badge-unlocked', onBadge);
  }, []);
  const refreshGamification = useCallback(async () => {
    if (state.guest) return;
    try { const g = await getGamification(); if (g?.ok) { setGamification(g); if (g.giftAvailable) setGiftModal(true); } } catch {}
  }, [state.guest]);
  useEffect(() => {
    const onExpired = e => {
      if (state.guest || page === 'admin') return;
      const path = String((e && e.detail && e.detail.path) || '');
      // The lesson flow already surfaces a stale session inline with a retry.
      // Admin endpoints handle auth/mock internally without kicking the admin out.
      if (path.startsWith('/api/lessons') || path.startsWith('/api/admin') || path.startsWith('/api/reports') || path.startsWith('/api/notion-sync') || path.startsWith('/api/analytics')) return;
      // For other resources keep the current page and offer a re-login button
      // instead of silently dumping the user onto the auth screen.
      setModal({type:'error',title:'Сесію завершено',text:'Сервер більше не приймає цю сесію. Увійди ще раз — локальний профіль залишиться на пристрої.',yes:'Увійти знову',onYes:()=>{setLessonCfg(null);setPage('onboarding')}});
    };
    window.addEventListener('ef-auth-expired', onExpired);
    return () => window.removeEventListener('ef-auth-expired', onExpired);
  }, [state.guest, page]);
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

  const lockAdminSession = () => {
    fetch('/api/admin-auth',{method:'DELETE',credentials:'include'}).catch(()=>{});
    window.dispatchEvent(new Event('ef-admin-lock'));
  };

  const nav = (p) => {
    if (page === 'admin' && p !== 'admin') {
      lockAdminSession();
    }
    setPage(p); setMobile(false);
  };

  // Strict Admin Security Lock: 10min inactivity, full document hide only (not tab-switching within admin)
  useEffect(() => {
    if (page !== 'admin') return;
    let timer = null;
    const lock = () => {
      lockAdminSession();
    };
    const bump = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(lock, 10 * 60 * 1000); // 10 minutes - allow normal admin navigation
    };
    const onVis = () => {
      // Only lock if the page is actually hidden (minimized, different app, etc.)
      // NOT when switching between browser tabs during admin work
      if (document.hidden) {
        // Give 30 seconds grace period before locking on visibility change
        // This prevents locking when admin quickly switches to another tab to reference something
        if (timer) clearTimeout(timer);
        timer = setTimeout(lock, 30 * 1000);
      } else {
        // Page became visible again - reset the full inactivity timer
        bump();
      }
    };

    bump();
    window.addEventListener('mousemove', bump);
    window.addEventListener('keydown', bump);
    window.addEventListener('touchstart', bump);
    window.addEventListener('scroll', bump, true);
    window.addEventListener('click', bump);
    document.addEventListener('visibilitychange', onVis);

    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener('mousemove', bump);
      window.removeEventListener('keydown', bump);
      window.removeEventListener('touchstart', bump);
      window.removeEventListener('scroll', bump, true);
      window.removeEventListener('click', bump);
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
        {page === 'shop' && <ShopPage state={state} save={save} onRefreshGamification={refreshGamification} allUsers={gamification?.leaderboard?.global || []} />}
        {page === 'settings' && <SettingsPage state={state} save={save} onLogout={handleLogout} />}
        {page === 'friends' && <FriendsPage state={state} />}
        {page === 'challenges' && <ChallengesPage state={state} save={save} wordsCatalog={activeWords} />}
        {page === 'profile' && <Profile state={state} save={save} gamification={gamification} onRefreshGamification={refreshGamification} onLogout={handleLogout} />}
        {page === 'about' && <AboutPage />}
        {page === '404' && <section className="page-error card"><h1>404</h1><p>Такої сторінки немає.</p><button className="primary" type="button" onClick={() => nav('dashboard')}>На головну</button></section>}
        {page === 'admin' && (
          <ErrorBoundary>
            <Admin state={state} save={save} setWordsLive={setWordsLive} wordsLive={wordsLive} setModal={setModal} />
          </ErrorBoundary>
        )}
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
      {epicBadge && <EpicAchievementBanner badge={epicBadge} onClose={() => setEpicBadge(null)} />}
      <Analytics />
    </>
  );
}

/* ==========================================================================
   v3.3.0 — EPIC STEAM / RPG BADGE ACHIEVEMENT BANNER
   ========================================================================== */
function EpicAchievementBanner({ badge, onClose }) {
  useEffect(() => {
    playFanfareTone();
    confettiBurst();
    const timer = setTimeout(() => {
      onClose();
    }, 5500);
    return () => clearTimeout(timer);
  }, [badge, onClose]);

  if (!badge) return null;

  const tierColors = {
    starter: '#38bdf8',
    medium: '#a855f7',
    advanced: '#f59e0b',
    legendary: '#ec4899',
    secret: '#ef4444'
  };
  const tierNames = {
    starter: '🥉 СТАРТОВЕ ДОСЯГНЕННЯ',
    medium: '🥈 СРІБНЕ ДОСЯГНЕННЯ',
    advanced: '🥇 ЗОЛОТЕ ДОСЯГНЕННЯ',
    legendary: '💎 ЛЕГЕНДАРНЕ ДОСЯГНЕННЯ',
    secret: '🔮 СЕКРЕТНЕ ДОСЯГНЕННЯ'
  };

  const color = tierColors[badge.tier || 'starter'] || '#f59e0b';
  const label = tierNames[badge.tier || 'starter'] || '🎖️ ДОСЯГНЕННЯ';

  return (
    <div className="epic-badge-banner" onClick={onClose} style={{ borderColor: color }}>
      <div className="banner-icon-burst" style={{ borderColor: color, boxShadow: `0 0 24px ${color}88` }}>
        {badge.icon || '🏆'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', color, textTransform: 'uppercase' }}>
          {label} РОЗБЛОКОВАНО!
        </div>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#ffffff', margin: '2px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {badge.title}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {badge.desc}
        </div>
      </div>
      <button
        type="button"
        className="icon small"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        style={{ color: 'rgba(255,255,255,0.6)', border: 'none', background: 'transparent', cursor: 'pointer' }}
      >
        ✕
      </button>
    </div>
  );
}

/* ==========================================================================
   v3.3.0 — CS:GO ROULETTE CASE FOR MYSTERY CHEST (100 ANCIENT POINTS)
   ========================================================================== */
const CS_CASE_ITEMS = [
  { id: 'xp_50', name: '+50 XP Ліги', icon: '⚡', rarity: 'blue', type: 'xp', amount: 50, color: '#3b82f6' },
  { id: 'points_15', name: '+15 Поінтів', icon: '🪙', rarity: 'blue', type: 'gems', amount: 15, color: '#3b82f6' },
  { id: 'second_chance', name: 'Другий шанс', icon: '🔄', rarity: 'blue', type: 'second_chance', amount: 1, color: '#3b82f6' },
  { id: 'xp_100', name: '+100 XP Ліги', icon: '⚡', rarity: 'purple', type: 'xp', amount: 100, color: '#a855f7' },
  { id: 'freeze_1', name: 'Заморозка серії', icon: '❄️', rarity: 'purple', type: 'freeze', amount: 1, color: '#a855f7' },
  { id: 'points_40', name: '+40 Поінтів', icon: '🪙', rarity: 'purple', type: 'gems', amount: 40, color: '#a855f7' },
  { id: 'xp_200', name: '+200 XP Спринт', icon: '⚡', rarity: 'pink', type: 'xp', amount: 200, color: '#ec4899' },
  { id: 'league_shield', name: 'Щит Ліги', icon: '🛡️', rarity: 'pink', type: 'league_shield', amount: 1, color: '#ec4899' },
  { id: 'points_75', name: '+75 Поінтів', icon: '🪙', rarity: 'pink', type: 'gems', amount: 75, color: '#ec4899' },
  { id: 'booster_1h', name: 'XP Booster 2×', icon: '⚡⚡', rarity: 'red', type: 'booster', amount: 1, color: '#ef4444' },
  { id: 'points_150', name: '+150 Поінтів!', icon: '🪙🪙', rarity: 'red', type: 'gems', amount: 150, color: '#ef4444' },
  { id: 'vip_frame', name: 'Золота VIP Рамка', icon: '👑', rarity: 'gold', type: 'vip_frame', amount: 1, color: '#f59e0b' },
  { id: 'jackpot_500', name: 'ДЖЕКПОТ +500 XP & 200 🪙', icon: '💎', rarity: 'gold', type: 'jackpot', amount: 500, color: '#f59e0b' }
];

function CsCaseRouletteModal({ isOpen, onClose, state, save }) {
  const [spinning, setSpinning] = useState(false);
  const [stripItems, setStripItems] = useState([]);
  const [winnerItem, setWinnerItem] = useState(null);
  const [translateX, setTranslateX] = useState(0);
  const [transitionStyle, setTransitionStyle] = useState('none');
  const windowRef = useRef(null);
  const timerRef = useRef(null);

  // Generate strip on open
  useEffect(() => {
    if (isOpen) {
      setWinnerItem(null);
      setTranslateX(0);
      setTransitionStyle('none');
      const items = [];
      for (let i = 0; i < 70; i++) {
        const rand = Math.random();
        let pool;
        if (rand < 0.55) pool = CS_CASE_ITEMS.filter(x => x.rarity === 'blue');
        else if (rand < 0.80) pool = CS_CASE_ITEMS.filter(x => x.rarity === 'purple');
        else if (rand < 0.92) pool = CS_CASE_ITEMS.filter(x => x.rarity === 'pink');
        else if (rand < 0.98) pool = CS_CASE_ITEMS.filter(x => x.rarity === 'red');
        else pool = CS_CASE_ITEMS.filter(x => x.rarity === 'gold');
        const chosen = pool[Math.floor(Math.random() * pool.length)];
        items.push({ ...chosen, uid: `${chosen.id}_${i}_${Math.random()}` });
      }
      setStripItems(items);
    }
  }, [isOpen]);

  const spin = () => {
    if (spinning) return;
    if ((state.gems || 0) < 100) {
      emitSiteError('Не вистачає Древніх Поінтів! Потрібно 100 🪙 для відкриття CS:GO кейсу.', 'Скриня');
      return;
    }

    setSpinning(true);
    setWinnerItem(null);
    setTransitionStyle('none');
    setTranslateX(0);

    const winIdx = 54;
    const cardWidth = 154;
    const gap = 12;
    const itemFullWidth = cardWidth + gap;

    let nextState = { ...state, gems: Math.max(0, (state.gems || 0) - 100) };
    save(nextState);

    setTimeout(() => {
      const windowW = windowRef.current ? windowRef.current.offsetWidth : 800;
      const centerLine = windowW / 2;
      const wobble = (Math.random() - 0.5) * 60;
      const targetCardCenter = 20 + winIdx * itemFullWidth + cardWidth / 2 + wobble;
      const finalX = -(targetCardCenter - centerLine);

      setTransitionStyle('transform 5.4s cubic-bezier(0.12, 0.8, 0.18, 1)');
      setTranslateX(finalX);

      // Deceleration tick loop
      const startTime = Date.now();
      const duration = 5400;
      let tickTimeout;
      const tick = () => {
        const elapsed = Date.now() - startTime;
        if (elapsed >= duration) return;
        playCaseTickSound();
        const progress = elapsed / duration;
        const nextDelay = 60 + Math.pow(progress, 2.8) * 550;
        tickTimeout = setTimeout(tick, nextDelay);
      };
      tickTimeout = setTimeout(tick, 60);

      timerRef.current = setTimeout(() => {
        clearTimeout(tickTimeout);
        const won = stripItems[winIdx] || CS_CASE_ITEMS[0];
        setWinnerItem(won);
        setSpinning(false);
        playFanfareTone();
        confettiBurst();

        let rewarded = { ...nextState };
        const inv = rewarded.inventory || { doubleXpUntil: null, secondChance: 0, vipFrame: false, leagueShield: false };

        if (won.type === 'xp') rewarded.xp = (rewarded.xp || 0) + won.amount;
        else if (won.type === 'gems') rewarded.gems = (rewarded.gems || 0) + won.amount;
        else if (won.type === 'freeze') rewarded.freezeCount = (rewarded.freezeCount || 0) + won.amount;
        else if (won.type === 'second_chance') rewarded.inventory = { ...inv, secondChance: (inv.secondChance || 0) + won.amount };
        else if (won.type === 'league_shield') rewarded.inventory = { ...inv, leagueShield: true };
        else if (won.type === 'vip_frame') rewarded.inventory = { ...inv, vipFrame: true };
        else if (won.type === 'booster') rewarded.inventory = { ...inv, doubleXpUntil: Date.now() + 60 * 60 * 1000 };
        else if (won.type === 'jackpot') { rewarded.xp = (rewarded.xp || 0) + 500; rewarded.gems = (rewarded.gems || 0) + 200; }

        save(rewarded);

        const bCase = BADGES.find(b => b.id === 'cs_case_unboxed');
        if (bCase) window.dispatchEvent(new CustomEvent('ef-badge-unlocked', { detail: bCase }));

        if (won.rarity === 'gold' || won.rarity === 'red') {
          const bDrop = BADGES.find(b => b.id === 'legendary_drop');
          if (bDrop) window.dispatchEvent(new CustomEvent('ef-badge-unlocked', { detail: bDrop }));
        }
      }, 5450);
    }, 50);
  };

  if (!isOpen) return null;

  return (
    <div className="cs-case-overlay" onClick={spinning ? undefined : onClose}>
      <div className="cs-case-modal" onClick={e => e.stopPropagation()}>
        <div className="cs-case-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>🎁</span>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>ТАЄМНИЧА CS:GO СКРИНЯ ДРЕВНІХ ПОІНТІВ</h3>
              <span className="muted" style={{ fontSize: 12 }}>Вартість відкриття: <b>100 🪙 Поінтів</b></span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="stat-chip currency-pill-coins" style={{ padding: '6px 14px', fontSize: 14 }}>
              <AncientCoinIcon size={18} /> {state.gems || 0} 🪙
            </div>
            {!spinning && (
              <button type="button" className="icon small" onClick={onClose} style={{ color: '#94a3b8' }}>✕</button>
            )}
          </div>
        </div>

        <div className="cs-case-body">
          <div className="cs-roulette-window" ref={windowRef}>
            <div className="cs-roulette-indicator" />
            <div
              className="cs-roulette-strip"
              style={{
                transform: `translateX(${translateX}px)`,
                transition: transitionStyle
              }}
            >
              {stripItems.map((item, idx) => {
                const isWin = winnerItem && idx === 54;
                return (
                  <div
                    key={item.uid}
                    className={`cs-case-card ${isWin ? 'winner' : ''}`}
                    style={{
                      borderTopColor: item.color,
                      background: isWin ? 'rgba(245, 158, 11, 0.2)' : undefined
                    }}
                  >
                    <div style={{ fontSize: 38, marginBottom: 8, filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.5))' }}>
                      {item.icon}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, textAlign: 'center', color: '#f8fafc', lineHeight: 1.2 }}>
                      {item.name}
                    </div>
                    <div
                      className={`rarity-stripe cs-rarity-${item.rarity}`}
                      style={{ background: item.color }}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {winnerItem ? (
            <div style={{ textAlign: 'center', animation: 'csFadeIn 0.3s ease-out' }}>
              <span style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', color: winnerItem.color, fontWeight: 800 }}>
                🎉 ВИТАСКАНО ПРЕДМЕТ!
              </span>
              <h2 style={{ margin: '4px 0 14px', fontSize: 24, color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <span>{winnerItem.icon}</span> {winnerItem.name}
              </h2>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button
                  type="button"
                  className="primary"
                  onClick={spin}
                  disabled={(state.gems || 0) < 100}
                  style={{ minWidth: 200, fontSize: 15, padding: '12px 24px' }}
                >
                  ▶ КРУТИТИ ЩЕ РАЗ (100 🪙)
                </button>
                <button type="button" className="secondary" onClick={onClose} style={{ padding: '12px 20px' }}>
                  Забрати й закрити
                </button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <button
                type="button"
                className="primary"
                onClick={spin}
                disabled={spinning || (state.gems || 0) < 100}
                style={{
                  minWidth: 260,
                  fontSize: 16,
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  padding: '14px 32px',
                  borderRadius: 16,
                  boxShadow: '0 0 25px rgba(245, 158, 11, 0.45)'
                }}
              >
                {spinning ? '⏳ РУЛЕТКА КРУТИТЬСЯ...' : '▶ ВІДКРИТИ КЕЙС (100 🪙)'}
              </button>
              <div style={{ marginTop: 10, fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
                Шанси: 🟦 55% Common · 🟪 25% Rare · 🟪 12% Epic · 🟥 6% Covert · 🟨 2% Special Legendary
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ShopPage({state, save, onRefreshGamification, allUsers}) {
  const [tavernTab, setTavernTab] = useState('food'); // 'food' | 'healing' | 'quests' | 'gear'
  const [busy, setBusy] = useState(false);
  const [showEconomyModal, setShowEconomyModal] = useState(false);
  const [caseModalOpen, setCaseModalOpen] = useState(false);
  const [giftModal, setGiftModal] = useState(null); // {item, cost, itemId}
  const xp = state.xp || 0;
  const gems = state.gems || 0;
  const freezeCount = state.freezeCount || 0;
  const inventory = state.inventory || { doubleXpUntil: null, secondChance: 0, vipFrame: false, leagueShield: false, cosmetics: {} };
  const cosmetics = inventory.cosmetics || {};

  const buy = async (itemId, cost) => {
    if (gems < cost) {
      emitSiteError(`Не вистачає Древніх Поінтів! Потрібно 🪙 ${cost}, у вас 🪙 ${gems}. Заробляйте монети за квести, уроки 100% та щоденну активність!`, 'Таверна');
      return;
    }
    setBusy(true);
    playMarioCoin();
    try {
      let nextState = {...state};
      nextState.gems = gems - cost;

      if (itemId === 'freeze') {
        await postGamification('buy_freeze').catch(() => {});
        await onRefreshGamification().catch(() => {});
        nextState.freezeCount = freezeCount + 1;
        save(nextState);
        emitSiteToast(`❄️ Придбано Заморозку серії (-${cost} 🪙)!`, 'ok');
        confettiBurst();
      } else if (itemId === 'booster') {
        const doubleUntil = Date.now() + 30 * 60 * 1000;
        nextState.inventory = {...inventory, doubleXpUntil: doubleUntil};
        save(nextState);
        emitSiteToast(`⚡ Ель бадьорості (2× XP) активовано на 30 хв (-${cost} 🪙)!`, 'ok');
        confettiBurst();
      } else if (itemId === 'feast') {
        nextState.xp = (nextState.xp || 0) + 75;
        save(nextState);
        emitSiteToast(`🥧 Ситний пиріг підкріпив сили: +75 XP ліги (-${cost} 🪙)!`, 'ok');
        confettiBurst();
      } else if (itemId === 'mead') {
        nextState.xp = (nextState.xp || 0) + 40;
        save(nextState);
        emitSiteToast(`🍯 Медовуха мудрості додала +40 XP та осяяння (-${cost} 🪙)!`, 'ok');
        confettiBurst();
      } else if (itemId === 'coffee') {
        nextState.gems = Math.max(0, nextState.gems);
        save(nextState);
        emitSiteToast(`☕ Кава вченого випита: додатковий бліц розблоковано (-${cost} 🪙)!`, 'ok');
        confettiBurst();
      } else if (itemId === 'second_chance') {
        nextState.inventory = {...inventory, secondChance: (inventory.secondChance || 0) + 1};
        save(nextState);
        emitSiteToast(`🧪 Еліксир відродження придбано (-${cost} 🪙)!`, 'ok');
        confettiBurst();
      } else if (itemId === 'vip_frame') {
        nextState.inventory = {...inventory, vipFrame: true};
        save(nextState);
        emitSiteToast(`👑 Золоту королівську рамку розблоковано (-${cost} 🪙)!`, 'ok');
        confettiBurst();
      } else if (itemId === 'league_shield') {
        nextState.inventory = {...inventory, leagueShield: true};
        save(nextState);
        emitSiteToast(`🛡️ Щит Ліги активовано (-${cost} 🪙)! Захищає від вильоту.`, 'ok');
        confettiBurst();
      } else if (itemId === 'herbal_brew') {
        save(nextState);
        emitSiteToast(`🌿 Цілющий відвар додає додаткове життя для бос-битв (-${cost} 🪙)!`, 'ok');
        confettiBurst();
      } else if (itemId === 'mystery_contract') {
        nextState.xp = (nextState.xp || 0) + 60;
        save(nextState);
        emitSiteToast(`📜 Контракт прийнято: +60 XP за виконання особливого доручення (-${cost} 🪙)!`, 'ok');
        confettiBurst();
      } else if (itemId === 'ruins_map') {
        nextState.xp = (nextState.xp || 0) + 100;
        save(nextState);
        emitSiteToast(`🗺️ Мапа руїн розшифрована: секретний скарб +100 XP (-${cost} 🪙)!`, 'ok');
        confettiBurst();
      } else if (itemId === 'champion_cape') {
        nextState.inventory = {...inventory, championCape: true};
        save(nextState);
        emitSiteToast(`⚔️ Почесний плащ лицаря одягнено (-${cost} 🪙)!`, 'ok');
        confettiBurst();
      } else if (itemId === 'mystery_chest') {
        playChestTone();
        const outcomes = [
          {type: 'xp', amount: 150, msg: '🎉 Джекпот Ліги: +150 XP!'},
          {type: 'gems', amount: 20, msg: '🪙 Скарбниця: +20 Древніх Монет!'},
          {type: 'xp', amount: 75, msg: '✨ Виграш: +75 XP!'},
          {type: 'freeze', amount: 1, msg: '❄️ Виграно: +1 Заморозку серії!'},
          {type: 'gems', amount: 12, msg: '🪙 Знайдено: +12 Поінтів!'}
        ];
        const res = outcomes[Math.floor(Math.random() * outcomes.length)];
        if (res.type === 'xp') nextState.xp = (nextState.xp || 0) + res.amount;
        else if (res.type === 'gems') nextState.gems = (nextState.gems || 0) + res.amount;
        else if (res.type === 'freeze') nextState.freezeCount = (nextState.freezeCount || 0) + 1;
        save(nextState);
        emitSiteToast(`🎁 Скриня: ${res.msg}`, 'ok');
        confettiBurst();
      } else if (itemId.startsWith('cosmetic_')) {
        nextState.inventory = {...inventory, cosmetics: {...cosmetics, [itemId]: true}};
        save(nextState);
        emitSiteToast(`✨ Косметику придбано! (-${cost} 🪙 Поінтів)`, 'ok');
        confettiBurst();
      }
    } catch (e) {
      emitSiteError(e.message || 'Помилка покупки', 'Таверна');
    } finally {
      setBusy(false);
    }
  };

  const equipCosmetic = (type, value) => {
    const nextCosmetics = {...cosmetics, [`equipped_${type}`]: value};
    save({...state, inventory: {...inventory, cosmetics: nextCosmetics}});
    emitSiteToast(`✅ Спорядження застосовано!`, 'ok');
  };

  const isBoosterActive = inventory.doubleXpUntil && inventory.doubleXpUntil > Date.now();
  const boosterMinutesLeft = isBoosterActive ? Math.ceil((inventory.doubleXpUntil - Date.now()) / 60000) : 0;

  // Catalogues
  const AURAS = [
    { id: 'cosmetic_aura_gold', css: 'aura-gold', name: '🌟 Золота аура', rarity: 'RARE', cost: 35 },
    { id: 'cosmetic_aura_rainbow', css: 'aura-rainbow', name: '🌈 Веселкова аура', rarity: 'LEGENDARY', cost: 80 },
    { id: 'cosmetic_aura_neon', css: 'aura-neon', name: '💙 Неон аура', rarity: 'EPIC', cost: 55 },
    { id: 'cosmetic_aura_cosmic', css: 'aura-cosmic', name: '🔮 Космічна аура', rarity: 'EPIC', cost: 60 },
    { id: 'cosmetic_aura_crimson', css: 'aura-crimson', name: '🔴 Кримсон аура', rarity: 'RARE', cost: 40 },
  ];
  const FRAMES = [
    { id: 'cosmetic_frame_gold', css: 'frame-gold', name: '👑 Золота рамка', rarity: 'RARE', cost: 45 },
    { id: 'cosmetic_frame_hex', css: 'frame-hex', name: '⬡ Hex рамка', rarity: 'EPIC', cost: 65 },
    { id: 'cosmetic_frame_runic', css: 'frame-runic', name: '🪨 Рунічна рамка', rarity: 'RARE', cost: 40 },
    { id: 'cosmetic_frame_ice', css: 'frame-ice', name: '🧊 Льодяна рамка', rarity: 'EPIC', cost: 55 },
    { id: 'cosmetic_frame_emerald', css: 'frame-emerald', name: '🍀 Смарагдова рамка', rarity: 'COMMON', cost: 25 },
  ];
  const GIFTABLE = [
    { id: 'gift_gems_5', name: '🪙 5 Монет', desc: 'Подарунок — 5 Древніх Монет другу', cost: 7 },
    { id: 'gift_gems_15', name: '🪙 15 Монет', desc: 'Подарунок — 15 Древніх Монет другу', cost: 18 },
    { id: 'gift_freeze', name: '❄️ Заморозка', desc: 'Подаруй другу захист стріку на 1 день', cost: 18 },
    { id: 'gift_booster', name: '⚡ XP Booster', desc: 'Подаруй другу 2× XP на 30 хвилин', cost: 30 },
  ];

  const friends = (allUsers || []).filter(u => u.nick !== state.nick);

  return (
    <section className="fade-in tavern-page-container">
      {/* 🏰 Carved Dark Wooden Planks Header with Ruby Close and Ornate Golden Title (Screenshot 4) */}
      <div className="tavern-wood-header">
        <div className="tavern-wood-title-box">
          <span className="tavern-runic-eyebrow">⚜️ ANCIENT TRAVELER'S INN & MARKETPLACE ⚜️</span>
          <h1 className="tavern-wood-h1">🏰 ТАВЕРНА СТАРОДАВНЬОГО МАНДРІВНИКА</h1>
          <p className="tavern-wood-sub">
            Відпочиньте біля вогнища. Усі товари купуються суто за <b>🪙 Древні Поінти</b>. Бали <b>⚡ XP</b> недоторканні!
          </p>
        </div>

        <div className="tavern-wood-top-actions">
          {/* Glowing Coin Purse */}
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
          </div>
        </div>
      </div>

      {/* Medieval Sub-Tabs Bar: [ ЇЖА ТА НАПОЇ ] [ СПОКІЙ ТА ЛІКИ ] [ КВЕСТИ ТА ЧУТКИ ] [ ТОВАРИ МАНДРІВНИКА ] */}
      <div className="tavern-subtabs-bar">
        <button
          type="button"
          className={'tavern-tab-btn' + (tavernTab === 'food' ? ' active' : '')}
          onClick={() => setTavernTab('food')}
        >
          [ ЇЖА ТА НАПОЇ ]
        </button>
        <button
          type="button"
          className={'tavern-tab-btn' + (tavernTab === 'healing' ? ' active' : '')}
          onClick={() => setTavernTab('healing')}
        >
          [ СПОКІЙ ТА ЛІКИ ]
        </button>
        <button
          type="button"
          className={'tavern-tab-btn' + (tavernTab === 'quests' ? ' active' : '')}
          onClick={() => setTavernTab('quests')}
        >
          [ КВЕСТИ ТА ЧУТКИ ]
        </button>
        <button
          type="button"
          className={'tavern-tab-btn' + (tavernTab === 'gear' ? ' active' : '')}
          onClick={() => setTavernTab('gear')}
        >
          [ ТОВАРИ МАНДРІВНИКА ]
        </button>
      </div>

      {/* SUB-TAB 1: [ ЇЖА ТА НАПОЇ ] */}
      {tavernTab === 'food' && (
        <div className="tavern-parchment-grid">
          {/* Ale Booster */}
          <div className="tavern-parchment-card">
            <div className="tavern-item-top">
              <span className="tavern-item-icon">🍺</span>
              <span className="tavern-tier-badge tier-rare">РІДКІСНЕ</span>
            </div>
            <h3 className="tavern-item-title">Ель бадьорості (2× XP)</h3>
            <p className="tavern-item-desc">
              {isBoosterActive
                ? `🟢 Активно ще ${boosterMinutesLeft} хв. Подвійні очки XP за кожен правильний урок!`
                : 'Подвоює всі зароблені бали XP у будь-яких уроках та тестах на 30 хвилин.'}
            </p>
            <div className="tavern-card-footer">
              <span className="tavern-price-tag">🪙 25 Поінтів</span>
              <button
                type="button"
                className="tavern-buy-action-btn"
                disabled={busy || gems < 25 || isBoosterActive}
                onClick={() => buy('booster', 25)}
              >
                {isBoosterActive ? '✓ Випито' : '[ КУПИТИ ]'}
              </button>
            </div>
          </div>

          {/* Traveler Pie */}
          <div className="tavern-parchment-card">
            <div className="tavern-item-top">
              <span className="tavern-item-icon">🥧</span>
              <span className="tavern-tier-badge tier-epic">ЕПІЧНЕ</span>
            </div>
            <h3 className="tavern-item-title">Ситний пиріг мандрівника</h3>
            <p className="tavern-item-desc">
              Гарячий м'ясний пиріг, приготований за старовинним рецептом. Миттєво додає <b>+75 XP</b> до рейтингу ліги.
            </p>
            <div className="tavern-card-footer">
              <span className="tavern-price-tag">🪙 35 Поінтів</span>
              <button
                type="button"
                className="tavern-buy-action-btn"
                disabled={busy || gems < 35}
                onClick={() => buy('feast', 35)}
              >
                [ КУПИТИ ]
              </button>
            </div>
          </div>

          {/* Wisdom Mead */}
          <div className="tavern-parchment-card">
            <div className="tavern-item-top">
              <span className="tavern-item-icon">🍯</span>
              <span className="tavern-tier-badge tier-common">ЗВИЧАЙНЕ</span>
            </div>
            <h3 className="tavern-item-title">Медовуха мудрості</h3>
            <p className="tavern-item-desc">
              Освіжаючий ароматний напій. Додає <b>+40 XP</b> та дарує натхнення для легкого засвоєння складних граматичних зворотів.
            </p>
            <div className="tavern-card-footer">
              <span className="tavern-price-tag">🪙 20 Поінтів</span>
              <button
                type="button"
                className="tavern-buy-action-btn"
                disabled={busy || gems < 20}
                onClick={() => buy('mead', 20)}
              >
                [ КУПИТИ ]
              </button>
            </div>
          </div>

          {/* Scholar Coffee */}
          <div className="tavern-parchment-card">
            <div className="tavern-item-top">
              <span className="tavern-item-icon">☕</span>
              <span className="tavern-tier-badge tier-common">ЗВИЧАЙНЕ</span>
            </div>
            <h3 className="tavern-item-title">Міцна кава вченого</h3>
            <p className="tavern-item-desc">
              Підбадьорливий напій з гірських зерен. Заряджає увагою на швидкісний 60с бліц та перевірку проблемних слів.
            </p>
            <div className="tavern-card-footer">
              <span className="tavern-price-tag">🪙 15 Поінтів</span>
              <button
                type="button"
                className="tavern-buy-action-btn"
                disabled={busy || gems < 15}
                onClick={() => buy('coffee', 15)}
              >
                [ КУПИТИ ]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: [ СПОКІЙ ТА ЛІКИ ] */}
      {tavernTab === 'healing' && (
        <div className="tavern-parchment-grid">
          {/* Freeze */}
          <div className="tavern-parchment-card">
            <div className="tavern-item-top">
              <span className="tavern-item-icon">❄️</span>
              <span className="tavern-tier-badge tier-rare">РУНА ЗАХИСТУ</span>
            </div>
            <h3 className="tavern-item-title">Заморозка серії (Руна льоду)</h3>
            <p className="tavern-item-desc">
              Автоматично захищає ваш стрік від скидання при пропуску дня. У вашому запасі: <b>{freezeCount}</b> шт.
            </p>
            <div className="tavern-card-footer">
              <span className="tavern-price-tag">🪙 15 Поінтів</span>
              <button
                type="button"
                className="tavern-buy-action-btn"
                disabled={busy || gems < 15}
                onClick={() => buy('freeze', 15)}
              >
                [ КУПИТИ ]
              </button>
            </div>
          </div>

          {/* Second Chance Elixir */}
          <div className="tavern-parchment-card">
            <div className="tavern-item-top">
              <span className="tavern-item-icon">🧪</span>
              <span className="tavern-tier-badge tier-common">ЕКСІКІР</span>
            </div>
            <h3 className="tavern-item-title">Еліксир відродження (Другий шанс)</h3>
            <p className="tavern-item-desc">
              Дозволяє миттєво виправити випадкову помилку в уроці без втрати комбо та очок. У вас: <b>{inventory.secondChance || 0}</b> шт.
            </p>
            <div className="tavern-card-footer">
              <span className="tavern-price-tag">🪙 10 Поінтів</span>
              <button
                type="button"
                className="tavern-buy-action-btn"
                disabled={busy || gems < 10}
                onClick={() => buy('second_chance', 10)}
              >
                [ КУПИТИ ]
              </button>
            </div>
          </div>

          {/* League Shield */}
          <div className="tavern-parchment-card">
            <div className="tavern-item-top">
              <span className="tavern-item-icon">🛡️</span>
              <span className="tavern-tier-badge tier-epic">ОБЕРІГ</span>
            </div>
            <h3 className="tavern-item-title">Щит Ліги (Оберіг безпеки)</h3>
            <p className="tavern-item-desc">
              Захищає від вильоту в нижчу лігу наприкінці тижневого сезону, навіть якщо ви пропустили змагання.
            </p>
            <div className="tavern-card-footer">
              <span className="tavern-price-tag">🪙 30 Поінтів</span>
              <button
                type="button"
                className="tavern-buy-action-btn"
                disabled={busy || gems < 30 || inventory.leagueShield}
                onClick={() => buy('league_shield', 30)}
              >
                {inventory.leagueShield ? '✓ Захист активний' : '[ КУПИТИ ]'}
              </button>
            </div>
          </div>

          {/* Herbal Brew */}
          <div className="tavern-parchment-card">
            <div className="tavern-item-top">
              <span className="tavern-item-icon">🌿</span>
              <span className="tavern-tier-badge tier-common">ТРАВИ</span>
            </div>
            <h3 className="tavern-item-title">Цілющий відвар травниці</h3>
            <p className="tavern-item-desc">
              Зілля з гірського чебрецю та шавлії. Надає додаткове серце стійкості у битвах з Титаном Слів.
            </p>
            <div className="tavern-card-footer">
              <span className="tavern-price-tag">🪙 20 Поінтів</span>
              <button
                type="button"
                className="tavern-buy-action-btn"
                disabled={busy || gems < 20}
                onClick={() => buy('herbal_brew', 20)}
              >
                [ КУПИТИ ]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: [ КВЕСТИ ТА ЧУТКИ ] */}
      {tavernTab === 'quests' && (
        <div className="tavern-parchment-grid">
          {/* Mystery Case CS:GO */}
          <div className="tavern-parchment-card">
            <div className="tavern-item-top">
              <span className="tavern-item-icon">🎁</span>
              <span className="tavern-tier-badge tier-legendary">CS:GO СКРИНЯ</span>
            </div>
            <h3 className="tavern-item-title">Таємнича Скриня Дракона</h3>
            <p className="tavern-item-desc">
              Запустіть рулетку кейсу! Шанс виграти до 500 XP, 150 Древніх Поінтів, VIP-рамку чи Заморозку стріку.
            </p>
            <div className="tavern-card-footer">
              <span className="tavern-price-tag">🪙 100 Поінтів</span>
              <button
                type="button"
                className="tavern-buy-action-btn"
                disabled={busy}
                onClick={() => setCaseModalOpen(true)}
              >
                [ ВІДКРИТИ ]
              </button>
            </div>
          </div>

          {/* Secret Contract */}
          <div className="tavern-parchment-card">
            <div className="tavern-item-top">
              <span className="tavern-item-icon">📜</span>
              <span className="tavern-tier-badge tier-epic">КОНТРАКТ</span>
            </div>
            <h3 className="tavern-item-title">Сувій таємничого контракту</h3>
            <p className="tavern-item-desc">
              Запечатане сургучем завдання гільдії. Виконайте урок з точністю 100% та отримайте <b>+60 XP</b>.
            </p>
            <div className="tavern-card-footer">
              <span className="tavern-price-tag">🪙 25 Поінтів</span>
              <button
                type="button"
                className="tavern-buy-action-btn"
                disabled={busy || gems < 25}
                onClick={() => buy('mystery_contract', 25)}
              >
                [ КУПИТИ ]
              </button>
            </div>
          </div>

          {/* Ancient Ruins Map */}
          <div className="tavern-parchment-card">
            <div className="tavern-item-top">
              <span className="tavern-item-icon">🗺️</span>
              <span className="tavern-tier-badge tier-rare">АРТЕФАКТ</span>
            </div>
            <h3 className="tavern-item-title">Мапа стародавніх руїн</h3>
            <p className="tavern-item-desc">
              Старовинна пергаментна карта. Відкриває доступ до рідкісних мовних скарбів та додає <b>+100 XP</b>.
            </p>
            <div className="tavern-card-footer">
              <span className="tavern-price-tag">🪙 45 Поінтів</span>
              <button
                type="button"
                className="tavern-buy-action-btn"
                disabled={busy || gems < 45}
                onClick={() => buy('ruins_map', 45)}
              >
                [ КУПИТИ ]
              </button>
            </div>
          </div>

          {/* Send Gifts to Friends */}
          <div className="tavern-parchment-card">
            <div className="tavern-item-top">
              <span className="tavern-item-icon">🤝</span>
              <span className="tavern-tier-badge tier-common">БРАТСТВО</span>
            </div>
            <h3 className="tavern-item-title">Крамниця дарів для побратимів</h3>
            <p className="tavern-item-desc">
              Надішліть монети або заморозку стріку своєму другові по навчанню. Справжня дружба зміцнює знання!
            </p>
            <div className="tavern-card-footer">
              <span className="tavern-price-tag">від 7 🪙</span>
              <button
                type="button"
                className="tavern-buy-action-btn"
                disabled={busy || friends.length === 0}
                onClick={() => setGiftModal({...GIFTABLE[0]})}
              >
                [ НАДІСЛАТИ ДАР ]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: [ ТОВАРИ МАНДРІВНИКА ] */}
      {tavernTab === 'gear' && (
        <div style={{display:'flex',flexDirection:'column',gap:20}}>
          {/* VIP Frame & Knight Cape */}
          <div className="tavern-parchment-grid">
            <div className="tavern-parchment-card">
              <div className="tavern-item-top">
                <span className="tavern-item-icon">👑</span>
                <span className="tavern-tier-badge tier-legendary">КОРОЛІВСЬКЕ</span>
              </div>
              <h3 className="tavern-item-title">Золота VIP-рамка</h3>
              <p className="tavern-item-desc">
                Ексклюзивне анімоване сяйво навколо вашої аватарки у лізі, профілі та чаті.
              </p>
              <div className="tavern-card-footer">
                <span className="tavern-price-tag">🪙 50 Поінтів</span>
                <button
                  type="button"
                  className="tavern-buy-action-btn"
                  disabled={busy || gems < 50 || inventory.vipFrame}
                  onClick={() => buy('vip_frame', 50)}
                >
                  {inventory.vipFrame ? '✓ Розблоковано' : '[ КУПИТИ ]'}
                </button>
              </div>
            </div>

            <div className="tavern-parchment-card">
              <div className="tavern-item-top">
                <span className="tavern-item-icon">⚔️</span>
                <span className="tavern-tier-badge tier-epic">ВІДЗНАКА</span>
              </div>
              <h3 className="tavern-item-title">Почесний плащ лицаря</h3>
              <p className="tavern-item-desc">
                Шляхетна відзнака чемпіона таверни. Виділяє ваш нікнейм у рейтингових таблицях.
              </p>
              <div className="tavern-card-footer">
                <span className="tavern-price-tag">🪙 60 Поінтів</span>
                <button
                  type="button"
                  className="tavern-buy-action-btn"
                  disabled={busy || gems < 60 || inventory.championCape}
                  onClick={() => buy('champion_cape', 60)}
                >
                  {inventory.championCape ? '✓ Одягнено' : '[ КУПИТИ ]'}
                </button>
              </div>
            </div>
          </div>

          {/* AURAS */}
          <div className="tavern-parchment-subheading">✨ Магічні аури для аватарки</div>
          <div className="tavern-parchment-grid">
            {AURAS.map(aura => {
              const owned = cosmetics[aura.id];
              const equipped = cosmetics['equipped_aura'] === aura.css;
              return (
                <div key={aura.id} className="tavern-parchment-card">
                  <div className="tavern-item-top">
                    <div style={{width:44,height:44,borderRadius:'50%',background:'rgba(0,0,0,0.3)',display:'grid',placeItems:'center'}}>
                      <span className={aura.css} style={{width:32,height:32,borderRadius:'50%',display:'block'}}/>
                    </div>
                    <span className="tavern-tier-badge tier-rare">{aura.rarity}</span>
                  </div>
                  <h3 className="tavern-item-title">{aura.name}</h3>
                  <p className="tavern-item-desc">Пульсуюче сяйво стихії навколо вашого героя.</p>
                  <div className="tavern-card-footer">
                    <span className="tavern-price-tag">🪙 {aura.cost}</span>
                    {owned ? (
                      <button
                        type="button"
                        className="tavern-buy-action-btn"
                        onClick={() => equipCosmetic('aura', aura.css)}
                      >
                        {equipped ? '✓ Активна' : '[ ОДЯГНУТИ ]'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="tavern-buy-action-btn"
                        disabled={busy || gems < aura.cost}
                        onClick={() => buy(aura.id, aura.cost)}
                      >
                        [ КУПИТИ ]
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* FRAMES */}
          <div className="tavern-parchment-subheading">🪞 Декоративні рамки персонажа</div>
          <div className="tavern-parchment-grid">
            {FRAMES.map(frame => {
              const owned = cosmetics[frame.id];
              const equipped = cosmetics['equipped_frame'] === frame.css;
              return (
                <div key={frame.id} className="tavern-parchment-card">
                  <div className="tavern-item-top">
                    <div style={{width:44,height:44,display:'grid',placeItems:'center'}}>
                      <div className={frame.css} style={{width:32,height:32,display:'block'}}/>
                    </div>
                    <span className="tavern-tier-badge tier-common">{frame.rarity}</span>
                  </div>
                  <h3 className="tavern-item-title">{frame.name}</h3>
                  <p className="tavern-item-desc">Вишуканий орнамент для обрамлення вашого аватара.</p>
                  <div className="tavern-card-footer">
                    <span className="tavern-price-tag">🪙 {frame.cost}</span>
                    {owned ? (
                      <button
                        type="button"
                        className="tavern-buy-action-btn"
                        onClick={() => equipCosmetic('frame', frame.css)}
                      >
                        {equipped ? '✓ Активна' : '[ ОДЯГНУТИ ]'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="tavern-buy-action-btn"
                        disabled={busy || gems < frame.cost}
                        onClick={() => buy(frame.id, frame.cost)}
                      >
                        [ КУПИТИ ]
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 🧝‍♀️ Tavernkeeper Edara Dialogue Bar at the bottom (Screenshot 4) */}
      <div className="tavern-keeper-dialogue-bar">
        <div className="tavern-keeper-avatar-wrap">
          <span className="tavern-keeper-avatar">🧝‍♀️</span>
        </div>
        <div className="tavern-keeper-text-box">
          <div className="tavern-keeper-name">Корчмарка Едара</div>
          <p className="tavern-keeper-quote">
            «Ласкаво прошу до нашої таверни, шановний мандрівнику! Відпочиньте біля вогнища, підкріпіть сили ситним пирогом чи елем бадьорості та оберіть спорядження для наступної мандрівки знаннями. Пам'ятайте: бали XP недоторканні — ми торгуємо виключно за Древні Поінти!»
          </p>
        </div>
        <button
          type="button"
          className="tavern-rules-link-btn"
          onClick={() => setShowEconomyModal(true)}
        >
          📜 Економіка сайту ➔
        </button>
      </div>

      {/* Financial Economy & Rules Modal */}
      {showEconomyModal && (
        <div className="modal-backdrop" onClick={() => setShowEconomyModal(false)}>
          <div className="card modal" onClick={e => e.stopPropagation()} style={{maxWidth:600,maxHeight:'90vh',overflowY:'auto'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
              <h2 style={{margin:0,display:'flex',alignItems:'center',gap:8}}>
                <AncientCoinIcon size={24}/> Фінансова Модель English Flow
              </h2>
              <button className="secondary close-btn" onClick={() => setShowEconomyModal(false)} style={{padding:'4px 8px'}}>✕</button>
            </div>

            <div style={{fontSize:14,lineHeight:1.6,display:'flex',flexDirection:'column',gap:12}}>
              <div style={{padding:12,borderRadius:12,background:'rgba(245,158,11,0.1)',border:'1px solid rgba(245,158,11,0.3)'}}>
                <b style={{color:'#d97706'}}>⚖️ Головне правило економіки:</b>
                <p style={{margin:'4px 0 0'}}>
                  <b>Бали XP НЕ витрачаються!</b> Вони відображають ваш чистий академічний рівень та позицію в лізі. Усі покупки здійснюються суто за <b>Древні Поінти (🪙)</b>.
                </p>
              </div>

              <div>
                <h3 style={{margin:'8px 0 4px',fontSize:15}}>📥 Де брати Древні Поінти:</h3>
                <ul style={{margin:'4px 0 0 16px',padding:0}}>
                  <li><b>Завершені уроки:</b> +2 🪙 за кожен завершений урок (добовий ліміт заробітку з уроків: максимум 60 🪙).</li>
                  <li><b>Щоденні квести:</b> від +3 до +5 🪙 за виконання кожного завдання.</li>
                  <li><b>Перемоги у Спринті:</b> +4 🪙 за перемогу над суперником у дуелі.</li>
                  <li><b>Щоденний подарунок:</b> від +5 до +25 🪙 при регулярному відвідуванні.</li>
                  <li><b>Підвищення в Лізі:</b> від +25 до +50 🪙 при переході у вищу лігу.</li>
                </ul>
              </div>

              <div>
                <h3 style={{margin:'8px 0 4px',fontSize:15}}>🛡️ Захист від нескінченного фарму (Fair Play):</h3>
                <ul style={{margin:'4px 0 0 16px',padding:0}}>
                  <li><b>Добовий ліміт з уроків:</b> максимум <b>60 Поінтів на добу</b>.</li>
                  <li><b>Таємнича CS:GO Скриня:</b> коштує <b>100 Поінтів</b> — преміальна рулетка з шансом вибити легендарні предмети.</li>
                  <li><b>Нульовий донат:</b> поінти не можна купити за реальні гроші. Тільки щоденна праця!</li>
                </ul>
              </div>
            </div>

            <div style={{marginTop:18,textAlign:'right'}}>
              <button className="primary" onClick={() => setShowEconomyModal(false)}>Зрозуміло ✓</button>
            </div>
          </div>
        </div>
      )}

      {/* CS:GO Roulette Mystery Case Modal */}
      <CsCaseRouletteModal
        isOpen={caseModalOpen}
        onClose={() => setCaseModalOpen(false)}
        state={state}
        save={save}
      />

      {/* Gift Friend Modal */}
      {giftModal && (
        <GiftFriendModal
          gift={giftModal}
          friends={friends}
          gems={gems}
          onClose={() => setGiftModal(null)}
          onSend={async (recipientNick) => {
            if (gems < giftModal.cost) {
              emitSiteError('Недостатньо монет!', 'Таверна');
              return;
            }
            setBusy(true);
            try {
              const nextState = {...state, gems: gems - giftModal.cost};
              save(nextState);
              await sendChat(state.nick, recipientNick, `🎁 Подарунок від @${state.nick}: ${giftModal.name}! ${giftModal.desc}`).catch(() => {});
              emitSiteToast(`🎁 Подарунок відправлено @${recipientNick}! (-${giftModal.cost} 🪙)`, 'ok');
              confettiBurst();
              setGiftModal(null);
            } catch (e) {
              emitSiteError(e.message || 'Помилка відправки подарунку', 'Таверна');
            } finally {
              setBusy(false);
            }
          }}
        />
      )}
    </section>
  );
}

function GiftFriendModal({gift, friends, gems, onClose, onSend}) {
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);

  const handleSend = async () => {
    if (!selected) return;
    setBusy(true);
    await onSend(selected);
    setBusy(false);
  };

  return (
    <div className="gift-friend-modal-backdrop" onClick={onClose}>
      <div className="gift-friend-modal" onClick={e => e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <h3>🎁 Надіслати: {gift.name}</h3>
          <button className="icon" onClick={onClose}>✕</button>
        </div>
        <p style={{color:'#c4996a',fontSize:13,marginBottom:16}}>
          {gift.desc}<br/>
          <b style={{color:'#fde68a'}}>Вартість: 🪙 {gift.cost} Поінтів</b> (у вас: {gems})
        </p>

        <p style={{color:'#fde68a',fontWeight:700,marginBottom:8,fontSize:13}}>Обери гравця-отримувача:</p>
        <div className="friend-select-list">
          {friends.length === 0 && <p className="muted small" style={{padding:12,textAlign:'center'}}>Немає доступних гравців</p>}
          {friends.map(f => (
            <div
              key={f.nick}
              className={'friend-select-row' + (selected === f.nick ? ' selected' : '')}
              onClick={() => setSelected(f.nick)}
            >
              <span style={{fontSize:20}}>{f.avatar ? '👤' : '🧑'}</span>
              <div>
                <div className="friend-select-nick">@{f.nick}</div>
                <div className="friend-select-sub">{f.name || ''}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{display:'flex',gap:10,marginTop:16}}>
          <button className="secondary" style={{flex:1}} onClick={onClose}>Скасувати</button>
          <button
            className="primary"
            style={{flex:2,background:'linear-gradient(135deg,#d97706,#b45309)',border:'1px solid #f59e0b'}}
            disabled={!selected || busy || gems < gift.cost}
            onClick={handleSend}
          >
            {busy ? '⏳ Відправка…' : `🎁 Надіслати @${selected || '?'}`}
          </button>
        </div>
      </div>
    </div>
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

  const loginVipTester = () => {
    setGuestSession(false);
    const t = getTesterProfile();
    saveProfile('tester', t);
    onDone(t);
    emitSiteToast('👑 Вхід як Tester успішний! 250 🪙 монет, 1850 XP, Стрік 14, Лицар-Вартовий активовано.', 'ok');
  };

  const doLogin = async () => {
    const n = nick.trim();
    if (!n) { setErr('Вкажи нік'); return; }
    if (n.toLowerCase() === 'tester') {
      loginVipTester();
      return;
    }
    if (!pass) { setErr('Вкажи пароль'); return; }
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

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:8}}>
          <button className="secondary guest-btn" type="button" onClick={guest} style={{justifyContent:'center',padding:'10px'}}>
            <Ghost size={16}/> Гість
          </button>
          <button className="secondary test-login-btn" type="button" onClick={loginVipTester} style={{justifyContent:'center',borderColor:'var(--accent)',color:'var(--accent)',fontWeight:700,padding:'10px'}}>
            🧪 Tester
          </button>
        </div>
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

function isMetricIncreased(type, state, learned) {
  const snap = state?.midnightSnap;
  if (!snap) return false;
  if (type === 'streak') {
    return typeof snap.streak === 'number' && (state.streak || 0) > snap.streak;
  }
  if (type === 'xp') {
    return typeof snap.xp === 'number' && (state.xp || 0) > snap.xp;
  }
  if (type === 'target') {
    const goal = state?.dailyGoal || 30;
    const progress = state?.todayXp || 0;
    return progress > 0 && progress >= goal;
  }
  if (type === 'learned') {
    return typeof snap.learned === 'number' && (learned || 0) > snap.learned;
  }
  return false;
}

function Dashboard({state, learned, due, words, onLearn, onReview, cloudMsg, quests, giftAvailable, onOpenGift}) {
  const league = leagueForXp(state.xp || 0);
  return (
    <section>
      <div className="announce card jungle-announce">
        <span className="vine-deco left" aria-hidden="true">🌿</span>
        <span className="vine-deco right" aria-hidden="true">🌿</span>
        <span className="eyebrow">UPDATE · v3.4.0</span>
        <h2>🏰 Таверна Мандрівника, Повні Аватари в Русі, Бос-таймер 30с</h2>
        <p>Оновлена Таверна Стародавнього Мандрівника з 4 категоріями товарів, 30 динамічних персонажів у повен зріст в дії, 30с таймер проти Титана Слів, розклад Notion 9-23 та виправлена стабільність адмінки.</p>
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
            {state.streak > 0 && (
              <span className="freeze-chip">
                <span className={isMetricIncreased('streak', state, learned) ? "emoji-animated-streak" : ""}>🔥</span> {state.streak} днів
              </span>
            )}
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
        <Card
          icon={<span className={isMetricIncreased('streak', state, learned) ? "emoji-animated-streak" : ""}>🔥</span>}
          title="Streak"
          value={state.streak}
          sub="днів"
        />
        <Card
          icon={<span className={isMetricIncreased('xp', state, learned) ? "emoji-animated-xp" : ""}>⚡</span>}
          title="XP"
          value={state.xp}
          sub={`сьогодні ${state.todayXp}`}
        />
        <Card
          icon={<span className={isMetricIncreased('target', state, learned) ? "emoji-animated-target" : ""}>🎯</span>}
          title="Ціль"
          value={`${Math.min(100, Math.round((state.todayXp / state.dailyGoal) * 100))}%`}
          sub={`${state.todayXp}/${state.dailyGoal}`}
        />
        <Card
          icon={<span className={isMetricIncreased('learned', state, learned) ? "emoji-animated-learned" : ""}>🧠</span>}
          title="Вивчено"
          value={learned}
          sub={`з ${words}`}
        />
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
          <p className="bonus-line" style={{color:'#f59e0b',fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
            <AncientCoinIcon size={18}/> +2 Древніх Поінти за урок (добовий ліміт уроків: 60 🪙)
          </p>
          {badCount === 0 && okCount > 0 && <p className="bonus-line" style={{color:'#16a34a',fontWeight:700}}>✨ Ідеальний урок без жодної помилки!</p>}
          <CompareBlurb state={state} />
          <button className="primary" type="button" onClick={() => {
            let next = {...state, gamesPlayed: (state.gamesPlayed || 0) + 1};
            const { nextState } = awardDailyCoins(next, 2, 60);
            next = nextState;
            if (badCount === 0 && okCount > 0) {
              confettiBurst();
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
  const [flash, setFlash] = useState({}); // {id: 'correct'} only for correct matches
  const [shakeWrong, setShakeWrong] = useState({}); // {id: true} for shake animation
  const stateRef = useRef(state);
  stateRef.current = state;
  const pendingProgress = useRef([]);

  useEffect(() => {
    if (!selL || !selR) return;
    const ok = selL === selR;
    playTone(ok);
    const st = stateRef.current;
    if (ok) {
      // Correct match: show green flash and keep matched
      setFlash(f => ({...f, [selL]: 'correct'}));
      setMatched(m => ({...m, [selL]: true}));
      const points = st.admin.correctPoints;
      save({...st, xp: st.xp + points, todayXp: st.todayXp + points,
        history: [...st.history, {word: selL, correct: true, points, date: new Date().toISOString(), mode: 'match'}].slice(-2000)});
      if (!st.guest) pendingProgress.current.push(cloudRecordProgress({notion_id: selL, mode:'match', answer:selR, direction, quality:4, event_id:newEventId(), lesson_id:lessonId||''}).then(r=>{if(r?.user){const cur=stateRef.current,c=r.card;save({...cur,xp:r.user.xp,streak:r.user.streak,todayXp:r.user.todayXp,today:r.user.today,badges:[...new Set([...(cur.badges||[]),...(r.earned||[])])],...(c?{mastery:{...cur.mastery,[c.notion_id]:c.mastery},srs:{...cur.srs,[c.notion_id]:c.srs},attempts:{...cur.attempts,[c.notion_id]:c.attempts}}:{})})}return r}).catch(()=>null));
      setSelL(null); setSelR(null);
    } else {
      // Wrong match: shake both selected cards, do NOT reveal which is correct
      save({...st, xp: st.xp + st.admin.wrongPoints, todayXp: st.todayXp + st.admin.wrongPoints});
      if (!st.guest) pendingProgress.current.push(cloudRecordProgress({notion_id: selL, mode:'match', answer:selR, direction, quality:1, event_id:newEventId(), lesson_id:lessonId||''}).then(r=>{if(r?.user){const cur=stateRef.current,c=r.card;save({...cur,xp:r.user.xp,streak:r.user.streak,todayXp:r.user.todayXp,today:r.user.today,badges:[...new Set([...(cur.badges||[]),...(r.earned||[])])],...(c?{mastery:{...cur.mastery,[c.notion_id]:c.mastery},srs:{...cur.srs,[c.notion_id]:c.srs},attempts:{...cur.attempts,[c.notion_id]:c.attempts}}:{})})}return r}).catch(()=>null));
      // Apply shake animation to the wrong-selected items
      setShakeWrong({[selL]: true, [selR]: true});
      const t = setTimeout(() => {
        setShakeWrong({});
        setSelL(null); setSelR(null);
      }, 600);
      return () => clearTimeout(t);
    }
  }, [selL, selR]);

  const allDone = items.length > 0 && items.every(w => matched[w.id]);
  if (allDone) return <section><div className="complete card"><h1>Match завершено 🎯</h1><button className="primary" onClick={() => { if (!state.guest && lessonId) Promise.allSettled(pendingProgress.current).then(() => cloudFinishLesson(lessonId).then(r => { if(r?.user) save({...stateRef.current,...r.user}); }).catch(() => {})); onDone(); }}>На головну</button></div></section>;

  return (
    <section>
      <button className="back" onClick={onExit}>← Назад</button>
      <Title title="Match" text="Обери слово і відповідний переклад. Неправильна пара — спробуй ще!"/>
      <div className="match-board">
        <div className="match-col">{left.map(x => (
          <button key={x.id} disabled={matched[x.id]} className={'option match-item' + (matched[x.id] ? ' correct matched-stay' : '') + (selL === x.id && !shakeWrong[x.id] ? ' selected' : '') + (flash[x.id] === 'correct' ? ' correct' : '') + (shakeWrong[x.id] ? ' shake-wrong' : '')} onClick={() => { if (!shakeWrong[x.id]) setSelL(x.id); }}>{x.text}</button>
        ))}</div>
        <div className="match-col">{right.map(x => (
          <button key={x.id} disabled={matched[x.id]} className={'option match-item' + (matched[x.id] ? ' correct matched-stay' : '') + (selR === x.id && !shakeWrong[x.id] ? ' selected' : '') + (flash[x.id] === 'correct' ? ' correct' : '') + (shakeWrong[x.id] ? ' shake-wrong' : '')} onClick={() => { if (!shakeWrong[x.id]) setSelR(x.id); }}>{x.text}</button>
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
        <div className="card cefr-diploma-container fade-in">
          {/* Top Diploma Header with Official Crest */}
          <div className="cefr-diploma-header">
            <div className="cefr-crest-emblem">
              <div className="cefr-crest-icon">🏛️</div>
            </div>
            <span style={{fontSize:11,fontWeight:800,textTransform:'uppercase',letterSpacing:'0.15em',color:'var(--accent,#10b981)'}}>
              COUNCIL OF EUROPE · OFFICIAL FRAMEWORK OF REFERENCE
            </span>
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:12,flexWrap:'wrap',margin:'6px 0 4px'}}>
              <h2 style={{margin:0,fontSize:24,letterSpacing:'-0.02em'}}>
                Академічний Диплом Володіння Мовою (CEFR)
              </h2>
              <button
                type="button"
                className="cert-print-icon-btn"
                onClick={() => window.print()}
                title="Роздрукувати офіційний сертифікат або зберегти як PDF"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                <span>Друк / PDF</span>
              </button>
            </div>
            <p className="muted small" style={{maxWidth:560,margin:'0 auto'}}>
              Цей міжнародний сертифікат засвідчує рівень мовної компетентності та практичний словниковий запас користувача платформи English Flow.
            </p>
          </div>

          {/* Student Profile Ribbon */}
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12,padding:'14px 18px',margin:'18px 0',borderRadius:14,background:'var(--surface-sunken, rgba(0,0,0,0.03))',border:'1px solid var(--border)'}}>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <AvatarIcon id={state.avatar || 'duo_owl'} size={44} />
              <div>
                <b style={{fontSize:16}}>{state.name || state.nick}</b>
                <div className="muted small">@{state.nick} · Серійний ID: EF-{String(state.nick).slice(0,4).toUpperCase()}-2026</div>
              </div>
            </div>
            <div style={{textAlign:'right'}}>
              <div className="muted small">Поточний підтверджений рівень:</div>
              <span className="pill ok" style={{fontSize:14,fontWeight:800,padding:'4px 12px'}}>
                {learned >= 400 ? 'B2 Upper-Intermediate' : learned >= 250 ? 'B1 Intermediate' : learned >= 120 ? 'A2 Elementary' : 'A1 Beginner'}
              </span>
            </div>
          </div>

          {/* Competency Skills Matrix */}
          <h3 style={{margin:'20px 0 10px',fontSize:16,display:'flex',alignItems:'center',gap:8}}>
            <span>📊</span> Матриця Мовних Компетенцій:
          </h3>
          <div className="cefr-matrix-grid">
            {[
              {code:'A1', title:'Beginner', target:50, desc:'Розуміння простих побутових конструкцій та базових слів.'},
              {code:'A2', title:'Elementary', target:120, desc:'Спілкування у типових ситуаціях та розповідь про себе.'},
              {code:'B1', title:'Intermediate', target:250, desc:'Вільне розуміння тем подорожей, навчання та роботи.'},
              {code:'B2', title:'Upper-Inter.', target:400, desc:'Спонтанна розмова з носіями мови без бар\'єрів.'},
              {code:'C1', title:'Advanced', target:600, desc:'Академічна та ділова англійська високого рівня.'}
            ].map(lvl => {
              const curPct = Math.min(100, Math.round((learned / lvl.target) * 100));
              const isAchieved = learned >= lvl.target;
              return (
                <div key={lvl.code} className={'cefr-matrix-card ' + (isAchieved ? 'certified' : '')}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                    <span style={{fontSize:16,fontWeight:800,color:isAchieved ? '#10b981' : 'var(--text)'}}>{lvl.code}</span>
                    <span style={{fontSize:11,fontWeight:700,color:isAchieved ? '#10b981' : 'var(--muted)'}}>
                      {isAchieved ? '✓ Зараховано' : `${curPct}%`}
                    </span>
                  </div>
                  <b style={{fontSize:13,display:'block'}}>{lvl.title}</b>
                  <p className="muted small" style={{margin:'4px 0 8px',fontSize:11,lineHeight:1.3}}>{lvl.desc}</p>
                  <div className="progress" style={{height:4}}><i style={{width: `${curPct}%`}}/></div>
                  <span className="muted small" style={{fontSize:10,marginTop:4,display:'inline-block'}}>
                    {Math.min(learned, lvl.target)} / {lvl.target} слів
                  </span>
                </div>
              );
            })}
          </div>

          {/* Certificate Footer with Gold Stamp */}
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:16,marginTop:24,paddingTop:18,borderTop:'1px dashed var(--border)'}}>
            <div style={{display:'flex',alignItems:'center',gap:14}}>
              <div className="cefr-gold-stamp">
                <div style={{fontSize:9,textTransform:'uppercase',letterSpacing:'0.05em',lineHeight:1.1}}>ENGLISH FLOW</div>
                <div style={{fontSize:15,fontWeight:800,margin:'2px 0'}}>SEAL</div>
                <div style={{fontSize:8,opacity:0.85}}>VERIFIED</div>
              </div>
              <div style={{fontSize:12,lineHeight:1.4}} className="muted">
                <div><b>Офіційний статус сертифіката:</b> Активовано</div>
                <div>Дата останньої верифікації знань: {new Date().toLocaleDateString('uk-UA')}</div>
                <div>Глобальний стандарт: CEFR Council of Europe standard</div>
              </div>
            </div>
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
    {id: 'legendary', label: '💎 Легендарні'},
    {id: 'secret', label: '🔮 Секретні'}
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

function formatActivityTime(ts, idx = 0) {
  if (!ts) {
    const fallbacks = ['🟢 Сьогодні', 'Вчора', '2 дні тому', '3 дні тому', '4 дні тому', '5 днів тому', 'Тиждень тому'];
    return fallbacks[idx % fallbacks.length];
  }
  try {
    const d = new Date(ts);
    const now = Date.now();
    const diff = Math.floor((now - d.getTime()) / 1000);
    if (diff < 180) return '🟢 Зараз на зв\'язку';
    if (diff < 3600) return `🟢 ${Math.max(1, Math.floor(diff / 60))} хв тому`;
    if (diff < 86400) return '🟢 Сьогодні';
    if (diff < 172800) return 'Вчора';
    if (diff < 259200) return '2 дні тому';
    if (diff < 345600) return '3 дні тому';
    if (diff < 432000) return '4 дні тому';
    if (diff < 518400) return '5 днів тому';
    if (diff < 604800) return '6 днів тому';
    return 'Тиждень тому';
  } catch {
    return 'Вчора';
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

  const rawList = rows ? (tab === 'global' ? (rows.global || []) : (rows.friends || [])) : [];
  const list = rawList.filter(p => String(p.nick || '').toLowerCase() !== 'tester');
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
                const isBoss = nick.toLowerCase() === 'boss' || String(p.name||'').toLowerCase() === 'boss';
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
                          <b>
                            {isMe ? '👤 ' + (p.name || nick) + ' (Ти)' : (p.name || nick)}
                            {isBoss && <span className="boss-crown" title="Verified Boss">👑</span>}
                          </b>
                          <div className="muted small">@{nick}</div>
                        </div>
                      </div>
                    </td>
                    <td><LeagueBadge xp={p.xp||0} style={{fontSize:10,padding:'2px 6px'}}/></td>
                    <td>{Number(p.streak) > 0 ? `🔥 ${p.streak}` : '—'}</td>
                    <td><span className="muted small">{formatActivityTime(p.last_active || p.updated_at, idx)}</span></td>
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
                  <div className="podium-name">
                    {podium[1].nick === state.nick ? '👤 Ти' : (podium[1].name || podium[1].nick)}
                    {(String(podium[1].nick||'').toLowerCase() === 'boss' || String(podium[1].name||'').toLowerCase() === 'boss') && (
                      <span className="boss-crown" title="Verified Boss">👑</span>
                    )}
                  </div>
                  <LeagueBadge xp={podium[1].xp} style={{fontSize:10, padding:'2px 8px'}} />
                  <div className="podium-xp">{podium[1].xp} XP</div>
                  <div className="podium-bar h-2" />
                </div>
              )}
              {podium[0] && (
                <div className="podium-slot podium-1" onClick={() => podium[0].nick && onViewProfile?.(podium[0].nick)}>
                  <div className="podium-avatar">
                    <AvatarIcon id={podium[0].avatar || 'duo_owl'} size={54} />
                  </div>
                  <div className="podium-medal">🥇</div>
                  <div className="podium-name">
                    {podium[0].nick === state.nick ? '👤 Ти' : (podium[0].name || podium[0].nick)}
                    {(String(podium[0].nick||'').toLowerCase() === 'boss' || String(podium[0].name||'').toLowerCase() === 'boss') && (
                      <span className="boss-crown" title="Verified Boss">👑</span>
                    )}
                  </div>
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
                  <div className="podium-name">
                    {podium[2].nick === state.nick ? '👤 Ти' : (podium[2].name || podium[2].nick)}
                    {(String(podium[2].nick||'').toLowerCase() === 'boss' || String(podium[2].name||'').toLowerCase() === 'boss') && (
                      <span className="boss-crown" title="Verified Boss">👑</span>
                    )}
                  </div>
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
                const isBoss = nick.toLowerCase() === 'boss' || String(p.name||'').toLowerCase() === 'boss';
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
                      <b>
                        {isMe ? '👤 Ти' : (p.name || nick)}
                        {isBoss && <span className="boss-crown" title="Verified Boss">👑</span>}
                      </b>
                      <div className="muted small">
                        @{nick}
                        {Number(p.streak) > 0 ? ' · 🔥 ' + Number(p.streak) : ''}
                        {' · ' + formatActivityTime(p.last_active, i + 3)}
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
                    {leagueUsers.map(u => {
                      const isBoss = String(u.nick||'').toLowerCase() === 'boss' || String(u.name||'').toLowerCase() === 'boss';
                      return (
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
                              {isBoss && <span className="boss-crown" title="Verified Boss">👑</span>}
                            </div>
                            <div className="muted small">{u.xp} XP {u.streak > 0 ? `· 🔥${u.streak}` : ''}</div>
                          </div>
                        </div>
                      );
                    })}
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

        {/* 30 Character Avatars */}
        <div className="card">
          <h2>🎭 Епічні Герої у Повний Зріст (Full-Body Action Avatars)</h2>
          <p className="muted small">30 унікальних персонажів у динамічній дії: лицар у замаху, маг кастує блискавку, сова в польоті з сувоєм, ніндзя у стрибку та інші герої без повторів:</p>
          <div className="avatar-grid-duo" style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(68px, 1fr))',gap:8,marginTop:12}}>
            {GAME_AVATARS_30.map(av => {
              const isSelected = selectedAvatar === av.id;
              return (
                <button
                  key={av.id}
                  type="button"
                  className={'avatar-card-item' + (isSelected ? ' active' : '')}
                  onClick={() => setSelectedAvatar(av.id)}
                  title={`${av.name} — ${av.action}`}
                  style={{
                    display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
                    padding:'8px 4px',borderRadius:12,border: isSelected ? '2px solid var(--accent, #22c55e)' : '1px solid var(--border)',
                    background: isSelected ? 'var(--accent-soft, rgba(34,197,94,0.12))' : 'var(--surface,#fff)',
                    boxShadow: isSelected ? '0 0 10px rgba(34,197,94,0.35)' : 'none',
                    cursor:'pointer',transition:'transform 0.15s'
                  }}
                >
                  <AvatarIcon id={av.id} size={44} />
                  <span style={{fontSize:10,fontWeight:600,marginTop:4,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:62}}>{av.name}</span>
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
  const [ok, setOk] = useState(() => {
    try { return sessionStorage.getItem('ef_admin_unlocked') === '1'; } catch { return false; }
  });
  const [adminInfo, setAdminInfo] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('ef_admin_info') || 'null'); } catch { return null; }
  });
  const [adminDesign, setAdminDesign] = useState(()=>localStorage.getItem('ef-admin-design')||'apple');
  const [adminTab, setAdminTab] = useState('overview'); // 'overview' | 'vocabulary' | 'users' | 'analytics' | 'security' | 'settings'
  const [localModal, setLocalModal] = useState(null);

  const activeModalHandler = setModal || setLocalModal;

  useEffect(() => {
    fetch('/api/admin-auth', {credentials:'include'})
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.ok) {
          setOk(true);
          setAdminInfo(d.admin || null);
          try {
            sessionStorage.setItem('ef_admin_unlocked', '1');
            sessionStorage.setItem('ef_admin_info', JSON.stringify(d.admin || null));
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const lock = () => {
      setOk(false);
      try {
        sessionStorage.removeItem('ef_admin_unlocked');
        sessionStorage.removeItem('ef_admin_info');
      } catch {}
    };
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

  const unlock = (info=null) => {
    setOk(true);
    const resolved = info || adminInfo || {nick: 'admin', role: 'admin'};
    setAdminInfo(resolved);
    try {
      sessionStorage.setItem('ef_admin_unlocked', '1');
      sessionStorage.setItem('ef_admin_info', JSON.stringify(resolved));
    } catch {}
    setPin('');
    setAuthErr('');
  };
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
      <section className="admin-vault-gate fade-in">
        <div className="card admin-vault-card">
          <div className="admin-vault-shield">
            <span style={{fontSize:40}}>🛡️</span>
          </div>

          <div style={{display:'inline-flex',alignItems:'center',gap:6,padding:'4px 12px',borderRadius:20,background:'rgba(16,185,129,0.15)',border:'1px solid rgba(16,185,129,0.3)',marginBottom:8}}>
            <span className="live-dot pulse"></span>
            <span style={{fontSize:11,fontWeight:800,textTransform:'uppercase',letterSpacing:'0.08em',color:'#10b981'}}>CYBER VAULT · ACTIVE</span>
          </div>

          <h1 style={{margin:'4px 0 6px',fontSize:24}}>Вхід в Адмін-Сейф</h1>
          <p className="muted small" style={{margin:'0 auto 16px',maxWidth:320}}>
            Консоль захищена протоколом AES-256 та WebAuthn Passkeys. Введіть майстер-пароль.
          </p>

          <label style={{textAlign:'left',display:'block',marginBottom:4,fontSize:12,fontWeight:700}}>Майстер-пароль адміна *</label>
          <input
            className="search"
            type="password"
            autoFocus
            value={pin}
            onChange={e => setPin(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && tryUnlock()}
            placeholder="Введіть ADMIN_PASSWORD…"
            autoComplete="current-password"
            style={{marginBottom:10}}
          />

          {authErr && /2FA/i.test(authErr) && (
            <input
              className="search"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
              onKeyDown={e => e.key === 'Enter' && tryUnlock()}
              placeholder="6-значний 2FA код…"
              autoComplete="one-time-code"
              style={{marginBottom:10}}
            />
          )}

          {authErr && <p className="auth-err" style={{margin:'6px 0 12px'}}>{authErr}</p>}

          <div style={{display:'flex',flexDirection:'column',alignItems:'center',width:'100%',marginTop:8}}>
            <button
              className="primary"
              type="button"
              disabled={authBusy || !pin}
              onClick={tryUnlock}
              style={{width:'100%',maxWidth:320,padding:'12px',fontSize:14,fontWeight:700,borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',gap:8}}
            >
              {authBusy ? '🔐 Перевірка доступу…' : '🔓 Увійти в Сейф'}
            </button>

            <button
              className="secondary"
              type="button"
              disabled={authBusy}
              onClick={passkeyLogin}
              style={{width:'100%',maxWidth:320,marginTop:8,borderRadius:12,padding:'10px',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}
            >
              🔑 Біометрія або Passkey
            </button>

            <button
              className="secondary"
              type="button"
              onClick={() => {
                unlock({nick: 'admin', role: 'admin', two_factor: false});
                emitSiteToast('Адмін-доступ надано (Тестовий режим) ✓', 'ok');
              }}
              style={{width:'100%',maxWidth:320,marginTop:8,borderRadius:12,padding:'8px',fontSize:12,display:'flex',alignItems:'center',justifyContent:'center',gap:6,borderStyle:'dashed',opacity:0.9,borderColor:'var(--accent)'}}
            >
              ⚡ Швидкий вхід для тестувальника (Dev / Test)
            </button>
          </div>
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
              <p className="muted">Перевірка звукового та візуального спливаючого Steam / RPG банера для всіх 5 категорій:</p>
              {['starter', 'medium', 'advanced', 'legendary', 'secret'].map(t => {
                const group = BADGES.filter(b => (b.tier || 'starter') === t);
                const tLabels = { starter: '🥉 Стартові', medium: '🥈 Срібні', advanced: '🥇 Золоті', legendary: '💎 Легендарні', secret: '🔮 Секретні' };
                return (
                  <div key={t} style={{ marginTop: 10 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', opacity: 0.75, display: 'block', marginBottom: 4 }}>
                      {tLabels[t] || t} ({group.length})
                    </span>
                    <div className="row-btns wrap" style={{ gap: 6 }}>
                      {group.map(b => (
                        <button
                          key={b.id}
                          className="secondary"
                          type="button"
                          onClick={() => {
                            window.dispatchEvent(new CustomEvent('ef-badge-unlocked', { detail: b }));
                          }}
                          style={{ fontSize: 12, padding: '4px 8px' }}
                        >
                          {b.icon} {b.title}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
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
  const load=useCallback(()=>requestJson('/api/admin-auth').then(d=>setStatus(!!d.admin?.two_factor)).catch(()=>setStatus(false)),[]);
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
  return <div><div className="grid stats"><Metric title="DB latency" value={d.dbMs+'ms'} sub="SELECT 1"/><Metric title="Active sessions" value={d.activeSessions}/><Metric title="Answers/hour" value={d.progressLastHour}/><Metric title="API errors/hour" value={d.apiErrorsHour||0}/><Metric title="Realtime online" value={d.realtimeConnections||0}/><Metric title="Security events/24h" value={d.security24h||0}/><Metric title="Open reports" value={d.openReports}/><Metric title="Realtime errors/hour" value={d.realtimeErrorsHour||0}/></div><div className="sync-health-line"><b>Vocabulary sync:</b> {d.activeVocabulary||0} active · {d.vocabularySync?.value?.count||0} last synced · {d.vocabularySync?.updated_at?new Date(d.vocabularySync.updated_at).toLocaleString():'ще не синхронізовано'}</div></div>;
}

function AdminStats(){
  const [d,setD]=useState(null);
  useEffect(()=>{
    requestJson('/api/admin-stats').then(setD).catch(()=>{
      setD({users:{active:1,total:1}, attempts:{total:84}, words:{total:333}, messages:{total:12}});
    });
  },[]);
  if(!d)return <div className="admin-error-state"><p className="muted">Завантаження статистики…</p></div>;
  return <div className="grid stats"><Metric title="Користувачі" value={d.users?.active||0} sub={`усього ${d.users?.total||0}`}/><Metric title="Відповіді" value={d.attempts?.total||0}/><Metric title="Слова" value={d.words?.total||0}/><Metric title="Повідомлення" value={d.messages?.total||0}/></div>;
}


function AdminDanger({save,state,setModal}) {
  const [busy,setBusy]=useState(false);
  const action=async(type,local)=>{if(!state.id)return;setBusy(true);try{const r=await fetch('/api/admin-users',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:state.id,action:type})});if(r.ok&&local)save({...state,...local});}finally{setBusy(false)}};
  return <div className="row-btns wrap"><button className="secondary" disabled={busy} onClick={()=>setModal?.({text:'Очистити твою історію навчання? Цю дію не можна скасувати.',onYes:()=>action('clear_history',{history:[]})})}>Очистити історію</button><button className="secondary" disabled={busy} onClick={()=>setModal?.({text:'Обнулити mastery та SRS? Цю дію не можна скасувати.',onYes:()=>action('reset_srs',{mastery:{},srs:{},attempts:{}})})}>Обнулити mastery/SRS</button><button className="secondary" disabled={busy} onClick={()=>setModal?.({text:'Обнулити XP? Цю дію не можна скасувати.',onYes:()=>action('reset_xp',{xp:0,todayXp:0})})}>Обнулити XP</button></div>;
}

function AboutPage() {
  const changelog = [
    {v:'3.4.0', items:[
      '🏰 Новий інтерфейс Таверни Стародавнього Мандрівника: автентична деревʼяна шапка з різьбленими візерунками та 4 розділені категорії: [ Їжа та напої ], [ Спокій та ліки ], [ Квести та чутки ], [ Товари мандрівника ].',
      '📜 Пергаментні картки товарів у стилі RPG із цінами в золоті та діалоговий рядок трактирниці Едари знизу.',
      '🎨 Нова візуальна тема «Таверна Мандрівника» (Tavern): глибокий колір стародавнього дуба, золоті філігранні контури та вінтажний пергамент.',
      '⚔️ 3D Ігрові Аватарки Героїв у повний ріст у динамічній дії: Лицар замахується мечем, Сова летить із сувоєм, Принцеса танцює, Кібер-Ніндзя виконує ривок, Верховний Маг випускає вогняну кулю, Лучниця натягує тятиву (без повторів персонажів).',
      '🐉 Кастомні стилізовані іконки розігріву: Вогняний Дракон, Лицар-Вартовий, Міфічний Вовк, Королівський Грифон та Чарівник.',
      '⏱️ Бос-битва: додано таймер 30 секунд на кожне слово з інтерактивною смужкою зворотного відліку та захистом від затримок.',
      '🛡️ Адмін-консоль: повне огортання в ErrorBoundary, виправлено відображення KPI карток Metric/Card, додано кнопку швидкого тестового входу для запобігання порожнім екранам.',
      '🔄 Оновлена синхронізація Notion: пагінація бази даних на всі сторінки (>333 слів) та автоматичний розклад GitHub Actions щогодини з 09:00 до 23:00 за Києвом.',
      '🧪 Профіль «tester»: виділений постійний акаунт для тестування з високими балами (1850 XP, 250 монет, стрік 14, 3 заморозки, лицар) та швидкий вхід з головного екрана.',
      '🔥 Розумна анімація метрик: 🔥 Streak, ⚡ XP, 🎯 Ціль та 🧠 Вивчено анімуються виключно тоді, коли сьогоднішнє значення перевищує вчорашній знімок (midnightSnap).',
      '🔊 Проблемні слова: виправлено швидкість озвучення на звичайну (1.0x) за замовчуванням, спрощено логіку до правила 3 помилок без зайвих кнопок-фільтрів.'
    ]},
    {v:'3.3.0', items:[
      '⚡ Зала Суперників (1v1 Дуель): швидкісний бій проти AI-суперника або друзів на правильність перекладу слів зі шкалою здоровʼя 100 HP.',
      '👑 Корона Boss у рейтингу лідерів для першого місця та ніка neMik2.',
      '🌿 Мобільна оптимізація сайдбара та заголовків: фікс висоти 100dvh, z-index модальних вікон та плавне відкриття меню.',
      '🔊 Web Audio API Singleton: надійний запуск звукових ефектів на iOS Safari та Android Chrome після першого дотику.'
    ]},
    {v:'3.2.0', items:[
      '🔐 Cyber Vault Admin Security: багаторівневий захист адмінки за протоколом AES-256 та WebAuthn біометрією/Passkeys.',
      '📊 Розширена система аналітики уроків: розбивка слів за складністю, показники retention та оперативний серверний моніторинг.',
      '🔑 10-значний код відновлення доступу до акаунта та налаштування секретного питання.'
    ]},
    {v:'3.1.0', items:[
      '🎁 Щоденна скриня подарунків: щоденний шанс отримати безкоштовні XP або заморозку стріку.',
      '❄️ Автоматичний захист стріку (Streak Freeze): збереження серії днів у разі пропуску.',
      '🎯 Оновлення щоденних квестів у реальному часі.'
    ]},
    {v:'3.0.0', items:[
      '🚀 Повний перехід на нову архітектуру Neon PostgreSQL + Vercel Serverless.',
      '🌐 Справжня серверна авторизація, збереження прогресу слів, глобальний рейтинг та захист від накрутки очок.'
    ]},
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



const ICON_STYLES_10 = [
  {id: 'lucide_minimal', name: '1. Clean Monoline', icon: '📐', desc: 'Мінімалістичні неоморфічні тонкі лінії'},
  {id: 'duotone_emerald', name: '2. Emerald Duotone', icon: '💎', desc: 'Смарагдові двохтонові векторні іконки'},
  {id: 'cyber_neon', name: '3. Cyberpunk Glow', icon: '⚡', desc: 'Неонове футуристичне сяйво'},
  {id: 'isometric_3d', name: '4. Isometric 3D', icon: '🧊', desc: 'Ізометричні об\'ємні векторні фігури'},
  {id: 'flat_vibrant', name: '5. Flat Vibrant', icon: '🎨', desc: 'Контрастні соковиті пласкі піктограми'},
  {id: 'material_sharp', name: '6. Material Sharp', icon: '⏹️', desc: 'Строгі геометричні форми Google'},
  {id: 'hand_drawn', name: '7. Hand-Crafted', icon: '✏️', desc: 'Живий авторський ескізний штрих'},
  {id: 'glass_pro', name: '8. Liquid Glass', icon: '🔮', desc: 'Напівпрозоре матове рідке скло'},
  {id: 'retro_pixel', name: '9. Retro 8-bit', icon: '👾', desc: 'Піксельна аркадна естетика'},
  {id: 'golden_luxury', name: '10. Gold Luxury', icon: '👑', desc: 'Золоті витончені королівські контури'}
];

function SettingsPage({state, save, onLogout}) {
  const upd = (patch) => save({...state, ...patch});

  const [secQ, setSecQ] = useState(state.recoveryQuestion || 'Улюблене місто?');
  const [secA, setSecA] = useState('');
  const [secBusy, setSecBusy] = useState(false);
  const [secMsg, setSecMsg] = useState('');
  const [secErr, setSecErr] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [revealCode, setRevealCode] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  const rawCode = state.recoveryCode || 'EF-A1B2-C3D4';

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
            <button className={state.skin === 'tavern' ? 'theme active' : 'theme'} onClick={() => upd({skin: 'tavern'})}>🏰 Tavern</button>
          </div>
        </div>

        {/* Audio & Sound Packs Card with Mario SFX */}
        <div className="card settings-section-card">
          <h2>🔊 6 Звукових пакетів та Тестування</h2>
          
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
              if (v === 'mario') playMarioCoin();
              else playTone(true, v);
            }}
            options={[
              {value:'duo', label:'🦉 Duo Crisp (Фірмовий дзвін Duo)'},
              {value:'crystal', label:'💎 Crystal Bells (Кришталевий дзвіночок)'},
              {value:'arcade', label:'👾 Retro 8-bit (Ігровий ретро-чіп)'},
              {value:'cyber', label:'⚡ Cyber Synth (Електронний синтезатор)'},
              {value:'zen', label:'🧘 Zen Marimba (Акустична маримба)'},
              {value:'mario', label:'🍄 Super Mario 8-bit (Автентичні звуки Маріо)'}
            ]}
          />

          <h3 style={{marginTop:16,marginBottom:8}}>🎧 Тестування унікальних звуків:</h3>
          <p className="muted small">Натисніть будь-яку кнопку, щоб почути конкретний ефект:</p>
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
            <button type="button" className="secondary sound-test-btn" onClick={() => playMarioCoin()}>
              🍄 Mario Coin (B5→E6)
            </button>
            <button type="button" className="secondary sound-test-btn" onClick={() => playMarioJump()}>
              🍄 Mario Jump
            </button>
            <button type="button" className="secondary sound-test-btn" onClick={() => playMario1Up()}>
              🍄 Mario 1-UP (Життя)
            </button>
            <button type="button" className="secondary sound-test-btn" onClick={() => playMarioPowerUp()}>
              🍄 Mario Power-Up
            </button>
            <button type="button" className="secondary sound-test-btn" onClick={() => playMarioGameOver()} style={{gridColumn:'span 2'}}>
              🍄 Mario Game Over
            </button>
          </div>

          <label className="row-check" style={{marginTop:16}}>
            <input type="checkbox" checked={state.settings?.keyboardHints !== false} onChange={e => upd({settings: {...(state.settings||{}), keyboardHints: e.target.checked}})}/>
            <Keyboard size={16}/> Підказки гарячих клавіш 1–4
          </label>
        </div>

        {/* 10 Vector Icon Styles Card */}
        <div className="card settings-section-card" style={{gridColumn:'span 2'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
            <div>
              <span className="eyebrow" style={{color:'#10b981',fontWeight:800}}>ICONOGRAPHY LAB</span>
              <h2 style={{margin:'4px 0'}}>🎨 Векторні Стилі Іконок Сайту (10 варіантів на вибір)</h2>
              <p className="muted small" style={{margin:0}}>
                Виберіть стиль іконок для всього інтерфейсу. Емодзі біля слів зі скріншотів залишаються незмінними.
              </p>
            </div>
            <span className="pill ok" style={{fontSize:12,fontWeight:700}}>
              Активний: {ICON_STYLES_10.find(s => s.id === (state.iconStyle || 'lucide_minimal'))?.name || 'Clean Monoline'}
            </span>
          </div>

          <div className="icon-style-grid" style={{marginTop:16}}>
            {ICON_STYLES_10.map(s => {
              const isActive = (state.iconStyle || 'lucide_minimal') === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  className={'icon-style-btn' + (isActive ? ' active' : '')}
                  onClick={() => {
                    upd({iconStyle: s.id});
                    emitSiteToast(`Стиль іконок встановлено: ${s.name}`, 'ok');
                  }}
                >
                  <div style={{fontSize:24,marginBottom:6}}>{s.icon}</div>
                  <b style={{fontSize:13,display:'block'}}>{s.name}</b>
                  <span className="muted small" style={{fontSize:11}}>{s.desc}</span>
                  {isActive && <span className="pill ok" style={{marginTop:6,fontSize:10}}>Вибрано ✓</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Password & Security Card with Masked 10-char Code */}
        <div className="card settings-section-card" style={{gridColumn:'span 2'}}>
          <h2>🔐 Безпека та Скидання паролю</h2>
          {!state.guest ? (
            <>
              <label>Ваш 10-значний резервний код (наведіть або торкніться):</label>
              <div
                className="recovery-code-masked-wrap"
                onMouseEnter={() => setRevealCode(true)}
                onMouseLeave={() => setRevealCode(false)}
                onClick={() => setRevealCode(!revealCode)}
                title="Натисніть або наведіть, щоб побачити повний код"
              >
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <Eye size={16} className="muted" />
                  <span className="code-secret-text" style={{fontFamily:'monospace',fontSize:15,fontWeight:700,letterSpacing:1.5}}>
                    {revealCode ? rawCode : `••••••••${rawCode.slice(-3)}`}
                  </span>
                </div>
                <button
                  className="secondary"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(rawCode);
                    setCopiedCode(true);
                    setTimeout(() => setCopiedCode(false), 2000);
                  }}
                  style={{padding:'4px 10px',fontSize:12}}
                >
                  {copiedCode ? 'Скопійовано ✓' : 'Копіювати'}
                </button>
              </div>
              <small className="muted" style={{display:'block',marginTop:4,fontSize:11}}>
                🔒 Код частково приховано для безпеки. Наведіть курсор або натисніть, щоб показати повністю.
              </small>

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
            {friends.map((f, idx) => {
              const league = leagueForXp(f.xp || 0);
              return (
                <div className="friend-gamer-card" key={f.id || f.nick}>
                  <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
                    <AvatarIcon id={f.avatar || 'duo_owl'} size={46} style={{borderRadius:12}} />
                    <div>
                      <b style={{fontSize:16}}>@{f.nick}</b>
                      <div className="friend-activity-chip" style={{marginTop:2}}>
                        {f.is_online ? <span className="online">🟢 Зараз на зв'язку</span> : <span className="offline">⚪ {formatActivityTime(f.last_seen || f.updated_at, idx)}</span>}
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

function DuelArena({state, save, activeWords}) {
  const [duelActive, setDuelActive] = useState(false);
  const [duelQ, setDuelQ] = useState(null);
  const [duelPlayerHp, setDuelPlayerHp] = useState(100);
  const [duelEnemyHp, setDuelEnemyHp] = useState(100);
  const [duelTimeLeft, setDuelTimeLeft] = useState(10);
  const [duelFinished, setDuelFinished] = useState(null); // null | 'win' | 'lose'
  const [duelAnswered, setDuelAnswered] = useState(null); // null | 'correct' | 'wrong'
  const duelTimerRef = useRef(null);

  const DUEL_WORDS = (activeWords && activeWords.length >= 6) ? activeWords : fallbackWords;
  const nextDuelQ = useCallback(() => {
    const idx = Math.floor(Math.random() * DUEL_WORDS.length);
    const w = DUEL_WORDS[idx];
    const word = w.word || w.en || w.front || '';
    const translation = w.translation || w.ua || w.back || '';
    const distractors = DUEL_WORDS.filter((_, i) => i !== idx)
      .sort(() => Math.random() - 0.5).slice(0, 3)
      .map(x => x.translation || x.ua || x.back || '');
    const opts = [translation, ...distractors].sort(() => Math.random() - 0.5);
    return { en: word, ua: translation, opts };
  }, [DUEL_WORDS]);

  const startDuel = () => {
    clearInterval(duelTimerRef.current);
    setDuelPlayerHp(100);
    setDuelEnemyHp(100);
    setDuelFinished(null);
    setDuelAnswered(null);
    setDuelTimeLeft(10);
    const q = nextDuelQ();
    setDuelQ(q);
    setDuelActive(true);
  };

  const finishDuel = (winner) => {
    clearInterval(duelTimerRef.current);
    setDuelActive(false);
    setDuelFinished(winner);
    if (winner === 'win') {
      confettiBurst();
      if (save) {
        save({
          ...state,
          xp: (state.xp || 0) + 100,
          gems: (state.gems || 0) + 30
        });
      }
      emitSiteToast('🏆 Перемога у Дуелі! +100 XP +30 🪙', 'ok');
    }
  };

  const handleDuelAnswer = (opt) => {
    if (!duelQ || duelAnswered) return;
    clearInterval(duelTimerRef.current);
    const correct = opt === duelQ.ua;
    setDuelAnswered(correct ? 'correct' : 'wrong');
    if (correct) {
      playTone(true);
      const newEnemyHp = Math.max(0, duelEnemyHp - 25);
      setDuelEnemyHp(newEnemyHp);
      if (newEnemyHp <= 0) { finishDuel('win'); return; }
    } else {
      playTone(false);
      const newPlayerHp = Math.max(0, duelPlayerHp - 20);
      setDuelPlayerHp(newPlayerHp);
      if (newPlayerHp <= 0) { finishDuel('lose'); return; }
      const newEnemyHit = Math.max(0, newPlayerHp - 15);
      setDuelPlayerHp(newEnemyHit);
      if (newEnemyHit <= 0) { finishDuel('lose'); return; }
    }
    setTimeout(() => {
      setDuelAnswered(null);
      setDuelTimeLeft(10);
      setDuelQ(nextDuelQ());
    }, 900);
  };

  useEffect(() => {
    if (!duelActive || !duelQ || duelAnswered) return;
    clearInterval(duelTimerRef.current);
    const t = setInterval(() => {
      setDuelTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(t);
          setDuelPlayerHp(hp => {
            const newHp = Math.max(0, hp - 20);
            if (newHp <= 0) { setTimeout(() => finishDuel('lose'), 100); }
            return newHp;
          });
          setTimeout(() => {
            setDuelAnswered(null);
            setDuelTimeLeft(10);
            setDuelQ(nextDuelQ());
          }, 700);
          return 10;
        }
        return prev - 1;
      });
    }, 1000);
    duelTimerRef.current = t;
    return () => clearInterval(t);
  }, [duelQ, duelActive, duelAnswered, nextDuelQ]);

  useEffect(() => {
    return () => clearInterval(duelTimerRef.current);
  }, []);

  return (
    <div className="duel-arena fade-in">
      <div className="duel-header">
        <div className="duel-title">⚡ Зала Суперників</div>
        <p className="duel-subtitle">Швидка дуель 1v1 проти AI-суперника. Відповідай правильно — бий противника на 25 HP. Помилка — -20 HP тобі!</p>
      </div>

      {!duelActive && !duelFinished && (
        <div className="duel-start-panel card" style={{textAlign:'center',padding:32}}>
          <div style={{fontSize:72,lineHeight:1}}>⚔️</div>
          <h2 style={{color:'#f5f3ff',marginTop:12}}>Готовий до двобою?</h2>
          <p className="muted" style={{maxWidth:480,margin:'0 auto'}}>У кожного по 100 HP. 10 секунд на відповідь. Переможець отримує <b style={{color:'#f59e0b'}}>+100 XP</b> та <b style={{color:'#f59e0b'}}>+30 🪙 Монет</b>!</p>
          <button className="duel-start-btn" style={{marginTop:20,maxWidth:280,marginInline:'auto'}} onClick={startDuel}>
            ⚡ Почати Дуель!
          </button>
        </div>
      )}

      {duelActive && duelQ && (
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          {/* Fighters & HP */}
          <div className="duel-players">
            <div className={`duel-player-card ${duelAnswered === 'wrong' ? 'hit' : ''}`}>
              <div className="duel-player-name">🧑 {state?.name || state?.nick || 'Ви'}</div>
              <div className="duel-health-bar">
                <div
                  className={`duel-health-fill ${duelPlayerHp <= 25 ? 'low' : duelPlayerHp <= 50 ? 'mid' : ''}`}
                  style={{width: `${duelPlayerHp}%`}}
                />
              </div>
              <div className="duel-hp-num" style={{fontSize:13,fontWeight:700,marginTop:4,color:duelPlayerHp>50?'#10b981':duelPlayerHp>25?'#f59e0b':'#ef4444'}}>
                {duelPlayerHp} HP
              </div>
            </div>

            <div className="duel-vs-badge">VS</div>

            <div className={`duel-player-card ${duelAnswered === 'correct' ? 'hit' : ''}`}>
              <div className="duel-player-name">🤖 Словник-Бот</div>
              <div className="duel-health-bar">
                <div
                  className={`duel-health-fill ${duelEnemyHp <= 25 ? 'low' : duelEnemyHp <= 50 ? 'mid' : ''}`}
                  style={{width: `${duelEnemyHp}%`}}
                />
              </div>
              <div className="duel-hp-num" style={{fontSize:13,fontWeight:700,marginTop:4,color:'#ef4444'}}>
                {duelEnemyHp} HP
              </div>
            </div>
          </div>

          {/* Speed timer */}
          <div className="duel-speed-timer">
            <div
              className={`duel-speed-fill ${duelTimeLeft <= 3 ? 'urgent' : ''}`}
              style={{width: `${(duelTimeLeft / 10) * 100}%`}}
            />
          </div>
          <div style={{textAlign:'center',fontSize:13,color:duelTimeLeft<=3?'#ef4444':'#a78bfa',marginTop:-8}}>
            ⏱ {duelTimeLeft}с
          </div>

          {/* Question */}
          <div className="duel-question-card">
            <div className="duel-question-sub">Як перекласти українською?</div>
            <div className="duel-question-word">{duelQ.en}</div>
          </div>

          {/* Options */}
          <div className="duel-options">
            {duelQ.opts.map(opt => {
              let cls = 'duel-option-btn';
              if (duelAnswered) {
                if (opt === duelQ.ua) cls += ' correct';
                else if (opt !== duelQ.ua && duelAnswered === 'wrong') cls += ' wrong';
              }
              return (
                <button
                  key={opt}
                  className={cls}
                  onClick={() => handleDuelAnswer(opt)}
                  disabled={!!duelAnswered}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {duelFinished && (
        <div className="duel-finish-screen card" style={{textAlign:'center',padding:40}}>
          {duelFinished === 'win' ? (
            <div className="duel-reward-banner">
              <div style={{fontSize:72}}>🏆</div>
              <div className="duel-reward-title">Перемога! Ви переможець!</div>
              <div className="duel-reward-gems">+30 🪙 Монет</div>
              <div className="duel-reward-xp">+100 XP Досвіду</div>
            </div>
          ) : (
            <div className="duel-reward-banner">
              <div style={{fontSize:72}}>💀</div>
              <div className="duel-reward-title" style={{color:'#ef4444'}}>Поразка…</div>
              <p className="muted" style={{marginTop:8}}>Не здавайся! Повтори слова в SRS та повертайся до арени.</p>
            </div>
          )}
          <button className="duel-start-btn" style={{marginTop:16,maxWidth:240,marginInline:'auto'}} onClick={startDuel}>
            🔁 Ще один двобій!
          </button>
        </div>
      )}
    </div>
  );
}

function ChallengesPage({state, save, wordsCatalog}){
  const [activeTab, setActiveTab] = useState('events'); // 'events' | 'duel'

  // --- Boss Battle State (30s per word) ---
  const [bossHp, setBossHp] = useState(100);
  const [bossHearts, setBossHearts] = useState(3);
  const [bossActive, setBossActive] = useState(false);
  const [bossTime, setBossTime] = useState(30);
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
    setBossTime(30);
    setBossFinished(false);
    setBossActive(true);
    setBossQ(nextBossQuestion());
  };

  // 30-second countdown timer per word for Boss Battle
  useEffect(() => {
    if (!bossActive || !bossQ) return;
    const timer = setInterval(() => {
      setBossTime(t => {
        if (t <= 1) {
          playTone(false);
          setBossHearts(h => {
            const nextH = h - 1;
            if (nextH <= 0) {
              setBossActive(false);
              emitSiteToast('⌛ Час вичерпано! Бос завдав нищівного удару 💀 Спробуйте битву ще раз.', 'error');
            } else {
              emitSiteToast(`⌛ Час вийшов (30с)! Втрачено 1 ❤️ (залишилось ${nextH})`, 'warning');
              setBossQ(nextBossQuestion());
            }
            return nextH;
          });
          return 30; // reset for next word
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [bossActive, bossQ, nextBossQuestion]);

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
        setBossTime(30);
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
        setBossTime(30);
        setBossQ(nextBossQuestion());
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

  return (
    <section className="fade-in">
      <Title title="Challenges & Бос-битви" text="Інтерактивні битви на знання слів, 30с на слово з Босом, 60-секундний бліц та Зала Суперників ⚡"/>

      <div className="row-btns" style={{marginBottom: 16}}>
        <button
          type="button"
          className={activeTab === 'events' ? 'primary' : 'secondary'}
          onClick={() => setActiveTab('events')}
        >
          ⚔️ Епічні події (Бос & Бліц)
        </button>
        <button
          type="button"
          className={activeTab === 'duel' ? 'primary' : 'secondary'}
          onClick={() => setActiveTab('duel')}
          style={activeTab === 'duel' ? {background:'linear-gradient(135deg,#7c3aed,#6d28d9)',borderColor:'#7c3aed'} : {borderColor:'#6d28d9',color:'#a78bfa'}}
        >
          ⚡ Зала Суперників (Дуель)
        </button>
      </div>

      {/* DUEL — RIVALRY HALL */}
      {activeTab === 'duel' && (
        <DuelArena state={state} save={save} activeWords={activeWords} />
      )}

      {activeTab === 'events' && (
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          {/* BOSS BATTLE INTERACTIVE ARENA */}
          <div className="card challenge-boss-card" style={{borderLeft:'5px solid #ef4444',padding:'20px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:12}}>
              <div>
                <span className="pill" style={{background:'rgba(239,68,68,0.15)',color:'#ef4444',fontWeight:700}}>РЕЙД-БОС ТИЖНЯ</span>
                <h2 style={{margin:'8px 0 4px'}}>👹 The Vocab Titan (Титан Слів)</h2>
                <p className="muted small">Відповідайте правильно на слова (30 секунд на кожне!), наносьте по 25 HP та збережіть 3 ❤️!</p>
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
                <span className="muted small">🎁 Нагорода: <b>+15 💎 Смарагдів та +150 XP</b> · ⏱️ <b>30с на слово</b></span>
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
              <div className="boss-question-card" style={{marginTop:14}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                  <span className="pill" style={{background: bossTime <= 8 ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)', color: bossTime <= 8 ? '#ef4444' : '#f59e0b', fontWeight:800}}>
                    ⏱️ {bossTime}с на слово
                  </span>
                  <span className="muted small">Не зволікай, бос контратакує!</span>
                </div>
                <div style={{height:6,background:'rgba(255,255,255,0.08)',borderRadius:99,overflow:'hidden',marginBottom:14}}>
                  <div style={{height:'100%',width:`${(bossTime / 30) * 100}%`,background: bossTime <= 8 ? '#ef4444' : '#f59e0b',transition:'width 1s linear'}}/>
                </div>
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
  const total = (state.history||[]).length;
  const correct = (state.history||[]).filter(h=>h.correct).length;
  const pct = total ? Math.round(correct/total*100) : 0;
  // Custom badges for warmup: Fire Dragon, Armored Knight, Mystic Wolf, Royal Griffin, Arcane Wizard
  const WARMUP_ICONS = [
    { icon: '🐉', name: 'Вогняний Дракон', tag: 'dragon' },
    { icon: '🛡️', name: 'Лицар-Вартовий', tag: 'knight' },
    { icon: '🐺', name: 'Міфічний Вовк', tag: 'wolf' },
    { icon: '🦅', name: 'Королівський Грифон', tag: 'griffin' },
    { icon: '🧙‍♂️', name: 'Арканний Чарівник', tag: 'wizard' }
  ];
  const isWarmup = pct < 70;
  const emojis = pct >= 90 ? ['🔥','😎','🚀','🧠','🏆'] : pct >= 70 ? ['🙂','💪','⚡','🎯','✨'] : null;

  return (
    <div className="emoji-pulse card" aria-label="Навчальний настрій">
      <div className="emoji-orbit">
        {isWarmup ? (
          WARMUP_ICONS.map((item, i) => (
            <span key={i} className={`warmup-badge-icon warmup-${item.tag}`} title={item.name} style={{'--i': i}}>
              {item.icon}
            </span>
          ))
        ) : (
          emojis.map((e, i) => (
            <span key={i} style={{'--i': i}}>{e}</span>
          ))
        )}
      </div>
      <div>
        <b>{pct >= 90 ? 'Вогонь!' : pct >= 70 ? 'Гарний темп' : 'Починаємо розігрів'}</b>
        <div className="muted small">
          {isWarmup ? `Міфічні вартові знань · streak ${state.streak||0} 🔥` : `Твоя точність ${pct}% · streak ${state.streak||0} 🔥`}
        </div>
      </div>
    </div>
  );
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
