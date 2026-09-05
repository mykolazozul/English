import { nickHash, encryptText, hashPassword } from './crypto.js';
const PROFILES_KEY='ef-profiles-v1',ACTIVE_KEY='ef-active-nick',NICK_INDEX='ef-nick-index-v1',GLOBAL_AVG='ef-daily-avg-v1',GUEST_KEY='ef-guest-session',PROGRESS_QUEUE='ef-progress-queue-v2';
function localProfiles(){try{return JSON.parse(localStorage.getItem(PROFILES_KEY)||'{}')}catch{return{}}}
export function listProfiles(){return localProfiles()}
function nickIndex(){try{return JSON.parse(localStorage.getItem(NICK_INDEX)||'{}')}catch{return{}}}
async function api(path,options={}){const res=await fetch(path,{credentials:'include',headers:{'Content-Type':'application/json',...(options.headers||{})},...options});const data=await res.json().catch(()=>({}));if(!res.ok){const e=new Error(data.error||`HTTP ${res.status}`);e.status=res.status;throw e}return data}
export async function serverAuth(action,payload={}){return api('/api/auth',{method:'POST',body:JSON.stringify({action,...payload})})}
export async function serverMe(){return api('/api/auth?action=me').catch(()=>({ok:false,user:null}))}
export async function loadServerConfig(){try{return (await api('/api/config')).settings||{}}catch{return {}}}
export async function isNickTaken(nick){const n=String(nick||'').trim();if(!n)return true;const all=localProfiles();if(all[n]||all[n.toLowerCase()])return true;const h=await nickHash(n),idx=nickIndex();if(idx[h])return true;try{return !!(await serverAuth('check',{nick:n})).taken}catch{return false}}
export async function registerNick(nick,data){const n=String(nick).trim(),profile={...data,nick:n,name:data.name||n,updatedAt:new Date().toISOString()};const h=await nickHash(n),idx=nickIndex();idx[h]=n;localStorage.setItem(NICK_INDEX,JSON.stringify(idx));const nameEnc=data.name?await encryptText(data.name):'';const stored={...profile,nickHash:h,nameEnc};const all=localProfiles();all[n]=stored;localStorage.setItem(PROFILES_KEY,JSON.stringify(all));localStorage.setItem(ACTIVE_KEY,n);return stored}
export function saveProfile(nick,data){const all=localProfiles();all[nick]={...data,nick,updatedAt:new Date().toISOString()};localStorage.setItem(PROFILES_KEY,JSON.stringify(all));if(nick)localStorage.setItem(ACTIVE_KEY,nick)}
export function loadProfile(nick){return localProfiles()[nick]||null}
export function getActiveNick(){return localStorage.getItem(ACTIVE_KEY)||''}
export function setGuestSession(on){if(on)localStorage.setItem(GUEST_KEY,'1');else localStorage.removeItem(GUEST_KEY)}
export function isGuestSession(){return localStorage.getItem(GUEST_KEY)==='1'}
export async function getFriends(){try{return(await api('/api/friends')).rows||[]}catch{return[]}}
export async function addFriend(_,friendNick){try{await api('/api/friends',{method:'POST',body:JSON.stringify({nick:friendNick})});return{ok:true}}catch(e){return{ok:false,error:e.message}}}
export async function acceptFriend(_,friendId){try{await api('/api/friends',{method:'PATCH',body:JSON.stringify({friendId,action:'accept'})});return{ok:true}}catch(e){return{ok:false,error:e.message}}}
export async function removeFriend(_,friendId){try{await api('/api/friends',{method:'PATCH',body:JSON.stringify({friendId,action:'remove'})});return{ok:true}}catch(e){return{ok:false,error:e.message}}}
export async function friendsLeaderboard(){try{return(await api('/api/friend-leaderboard')).rows||[]}catch{return[]}}
export async function getChat(_,withNick){try{return(await api('/api/chat?with='+encodeURIComponent(withNick))).rows||[]}catch{return[]}}
export async function sendChat(_,to,text){try{return(await api('/api/chat',{method:'POST',body:JSON.stringify({to,text})})).message||null}catch{return null}}
export function ensureDailyAverage(){const today=new Date().toISOString().slice(0,10);try{const prev=JSON.parse(localStorage.getItem(GLOBAL_AVG)||'{}');if(prev.date===today)return prev}catch{}const data={date:today,avgXp:0,avgStreak:0,players:0,at:new Date().toISOString()};localStorage.setItem(GLOBAL_AVG,JSON.stringify(data));return data}
export function getDailyAverage(){return ensureDailyAverage()}
export async function cloudPull(){try{const [r,pr]=await Promise.all([api('/api/profile'),api('/api/progress')]);const p=r.profile||{},v=pr.vocabulary||[];const mastery={},srs={},attempts={};v.forEach(x=>{mastery[x.notion_id]=x.mastery||0;srs[x.notion_id]=x.srs||{};attempts[x.notion_id]=x.attempts||0});return {...(r.profileData||{}),id:p.id,nick:p.nick,name:p.name,role:p.role,xp:p.xp,streak:p.streak,dailyGoal:p.daily_goal,todayXp:p.today_xp,today:p.today,avatar:p.avatar,theme:p.theme,skin:p.skin,settings:p.settings||{},mastery,srs,attempts,history:(pr.history||[]).map(h=>({word:h.notion_id,correct:h.correct,points:h.points,date:h.created_at,mode:h.mode})),badges:[...(r.achievements||[]),...(pr.achievements||[])].filter((x,i,a)=>a.indexOf(x)===i)}}catch{return null}}
export async function cloudPush(_,data){if(data?.guest)return false;try{await api('/api/profile',{method:'PUT',body:JSON.stringify({state:data})});return true}catch{return false}}
export function cloudConfigured(){return true}
export async function cloudLeaderboard(){try{return(await api('/api/leaderboard')).rows||[]}catch{return[]}}
export async function loadCloudVocabulary(){try{return(await api('/api/vocabulary')).words||[]}catch{return[]}}
export async function cloudGetProgress(){try{return await api('/api/progress')}catch{return null}}
export async function cloudRecordProgress(payload){try{return await api('/api/progress',{method:'POST',body:JSON.stringify(payload)})}catch(e){try{const q=JSON.parse(localStorage.getItem(PROGRESS_QUEUE)||'[]');const event={...payload,event_id:payload.event_id||crypto.randomUUID?.()||String(Date.now())};if(!q.some(x=>x.event_id===event.event_id)){q.push(event);localStorage.setItem(PROGRESS_QUEUE,JSON.stringify(q.slice(-1000)))} }catch{};throw e}}
export async function flushProgressQueue(){let q=[];try{q=JSON.parse(localStorage.getItem(PROGRESS_QUEUE)||'[]')}catch{};if(!q.length)return 0;const left=[];for(const item of q){try{await api('/api/progress',{method:'POST',body:JSON.stringify(item)})}catch{left.push(item)}}try{localStorage.setItem(PROGRESS_QUEUE,JSON.stringify(left))}catch{};return q.length-left.length}
export async function cloudStartLesson(mode,total){return api('/api/lessons',{method:'POST',body:JSON.stringify({mode,total})})}
export async function cloudFinishLesson(lessonId){return api('/api/lessons',{method:'PATCH',body:JSON.stringify({lessonId})})}
export {hashPassword}
