import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.FRONTEND_PORT ?? 5173);
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".csv": "text/csv; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg" };

http.createServer(async (request, response) => {
  try {
    const requested = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
    const relative = requested === "/" ? "index.html" : requested.replace(/^\/+/, "");
    const file = path.resolve(root, relative);
    if (!file.startsWith(root) || !(await stat(file)).isFile()) throw new Error("Not found");
    response.writeHead(200, { "Content-Type": types[path.extname(file).toLowerCase()] ?? "application/octet-stream", "Cache-Control": "no-store" });
    response.end(await readFile(file));
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}).listen(port, () => console.log(`Frontend available at http://127.0.0.1:${port}`));
