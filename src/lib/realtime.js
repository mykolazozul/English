import {track} from './analytics.js';

export function createRealtime({onMessage, onStatus, url}={}){
  let ws=null, closed=false, timer=null, reconnects=0;
  const configuredUrl = url || (typeof window !== 'undefined' ? window.__efWsUrl : null) || import.meta.env.VITE_REALTIME_URL || '';
  
  // Local broadcast channel fallback for instant multi-tab sync (e.g. testing duels between 2 tabs)
  let bc = null;
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    try {
      bc = new BroadcastChannel('ef_realtime_local');
      bc.onmessage = (e) => {
        try { onMessage?.(e.data); } catch {}
      };
    } catch {}
  }

  const connect = () => {
    if (closed) return;
    if (!configuredUrl) {
      onStatus?.('offline');
      return;
    }
    try {
      ws = new WebSocket(configuredUrl);
      onStatus?.('connecting');
      ws.onopen = () => {
        reconnects = 0;
        track('realtime_open');
        onStatus?.('open');
      };
      ws.onmessage = e => {
        try { onMessage?.(JSON.parse(e.data)); } catch {}
      };
      ws.onclose = () => {
        track('realtime_close');
        onStatus?.('closed');
        scheduleReconnect();
      };
      ws.onerror = () => {
        track('realtime_error');
        onStatus?.('error');
      };
    } catch {
      scheduleReconnect();
    }
  };

  const scheduleReconnect = () => {
    if (closed) return;
    const delay = Math.min(30000, 1000 * Math.pow(2, Math.min(reconnects, 5)));
    reconnects++;
    track('realtime_reconnect', {count: reconnects});
    timer = setTimeout(connect, delay);
  };

  connect();

  return {
    send(m) {
      let sent = false;
      if (ws?.readyState === 1) {
        ws.send(JSON.stringify(m));
        sent = true;
      }
      // Also broadcast locally to other tabs if BroadcastChannel is open
      if (bc) {
        try { bc.postMessage(m); } catch {}
      }
      return sent;
    },
    broadcastLocal(m) {
      if (bc) {
        try { bc.postMessage(m); } catch {}
      }
    },
    close() {
      closed = true;
      clearTimeout(timer);
      ws?.close();
      bc?.close();
    }
  };
}
