/*
 * 匿名の遊んだ記録（何人が遊んだか・どのエンディングが多いか など）
 * ・送るのは「どの出来事が起きたか」の名前だけ（例: play/app, ending/legend, q3/b）
 * ・名前・水族館名・端末ID・Cookie などの個人を特定できる情報は送らない
 * ・集計先は GoatCounter（個人を追跡しないアクセス集計サービス）
 * ・config.js の statsCode が空なら何もしない
 */
(function (g) {
  var M = (g.MARINK = g.MARINK || {});
  var cfg = g.MARINK_CONFIG || {};
  var code = String(cfg.statsCode || "").replace(/[^a-z0-9-]/gi, "");
  var C = g.Capacitor;
  var platform = C && typeof C.isNativePlatform === "function" && C.isNativePlatform() ? "app" : "web";

  function send(name) {
    if (!code) return;
    try {
      var path = "/" + platform + "/" + String(name).replace(/[^a-z0-9_\/-]/gi, "");
      var url = "https://" + code + ".goatcounter.com/count?e=true" +
        "&p=" + encodeURIComponent(path) +
        "&t=" + encodeURIComponent(path) +
        "&s=" + encodeURIComponent(screen.width + "," + screen.height + "," + (g.devicePixelRatio || 1)) +
        "&rnd=" + Math.random().toString(36).slice(2, 8);
      if (navigator.sendBeacon && navigator.sendBeacon(url)) return;
      var img = new Image();
      img.src = url;
    } catch (e) {}
  }

  M.stats = { send: send, platform: platform, enabled: !!code };
})(window);
