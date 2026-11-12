/*
 * AIモード（任意）
 *
 * config.js の aiEndpoint が設定されているときだけ動きます。
 * ブラウザは「選択履歴（ABC…の10文字）」だけを送ります。
 * サーバー側で結果を再計算し、Claude API で物語を生成して返します。
 * APIキーはブラウザには一切置きません。
 */
(function (g) {
  var M = (g.MARINK = g.MARINK || {});
  var CFG = g.MARINK_CONFIG || {};

  var LIMITS = { aquariumName: 24, endingTitle: 30, tagline: 60, shortSummary: 120, storyBeginning: 400, storyMiddle: 400, storyEnding: 400, finalSceneDescription: 260 };

  function enabled() { return !!(CFG.aiEndpoint && /^https:\/\//.test(CFG.aiEndpoint)); }

  /* AIの応答を検証。おかしなものは使わない */
  function validate(data, result) {
    if (!data || typeof data !== "object") return null;
    for (var k in LIMITS) {
      if (typeof data[k] !== "string" || !data[k].trim() || data[k].length > LIMITS[k]) return null;
    }
    if (!Array.isArray(data.keyDecisions) || data.keyDecisions.length !== 3) return null;
    var seen = {};
    for (var i = 0; i < 3; i++) {
      var d = data.keyDecisions[i];
      if (!d || !Number.isInteger(d.round) || d.round < 1 || d.round > 10 || seen[d.round]) return null;
      if (typeof d.reason !== "string" || !d.reason.trim() || d.reason.length > 140) return null;
      seen[d.round] = true;
    }
    // サーバーで計算したエンディングと食い違う応答は破棄する
    if (data.endingId && data.endingId !== result.endingId) return null;
    return data;
  }

  function toStory(data, result, template) {
    var keyDecisions = data.keyDecisions
      .slice()
      .sort(function (a, b) { return a.round - b.round; })
      .map(function (d) {
        var s = result.steps[d.round - 1];
        return { round: s.round, title: s.title, label: s.label, effect: M.story.fmtDelta(s.delta), reason: d.reason };
      });
    return {
      source: "ai",
      aquariumName: data.aquariumName,
      endingTitle: data.endingTitle,
      endingCategory: result.ending.name, // カテゴリーはゲーム側で確定。AIには変えさせない
      tagline: data.tagline,
      shortSummary: data.shortSummary,
      chapters: [
        { heading: "第1章　はじまり", text: data.storyBeginning },
        { heading: "第2章　運命の転機", text: data.storyMiddle },
        { heading: "最終章　10年後の水族館", text: data.storyEnding },
      ],
      keyDecisions: keyDecisions,
      finalSceneDescription: data.finalSceneDescription,
      features: template.features,
    };
  }

  function cacheKey(h) { return "marink-ai-" + M.DATA.version + "-" + h; }

  /* 物語を1回だけ取得。失敗・タイムアウト時は null（テンプレートに切り替え） */
  function requestStory(result, template) {
    if (!enabled()) return Promise.resolve({ story: null, reason: "disabled" });
    var h = result.history.join("");
    try {
      var cached = sessionStorage.getItem(cacheKey(h));
      if (cached) {
        var v = validate(JSON.parse(cached), result);
        if (v) return Promise.resolve({ story: toStory(v, result, template), reason: "cache" });
      }
    } catch (e) {}

    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, CFG.aiTimeoutMs || 20000);
    return fetch(CFG.aiEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ version: M.DATA.version, history: h }),
      signal: ctrl ? ctrl.signal : undefined,
    })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (json) {
        var v = validate(json, result);
        if (!v) throw new Error("invalid");
        try { sessionStorage.setItem(cacheKey(h), JSON.stringify(v)); } catch (e) {}
        return { story: toStory(v, result, template), reason: "ok" };
      })
      .catch(function (err) {
        return { story: null, reason: err && err.name === "AbortError" ? "timeout" : "error" };
      })
      .finally(function () { clearTimeout(timer); });
  }

  M.ai = { enabled: enabled, requestStory: requestStory, validate: validate };
})(window);
