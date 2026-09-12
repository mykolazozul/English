import {sqlClient,json,parseBody,requireUser} from '../db.js';
const MAX_PROFILE_JSON=50000;
function safeState(input){const s=input&&typeof input==='object'?{...input}:{};for(const k of ['admin','passHash','password','adminPassword','password_hash','role','id','xp','streak','todayXp','today','mastery','srs','attempts','history','badges','nickHash'])delete s[k];if(s.admin&&typeof s.admin==='object'){const a={...s.admin};delete a.adminPassword;delete a.password;s.admin=a}return s}
export default async function handler(req,res){try{
  const sql=sqlClient();
  // ── Public profile lookup (?nick=XYZ, no auth required) ──────────────
  const nickParam=req.query?.nick||new URL('http://x'+req.url).searchParams.get('nick');
  if(req.method==='GET'&&nickParam){
    const nick=String(nickParam).trim().slice(0,40);
    const rows=await sql`SELECT u.nick,u.name,u.xp,u.streak,u.avatar,u.status
      FROM users u
      LEFT JOIN privacy_settings p ON p.user_id=u.id
      WHERE u.nick=${nick} AND u.status='active' AND COALESCE(p.show_profile,true)=true
      LIMIT 1`;
    if(!rows[0])return json(res,404,{ok:false,error:'Profile not found'});
    const achievements=await sql`SELECT a.achievement_id FROM user_achievements a
      JOIN users u ON u.id=a.user_id
      LEFT JOIN privacy_settings p ON p.user_id=u.id
      WHERE u.nick=${nick} AND COALESCE(p.show_achievements,true)=true`;
    return json(res,200,{ok:true,profile:rows[0],achievements:achievements.map(x=>x.achievement_id)});
  }
  // ── Authenticated routes ──────────────────────────────────────────────
  const user=await requireUser(req,res);if(!user)return json(res,401,{ok:false,error:'Unauthorized'});
  if(req.method==='GET'){
    const rows=await sql`SELECT id,nick,name,role,status,xp,streak,daily_goal,today_xp,today,avatar,theme,skin,settings,profile_data,updated_at FROM users WHERE id=${user.id}`;
    const achievements=await sql`SELECT achievement_id,earned_at FROM user_achievements WHERE user_id=${user.id} ORDER BY earned_at DESC`;
    return json(res,200,{ok:true,profile:rows[0]||null,profileData:rows[0]?.profile_data||null,achievements:achievements.map(x=>x.achievement_id)});
  }
  if(req.method==='PUT'){
    const b=parseBody(req),state=safeState(b.state),raw=JSON.stringify(state);
    if(raw.length>MAX_PROFILE_JSON)return json(res,413,{ok:false,error:'Profile data too large'});
    const name=String(b.name??state.name??'').slice(0,80),daily=Math.max(1,Math.min(10000,Number(b.daily_goal??state.dailyGoal)||50)),avatar=String(b.avatar??state.avatar??'🇺🇸').slice(0,20),theme=String(b.theme??state.theme??'system').slice(0,20),skin=String(b.skin??state.skin??'classic').slice(0,30),settings=b.settings&&typeof b.settings==='object'?b.settings:(state.settings||{});
    const rows=await sql`UPDATE users SET name=${name},daily_goal=${daily},avatar=${avatar},theme=${theme},skin=${skin},settings=${JSON.stringify(settings)}::jsonb,profile_data=${raw}::jsonb,updated_at=now() WHERE id=${user.id} RETURNING id,nick,name,role,xp,streak,daily_goal,today_xp,today,avatar,theme,skin,settings,profile_data,updated_at`;
    return json(res,200,{ok:true,profile:rows[0]});
  }
  return json(res,405,{ok:false});
}catch(e){return json(res,500,{ok:false,error:'Profile failed'})}}

