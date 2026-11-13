/*
 * iPhoneアプリ版（Capacitor）だけで使う機能
 * ・選んだときの振動（触覚フィードバック）
 * ・iPhone標準の共有画面で、結果画像の保存・送信
 * ・起動画面と上部のステータスバー
 * Webサイト版では何もしない（今までどおり動く）
 */
(function (g) {
  var M = (g.MARINK = g.MARINK || {});
  var C = g.Capacitor;
  var isNative = !!(C && typeof C.isNativePlatform === "function" && C.isNativePlatform());
  var cache = {};

  function plugin(name) {
    if (!isNative) return null;
    if (cache[name]) return cache[name];
    var p = (C.Plugins && C.Plugins[name]) || (typeof C.registerPlugin === "function" ? C.registerPlugin(name) : null);
    cache[name] = p;
    return p;
  }
  function quiet(p) { if (p && typeof p.catch === "function") p.catch(function () {}); }

  /* 効果音の種類 → 振動の種類 */
  var HAPTIC = {
    tap: ["impact", "LIGHT"],
    bubble: ["impact", "MEDIUM"],
    good: ["notification", "SUCCESS"],
    fanfare: ["notification", "SUCCESS"],
    soft: ["impact", "SOFT"],
    bad: ["notification", "WARNING"],
    crisis: ["notification", "ERROR"],
  };
  function haptic(kind) {
    var h = plugin("Haptics"), m = HAPTIC[kind];
    if (!h || !m) return;
    try { quiet(m[0] === "impact" ? h.impact({ style: m[1] }) : h.notification({ type: m[1] })); } catch (e) {}
  }

  function blobToBase64(blob) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(String(r.result).split(",")[1]); };
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  }

  /* 結果画像を一時保存して、iPhone標準の共有画面を開く（「画像を保存」で写真アプリへ） */
  function shareImage(blob, fileName, text) {
    var fs = plugin("Filesystem"), sh = plugin("Share");
    if (!fs || !sh) return Promise.reject(new Error("native share unavailable"));
    return blobToBase64(blob).then(function (data) {
      return fs.writeFile({ path: fileName, data: data, directory: "CACHE" });
    }).then(function (res) {
      return sh.share({ title: "MARINK AQUARIUM", text: text, files: [res.uri], dialogTitle: "結果画像を保存・共有" });
    });
  }

  function shareText(text, url) {
    var sh = plugin("Share");
    if (!sh) return Promise.reject(new Error("native share unavailable"));
    return sh.share({ title: "MARINK AQUARIUM", text: text, url: url, dialogTitle: "結果を共有" });
  }

  function ready() {
    if (!isNative) return;
    document.documentElement.classList.add("is-native");
    var sb = plugin("StatusBar");
    if (sb) { quiet(sb.setStyle({ style: "LIGHT" })); }
    var sp = plugin("SplashScreen");
    if (sp) setTimeout(function () { quiet(sp.hide({ fadeOutDuration: 300 })); }, 250);
  }

  M.native = { isNative: isNative, haptic: haptic, shareImage: shareImage, shareText: shareText, ready: ready };
})(window);
