window.__ModuleLoader__.load({
  id: "dsh-wallpaper",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    // ── 皮肤自定义协议：管理器在 window 上派事件，皮肤自带一份副本，不依赖管理器 ──
    const SKIN_CUSTOMIZATION_EVENTS = {
      1: {
        register: "dsh:skin-customization-register-v1",
        unregister: "dsh:skin-customization-unregister-v1",
        ready: "dsh:skin-customization-ready-v1",
      },
      2: {
        register: "dsh:skin-customization-register-v2",
        unregister: "dsh:skin-customization-unregister-v2",
        ready: "dsh:skin-customization-ready-v2",
      },
    };
    const PROTOCOL = 2;

    function exposeSkinCustomization(definition, target = window) {
      const token = {};
      const events = SKIN_CUSTOMIZATION_EVENTS[definition.protocol];
      const register = () => {
        target.dispatchEvent(new CustomEvent(events.register, { detail: { token, definition } }));
      };
      target.addEventListener(events.ready, register);
      register();
      return () => {
        target.removeEventListener(events.ready, register);
        target.dispatchEvent(new CustomEvent(events.unregister, { detail: { token, definition } }));
        definition.apply(null);
      };
    }

    // ── 常量 ──
    const BASE = "dsh-wallpaper";
    const STYLE_ID = "dsh-wallpaper-style";
    const LAYER_ID = "dsh-wallpaper-layer";
    const ATTR = "data-dsh-wallpaper";
    const RANDOM = "__random__";
    const PICKER_ID = "dsh-wallpaper-picker";
    const PICKER_BTN_ID = "dsh-wallpaper-picker-btn";

    const CSS = [
      "html,body{background:transparent !important}",
      "body[" + ATTR + "]{--dsw-alias-bg-base:transparent !important;--dsw-alias-bg-layer-1:transparent !important;--dsw-alias-bg-layer-2:transparent !important;--dsw-alias-bg-layer-3:transparent !important;--dsw-alias-bg-layer-4:transparent !important;--dsw-alias-bg-module-platform:transparent !important;--dsw-alias-bg-overlay:rgba(15,21,31,.96) !important;background:transparent !important}",
      "body[" + ATTR + "]:not([data-ds-dark-theme]){--dsw-alias-bg-base:transparent !important;--dsw-alias-bg-layer-1:transparent !important;--dsw-alias-bg-layer-2:transparent !important;--dsw-alias-bg-layer-3:transparent !important;--dsw-alias-bg-layer-4:transparent !important;--dsw-alias-bg-module-platform:transparent !important;--dsw-alias-bg-overlay:rgba(253,250,244,.95) !important}",
      "body[" + ATTR + "] #root,body[" + ATTR + "] #root>*{background:transparent !important}",
      "body[" + ATTR + "] #root{position:relative;z-index:1}",
      "#" + LAYER_ID + "{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}",
      "#" + LAYER_ID + ">*{position:absolute;inset:0;width:100%;height:100%}",
      ".dswp-media{object-fit:cover;transform:scale(1.03);filter:blur(var(--dswp-blur,0px))}",
      ".dswp-veil{background:rgba(0,0,0,var(--dswp-dim,0))}",
      // 壁纸保持原样，那字就得自己带点轮廓——不然铺到亮的地方白字就化了。
      "body[" + ATTR + "]{text-shadow:0 0 4px rgba(0,0,0,.72),0 0 11px rgba(0,0,0,.42)}",
      "body[" + ATTR + "]:not([data-ds-dark-theme]){text-shadow:0 0 4px rgba(255,255,255,.92),0 0 11px rgba(255,255,255,.66)}",

      // ── 挑壁纸面板 ──
      "#" + PICKER_BTN_ID + "{position:fixed;right:22px;bottom:22px;z-index:2147483000;width:40px;height:40px;padding:0;border-radius:50%;border:1.5px solid rgba(150,150,150,.55);background:transparent;box-shadow:0 2px 10px rgba(0,0,0,.16);cursor:pointer;transition:background .15s ease,transform .15s ease}",
      "#" + PICKER_BTN_ID + ":hover{background:rgba(255,255,255,.22);transform:scale(1.06)}",
      "#" + PICKER_ID + "{position:fixed;right:22px;bottom:70px;z-index:2147483001;width:min(860px,calc(100vw - 44px));max-height:min(74vh,660px);display:none;flex-direction:column;border-radius:16px;border:1px solid rgba(128,128,128,.28);background:rgba(18,21,28,.92);backdrop-filter:blur(18px);color:#eef1f6;font-family:inherit;font-size:13px;line-height:1.4;box-shadow:0 20px 56px rgba(0,0,0,.5);overflow:hidden}",
      "#" + PICKER_ID + "[data-open='1']{display:flex}",
      "body:not([data-ds-dark-theme]) #" + PICKER_ID + "{background:rgba(250,248,244,.95);color:#20242c;box-shadow:0 20px 48px rgba(0,0,0,.22)}",
      ".dswp-pk-head{display:flex;align-items:center;gap:8px;padding:13px 16px;border-bottom:1px solid rgba(128,128,128,.2)}",
      ".dswp-pk-title{font-weight:600}",
      ".dswp-pk-count{opacity:.55;font-size:12px}",
      ".dswp-pk-spacer{flex:1}",
      ".dswp-pk-act{padding:5px 11px;border-radius:8px;border:1px solid rgba(128,128,128,.32);background:transparent;color:inherit;font-family:inherit;font-size:12px;cursor:pointer}",
      ".dswp-pk-act:hover{background:rgba(128,128,128,.2)}",
      ".dswp-pk-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(158px,1fr));gap:10px;padding:14px 16px 16px;overflow:auto}",
      ".dswp-pk-card{position:relative;display:block;padding:0;border:2px solid transparent;border-radius:11px;background:rgba(128,128,128,.14);overflow:hidden;aspect-ratio:16/10;cursor:pointer;font-family:inherit;color:inherit}",
      ".dswp-pk-card:hover{border-color:rgba(128,128,128,.5)}",
      ".dswp-pk-card.is-active{border-color:#4c8bff}",
      ".dswp-pk-card.is-sel{outline:2px solid #4c8bff;outline-offset:-2px}",
      ".dswp-pk-mark{position:absolute;top:6px;right:6px;width:19px;height:19px;border-radius:50%;background:#4c8bff;color:#fff;font-size:12px;line-height:19px;text-align:center;font-weight:600;box-shadow:0 1px 5px rgba(0,0,0,.45);display:none}",
      ".dswp-pk-card.is-sel .dswp-pk-mark{display:block}",
      ".dswp-pk-card img{display:block;width:100%;height:100%;object-fit:cover}",
      ".dswp-pk-name{position:absolute;left:0;right:0;bottom:0;padding:16px 8px 6px;font-size:12px;line-height:1.2;text-align:left;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.9);background:linear-gradient(transparent,rgba(0,0,0,.72));white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
      ".dswp-pk-badge{position:absolute;top:6px;left:6px;padding:1px 6px;border-radius:6px;background:rgba(0,0,0,.55);color:#fff;font-size:11px;line-height:1.4}",
      ".dswp-pk-empty{padding:28px 4px;opacity:.6;text-align:center}",
    ].join("\n");

    // ── 状态 ──
    const loaded = { items: [], pool: [], picked: null, dim: 0, blur: 0, dirs: [] };
    let layerEl = null;
    let mediaEl = null;
    let pickerEl = null;
    let pickerBtnEl = null;
    let activeId = null;

    function fileUrl(id) {
      return new URL(BASE + "/file/" + encodeURIComponent(id), document.baseURI).href;
    }

    // 走不通的时候至少留个脚印：host 那边 /dsh-wallpaper/debug 能读到最后一条。
    // 相对地址和绝对地址各发一份——页面要是不在 http://127.0.0.1:19387 上，相对那份就打空了。
    const ABS_PING = "http://127.0.0.1:19387" + BASE + "/ping";
    function ping(msg) {
      const text = String(msg);
      try {
        fetch(new URL(BASE + "/ping?m=" + encodeURIComponent(text), document.baseURI).href, { cache: "no-store" }).catch(() => {});
      } catch (err) {
        /* 位置算不出来就算了 */
      }
      try {
        fetch(ABS_PING + "?m=" + encodeURIComponent(text), { cache: "no-store" }).catch(() => {});
      } catch (err) {
        /* 绝对地址也发不出去就算了 */
      }
    }

    // 画完自己照一眼：屏幕正中那个点上压着的是谁、背景变量有没有被我覆盖过来。
    function probe() {
      try {
        const hit = document.elementFromPoint(Math.round(window.innerWidth / 2), Math.round(window.innerHeight / 2));
        const cs = getComputedStyle(document.body);
        const layer = document.getElementById(LAYER_ID);
        const lcs = layer ? getComputedStyle(layer) : null;
        const rect = layer ? layer.getBoundingClientRect() : null;
        const desc = (el) => {
          if (!el) return "none";
          const cls = typeof el.className === "string" ? el.className.slice(0, 30) : "";
          return el.tagName + (el.id ? "#" + el.id : "") + (cls ? "." + cls : "");
        };
        return [
          "hit=" + desc(hit),
          "chain=" + (hit ? [desc(hit.parentElement), desc(hit.parentElement && hit.parentElement.parentElement)].join(">") : "-"),
          "attr=" + (document.body.getAttribute(ATTR) === null ? "no" : "yes"),
          "bgBase=" + cs.getPropertyValue("--dsw-alias-bg-base").trim(),
          "layer=" + (rect ? Math.round(rect.width) + "x" + Math.round(rect.height) + " z" + (lcs ? lcs.zIndex : "?") + " op" + (lcs ? lcs.opacity : "?") + " " + (lcs ? lcs.display : "?") : "none"),
        ].join(" | ");
      } catch (err) {
        return "probe-err " + (err && err.message ? err.message : String(err));
      }
    }

    // 兜底：谁要是拿一整块不透明底色把屏幕盖住，就把它那层底色撤了。
    // 变量能治的那批轮不到这儿；这儿专治"自己写死颜色或渐变"的容器。
    const MIN_AREA = 0.1; // 占屏幕一成以上就算大块
    const DONE = "dswpCleared";

    function uncover(tag) {
      const layer = document.getElementById(LAYER_ID);
      if (!layer) return "no-layer";
      const w = Math.max(1, window.innerWidth);
      const h = Math.max(1, window.innerHeight);
      const screen = w * h;
      const cleared = [];
      let scanned = 0;
      let biggest = null;
      const nodes = document.querySelectorAll("body *");
      for (let i = 0; i < nodes.length; i += 1) {
        const el = nodes[i];
        if (el === layer || layer.contains(el)) continue;
        const name = el.tagName;
        if (name === "SCRIPT" || name === "STYLE" || name === "LINK" || name === "HEAD") continue;
        const rect = el.getBoundingClientRect();
        const area = rect.width * rect.height;
        if (area < screen * MIN_AREA) continue;
        scanned += 1;
        if (!biggest || area > biggest.area) biggest = { area: area, el: el };
        const cs = getComputedStyle(el);
        const bg = cs.backgroundImage;
        const match = cs.backgroundColor.match(/rgba?\(([^)]+)\)/);
        let alpha = 1;
        if (match) {
          const parts = match[1].split(",").map((s) => parseFloat(s));
          alpha = parts.length > 3 ? parts[3] : 1;
        }
        const opaque = alpha > 0.6 || (bg && bg !== "none");
        if (!opaque) continue;
        if (el.dataset[DONE] === "1") continue;
        el.dataset[DONE] = "1";
        el.style.setProperty("background", "transparent", "important");
        const cls = typeof el.className === "string" ? el.className.slice(0, 28) : "";
        cleared.push(name + (el.id ? "#" + el.id : "") + (cls ? "." + cls : ""));
      }
      const head = biggest ? biggest.el.tagName + (biggest.el.id ? "#" + biggest.el.id : "") : "none";
      return "u(" + tag + ") scan=" + scanned + " cleared=" + (cleared.slice(0, 6).join(",") || "none") + " big=" + head;
    }

    // 界面是一层层长出来的：画完盯几秒，谁冒出来盖住就撤谁。
    function uncoverWatch() {
      if (uncoverWatch.timer) clearInterval(uncoverWatch.timer);
      let n = 0;
      uncoverWatch.timer = setInterval(() => {
        n += 1;
        const r = uncover("w" + n);
        if (n >= 12) {
          clearInterval(uncoverWatch.timer);
          uncoverWatch.timer = null;
          ping("uncover:done " + r);
        }
      }, 500);
    }

    function ensureStyle() {
      if (document.getElementById(STYLE_ID)) return;
      const style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = CSS;
      document.head.appendChild(style);
    }

    function paint(id, dim, blur) {
      const item = loaded.items.find((i) => i.id === id) || loaded.picked;
      if (!item) {
        ping("paint:no-item id=" + String(id) + " items=" + loaded.items.length);
        return;
      }
      ensureStyle();

      if (!layerEl) {
        layerEl = document.createElement("div");
        layerEl.id = LAYER_ID;
        const veil = document.createElement("div");
        veil.className = "dswp-veil";
        layerEl.appendChild(veil);
        document.body.insertBefore(layerEl, document.body.firstChild);
      }

      const isVideo = (item.kind || "video") === "video";
      const same = mediaEl && mediaEl.dataset.wpId === item.id && (isVideo ? mediaEl.tagName === "VIDEO" : mediaEl.tagName === "IMG");
      if (!same) {
        if (mediaEl) mediaEl.remove();
        if (isVideo) {
          mediaEl = document.createElement("video");
          mediaEl.muted = true;
          mediaEl.loop = true;
          mediaEl.autoplay = true;
          mediaEl.playsInline = true;
          mediaEl.setAttribute("muted", "");
          mediaEl.setAttribute("playsinline", "");
        } else {
          mediaEl = document.createElement("img");
        }
        mediaEl.className = "dswp-media";
        mediaEl.dataset.wpId = item.id;
        mediaEl.src = fileUrl(item.id);
        mediaEl.addEventListener("error", () => ping("media:error " + item.id + " | " + probe()));
        mediaEl.addEventListener("loadeddata", () => ping("media:ok " + item.id + " | " + probe()));
        layerEl.insertBefore(mediaEl, layerEl.firstChild);
        if (isVideo && mediaEl.play) mediaEl.play().catch(() => ping("media:play-blocked " + item.id));
      }

      layerEl.style.setProperty("--dswp-dim", String(typeof dim === "number" ? dim : 0.42));
      if (blur) layerEl.style.setProperty("--dswp-blur", blur + "px");
      else layerEl.style.removeProperty("--dswp-blur");
      document.body.setAttribute(ATTR, "");
      ping("paint:ok " + item.id + " | " + probe() + " | " + uncover("paint"));
      uncoverWatch();
    }

    // ── 挑壁纸面板：右下角一个小圆钮，点开是一面缩略图墙 ──
    function api(path, opts) {
      return fetch(new URL(BASE + "/" + path, document.baseURI).href, opts).then((res) => {
        if (!res.ok) throw new Error("http " + res.status);
        return res.json();
      });
    }

    function pickerButton() {
      return togglePicker(pickerEl && pickerEl.dataset.open !== "1");
    }

    function markActive() {
      if (!pickerEl) return;
      const cards = pickerEl.querySelectorAll("[data-id]");
      for (let i = 0; i < cards.length; i += 1) {
        cards[i].classList.toggle("is-active", cards[i].dataset.id === activeId);
      }
    }

    function markSelected() {
      if (!pickerEl) return;
      const pool = loaded.pool || [];
      const cards = pickerEl.querySelectorAll("[data-id]");
      for (let i = 0; i < cards.length; i += 1) {
        cards[i].classList.toggle("is-sel", pool.indexOf(cards[i].dataset.id) >= 0);
      }
    }

    function updateCount() {
      if (!pickerEl) return;
      const count = pickerEl.querySelector(".dswp-pk-count");
      if (!count) return;
      const total = (loaded.items || []).length;
      count.textContent = total ? "已选 " + (loaded.pool || []).length + " · 共 " + total + " 张" : "空的";
    }

    function buildGrid() {
      if (!pickerEl) return;
      const grid = pickerEl.querySelector(".dswp-pk-grid");
      if (!grid) return;
      grid.textContent = "";
      const items = loaded.items || [];
      updateCount();
      if (!items.length) {
        const empty = document.createElement("div");
        empty.className = "dswp-pk-empty";
        empty.textContent = loaded.dirs.length ? "翻了，没翻到能当壁纸的东西。" : "没配扫描目录。";
        grid.appendChild(empty);
        return;
      }
      for (const it of items) {
        const card = document.createElement("button");
        card.type = "button";
        card.className = "dswp-pk-card";
        card.dataset.id = it.id;
        card.title = (it.name || it.id) + "\n" + it.id;
        const img = document.createElement("img");
        img.loading = "lazy";
        img.alt = "";
        img.src = new URL(BASE + "/thumb/" + encodeURIComponent(it.id), document.baseURI).href;
        card.appendChild(img);
        if ((it.kind || "video") === "video") {
          const badge = document.createElement("span");
          badge.className = "dswp-pk-badge";
          badge.textContent = "▶";
          card.appendChild(badge);
        }
        const name = document.createElement("span");
        name.className = "dswp-pk-name";
        name.textContent = it.name || it.id;
        card.appendChild(name);
        const tick = document.createElement("span");
        tick.className = "dswp-pk-mark";
        tick.textContent = "✓";
        card.appendChild(tick);
        grid.appendChild(card);
      }
      markActive();
      markSelected();
    }

    function togglePicker(open) {
      if (!pickerEl) return;
      pickerEl.dataset.open = open ? "1" : "0";
      if (open) {
        buildGrid();
        void refreshLibrary(false);
      }
    }

    async function refreshLibrary(force) {
      try {
        const data = await api("library" + (force ? "?force=1" : ""), { cache: "no-store" });
        adopt(data);
        buildGrid();
      } catch (err) {
        ping("picker:refresh-failed " + (err && err.message ? err.message : String(err)));
      }
    }

    // 点一下卡片＝把它加进/移出随机池；只剩最后一张时不给取消，不然就没壁纸了。
    async function togglePick(id) {
      if (!id) return;
      const pool = (loaded.pool || []).slice();
      const at = pool.indexOf(id);
      if (at >= 0) pool.splice(at, 1);
      else pool.push(id);
      if (!pool.length) {
        ping("picker:pool-would-be-empty");
        return;
      }
      loaded.pool = pool;
      markSelected();
      updateCount();
      try {
        const data = await api("pool", {
          method: "POST",
          headers: { "Content-Type": "text/plain" },
          body: JSON.stringify({ ids: pool }),
        });
        if (data && Array.isArray(data.pool)) {
          loaded.pool = data.pool;
          markSelected();
          updateCount();
        }
      } catch (err) {
        ping("picker:pool-failed " + (err && err.message ? err.message : String(err)));
      }
    }

    async function shuffleWallpaper() {
      try {
        const data = await api("shuffle", { cache: "no-store" });
        if (data && data.picked) {
          activeId = data.picked.id;
          paint(data.picked.id, loaded.dim, loaded.blur);
          markActive();
        }
      } catch (err) {
        ping("picker:shuffle-failed " + (err && err.message ? err.message : String(err)));
      }
    }

    function ensurePicker() {
      if (pickerBtnEl && document.body.contains(pickerBtnEl)) return;
      ensureStyle();

      pickerBtnEl = document.createElement("button");
      pickerBtnEl.id = PICKER_BTN_ID;
      pickerBtnEl.type = "button";
      pickerBtnEl.title = "换壁纸";
      pickerBtnEl.setAttribute("aria-label", "换壁纸");
      pickerBtnEl.dataset[DONE] = "1";
      pickerBtnEl.addEventListener("click", pickerButton);
      document.body.appendChild(pickerBtnEl);

      pickerEl = document.createElement("div");
      pickerEl.id = PICKER_ID;
      pickerEl.dataset[DONE] = "1";
      pickerEl.dataset.open = "0";
      pickerEl.innerHTML =
        '<div class="dswp-pk-head">' +
        '<span class="dswp-pk-title">选几张，随机放</span>' +
        '<span class="dswp-pk-count"></span>' +
        '<span class="dswp-pk-spacer"></span>' +
        '<button type="button" class="dswp-pk-act" data-act="shuffle">换一张</button>' +
        '<button type="button" class="dswp-pk-act" data-act="rescan">重扫</button>' +
        '<button type="button" class="dswp-pk-act" data-act="close">×</button>' +
        "</div>" +
        '<div class="dswp-pk-grid"></div>';
      pickerEl.addEventListener("click", (ev) => {
        const hit = ev.target && ev.target.closest ? ev.target.closest("[data-act],[data-id]") : null;
        if (!hit) return;
        if (hit.dataset.act === "close") togglePicker(false);
        else if (hit.dataset.act === "rescan") void refreshLibrary(true);
        else if (hit.dataset.act === "shuffle") void shuffleWallpaper();
        else if (hit.dataset.id) void togglePick(hit.dataset.id);
      });
      document.body.appendChild(pickerEl);
      buildGrid();
    }

    function teardown() {
      if (layerEl) {
        layerEl.remove();
        layerEl = null;
        mediaEl = null;
      }
      if (pickerEl) {
        pickerEl.remove();
        pickerEl = null;
      }
      if (pickerBtnEl) {
        pickerBtnEl.remove();
        pickerBtnEl = null;
      }
      activeId = null;
      const style = document.getElementById(STYLE_ID);
      if (style) style.remove();
      document.body.removeAttribute(ATTR);
      document.documentElement.removeAttribute(ATTR);
    }

    function adopt(data) {
      // library 是整个壁纸库，items 只是 config 里登记过的那几个；面板要的是前者。
      const lib = Array.isArray(data.library) && data.library.length ? data.library : data.items;
      loaded.items = Array.isArray(lib) ? lib : [];
      // pool 是配置里选中的那几张（随机池），items 是整库。
      loaded.pool = Array.isArray(data.pool) ? data.pool.slice() : [];
      loaded.picked = data.picked || null;
      loaded.dim = typeof data.dim === "number" ? data.dim : 0.42;
      loaded.blur = typeof data.blur === "number" ? data.blur : 0;
      loaded.dirs = Array.isArray(data.dirs) ? data.dirs : [];
      activeId = loaded.picked ? loaded.picked.id : null;
    }

    async function fetchState() {
      // host 会把这次抽中的壁纸随首页一起塞进来，优先用它，省一次请求。
      const boot = window.__DSH_WALLPAPER_BOOT__;
      if (boot && boot.picked) {
        adopt(boot);
        return;
      }
      try {
        const res = await fetch(new URL(BASE + "/state.json", document.baseURI).href, { cache: "no-store" });
        adopt(await res.json());
      } catch (err) {
        /* 拿不到清单就什么都不画 */
      }
    }

    function makeDefinition() {
      const options = [{ value: RANDOM, label: "每次随机一张", labelEn: "Random each launch" }].concat(
        loaded.items.map((i) => ({ value: i.id, label: i.name || i.id })),
      );
      const onlyWhenOn = { key: "enabled", values: [true] };
      return {
        protocol: PROTOCOL,
        skinId: "whale-wallpaper",
        title: "壁纸",
        titleEn: "WALLPAPER",
        settings: [
          { key: "enabled", type: "boolean", label: "铺上壁纸", labelEn: "Enable wallpaper", defaultValue: true },
          {
            key: "wallpaper",
            type: "select",
            label: "用哪张",
            labelEn: "Wallpaper",
            defaultValue: RANDOM,
            options,
            visibleWhen: onlyWhenOn,
          },
          {
            key: "dim",
            type: "range",
            label: "遮罩浓度",
            labelEn: "Dim",
            description: "越高越白，字越好读。",
            min: 0,
            max: 0.9,
            step: 0.02,
            defaultValue: loaded.dim,
            visibleWhen: onlyWhenOn,
          },
          {
            key: "blur",
            type: "range",
            label: "模糊",
            labelEn: "Blur",
            min: 0,
            max: 24,
            step: 1,
            unit: "px",
            defaultValue: loaded.blur,
            visibleWhen: onlyWhenOn,
          },
        ],
        apply(state) {
          // 管理器递过来的可能是 { values: {...} }，也可能直接就是 {...}；空值当"关掉"。
          const raw =
            state && typeof state === "object" && state.values && typeof state.values === "object"
              ? state.values
              : state;
          if (!raw || typeof raw !== "object" || raw.enabled === false) {
            ping("apply:off " + (raw === null ? "null" : typeof raw));
            teardown();
            return;
          }
          const values = raw;
          ping("apply:on");
          const id = values.wallpaper === RANDOM ? loaded.picked && loaded.picked.id : values.wallpaper;
          paint(id, typeof values.dim === "number" ? values.dim : loaded.dim, typeof values.blur === "number" ? values.blur : loaded.blur);
        },
      };
    }

    function apply(ctx) {
      ctx.effect(() => {
        let disposed = false;
        let release = null;
        (async () => {
          ping("mount:start base=" + document.baseURI + " orboot=" + (typeof window.__DSH_WALLPAPER_BOOT__ === "undefined" ? "no" : "yes"));
          try {
            await fetchState();
          } catch (err) {
            ping("mount:state-failed " + (err && err.message ? err.message : String(err)));
          }
          if (disposed) return;
          ping("mount:loaded items=" + loaded.items.length + " picked=" + (loaded.picked ? loaded.picked.id : "none"));
          const definition = makeDefinition();
          ensurePicker();
          // 先按默认值铺一次：管理器要是不在、或者不回调我，壁纸也该照出。
          definition.apply({
            values: { enabled: true, wallpaper: RANDOM, dim: loaded.dim, blur: loaded.blur },
          });
          try {
            release = exposeSkinCustomization(definition);
          } catch (err) {
            ping("mount:expose-failed " + (err && err.message ? err.message : String(err)));
          }
        })();
        return () => {
          disposed = true;
          if (release) release();
          teardown();
        };
      }, "dsh-wallpaper: skin layers");
    }

    exports.apply = apply;
    return module.exports;
  },
});