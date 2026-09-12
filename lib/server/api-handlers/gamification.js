import {sqlClient,json,parseBody,requireUser} from '../db.js';

// League thresholds — XP → league name (synchronized with src/data.js)
const LEAGUES=[
  {id:'legend',label:'👑 Легенда',min:3500},
  {id:'diamond',label:'🔮 Діамант',min:2000},
  {id:'platinum',label:'💎 Платина',min:1000},
  {id:'gold',label:'🥇 Золото',min:500},
  {id:'silver',label:'🥈 Срібло',min:200},
  {id:'bronze',label:'🥉 Бронза',min:100},
  {id:'beginner',label:'🌱 Новачок',min:0},
];
export function leagueForXp(xp){
  const n=Number(xp)||0;
  for(const l of LEAGUES){if(n>=l.min)return l;}
  return LEAGUES[LEAGUES.length-1];
}
function nextLeague(xp){
  const n=Number(xp)||0;
  for(let i=LEAGUES.length-1;i>=0;i--){
    if(LEAGUES[i].min>n)return LEAGUES[i];
  }
  return null;
}

// Generate 3 daily quests for user (deterministic by date so same quests all day)
function generateQuests(date){
  const seed=date.replace(/-/g,'');
  const h=s=>{let h=0x811c9dc5;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0};
  const types=['lesson','sprint','accuracy','streak_answers','words'];
  const configs={
    lesson:{type:'lesson',label:'Пройти 1 урок',goal:1,xp:25,icon:'📖'},
    sprint:{type:'sprint',label:'Набрати 20 XP у Спринті',goal:20,xp:20,icon:'⚡'},
    accuracy:{type:'accuracy',label:'Відповісти правильно 7 разів поспіль',goal:7,xp:30,icon:'🎯'},
    streak_answers:{type:'streak_answers',label:'Дати 15 правильних відповідей',goal:15,xp:20,icon:'✅'},
    words:{type:'words',label:'Вивчити 2 нових слова',goal:2,xp:25,icon:'📚'},
  };
  const picked=[];
  const avail=[...types];
  for(let i=0;i<3&&avail.length;i++){
    const idx=h(seed+i)%avail.length;
    picked.push(configs[avail[idx]]);
    avail.splice(idx,1);
  }
  return picked;
}

export default async function handler(req,res){
  try{
    const me=await requireUser(req,res);
    if(!me)return json(res,401,{ok:false,error:'Unauthorized'});
    const sql=sqlClient();
    const today=new Date().toISOString().slice(0,10);

    if(req.method==='GET'){
      // Ensure new columns exist (graceful — no crash if migration not run yet)
      try{await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS freeze_count INT DEFAULT 0`;}catch{}
      try{await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_gift_at DATE`;}catch{}
      try{await sql`CREATE TABLE IF NOT EXISTS daily_quests(
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id),
        date DATE NOT NULL DEFAULT CURRENT_DATE,
        quest_type TEXT NOT NULL,
        label TEXT NOT NULL DEFAULT '',
        goal INT NOT NULL,
        progress INT DEFAULT 0,
        completed BOOLEAN DEFAULT FALSE,
        xp_reward INT DEFAULT 20,
        icon TEXT DEFAULT '🎯',
        UNIQUE(user_id,date,quest_type)
      )`;}catch{}
      try{await sql`CREATE INDEX IF NOT EXISTS idx_daily_quests_user_date ON daily_quests(user_id,date)`;}catch{}

      // Load user data
      const [uRows, gRows, glRows, frRows]=await Promise.all([
        sql`SELECT xp,streak,freeze_count,last_gift_at FROM users WHERE id=${me.id}`,
        // Today's quests
        sql`SELECT quest_type,label,goal,progress,completed,xp_reward,icon FROM daily_quests WHERE user_id=${me.id} AND date=${today}`,
        // Global leaderboard top 50 with league
        sql`SELECT u.nick,u.name,u.xp,u.streak,u.avatar
            FROM users u
            LEFT JOIN privacy_settings p ON p.user_id=u.id
            WHERE u.status='active' AND COALESCE(p.show_leaderboard,true)=true
            ORDER BY u.xp DESC,u.updated_at ASC LIMIT 50`,
        // Friends leaderboard
        sql`SELECT u.nick,u.name,u.xp,u.streak,u.avatar
            FROM users u
            LEFT JOIN privacy_settings p ON p.user_id=u.id
            WHERE (u.id=${me.id} OR u.id IN (
              SELECT CASE WHEN f.user_id=${me.id} THEN f.friend_id ELSE f.user_id END
              FROM friendships f WHERE (f.user_id=${me.id} OR f.friend_id=${me.id}) AND f.status='accepted'
            )) AND u.status='active' AND (u.id=${me.id} OR COALESCE(p.show_leaderboard,true)=true)
            ORDER BY u.xp DESC LIMIT 50`,
      ]);

      const u=uRows[0]||{};
      const xp=Number(u.xp||0);
      const league=leagueForXp(xp);
      const next=nextLeague(xp);
      const freezeCount=Number(u.freeze_count||0);
      const lastGift=u.last_gift_at?String(u.last_gift_at).slice(0,10):null;
      const giftAvailable=lastGift!==today;

      // Seed quests if none today
      let quests=gRows;
      if(!quests.length){
        const defs=generateQuests(today);
        for(const d of defs){
          try{
            await sql`INSERT INTO daily_quests(user_id,date,quest_type,label,goal,xp_reward,icon)
              VALUES(${me.id},${today},${d.type},${d.label},${d.goal},${d.xp},${d.icon})
              ON CONFLICT(user_id,date,quest_type) DO NOTHING`;
          }catch{}
        }
        quests=await sql`SELECT quest_type,label,goal,progress,completed,xp_reward,icon FROM daily_quests WHERE user_id=${me.id} AND date=${today}`;
      }

      const addLeague=rows=>rows.map(r=>({...r,xp:Number(r.xp)||0,streak:Number(r.streak)||0,league:leagueForXp(r.xp)}));

      return json(res,200,{
        ok:true,
        xp,
        league:league.id,
        leagueLabel:league.label,
        leagueMin:league.min,
        nextLeague:next?next.id:null,
        nextLeagueLabel:next?next.label:null,
        nextLeagueAt:next?next.min:null,
        freezeCount,
        giftAvailable,
        quests:quests.map(q=>({...q,progress:Number(q.progress||0),goal:Number(q.goal||0),xp_reward:Number(q.xp_reward||0)})),
        leaderboard:{
          global:addLeague(glRows),
          friends:addLeague(frRows),
        },
      });
    }

    if(req.method==='POST'){
      const b=parseBody(req);
      const action=String(b.action||'');

      // Use a streak freeze
      if(action==='use_freeze'){
        const u=(await sql`SELECT freeze_count,streak FROM users WHERE id=${me.id}`)[0];
        const fc=Number(u?.freeze_count||0);
        if(fc<=0)return json(res,400,{ok:false,error:'Немає заморозок'});
        await sql`UPDATE users SET freeze_count=freeze_count-1,updated_at=now() WHERE id=${me.id}`;
        return json(res,200,{ok:true,freezeCount:fc-1});
      }

      // Buy a freeze for 50 XP
      if(action==='buy_freeze'){
        const u=(await sql`SELECT xp,freeze_count FROM users WHERE id=${me.id} FOR UPDATE`)[0];
        if(Number(u?.xp||0)<50)return json(res,400,{ok:false,error:'Недостатньо XP (потрібно 50)'});
        await sql`UPDATE users SET xp=xp-50,freeze_count=COALESCE(freeze_count,0)+1,updated_at=now() WHERE id=${me.id}`;
        return json(res,200,{ok:true,freezeCount:Number(u.freeze_count||0)+1,xp:Number(u.xp||0)-50});
      }

      // Open daily gift
      if(action==='open_gift'){
        const u=(await sql`SELECT last_gift_at,xp FROM users WHERE id=${me.id} FOR UPDATE`)[0];
        const lastGift=u?.last_gift_at?String(u.last_gift_at).slice(0,10):null;
        if(lastGift===today)return json(res,409,{ok:false,error:'Скриня вже відкрита сьогодні'});
        // Random prize
        const roll=Math.random();
        let prize,xpGain=0,freezeGain=0;
        if(roll<0.15){prize='freeze';freezeGain=1;}
        else if(roll<0.45){prize='xp_100';xpGain=100;}
        else if(roll<0.75){prize='xp_50';xpGain=50;}
        else{prize='xp_25';xpGain=25;}
        await sql`UPDATE users SET
          last_gift_at=${today},
          xp=xp+${xpGain},
          freeze_count=COALESCE(freeze_count,0)+${freezeGain},
          updated_at=now()
          WHERE id=${me.id}`;
        return json(res,200,{ok:true,prize,xpGain,freezeGain,newXp:Number(u.xp||0)+xpGain});
      }

      // Update quest progress (called after lesson/sprint)
      if(action==='quest_progress'){
        const type=String(b.quest_type||'');
        const delta=Math.max(0,Math.min(1000,Number(b.delta||1)));
        if(!type)return json(res,400,{ok:false,error:'quest_type required'});
        const rows=await sql`
          UPDATE daily_quests SET
            progress=LEAST(goal,progress+${delta}),
            completed=CASE WHEN LEAST(goal,progress+${delta})>=goal THEN true ELSE completed END
          WHERE user_id=${me.id} AND date=${today} AND quest_type=${type} AND completed=false
          RETURNING quest_type,progress,goal,completed,xp_reward`;
        const q=rows[0];
        if(q?.completed){
          // Award XP bonus for completing quest
          await sql`UPDATE users SET xp=xp+${Number(q.xp_reward||20)},updated_at=now() WHERE id=${me.id}`;
        }
        // Check if all 3 quests done → bonus 50 XP
        const all=await sql`SELECT count(*) FILTER(WHERE completed) AS done,count(*) AS total FROM daily_quests WHERE user_id=${me.id} AND date=${today}`;
        const allDone=Number(all[0]?.done||0)>=3&&Number(all[0]?.total||0)>=3;
        const alreadyBonused=await sql`SELECT 1 FROM daily_quests WHERE user_id=${me.id} AND date=${today} AND quest_type='_bonus'`;
        if(allDone&&!alreadyBonused[0]){
          await sql`INSERT INTO daily_quests(user_id,date,quest_type,label,goal,progress,completed,xp_reward,icon)
            VALUES(${me.id},${today},'_bonus','Бонус за всі квести',1,1,true,50,'🎉') ON CONFLICT DO NOTHING`;
          await sql`UPDATE users SET xp=xp+50,updated_at=now() WHERE id=${me.id}`;
          return json(res,200,{ok:true,quest:q,allQuestsDone:true,bonusXp:50});
        }
        return json(res,200,{ok:true,quest:q,allQuestsDone:allDone});
      }

      return json(res,400,{ok:false,error:'Unknown action'});
    }

    return json(res,405,{ok:false});
  }catch(e){return json(res,500,{ok:false,error:'Gamification failed'})}
}
