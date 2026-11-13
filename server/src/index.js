/*
 * MARINK AQUARIUM ― AI物語生成サーバー（Cloudflare Workers 用・任意）
 *
 * ・APIキーはサーバーの環境変数（ANTHROPIC_API_KEY）にだけ置きます。
 * ・ブラウザから受け取るのは「選択履歴（ABCの10文字）」だけ。
 *   数値はすべてサーバーで再計算し、ブラウザの値は信用しません。
 * ・1回のプレイにつきAI呼び出しは1回。同じ選択履歴の結果はKVにキャッシュします。
 * ・IPごと・1日全体の回数制限で、利用料金の上限を管理します。
 */
import "../../js/data.js";
import "../../js/engine.js";
import "../../js/story.js";
import Anthropic from "@anthropic-ai/sdk";
import * as z from "zod/v4";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

const M = globalThis.MARINK;

const LIMITS = { aquariumName: 24, endingTitle: 30, tagline: 60, shortSummary: 120, storyBeginning: 400, storyMiddle: 400, storyEnding: 400, finalSceneDescription: 260 };

const StorySchema = z.object({
  aquariumName: z.string(),
  endingTitle: z.string(),
  tagline: z.string(),
  shortSummary: z.string(),
  storyBeginning: z.string(),
  storyMiddle: z.string(),
  storyEnding: z.string(),
  keyDecisions: z.array(z.object({ round: z.number().int(), reason: z.string() })),
  finalSceneDescription: z.string(),
});

const SYSTEM = `あなたはWebゲーム「MARINK AQUARIUM ― 運命の館長」の物語作家です。
プレイヤーが10回の三択で作った水族館の「10年間の物語」を日本語で書きます。

## 最重要ルール
- 渡されたゲームの状態（facts）は確定した事実です。選択内容、数値、エンディングを変えたり、書かれていない成功・失敗を付け足したりしないでください。
- endingCategory はゲームが決めた結末です。物語は必ずこの結末にたどり着くように書いてください。
- aquarium.bigFish が "full" でない場合、ジンベエザメが展示されているとは書かないでください（"planned" なら「計画中」とだけ書けます）。
- main が "big" でないならジンベエザメは登場させず、main が "deep" でないならクラゲを主役として書かないでください。
- 研究・保全に投資していない（flags に conservation がない）場合、世界的な研究成果を書かないでください。
- 生き物の虐待や不適切な飼育を成功の手段として描かないでください。
- 評価するのは水族館の経営結果だけです。プレイヤーの性格や能力を否定・評価しないでください。

## 文体
優しく、少しユーモラスで、ときには感動的に。かわいらしい世界観だが子どもっぽくしない。
バッドエンドは暗くなりすぎず余韻を残し、ハッピーエンドは選択が報われる展開に。

## 出力（すべて日本語・文字数は厳守）
- aquariumName: 選択内容に合った、自然でかわいらしい水族館名（24文字以内）。facts.fixedName がある場合は、その文字列をそのまま使い、物語の中でもその名前で呼ぶこと
- endingTitle: 運命を象徴するタイトル。『』は付けない（30文字以内）
- tagline: SNS向けの短い一文（60文字以内）
- shortSummary: 結果の短い説明（120文字以内）
- storyBeginning: 第1〜4問（立地・展示・予算・資金不足）の物語（400文字以内）
- storyMiddle: 第5〜8問とイベントの物語（400文字以内）
- storyEnding: 第9〜10問と10年後の結末（400文字以内）
- keyDecisions: 結末に本当に影響した選択を3つ。round は 1〜10 の重複しない整数、reason はその選択がなぜ結末につながったか（各80文字以内）
- finalSceneDescription: 10年後の水族館の情景描写（260文字以内）`;

function buildFacts(r, template) {
  return {
    fixedName: template.customName || null,
    endingCategory: r.ending.name,
    endingType: r.ending.type,
    endingSummary: r.ending.summary,
    aquarium: r.aquarium,
    flags: r.flags,
    finalStats: r.finalStats,
    crisisOccurred: r.crisisSeen,
    settlement: r.settlement.ledger,
    decisions: r.steps.map((s) => ({
      round: s.round,
      question: s.title,
      choice: s.choice,
      chosen: s.label,
      effects: M.story.fmtDelta(s.delta),
      notes: s.notes,
      eventsBefore: s.events.map((e) => e.title + "：" + e.text),
    })),
    suggestedName: template.aquariumName,
    templateKeyDecisionRounds: template.keyDecisions.map((d) => d.round),
  };
}

/* AIの出力を検証。ルール違反は破棄（ブラウザ側はテンプレートに切り替わる） */
export function validateStory(out, r) {
  if (!out || typeof out !== "object") return "empty";
  for (const [k, max] of Object.entries(LIMITS)) {
    if (typeof out[k] !== "string" || !out[k].trim()) return "missing " + k;
    if (out[k].length > max) return "too long " + k;
  }
  if (!Array.isArray(out.keyDecisions) || out.keyDecisions.length !== 3) return "keyDecisions";
  const rounds = new Set();
  for (const d of out.keyDecisions) {
    if (!Number.isInteger(d.round) || d.round < 1 || d.round > 10 || rounds.has(d.round)) return "round";
    if (typeof d.reason !== "string" || !d.reason.trim() || d.reason.length > 140) return "reason";
    rounds.add(d.round);
  }
  const text = [out.storyBeginning, out.storyMiddle, out.storyEnding, out.finalSceneDescription, out.tagline, out.shortSummary].join("");
  if (r.aquarium.main !== "big" && text.includes("ジンベエ")) return "whale shark not owned";
  if (r.aquarium.closed && !text.includes("閉館")) return "closure not described";
  if (["closure", "reorg", "worst", "tragic", "badtrue", "merrybad"].includes(r.endingId) && /大成功|大黒字/.test(text)) return "contradicts ending";
  return null;
}

function json(body, status, cors) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", ...cors } });
}

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = (env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!allowed.includes(origin)) return null;
  return { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", Vary: "Origin" };
}

/* 簡易レート制限：同じ処理系内のメモリ ＋（あれば）KVで1日の上限を管理 */
const memHits = new Map();
async function rateLimit(ip, env) {
  const now = Date.now();
  const recent = (memHits.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  if (recent.length >= Number(env.PER_IP_10MIN || 5)) return "per-ip";
  recent.push(now);
  memHits.set(ip, recent);
  if (!env.RATE_KV) return null;
  const day = new Date().toISOString().slice(0, 10);
  const ipKey = `rl:${day}:${ip}`, allKey = `rl:${day}:all`;
  const [ipCount, allCount] = await Promise.all([env.RATE_KV.get(ipKey), env.RATE_KV.get(allKey)]);
  if (Number(ipCount || 0) >= Number(env.DAILY_PER_IP || 10)) return "daily-ip";
  if (Number(allCount || 0) >= Number(env.DAILY_GLOBAL_CAP || 300)) return "daily-global";
  await Promise.all([
    env.RATE_KV.put(ipKey, String(Number(ipCount || 0) + 1), { expirationTtl: 172800 }),
    env.RATE_KV.put(allKey, String(Number(allCount || 0) + 1), { expirationTtl: 172800 }),
  ]);
  return null;
}

export async function handle(request, env, deps = {}) {
  const cors = corsHeaders(request, env);
  if (request.method === "OPTIONS") return new Response(null, { status: cors ? 204 : 403, headers: cors || {} });
  if (!cors) return json({ error: "origin not allowed" }, 403, {});
  const url = new URL(request.url);
  if (request.method !== "POST" || url.pathname !== "/story") return json({ error: "not found" }, 404, cors);
  if (Number(request.headers.get("Content-Length") || 0) > 1024) return json({ error: "too large" }, 413, cors);

  let body;
  try { body = JSON.parse((await request.text()).slice(0, 1024)); } catch { return json({ error: "bad json" }, 400, cors); }
  if (!body || body.version !== M.DATA.version) return json({ error: "version mismatch" }, 400, cors);
  const history = typeof body.history === "string" ? M.engine.parseHistory(body.history) : null;
  if (!history || history.length !== 10) return json({ error: "invalid history" }, 400, cors);

  // サーバーで結果を再計算（クライアントの数値は受け取らない）
  const result = M.engine.simulate(history);
  // プレイヤーが決めた水族館名（サーバー側でも整形・長さ制限）
  const name = M.story.cleanName(typeof body.name === "string" ? body.name : "");
  const template = M.story.buildStory(result, { name });
  const cacheKey = `story:${M.DATA.version}:${history.join("")}:${encodeURIComponent(name)}`;

  if (env.RATE_KV) {
    const cached = await env.RATE_KV.get(cacheKey);
    if (cached) return json(JSON.parse(cached), 200, cors);
  }

  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const limited = await rateLimit(ip, env);
  if (limited) return json({ error: "rate limited", reason: limited }, 429, cors);
  if (!env.ANTHROPIC_API_KEY && !deps.client) return json({ error: "ai not configured" }, 503, cors);

  const client = deps.client || new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, timeout: 18000, maxRetries: 1 });
  let response;
  try {
    response = await client.messages.parse({
      model: env.CLAUDE_MODEL || "claude-opus-5-5",
      max_tokens: 4000,
      output_config: { effort: env.CLAUDE_EFFORT || "low", format: zodOutputFormat(StorySchema) },
      system: SYSTEM,
      messages: [{ role: "user", content: "次のゲーム結果から物語を書いてください。\n" + JSON.stringify(buildFacts(result, template)) }],
    });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return json({ error: "upstream busy" }, 503, cors);
    if (err instanceof Anthropic.APIConnectionTimeoutError || err instanceof Anthropic.APIConnectionError) return json({ error: "upstream timeout" }, 504, cors);
    if (err instanceof Anthropic.APIError) return json({ error: "upstream error" }, 502, cors);
    return json({ error: "generation failed" }, 502, cors);
  }

  if (response.stop_reason === "refusal" || response.stop_reason === "max_tokens") return json({ error: "not generated" }, 502, cors);
  const out = response.parsed_output;
  const problem = validateStory(out, result);
  if (problem) return json({ error: "invalid story", reason: problem }, 502, cors);

  const payload = { endingId: result.endingId, ...out, ...(name ? { aquariumName: name } : {}) };
  if (env.RATE_KV) await env.RATE_KV.put(cacheKey, JSON.stringify(payload), { expirationTtl: 60 * 60 * 24 * 30 });
  return json(payload, 200, cors);
}

export default {
  fetch(request, env) {
    return handle(request, env);
  },
};
