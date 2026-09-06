// kiro-audit-hook.mjs (v2)
// Forensic instrumentation for OmniRoute v3.8.50 Kiro outbound (AWS CodeWhisperer
// GenerateAssistantResponse). Loaded with NODE_OPTIONS=--import=<file:///...> before
// the Next standalone server boots.
//
// v2 changes: OmniRoute's STARTUP patches globalThis.fetch too and REPLACED our v1
// wrapper, so we add a watchdog that re-wraps globalThis.fetch whenever its identity
// changes (we stay OUTERMOST), plus node:https.request interception as a fallback.
//
// SAFETY: logs ONLY whitelisted metadata. Never Authorization/bearer/cookies/OAuth/
// API keys/refresh tokens/credentials/full bodies.
import { TextDecoder } from "node:util";
import http from "node:http";
import https from "node:https";

const DN = new TextDecoder();
const P = "[kiro-audit]";
const log = (...a) => process.stderr.write(P + " " + a.join(" ") + "\n");
log("hook v2 installed in pid=" + process.pid);

// ---- minimal AWS EventStream framing ----
class BQueue {
  constructor() { this.cs = []; this.head = 0; this.len = 0; }
  push(u) { if (!u || !u.length) return; this.cs.push(u); this.len += u.length; }
  peekU32BE(o = 0) { if (this.len < o + 4) return null; let v = 0; for (let i = 0; i < 4; i++) v = (v << 8) | this.u8(o + i); return v >>> 0; }
  u8(_o) { let rem = _o; for (let i = 0; i < this.cs.length; i++) { const s = i === 0 ? this.head : 0; const avail = this.cs[i].length - s; if (rem < avail) return this.cs[i][s + rem]; rem -= avail; } return 0; }
  read(n) { if (n < 0 || this.len < n) return null; const out = new Uint8Array(n); let w = 0; while (w < n) { const c = this.cs[0]; const avail = c.length - this.head; const take = Math.min(avail, n - w); out.set(c.subarray(this.head, this.head + take), w); w += take; this.head += take; this.len -= take; if (this.head >= c.length) { this.cs.shift(); this.head = 0; } } return out; }
}
const CRC_TBL = (() => { const T = new Uint32Array(256); for (let i = 0; i < 256; i++) { let x = i; for (let j = 0; j < 8; j++) x = x & 1 ? (0xedb88320 ^ (x >>> 1)) : x >>> 1; T[i] = x >>> 0; } return T; })();
function crc32(u) { let c = 0xffffffff; for (let i = 0; i < u.length; i++) c = CRC_TBL[(c ^ u[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }

function parseFrame(data) {
  try {
    const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const total = dv.getUint32(0, false);
    const hlen = dv.getUint32(4, false);
    if (total < 12 || total !== data.length) return null;
    const h = {}; let off = 12; const hend = 12 + hlen;
    while (off < hend && off < data.length) {
      const nl = data[off++]; if (off + nl > data.length) break;
      const name = DN.decode(data.subarray(off, off + nl)); off += nl;
      const type = data[off++]; if (type !== 7) break;
      if (off + 2 > data.length) break;
      const vl = (data[off] << 8) | data[off + 1]; off += 2;
      if (off + vl > data.length) break;
      h[name] = DN.decode(data.subarray(off, off + vl)); off += vl;
    }
    let payload = null;
    const pStart = 12 + hlen, pEnd = data.length - 4;
    if (pEnd > pStart) {
      const s = DN.decode(data.subarray(pStart, pEnd)).trim();
      if (s) { try { payload = JSON.parse(s); } catch { payload = null; } }
    }
    return { h, payload };
  } catch { return null; }
}

function keyLens(o) { return o && typeof o === "object" && !Array.isArray(o) ? Object.keys(o) : null; }
function numOr(...v) { const f = v.find((x) => typeof x === "number"); return f === undefined ? null : f; }

function makeCollector() {
  const q = new BQueue();
  const frames = [];
  let bytes = 0;
  return {
    tap(chunk) { q.push(chunk); bytes += chunk.byteLength;
      while (q.len >= 12) {
        const total = q.peekU32BE(0); if (!total || total < 12 || total > q.len) break;
        const data = q.read(total); if (!data) break;
        const fr = parseFrame(data); if (!fr) continue;
        const et = fr.h[":event-type"] || "";
        const p = fr.payload && typeof fr.payload === "object" ? fr.payload : {};
        if (et === "contextUsageEvent") {
          frames.push({ type: et, keys: keyLens(p), contextUsagePercentage: typeof p.contextUsagePercentage === "number" ? p.contextUsagePercentage : "non-number" });
        } else if (et === "metadataEvent") {
          const inner = p.metadataEvent;
          frames.push({
            type: et, payloadKeys: keyLens(p), metadataEventKeys: keyLens(inner), usageKeys: keyLens(p.usage),
            inputTokens: numOr(p?.usage?.inputTokens, inner?.usage?.inputTokens, p?.usage?.prompt_tokens, p?.inputTokens),
            outputTokens: numOr(p?.usage?.outputTokens, inner?.usage?.outputTokens, p?.usage?.completion_tokens, p?.outputTokens),
            cacheRead: numOr(p?.usage?.cacheReadInputTokens, p?.usage?.cache_read_input_tokens),
            cacheWrite: numOr(p?.usage?.cacheWriteInputTokens, p?.usage?.cache_creation_input_tokens),
          });
        } else if (et === "meteringEvent") {
          // PASS 8: also surface the VALUES of the whitelisted metering fields.
          // unit/unitPlural/usage are billing metadata, not credentials.
          frames.push({
            type: et,
            payloadKeys: keyLens(p),
            unit: typeof p.unit === "string" ? p.unit : null,
            unitPlural: typeof p.unitPlural === "string" ? p.unitPlural : null,
            usage: typeof p.usage === "number" ? p.usage : typeof p.usage === "string" ? p.usage : p.usage === null || p.usage === undefined ? null : String(p.usage).slice(0, 40),
          });
        } else {
          frames.push({ type: et, payloadKeys: keyLens(p) });
        }
      } },
    result() { return { bytes, frames }; },
  };
}

function safeHeaders(h) { const o = {}; try { if (h && typeof h.forEach === "function") h.forEach((v, k) => { o[k] = v.length; }); } catch {} return o; }

function makeWrap(inner) {
  const w = async function (...a) {
    const url = a[0];
    const init = a[1] || {};
    const u = typeof url === "string" ? url : url && typeof url.url === "string" ? url.url : String(url);
    if (!/generateAssistantResponse/.test(u)) return inner.apply(this, a);

    const req = { pid: process.pid, url: u.split("?")[0], method: init.method || "POST", t: new Date().toISOString().slice(11, 23) };
    try {
      const raw = init.body;
      const str = raw == null ? "" : typeof raw === "string" ? raw : Buffer.isBuffer(raw) ? raw.toString("utf8") : "";
      req.bodyBytes = Buffer.byteLength(str);
      if (str) {
        const j = JSON.parse(str);
        const cs = j.conversationState;
        req.conversationStateBytes = cs != null ? Buffer.byteLength(JSON.stringify(cs)) : null;
        req.historyLength = Array.isArray(cs?.history) ? cs.history.length : null;
        const uim = cs?.currentMessage?.userInputMessage;
        req.currentMessageContentLength = typeof uim?.content === "string" ? uim.content.length : null;
        req.modelId = typeof uim?.modelId === "string" ? uim.modelId : null;
        const uimc = uim?.userInputMessageContext;
        req.toolsCount = Array.isArray(uimc?.tools) ? uimc.tools.length : 0;
        req.currentMessageKeys = uimc ? Object.keys(uimc) : null;
      }
    } catch (e) { req.bodyParseError = String(e && e.message || e).slice(0, 60); }

    const t0 = Date.now();
    try {
      const resp = await inner.apply(this, a);
      req.status = resp.status; req.ms = Date.now() - t0;
      const col = makeCollector();
      const ts = new TransformStream({
        transform(c, ctrl) { col.tap(c); ctrl.enqueue(c); },
        flush() { const r = col.result(); log("RESP " + JSON.stringify({ pid: process.pid, req: { url: req.url, bodyBytes: req.bodyBytes, status: req.status }, ...r })); },
      });
      const wrapped = new Response(resp.body ? resp.body.pipeThrough(ts) : new ReadableStream({ start(c) { c.close(); } }), {
        status: resp.status, statusText: resp.statusText, headers: resp.headers,
      });
      log("REQ " + JSON.stringify(req));
      log("HDR " + JSON.stringify({ pid: process.pid, resHdrNamesLen: safeHeaders(resp.headers) }));
      return wrapped;
    } catch (e) {
      req.error = String(e && e.message || e).slice(0, 80); req.ms = Date.now() - t0;
      log("REQERR " + JSON.stringify(req));
      throw e;
    }
  };
  Object.defineProperty(w, "__kiroWrapV2", { value: true });
  return w;
}

// Watchdog: whenever ANY patch replaces globalThis.fetch, re-wrap so we stay on top.
let cur = globalThis.fetch;
let wrapped = null;
function ensureTop() {
  const g = globalThis.fetch;
  if (g === wrapped) return;
  wrapped = makeWrap(g);
  globalThis.fetch = wrapped;
  log("fetch re-wrapped over identity change (pid=" + process.pid + ")");
}
ensureTop();
setInterval(ensureTop, 200).unref?.();

// node:https.request fallback (in case egress uses the request API instead of fetch)
function patchRequest(mod, proto) {
  const orig = mod.request.bind(mod);
  mod.request = function (...a) {
    const opts = a[0];
    const host = opts && (opts.hostname || opts.host) || "";
    const path = opts && opts.path || "";
    if (typeof host === "string" && host.includes("codewhisperer")) {
      const reqObj = orig(...a);
      let bodyBytes = 0;
      const ow = reqObj.write.bind(reqObj);
      reqObj.write = function (chunk, ...rest) { if (chunk) bodyBytes += chunk.length; return ow(chunk, ...rest); };
      reqObj.once("finish", () => log(proto.toUpperCase() + "_REQ " + JSON.stringify({ pid: process.pid, host, path, bodyBytes })));
      return reqObj;
    }
    return orig(...a);
  };
}
try { patchRequest(https, "https"); patchRequest(http, "http"); log("http(s).request patched"); } catch (e) { log("reqpatch error " + String(e && e.message || e)); }

log("hook v2 active in pid=" + process.pid);