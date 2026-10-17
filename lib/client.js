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
    ].join("\n");

    // ── 状态 ──
    const loaded = { items: [], picked: null, dim: 0, blur: 0 };
    let layerEl = null;
    let mediaEl = null;

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

    function teardown() {
      if (layerEl) {
        layerEl.remove();
        layerEl = null;
        mediaEl = null;
      }
      const style = document.getElementById(STYLE_ID);
      if (style) style.remove();
      document.body.removeAttribute(ATTR);
      document.documentElement.removeAttribute(ATTR);
    }

    function adopt(data) {
      loaded.items = Array.isArray(data.items) ? data.items : [];
      loaded.picked = data.picked || null;
      loaded.dim = typeof data.dim === "number" ? data.dim : 0.42;
      loaded.blur = typeof data.blur === "number" ? data.blur : 0;
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
        title: "大肥鱼的壁纸",
        titleEn: "WHALE WALLPAPER",
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