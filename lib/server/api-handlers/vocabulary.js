import { sqlClient, json } from '../db.js';
import { syncNotionToNeon } from './notion-sync.js';

let lastAutoSyncAttempt = 0;

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

    const rows = await sql`SELECT notion_id AS id,word,translation,pronunciation,category,level,explanation,example,notion_url AS "notionUrl",added FROM vocabulary WHERE archived=false ORDER BY word`;
    return json(res, 200, { ok: true, count: rows.length, words: rows }, { 'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600' });
  } catch (e) {
    return json(res, 500, { ok: false, error: e.message || 'Vocabulary failed' });
  }
}
