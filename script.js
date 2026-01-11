
(() => {
  "use strict";

  // =========================
  // Helpers
  // =========================
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const on = (el, events, fn, opts) => {
    if (!el) return;
    events.split(" ").forEach((ev) => el.addEventListener(ev, fn, opts));
  };

  const onMany = (els, events, fn, opts) => {
    els.forEach((el) => on(el, events, fn, opts));
  };

  const setAttr = (el, attr, value) => {
    if (!el) return;
    if (value === "" || value === null || value === undefined) el.removeAttribute(attr);
    else el.setAttribute(attr, value);
  };

  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  const px = (n) => `${Number(n)}px`;

  // Bind robusto: input + change
  const bindLab = (ids, update) => {
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean);
    if (!els.length) return false;
    onMany(els, "input change", update);
    update();
    return true;
  };

  // =========================
  // Dropdowns (CLICK) - 1 listener global + ARIA
  // =========================
  (() => {
    const dropdowns = $$(".dropdown");
    if (!dropdowns.length) return;

    const getParts = (d) => ({
      d,
      trigger: d.querySelector(".tabLink"),
      menu: d.querySelector(".dropdownMenu"),
    });

    const parts = dropdowns.map(getParts).filter((p) => p.trigger && p.menu);

    const close = (p) => {
      p.menu.classList.remove("is-open");
      p.trigger.setAttribute("aria-expanded", "false");
    };

    const closeAll = (except) => {
      parts.forEach((p) => {
        if (except && p.d === except.d) return;
        close(p);
      });
    };

    const toggle = (p) => {
      const isOpen = p.menu.classList.toggle("is-open");
      p.trigger.setAttribute("aria-expanded", String(isOpen));
      if (isOpen) closeAll(p);
    };

    // Click dentro del documento
    document.addEventListener("click", (e) => {
      const dropdown = e.target.closest(".dropdown");

      // click en trigger => toggle (y no navega)
      if (dropdown) {
        const p = parts.find((x) => x.d === dropdown);
        const isTrigger = e.target.closest(".tabLink") && dropdown.contains(e.target);
        const isMenuLink = e.target.closest(".dropdownMenu a");

        if (p && isTrigger) {
          e.preventDefault();
          toggle(p);
          return;
        }

        // click en item del menú => cierra (deja navegar)
        if (p && isMenuLink) {
          close(p);
          return;
        }

        // click dentro del dropdown pero fuera => nada
        return;
      }

      // click fuera => cerrar todo
      closeAll();
    });

    // Escape => cerrar todo
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeAll();
    });

    // Si cambias hash, cierro (por limpieza UI)
    window.addEventListener("hashchange", () => closeAll());
  })();

  // =========================
  // Scroll-Spy (IDs corregidos a tu HTML actual)
  //  - Tabs apuntan a: #html, #css, #js, #about
  //  - Lab HTML/CSS/JS deben contar en su pestaña
  // =========================
  (() => {
    const topbar = $(".topbar");
    const topbarH = () => (topbar ? Math.round(topbar.getBoundingClientRect().height) : 0);

    // IMPORTANTE: en tu nav, HTML/CSS/JS son .tabLink dentro de .dropdown
    const nav = $(".topnav");
    if (!nav || !("IntersectionObserver" in window)) return;

    const htmlLink = nav.querySelector('.dropdown .tabLink[href="#html"]');
    const cssLink = nav.querySelector('.dropdown .tabLink[href="#css"]');
    const jsLink = nav.querySelector('.dropdown .tabLink[href="#js"]');
    const aboutLink = nav.querySelector('a[href="#about"]');

    const links = [
      { id: "html", el: htmlLink },
      { id: "css", el: cssLink },
      { id: "js", el: jsLink },
      { id: "about", el: aboutLink },
    ].filter((x) => x.el);

    const htmlSec = document.getElementById("html");
    const cssSec = document.getElementById("css");
    const jsSec = document.getElementById("js");
    const aboutSec = document.getElementById("about");

    const labHtml = document.querySelector('section.lab[aria-label*="HTML"]');
    const labCss = document.getElementById("lab-css");
    const labJs = document.getElementById("lab-js");

    const sections = [htmlSec, cssSec, jsSec, aboutSec, labHtml, labCss, labJs].filter(Boolean);

    if (!links.length || !sections.length) return;

    const clear = () => links.forEach((x) => x.el.classList.remove("is-active"));
    const setActive = (id) => {
      clear();
      const found = links.find((x) => x.id === id);
      if (found) found.el.classList.add("is-active");
    };

    const mapSectionToTab = (el) => {
      if (!el) return null;
      if (el === labHtml) return "html";
      if (el === labCss) return "css";
      if (el === labJs) return "js";
      return el.id || null;
    };

    const makeObserver = () =>
      new IntersectionObserver(
        (entries) => {
          const visible = entries
            .filter((e) => e.isIntersecting)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

          if (!visible) return;
          const id = mapSectionToTab(visible.target);
          if (id) setActive(id);
        },
        {
          threshold: [0.2, 0.35, 0.5, 0.65],
          rootMargin: `-${topbarH()}px 0px -55% 0px`,
        }
      );

    let spy = makeObserver();
    sections.forEach((sec) => spy.observe(sec));

    on(window, "resize", () => {
      spy.disconnect();
      spy = makeObserver();
      sections.forEach((sec) => spy.observe(sec));
    });
  })();

  // =========================
  // Botón subir
  // =========================
  (() => {
    const toTop = $("#toTop");
    const topbar = $(".topbar");
    if (!toTop) return;

    on(toTop, "click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

    if (topbar && "IntersectionObserver" in window) {
      const obs = new IntersectionObserver(
        ([entry]) => toTop.classList.toggle("is-visible", !entry.isIntersecting),
        { threshold: 0.01 }
      );
      obs.observe(topbar);
    }
  })();

  // =========================
  // Copiar bloques de código
  // =========================
  (() => {
    const copyText = async (text) => {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    };

    $$(".copyBtn").forEach((btn) => {
      on(btn, "click", async () => {
        const pre = btn.previousElementSibling;
        if (!pre || !pre.classList.contains("code")) return;

        const old = btn.textContent;
        try {
          const ok = await copyText(pre.textContent || "");
          btn.textContent = ok ? "¡Copiado!" : "No se pudo copiar";
        } catch {
          btn.textContent = "No se pudo copiar";
        } finally {
          setTimeout(() => (btn.textContent = old), 900);
        }
      });
    });
  })();

  // =========================
  // LAB HTML (básico)
  // =========================
  (() => {
    // Formularios
    {
      const requiredSel = $("#labRequired");
      const typeSel = $("#labType");
      const placeholderInp = $("#labPlaceholder");
      const preview = $("#labInputPreview");
      const hint = $("#labFormHint");

      const update = () => {
        if (!preview) return;
        const required = requiredSel?.value === "true";

        preview.type = typeSel?.value || "text";
        preview.placeholder = placeholderInp?.value ?? "";
        setAttr(preview, "required", required ? "" : null);

        if (hint) {
          hint.textContent = required
            ? "required está activo: el navegador pedirá completar el campo."
            : "required está desactivado.";
        }
      };

      bindLab(["labRequired", "labType", "labPlaceholder"], update);
    }

    // Enlaces
    {
      const hrefInp = $("#labHref");
      const targetSel = $("#labTarget");
      const relInp = $("#labRel");
      const link = $("#labLinkPreview");

      const update = () => {
        if (!link) return;

        const href = (hrefInp?.value || "#").trim() || "#";
        const target = targetSel?.value || "_self";

        link.href = href;
        link.target = target;

        if (target === "_blank") setAttr(link, "rel", relInp?.value || "noopener noreferrer");
        else link.removeAttribute("rel");

        link.textContent = `Abrir: ${href}`;
      };

      bindLab(["labHref", "labTarget", "labRel"], update);
    }

    // Imágenes
    {
      const altInp = $("#labAlt");
      const widthInp = $("#labImgWidth");
      const loadingSel = $("#labLazy");
      const img = $("#labImgPreview");

      const update = () => {
        if (!img) return;
        img.alt = altInp?.value ?? "";
        img.loading = loadingSel?.value || "lazy";

        const w = clamp(Number(widthInp?.value || 180), 80, 400);
        img.style.width = px(w);
      };

      bindLab(["labAlt", "labImgWidth", "labLazy"], update);
    }

    // Listas
    {
      const typeSel = $("#labListType");
      const startInp = $("#labStart");
      const revSel = $("#labReversed");
      const preview = $("#labListPreview");
      const items = ["Elemento A", "Elemento B", "Elemento C"];

      const update = () => {
        if (!preview) return;

        const type = typeSel?.value || "ul";
        if (type === "ul") {
          preview.innerHTML = `<ul><li>${items.join("</li><li>")}</li></ul>`;
          return;
        }

        const start = Math.max(1, Number(startInp?.value || 1));
        const reversed = revSel?.value === "true";

        preview.innerHTML = `<ol start="${start}" ${reversed ? "reversed" : ""}>
          <li>${items.join("</li><li>")}</li>
        </ol>`;
      };

      bindLab(["labListType", "labStart", "labReversed"], update);
    }

    // Párrafos
    {
      const textInp = $("#labText");
      const titleInp = $("#labTitleAttr");
      const p = $("#labPPreview");

      const update = () => {
        if (!p) return;
        p.textContent = textInp?.value ?? "";
        setAttr(p, "title", titleInp?.value);
      };

      bindLab(["labText", "labTitleAttr"], update);
    }
  })();

  // =========================
  // LAB HTML extra (Audio/Video, Canvas, Contenedores, Details, Iframe, Fieldset)
  // =========================
  (() => {
    const qs = (id) => document.getElementById(id);

    // --- Audio / Video ---
    {
      const labMediaType = qs("labMediaType");
      const labControls = qs("labControls");
      const labAutoplay = qs("labAutoplay");
      const labLoop = qs("labLoop");
      const labMediaPreview = qs("labMediaPreview");

      const update = () => {
        if (!labMediaPreview || !labMediaType) return;

        const type = labMediaType.value; // audio | video
        const controls = labControls?.value === "true";
        const autoplay = labAutoplay?.value === "true";
        const loop = labLoop?.value === "true";

        const srcAudio = "https://www.w3schools.com/html/horse.mp3";
        const srcVideo = "https://www.w3schools.com/html/mov_bbb.mp4";

        const tag = document.createElement(type);
        setAttr(tag, "controls", controls ? "" : null);
        setAttr(tag, "autoplay", autoplay ? "" : null);
        setAttr(tag, "loop", loop ? "" : null);

        // para autoplay en video
        if (type === "video") tag.muted = true;

        const source = document.createElement("source");
        source.src = type === "audio" ? srcAudio : srcVideo;
        source.type = type === "audio" ? "audio/mpeg" : "video/mp4";
        tag.appendChild(source);

        if (type === "video") {
          tag.style.width = "100%";
          tag.style.borderRadius = "12px";
          tag.style.border = "1px solid rgba(93,89,122,.25)";
        }

        labMediaPreview.replaceChildren(tag);
      };

      bindLab(["labMediaType", "labControls", "labAutoplay", "labLoop"], update);
    }

    // --- Canvas ---
    {
      const labCanvas = qs("labCanvas");
      const labCanvasSize = qs("labCanvasSize");
      const labCanvasShape = qs("labCanvasShape");
      const labCanvasDraw = qs("labCanvasDraw");
      const labCanvasClear = qs("labCanvasClear");

      const ctx = () => labCanvas?.getContext("2d") || null;

      const clear = () => {
        const c = ctx();
        if (!c || !labCanvas) return;
        c.clearRect(0, 0, labCanvas.width, labCanvas.height);
      };

      const draw = () => {
        const c = ctx();
        if (!c || !labCanvas) return;

        clear();

        c.fillStyle = "rgba(76,57,250,.18)";
        c.strokeStyle = "rgba(57,161,250,.6)";
        c.lineWidth = 2;

        const w = labCanvas.width;
        const h = labCanvas.height;
        const mode = labCanvasShape?.value || "dots";

        if (mode === "rect") {
          c.fillRect(20, 20, w - 40, h - 40);
          c.strokeRect(20, 20, w - 40, h - 40);
          return;
        }

        if (mode === "circle") {
          c.beginPath();
          c.arc(w / 2, h / 2, Math.min(w, h) / 4, 0, Math.PI * 2);
          c.fill();
          c.stroke();
          return;
        }

        if (mode === "text") {
          c.fillStyle = "rgba(47,43,68,.9)";
          c.font = "bold 18px system-ui";
          c.fillText("Canvas Demo", 20, 35);
          c.fillStyle = "rgba(76,57,250,.18)";
          c.fillRect(20, 55, w - 40, 18);
          return;
        }

        // dots
        for (let i = 0; i < 60; i++) {
          const x = 10 + Math.random() * (w - 20);
          const y = 10 + Math.random() * (h - 20);
          c.beginPath();
          c.arc(x, y, 2.2, 0, Math.PI * 2);
          c.fill();
        }
      };

      const resize = () => {
        if (!labCanvas || !labCanvasSize) return;
        const [w, h] = labCanvasSize.value.split("x").map(Number);
        labCanvas.width = w;
        labCanvas.height = h;
        draw();
      };

      on(labCanvasSize, "input change", resize);
      on(labCanvasShape, "input change", draw);
      on(labCanvasDraw, "click", draw);
      on(labCanvasClear, "click", clear);

      resize();
    }

    // --- Contenedores ---
    {
      const tagSel = qs("labContainerTag");
      const idInp = qs("labContainerId");
      const classInp = qs("labContainerClass");
      const roleSel = qs("labContainerRole");
      const out = qs("labContainerPreview");

      const update = () => {
        if (!out || !tagSel) return;

        const el = document.createElement(tagSel.value);
        setAttr(el, "id", idInp?.value.trim());
        setAttr(el, "class", classInp?.value.trim());
        setAttr(el, "role", roleSel?.value);

        el.textContent = `Soy un <${tagSel.value}> de prueba`;
        el.style.cssText =
          "padding:12px;border-radius:12px;border:1px solid rgba(93,89,122,.25);background:rgba(57,161,250,.08)";

        out.replaceChildren(el);
      };

      bindLab(["labContainerTag", "labContainerId", "labContainerClass", "labContainerRole"], update);
    }

    // --- details / summary ---
    {
      const openSel = qs("labDetailsOpen");
      const sumInp = qs("labSummaryText");
      const txtInp = qs("labDetailsText");
      const details = qs("labDetailsPreview");
      const sum = qs("labSummaryPreview");
      const content = qs("labDetailsContent");

      const update = () => {
        if (!details || !sum || !content) return;
        sum.textContent = sumInp?.value ?? "";
        content.textContent = txtInp?.value ?? "";
        setAttr(details, "open", openSel?.value === "true" ? "" : null);
      };

      bindLab(["labDetailsOpen", "labSummaryText", "labDetailsText"], update);
    }

    // --- iframes ---
    {
      const srcSel = qs("labIframeSrc");
      const titleInp = qs("labIframeTitle");
      const loadingSel = qs("labIframeLoading");
      const iframe = qs("labIframePreview");

      const update = () => {
        if (!iframe) return;
        iframe.src = srcSel?.value || "https://example.com";
        iframe.title = titleInp?.value || "Iframe";
        iframe.loading = loadingSel?.value || "lazy";
      };

      bindLab(["labIframeSrc", "labIframeTitle", "labIframeLoading"], update);
    }

    // --- fieldset ---
    {
      const disSel = qs("labFieldsetDisabled");
      const legInp = qs("labLegendText");
      const fieldset = qs("labFieldsetPreview");
      const legend = qs("labLegendPreview");

      const update = () => {
        if (!fieldset || !legend) return;
        setAttr(fieldset, "disabled", disSel?.value === "true" ? "" : null);
        legend.textContent = legInp?.value || "Legend";
      };

      bindLab(["labFieldsetDisabled", "labLegendText"], update);
    }
  })();

  // =========================
  // LAB: Tablas + Textareas
  // =========================
  (() => {
    // Tablas
    {
      const cap = $("#labTableCaption");
      const border = $("#labTableBorder");
      const head = $("#labTableHead");
      const rows = $("#labTableRows");
      const out = $("#labTablePreview");

      const update = () => {
        if (!out || !rows) return;

        const n = Number(rows.value);
        const hasHead = head?.value === "true";
        const bordered = border?.value === "true";
        const caption = cap?.value || "";

        let html = `<table class="labTable ${bordered ? "bordered" : ""}">`;
        if (caption) html += `<caption>${caption}</caption>`;

        if (hasHead) {
          html += `
            <thead><tr>
              <th>Nombre</th><th>Edad</th><th>Ciudad</th>
            </tr></thead>`;
        }

        html += "<tbody>";
        for (let i = 1; i <= n; i++) {
          html += `<tr><td>Persona ${i}</td><td>${18 + i}</td><td>Ciudad ${i}</td></tr>`;
        }
        html += "</tbody></table>";

        out.innerHTML = html;
      };

      bindLab(["labTableCaption", "labTableBorder", "labTableHead", "labTableRows"], update);
    }

    // Textareas
    {
      const r = $("#labTextareaRows");
      const c = $("#labTextareaCols");
      const ph = $("#labTextareaPlaceholder");
      const ro = $("#labTextareaReadonly");
      const dis = $("#labTextareaDisabled");
      const ta = $("#labTextareaPreview");

      const update = () => {
        if (!ta) return;
        ta.rows = Number(r?.value || 4);
        ta.cols = Number(c?.value || 30);
        ta.placeholder = ph?.value || "";
        setAttr(ta, "readonly", ro?.value === "true" ? "" : null);
        setAttr(ta, "disabled", dis?.value === "true" ? "" : null);
      };

      bindLab(
        ["labTextareaRows", "labTextareaCols", "labTextareaPlaceholder", "labTextareaReadonly", "labTextareaDisabled"],
        update
      );
    }
  })();

  // =========================
  // CSS LAB (unificado)
  // =========================
  (() => {
    const q = (id) => document.getElementById(id);

    // 1) Box model
    {
      const sizing = q("cssBoxSizing");
      const w = q("cssBoxWidth");
      const p = q("cssPadding");
      const b = q("cssBorder");
      const m = q("cssMargin");
      const box = q("cssBox");
      const note = q("cssBoxNote");

      const update = () => {
        if (!box) return;
        box.style.boxSizing = sizing?.value || "content-box";
        box.style.width = px(w?.value || 260);
        box.style.padding = px(p?.value || 16);
        box.style.borderWidth = px(b?.value || 2);
        box.style.margin = px(m?.value || 8);

        if (note) {
          const rect = box.getBoundingClientRect();
          note.textContent = `Tamaño renderizado aprox: ${Math.round(rect.width)}px × ${Math.round(
            rect.height
          )}px (depende de box-sizing + padding + border).`;
        }
      };

      bindLab(["cssBoxSizing", "cssBoxWidth", "cssPadding", "cssBorder", "cssMargin"], update);
    }

    // 2) Colores + texto
    {
      const color = q("cssTextColor");
      const bg = q("cssBg");
      const fs = q("cssFontSize");
      const fw = q("cssFontWeight");
      const lh = q("cssLineHeight");
      const align = q("cssAlign");
      const decor = q("cssDecor");
      const card = q("cssTextCard");

      const update = () => {
        if (!card) return;
        card.style.color = color?.value || "var(--ink)";
        card.style.background = bg?.value || "white";
        card.style.fontSize = px(fs?.value || 16);
        card.style.fontWeight = fw?.value || "600";
        card.style.lineHeight = lh?.value || "1.4";
        card.style.textAlign = align?.value || "left";
        card.style.textDecoration = decor?.value || "none";

        const link = card.querySelector(".cssTextLink");
        if (link) link.style.color = card.style.color;
      };

      bindLab(["cssTextColor", "cssBg", "cssFontSize", "cssFontWeight", "cssLineHeight", "cssAlign", "cssDecor"], update);
    }

    // 3) Unidades
    {
      const unit = q("cssUnitType");
      const val = q("cssUnitValue");
      const child = q("cssUnitChild");

      const update = () => {
        if (!child) return;
        child.style.fontSize = `${Number(val?.value || 18)}${unit?.value || "px"}`;
      };

      bindLab(["cssUnitType", "cssUnitValue"], update);
    }

    // 4) Selectores (genera CSS)
    {
      const type = q("cssSelectorType");
      const prop = q("cssSelectorProp");
      const intensity = q("cssSelectorIntensity");
      const styleEl = q("cssSelectorStyle");

      const update = () => {
        if (!styleEl) return;

        const selector = type?.value || ".item";
        const property = prop?.value || "background";
        const strong = intensity?.value === "strong";

        const bg = strong ? "rgba(250,199,57,.35)" : "rgba(250,199,57,.18)";
        const outline = strong ? "2px solid rgba(76,57,250,.85)" : "2px solid rgba(76,57,250,.45)";
        const color = strong ? "rgba(47,43,68,.95)" : "rgba(47,43,68,.85)";

        const rule =
          property === "background"
            ? `background:${bg};`
            : property === "outline"
            ? `outline:${outline};outline-offset:2px;`
            : `color:${color};font-weight:900;`;

        styleEl.textContent = `
          .cssSelectorList *{transition:160ms ease;}
          ${selector}{${rule}border-radius:10px;}
        `;
      };

      bindLab(["cssSelectorType", "cssSelectorProp", "cssSelectorIntensity"], update);
    }

    // 5) Pseudoclases
    {
      const pc = q("cssPseudoClass");
      const effect = q("cssPseudoEffect");
      const styleEl = q("cssPseudoStyle");

      const update = () => {
        if (!styleEl) return;
        const pseudo = pc?.value || "hover";
        const e = effect?.value || "lift";

        const rule =
          e === "lift"
            ? "transform:translateY(-2px);box-shadow:0 12px 25px rgba(76,57,250,.18);"
            : e === "glow"
            ? "box-shadow:0 0 0 4px rgba(57,161,250,.18),0 14px 30px rgba(76,57,250,.15);"
            : "background:linear-gradient(90deg,var(--primary),var(--secondary));color:#fff;border-color:transparent;";

        styleEl.textContent = `.cssPseudoBtn:${pseudo}{${rule}}`;
      };

      bindLab(["cssPseudoClass", "cssPseudoEffect"], update);
    }

    // 6) Pseudo-elementos
    {
      const which = q("cssPseudoEl");
      const content = q("cssPseudoContent");
      const mode = q("cssPseudoBadge");
      const styleEl = q("cssPseudoElStyle");

      const update = () => {
        if (!styleEl) return;
        const w = which?.value || "before";
        const txt = (content?.value || "Etiqueta").replace(/"/g, '\\"');
        const m = mode?.value || "tag";

        const rule =
          m === "tag"
            ? `content:"${txt}";position:absolute;top:10px;left:10px;padding:4px 10px;border-radius:999px;font-weight:900;background:rgba(76,57,250,.16);border:1px solid rgba(76,57,250,.25);`
            : m === "dot"
            ? `content:"";position:absolute;top:14px;left:14px;width:10px;height:10px;border-radius:999px;background:rgba(57,161,250,.55);`
            : `content:"";position:absolute;left:0;top:0;bottom:0;width:6px;background:rgba(250,199,57,.55);`;

        styleEl.textContent = `
          #cssPseudoBox::before,#cssPseudoBox::after{all:unset;}
          #cssPseudoBox::${w}{${rule}}
        `;
      };

      bindLab(["cssPseudoEl", "cssPseudoContent", "cssPseudoBadge"], update);
    }

    // 7) Flexbox
    {
      const dir = q("cssFlexDir");
      const justify = q("cssJustify");
      const align = q("cssAlignItems");
      const gap = q("cssFlexGap");
      const wrap = q("cssFlexWrap");

      const update = () => {
        if (!wrap) return;
        wrap.style.flexDirection = dir?.value || "row";
        wrap.style.justifyContent = justify?.value || "flex-start";
        wrap.style.alignItems = align?.value || "stretch";
        wrap.style.gap = px(gap?.value || 10);
      };

      bindLab(["cssFlexDir", "cssJustify", "cssAlignItems", "cssFlexGap"], update);
    }

    // 8) Grid
    {
      const cols = q("cssGridCols");
      const gap = q("cssGridGap");
      const align = q("cssGridAlign");
      const grid = q("cssGrid");

      const update = () => {
        if (!grid) return;
        grid.style.gridTemplateColumns = cols?.value || "repeat(3, 1fr)";
        grid.style.gap = px(gap?.value || 10);
        grid.style.placeItems = align?.value || "stretch";
      };

      bindLab(["cssGridCols", "cssGridGap", "cssGridAlign"], update);
    }

    // 9) Position
    {
      const type = q("cssPosType");
      const top = q("cssPosTop");
      const left = q("cssPosLeft");
      const z = q("cssPosZ");
      const target = q("cssPosTarget");

      const update = () => {
        if (!target) return;

        const t = type?.value || "static";
        target.style.position = t;
        target.style.zIndex = z?.value || "5";
        target.style.top = "";
        target.style.left = "";

        if (t === "static") return;

        if (t === "sticky") {
          target.style.top = px(top?.value || 10);
          target.style.left = "0px";
          return;
        }

        target.style.top = px(top?.value || 10);
        target.style.left = px(left?.value || 10);
      };

      bindLab(["cssPosType", "cssPosTop", "cssPosLeft", "cssPosZ"], update);
    }

    // 10) Herencia
    {
      const mode = q("cssInheritMode");
      const parentColor = q("cssParentColor");
      const parent = q("cssInheritParent");
      const child = q("cssInheritChild");

      const update = () => {
        if (!parent || !child) return;
        parent.style.color = parentColor?.value || "var(--primary)";
        child.style.color = mode?.value || "inherit";
      };

      bindLab(["cssInheritMode", "cssParentColor"], update);
    }
  })();

  // =========================
  // JS LAB (DOM/Eventos/Storage/Fetch)
  // =========================
  (() => {
    const q = (id) => document.getElementById(id);

    // DOM
    {
      const text = q("jsItemText");
      const kind = q("jsItemKind");
      const add = q("jsAddItem");
      const clear = q("jsClearItems");
      const list = q("jsDomList");

      if (list && add && clear && text && kind) {
        on(add, "click", () => {
          const div = document.createElement("div");
          div.className = "jsDomItem";
          div.dataset.kind = kind.value;
          div.textContent = text.value.trim() || "Elemento";
          list.appendChild(div);
        });

        on(clear, "click", () => (list.innerHTML = ""));

        // Delegación
        on(list, "click", (e) => {
          const item = e.target.closest(".jsDomItem");
          if (!item) return;
          item.classList.toggle("is-selected");
        });
      }
    }

    // Eventos
    {
      const inp = q("jsLiveInput");
      const out = q("jsLiveOut");
      const btn = q("jsCountClick");
      const clicksOut = q("jsClicksOut");

      let clicks = 0;

      on(inp, "input", () => {
        if (!out) return;
        out.textContent = `Preview: ${inp.value || "—"}`;
      });

      on(btn, "click", () => {
        if (!clicksOut) return;
        clicks += 1;
        clicksOut.textContent = `Clicks: ${clicks}`;
      });
    }

    // localStorage
    {
      const key = q("jsStorageKey");
      const val = q("jsStorageValue");
      const save = q("jsSave");
      const load = q("jsLoad");
      const del = q("jsDelete");
      const status = q("jsStorageStatus");

      const setStatus = (msg) => status && (status.textContent = msg);

      if (key && val && save && load && del) {
        on(save, "click", () => {
          const k = key.value.trim();
          if (!k) return setStatus("Pon una key válida.");
          localStorage.setItem(k, val.value);
          setStatus(`Guardado en localStorage: "${k}"`);
        });

        on(load, "click", () => {
          const k = key.value.trim();
          if (!k) return setStatus("Pon una key válida.");
          const v = localStorage.getItem(k);
          if (v === null) return setStatus(`No existe la key "${k}".`);
          val.value = v;
          setStatus(`Cargado desde localStorage: "${k}"`);
        });

        on(del, "click", () => {
          const k = key.value.trim();
          if (!k) return setStatus("Pon una key válida.");
          localStorage.removeItem(k);
          setStatus(`Borrado: "${k}"`);
        });
      }
    }

    // Fetch
    {
      const url = q("jsFetchUrl");
      const btn = q("jsFetchBtn");
      const out = q("jsFetchOut");

      if (url && btn && out) {
        on(btn, "click", async () => {
          const u = url.value.trim();
          if (!u) return;

          out.innerHTML = "<code>Cargando...</code>";

          try {
            const res = await fetch(u);

            // si no es ok, aún queremos mostrar cuerpo, pero marcamos error
            const text = await res.text();
            const prefix = res.ok ? "" : `HTTP ${res.status} ${res.statusText}\n\n`;

            // intenta JSON bonito
            try {
              const json = JSON.parse(text);
              out.innerHTML = `<code>${prefix}${JSON.stringify(json, null, 2)}</code>`;
            } catch {
              out.innerHTML = `<code>${prefix}${text}</code>`;
            }
          } catch (err) {
            out.innerHTML = `<code>Error: ${String(err)}</code>`;
          }
        });
      }
    }
  })();
})();

