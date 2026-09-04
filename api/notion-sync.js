/**
 * POST /api/notion-sync — pulls words from Notion (server-side token).
 * Env: NOTION_TOKEN, NOTION_DATA_SOURCE_ID (optional)
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const TOKEN = process.env.NOTION_TOKEN;
  const DATA_SOURCE_ID = process.env.NOTION_DATA_SOURCE_ID || 'f38dba17-bbd6-4f04-9875-030212db4d0a';
  const API_VERSION = process.env.NOTION_VERSION || '2025-09-03';

  if (!TOKEN) {
    return res.status(503).json({
      error: 'NOTION_TOKEN not set on server',
      hint: 'Add NOTION_TOKEN in Vercel Environment Variables'
    });
  }

  try {
    const all = [];
    let cursor;
    do {
      const body = { page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) };
      const r = await fetch(`https://api.notion.com/v1/data_sources/${DATA_SOURCE_ID}/query`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          'Notion-Version': API_VERSION,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      const text = await r.text();
      if (!r.ok) throw new Error(`Notion ${r.status}: ${text.slice(0, 300)}`);
      const data = JSON.parse(text);
      for (const row of data.results || []) {
        const p = row.properties || {};
        const title = (p.Word?.title || []).map(x => x.plain_text).join('') || '';
        if (!title.trim()) continue;
        const rich = (key) => (p[key]?.rich_text || []).map(x => x.plain_text).join('') || '';
        const select = (key) => p[key]?.select?.name || '';
        all.push({
          id: row.id,
          word: title.trim(),
          translation: rich('Translation') || '—',
          pronunciation: rich('Pronunciation') || '',
          explanation: rich('Explanation') || '',
          example: rich('Example') || rich('Examples') || '',
          category: select('Category') || select('Topic') || 'Other',
          level: select('Level') || ''
        });
      }
      cursor = data.has_more ? data.next_cursor : null;
    } while (cursor);

    return res.status(200).json({
      meta: { count: all.length, syncedAt: new Date().toISOString(), source: 'notion-live' },
      words: all
    });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'sync failed' });
  }
}
