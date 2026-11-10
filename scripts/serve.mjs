import { createServer } from "node:http";
import {
  readFileSync,
  existsSync,
  mkdirSync,
  openSync,
  closeSync,
  writeFileSync,
} from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
const file = fileURLToPath(import.meta.url),
  root = path.resolve(path.dirname(file), "..");
const port = Number(process.env.GODOT_PATH_PORT || 5181);
const url = `http://127.0.0.1:${port}/`;
const mode = process.argv[2] || "dev";
const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json",
};
const allowed = new Set([
  "index.html",
  "app.js",
  "content.js",
  "styles.css",
  "mark.svg",
]);
async function ready() {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(1500) });
    return r.ok && (await r.text()).includes("Godot Path");
  } catch {
    return false;
  }
}
if (mode === "ensure") {
  if (!(await ready())) {
    const dir = path.join(root, ".codex-runtime");
    mkdirSync(dir, { recursive: true });
    const fd = openSync(path.join(dir, "server.log"), "a");
    const child = spawn(process.execPath, [file, "dev"], {
      cwd: root,
      detached: true,
      stdio: ["ignore", fd, fd],
    });
    child.unref();
    closeSync(fd);
    writeFileSync(path.join(dir, "server.pid"), String(child.pid));
    for (let i = 0; i < 30 && !(await ready()); i++)
      await new Promise((r) => setTimeout(r, 200));
  }
  if (!(await ready())) throw new Error("Godot Path local server unavailable");
  for (const f of ["app.js", "content.js", "styles.css", "mark.svg"]) {
    const r = await fetch(url + f);
    if (!r.ok) throw new Error(`Missing ${f}`);
  }
  console.log(`Godot Path ready: ${url}`);
} else {
  const server = createServer((req, res) => {
    let name;
    try {
      name =
        decodeURIComponent(new URL(req.url, url).pathname).replace(/^\//, "") ||
        "index.html";
    } catch {
      res.writeHead(400).end();
      return;
    }
    if (!allowed.has(name)) {
      res.writeHead(404).end("Not found");
      return;
    }
    const target = path.join(root, name);
    if (!existsSync(target)) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, {
      "Content-Type": mime[path.extname(name)] || "text/plain",
      "Cache-Control": "no-store",
    });
    res.end(readFileSync(target));
  });
  server.listen(port, "127.0.0.1", () => console.log(`Godot Path: ${url}`));
}
