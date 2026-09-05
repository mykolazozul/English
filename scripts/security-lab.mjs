import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const files=[];
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory()&&!['node_modules','.git','dist'].includes(e.name))walk(p);else if(/\.(js|jsx|mjs|sql)$/.test(e.name))files.push(p)}}
walk(root);
const text=files.map(f=>[f,fs.readFileSync(f,'utf8')]);
const checks=[
 ['no native alert/confirm/prompt', s=>!/\b(alert|confirm|prompt)\s*\(/.test(s.filter(([f])=>/src[\\/]App\.jsx$/.test(f)).map(([,x])=>x).join('\n'))],
 ['no service worker/PWA runtime', s=>!/serviceWorker|manifest\.webmanifest|beforeinstallprompt|PwaCard/.test(s.filter(([f])=>/src|public/.test(f)).map(([,x])=>x).join('\n'))],
 ['no client XP profile writes', s=>!s.some(([f,x])=>/src[\\/]/.test(f)&&/fetch\(['"]\/api\/profile/.test(x)&&/\bxp\s*[:=]/.test(x))],
 ['no plaintext chat inserts', s=>!s.some(([f,x])=>/lib[\\/]server[\\/]api-handlers[\\/]chat\.js$/.test(f)&&/INSERT INTO messages\([^)]*text[^)]*\)[^`]*VALUES\(\$[^,]+,\$[^,]+,\$[^,]+/.test(x))],
 ['HARD has no full catalog fallback', s=>!s.some(([f,x])=>/src[\\/]App\.jsx$/.test(f)&&/mode === ['"]problems['"][\s\S]{0,1500}pool = catalog[\s\S]{0,300}if \(pool\.length\)/.test(x))],
 ['PWA files removed', s=>!['public/sw.js','public/manifest.webmanifest','public/pwa-192.png','public/pwa-512.png'].some(x=>fs.existsSync(path.join(root,x)))],
];
let failed=false;for(const [name,fn] of checks){const ok=fn(text);console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)failed=true}console.log(`Scanned ${files.length} source files.`);process.exitCode=failed?1:0;
