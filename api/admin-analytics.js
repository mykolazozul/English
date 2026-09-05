import {sqlClient,json,requireAdmin} from '../lib/server/db.js';

export default async function handler(req,res){
  try{
    const admin=await requireAdmin(req,res); if(!admin)return json(res,403,{ok:false});
    if(req.method!=='GET') return json(res,405,{ok:false});
    const sql=sqlClient();
    const days=Math.max(1,Math.min(90,Number(req.query?.days)||30));
    const since=days===90?90:days;

    const [overview,daily,modes,learning,vocab,users,social,security,system,errors,funnel,retention]=await Promise.all([
      sql`SELECT
        (SELECT count(*)::int FROM users WHERE status<>'deleted') AS total_users,
        (SELECT count(*)::int FROM users WHERE status='active') AS active_users,
        (SELECT count(DISTINCT user_id)::int FROM analytics_events WHERE user_id IS NOT NULL AND created_at>=now()-(${since}||' days')::interval) AS active_period,
        (SELECT count(*)::int FROM users WHERE created_at>=now()-(${since}||' days')::interval AND status<>'deleted') AS new_users,
        (SELECT count(*)::int FROM lesson_sessions WHERE started_at>=now()-(${since}||' days')::interval) AS lessons_started,
        (SELECT count(*)::int FROM lesson_sessions WHERE completed_at IS NOT NULL AND started_at>=now()-(${since}||' days')::interval) AS lessons_completed,
        (SELECT count(*)::int FROM progress_events WHERE created_at>=now()-(${since}||' days')::interval) AS answers,
        (SELECT count(*)::int FROM progress_events WHERE correct AND created_at>=now()-(${since}||' days')::interval) AS correct_answers,
        (SELECT COALESCE(sum(GREATEST(points,0)),0)::int FROM progress_events WHERE created_at>=now()-(${since}||' days')::interval) AS xp_earned,
        (SELECT count(*)::int FROM user_achievements WHERE earned_at>=now()-(${since}||' days')::interval) AS achievements_earned`,
      sql`WITH d AS (SELECT generate_series(current_date-(${since-1}),current_date,'1 day')::date AS day),
        a AS (SELECT created_at::date day,count(DISTINCT user_id)::int users,count(*)::int events FROM analytics_events WHERE created_at>=current_date-(${since-1}) GROUP BY 1),
        p AS (SELECT created_at::date day,count(*)::int answers,count(*) FILTER(WHERE correct)::int correct FROM progress_events WHERE created_at>=current_date-(${since-1}) GROUP BY 1)
        SELECT d.day,COALESCE(a.users,0)::int users,COALESCE(a.events,0)::int events,COALESCE(p.answers,0)::int answers,COALESCE(p.correct,0)::int correct FROM d LEFT JOIN a USING(day) LEFT JOIN p USING(day) ORDER BY d.day`,
      sql`SELECT ls.mode,count(*)::int starts,count(*) FILTER(WHERE ls.completed_at IS NOT NULL)::int completions,
        COALESCE(round((avg(EXTRACT(EPOCH FROM (ls.completed_at-ls.started_at))/60.0) FILTER(WHERE ls.completed_at IS NOT NULL))::numeric,2),0)::float avg_minutes,
        COALESCE(round(100.0*sum(ls.correct_count)/NULLIF(sum(ls.answer_count),0),1),0)::float accuracy
        FROM lesson_sessions ls WHERE ls.started_at>=now()-(${since}||' days')::interval GROUP BY ls.mode ORDER BY starts DESC`,
      sql`SELECT
        count(*) FILTER(WHERE uv.attempts=0)::int new_cards,
        count(DISTINCT uv.user_id::text||':'||uv.notion_id)::int reviewed_cards,
        count(*) FILTER(WHERE uv.attempts>0)::int studied_cards,
        count(*) FILTER(WHERE uv.mastery>=8)::int mastered_cards,
        count(*) FILTER(WHERE (uv.srs->>'dueAt') IS NOT NULL AND (uv.srs->>'dueAt')::timestamptz<=now())::int due_cards,
        COALESCE(round(100.0*sum(uv.correct)/NULLIF(sum(uv.attempts),0),1),0)::float accuracy,
        COALESCE(round(avg(uv.attempts),1),0)::float avg_attempts,
        COALESCE(round(avg(GREATEST(0,uv.mastery)),1),0)::float avg_mastery,
        (SELECT count(*)::int FROM progress_events WHERE mode='srs' AND created_at>=now()-(${since}||' days')::interval) AS srs_reviews,
        (SELECT COALESCE(round(100.0*count(*) FILTER(WHERE correct)/NULLIF(count(*),0),1),0)::float FROM progress_events WHERE mode='srs' AND created_at>=now()-(${since}||' days')::interval) AS srs_accuracy
        FROM user_vocabulary uv`,
      sql`WITH w AS (SELECT v.word,v.notion_id,v.level,v.category,COUNT(pe.*)::int reviews,COUNT(*) FILTER(WHERE pe.correct)::int correct,COUNT(*) FILTER(WHERE NOT pe.correct)::int wrong FROM vocabulary v JOIN progress_events pe ON pe.notion_id=v.notion_id WHERE pe.created_at>=now()-(${since}||' days')::interval GROUP BY v.notion_id,v.word,v.level,v.category)
        SELECT word,level,category,reviews,correct,wrong,round(100.0*wrong/NULLIF(reviews,0),1)::float error_rate FROM w ORDER BY wrong DESC,reviews DESC LIMIT 20`,
      sql`SELECT
        (SELECT count(*)::int FROM vocabulary v WHERE v.archived=false AND NOT EXISTS(SELECT 1 FROM progress_events pe WHERE pe.notion_id=v.notion_id)) AS never_shown,
        (SELECT count(*)::int FROM vocabulary WHERE archived=false) AS vocabulary_total,
        (SELECT count(*)::int FROM vocabulary WHERE archived=false AND length(word)>=7) AS long_words,
        (SELECT count(*)::int FROM vocabulary WHERE archived=false AND level IN ('A1','A2','B1','B2','C1','C2')) AS cefr_tagged`,
      sql`SELECT
        count(*) FILTER(WHERE status='active')::int active,
        count(*) FILTER(WHERE status='suspended')::int suspended,
        count(*) FILTER(WHERE status='deleted')::int deleted,
        count(*) FILTER(WHERE created_at>=current_date)::int new_today,
        count(*) FILTER(WHERE created_at>=current_date-7)::int new_7d,
        count(*) FILTER(WHERE created_at>=current_date-30)::int new_30d
        FROM users`,
      sql`SELECT
        (SELECT count(*)::int FROM friendships WHERE status='accepted') AS friendships,
        (SELECT count(*)::int FROM friendships WHERE status='pending') AS pending_requests,
        (SELECT count(*)::int FROM messages WHERE created_at>=now()-(${since}||' days')::interval AND deleted_at IS NULL) AS messages_sent,
        (SELECT count(*)::int FROM challenges WHERE created_at>=now()-(${since}||' days')::interval) AS challenges_created,
        (SELECT count(*)::int FROM challenge_participants WHERE joined_at>=now()-(${since}||' days')::interval) AS challenge_joins,
        (SELECT count(*)::int FROM challenge_participants WHERE completed_at IS NOT NULL AND joined_at>=now()-(${since}||' days')::interval) AS challenge_completions`,
      sql`SELECT
        (SELECT count(*)::int FROM security_events WHERE created_at>=now()-(${since}||' days')::interval) AS security_events,
        (SELECT count(*)::int FROM login_attempts WHERE success=false AND created_at>=now()-(${since}||' days')::interval) AS failed_logins,
        (SELECT count(*)::int FROM reports WHERE status='open') AS open_reports,
        (SELECT count(*)::int FROM reports WHERE created_at>=now()-(${since}||' days')::interval) AS reports_period`,
      sql`SELECT
        (SELECT count(*)::int FROM sessions WHERE expires_at>now()) AS active_sessions,
        (SELECT count(*)::int FROM progress_events WHERE created_at>=now()-interval '1 hour') AS answers_hour,
        (SELECT count(*)::int FROM analytics_events WHERE event_name='error' AND created_at>=now()-interval '1 hour') AS errors_hour,
        (SELECT count(*)::int FROM analytics_events WHERE event_name='realtime_open' AND created_at>=now()-(${since}||' days')::interval) AS realtime_opens,
        (SELECT count(*)::int FROM analytics_events WHERE event_name='realtime_reconnect' AND created_at>=now()-(${since}||' days')::interval) AS realtime_reconnects,
        (SELECT count(*)::int FROM analytics_events WHERE event_name='realtime_error' AND created_at>=now()-(${since}||' days')::interval) AS realtime_errors`,
      sql`SELECT COALESCE(event_data->>'message','unknown') message,count(*)::int n FROM analytics_events WHERE event_name='error' AND created_at>=now()-(${since}||' days')::interval GROUP BY 1 ORDER BY n DESC LIMIT 10`,
      sql`SELECT
        (SELECT count(*)::int FROM analytics_events WHERE event_name='app_open' AND created_at>=now()-(${since}||' days')::interval) app_opens,
        (SELECT count(*)::int FROM lesson_sessions WHERE started_at>=now()-(${since}||' days')::interval) lessons_started,
        (SELECT count(*)::int FROM progress_events WHERE created_at>=now()-(${since}||' days')::interval) first_answers,
        (SELECT count(*)::int FROM lesson_sessions WHERE completed_at IS NOT NULL AND started_at>=now()-(${since}||' days')::interval) lessons_completed`,
      sql`WITH cohorts AS (
        SELECT id,created_at::date cohort FROM users WHERE created_at>=current_date-90 AND status<>'deleted'
      ), activity AS (
        SELECT DISTINCT user_id,created_at::date day FROM analytics_events WHERE user_id IS NOT NULL AND created_at>=current_date-120
      ) SELECT c.cohort,count(*)::int cohort_size,
        count(*) FILTER(WHERE EXISTS(SELECT 1 FROM activity a WHERE a.user_id=c.id AND a.day>=c.cohort+1 AND a.day<=c.cohort+1))::int d1,
        count(*) FILTER(WHERE EXISTS(SELECT 1 FROM activity a WHERE a.user_id=c.id AND a.day>=c.cohort+7 AND a.day<=c.cohort+7))::int d7,
        count(*) FILTER(WHERE EXISTS(SELECT 1 FROM activity a WHERE a.user_id=c.id AND a.day>=c.cohort+30 AND a.day<=c.cohort+30))::int d30
        FROM cohorts c GROUP BY c.cohort ORDER BY c.cohort DESC LIMIT 30`
    ]);

    const [mostReviewed,highAccuracy,levelDistribution]=await Promise.all([
      sql`SELECT v.word,v.level,v.category,count(*)::int reviews,count(*) FILTER(WHERE pe.correct)::int correct,count(*) FILTER(WHERE NOT pe.correct)::int wrong FROM progress_events pe JOIN vocabulary v ON v.notion_id=pe.notion_id WHERE pe.created_at>=now()-(${since}||' days')::interval GROUP BY v.notion_id,v.word,v.level,v.category ORDER BY reviews DESC LIMIT 20`,
      sql`SELECT v.word,v.level,v.category,count(*)::int reviews,count(*) FILTER(WHERE pe.correct)::int correct,round(100.0*count(*) FILTER(WHERE pe.correct)/NULLIF(count(*),0),1)::float accuracy FROM progress_events pe JOIN vocabulary v ON v.notion_id=pe.notion_id WHERE pe.created_at>=now()-(${since}||' days')::interval GROUP BY v.notion_id,v.word,v.level,v.category HAVING count(*)>=5 ORDER BY accuracy DESC,reviews DESC LIMIT 20`,
      sql`SELECT COALESCE(NULLIF(level,''),'Unspecified') level,count(*)::int words FROM vocabulary WHERE archived=false GROUP BY 1 ORDER BY CASE COALESCE(NULLIF(level,''),'Unspecified') WHEN 'A1' THEN 1 WHEN 'A2' THEN 2 WHEN 'B1' THEN 3 WHEN 'B2' THEN 4 WHEN 'C1' THEN 5 WHEN 'C2' THEN 6 ELSE 99 END`
    ]);

    const o=overview[0]||{}, f=funnel[0]||{};
    const completion=Number(o.lessons_started)?Number((Number(o.lessons_completed)/Number(o.lessons_started)*100).toFixed(1)):0;
    const accuracy=Number(o.answers)?Number((Number(o.correct_answers)/Number(o.answers)*100).toFixed(1)):0;
    const avgXpUser=Number(o.active_period)?Number((Number(o.xp_earned||0)/Number(o.active_period)).toFixed(1)):0;
    const cohortRetention=retention.map(r=>({...r,d1_pct:r.cohort_size?Number((r.d1/r.cohort_size*100).toFixed(1)):0,d7_pct:r.cohort_size?Number((r.d7/r.cohort_size*100).toFixed(1)):0,d30_pct:r.cohort_size?Number((r.d30/r.cohort_size*100).toFixed(1)):0}));
    return json(res,200,{ok:true,days:since,overview:{...o,completion,accuracy,avgXpUser},daily,modes,learning:learning[0]||{},vocabulary:vocab[0]||{},weakWords:vocab,mostReviewed,highAccuracy,levelDistribution,users:users[0]||{},social:social[0]||{},security:security[0]||{},system:system[0]||{},errors,funnel:{...f,completion},retention:cohortRetention});
  }catch(e){
    console.error('admin analytics',e);
    return json(res,500,{ok:false,error:'Analytics dashboard failed'});
  }
}
