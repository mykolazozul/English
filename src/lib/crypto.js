/** Client crypto helpers. Password authentication is server-side; the browser never stores a password. */
const te=new TextEncoder(),td=new TextDecoder();
export async function sha256(text){const buf=await crypto.subtle.digest('SHA-256',te.encode(String(text)));return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('')}
export async function hashPassword(password,salt){const s=String(salt||'ef-local');const key=await crypto.subtle.importKey('raw',te.encode(String(password)),'PBKDF2',false,['deriveBits']);const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:te.encode(s),iterations:600000,hash:'SHA-256'},key,256);return [...new Uint8Array(bits)].map(b=>b.toString(16).padStart(2,'0')).join('')}
export async function verifyPassword(password,hash,salt){return (await hashPassword(password,salt))===hash}
function b64(buf){return btoa(String.fromCharCode(...new Uint8Array(buf)))}
function fromB64(s){const bin=atob(s),out=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);return out}
async function deviceKey(){let seed=localStorage.getItem('ef-device-key');if(!seed){seed=b64(crypto.getRandomValues(new Uint8Array(32)));localStorage.setItem('ef-device-key',seed)}return crypto.subtle.importKey('raw',fromB64(seed),'AES-GCM',false,['encrypt','decrypt'])}
export async function encryptText(plain){if(!plain)return '';try{const key=await deviceKey(),iv=crypto.getRandomValues(new Uint8Array(12)),ct=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,te.encode(plain));return `enc:${b64(iv)}:${b64(ct)}`}catch{return ''}}
export async function decryptText(payload){if(!payload)return '';if(!String(payload).startsWith('enc:'))return payload;try{const [,ivB,ctB]=payload.split(':'),key=await deviceKey(),pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:fromB64(ivB)},key,fromB64(ctB));return td.decode(pt)}catch{return ''}}
export async function nickHash(nick){return sha256(String(nick).trim().toLowerCase())}
