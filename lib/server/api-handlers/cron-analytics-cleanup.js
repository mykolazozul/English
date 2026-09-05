import {sqlClient,json} from '../db.js';
export default async function handler(req,res){
  try{
    const auth=req.headers.authorization||'';
    if(!process.env.CRON_SECRET || auth!==`Bearer ${process.env.CRON_SECRET}`) return json(res,401,{ok:false});
    const sql=sqlClient();
    const setting=await sql`SELECT COALESCE((SELECT (value#>>'{}')::int FROM admin_settings WHERE key='analyticsRetentionDays'),180)::int AS days`;
    const days=Math.max(30,Math.min(3650,Number(setting[0]?.days)||180));
    const result=await sql`DELETE FROM analytics_events WHERE created_at<now()-(${days}||' days')::interval RETURNING id`;
    return json(res,200,{ok:true,days,deleted:result.length});
  }catch(e){console.error('analytics cleanup',e);return json(res,500,{ok:false,error:'Analytics cleanup failed'});}
}
