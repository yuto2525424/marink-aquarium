/*
 * iPhoneアプリに入れるファイル一式（www フォルダ）を作る
 * 実行: node build-www.js（app フォルダの中で）
 *
 * ・ゲーム本体（index.html / css / js / assets）を、1つ上のフォルダからコピー
 * ・文字のフォント（Zen Maru Gothic）もアプリの中に入れ、ネットなしで表示できるようにする
 * ・Webサイト専用の部分（オフライン用の sw.js、ホーム画面追加の設定）は入れない
 */
const fs = require("fs");
const path = require("path");

const site = path.join(__dirname, "..");
const www = path.join(__dirname, "www");
const WEIGHTS = [400, 500, 700, 900];

fs.rmSync(www, { recursive: true, force: true });
fs.mkdirSync(www, { recursive: true });

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const name of fs.readdirSync(from)) {
    const a = path.join(from, name), b = path.join(to, name);
    if (fs.statSync(a).isDirectory()) copyDir(a, b);
    else fs.copyFileSync(a, b);
  }
}
["css", "js", "assets"].forEach((d) => copyDir(path.join(site, d), path.join(www, d)));
fs.copyFileSync(path.join(site, "privacy.html"), path.join(www, "privacy.html"));

/* フォント：使う太さの woff2 だけをコピーし、CSSを作り直す */
const fontPkg = path.dirname(require.resolve("@fontsource/zen-maru-gothic/package.json"));
const fontOut = path.join(www, "fonts");
fs.mkdirSync(path.join(fontOut, "files"), { recursive: true });
let fontCss = "/* Zen Maru Gothic（SIL Open Font License 1.1） */\n";
for (const w of WEIGHTS) {
  let css = fs.readFileSync(path.join(fontPkg, w + ".css"), "utf8");
  css = css.replace(/src: url\(\.\/files\/([^)]+\.woff2)\) format\('woff2'\), url\([^)]+\) format\('woff'\);/g, (m, file) => {
    fs.copyFileSync(path.join(fontPkg, "files", file), path.join(fontOut, "files", file));
    return "src: url(./files/" + file + ") format('woff2');";
  });
  fontCss += css + "\n";
}
fs.writeFileSync(path.join(fontOut, "fonts.css"), fontCss);
fs.copyFileSync(path.join(fontPkg, "LICENSE"), path.join(fontOut, "LICENSE.txt"));

/* index.html：Webサイト専用の行を外し、アプリ用に整える */
let html = fs.readFileSync(path.join(site, "index.html"), "utf8");
const must = (re, label) => { if (!re.test(html)) throw new Error("index.html に " + label + " が見つかりません"); html = html.replace(re, ""); };
must(/\s*<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">/, "preconnect");
must(/\s*<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin>/, "preconnect gstatic");
html = html.replace(/<link href="https:\/\/fonts\.googleapis\.com[^>]+>/, '<link rel="stylesheet" href="fonts/fonts.css">');
must(/\s*<!-- ホーム画面に追加したとき[\s\S]*?<meta name="apple-mobile-web-app-status-bar-style" content="default">/, "ホーム画面追加の設定");
must(/\s*<script>\s*\/\/ オフライン対応[\s\S]*?<\/script>/, "オフライン用スクリプト");
if (/fonts\.googleapis|serviceWorker|manifest\.webmanifest/.test(html)) throw new Error("Webサイト専用の行が残っています");
fs.writeFileSync(path.join(www, "index.html"), html);

/* 外部サイトへの通信が残っていないか確認（共有用のリンクは除く） */
const allowed = /https:\/\/(twitter\.com\/intent|social-plugins\.line\.me|yuto2525424\.github\.io|platform\.claude\.com)/;
for (const f of fs.readdirSync(path.join(www, "js"))) {
  const s = fs.readFileSync(path.join(www, "js", f), "utf8");
  (s.match(/https?:\/\/[^\s"'`)]+/g) || []).forEach((u) => {
    if (!allowed.test(u) && !/^http:\/\/www\.w3\.org/.test(u) && !/workers\.dev/.test(u)) console.warn("※ 外部URLあり:", f, u);
  });
}

const size = (dir) => fs.readdirSync(dir).reduce((a, n) => { const p = path.join(dir, n); return a + (fs.statSync(p).isDirectory() ? size(p) : fs.statSync(p).size); }, 0);
console.log("www を作成しました（" + (size(www) / 1024 / 1024).toFixed(1) + " MB）");
