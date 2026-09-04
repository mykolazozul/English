/** Web Crypto helpers — SHA-256 hashes + AES-GCM for display names at rest */

const te = new TextEncoder();
const td = new TextDecoder();

export async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', te.encode(String(text)));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Password hash: SHA-256(salt + password) — not reversible */
export async function hashPassword(password, salt = 'ef-v1') {
  return sha256(`${salt}::${password}`);
}

export async function verifyPassword(password, hash, salt = 'ef-v1') {
  if (!hash) return false;
  const h = await hashPassword(password, salt);
  return h === hash;
}

function b64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
function fromB64(s) {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function deviceKey() {
  let seed = localStorage.getItem('ef-device-key');
  if (!seed) {
    seed = b64(crypto.getRandomValues(new Uint8Array(32)));
    localStorage.setItem('ef-device-key', seed);
  }
  const raw = fromB64(seed);
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

/** Encrypt short personal strings (name) at rest */
export async function encryptText(plain) {
  if (!plain) return '';
  try {
    const key = await deviceKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, te.encode(plain));
    return `enc:${b64(iv)}:${b64(ct)}`;
  } catch {
    return plain;
  }
}

export async function decryptText(payload) {
  if (!payload) return '';
  if (!String(payload).startsWith('enc:')) return payload;
  try {
    const [, ivB, ctB] = payload.split(':');
    const key = await deviceKey();
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(ivB) }, key, fromB64(ctB));
    return td.decode(pt);
  } catch {
    return '';
  }
}

export async function nickHash(nick) {
  return sha256(String(nick).trim().toLowerCase());
}
