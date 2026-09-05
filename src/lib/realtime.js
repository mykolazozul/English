export function createRealtime({onMessage,onStatus}={}){
  let ws=null,closed=false,timer=null;
  const url=()=>{const p=location.protocol==='https:'?'wss:':'ws:';const host=import.meta.env.VITE_REALTIME_URL||`${p}//${location.hostname}:8787`;return host};
  const connect=()=>{if(closed)return;try{ws=new WebSocket(url());onStatus?.('connecting');ws.onopen=()=>onStatus?.('open');ws.onmessage=e=>{try{onMessage?.(JSON.parse(e.data))}catch{}};ws.onclose=()=>{onStatus?.('closed');timer=setTimeout(connect,2500)};ws.onerror=()=>onStatus?.('error')}catch{timer=setTimeout(connect,4000)}};
  connect();
  return {send(m){if(ws?.readyState===1){ws.send(JSON.stringify(m));return true}return false},close(){closed=true;clearTimeout(timer);ws?.close();}};
}
