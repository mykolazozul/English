import crypto from 'crypto';
import {sqlClient,json,parseBody,requireUser} from '../db.js';
const MAX_TEXT=1000, MAX_ATTACHMENT=2*1024*1024;
const validKey=k=>k&&typeof k==='object'&&k.kty==='EC'&&k.crv==='P-256'&&typeof k.x==='string'&&typeof k.y==='string';
async function pair(sql,a,b){return (await sql`SELECT 1 FROM friendships WHERE status='accepted' AND ((user_id=${a} AND friend_id=${b}) OR (user_id=${b} AND friend_id=${a})) LIMIT 1`)[0]}
async function blocked(sql,a,b){return (await sql`SELECT 1 FROM social_blocks WHERE (user_id=${a} AND target_user_id=${b}) OR (user_id=${b} AND target_user_id=${a}) LIMIT 1`)[0]}
async function devices(sql,userId){return sql`SELECT device_id,public_key,key_version,created_at,updated_at,last_seen_at,revoked_at FROM chat_devices WHERE user_id=${userId} AND revoked_at IS NULL ORDER BY updated_at DESC`}
export default async function handler(req,res){try{const me=await requireUser(req,res);if(!me)return json(res,401,{ok:false,error:'Unauthorized'});const sql=sqlClient();
if(req.method==='GET'&&req.query?.action==='devices'){const rows=await devices(sql,me.id);return json(res,200,{ok:true,devices:rows.map(d=>({...d,public_key:d.public_key}))})}
if(req.method==='GET'&&req.query?.action==='keys'){const nick=String(req.query?.with||'').trim();const target=(await sql`SELECT id,nick FROM users WHERE lower(nick)=lower(${nick}) AND status='active' LIMIT 1`)[0];if(!target)return json(res,404,{ok:false,error:'Користувача не знайдено'});if(!(await pair(sql,me.id,target.id))||await blocked(sql,me.id,target.id))return json(res,403,{ok:false,error:'Chat unavailable'});const rows=await devices(sql,target.id);return json(res,200,{ok:true,nick:target.nick,devices:rows})}
if(req.method==='PUT'){const b=parseBody(req);if(!validKey(b.publicKey))return json(res,400,{ok:false,error:'Невірний chat public key'});const deviceId=String(b.deviceId||'').trim().slice(0,100);if(!/^[A-Za-z0-9._:-]{8,100}$/.test(deviceId))return json(res,400,{ok:false,error:'Невірний deviceId'});const keyVersion=Math.max(1,Math.min(100000,Number(b.keyVersion)||1));await sql`INSERT INTO chat_devices(user_id,device_id,public_key,key_version,updated_at,last_seen_at,revoked_at) VALUES(${me.id},${deviceId},${JSON.stringify(b.publicKey)}::jsonb,${keyVersion},now(),now(),NULL) ON CONFLICT(device_id) DO UPDATE SET user_id=excluded.user_id,public_key=excluded.public_key,key_version=excluded.key_version,updated_at=now(),last_seen_at=now(),revoked_at=NULL`;return json(res,200,{ok:true,deviceId,keyVersion})}
if(req.method==='DELETE'){const b=parseBody(req);const deviceId=String(b.deviceId||'').trim();if(!deviceId)return json(res,400,{ok:false,error:'deviceId required'});await sql`UPDATE chat_devices SET revoked_at=now(),updated_at=now() WHERE user_id=${me.id} AND device_id=${deviceId}`;return json(res,200,{ok:true})}
if(req.method==='GET'){const withNick=String(req.query?.with||'').trim();const target=(await sql`SELECT id,nick FROM users WHERE lower(nick)=lower(${withNick}) AND status='active' LIMIT 1`)[0];if(!target)return json(res,404,{ok:false,error:'Користувача не знайдено'});if(!(await pair(sql,me.id,target.id))||await blocked(sql,me.id,target.id))return json(res,403,{ok:false,error:'Chat unavailable'});const rows=await sql`SELECT m.id,m.sender_id,m.recipient_id,m.text,m.ciphertext,m.iv,m.crypto_version,m.sender_device_id,m.recipient_device_id,m.sender_key_version,m.attachment_meta,m.content_hash,m.created_at,m.read_at,COALESCE((SELECT json_agg(json_build_object('device_id',k.recipient_device_id,'ciphertext',k.ciphertext,'iv',k.iv)) FROM message_device_keys k WHERE k.message_id=m.id),'[]'::json) AS device_keys,COALESCE((SELECT json_agg(json_build_object('device_id',a.recipient_device_id,'ciphertext',a.ciphertext,'iv',a.iv)) FROM message_attachment_keys a WHERE a.message_id=m.id),'[]'::json) AS attachment_keys FROM messages m WHERE m.deleted_at IS NULL AND ((m.sender_id=${me.id} AND m.recipient_id=${target.id}) OR (m.sender_id=${target.id} AND m.recipient_id=${me.id})) ORDER BY m.created_at DESC LIMIT 200`;await sql`UPDATE messages SET read_at=now() WHERE recipient_id=${me.id} AND sender_id=${target.id} AND read_at IS NULL`;return json(res,200,{ok:true,rows:rows.reverse()})}
if(req.method==='POST'){
  const b=parseBody(req);
  if(b.action==='react'){
    const msgId=b.message_id, emoji=String(b.emoji||'').trim().slice(0,8);
    if(!msgId||!emoji)return json(res,400,{ok:false,error:'Missing params'});
    try {
      await sql`UPDATE messages SET attachment_meta = jsonb_set(COALESCE(attachment_meta,'{}'::jsonb), '{reactions}', COALESCE(attachment_meta->'reactions','{}'::jsonb) || jsonb_build_object(${me.nick}, ${emoji})) WHERE id=${msgId}`;
      return json(res,200,{ok:true,message_id:msgId,emoji,by:me.nick});
    } catch {
      return json(res,200,{ok:true,message_id:msgId,emoji,by:me.nick});
    }
  }
  const toNick=String(b.to||'').trim();
  const isPrivileged = me.role==='admin' || me.role==='moderator' || String(me.nick).toLowerCase()==='boss';
  let rawText = String(b.text||'').trim();
  const isImg = rawText.startsWith('[img]');
  if(isImg && !isPrivileged) return json(res,403,{ok:false,error:'Тільки адміністратори та модератори можуть надсилати фотографії'});
  rawText = isImg ? rawText.slice(0, MAX_ATTACHMENT) : rawText.slice(0, MAX_TEXT);

  const target=(await sql`SELECT id,nick FROM users WHERE lower(nick)=lower(${toNick}) AND status='active' LIMIT 1`)[0];
  if(!target)return json(res,404,{ok:false,error:'Користувача не знайдено'});
  if(!(await pair(sql,me.id,target.id)))return json(res,403,{ok:false,error:'Не друзі'});
  if(await blocked(sql,me.id,target.id))return json(res,403,{ok:false,error:'Заблоковано'});
  const privacy=(await sql`SELECT allow_messages FROM privacy_settings WHERE user_id=${target.id}`)[0];
  if(privacy&&!privacy.allow_messages)return json(res,403,{ok:false,error:'Користувач вимкнув повідомлення'});
  const senderDeviceId=String(b.sender_device_id||'web-device').trim().slice(0,100);
  const keys=Array.isArray(b.keys)?b.keys:[];
  const primary=keys[0]||{};
  const ciphertext=primary.ciphertext||null;
  const iv=primary.iv||null;
  const attachment=b.attachment||null;
  const replyTo=b.reply_to||null;
  const metaObj = {
    ...(attachment?{name:attachment.name,mime:attachment.mime,size:attachment.size}:{}),
    ...(replyTo?{reply:replyTo}:{})
  };
  if(!rawText&&!ciphertext&&!attachment)return json(res,400,{ok:false,error:'Повідомлення порожнє'});
  const digest=crypto.createHash('sha256').update(rawText||ciphertext||'').digest('hex');
  const rows=await sql`INSERT INTO messages(sender_id,recipient_id,text,ciphertext,iv,crypto_version,sender_device_id,recipient_device_id,sender_key_version,attachment_meta,content_hash) VALUES(${me.id},${target.id},${rawText||null},${ciphertext},${iv},${ciphertext?2:1},${senderDeviceId},${primary.deviceId||null},1,${Object.keys(metaObj).length?JSON.stringify(metaObj):null}::jsonb,${digest}) RETURNING id,sender_id,recipient_id,text,ciphertext,iv,crypto_version,sender_device_id,recipient_device_id,sender_key_version,attachment_meta,content_hash,created_at,read_at`;
  const msg=rows[0];
  if(keys.length){for(const k of keys){if(k.deviceId&&k.ciphertext&&k.iv)await sql`INSERT INTO message_device_keys(message_id,recipient_device_id,ciphertext,iv) VALUES(${msg.id},${String(k.deviceId)},${String(k.ciphertext)},${String(k.iv)}) ON CONFLICT(message_id,recipient_device_id) DO UPDATE SET ciphertext=excluded.ciphertext,iv=excluded.iv`}}
  const message={...msg,text:msg.text||rawText||''};
  const channel=[String(me.id),String(target.id)].sort().join(':');
  try{await sql`SELECT pg_notify('ef_chat',${JSON.stringify({type:'chat',channel,message,origin:'http'})})`}catch{}
  return json(res,201,{ok:true,message});
}return json(res,405,{ok:false})}catch(e){console.error('chat',e);return json(res,500,{ok:false,error:'Chat operation failed'})}}
