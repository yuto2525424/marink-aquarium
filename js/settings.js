/*
 * 設定（音量・演出の速さ・振動）。この端末の中だけに保存する
 */
(function (g) {
  var M = (g.MARINK = g.MARINK || {});
  var KEY = "marink-settings-v1";
  var DEF = { bgm: 100, sfx: 100, fast: false, skip: false, haptic: true };
  var cur = Object.assign({}, DEF), listeners = [];
  function vol(v) { v = Number(v); return isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : 100; }
  try {
    var raw = JSON.parse(localStorage.getItem(KEY)) || {};
    if ("bgm" in raw) cur.bgm = vol(raw.bgm);
    if ("sfx" in raw) cur.sfx = vol(raw.sfx);
    cur.fast = raw.fast === true;
    cur.skip = raw.skip === true; // 初期はオフ
    cur.haptic = raw.haptic !== false;
  } catch (e) {}
  M.settings = {
    get: function (k) { return cur[k]; },
    set: function (k, v) {
      if (!(k in DEF)) return;
      cur[k] = k === "bgm" || k === "sfx" ? vol(v) : !!v;
      try { localStorage.setItem(KEY, JSON.stringify(cur)); } catch (e) {}
      listeners.forEach(function (f) { f(k, cur[k]); });
    },
    onChange: function (f) { listeners.push(f); },
  };
})(window);
