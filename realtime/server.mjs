import http from 'node:http';
import crypto from 'node:crypto';
import { WebSocketServer } from 'ws';
import pg from 'pg';
const {Pool,Client}=pg;
const PORT=Number(process.env.PORT||8787), DATABASE_URL=process.env.DATABASE_URL;
if(!DATABASE_URL) throw new Error('DATABASE_URL is required');
const pool=new Pool({connectionString:DATABASE_URL,max:10,ssl:{rejectUnauthorized:false}});
const wss=new WebSocketServer({noServer:true});
const rooms=new Map();
function cookies(req){return Object.fromEntries(String(req.headers.cookie||'').split(';').map(x=>x.trim()).filter(Boolean).map(x=>{const i=x.indexOf('=');return [x.slice(0,i),decodeURIComponent(x.slice(i+1))]}));}
async function auth(req){const t=cookies(req)['__Host-ef_session'];if(!t)return null;const r=await pool.query(`SELECT u.id,u.nick FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=encode(digest($1,'sha256'),'hex') AND s.expires_at>now() AND u.status='active' LIMIT 1`,[t]);return r.rows[0]||null;}
function broadcast(channel,msg,except){const set=rooms.get(channel)||new Set();for(const ws of set){if(ws!==except&&ws.readyState===1)ws.send(JSON.stringify(msg))}}
function roomKey(a,b){return [String(a),String(b)].sort().join(':')}
async function canChat(a,b){const r=await pool.query(`SELECT 1 FROM friendships WHERE status='accepted' AND ((user_id=$1 AND friend_id=$2) OR (user_id=$2 AND friend_id=$1))`,[a,b]);if(!r.rows[0])return false;const x=await pool.query(`SELECT 1 FROM social_blocks WHERE (user_id=$1 AND target_user_id=$2) OR (user_id=$2 AND target_user_id=$1)`,[a,b]);return !x.rows[0]}
wss.on('connection',(ws,user)=>{ws.user=user;ws.send(JSON.stringify({type:'ready',user:{id:user.id,nick:user.nick}}));ws.on('message',async raw=>{try{const m=JSON.parse(String(raw));if(m.type==='join_chat'){const other=String(m.userId||'');if(!(await canChat(user.id,other)))return ws.send(JSON.stringify({type:'error',error:'Chat unavailable'}));ws.channel=roomKey(user.id,other);if(!rooms.has(ws.channel))rooms.set(ws.channel,new Set());rooms.get(ws.channel).add(ws);ws.send(JSON.stringify({type:'joined',channel:ws.channel}));return}if(m.type==='chat'){const text=String(m.text||'').trim().slice(0,1000);if(!ws.channel||!text)return;const [a,b]=ws.channel.split(':');const other=a===String(user.id)?b:a;if(!(await canChat(user.id,other)))return;const r=await pool.query(`INSERT INTO messages(sender_id,recipient_id,text) VALUES($1,$2,$3) RETURNING id,sender_id,recipient_id,text,created_at,read_at`,[user.id,other,text]);const msg={type:'chat',message:r.rows[0]};broadcast(ws.channel,msg);await pool.query(`SELECT pg_notify('ef_chat',$1)`,[JSON.stringify({channel:ws.channel,message:r.rows[0],origin:'realtime'})]);} }catch{ws.send(JSON.stringify({type:'error',error:'Invalid realtime message'}))}});ws.on('close',()=>{if(ws.channel&&rooms.has(ws.channel)){rooms.get(ws.channel).delete(ws);if(!rooms.get(ws.channel).size)rooms.delete(ws.channel)}})});
const server=http.createServer((req,res)=>{res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({ok:true,service:'english-flow-realtime'}))});
server.on('upgrade',async(req,socket,head)=>{try{const user=await auth(req);if(!user){socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');socket.destroy();return}wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,user))}catch{socket.destroy()}});
const listener=new Client({connectionString:DATABASE_URL,ssl:{rejectUnauthorized:false}});listener.connect().then(()=>listener.query('LISTEN ef_chat')).then(()=>listener.on('notification',n=>{try{const x=JSON.parse(n.payload);if(x.origin==='realtime')return;broadcast(x.channel,x)}catch{}})).catch(()=>{});
server.listen(PORT,()=>console.log(`English Flow realtime listening on ${PORT}`));
process.on('SIGTERM',async()=>{await listener.end();await pool.end();process.exit(0)});
