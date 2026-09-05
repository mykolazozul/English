import { neon } from '@neondatabase/serverless';

let client;
export function sqlClient(){
  if(!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured');
  if(!client) client=neon(process.env.DATABASE_URL);
  return client;
}
export function json(res,status,body,headers={}){Object.entries(headers).forEach(([k,v])=>res.setHeader(k,v));return res.status(status).json(body);}
export function parseBody(req){if(!req.body)return{};if(typeof req.body==='object')return req.body;try{return JSON.parse(req.body)}catch{return{}}}
export function cookie(req,name){const raw=req.headers?.cookie||'';const found=raw.split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='));return found?decodeURIComponent(found.slice(name.length+1)):'';}
export function setCookie(res,name,value,maxAge,{httpOnly=true,sameSite='Strict',secure=true,path='/'}={}){res.setHeader('Set-Cookie',`${name}=${encodeURIComponent(value)}; Path=${path}; ${httpOnly?'HttpOnly; ':''}${secure?'Secure; ':''}SameSite=${sameSite}; Max-Age=${maxAge}`)}
export function setSessionCookie(res,t,maxAge=60*60*24*30){setCookie(res,'__Host-ef_session',t,maxAge)}
export function clearSessionCookie(res){setCookie(res,'__Host-ef_session','',0)}
export function clearAdminCookie(res){setCookie(res,'__Host-ef_admin','',0)}
export function getIp(req){
  // Vercel sets x-vercel-forwarded-for itself (non-spoofable). Fall back to the
  // direct connection remote address; never trust a client-supplied header.
  const trusted=req.headers?.['x-vercel-forwarded-for']||req.socket?.remoteAddress||'unknown';
  return String(trusted).split(',')[0].trim().slice(0,100);
}
export function hashText(value){return cryptoHash(String(value||''))}
function cryptoHash(v){let h=0x811c9dc5;for(let i=0;i<v.length;i++){h^=v.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(16).padStart(8,'0')}
export async function requireUser(req,res){const t=cookie(req,'__Host-ef_session');if(!t)return null;const sql=sqlClient();const rows=await sql`SELECT u.id,u.nick,u.name,u.role,u.status,u.banned_until FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=encode(digest(${t},'sha256'),'hex') AND s.expires_at>now() LIMIT 1`;if(!rows[0]||rows[0].status!=='active'||(rows[0].banned_until&&new Date(rows[0].banned_until)>new Date()))return null;await sql`UPDATE sessions SET last_seen_at=now() WHERE token_hash=encode(digest(${t},'sha256'),'hex')`;return rows[0];}
const ADMIN_PERMISSIONS={admin:new Set(['*']),moderator:new Set(['dashboard.read','users.read','reports.manage','monitoring.read'])};
export async function requireAdmin(req,res,permission=null){const t=cookie(req,'__Host-ef_admin');if(!t)return null;const sql=sqlClient();const rows=await sql`SELECT u.id,u.nick,u.name,u.role FROM admin_sessions a JOIN users u ON u.id=a.user_id WHERE u.role IN ('admin','moderator') AND u.status='active' AND a.token_hash=encode(digest(${t},'sha256'),'hex') AND a.expires_at>now() LIMIT 1`;if(!rows[0])return null;if(permission&&!ADMIN_PERMISSIONS[rows[0].role]?.has('*')&&!ADMIN_PERMISSIONS[rows[0].role]?.has(permission))return null;await sql`UPDATE admin_sessions SET last_seen_at=now() WHERE token_hash=encode(digest(${t},'sha256'),'hex')`;return rows[0];}
export function adminPermissions(role){return role==='admin'?['*']:Array.from(ADMIN_PERMISSIONS[role]||[])}
export function publicUser(row){return row?{id:row.id,nick:row.nick,name:row.name,role:row.role}:null}
