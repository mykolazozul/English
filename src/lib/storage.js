const PROFILES_KEY = 'ef-profiles-v1';
const ACTIVE_KEY = 'ef-active-nick';

export function listProfiles() {
  try { return JSON.parse(localStorage.getItem(PROFILES_KEY) || '{}'); } catch { return {}; }
}

export function saveProfile(nick, data) {
  const all = listProfiles();
  all[nick] = { ...data, nick, updatedAt: new Date().toISOString() };
  localStorage.setItem(PROFILES_KEY, JSON.stringify(all));
  localStorage.setItem(ACTIVE_KEY, nick);
}

export function loadProfile(nick) {
  const all = listProfiles();
  return all[nick] || null;
}

export function getActiveNick() {
  return localStorage.getItem(ACTIVE_KEY) || '';
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
