import { createReadStream, readFileSync } from "node:fs";
import { stat } from "node:fs/promises";
import { homedir } from "node:os";
import { extname, join } from "node:path";

const CONFIG = join(homedir(), ".dsh", "dsh-wallpaper", "config.json");

const MIME = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".bmp": "image/bmp",
};

function readConfig() {
  try {
    const cfg = JSON.parse(readFileSync(CONFIG, "utf8"));
    const items = Array.isArray(cfg.items) ? cfg.items.filter((i) => i && i.id && i.file) : [];
    return {
      items,
      mode: cfg.mode === "fixed" ? "fixed" : "random",
      fixedId: cfg.fixedId || null,
      dim: typeof cfg.dim === "number" ? cfg.dim : 0.4,
      blur: typeof cfg.blur === "number" ? cfg.blur : 0,
    };
  } catch {
    return { items: [], mode: "random", fixedId: null, dim: 0.4, blur: 0 };
  }
}

function kindOf(file) {
  const mime = MIME[extname(file).toLowerCase()] || "";
  return mime.startsWith("video/") ? "video" : "image";
}

function brief(item) {
  return item ? { id: item.id, name: item.name || item.id, kind: kindOf(item.file) } : null;
}

let picked = null;
let lastPing = null;
const pingLog = [];

function choose(cfg) {
  const items = cfg.items;
  if (!items.length) return null;
  if (cfg.mode === "fixed" && cfg.fixedId) {
    const hit = items.find((i) => i.id === cfg.fixedId);
    if (hit) return hit;
  }
  return items[Math.floor(Math.random() * items.length)];
}

function replyJson(res, obj) {
  const body = Buffer.from(JSON.stringify(obj), "utf8");
  res.writeHead(200, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Content-Length": body.length,
  });
  res.end(body);
}

function apply(ctx) {
  const bootCfg = readConfig();
  picked = choose(bootCfg);

  // 桌面端首页注入表是宿主启动时一次性收集的：这里立刻挂上，把这次抽中的壁纸
  // 随首页一起塞给浏览器，前端就不必自己去打 state.json。
  ctx.on("webserver/index-inject", (table) => {
    const payload = {
      items: bootCfg.items.map(brief),
      picked: brief(picked),
      dim: bootCfg.dim,
      blur: bootCfg.blur,
    };
    table.push({
      kind: "script",
      text: "window.__DSH_WALLPAPER_BOOT__=" + JSON.stringify(payload) + ";",
    });
  });

  ctx.inject(["webServer"], (webCtx) => {
    const server = webCtx.get("webServer");

    webCtx.effect(
      () =>
        server.register({
          kind: "exact",
          path: "/dsh-wallpaper/state.json",
          handler: (req, res) => {
            const cfg = readConfig();
            replyJson(res, {
              ok: true,
              mode: cfg.mode,
              fixedId: cfg.fixedId,
              dim: cfg.dim,
              blur: cfg.blur,
              items: cfg.items.map(brief),
              picked: brief(picked),
            });
          },
        }),
      "dsh-wallpaper: state",
    );

    webCtx.effect(
      () =>
        server.register({
          kind: "exact",
          path: "/dsh-wallpaper/shuffle",
          handler: (req, res) => {
            picked = choose(readConfig());
            replyJson(res, { ok: true, picked: brief(picked) });
          },
        }),
      "dsh-wallpaper: shuffle",
    );

    webCtx.effect(
      () =>
        server.register({
          kind: "prefix",
          path: "/dsh-wallpaper/ping",
          handler: (req, res) => {
            try {
              const u = new URL(req.url || "/", "http://localhost");
              lastPing = { at: new Date().toISOString(), q: u.search.replace(/^\?/, "") };
            } catch {
              lastPing = { at: new Date().toISOString(), q: "(bad)" };
            }
            pingLog.push(lastPing);
            if (pingLog.length > 30) pingLog.shift();
            res.writeHead(204, { "Cache-Control": "no-store" }).end();
          },
        }),
      "dsh-wallpaper: ping",
    );

    webCtx.effect(
      () =>
        server.register({
          kind: "exact",
          path: "/dsh-wallpaper/debug",
          handler: (req, res) =>
            replyJson(res, { ok: true, ping: lastPing, log: pingLog, picked: brief(picked) }),
        }),
      "dsh-wallpaper: debug",
    );

    webCtx.effect(
      () =>
        server.register({
          kind: "prefix",
          path: "/dsh-wallpaper/file",
          handler: async (req, res) => {
            try {
              const pathname = new URL(req.url || "/", "http://localhost").pathname;
              const id = decodeURIComponent(pathname.slice("/dsh-wallpaper/file/".length));
              const item = readConfig().items.find((i) => i.id === id);
              if (!item) {
                res.writeHead(404).end();
                return;
              }
              const file = item.file;
              const info = await stat(file);
              const mime = MIME[extname(file).toLowerCase()] || "application/octet-stream";
              const range = typeof req.headers.range === "string" ? req.headers.range.trim() : "";
              const parts = range ? /^bytes=(\d*)-(\d*)$/.exec(range) : null;

              if (parts && (parts[1] || parts[2])) {
                const size = info.size;
                const start = parts[1] ? parseInt(parts[1], 10) : Math.max(0, size - parseInt(parts[2], 10));
                const end = parts[1] && parts[2] ? Math.min(parseInt(parts[2], 10), size - 1) : size - 1;
                if (!Number.isFinite(start) || start > end || start >= size) {
                  res.writeHead(416, { "Content-Range": `bytes */${size}` }).end();
                  return;
                }
                res.writeHead(206, {
                  "Content-Type": mime,
                  "Accept-Ranges": "bytes",
                  "Content-Range": `bytes ${start}-${end}/${size}`,
                  "Content-Length": end - start + 1,
                  "Cache-Control": "no-store",
                });
                createReadStream(file, { start, end }).pipe(res);
                return;
              }

              res.writeHead(200, {
                "Content-Type": mime,
                "Accept-Ranges": "bytes",
                "Content-Length": info.size,
                "Cache-Control": "no-store",
              });
              if (req.method === "HEAD") {
                res.end();
                return;
              }
              createReadStream(file).pipe(res);
            } catch {
              res.writeHead(404).end();
            }
          },
        }),
      "dsh-wallpaper: file",
    );
  });
}

export { apply };