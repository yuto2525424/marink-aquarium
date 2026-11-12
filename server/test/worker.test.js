// AIサーバーのテスト（Claude APIは呼ばず、モックで検証）
// 実行: cd server && npm install && npm test
import { handle, validateStory } from "../src/index.js";

const env = { ALLOWED_ORIGINS: "https://example.github.io", ANTHROPIC_API_KEY: "" };
let failures = 0;
const check = (cond, msg) => { console.log((cond ? "OK  " : "NG  ") + msg); if (!cond) failures++; };

const good = {
  aquariumName: "まなびの海 しんかい水族館",
  endingTitle: "深海研究の聖地",
  tagline: "小さな研究館が、世界の注目を集めた。",
  shortSummary: "観光地としては控えめでも、研究者のあこがれの場所に。",
  storyBeginning: "大学の街に建てた水族館。",
  storyMiddle: "専門家チームが繊細な生き物を守った。",
  storyEnding: "10年後、研究の聖地と呼ばれるようになった。",
  keyDecisions: [{ round: 1, reason: "大学の近くを選んだ" }, { round: 5, reason: "専門家チーム" }, { round: 9, reason: "研究に投資" }],
  finalSceneDescription: "研究棟の明かりが夜遅くまで灯っている。",
};
const mockClient = (out, stop = "end_turn") => ({ messages: { parse: async (req) => { mockClient.last = req; return { stop_reason: stop, parsed_output: out }; } } });

function req(body, origin = "https://example.github.io", ip = "1.1.1.1") {
  return new Request("https://worker.example/story", { method: "POST", headers: { Origin: origin, "Content-Type": "application/json", "CF-Connecting-IP": ip }, body: JSON.stringify(body) });
}

const V = globalThis.MARINK.DATA.version;
let res = await handle(req({ version: V, history: "CCCCCCCCCC" }), env, { client: mockClient(good) });
const body = await res.json();
check(res.status === 200 && body.endingId === "research", "正常系: サーバーで再計算したエンディングを返す");
check(mockClient.last.model === "claude-opus-5-5" && mockClient.last.messages[0].content.includes("海洋研究の聖地エンド"), "AIに確定したエンディングを渡している");

res = await handle(req({ version: V, history: "ABCD" }), env, { client: mockClient(good) });
check(res.status === 400, "不正な選択履歴を拒否");
res = await handle(req({ version: "0.0.0", history: "CCCCCCCCCC" }), env, { client: mockClient(good) });
check(res.status === 400, "古いバージョンを拒否");
res = await handle(req({ version: V, history: "CCCCCCCCCC" }, "https://evil.example"), env, { client: mockClient(good) });
check(res.status === 403, "許可していないサイトからの呼び出しを拒否");
res = await handle(req({ version: V, history: "CCCCCCCCCC", stats: { fund: 9999 } }), env, { client: mockClient(good) });
check(res.status === 200 && (await res.json()).endingId === "research", "クライアントの数値は無視される");
res = await handle(req({ version: V, history: "CCCCCCCCCC" }, undefined, "2.2.2.2"), env, { client: mockClient(good, "refusal") });
check(res.status === 502, "refusal時はエラー（ブラウザはテンプレートへ）");

// ジンベエザメがいない水族館でジンベエザメを書いたら破棄
const r = globalThis.MARINK.engine.simulate("CCCCCCCCCC");
check(validateStory({ ...good, storyMiddle: "ジンベエザメが大人気に！" }, r) === "whale shark not owned", "飼っていない生き物の描写を検出");
check(validateStory({ ...good, storyBeginning: "あ".repeat(500) }, r) === "too long storyBeginning", "長すぎる文章を検出");
check(validateStory({ ...good, keyDecisions: [{ round: 1, reason: "a" }, { round: 1, reason: "b" }, { round: 2, reason: "c" }] }, r) === "round", "重複したラウンドを検出");

// レート制限（同じIPで連続）
let last;
for (let i = 0; i < 7; i++) last = await handle(req({ version: V, history: "CCCCCCCCCC" }, undefined, "9.9.9.9"), env, { client: mockClient(good) });
check(last.status === 429, "短時間の大量リクエストを制限");

console.log(failures ? `\n失敗 ${failures} 件` : "\nAIサーバーのテストにすべて合格しました");
process.exit(failures ? 1 : 0);
