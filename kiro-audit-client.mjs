// kiro-audit-client.mjs — runs the OmniRoute Kiro experiments against the
// instrumented copy on :20129, saves raw responses, prints short status only.
import fs from "node:fs";

const base = "http://localhost:20129/v1/chat/completions";
const MESSAGE = "Reply exactly: A";
const OUT = "C:/GH/English/English";

const tests = [
  { id: "T1_claude_false", model: "kr/claude-sonnet-4.5", stream: false },
  { id: "T2_claude_false_repeat", model: "kr/claude-sonnet-4.5", stream: false },
  { id: "T3_qwen_false", model: "kr/qwen3-coder-next", stream: false },
  { id: "T4_deepseek_false", model: "kr/deepseek-3.2", stream: false },
  { id: "T1b_claude_true", model: "kr/claude-sonnet-4.5", stream: true },
];

for (const t of tests) {
  const started = Date.now();
  try {
    const r = await fetch(base, {
      method: "POST",
      headers: { "Content-Type": "application/json", Connection: "close" },
      body: JSON.stringify({
        model: t.model,
        messages: [{ role: "user", content: MESSAGE }],
        stream: t.stream,
      }),
    });
    const txt = await r.text();
    const ms = Date.now() - started;
    fs.writeFileSync(`${OUT}/out_${t.id}.txt`, txt, "utf8");
    console.log(
      `[${t.id}] status=${r.status} ms=${ms} bytes=${txt.length} head=${txt.slice(0, 160).replace(/\n/g, " ")}`
    );
  } catch (e) {
    console.log(`ERR ${t.id}: ${e && e.message || e}`);
  }
}
console.log("DONE");