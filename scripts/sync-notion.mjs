import fs from 'node:fs/promises';
import path from 'node:path';

// Auto-load .env.local or .env if present
async function tryLoadEnv(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq > 0) {
        const key = trimmed.slice(0, eq).trim();
        let val = trimmed.slice(eq + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = val;
      }
    }
  } catch {}
}
await tryLoadEnv(path.resolve('.env.local'));
await tryLoadEnv(path.resolve('.env'));

const TOKEN = process.env.NOTION_TOKEN;
const DATA_SOURCE_ID = process.env.NOTION_DATA_SOURCE_ID || 'f38dba17-bbd6-4f04-9875-030212db4d0a';
const API_VERSION = '2025-09-03';

if (!TOKEN) {
  console.warn('⚠️ Missing NOTION_TOKEN in environment or .env.local. Keeping existing static bundle.');
  process.exit(0);
}

function findProp(props, names = [], expectedType = null) {
  if (!props || typeof props !== 'object') return null;
  for (const name of names) {
    if (props[name]) return props[name];
    const key = Object.keys(props).find(k => k.trim().toLowerCase() === name.trim().toLowerCase());
    if (key && props[key]) return props[key];
  }
  if (expectedType) {
    const found = Object.values(props).find(p => p?.type === expectedType);
    if (found) return found;
  }
  return null;
}

function propTitleSmart(p) {
  const prop = findProp(p, ['Word', 'word', 'Name', 'name', 'Title', 'title', 'Слово', 'слово', 'Термін', 'English', 'Term', 'Vocabulary', 'ENG', 'Words', 'English Word', 'Word / Phrase'], 'title') 
    || Object.values(p || {}).find(x => x?.type === 'title');
  if (!prop) return '';
  const text = (prop.title || prop.rich_text || []).map(x => x.plain_text || x.text?.content || '').join('').trim();
  if (text) return text;
  // Fallback: search any rich_text matching word names
  const alt = findProp(p, ['Word', 'word', 'Name', 'name', 'Слово', 'English', 'Term', 'ENG']);
  return alt ? (alt.rich_text || alt.title || []).map(x => x.plain_text || x.text?.content || '').join('').trim() : '';
}

function propTextSmart(p, names) {
  const prop = findProp(p, names);
  if (!prop) return '';
  if (prop.rich_text) return prop.rich_text.map(x => x.plain_text || x.text?.content || '').join('').trim();
  if (prop.title) return prop.title.map(x => x.plain_text || x.text?.content || '').join('').trim();
  if (typeof prop.select?.name === 'string') return prop.select.name.trim();
  return '';
}

function propSelectSmart(p, names) {
  const prop = findProp(p, names, 'select');
  if (!prop) return '';
  return prop.select?.name || prop.name || '';
}

async function notionQuery(body) {
  // First try data_sources endpoint
  try {
    const res1 = await fetch(`https://api.notion.com/v1/data_sources/${DATA_SOURCE_ID}/query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Notion-Version': API_VERSION, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (res1.ok) return await res1.json();
    if (res1.status !== 404 && res1.status !== 400) {
      const err = await res1.text();
      throw new Error(`Notion API HTTP ${res1.status}: ${err.slice(0, 300)}`);
    }
  } catch (e) {
    if (!e.message.includes('404') && !e.message.includes('400')) throw e;
  }

  // Fallback to standard databases endpoint
  const res2 = await fetch(`https://api.notion.com/v1/databases/${DATA_SOURCE_ID}/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res2.ok) {
    const err = await res2.text();
    throw new Error(`Notion API query error (${res2.status}): ${err.slice(0, 300)}`);
  }
  return await res2.json();
}

const all = [];
let cursor;
do {
  const result = await notionQuery({ page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) });
  for (const row of result.results ?? []) {
    const p = row.properties ?? {};
    const word = propTitleSmart(p);
    if (!word) continue;
    const translation = propTextSmart(p, ['Translation', 'translation', 'Переклад', 'переклад', 'Значення', 'Meaning']) || '—';
    const pronunciation = propTextSmart(p, ['Pronunciation', 'pronunciation', 'Транскрипція', 'Вимова']);
    const category = propSelectSmart(p, ['Category', 'category', 'Topic', 'topic', 'Тема', 'тема', 'Категорія']) || 'Other';
    const level = propSelectSmart(p, ['Level', 'level', 'Рівень', 'рівень']);
    const explanation = propTextSmart(p, ['Explanation', 'explanation', 'Пояснення', 'пояснення', 'Опис']);
    const example = propTextSmart(p, ['Example', 'example', 'Examples', 'examples', 'Приклад', 'приклади']);
    const date = p.Added?.date?.start || null;

    all.push({
      id: row.id,
      notionUrl: row.url || '',
      word,
      translation,
      explanation,
      pronunciation,
      examples: example,
      example,
      category,
      level,
      added: date
    });
  }
  cursor = result.has_more ? result.next_cursor : null;
} while (cursor);

all.sort((a, b) => a.word.localeCompare(b.word, 'en', { sensitivity: 'base' }));

const meta = {
  dataSourceId: DATA_SOURCE_ID,
  count: all.length,
  syncedAt: new Date().toISOString()
};

const payload = `// AUTO-GENERATED by scripts/sync-notion.mjs — do not edit manually.\nexport const notionWords = ${JSON.stringify(all, null, 2)};\nexport const notionSyncMeta = ${JSON.stringify(meta, null, 2)};\n`;

await fs.mkdir(path.resolve('public'), { recursive: true });
await fs.writeFile(path.resolve('src/notionWords.generated.js'), payload, 'utf8');
const db = { meta, words: all };
await fs.writeFile(path.resolve('public/words-db.json'), JSON.stringify(db), 'utf8');
await fs.writeFile(path.resolve('public/notion-sync-meta.json'), JSON.stringify(meta, null, 2), 'utf8');
await fs.writeFile(path.resolve('public/words.json'), JSON.stringify({ words: all, meta }, null, 2), 'utf8');
console.log(`✓ Synced ${all.length} words from Notion to local bundles.`);

// If DATABASE_URL is present, also upsert directly to Neon database
const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (dbUrl && all.length > 0) {
  try {
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(dbUrl);
    const nids = all.map(x => x.id);
    const nwords = all.map(x => x.word);
    const ntranslations = all.map(x => x.translation);
    const npron = all.map(x => x.pronunciation || '');
    const ncats = all.map(x => x.category);
    const nlevels = all.map(x => x.level || '');
    const nexpl = all.map(x => x.explanation || '');
    const nexamples = all.map(x => x.example || '');
    const nurls = all.map(x => x.notionUrl || '');
    const ndates = all.map(x => x.added || null);

    await sql`INSERT INTO vocabulary(notion_id,word,translation,pronunciation,category,level,explanation,example,notion_url,added,updated_at,archived)
      SELECT *, now(), false FROM UNNEST(${nids}::text[],${nwords}::text[],${ntranslations}::text[],${npron}::text[],${ncats}::text[],${nlevels}::text[],${nexpl}::text[],${nexamples}::text[],${nurls}::text[],${ndates}::date[])
      ON CONFLICT(notion_id) DO UPDATE SET word=excluded.word,translation=excluded.translation,pronunciation=excluded.pronunciation,category=excluded.category,level=excluded.level,explanation=excluded.explanation,example=excluded.example,notion_url=excluded.notion_url,added=excluded.added,updated_at=now(),archived=false`;

    await sql`UPDATE vocabulary SET archived=true,updated_at=now() WHERE archived=false AND NOT (notion_id = ANY(${nids}::text[]))`;
    await sql`INSERT INTO sync_meta(key,value,updated_at) VALUES('vocabulary',${JSON.stringify(meta)}::jsonb,now()) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=now()`;
    console.log(`✓ Neon PostgreSQL vocabulary table updated (${all.length} active words).`);
  } catch (err) {
    console.warn(`⚠️ Could not update Neon database directly: ${err.message}`);
  }
}

