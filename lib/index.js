import { createReadStream, readFileSync, writeFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { stat } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, extname, join, relative, resolve } from "node:path";

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

const VIDEO_EXT = new Set([".mp4", ".webm", ".mov"]);
const IMAGE_EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp"]);
// Wallpaper Engine 每个壁纸目录里都躺着一张 preview.jpg，那是缩略图，不是壁纸本身。
const PREVIEW_RE = /^preview\.(jpe?g|png|gif|webp)$/i;
// Wallpaper Engine 的订阅壁纸都躺在 Steam 库的 workshop/content/431960 下。
// 这里给几个常见位置兜底（不存在的会被跳过），真正想用哪个目录，写在 config.json 的 scanDirs 里。
const WE_REL = ["steamapps", "workshop", "content", "431960"];
const DEFAULT_SCAN_DIRS = [
  "D:\\SteamLibrary",
  "C:\\Program Files (x86)\\Steam",
  "C:\\Program Files\\Steam",
  "D:\\Steam",
  "E:\\SteamLibrary",
  join(homedir(), "Library", "Application Support", "Steam"),
  join(homedir(), ".steam", "steam"),
  join(homedir(), ".local", "share", "Steam"),
].map((base) => join(base, ...WE_REL));
// 壁纸目录里混着一堆不是壁纸的东西：素材图、封面、幻灯片底图、同一张图的三种分辨率。
const RES_DIR_RE = /^(2k|4k|8k|1080p|1440p|2160p|720p)$/i;
const SKIP_DIR_RE = /^(background|backgrounds|cover|covers|coverimage|materials|textures?|sprites?|fonts?|sounds?|audio|scripts?|shaders?|particles?|effects?)$/i;
const SKIP_FILE_RE = /(spritesheet|sprite|trail|mask|texture|loading|logo|icon|thumb)/i;
const LIB_TTL = 30000;

function readConfig() {
  try {
    const cfg = JSON.parse(readFileSync(CONFIG, "utf8"));
    const items = Array.isArray(cfg.items) ? cfg.items.filter((i) => i && i.id && i.file) : [];
    const scanDirs = Array.isArray(cfg.scanDirs)
      ? cfg.scanDirs.filter((d) => typeof d === "string" && d.trim())
      : [];
    return {
      items,
      scanDirs,
      mode: cfg.mode === "fixed" ? "fixed" : "random",
      fixedId: cfg.fixedId || null,
      dim: typeof cfg.dim === "number" ? cfg.dim : 0.4,
      blur: typeof cfg.blur === "number" ? cfg.blur : 0,
    };
  } catch {
    return { items: [], scanDirs: [], mode: "random", fixedId: null, dim: 0.4, blur: 0 };
  }
}

// 只改我要改的字段，别的原样留着——config.json 里还有注释性的 note，不该被我抹掉。
function writeConfig(patch) {
  let raw = {};
  try {
    raw = JSON.parse(readFileSync(CONFIG, "utf8"));
  } catch {
    raw = {};
  }
  const next = { ...raw, ...patch };
  writeFileSync(CONFIG, JSON.stringify(next, null, 2), "utf8");
  return next;
}

function kindOf(file) {
  const mime = MIME[extname(file).toLowerCase()] || "";
  return mime.startsWith("video/") ? "video" : "image";
}

function brief(item) {
  return item
    ? { id: item.id, name: item.name || item.id, kind: item.kind || kindOf(item.file), thumb: item.thumb ? 1 : 0 }
    : null;
}

// ── 壁纸库：把扫描目录（Wallpaper Engine 的 431960）翻一遍 ──
// 结构是 431960/<创意工坊id>/<媒体文件> + preview.jpg。所以根目录直接收文件，
// 子目录各收一份，名字尽量用 project.json 里的 title（文件名是乱码似的 id，没法认）。
let cache = { key: "", at: 0, items: [], byId: new Map(), dirs: [] };

function weTitle(dir) {
  try {
    const txt = readFileSync(join(dir, "project.json"), "utf8");
    const m = /"title"\s*:\s*"((?:[^"\\]|\\.)*)"/.exec(txt);
    if (m) {
      try {
        return JSON.parse('"' + m[1] + '"');
      } catch {
        return m[1];
      }
    }
  } catch {
    /* 没有 project.json 就用文件名 */
  }
  return null;
}

function sizeOf(file) {
  try {
    return statSync(file).size;
  } catch {
    return 0;
  }
}

// 同一张图的 2k/4k/8k 三份：把分辨率那层目录抹掉当同一把钥匙，只留最大的那份。
function dedupeKey(root, file) {
  const parts = relative(root, file).split("\\").join("/").split("/");
  parts.pop();
  return parts.filter((p) => !RES_DIR_RE.test(p)).join("/") + "/" + basename(file);
}

// 一组文件（同一个壁纸目录里的）转成候选。名字优先用 project.json 的 title；
// 一个目录里好几个片子，就把各自的文件名缀在后面，不然六个 webm 全叫专辑名。
function harvest(dir, root, preview, title, names, videos, images) {
  const picked = [];
  for (const name of names) {
    if (PREVIEW_RE.test(name) || SKIP_FILE_RE.test(name)) continue;
    const ext = extname(name).toLowerCase();
    const isVideo = VIDEO_EXT.has(ext);
    const isImage = IMAGE_EXT.has(ext);
    if (!isVideo && !isImage) continue;
    picked.push({ stem: basename(name, extname(name)), file: join(dir, name), isVideo, isImage });
  }
  if (!picked.length) return;
  for (const p of picked) {
    const entry = {
      id: "",
      name: title ? (picked.length > 1 ? title + " · " + p.stem : title) : p.stem,
      kind: p.isVideo ? "video" : "image",
      file: p.file,
      root,
      thumb: preview || (p.isImage ? p.file : null),
      size: p.isImage ? sizeOf(p.file) : 0,
      dedupe: p.isImage ? dedupeKey(root, p.file) : null,
    };
    (p.isVideo ? videos : images).push(entry);
  }
}

function collectFromRoot(root, videos, images) {
  let entries;
  try {
    entries = readdirSync(root, { withFileTypes: true });
  } catch {
    return;
  }

  harvest(root, root, null, null, entries.filter((e) => e.isFile()).map((e) => e.name), videos, images);

  for (const e of entries) {
    if (!e.isDirectory() || SKIP_DIR_RE.test(e.name)) continue;
    const dir = join(root, e.name);
    let kids;
    try {
      kids = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    let preview = null;
    for (const k of kids) {
      if (k.isFile() && PREVIEW_RE.test(k.name)) {
        preview = join(dir, k.name);
        break;
      }
    }
    const title = weTitle(dir);
    harvest(dir, root, preview, title, kids.filter((k) => k.isFile()).map((k) => k.name), videos, images);

    // 再往里一层：有些壁纸把片子放在 video/ 之类的子目录里，预览图还在壁纸目录这层。
    for (const k of kids) {
      if (!k.isDirectory() || SKIP_DIR_RE.test(k.name)) continue;
      const inner = join(dir, k.name);
      let kids2;
      try {
        kids2 = readdirSync(inner, { withFileTypes: true });
      } catch {
        continue;
      }
      harvest(inner, root, preview, title, kids2.filter((f) => f.isFile()).map((f) => f.name), videos, images);
    }
  }
}

function scanLibrary(scanDirs = DEFAULT_SCAN_DIRS, force = false) {
  const dirs = (Array.isArray(scanDirs) && scanDirs.length ? scanDirs : DEFAULT_SCAN_DIRS).map((d) => String(d));
  const key = dirs.join("|");
  if (!force && cache.key === key && Date.now() - cache.at < LIB_TTL) return cache;

  const videos = [];
  const images = [];
  for (const dir of dirs) {
    let abs;
    try {
      abs = resolve(dir);
    } catch {
      continue;
    }
    if (!existsSync(abs)) continue;
    try {
      if (!statSync(abs).isDirectory()) continue;
    } catch {
      continue;
    }
    collectFromRoot(abs, videos, images);
  }

  const best = new Map();
  for (const c of images) {
    const prev = best.get(c.dedupe);
    if (!prev || c.size > prev.size) best.set(c.dedupe, c);
  }

  const items = [];
  const byId = new Map();
  for (const it of [...videos, ...best.values()]) {
    const id = relative(it.root, it.file).split("\\").join("/");
    if (byId.has(id)) continue;
    delete it.root;
    delete it.dedupe;
    delete it.size;
    it.id = id;
    byId.set(id, it);
    items.push(it);
  }
  items.sort((a, b) => String(a.name).localeCompare(String(b.name), "zh"));
  cache = { key, at: Date.now(), items, byId, dirs };
  return cache;
}

// id 先当库里的相对路径找，找不到再当老 config.items 里的手写 id 找——两拨都留着。
function resolveItem(id, cfg) {
  if (!id) return null;
  const lib = scanLibrary(cfg ? cfg.scanDirs : undefined);
  const hit = lib.byId.get(id);
  if (hit) return hit;
  const own = cfg && cfg.items.find((i) => i.id === id);
  if (own) {
    return { id: own.id, name: own.name || own.id, kind: kindOf(own.file), file: own.file, thumb: own.file };
  }
  return null;
}

let picked = null;
let lastPing = null;
const pingLog = [];

function choose(cfg) {
  if (cfg.mode === "fixed" && cfg.fixedId) {
    const hit = resolveItem(cfg.fixedId, cfg);
    if (hit) return hit;
  }
  const pool = cfg.items;
  if (!pool.length) return resolveItem(cfg.fixedId, cfg);
  return pool[Math.floor(Math.random() * pool.length)];
}

function replyJson(res, obj, code = 200) {
  const body = Buffer.from(JSON.stringify(obj), "utf8");
  res.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Content-Length": body.length,
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((done) => {
    const chunks = [];
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > 64 * 1024) {
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => {
      try {
        done(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
      } catch {
        done({});
      }
    });
    req.on("error", () => done({}));
  });
}

function idFromPath(req, prefix) {
  const pathname = new URL(req.url || "/", "http://localhost").pathname;
  return decodeURIComponent(pathname.slice(prefix.length));
}

// 媒体（含 range）和缩略图走同一条路，只是文件不同。
async function sendFile(req, res, file) {
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
}

function apply(ctx) {
  const bootCfg = readConfig();
  picked = choose(bootCfg);

  // 桌面端首页注入表是宿主启动时一次性收集的：这里立刻挂上，把这次抽中的壁纸
  // 随首页一起塞给浏览器，前端就不必自己去打 state.json。
  ctx.on("webserver/index-inject", (table) => {
    const lib = scanLibrary(bootCfg.scanDirs);
    const payload = {
      items: bootCfg.items.map(brief),
      library: lib.items.map(brief),
      picked: brief(picked),
      pool: bootCfg.items.map((i) => i.id),
      mode: bootCfg.mode,
      fixedId: bootCfg.fixedId,
      dirs: lib.dirs,
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

    const statePayload = () => {
      const cfg = readConfig();
      const lib = scanLibrary(cfg.scanDirs);
      return {
        ok: true,
        mode: cfg.mode,
        fixedId: cfg.fixedId,
        dim: cfg.dim,
        blur: cfg.blur,
        dirs: lib.dirs,
        items: cfg.items.map(brief),
        pool: cfg.items.map((i) => i.id),
        library: lib.items.map(brief),
        picked: brief(picked),
      };
    };

    webCtx.effect(
      () =>
        server.register({
          kind: "exact",
          path: "/dsh-wallpaper/state.json",
          handler: (req, res) => replyJson(res, statePayload()),
        }),
      "dsh-wallpaper: state",
    );

    // 面板打开时拉一次完整的库；带 force 就是"我新订阅了壁纸，重扫"。
    webCtx.effect(
      () =>
        server.register({
          kind: "prefix",
          path: "/dsh-wallpaper/library",
          handler: (req, res) => {
            const cfg = readConfig();
            const force = /[?&]force=1/.test(req.url || "");
            const lib = scanLibrary(cfg.scanDirs, force);
            replyJson(res, {
              ok: true,
              dirs: lib.dirs,
              items: lib.items.map(brief),
              pool: cfg.items.map((i) => i.id),
              picked: brief(picked),
              mode: cfg.mode,
              fixedId: cfg.fixedId,
            });
          },
        }),
      "dsh-wallpaper: library",
    );

    // 挑中哪张：立刻换上，并写回 config（fixed + 把它塞进随机池）。
    webCtx.effect(
      () =>
        server.register({
          kind: "exact",
          path: "/dsh-wallpaper/select",
          handler: async (req, res) => {
            // 面板点卡片时走 GET（一张假图当信标，不用管跨域）；
            // 别处直接 POST 也照收。
            let id = new URL(req.url || "/", "http://localhost").searchParams.get("id");
            if (!id) {
              const body = await readBody(req);
              id = body.id;
            }
            const cfg = readConfig();
            const item = resolveItem(id, cfg);
            if (!item) {
              replyJson(res, { ok: false, error: "unknown id " + String(id) }, 404);
              return;
            }
            const items = cfg.items.slice();
            if (!items.some((i) => i.id === item.id)) {
              items.push({ id: item.id, name: item.name, file: item.file });
            }
            writeConfig({ mode: "fixed", fixedId: item.id, items });
            picked = item;
            replyJson(res, { ok: true, picked: brief(item), mode: "fixed", fixedId: item.id });
          },
        }),
      "dsh-wallpaper: select",
    );

    // 勾选几张凑成随机池：面板的多选就靠它。池子空着不收。
    webCtx.effect(
      () =>
        server.register({
          kind: "exact",
          path: "/dsh-wallpaper/pool",
          handler: async (req, res) => {
            let ids = new URL(req.url || "/", "http://localhost").searchParams.get("ids");
            if (!ids) {
              const body = await readBody(req);
              ids = Array.isArray(body.ids) ? body.ids.join(",") : body.ids;
            }
            const cfg = readConfig();
            const items = [];
            for (const raw of String(ids || "").split(",")) {
              const hit = resolveItem(raw.trim(), cfg);
              if (hit && !items.some((i) => i.id === hit.id)) {
                items.push({ id: hit.id, name: hit.name, file: hit.file });
              }
            }
            if (!items.length) {
              replyJson(res, { ok: false, error: "empty pool" }, 400);
              return;
            }
            writeConfig({ items, mode: "random" });
            picked = choose({ ...cfg, items, mode: "random" });
            replyJson(res, { ok: true, pool: items.map((i) => i.id), count: items.length, picked: brief(picked) });
          },
        }),
      "dsh-wallpaper: pool",
    );

    // 切回每次随机。
    webCtx.effect(
      () =>
        server.register({
          kind: "exact",
          path: "/dsh-wallpaper/mode",
          handler: async (req, res) => {
            const { mode } = await readBody(req);
            const want = mode === "fixed" ? "fixed" : "random";
            const cfg = readConfig();
            writeConfig({ mode: want });
            picked = choose({ ...cfg, mode: want });
            replyJson(res, { ok: true, mode: want, picked: brief(picked) });
          },
        }),
      "dsh-wallpaper: mode",
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
          path: "/dsh-wallpaper/thumb",
          handler: async (req, res) => {
            try {
              const item = resolveItem(idFromPath(req, "/dsh-wallpaper/thumb/"), readConfig());
              if (!item || !item.thumb) {
                res.writeHead(404).end();
                return;
              }
              await sendFile(req, res, item.thumb);
            } catch {
              res.writeHead(404).end();
            }
          },
        }),
      "dsh-wallpaper: thumb",
    );

    webCtx.effect(
      () =>
        server.register({
          kind: "prefix",
          path: "/dsh-wallpaper/file",
          handler: async (req, res) => {
            try {
              const item = resolveItem(idFromPath(req, "/dsh-wallpaper/file/"), readConfig());
              if (!item) {
                res.writeHead(404).end();
                return;
              }
              await sendFile(req, res, item.file);
            } catch {
              res.writeHead(404).end();
            }
          },
        }),
      "dsh-wallpaper: file",
    );
  });
}

export { apply, scanLibrary, readConfig };