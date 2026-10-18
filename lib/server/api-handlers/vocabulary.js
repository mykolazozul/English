import { sqlClient, json } from '../db.js';
import { syncNotionToNeon } from './notion-sync.js';
import { notionWords, notionSyncMeta } from '../../../src/notionWords.generated.js';

let lastAutoSyncAttempt = 0;

export async function ensureNeonVocabularySeeded(sql) {
  if (!Array.isArray(notionWords) || !notionWords.length) return;
  try {
    const countRow = (await sql`SELECT count(*)::int AS n FROM vocabulary WHERE archived=false`)[0];
    if (Number(countRow?.n || 0) >= notionWords.length) return;

    const nids = notionWords.map(x => String(x.id || x.notion_id || x.word));
    const nwords = notionWords.map(x => String(x.word || ''));
    const ntranslations = notionWords.map(x => String(x.translation || '—'));
    const npron = notionWords.map(x => String(x.pronunciation || ''));
    const ncats = notionWords.map(x => String(x.category || 'Other'));
    const nlevels = notionWords.map(x => String(x.level || ''));
    const nexpl = notionWords.map(x => String(x.explanation || ''));
    const nexamples = notionWords.map(x => String(x.example || (x.examples || '').split('\n')[0] || ''));
    const nurls = notionWords.map(x => String(x.notionUrl || x.notion_url || ''));
    const ndates = notionWords.map(x => (x.added ? String(x.added).slice(0, 10) : null));

    await sql`INSERT INTO vocabulary(notion_id,word,translation,pronunciation,category,level,explanation,example,notion_url,added,updated_at,archived)
      SELECT *, now(), false FROM UNNEST(${nids}::text[],${nwords}::text[],${ntranslations}::text[],${npron}::text[],${ncats}::text[],${nlevels}::text[],${nexpl}::text[],${nexamples}::text[],${nurls}::text[],${ndates}::date[])
      ON CONFLICT(notion_id) DO UPDATE SET
        word=excluded.word,
        translation=excluded.translation,
        pronunciation=excluded.pronunciation,
        category=excluded.category,
        explanation=excluded.explanation,
        example=excluded.example,
        notion_url=excluded.notion_url,
        archived=false`;

    if (notionSyncMeta) {
      await sql`INSERT INTO sync_meta(key,value,updated_at) VALUES('vocabulary',${JSON.stringify(notionSyncMeta)}::jsonb,now()) ON CONFLICT(key) DO NOTHING`;
    }
  } catch (err) {
    console.warn('⚠️ Neon vocabulary seed warning:', err.message);
  }
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') return json(res, 405, { ok: false });
    const sql = sqlClient();

    // Auto-sync from Notion directly into Neon DB at most once per hour (no Git commit / no Vercel rebuild needed)
    if (process.env.NOTION_TOKEN && Date.now() - lastAutoSyncAttempt > 10 * 60 * 1000) {
      try {
        const metaRow = (await sql`SELECT updated_at FROM sync_meta WHERE key='vocabulary' LIMIT 1`)[0];
        const ageMs = metaRow?.updated_at ? (Date.now() - new Date(metaRow.updated_at).getTime()) : Infinity;
        if (ageMs > 60 * 60 * 1000) {
          lastAutoSyncAttempt = Date.now();
          await syncNotionToNeon();
        }
      } catch {}
    }

    await ensureNeonVocabularySeeded(sql);

    const rows = await sql`SELECT notion_id AS id,word,translation,pronunciation,category,level,explanation,example,notion_url AS "notionUrl",added FROM vocabulary WHERE archived=false ORDER BY word`;
    return json(res, 200, { ok: true, count: rows.length, words: rows }, { 'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600' });
  } catch (e) {
    return json(res, 500, { ok: false, error: e.message || 'Vocabulary failed' });
  }
}
