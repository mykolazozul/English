import crypto from 'crypto';
import { sqlClient, json, requireUser, requireAdmin } from '../lib/server/db.js';

const DATA_SOURCE_ID = process.env.NOTION_DATA_SOURCE_ID || 'f38dba17-bbd6-4f04-9875-030212db4d0a';
const API_VERSION = process.env.NOTION_VERSION || '2025-09-03';


function validAdminToken(token) {
  const [ts, sig] = String(token || '').split('.');
  const n = Number(ts);
  const secret = process.env.ADMIN_SECRET || process.env.ADMIN_PASSWORD;
  if (!secret || !Number.isFinite(n) || Date.now() - n > 4*60*60*1000 || Date.now() < n) return false;
  const expected = crypto.createHmac('sha256', secret).update(`ef-admin:${n}`).digest('hex');
  return sig && sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

function isSyncSecret(req) {
  const expected = process.env.SYNC_SECRET;
  return !!expected && req.headers['x-sync-secret'] === expected;
}

function propText(p, key) {
  return (p[key]?.rich_text || []).map(x => x.plain_text || x.text?.content || '').join('').trim();
}
function propTitle(p, key) {
  return (p[key]?.title || []).map(x => x.plain_text || x.text?.content || '').join('').trim();
}
function propSelect(p, key) { return p[key]?.select?.name || ''; }

export default async function handler(req,res){
  if(req.method==='OPTIONS') return json(res,200,{ok:true});
  if(req.method!=='POST') return json(res,405,{ok:false,error:'POST only'});
  try {
    const bearer = String(req.headers.authorization || '').replace(/^Bearer\s+/i,'');
    if(!isSyncSecret(req) && !validAdminToken(bearer)) {
      const admin=await requireAdmin(req,res);
      const user=admin || await requireUser(req,res);
      if(!user || !['admin','moderator'].includes(user.role)) return json(res,401,{ok:false,error:'Unauthorized'});
    }
    const token=process.env.NOTION_TOKEN;
    if(!token) return json(res,503,{ok:false,error:'NOTION_TOKEN is not configured'});
    const notion=[]; let cursor=null;
    do {
      const body={page_size:100,...(cursor?{start_cursor:cursor}:{})};
      const r=await fetch(`https://api.notion.com/v1/data_sources/${DATA_SOURCE_ID}/query`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Notion-Version':API_VERSION,'Content-Type':'application/json'},body:JSON.stringify(body)});
      const text=await r.text(); if(!r.ok) throw new Error(`Notion ${r.status}: ${text.slice(0,500)}`);
      const data=JSON.parse(text);
      for(const row of data.results||[]){
        const p=row.properties||{}; const word=propTitle(p,'Word');
        if(!word) continue;
        notion.push({notion_id:row.id,word,translation:propText(p,'Translation')||'—',pronunciation:propText(p,'Pronunciation'),category:propSelect(p,'Category')||propSelect(p,'Topic')||'Other',level:propSelect(p,'Level'),explanation:propText(p,'Explanation'),example:propText(p,'Example')||propText(p,'Examples'),notion_url:row.url||'',added:p.Added?.date?.start||null});
      }
      cursor=data.has_more?data.next_cursor:null;
    } while(cursor);

    const sql=sqlClient();
    await sql`UPDATE vocabulary SET archived=true,updated_at=now() WHERE archived=false`;
    for(const w of notion){
      await sql`INSERT INTO vocabulary(notion_id,word,translation,pronunciation,category,level,explanation,example,notion_url,added,updated_at,archived)
      VALUES(${w.notion_id},${w.word},${w.translation},${w.pronunciation},${w.category},${w.level},${w.explanation},${w.example},${w.notion_url},${w.added},now(),false)
      ON CONFLICT(notion_id) DO UPDATE SET word=excluded.word,translation=excluded.translation,pronunciation=excluded.pronunciation,category=excluded.category,level=excluded.level,explanation=excluded.explanation,example=excluded.example,notion_url=excluded.notion_url,added=excluded.added,updated_at=now(),archived=false`;
    }
    const ids=notion.map(x=>x.notion_id);
    // Historical rows remain in Neon; only active Notion rows are unarchived by the upsert above.
    const meta={dataSourceId:DATA_SOURCE_ID,count:notion.length,syncedAt:new Date().toISOString()};
    await sql`INSERT INTO sync_meta(key,value,updated_at) VALUES('vocabulary',${JSON.stringify(meta)}::jsonb,now()) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=now()`;
    return json(res,200,{ok:true,meta,words:notion});
  } catch(e){ return json(res,500,{ok:false,error:e.message||'Notion sync failed'}); }
}
