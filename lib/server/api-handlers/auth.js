import crypto from 'crypto';
import {sqlClient,json,parseBody,setSessionCookie,clearSessionCookie,cookie,publicUser,getIp} from '../db.js';

const SESSION_DAYS=30, WINDOW_MS=15*60*1000, MAX_FAILS=8;

function validNick(n){return /^[A-Za-z0-9_.-]{2,24}$/.test(n)}

function hashPassword(password,salt){
  return crypto.scryptSync(String(password),salt,64,{N:32768,r:8,p:1,maxmem:64*1024*1024}).toString('hex');
}

function verifyPassword(password,stored){
  const raw=String(stored||'');
  if(raw.startsWith('s2$')){
    const [,salt,hash]=raw.split('$');
    if(!salt||!hash)return false;
    const got=hashPassword(password,salt);
    return got.length===hash.length&&crypto.timingSafeEqual(Buffer.from(got),Buffer.from(hash));
  }
  const [salt,hash]=raw.split(':');
  if(!salt||!hash)return false;
  const got=crypto.scryptSync(String(password),salt,64).toString('hex');
  return got.length===hash.length&&crypto.timingSafeEqual(Buffer.from(got),Buffer.from(hash));
}

function passwordRecord(password){
  const salt=crypto.randomBytes(16).toString('hex');
  return `s2$${salt}$${hashPassword(password,salt)}`;
}

function generateRecoveryCode(){
  const h=crypto.randomBytes(4).toString('hex').toUpperCase();
  return `EF-${h.slice(0,4)}-${h.slice(4)}`;
}

const DUMMY_SALT='english-flow-dummy-salt-rotate-me';
const DUMMY_HASH=hashPassword('dummy-password',DUMMY_SALT);

function token(){
  return crypto.randomBytes(32).toString('hex');
}

async function rateLimited(sql,nick,ip){
  const [r,i]=await Promise.all([
    sql`SELECT count(*)::int AS n FROM login_attempts WHERE nick_key=lower(${nick}) AND success=false AND created_at>now()-interval '15 minutes'`,
    sql`SELECT count(*)::int AS n FROM login_attempts WHERE ip_hash=encode(digest(${ip},'sha256'),'hex') AND success=false AND created_at>now()-interval '15 minutes'`,
    sql`DELETE FROM login_attempts WHERE created_at<now()-interval '2 days'`
  ]);
  return Number(r[0]?.n||0)>=MAX_FAILS||Number(i[0]?.n||0)>=20;
}

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method==='OPTIONS')return json(res,200,{ok:true});

  try{
    const sql=sqlClient();
    const body=parseBody(req);
    const action=body.action||'me';
    const nick=String(body.nick||'').trim();
    const password=String(body.password||'');
    const ip=getIp(req);

    // Auto-migrate recovery columns if missing
    try{
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS recovery_question TEXT`;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS recovery_answer_hash TEXT`;
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS recovery_code TEXT`;
    }catch{}

    if(action==='me'){
      const t=cookie(req,'__Host-ef_session');
      if(!t)return json(res,200,{ok:true,user:null});
      const rows=await sql`SELECT u.id,u.nick,u.name,u.role,u.status,u.recovery_question,u.recovery_code FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=encode(digest(${t},'sha256'),'hex') AND s.expires_at>now() LIMIT 1`;
      if(!rows[0])return json(res,200,{ok:true,user:null});
      return json(res,200,{
        ok:true,
        user:publicUser(rows[0]),
        recovery_code:rows[0].recovery_code||null,
        recovery_question:rows[0].recovery_question||null
      });
    }

    if(action==='logout'){
      const t=cookie(req,'__Host-ef_session');
      if(t)await sql`DELETE FROM sessions WHERE token_hash=encode(digest(${t},'sha256'),'hex')`;
      clearSessionCookie(res);
      return json(res,200,{ok:true});
    }

    if(action==='check'){
      if(!validNick(nick))return json(res,200,{ok:true,taken:false});
      const rows=await sql`SELECT 1 FROM users WHERE lower(nick)=lower(${nick}) AND status<>'deleted' LIMIT 1`;
      return json(res,200,{ok:true,taken:!!rows[0]});
    }

    if(action==='change_password'){
      const t=cookie(req,'__Host-ef_session');
      if(!t)return json(res,401,{ok:false,error:'Потрібно авторизуватись'});
      const u=(await sql`SELECT u.id,u.nick,u.password_hash FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=encode(digest(${t},'sha256'),'hex') AND s.expires_at>now() LIMIT 1`)[0];
      if(!u)return json(res,401,{ok:false,error:'Сесія закінчилась'});
      const oldPass=String(body.oldPassword||''),newPass=String(body.newPassword||'');
      if(!verifyPassword(oldPass,u.password_hash))return json(res,400,{ok:false,error:'Невірний поточний пароль'});
      if(newPass.length<8)return json(res,400,{ok:false,error:'Новий пароль має бути мінімум 8 символів'});
      await sql`UPDATE users SET password_hash=${passwordRecord(newPass)},updated_at=now() WHERE id=${u.id}`;
      return json(res,200,{ok:true,message:'Пароль успішно змінено'});
    }

    // Set or update security question for current user
    if(action==='set_recovery'){
      const t=cookie(req,'__Host-ef_session');
      if(!t)return json(res,401,{ok:false,error:'Потрібно авторизуватись'});
      const u=(await sql`SELECT u.id FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=encode(digest(${t},'sha256'),'hex') AND s.expires_at>now() LIMIT 1`)[0];
      if(!u)return json(res,401,{ok:false,error:'Сесія закінчилась'});
      const question=String(body.question||'').trim();
      const answer=String(body.answer||'').trim().toLowerCase();
      if(!question||!answer)return json(res,400,{ok:false,error:'Вкажіть питання та відповідь'});
      const answerHash=passwordRecord(answer);
      await sql`UPDATE users SET recovery_question=${question},recovery_answer_hash=${answerHash},updated_at=now() WHERE id=${u.id}`;
      return json(res,200,{ok:true,message:'Секретне питання успішно збережено'});
    }

    // Self-service password recovery: get user's recovery question
    if(action==='get_recovery_question'){
      if(!validNick(nick))return json(res,400,{ok:false,error:'Вкажіть коректний нік'});
      const rows=await sql`SELECT recovery_question,recovery_answer_hash,recovery_code FROM users WHERE lower(nick)=lower(${nick}) AND status<>'deleted' LIMIT 1`;
      const u=rows[0];
      if(!u)return json(res,404,{ok:false,error:'Користувача з таким ніком не знайдено'});
      return json(res,200,{
        ok:true,
        hasQuestion:!!u.recovery_answer_hash,
        question:u.recovery_question||'Секретне питання не встановлено. Скористайтеся 10-значним резервним кодом відновлення (EF-XXXX-XXXX).'
      });
    }

    // Self-service password recovery: verify answer or backup code and set new password
    if(action==='reset_password'){
      if(!validNick(nick))return json(res,400,{ok:false,error:'Вкажіть коректний нік'});
      if(await rateLimited(sql,nick,ip))return json(res,429,{ok:false,error:'Забагато невдалих спроб. Зачекайте 15 хвилин.'});
      const answerOrCode=String(body.answerOrCode||'').trim();
      const newPassword=String(body.newPassword||'');
      if(!answerOrCode)return json(res,400,{ok:false,error:'Вкажіть відповідь на питання або резервний код'});
      if(newPassword.length<8)return json(res,400,{ok:false,error:'Новий пароль має містити мінімум 8 символів'});

      const rows=await sql`SELECT id,nick,password_hash,recovery_question,recovery_answer_hash,recovery_code FROM users WHERE lower(nick)=lower(${nick}) AND status='active' LIMIT 1`;
      const u=rows[0];
      if(!u){
        await sql`INSERT INTO login_attempts(nick_key,ip_hash,success) VALUES(lower(${nick}),encode(digest(${ip},'sha256'),'hex'),false)`;
        return json(res,404,{ok:false,error:'Користувача не знайдено'});
      }

      // Check backup recovery code first (case and dash insensitive)
      const cleanCode=answerOrCode.replace(/[^A-Za-z0-9]/g,'').toUpperCase();
      const storedCode=(u.recovery_code||'').replace(/[^A-Za-z0-9]/g,'').toUpperCase();
      const codeMatches=Boolean(storedCode && cleanCode===storedCode);

      // Check security answer
      const answerMatches=Boolean(u.recovery_answer_hash && verifyPassword(answerOrCode.toLowerCase(),u.recovery_answer_hash));

      if(!codeMatches && !answerMatches){
        await sql`INSERT INTO login_attempts(nick_key,ip_hash,success) VALUES(lower(${nick}),encode(digest(${ip},'sha256'),'hex'),false)`;
        return json(res,400,{ok:false,error:'Невірна відповідь або недійсний резервний код'});
      }

      // Valid recovery! Update password and record success
      await sql`UPDATE users SET password_hash=${passwordRecord(newPassword)},updated_at=now() WHERE id=${u.id}`;
      await sql`INSERT INTO login_attempts(nick_key,ip_hash,success) VALUES(lower(${nick}),encode(digest(${ip},'sha256'),'hex'),true)`;
      return json(res,200,{ok:true,message:'Пароль успішно відновлено! Тепер ви можете увійти.'});
    }

    if(action!=='register'&&action!=='login')return json(res,400,{ok:false,error:'Unknown action'});
    if(!validNick(nick))return json(res,400,{ok:false,error:'Нік: 2–24 символи, тільки латиниця, цифри, _, ., -'});
    if(await rateLimited(sql,nick,ip))return json(res,429,{ok:false,error:'Забагато невдалих спроб. Спробуй через 15 хвилин.'});

    if(action==='register'){
      if(password.length<12)return json(res,400,{ok:false,error:'Пароль мінімум 12 символів'});
      if(!/[a-z]/.test(password)||!/[A-Z]/.test(password)||!/[0-9]/.test(password))return json(res,400,{ok:false,error:'Пароль має містити великі/малі літери та цифру'});
      const name=String(body.name||nick).trim().slice(0,80)||nick;
      const recoveryCode=generateRecoveryCode();
      const recoveryQuestion=String(body.recoveryQuestion||'').trim()||null;
      const recoveryAnswer=String(body.recoveryAnswer||'').trim().toLowerCase();
      const recoveryAnswerHash=recoveryAnswer?passwordRecord(recoveryAnswer):null;

      try{
        const rows=await sql`INSERT INTO users(nick,name,password_hash,recovery_code,recovery_question,recovery_answer_hash)
          VALUES(${nick},${name},${passwordRecord(password)},${recoveryCode},${recoveryQuestion},${recoveryAnswerHash})
          RETURNING id,nick,name,role,recovery_code`;
        const t=token();
        await sql`INSERT INTO sessions(user_id,token_hash,expires_at) VALUES(${rows[0].id},encode(digest(${t},'sha256'),'hex'),now()+interval '30 days')`;
        await sql`INSERT INTO login_attempts(nick_key,ip_hash,success) VALUES(lower(${nick}),encode(digest(${ip},'sha256'),'hex'),true)`;
        setSessionCookie(res,t);
        return json(res,201,{ok:true,user:publicUser(rows[0]),recovery_code:recoveryCode});
      }catch(e){
        if(String(e.message).toLowerCase().includes('unique'))return json(res,409,{ok:false,error:'Такий нік уже зайнятий'});
        throw e;
      }
    }

    // Login action
    const rows=await sql`SELECT id,nick,name,role,password_hash,status,banned_until,recovery_code FROM users WHERE lower(nick)=lower(${nick}) LIMIT 1`;
    const u=rows[0];
    const passwordOk=verifyPassword(password,u?.password_hash||`s2$${DUMMY_SALT}$${DUMMY_HASH}`);
    const valid=u&&u.status==='active'&&(!u.banned_until||new Date(u.banned_until)<=new Date())&&passwordOk;

    await sql`INSERT INTO login_attempts(nick_key,ip_hash,success) VALUES(lower(${nick}),encode(digest(${ip},'sha256'),'hex'),${!!valid})`;
    if(!valid)return json(res,401,{ok:false,error:'Невірний нік або пароль'});

    // Migrate password hash to modern scheme if needed
    if(String(u.password_hash||'').startsWith('s2$')===false) {
      await sql`UPDATE users SET password_hash=${passwordRecord(password)} WHERE id=${u.id}`;
    }

    // Generate recovery code if user doesn't have one yet
    let userRecoveryCode=u.recovery_code;
    if(!userRecoveryCode){
      userRecoveryCode=generateRecoveryCode();
      await sql`UPDATE users SET recovery_code=${userRecoveryCode} WHERE id=${u.id}`;
    }

    const t=token();
    await sql`INSERT INTO sessions(user_id,token_hash,expires_at) VALUES(${u.id},encode(digest(${t},'sha256'),'hex'),now()+interval '30 days')`;
    await sql`UPDATE users SET last_login_at=now(),updated_at=now() WHERE id=${u.id}`;
    setSessionCookie(res,t);
    return json(res,200,{ok:true,user:publicUser(u),recovery_code:userRecoveryCode});
  }catch(e){
    return json(res,500,{ok:false,error:'Authentication failed'});
  }
}
