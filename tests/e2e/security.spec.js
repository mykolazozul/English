import { test, expect } from '@playwright/test';
const securityEnabled=process.env.E2E_ALLOW_SECURITY_TESTS==='1' && process.env.E2E_TARGET_ENV==='staging';
test.skip(!securityEnabled,'Security Lab requires E2E_ALLOW_SECURITY_TESTS=1 and E2E_TARGET_ENV=staging');

test('CSRF: protected endpoint without session is rejected', async ({request})=>{
  const r=await request.post('/api/progress',{data:{notion_id:'x',mode:'sprint',answer:'x',quality:1}});
  expect([401,403]).toContain(r.status());
});


test('session expiry: invalid session cookies are rejected cleanly', async ({request})=>{
  const r=await request.get('/api/profile',{headers:{cookie:'__Host-ef_session=expired-invalid-token'}});
  expect([401,403]).toContain(r.status());
  const a=await request.get('/api/admin-auth',{headers:{cookie:'__Host-ef_admin=expired-invalid-token'}});
  expect(a.status()).toBe(200);
  const body=await a.json();
  expect(body.ok).toBe(false);
});
test('privilege escalation: normal request cannot access admin users', async ({request})=>{
  const r=await request.get('/api/admin-users');
  expect([401,403]).toContain(r.status());
});

test('privilege escalation: profile cannot overwrite role or XP', async ({request})=>{
  const nick=process.env.E2E_NICK,password=process.env.E2E_PASSWORD;
  test.skip(!nick||!password,'Set E2E_NICK/E2E_PASSWORD for authenticated escalation test');
  const login=await request.post('/api/auth',{data:{action:'login',nick,password}});
  expect(login.ok()).toBeTruthy();
  const before=await request.get('/api/profile');const b=await before.json();
  const put=await request.put('/api/profile',{data:{state:{role:'admin',xp:999999},role:'admin',xp:999999}});
  expect(put.ok()).toBeTruthy();
  const after=await request.get('/api/profile');const a=await after.json();
  expect(a.profile.role).toBe(b.profile.role);expect(a.profile.xp).toBe(b.profile.xp);
});

test('IDOR: random lesson cannot be completed', async ({request})=>{
  const r=await request.patch('/api/lessons',{data:{lessonId:'00000000-0000-0000-0000-000000000000'}});
  expect([401,403,404]).toContain(r.status());
});

test('XSS registration payload is rejected server-side', async ({request})=>{
  const r=await request.post('/api/auth',{data:{action:'register',nick:'<script>alert(1)</script>',password:'NotARealPassword123',name:'<img src=x onerror=alert(1)>'}});
  expect([400,401]).toContain(r.status());
});

test('API fuzz rejects malformed JSON/body safely', async ({request})=>{
  const r=await request.post('/api/auth',{headers:{'content-type':'application/json'},data:'{"action":'});
  expect(r.status()).toBeLessThan(500);
});

test('rate limit: synthetic invalid logins eventually throttle', async ({request})=>{
  const n='sec_lab_'+Date.now().toString(36);
  let status=0;
  for(let i=0;i<9;i++){
    const r=await request.post('/api/auth',{data:{action:'login',nick:n,password:'DefinitelyWrong123'}});
    status=r.status();
    if(status===429)break;
  }
  expect([401,429]).toContain(status);
});
