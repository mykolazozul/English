/**
 * Vercel Serverless: POST { password }
 * Env: ADMIN_PASSWORD (plain) or leave default for demo.
 * Returns { ok: true, token } — token is HMAC-ish simple for session (not JWT full).
 * For production set ADMIN_PASSWORD in Vercel env.
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method' });

  const expected = process.env.ADMIN_PASSWORD || '2468';
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const password = body?.password || '';

  // timing-safe-ish compare
  const a = Buffer.from(String(password));
  const b = Buffer.from(String(expected));
  let match = a.length === b.length;
  if (match) {
    const crypto = await import('crypto');
    match = crypto.timingSafeEqual(a, b);
  }

  if (!match) {
    return res.status(401).json({ ok: false, error: 'invalid' });
  }

  const crypto = await import('crypto');
  const token = crypto.createHmac('sha256', process.env.ADMIN_SECRET || expected)
    .update('ef-admin:' + Date.now().toString().slice(0, 8))
    .digest('hex');

  return res.status(200).json({ ok: true, token, exp: Date.now() + 4 * 3600 * 1000 });
}
