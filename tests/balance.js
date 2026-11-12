// 全59,049通りのエンディング分布を表示する（バランス調整用）
// 実行: node tests/balance.js
require("../js/data.js");
require("../js/engine.js");
const E = globalThis.MARINK.engine;
const D = globalThis.MARINK.DATA;

const counts = {};
const modes = {};
const stats = { fundMin: Infinity, fundMax: -Infinity };
const total = 3 ** 10;
for (let n = 0; n < total; n++) {
  let x = n;
  const h = [];
  for (let i = 0; i < 10; i++) { h.unshift("ABC"[x % 3]); x = Math.floor(x / 3); }
  const r = E.simulate(h);
  counts[r.endingId] = (counts[r.endingId] || 0) + 1;
  const m = r.steps[9].mode;
  modes[m] = (modes[m] || 0) + 1;
  stats.fundMin = Math.min(stats.fundMin, r.finalStats.fund);
  stats.fundMax = Math.max(stats.fundMax, r.finalStats.fund);
}
Object.keys(D.endings).forEach((k) => {
  const c = counts[k] || 0;
  console.log(`${D.endings[k].name.padEnd(22, "　")} ${String(c).padStart(6)}  ${((c / total) * 100).toFixed(1)}%`);
});
console.log("第10問モード", modes, "最終資金レンジ", stats);
