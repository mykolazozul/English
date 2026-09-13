import http from 'node:http';
import crypto from 'node:crypto';
import { WebSocketServer } from 'ws';
import pg from 'pg';
const {Pool,Client}=pg;
const PORT=Number(process.env.PORT||8787), DATABASE_URL=process.env.DATABASE_URL;
if(!DATABASE_URL) throw new Error('DATABASE_URL is required');
const pool=new Pool({connectionString:DATABASE_URL,max:10,ssl:{rejectUnauthorized:true}});
const wss=new WebSocketServer({noServer:true,maxPayload:256*1024});
const rooms=new Map();
function cookies(req){return Object.fromEntries(String(req.headers.cookie||'').split(';').map(x=>x.trim()).filter(Boolean).map(x=>{const i=x.indexOf('=');return [x.slice(0,i),decodeURIComponent(x.slice(i+1))]}));}
async function auth(req){const t=cookies(req)['__Host-ef_session'];if(!t)return null;const r=await pool.query(`SELECT u.id,u.nick FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=encode(digest($1,'sha256'),'hex') AND s.expires_at>now() AND u.status='active' LIMIT 1`,[t]);return r.rows[0]||null;}
function broadcast(channel,msg,except){const set=rooms.get(channel)||new Set();for(const ws of set){if(ws!==except&&ws.readyState===1)ws.send(JSON.stringify(msg))}}
function roomKey(a,b){return [String(a),String(b)].sort().join(':')}
async function canChat(a,b){
  if(!b||String(a)===String(b))return false;
  const friendship=await pool.query(`SELECT 1 FROM friendships WHERE status='accepted' AND ((user_id=$1 AND friend_id=$2) OR (user_id=$2 AND friend_id=$1)) LIMIT 1`,[a,b]);
  if(!friendship.rows[0])return false;
  const blocked=await pool.query(`SELECT 1 FROM social_blocks WHERE (user_id=$1 AND target_user_id=$2) OR (user_id=$2 AND target_user_id=$1) LIMIT 1`,[a,b]);
  if(blocked.rows[0])return false;
  const privacy=await pool.query(`SELECT allow_messages FROM privacy_settings WHERE user_id=$1 LIMIT 1`,[b]);
  return privacy.rows[0]?.allow_messages !== false;
}
async function presence(userId,status){try{await pool.query(`INSERT INTO realtime_presence(user_id,status,last_seen_at) VALUES($1,$2,now()) ON CONFLICT(user_id) DO UPDATE SET status=excluded.status,last_seen_at=now()`,[userId,status])}catch{}}
const duelRooms = new Map();
function broadcastDuel(room, msg) {
  if (room.p1?.readyState === 1) room.p1.send(JSON.stringify(msg));
  if (room.p2?.readyState === 1) room.p2.send(JSON.stringify(msg));
}

wss.on('connection',(ws,user)=>{
  ws.user=user;ws.channel=null;ws.duelPin=null;ws.messageTimes=[];presence(user.id,'online');
  ws.send(JSON.stringify({type:'ready',user:{id:user.id,nick:user.nick}}));
  ws.on('message',async raw=>{
    try{
      const now=Date.now();ws.messageTimes=ws.messageTimes.filter(t=>now-t<10000);if(ws.messageTimes.length>=40){ws.send(JSON.stringify({type:'error',error:'Too many realtime messages'}));return}ws.messageTimes.push(now);
      const m=JSON.parse(String(raw));
      if(m.type==='ping'){ws.send(JSON.stringify({type:'pong',clientTs:Number(m.clientTs)||now,serverTs:Date.now()}));return;}
      await presence(user.id,'online');

      // Live Multiplayer Duel Handlers
      if(m.type==='duel_create'){
        const pin = String(m.pin || ('DUEL-' + Math.floor(1000 + Math.random() * 9000))).toUpperCase();
        ws.duelPin = pin;
        duelRooms.set(pin, {
          pin,
          p1: ws,
          p1Info: { id: user.id, nick: user.nick, name: m.name || user.nick, avatar: m.avatar || 'knight' },
          p2: null,
          p2Info: null,
          p1Hp: 100,
          p2Hp: 100,
          createdAt: now
        });
        ws.send(JSON.stringify({ type: 'duel_created', pin, host: user.nick }));
        return;
      }

      if(m.type==='duel_join'){
        const pin = String(m.pin || '').trim().toUpperCase();
        const room = duelRooms.get(pin);
        if(!room){
          ws.send(JSON.stringify({ type: 'duel_error', error: 'Кімнату дуелі не знайдено або термін дії вичерпано' }));
          return;
        }
        if(room.p2 && room.p2 !== ws){
          ws.send(JSON.stringify({ type: 'duel_error', error: 'Кімната вже заповнена двома бійцями' }));
          return;
        }
        ws.duelPin = pin;
        room.p2 = ws;
        room.p2Info = { id: user.id, nick: user.nick, name: m.name || user.nick, avatar: m.avatar || 'ninja' };
        broadcastDuel(room, {
          type: 'duel_matched',
          pin,
          p1: room.p1Info,
          p2: room.p2Info,
          p1Hp: 100,
          p2Hp: 100
        });
        return;
      }

      if(m.type==='duel_round_sync'){
        const pin = ws.duelPin || m.pin;
        const room = duelRooms.get(pin);
        if(room){
          broadcastDuel(room, {
            type: 'duel_round_start',
            question: m.question,
            roundIndex: m.roundIndex,
            timestamp: now
          });
        }
        return;
      }

      if(m.type==='duel_answer'){
        const pin = ws.duelPin || m.pin;
        const room = duelRooms.get(pin);
        if(room){
          const isP1 = ws === room.p1;
          const damage = m.correct ? 25 : 0;
          const selfDmg = m.correct ? 0 : 20;
          if (isP1) {
            room.p2Hp = Math.max(0, room.p2Hp - damage);
            room.p1Hp = Math.max(0, room.p1Hp - selfDmg);
          } else {
            room.p1Hp = Math.max(0, room.p1Hp - damage);
            room.p2Hp = Math.max(0, room.p2Hp - selfDmg);
          }
          broadcastDuel(room, {
            type: 'duel_hp_update',
            p1Hp: room.p1Hp,
            p2Hp: room.p2Hp,
            answeredBy: isP1 ? 'p1' : 'p2',
            correct: !!m.correct,
            opt: m.opt
          });
          if(room.p1Hp <= 0 || room.p2Hp <= 0){
            const winner = room.p1Hp > 0 ? 'p1' : 'p2';
            broadcastDuel(room, {
              type: 'duel_game_over',
              winner,
              winnerNick: winner === 'p1' ? room.p1Info.nick : room.p2Info.nick
            });
            duelRooms.delete(pin);
          }
        }
        return;
      }

      if(m.type==='duel_leave'){
        if(ws.duelPin && duelRooms.has(ws.duelPin)){
          const room = duelRooms.get(ws.duelPin);
          const other = ws === room.p1 ? room.p2 : room.p1;
          if(other?.readyState === 1){
            other.send(JSON.stringify({ type: 'duel_opponent_left' }));
          }
          duelRooms.delete(ws.duelPin);
          ws.duelPin = null;
        }
        return;
      }

      if(m.type==='join_chat'){
        const other=String(m.userId||'');
        if(!(await canChat(user.id,other)))return ws.send(JSON.stringify({type:'error',error:'Chat unavailable'}));
        if(ws.channel&&rooms.has(ws.channel))rooms.get(ws.channel).delete(ws);
        ws.channel=roomKey(user.id,other);if(!rooms.has(ws.channel))rooms.set(ws.channel,new Set());rooms.get(ws.channel).add(ws);
        ws.send(JSON.stringify({type:'joined',channel:ws.channel}));return;
      }
      if(m.type==='chat'){
        const ciphertext=String(m.ciphertext||'').trim(),iv=String(m.iv||'').trim(),deviceId=String(m.sender_device_id||'').slice(0,100);
        if(!ws.channel||!ciphertext||!iv||Number(m.crypto_version)!==1||!deviceId||ciphertext.length>20000||iv.length>100)return ws.send(JSON.stringify({type:'error',error:'Invalid E2E message'}));
        const [a,b]=ws.channel.split(':');const other=a===String(user.id)?b:a;
        if(!(await canChat(user.id,other)))return ws.send(JSON.stringify({type:'error',error:'Chat unavailable'}));
        const d=await pool.query(`SELECT device_id,key_version FROM chat_devices WHERE user_id=$1 AND device_id=$2 AND revoked_at IS NULL`,[user.id,deviceId]);
        const target=await pool.query(`SELECT device_id FROM chat_devices WHERE user_id=$1 AND revoked_at IS NULL`,[other]);
        if(!d.rows[0]||!target.rows.length)return ws.send(JSON.stringify({type:'error',error:'E2E device not registered'}));
        const keys=Array.isArray(m.keys)?m.keys:[];if(!keys.length||keys.length>20)return ws.send(JSON.stringify({type:'error',error:'Invalid E2E keys'}));
        const valid=new Set(target.rows.map(x=>String(x.device_id)));for(const k of keys){if(!valid.has(String(k.deviceId||''))||typeof k.ciphertext!=='string'||typeof k.iv!=='string'||k.ciphertext.length>200000)return ws.send(JSON.stringify({type:'error',error:'Invalid recipient key'}));}
        const digest=crypto.createHash('sha256').update(JSON.stringify({keys,attachment:null,version:2,senderDeviceId:deviceId})).digest('hex');
        const primary=keys[0];
        const r=await pool.query(`INSERT INTO messages(sender_id,recipient_id,text,ciphertext,iv,crypto_version,sender_device_id,recipient_device_id,sender_key_version,content_hash) VALUES($1,$2,NULL,$3,$4,2,$5,$6,$7,$8) RETURNING id,sender_id,recipient_id,text,ciphertext,iv,crypto_version,sender_device_id,recipient_device_id,sender_key_version,content_hash,created_at,read_at`,[user.id,other,primary.ciphertext,primary.iv,deviceId,primary.deviceId,d.rows[0].key_version,digest]);
        for(const k of keys)await pool.query(`INSERT INTO message_device_keys(message_id,recipient_device_id,ciphertext,iv) VALUES($1,$2,$3,$4) ON CONFLICT(message_id,recipient_device_id) DO UPDATE SET ciphertext=excluded.ciphertext,iv=excluded.iv`,[r.rows[0].id,String(k.deviceId),String(k.ciphertext),String(k.iv)]);
        const message={...r.rows[0],device_keys:keys.map(k=>({device_id:k.deviceId,ciphertext:k.ciphertext,iv:k.iv}))};const msg={type:'chat',message};broadcast(ws.channel,msg);
        await pool.query(`SELECT pg_notify('ef_chat',$1)`,[JSON.stringify({channel:ws.channel,message,origin:'realtime'})]);
      }
    }catch{try{ws.send(JSON.stringify({type:'error',error:'Invalid realtime message'}))}catch{}}
  });
  ws.on('close',()=>{
    if(ws.duelPin && duelRooms.has(ws.duelPin)){
      const room = duelRooms.get(ws.duelPin);
      const other = ws === room.p1 ? room.p2 : room.p1;
      if(other?.readyState === 1){
        other.send(JSON.stringify({ type: 'duel_opponent_left' }));
      }
      duelRooms.delete(ws.duelPin);
    }
    if(ws.channel&&rooms.has(ws.channel)){rooms.get(ws.channel).delete(ws);if(!rooms.get(ws.channel).size)rooms.delete(ws.channel)};presence(user.id,'offline')
  });
});
const server=http.createServer((req,res)=>{if(req.method==='GET'&&req.url?.startsWith('/health')){res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify({ok:true,service:'english-flow-realtime',at:new Date().toISOString()}));return}res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify({ok:true,service:'english-flow-realtime'}));});
server.on('upgrade',async(req,socket,head)=>{try{const user=await auth(req);if(!user){socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');socket.destroy();return}wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,user))}catch{socket.destroy()}});
const listener=new Client({connectionString:DATABASE_URL,ssl:{rejectUnauthorized:true}});listener.connect().then(()=>listener.query('LISTEN ef_chat')).then(()=>listener.on('notification',n=>{try{const x=JSON.parse(n.payload);if(x.origin==='realtime')return;broadcast(x.channel,x)}catch{}})).catch(()=>{});
server.listen(PORT,()=>console.log(`English Flow realtime listening on ${PORT}`));
async function shutdown(){await listener.end();await pool.end();process.exit(0)}
process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
