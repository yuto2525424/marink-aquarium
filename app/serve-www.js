// アプリに入れる www フォルダの中身を、パソコンのブラウザで確認するためのサーバー
// 実行: node serve-www.js  →  http://localhost:8081
const http = require("http"), fs = require("fs"), path = require("path");
const root = path.join(__dirname, "www");
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2" };
http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split("?")[0]);
  const file = path.normalize(path.join(root, p === "/" ? "index.html" : p));
  if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end("Not found"); }
    res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream" });
    res.end(data);
  });
}).listen(8081, () => console.log("http://localhost:8081"));
