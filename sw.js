/*
 * オフライン対応（ホーム画面に追加したとき、電波がなくても遊べるようにする）
 * ・このサイトのファイル：まずネットから最新版を取りにいき、つながらなければ保存しておいた版を使う
 *   （更新したらすぐ反映されるように、ネット優先にしています）
 * ・Googleフォント：保存しておいた版を優先
 */
var CACHE = "marink-v6";
var CORE = [
  "./", "index.html", "manifest.webmanifest", "css/style.css",
  "js/config.js", "js/data.js", "js/engine.js", "js/story.js", "js/visual.js", "js/sound.js", "js/ai.js", "js/share.js", "js/native.js", "js/app.js", "privacy.html",
  "assets/icon.svg", "assets/apple-touch-icon.png", "assets/icon-192.png", "assets/icon-512.png",
];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(CORE); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  var font = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (url.origin !== location.origin && !font) return; // AIサーバーなど外部への通信には関与しない

  if (font) {
    e.respondWith(caches.match(req).then(function (hit) {
      return hit || fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
        return res;
      });
    }));
    return;
  }

  e.respondWith(fetch(req).then(function (res) {
    if (res.ok) {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(req, copy); });
    }
    return res;
  }).catch(function () {
    return caches.match(req, { ignoreSearch: true }).then(function (hit) {
      return hit || (req.mode === "navigate" ? caches.match("index.html") : Response.error());
    });
  }));
});
