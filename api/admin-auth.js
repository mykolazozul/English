/**
 * POST { password }
 * Env ADMIN_PASSWORD_HASH = sha256 hex of (ef-v1::PASSWORD)
 * Or ADMIN_PASSWORD plain for simplicity.
 * Default demo hash corresponds to: EF-Boss-7kR9!mQ2
 */
import crypto from 'crypto';

function sha256(s) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

const DEFAULT_PLAIN = 'EF-Boss-7kR9!mQ2';
const DEFAULT_HASH = sha256('ef-v1::' + DEFAULT_PLAIN);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const password = String(body?.password || '');
  const inputHash = sha256('ef-v1::' + password);
  const expected = process.env.ADMIN_PASSWORD_HASH
    || (process.env.ADMIN_PASSWORD ? sha256('ef-v1::' + process.env.ADMIN_PASSWORD) : DEFAULT_HASH);

  const a = Buffer.from(inputHash);
  const b = Buffer.from(expected);
  const match = a.length === b.length && crypto.timingSafeEqual(a, b);

  if (!match) return res.status(401).json({ ok: false, error: 'invalid' });

  const token = crypto.createHmac('sha256', process.env.ADMIN_SECRET || expected)
    .update('ef-admin:' + Date.now().toString().slice(0, 10))
    .digest('hex');

  return res.status(200).json({ ok: true, token, exp: Date.now() + 4 * 3600 * 1000 });
}
