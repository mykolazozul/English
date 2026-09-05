import {track} from './analytics.js';
export function createRealtime({onMessage,onStatus}={}){
  let ws=null,closed=false,timer=null,reconnects=0;
  const configuredUrl=import.meta.env.VITE_REALTIME_URL||'';
  // Without an explicit VITE_REALTIME_URL the WebSocket service is not reachable,
  // so stay offline instead of guessing at ws://localhost:8787 forever.
  const connect=()=>{if(closed)return;if(!configuredUrl){onStatus?.('offline');return}try{ws=new WebSocket(configuredUrl);onStatus?.('connecting');ws.onopen=()=>{reconnects=0;track('realtime_open');onStatus?.('open')};ws.onmessage=e=>{try{onMessage?.(JSON.parse(e.data))}catch{}};ws.onclose=()=>{track('realtime_close');onStatus?.('closed');scheduleReconnect()};ws.onerror=()=>{track('realtime_error');onStatus?.('error')}}catch{scheduleReconnect()}};
  const scheduleReconnect=()=>{if(closed)return;const delay=Math.min(30000,1000*Math.pow(2,Math.min(reconnects,5)));reconnects++;track('realtime_reconnect',{count:reconnects});timer=setTimeout(connect,delay)};
  connect();
  return {send(m){if(ws?.readyState===1){ws.send(JSON.stringify(m));return true}return false},close(){closed=true;clearTimeout(timer);ws?.close();}};
}
