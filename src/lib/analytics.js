const KEY='ef-analytics-session';
function session(){let x=localStorage.getItem(KEY);if(!x){x=crypto.randomUUID?.()||String(Date.now());localStorage.setItem(KEY,x)}return x}
export function track(event,data={},consent=true){if(!consent)return;try{const body=JSON.stringify({event,data,session:session(),consent:true});navigator.sendBeacon?.('/api/analytics',new Blob([body],{type:'application/json'}))||fetch('/api/analytics',{method:'POST',headers:{'Content-Type':'application/json'},body,keepalive:true}).catch(()=>{})}catch{}}
