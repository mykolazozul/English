import {sqlClient,json,parseBody,requireUser} from '../lib/server/db.js';
import crypto from 'crypto';

function clamp(n,a,b){return Math.max(a,Math.min(b,n))}
function eventId(value){const s=String(value||'');try{return crypto.randomUUID?crypto.randomUUID():s}catch{return s}}

async function awardAchievements(sql,userId){
  const [u,attempts,mastery,modes,accuracy,threshold]=await Promise.all([
    sql`SELECT xp,streak FROM users WHERE id=${userId}`,
    sql`SELECT count(*)::int AS n FROM lesson_attempts WHERE user_id=${userId}`,
    sql`SELECT count(*)::int AS n FROM user_vocabulary WHERE user_id=${userId} AND mastery >= COALESCE((SELECT (value #>> '{}')::int FROM admin_settings WHERE key='masteryThreshold'),8)`,
    sql`SELECT mode FROM lesson_attempts WHERE user_id=${userId} AND mode IN ('dictation','match') AND correct=true GROUP BY mode`,
    sql`SELECT count(*)::int AS total,count(*) FILTER(WHERE correct)::int AS correct FROM lesson_attempts WHERE user_id=${userId}`
  ]);
  const xp=Number(u[0]?.xp||0), streak=Number(u[0]?.streak||0), total=Number(accuracy[0]?.total||0), correct=Number(accuracy[0]?.correct||0);
  const have=new Set((await sql`SELECT achievement_id FROM user_achievements WHERE user_id=${userId}`).map(x=>x.achievement_id));
  const earned=[]; const add=async(id,yes)=>{if(yes&&!have.has(id)){await sql`INSERT INTO user_achievements(user_id,achievement_id) VALUES(${userId},${id}) ON CONFLICT DO NOTHING`;earned.push(id)}};
  await add('first_steps',Number(attempts[0]?.n||0)>=1); await add('streak_3',streak>=3); await add('streak_7',streak>=7); await add('words_20',Number(mastery[0]?.n||0)>=20); await add('words_50',Number(mastery[0]?.n||0)>=50); await add('xp_500',xp>=500); await add('xp_5000',xp>=5000); await add('streak_30',streak>=30); await add('accuracy_90',total>=100&&correct/total>=.9); await add('dictation',modes.some(x=>x.mode==='dictation')); await add('match_master',modes.some(x=>x.mode==='match')); return earned;
}

export default async function handler(req,res){try{const user=await requireUser(req,res);if(!user)return json(res,401,{ok:false,error:'Unauthorized'});const sql=sqlClient();
  if(req.method==='GET'){
    const [u,v,a,ach]=await Promise.all([
      sql`SELECT xp,streak,daily_goal,today_xp,today,avatar,theme,skin,settings FROM users WHERE id=${user.id}`,
      sql`SELECT notion_id,mastery,srs,attempts,correct,wrong,last_answered_at FROM user_vocabulary WHERE user_id=${user.id}`,
      sql`SELECT notion_id,mode,correct,points,quality,created_at FROM lesson_attempts WHERE user_id=${user.id} ORDER BY created_at DESC LIMIT 2000`,
      sql`SELECT achievement_id,earned_at FROM user_achievements WHERE user_id=${user.id} ORDER BY earned_at DESC`
    ]);return json(res,200,{ok:true,user:u[0]||null,vocabulary:v,history:a,achievements:ach.map(x=>x.achievement_id)});
  }
  if(req.method==='POST'){
    const b=parseBody(req), notion=String(b.notion_id||'').trim(), mode=String(b.mode||'sprint').slice(0,40)||'sprint';
    const lessonId=String(b.lesson_id||'');
    if(!notion)return json(res,400,{ok:false,error:'notion_id required'});if(!lessonId)return json(res,400,{ok:false,error:'lesson_id required'});
    const eid=String(b.event_id||eventId());let quality=Number(b.quality);if(!Number.isFinite(quality))quality=b.correct?4:1;quality=clamp(Math.round(quality),0,5);const correct=quality>=3;
    const result=await sql`
      WITH settings AS (
        SELECT
          COALESCE((SELECT (value #>> '{}')::int FROM admin_settings WHERE key='correctPoints'),4) AS correct_points,
          COALESCE((SELECT (value #>> '{}')::int FROM admin_settings WHERE key='wrongPoints'),-2) AS wrong_points
      ),
      existing_event AS (SELECT event_id FROM progress_events WHERE event_id=${eid} LIMIT 1),
      vocab AS (SELECT notion_id,word,translation FROM vocabulary WHERE notion_id=${notion} LIMIT 1),
      answer_check AS (SELECT CASE WHEN ${submitted}='' THEN false WHEN ${direction}='en-ua' THEN lower(trim((SELECT translation FROM vocab)))=${submitted} ELSE lower(trim((SELECT word FROM vocab)))=${submitted} END AS correct),
      old_card AS (SELECT * FROM user_vocabulary WHERE user_id=${user.id} AND notion_id=${notion} FOR UPDATE),
      calc AS (
        SELECT
          COALESCE((SELECT mastery FROM old_card),0) AS old_mastery,
          COALESCE(((SELECT srs FROM old_card)->>'stage')::int,0) AS stage,
          COALESCE(((SELECT srs FROM old_card)->>'ease')::numeric,2.5) AS ease,
          COALESCE(((SELECT srs FROM old_card)->>'interval')::int,0) AS interval,
          COALESCE(((SELECT srs FROM old_card)->>'repetitions')::int,0) AS reps,
          COALESCE(((SELECT srs FROM old_card)->>'lapses')::int,0) AS lapses
      ),
      lesson_guard AS (SELECT id FROM lesson_sessions WHERE id=NULLIF(${lessonId},'')::uuid AND user_id=${user.id} AND mode=${mode} AND completed_at IS NULL AND answer_count < max_answers_per_session FOR UPDATE),
      user_before AS (SELECT today_xp,today FROM users WHERE id=${user.id} FOR UPDATE),
      next_srs AS (
        SELECT CASE WHEN (SELECT correct FROM answer_check) THEN jsonb_build_object(
          'version',2,
          'stage',LEAST(8,stage+1),
          'ease',ROUND(GREATEST(1.3,ease + CASE WHEN CASE WHEN (SELECT correct FROM answer_check) THEN 4 ELSE 1 END=5 THEN 0.10 WHEN CASE WHEN (SELECT correct FROM answer_check) THEN 4 ELSE 1 END=3 THEN -0.15 ELSE 0 END)::numeric,2),
          'interval',CASE WHEN reps=0 THEN 1 WHEN reps=1 THEN 3 ELSE GREATEST(1,ROUND(interval * GREATEST(1.3,ease + CASE WHEN CASE WHEN (SELECT correct FROM answer_check) THEN 4 ELSE 1 END=5 THEN 0.10 WHEN CASE WHEN (SELECT correct FROM answer_check) THEN 4 ELSE 1 END=3 THEN -0.15 ELSE 0 END))) END,
          'dueAt',(current_date + (CASE WHEN reps=0 THEN 1 WHEN reps=1 THEN 3 ELSE GREATEST(1,ROUND(interval * GREATEST(1.3,ease + CASE WHEN CASE WHEN (SELECT correct FROM answer_check) THEN 4 ELSE 1 END=5 THEN 0.10 WHEN CASE WHEN (SELECT correct FROM answer_check) THEN 4 ELSE 1 END=3 THEN -0.15 ELSE 0 END))) END)::int),
          'repetitions',reps+1,
          'lapses',lapses
        ) ELSE jsonb_build_object('version',2,'stage',0,'ease',ROUND(GREATEST(1.3,ease-0.20)::numeric,2),'interval',1,'dueAt',current_date+1,'repetitions',0,'lapses',lapses+1) END AS srs
        FROM calc
      ),
      inserted_event AS (
        INSERT INTO progress_events(event_id,user_id,notion_id,lesson_id,mode,correct,quality,points)
        SELECT ${eid},${user.id},(SELECT notion_id FROM vocab),NULLIF(${lessonId},'')::uuid,${mode},(SELECT correct FROM answer_check),CASE WHEN (SELECT correct FROM answer_check) THEN 4 ELSE 1 END,CASE WHEN (SELECT correct FROM answer_check) THEN CASE WHEN user_before.today=current_date AND user_before.today_xp>=2000 THEN 0 ELSE LEAST(settings.correct_points,2000-CASE WHEN user_before.today=current_date THEN user_before.today_xp ELSE 0 END) END ELSE settings.wrong_points END
        FROM settings,user_before WHERE EXISTS(SELECT 1 FROM lesson_guard) AND NOT EXISTS(SELECT 1 FROM existing_event) RETURNING event_id,points
      ),
      card_upsert AS (
        INSERT INTO user_vocabulary(user_id,notion_id,mastery,attempts,correct,wrong,srs,last_answered_at)
        SELECT ${user.id},${notion},CASE WHEN (SELECT correct FROM answer_check) THEN 1 ELSE 0 END,1,CASE WHEN (SELECT correct FROM answer_check) THEN 1 ELSE 0 END,CASE WHEN (SELECT correct FROM answer_check) THEN 0 ELSE 1 END,next_srs.srs,now()
        FROM next_srs WHERE EXISTS(SELECT 1 FROM vocab) AND EXISTS(SELECT 1 FROM inserted_event)
        ON CONFLICT(user_id,notion_id) DO UPDATE SET mastery=GREATEST(0,user_vocabulary.mastery+CASE WHEN (SELECT correct FROM answer_check) THEN 1 ELSE 0 END),attempts=user_vocabulary.attempts+1,correct=user_vocabulary.correct+CASE WHEN (SELECT correct FROM answer_check) THEN 1 ELSE 0 END,wrong=user_vocabulary.wrong+CASE WHEN (SELECT correct FROM answer_check) THEN 0 ELSE 1 END,srs=excluded.srs,last_answered_at=now()
        RETURNING notion_id,mastery,srs,attempts,correct,wrong
      ),
      attempt_insert AS (
        INSERT INTO lesson_attempts(event_id,lesson_id,user_id,notion_id,mode,correct,points,quality)
        SELECT ${eid},NULLIF(${lessonId},'')::uuid,${user.id},(SELECT notion_id FROM vocab),${mode},(SELECT correct FROM answer_check),points,CASE WHEN (SELECT correct FROM answer_check) THEN 4 ELSE 1 END FROM inserted_event RETURNING points
      ),
      lesson_update AS (UPDATE lesson_sessions SET answer_count=answer_count+1,correct_count=correct_count+CASE WHEN (SELECT correct FROM answer_check) THEN 1 ELSE 0 END WHERE id=NULLIF(${lessonId},'')::uuid AND user_id=${user.id} AND EXISTS(SELECT 1 FROM inserted_event) RETURNING id),
      user_update AS (
        UPDATE users SET
          xp=GREATEST(0,xp+(SELECT points FROM inserted_event LIMIT 1)),
          today_xp=CASE WHEN today=current_date THEN today_xp+(SELECT points FROM inserted_event LIMIT 1) ELSE (SELECT points FROM inserted_event LIMIT 1) END,
          streak=CASE WHEN (SELECT points FROM inserted_event LIMIT 1) IS NULL THEN streak WHEN today=current_date THEN streak WHEN today=current_date-1 THEN streak+1 ELSE 1 END,
          today=current_date,updated_at=now()
        WHERE id=${user.id} AND EXISTS(SELECT 1 FROM inserted_event)
        RETURNING xp,streak,today_xp,today
      )
      SELECT (SELECT points FROM inserted_event LIMIT 1) AS points,(SELECT xp FROM user_update LIMIT 1) AS xp,(SELECT streak FROM user_update LIMIT 1) AS streak,(SELECT today_xp FROM user_update LIMIT 1) AS today_xp,(SELECT today FROM user_update LIMIT 1) AS today,(SELECT count(*) FROM existing_event)::int AS duplicate,(SELECT count(*) FROM lesson_guard)::int AS lesson_allowed,(SELECT row_to_json(card_upsert) FROM card_upsert LIMIT 1) AS card`;
    const r=result[0]||{};if(Number(r.lesson_allowed||0)===0)return json(res,409,{ok:false,error:'Lesson expired or answer limit reached'});if(Number(r.duplicate)>0)return json(res,200,{ok:true,duplicate:true,user:{xp:r.xp,streak:r.streak,todayXp:r.today_xp,today:r.today}});
    const earned=await awardAchievements(sql,user.id);return json(res,200,{ok:true,points:Number(r.points||0),user:{xp:r.xp,streak:r.streak,todayXp:r.today_xp,today:r.today},card:r.card||null,earned});
  }
  return json(res,405,{ok:false});
}catch(e){return json(res,500,{ok:false,error:'Progress failed'})}}
