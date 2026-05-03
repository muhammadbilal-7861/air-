import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const PORT = Number(process.env.PORT);
const BASE_PATH = (process.env.BASE_PATH || "/").replace(/\/+$/, "") || "";
const ROOT = new URL(".", import.meta.url).pathname;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const server = createServer(async (req, res) => {
  try {
    let urlPath = decodeURIComponent(req.url.split("?")[0]);
    if (BASE_PATH && urlPath.startsWith(BASE_PATH)) {
      urlPath = urlPath.slice(BASE_PATH.length);
    }
    if (urlPath === "" || urlPath === "/") urlPath = "/index.html";

    const safe = normalize(urlPath).replace(/^(\.\.[/\\])+/, "");
    const filePath = join(ROOT, safe);

    const s = await stat(filePath);
    if (s.isDirectory()) throw new Error("dir");

    const data = await readFile(filePath);
    const type = MIME[extname(filePath).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, {
      "Content-Type": type,
      "Cache-Control": "no-store",
    });
    res.end(data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Static server on :${PORT} (base=${BASE_PATH || "/"})`);
});
