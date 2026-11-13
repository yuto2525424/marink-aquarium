// 全59,049通りの網羅テスト（AIは呼び出しません）
// 実行: node tests/run-tests.js
require("../js/data.js");
require("../js/engine.js");
require("../js/story.js");
const M = globalThis.MARINK;
const E = M.engine;
const D = M.DATA;

let failures = 0;
const fail = (msg) => { if (failures < 30) console.error("NG:", msg); failures++; };
const assert = (cond, msg) => { if (!cond) fail(msg); };

// 1. データ構造: 全ラウンド・全バリエーションに3択がある
D.rounds.forEach((r, i) => {
  assert(r.round === i + 1, `round番号 ${r.id}`);
  const sets = r.optionSets ? r.optionSets.map((s) => s.options) : [r.options];
  sets.forEach((opts) => {
    assert(["A", "B", "C"].every((k) => opts[k] && opts[k].label && opts[k].pros && opts[k].cons && opts[k].feedback), `${r.id} の3択が不完全`);
    assert(Object.keys(opts).length === 3, `${r.id} 選択肢が3つでない`);
    // 全能力が上がるだけの選択肢は禁止
    Object.values(opts).forEach((o) => {
      const vals = Object.entries(o.effects).filter(([k]) => k !== "debt").map(([, v]) => v);
      assert(vals.some((v) => v < 0) || o.effects.debt > 0 || o.cons, `${r.id} ${o.label}: デメリットがない`);
    });
  });
});
assert(D.rounds.length === 10, "ラウンド数が10でない");

// 2. 不正な入力を拒否する
["ABD", "ABCABCABCAB", "abx", "", null].forEach((bad) => {
  if (bad === "") { assert(E.parseHistory(bad) !== null, "空履歴は開始状態として有効"); return; }
  assert(E.parseHistory(bad) === null, `不正な履歴を受け付けた: ${bad}`);
});

// 3. 全59,049通りを網羅
const total = 3 ** 10;
const endingCount = {};
const ids = new Set();
const sample = {};
for (let n = 0; n < total; n++) {
  let x = n;
  const h = [];
  for (let i = 0; i < 10; i++) { h.unshift("ABC"[x % 3]); x = Math.floor(x / 3); }
  const hs = h.join("");

  // 途中経過: どの時点でも次の問題が3択で出る
  if (n % 97 === 0) {
    for (let k = 0; k < 10; k++) {
      const p = E.simulate(h.slice(0, k));
      assert(p.next && p.next.round === k + 1 && p.next.question.options.length === 3, `${hs} 途中${k}`);
    }
  }

  const r = E.simulate(h);
  assert(r.steps.length === 10, `${hs} 10ラウンドで完結しない`);
  assert(r.history.join("") === hs, `${hs} 履歴が保存されない`);
  assert(D.endings[r.endingId], `${hs} エンディング未決定`);
  assert(r.resultNumber === n, `${hs} 結果番号の不一致`);
  ids.add(r.resultId);

  for (const k of E.STAT_KEYS) {
    const v = r.finalStats[k];
    assert(Number.isFinite(v), `${hs} ${k} が数値でない`);
    if (k !== "fund") assert(v >= 0 && v <= 100, `${hs} ${k}=${v} が範囲外`);
  }
  assert(r.finalStats.debt === 0, `${hs} 借入金が決算で処理されていない`);

  // 資金の整合性: 各ステップの差分の合計 = 最終値
  let fund = D.initialStats.fund;
  r.steps.forEach((s) => {
    s.events.forEach((e) => { fund += e.delta.fund || 0; });
    fund += s.delta.fund || 0;
    assert(fund === s.statsAfter.fund, `${hs} 第${s.round}問で資金計算が合わない`);
  });
  const ledgerSum = r.settlement.ledger.reduce((a, l) => a + l.value, 0);
  assert(fund + ledgerSum === r.finalStats.fund, `${hs} 決算の資金計算が合わない`);

  // 結末と状態の矛盾がない
  const s = r.finalStats;
  const goodEnds = ["legendary", "national", "paradise", "research", "conservation", "miracle", "community", "true", "secret", "gag", "loop", "chaos"];
  if (goodEnds.includes(r.endingId)) assert(s.fund >= 0, `${hs} 赤字なのに成功エンド`);
  if (r.endingId === "legendary") assert(s.welfare >= 70, `${hs} 伝説エンドなのに飼育環境が低い`);
  if (["closure", "reorg", "worst", "tragic", "badtrue", "merrybad"].includes(r.endingId)) assert(s.fund < 0, `${hs} 黒字なのに財務エンド`);
  if (r.endingId === "secret") assert(r.aquarium.bigFish === "full" && r.flags.includes("conservation"), `${hs} 条件を満たさないシークレット`);
  if (r.endingId === "gag") assert(r.aquarium.bigFish === "planned", `${hs} ジンベエザメがいるのにギャグエンド`);
  if (r.endingId === "open") assert(r.flags.includes("gamble"), `${hs} 大勝負なしのオープンエンド`);
  if (r.endingId === "true" || r.endingId === "badtrue") assert(r.flags.includes("conservation"), `${hs} 保全なしのトゥルー系`);
  assert(D.endings[r.endingId].type, `${hs} エンディングの種類がない`);
  if (r.endingId === "miracle") assert(r.crisisSeen, `${hs} 危機なしの再建エンド`);
  // 飼育条件: ジンベエザメは大水槽か新展示館があるときだけ
  if (r.aquarium.bigFish === "full") assert(h[1] === "A" && ((h[2] === "A" && h[3] !== "B") || h[8] === "A"), `${hs} 設備なしでジンベエザメ`);

  // テンプレート物語が履歴と矛盾しない
  const st = M.story.buildStory(r);
  const all = st.chapters.map((c) => c.text).join("") + st.finalSceneDescription;
  assert(st.keyDecisions.length === 3, `${hs} 重要な選択が3つでない`);
  if (r.aquarium.bigFish !== "full") assert(!/ジンベエザメ(が|を悠々|がゆったり)/.test(all), `${hs} 飼っていないジンベエザメが登場`);
  if (h[1] !== "C") assert(!all.includes("クラゲたちが光"), `${hs} クラゲ展示がないのにクラゲ描写`);
  if (r.aquarium.closed) assert(all.includes("閉館"), `${hs} 閉館エンドの描写がない`);
  assert(r.aquarium.damage >= 0 && r.aquarium.damage <= 10, `${hs} 傷みの段階が範囲外`);
  if (r.aquarium.closed) assert(r.aquarium.damage >= 8, `${hs} 閉館なのに建物がきれい`);
  assert(!/undefined|null|NaN/.test(all + st.aquariumName + st.endingTitle), `${hs} 物語に未定義値`);

  endingCount[r.endingId] = (endingCount[r.endingId] || 0) + 1;
  if (!sample[r.endingId]) sample[r.endingId] = hs;
}
assert(ids.size === total, "結果IDが重複している");

// 3b. 「もしもの未来」と経営レポートの検証（約3,000通りを抜き取り）
for (let n = 0; n < total; n += 19) {
  let x = n;
  const h = [];
  for (let i = 0; i < 10; i++) { h.unshift("ABC"[x % 3]); x = Math.floor(x / 3); }
  const r = E.simulate(h);
  const rep = M.story.report(r);
  assert(rep.length === 6 && rep.every((s) => "SABCD".includes(s.grade) && s.comment), `${h.join("")} 経営レポートが不完全`);
  const trend = M.story.fundTrend(r);
  assert(trend.length === 12 && trend[11].value === r.finalStats.fund, `${h.join("")} 資金推移が合わない`);
  const wi = M.story.whatIf(r);
  assert(wi.length >= 1 && wi.length <= 2, `${h.join("")} もしもの未来の件数`);
  wi.forEach((w) => {
    // 表示した「もしも」が本当にその結末になるかを再計算で確認
    const hh = h.slice();
    const alt = ["A", "B", "C"].filter((c) => c !== h[w.round - 1]).map((c) => { hh[w.round - 1] = c; return E.simulate(hh.slice()); })
      .find((a) => a.steps[w.round - 1].label === w.label);
    assert(alt, `${h.join("")} もしもの選択肢が存在しない`);
    if (alt && w.kind !== "same") assert(alt.ending.name === w.endingName && alt.endingId !== r.endingId, `${h.join("")} もしもの結末が計算と違う`);
    if (alt && w.kind === "same") assert(alt.endingId === r.endingId, `${h.join("")} 結末が同じはずなのに違う`);
  });
}

// 3c. プレイヤーが決めた水族館名
const C = M.story.cleanName;
assert(C("まりんく") === "まりんく水族館", "名前に「水族館」が自動でつく");
assert(C("しおかぜ水族館") === "しおかぜ水族館", "「水族館」が二重につかない");
assert(C("<script>x</script>") === "scriptx/script水族館", "危険な記号を取り除く");
assert(Array.from(C("あ".repeat(40))).length <= M.story.NAME_MAX + 3, "名前の長さ制限");
assert(C("   ") === "", "空白だけの名前はおまかせ扱い");
for (const h of ["AAAAAAACAA", "CCCCCCCCCC", "BBBBBBBBBB"]) {
  const r = E.simulate(h);
  const st = M.story.buildStory(r, { name: "ゆうと" });
  const text = st.chapters.map((c) => c.text).join("") + st.finalSceneDescription + st.tagline;
  assert(st.aquariumName === "ゆうと水族館" && st.customName === "ゆうと水族館", `${h} 名前が反映されない`);
  assert(text.includes("ゆうと水族館") && !text.includes(M.story.autoName(r)), `${h} 物語に自分の名前が使われていない`);
  assert(!/undefined|null|NaN/.test(text), `${h} 名前つき物語に未定義値`);
}

// 4. 決定性: 同じ履歴は同じ結果
const a = E.simulate("ABCABCABCA"), b = E.simulate("ABCABCABCA");
assert(JSON.stringify(a.finalStats) === JSON.stringify(b.finalStats) && a.endingId === b.endingId, "同じ履歴で結果が変わる");

// 5. 到達不能エンディングがない
Object.keys(D.endings).forEach((k) => assert(endingCount[k] > 0, `到達不能なエンディング: ${k}`));

console.log("\n― エンディング発生割合（全59,049通り） ―");
Object.keys(D.endings).forEach((k) => {
  const c = endingCount[k] || 0;
  console.log(`${D.endings[k].name}: ${c} (${((c / total) * 100).toFixed(1)}%)  例: ${sample[k] || "-"}`);
});
console.log(failures ? `\n失敗: ${failures} 件` : "\nすべてのテストに合格しました");
process.exit(failures ? 1 : 0);
