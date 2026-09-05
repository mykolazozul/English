import { sqlClient, json } from '../lib/server/db.js';
export default async function handler(req,res){
  try{ if(req.method!=='GET') return json(res,405,{ok:false}); const sql=sqlClient(); const rows=await sql`SELECT notion_id AS id,word,translation,pronunciation,category,level,explanation,example,notion_url AS "notionUrl",added FROM vocabulary WHERE archived=false ORDER BY word`; return json(res,200,{ok:true,count:rows.length,words:rows}); }
  catch(e){return json(res,500,{ok:false,error:e.message||'Vocabulary failed'});}
}
