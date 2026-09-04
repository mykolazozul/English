import { nickHash, encryptText, hashPassword } from './crypto.js';

const PROFILES_KEY = 'ef-profiles-v1';
const ACTIVE_KEY = 'ef-active-nick';
const NICK_INDEX = 'ef-nick-index-v1';
const FRIENDS_KEY = 'ef-friends-v1';
const CHATS_KEY = 'ef-chats-v1';
const GLOBAL_AVG = 'ef-daily-avg-v1';
const GUEST_KEY = 'ef-guest-session';

export function listProfiles() {
  try { return JSON.parse(localStorage.getItem(PROFILES_KEY) || '{}'); } catch { return {}; }
}

function nickIndex() {
  try { return JSON.parse(localStorage.getItem(NICK_INDEX) || '{}'); } catch { return {}; }
}

export async function isNickTaken(nick) {
  const n = String(nick || '').trim();
  if (!n) return true;
  const all = listProfiles();
  if (all[n] || all[n.toLowerCase()]) return true;
  const h = await nickHash(n);
  const idx = nickIndex();
  if (idx[h] && idx[h].toLowerCase() !== n.toLowerCase()) return true;
  if (cloudConfigured()) {
    try {
      const remote = await cloudPull(n);
      if (remote) return true;
    } catch {}
  }
  return false;
}

export async function registerNick(nick, data) {
  const n = String(nick).trim();
  if (await isNickTaken(n)) throw new Error('Нік уже зайнятий');
  const h = await nickHash(n);
  const idx = nickIndex();
  idx[h] = n;
  localStorage.setItem(NICK_INDEX, JSON.stringify(idx));
  const nameEnc = data.name ? await encryptText(data.name) : '';
  const profile = {
    ...data,
    nick: n,
    nickHash: h,
    nameEnc,
    name: data.name || n,
    updatedAt: new Date().toISOString()
  };
  const all = listProfiles();
  all[n] = profile;
  localStorage.setItem(PROFILES_KEY, JSON.stringify(all));
  localStorage.setItem(ACTIVE_KEY, n);
  return profile;
}

export function saveProfile(nick, data) {
  const all = listProfiles();
  all[nick] = { ...data, nick, updatedAt: new Date().toISOString() };
  localStorage.setItem(PROFILES_KEY, JSON.stringify(all));
  if (nick) localStorage.setItem(ACTIVE_KEY, nick);
}

export function loadProfile(nick) {
  const all = listProfiles();
  return all[nick] || null;
}

export function getActiveNick() {
  return localStorage.getItem(ACTIVE_KEY) || '';
}

export function setGuestSession(on) {
  if (on) localStorage.setItem(GUEST_KEY, '1');
  else localStorage.removeItem(GUEST_KEY);
}

export function isGuestSession() {
  return localStorage.getItem(GUEST_KEY) === '1';
}

export function getFriends(nick) {
  try {
    const all = JSON.parse(localStorage.getItem(FRIENDS_KEY) || '{}');
    return all[nick] || [];
  } catch { return []; }
}

export function addFriend(myNick, friendNick) {
  const f = String(friendNick).trim();
  if (!f || f === myNick) return { ok: false, error: 'Некоректний нік' };
  const all = JSON.parse(localStorage.getItem(FRIENDS_KEY) || '{}');
  const list = new Set(all[myNick] || []);
  if (list.has(f)) return { ok: false, error: 'Уже в друзях' };
  list.add(f);
  all[myNick] = [...list];
  localStorage.setItem(FRIENDS_KEY, JSON.stringify(all));
  return { ok: true };
}

export function removeFriend(myNick, friendNick) {
  const all = JSON.parse(localStorage.getItem(FRIENDS_KEY) || '{}');
  all[myNick] = (all[myNick] || []).filter(x => x !== friendNick);
  localStorage.setItem(FRIENDS_KEY, JSON.stringify(all));
}

function pairKey(a, b) {
  return [a, b].map(x => x.toLowerCase()).sort().join('::');
}

export function getChat(a, b) {
  try {
    const all = JSON.parse(localStorage.getItem(CHATS_KEY) || '{}');
    return all[pairKey(a, b)] || [];
  } catch { return []; }
}

export function sendChat(from, to, text) {
  const t = String(text || '').trim().slice(0, 500);
  if (!t) return null;
  const all = JSON.parse(localStorage.getItem(CHATS_KEY) || '{}');
  const k = pairKey(from, to);
  const msg = { id: Date.now().toString(36), from, text: t, at: new Date().toISOString() };
  all[k] = [...(all[k] || []), msg].slice(-200);
  localStorage.setItem(CHATS_KEY, JSON.stringify(all));
  return msg;
}

export function friendsLeaderboard(myNick) {
  const friends = getFriends(myNick);
  const all = listProfiles();
  return [myNick, ...friends]
    .map(n => {
      const p = all[n];
      return p ? { nick: n, name: p.name || n, xp: p.xp || 0, streak: p.streak || 0 } : { nick: n, name: n, xp: 0, streak: 0 };
    })
    .sort((a, b) => b.xp - a.xp);
}

export function ensureDailyAverage() {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const prev = JSON.parse(localStorage.getItem(GLOBAL_AVG) || '{}');
    if (prev.date === today && typeof prev.avgXp === 'number') return prev;
  } catch {}
  const all = Object.values(listProfiles());
  const avgXp = all.length ? Math.round(all.reduce((s, p) => s + (p.xp || 0), 0) / all.length) : 0;
  const avgStreak = all.length ? Math.round(all.reduce((s, p) => s + (p.streak || 0), 0) / all.length * 10) / 10 : 0;
  const data = { date: today, avgXp, avgStreak, players: all.length, at: new Date().toISOString() };
  localStorage.setItem(GLOBAL_AVG, JSON.stringify(data));
  return data;
}

export function getDailyAverage() {
  return ensureDailyAverage();
}

export async function cloudPull(nick) {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key || !nick) return null;
  try {
    const res = await fetch(`${url}/rest/v1/players?nick=eq.${encodeURIComponent(nick)}&select=data`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` }
    });
    if (!res.ok) return null;
    const rows = await res.json();
    return rows[0]?.data || null;
  } catch { return null; }
}

export async function cloudPush(nick, data) {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key || !nick) return false;
  try {
    const res = await fetch(`${url}/rest/v1/players`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates'
      },
      body: JSON.stringify({ nick, data, updated_at: new Date().toISOString() })
    });
    return res.ok;
  } catch { return false; }
}

export function cloudConfigured() {
  return !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
}

export { hashPassword };
