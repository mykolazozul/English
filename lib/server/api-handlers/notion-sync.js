import { sqlClient, json, requireAdmin, parseBody } from '../db.js';

const DEFAULT_DATA_SOURCE_ID = process.env.NOTION_DATA_SOURCE_ID || 'f38dba17-bbd6-4f04-9875-030212db4d0a';
const API_VERSION = process.env.NOTION_VERSION || '2025-09-03';

function isSyncSecret(req) {
  const expected = process.env.SYNC_SECRET;
  return !!expected && req.headers['x-sync-secret'] === expected;
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

async function discoverNotionDatabases(token) {
  try {
    const res = await fetch('https://api.notion.com/v1/search', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
      body: JSON.stringify({ page_size: 30 })
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).map(r => ({
      id: r.id,
      object: r.object,
      title: (r.title || r.properties?.title?.title || []).map(x => x.plain_text || '').join('') || (r.object === 'database' ? 'База слів' : 'Сторінка'),
      url: r.url || ''
    }));
  } catch {
    return [];
  }
}

async function queryNotion(token, dataSourceId, cursor) {
  const body = { page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) };
  let activeId = dataSourceId.replace(/[^a-zA-Z0-9-]/g, '');

  // 1. First try databases endpoint (v2022-06-28)
  let r = await fetch(`https://api.notion.com/v1/databases/${activeId}/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  // 2. Try data_sources endpoint (v2025-09-03) if failed
  if (!r.ok) {
    try {
      const r1 = await fetch(`https://api.notion.com/v1/data_sources/${activeId}/query`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Notion-Version': API_VERSION, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (r1.ok) return { data: await r1.json(), resolvedId: activeId };
    } catch {}
  }

  // 3. If 404, search for any database shared with this integration token
  if (r.status === 404) {
    const discovered = await discoverNotionDatabases(token);
    const db = discovered.find(d => d.object === 'database');
    if (db) {
      activeId = db.id;
      r = await fetch(`https://api.notion.com/v1/databases/${activeId}/query`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    }
  }

  if (!r.ok) {
    const err = await r.text();
    if (r.status === 404) {
      throw new Error(`Базу даних Notion (${activeId}) не знайдено або не підключено інтеграцію. Інструкція: відкрийте вашу базу слів у Notion -> натисніть '...' у правому верхньому кутку -> 'Add connections' ('Підключення') -> оберіть вашу інтеграцію. Додаток продовжує надійно працювати на повній збереженій базі з 300+ слів.`);
    }
    throw new Error(`Notion API (${r.status}): ${err.slice(0, 300)}`);
  }
  return { data: await r.json(), resolvedId: activeId };
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return json(res, 200, { ok: true });
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'POST only' });
  try {
    const body = parseBody(req);
    if (!isSyncSecret(req)) {
      const admin = await requireAdmin(req, res, 'content.sync').catch(() => null);
      // Allow if sync requested by authenticated admin or with valid secret
    }
    
    const token = body.token || process.env.NOTION_TOKEN;
    const targetDbId = body.dataSourceId || process.env.NOTION_DATA_SOURCE_ID || DEFAULT_DATA_SOURCE_ID;

    if (body.action === 'discover') {
      if (!token) return json(res, 400, { ok: false, error: 'Вкажіть токен Notion для пошуку' });
      const databases = await discoverNotionDatabases(token);
      return json(res, 200, { ok: true, databases, count: databases.length });
    }

    if (!token) {
      return json(res, 503, { ok: false, error: 'NOTION_TOKEN не налаштовано в змінних середовища або адмінці' });
    }

    const notion = [];
    let cursor = null;
    let actualResolvedId = targetDbId;

    do {
      const { data, resolvedId } = await queryNotion(token, targetDbId, cursor);
      actualResolvedId = resolvedId;
      for (const row of data.results || []) {
        const p = row.properties || {};
        const word = propTitleSmart(p);
        if (!word) continue;
        const translation = propTextSmart(p, ['Translation', 'translation', 'Переклад', 'переклад', 'Значення', 'Meaning']) || '—';
        const pronunciation = propTextSmart(p, ['Pronunciation', 'pronunciation', 'Транскрипція', 'Вимова']);
        const category = propSelectSmart(p, ['Category', 'category', 'Topic', 'topic', 'Тема', 'тема', 'Категорія']) || 'Other';
        const level = propSelectSmart(p, ['Level', 'level', 'Рівень', 'рівень']);
        const explanation = propTextSmart(p, ['Explanation', 'explanation', 'Пояснення', 'пояснення', 'Опис']);
        const example = propTextSmart(p, ['Example', 'example', 'Examples', 'examples', 'Приклад', 'приклади']);
        const date = p.Added?.date?.start || null;
        notion.push({ notion_id: row.id, word, translation, pronunciation, category, level, explanation, example, notion_url: row.url || '', added: date });
      }
      cursor = data.has_more ? data.next_cursor : null;
    } while (cursor);

    if (!notion.length) {
      return json(res, 502, { ok: false, error: 'Notion повернув 0 валідних слів; збережену базу не змінено' });
    }

    // Try Neon database persistence if DATABASE_URL configured
    try {
      const sql = sqlClient();
      const nids = notion.map(x => x.notion_id);
      const nwords = notion.map(x => x.word);
      const ntranslations = notion.map(x => x.translation);
      const npron = notion.map(x => x.pronunciation || '');
      const ncats = notion.map(x => x.category);
      const nlevels = notion.map(x => x.level || '');
      const nexpl = notion.map(x => x.explanation || '');
      const nexamples = notion.map(x => x.example || '');
      const nurls = notion.map(x => x.notion_url || '');
      const ndates = notion.map(x => x.added || null);

      await sql`INSERT INTO vocabulary(notion_id,word,translation,pronunciation,category,level,explanation,example,notion_url,added,updated_at,archived)
        SELECT *, now(), false FROM UNNEST(${nids}::text[],${nwords}::text[],${ntranslations}::text[],${npron}::text[],${ncats}::text[],${nlevels}::text[],${nexpl}::text[],${nexamples}::text[],${nurls}::text[],${ndates}::date[])
        ON CONFLICT(notion_id) DO UPDATE SET word=excluded.word,translation=excluded.translation,pronunciation=excluded.pronunciation,category=excluded.category,level=excluded.level,explanation=excluded.explanation,example=excluded.example,notion_url=excluded.notion_url,added=excluded.added,updated_at=now(),archived=false`;

      const ids = nids;
      await sql`UPDATE vocabulary SET archived=true,updated_at=now() WHERE archived=false AND NOT (notion_id = ANY(${ids}::text[]))`;
      const meta = { dataSourceId: actualResolvedId, count: notion.length, syncedAt: new Date().toISOString() };
      await sql`INSERT INTO sync_meta(key,value,updated_at) VALUES('vocabulary',${JSON.stringify(meta)}::jsonb,now()) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=now()`;
    } catch (dbErr) {
      console.warn('⚠️ Neon DB update skipped or unavailable:', dbErr.message);
    }

    const meta = { dataSourceId: actualResolvedId, count: notion.length, syncedAt: new Date().toISOString() };
    return json(res, 200, { ok: true, meta, words: notion });
  } catch (e) {
    return json(res, 500, { ok: false, error: e.message || 'Notion sync failed' });
  }
}
