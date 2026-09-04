/** Local DB (IndexedDB) for profiles, history cache, words */
const DB_NAME = 'english-flow-db';
const DB_VER = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('profiles')) db.createObjectStore('profiles', { keyPath: 'nick' });
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'key' });
      if (!db.objectStoreNames.contains('words')) db.createObjectStore('words', { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function dbPutProfile(profile) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('profiles', 'readwrite');
      tx.objectStore('profiles').put(profile);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch { return false; }
}

export async function dbGetProfile(nick) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('profiles', 'readonly');
      const r = tx.objectStore('profiles').get(nick);
      r.onsuccess = () => resolve(r.result || null);
      r.onerror = () => reject(r.error);
    });
  } catch { return null; }
}

export async function dbListProfiles() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('profiles', 'readonly');
      const r = tx.objectStore('profiles').getAll();
      r.onsuccess = () => resolve(r.result || []);
      r.onerror = () => reject(r.error);
    });
  } catch { return []; }
}

export async function dbSaveWords(words, meta) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['words', 'meta'], 'readwrite');
      const ws = tx.objectStore('words');
      ws.clear();
      (words || []).forEach(w => ws.put(w));
      tx.objectStore('meta').put({ key: 'words-meta', ...meta, at: new Date().toISOString() });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch { return false; }
}

export async function dbLoadWords() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['words', 'meta'], 'readonly');
      const r = tx.objectStore('words').getAll();
      const m = tx.objectStore('meta').get('words-meta');
      let words = [], meta = null;
      r.onsuccess = () => { words = r.result || []; };
      m.onsuccess = () => { meta = m.result || null; };
      tx.oncomplete = () => resolve({ words, meta });
      tx.onerror = () => reject(tx.error);
    });
  } catch { return { words: [], meta: null }; }
}
