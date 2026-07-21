/* Aarya Bookseller — shared spatial interaction layer */
(function () {
  "use strict";

  const doc = document;
  const root = doc.documentElement;
  const body = doc.body;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;

  const pageName = (() => {
    const file = location.pathname.split("/").pop() || "index.html";
    if (file === "index.html" || file === "") return "home";
    return file.replace(".html", "");
  })();

  body.classList.add("experience-ready", `page-${pageName}`);

  const pageCodes = {
    qualifications: "ARCHIVE_01 / BACKGROUND",
    portfolio: "ARCHIVE_02 / SELECTED WORK",
    service: "ARCHIVE_03 / FIELD NOTES",
    ai: "LAB_04 / NEURAL PLAYGROUND",
    contact: "CHANNEL_05 / CONTACT"
  };

  const pageHero = doc.querySelector(".hero-section");
  if (pageHero && pageCodes[pageName]) pageHero.dataset.pageCode = pageCodes[pageName];

  const header = doc.querySelector(".site-header");
  const syncHeader = () => header?.classList.toggle("is-compact", window.scrollY > 24);
  syncHeader();
  window.addEventListener("scroll", syncHeader, { passive: true });

  const localTime = doc.querySelector("[data-local-time]");
  const updateLocalTime = () => {
    if (!localTime) return;
    const value = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Chicago",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).format(new Date());
    localTime.textContent = `COLLEGE STATION // ${value} CT`;
  };
  updateLocalTime();
  window.setInterval(updateLocalTime, 60_000);

  /* Number the long-form information architecture. */
  const indexedGroups = [
    [".project-card__title", 1],
    [".service-card-body h3", 1]
  ];

  indexedGroups.forEach(([selector, start]) => {
    doc.querySelectorAll(selector).forEach((heading, index) => {
      if (heading.querySelector(":scope > .xp-index")) return;
      const marker = doc.createElement("span");
      marker.className = "xp-index";
      marker.setAttribute("aria-hidden", "true");
      marker.textContent = String(index + Number(start)).padStart(2, "0");
      heading.prepend(marker);
    });
  });

  /* A single, restrained reveal system for the new hierarchy. */
  const revealTargets = doc.querySelectorAll([
    ".identity-archive__portrait",
    ".identity-archive__intro",
    ".identity-archive__readout",
    ".about-box-grid > *",
    ".timeline-update",
    ".project-card",
    ".qual-section",
    ".service-card",
    ".contact-panel",
    ".contact-card"
  ].join(","));

  revealTargets.forEach((element) => element.classList.add("xp-reveal"));

  if (!reduceMotion && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -6% 0px" });
    revealTargets.forEach((element) => observer.observe(element));
  } else {
    revealTargets.forEach((element) => element.classList.add("is-visible"));
  }

  /* Small interaction cursor, intentionally absent on touch devices. */
  if (finePointer && !reduceMotion) {
    const cursor = doc.createElement("div");
    cursor.className = "xp-cursor";
    cursor.setAttribute("aria-hidden", "true");
    body.appendChild(cursor);

    let cursorX = -30;
    let cursorY = -30;
    let targetX = -30;
    let targetY = -30;

    window.addEventListener("pointermove", (event) => {
      targetX = event.clientX;
      targetY = event.clientY;
      cursor.classList.add("is-active");
      const interactive = event.target.closest("a, button, summary, input, select, textarea, .project-card");
      cursor.classList.toggle("is-link", Boolean(interactive));
    }, { passive: true });

    doc.addEventListener("mouseleave", () => cursor.classList.remove("is-active"));

    const renderCursor = () => {
      cursorX += (targetX - cursorX) * 0.18;
      cursorY += (targetY - cursorY) * 0.18;
      cursor.style.left = `${cursorX}px`;
      cursor.style.top = `${cursorY}px`;
      window.requestAnimationFrame(renderCursor);
    };
    renderCursor();
  }

  /* Better keyboard behavior for the compact mobile navigation. */
  const navToggle = doc.querySelector(".nav-toggle");
  const siteNav = doc.querySelector("#site-nav");
  doc.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !siteNav?.classList.contains("open")) return;
    siteNav.classList.remove("open");
    navToggle?.setAttribute("aria-expanded", "false");
    navToggle?.focus();
  });

  /* The interactive research landscape. It is a procedural 2D canvas,
     so the experience stays fast and functional on GitHub Pages. */
  const canvas = doc.querySelector("#researchLandscape");
  if (!canvas) return;

  const context = canvas.getContext("2d", { alpha: true });
  if (!context) return;

  const hero = canvas.closest(".hero--experience");
  const experienceViewport = canvas.closest(".experience-sticky") || hero;
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const modeButtons = Array.from(doc.querySelectorAll("[data-core-mode]"));
  const coreStatus = doc.querySelector("[data-core-status]");
  const coreTitle = doc.querySelector("[data-core-title]");
  const coreDetail = doc.querySelector("[data-core-detail]");
  let width = 0;
  let height = 0;
  let dpr = 1;
  let scrollProgress = 0;
  let animationFrame = 0;
  let activeMode = "fusion";
  let manualRotation = 0;
  let targetRotation = 0;
  let pulse = 0;
  let dragging = false;
  let dragX = 0;

  const modules = [];
  const seeded = (seed) => {
    const value = Math.sin(seed * 982.451) * 43758.5453;
    return value - Math.floor(value);
  };

  for (let i = 0; i < 86; i += 1) {
    const ring = Math.sqrt(seeded(i + 4));
    const angle = seeded(i + 17) * Math.PI * 2;
    const vertical = seeded(i + 41) * 2 - 1;
    const radius = Math.sqrt(Math.max(0, 1 - vertical * vertical));
    modules.push({
      x: Math.cos(angle) * radius * ring,
      y: vertical * 0.82,
      z: Math.sin(angle) * radius * ring,
      cx: Math.cos(angle) * radius * ring,
      cy: vertical * 0.82,
      cz: Math.sin(angle) * radius * ring,
      w: 24 + seeded(i + 67) * 31,
      h: 13 + seeded(i + 83) * 18,
      phase: seeded(i + 101) * Math.PI * 2,
      label: ["ML", "SYS", "OPT", "DATA", "NET", "GPU"][i % 6]
    });
  }

  const resizeCanvas = () => {
    const bounds = experienceViewport.getBoundingClientRect();
    width = Math.max(1, Math.round(bounds.width));
    height = Math.max(1, Math.round(bounds.height));
    dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const updateScroll = () => {
    const limit = Math.max(1, Math.min(window.innerHeight * 0.82, hero.offsetHeight * 0.82));
    scrollProgress = Math.max(0, Math.min(1, window.scrollY / limit));
  };

  const updatePointer = (event) => {
    const rect = experienceViewport.getBoundingClientRect();
    pointer.tx = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    pointer.ty = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    if (dragging) {
      const delta = event.clientX - dragX;
      targetRotation += delta * 0.009;
      dragX = event.clientX;
    }
  };

  const modeCopy = {
    fusion: ["INTERACTION READY", "Drag to orbit. Click to pulse.", "Select a field to reorganize the system."],
    research: ["FIELD_01 / RESEARCH", "Implicit gradients · optimization", "Bilevel systems, HVP/CG solvers, and GPU-scale experiments."],
    systems: ["FIELD_02 / SYSTEMS", "Infrastructure · networking", "Distributed services, raw protocols, observability, and reliable data paths."],
    product: ["FIELD_03 / PRODUCT", "Interfaces · data products", "Full-stack workflows that turn complex models into usable decisions."]
  };

  const setMode = (nextMode) => {
    activeMode = activeMode === nextMode ? "fusion" : nextMode;
    pulse = 1;
    modeButtons.forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.coreMode === activeMode));
    });
    const [status, title, detail] = modeCopy[activeMode];
    if (coreStatus) coreStatus.textContent = status;
    if (coreTitle) coreTitle.textContent = title;
    if (coreDetail) coreDetail.textContent = detail;
  };

  modeButtons.forEach((button) => {
    button.addEventListener("click", () => setMode(button.dataset.coreMode));
  });

  const roundedRect = (x, y, w, h, radius) => {
    const r = Math.min(radius, w / 2, h / 2);
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + w, y, x + w, y + h, r);
    context.arcTo(x + w, y + h, x, y + h, r);
    context.arcTo(x, y + h, x, y, r);
    context.arcTo(x, y, x + w, y, r);
    context.closePath();
  };

  const drawTerrain = (time) => {
    const horizon = height * 0.58;
    const rows = width < 720 ? 14 : 22;
    const columns = width < 720 ? 20 : 34;
    context.save();
    context.lineWidth = 0.8;

    for (let row = 0; row < rows; row += 1) {
      const depth = row / (rows - 1);
      const yBase = horizon + Math.pow(depth, 1.75) * height * 0.53;
      context.beginPath();
      for (let col = 0; col <= columns; col += 1) {
        const x = (col / columns) * width;
        const wave = Math.sin(col * 0.68 + row * 0.45 + time * 0.00012) * (4 + depth * 19);
        const ridge = Math.sin(col * 0.21 - row * 0.5) * depth * 16;
        const y = yBase + wave + ridge;
        if (col === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.strokeStyle = `rgba(248,249,247,${0.08 + depth * 0.14})`;
      context.stroke();
    }

    for (let col = 0; col <= columns; col += 1) {
      const normalized = col / columns;
      context.beginPath();
      context.moveTo(width * (0.5 + (normalized - 0.5) * 0.08), horizon);
      context.lineTo(width * normalized, height * 1.08);
      context.strokeStyle = "rgba(245,246,244,0.08)";
      context.stroke();
    }
    context.restore();
  };

  const drawAtmosphere = (time) => {
    const haze = context.createRadialGradient(
      width * 0.5, height * 0.48, 10,
      width * 0.5, height * 0.48, Math.max(width, height) * 0.48
    );
    haze.addColorStop(0, "rgba(255,255,255,0.26)");
    haze.addColorStop(0.36, "rgba(229,232,235,0.09)");
    haze.addColorStop(1, "rgba(41,46,52,0)");
    context.fillStyle = haze;
    context.fillRect(0, 0, width, height);

    for (let i = 0; i < 34; i += 1) {
      const x = (seeded(i + 300) * width + time * (0.004 + seeded(i + 331) * 0.009)) % width;
      const y = seeded(i + 370) * height * 0.72;
      const alpha = 0.08 + seeded(i + 401) * 0.16;
      context.fillStyle = `rgba(255,255,255,${alpha})`;
      context.fillRect(x, y, 1, 1);
    }
  };

  const drawCore = (time) => {
    pointer.x += (pointer.tx - pointer.x) * 0.035;
    pointer.y += (pointer.ty - pointer.y) * 0.035;

    const mobile = width < 720;
    const scale = Math.min(width, height) * (mobile ? 0.24 : 0.295);
    const centerX = width * (mobile ? 0.51 : 0.5) + pointer.x * 23;
    const centerY = height * (mobile ? 0.58 : 0.54) + pointer.y * 13;
    pulse *= 0.94;
    manualRotation += (targetRotation - manualRotation) * 0.08;
    const spread = 1 + scrollProgress * 0.42 + pulse * 0.08;
    const rotation = time * 0.000055 + pointer.x * 0.18 + manualRotation;
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);

    const projected = modules.map((module, index) => {
      let targetX = module.x;
      let targetY = module.y;
      let targetZ = module.z;

      if (activeMode === "research") {
        const helixAngle = (index / modules.length) * Math.PI * 6;
        targetX = Math.cos(helixAngle) * 0.72;
        targetY = (index / (modules.length - 1) - 0.5) * 1.62;
        targetZ = Math.sin(helixAngle) * 0.72;
      } else if (activeMode === "systems") {
        const column = index % 9;
        const row = Math.floor(index / 9);
        targetX = (column / 8 - 0.5) * 1.6;
        targetY = (row / 9 - 0.5) * 1.45;
        targetZ = (seeded(index + 740) - 0.5) * 0.48;
      } else if (activeMode === "product") {
        const ringIndex = index % 22;
        const ringLayer = Math.floor(index / 22);
        const ringAngle = (ringIndex / 22) * Math.PI * 2 + ringLayer * 0.28;
        const ringRadius = 0.38 + ringLayer * 0.18;
        targetX = Math.cos(ringAngle) * ringRadius;
        targetY = Math.sin(ringAngle) * ringRadius * 0.78;
        targetZ = (ringLayer - 1.5) * 0.24;
      }

      module.cx += (targetX - module.cx) * 0.055;
      module.cy += (targetY - module.cy) * 0.055;
      module.cz += (targetZ - module.cz) * 0.055;

      const rx = module.cx * cos - module.cz * sin;
      const rz = module.cx * sin + module.cz * cos;
      const float = reduceMotion ? 0 : Math.sin(time * 0.00075 + module.phase) * 0.025;
      const depth = (rz + 1.35) / 2.7;
      const explode = 1 + scrollProgress * (0.55 + seeded(index + 510) * 0.5);
      return {
        ...module,
        index,
        depth,
        sx: centerX + rx * scale * spread * explode,
        sy: centerY + (module.cy + float) * scale * spread * explode,
        sw: module.w * (0.68 + depth * 0.62) * (mobile ? 0.72 : 1),
        sh: module.h * (0.7 + depth * 0.5) * (mobile ? 0.72 : 1)
      };
    }).sort((a, b) => a.depth - b.depth);

    context.save();
    context.shadowBlur = 28;
    context.shadowColor = "rgba(255,255,255,0.32)";

    projected.forEach((module) => {
      const x = module.sx - module.sw / 2;
      const y = module.sy - module.sh / 2;
      const light = Math.round(108 + module.depth * 110);
      const alpha = 0.68 + module.depth * 0.28;

      roundedRect(x, y, module.sw, module.sh, Math.min(7, module.sh * 0.27));
      const fill = context.createLinearGradient(x, y, x, y + module.sh);
      fill.addColorStop(0, `rgba(${Math.min(255, light + 28)},${Math.min(255, light + 31)},${Math.min(255, light + 34)},${alpha})`);
      fill.addColorStop(1, `rgba(${light - 32},${light - 29},${light - 25},${alpha})`);
      context.fillStyle = fill;
      context.fill();
      context.strokeStyle = `rgba(255,255,255,${0.22 + module.depth * 0.28})`;
      context.lineWidth = 0.75;
      context.stroke();
    });
    context.restore();

    const annotated = projected.filter((module) => [7, 18, 34, 53, 71].includes(module.index));
    context.save();
    context.font = `${mobile ? 8 : 10}px ${getComputedStyle(root).getPropertyValue("--xp-font") || "monospace"}`;
    context.lineWidth = 0.8;
    annotated.forEach((module, annotationIndex) => {
      const direction = annotationIndex % 2 === 0 ? 1 : -1;
      const lineX = module.sx + direction * (mobile ? 34 : 58);
      const lineY = module.sy - (mobile ? 24 : 38) - annotationIndex * 2;
      context.beginPath();
      context.moveTo(module.sx, module.sy);
      context.lineTo(lineX, lineY);
      context.lineTo(lineX + direction * 22, lineY);
      context.strokeStyle = "rgba(255,255,255,0.62)";
      context.stroke();
      context.fillStyle = "rgba(255,255,255,0.82)";
      context.textAlign = direction > 0 ? "left" : "right";
      context.fillText(`${module.label}_${String(module.index).padStart(2, "0")}`, lineX + direction * 26, lineY + 3);
    });
    context.restore();
  };

  const render = (time) => {
    context.clearRect(0, 0, width, height);
    drawAtmosphere(time);
    drawTerrain(time);
    drawCore(time);
    if (!reduceMotion) animationFrame = window.requestAnimationFrame(render);
  };

  resizeCanvas();
  updateScroll();
  window.addEventListener("resize", resizeCanvas, { passive: true });
  window.addEventListener("scroll", updateScroll, { passive: true });
  experienceViewport.addEventListener("pointermove", updatePointer, { passive: true });
  experienceViewport.addEventListener("pointerleave", () => { pointer.tx = 0; pointer.ty = 0; });
  experienceViewport.addEventListener("pointerdown", (event) => {
    if (event.target.closest("a, button")) return;
    dragging = true;
    dragX = event.clientX;
    pulse = 1;
    experienceViewport.classList.add("is-dragging");
  });
  window.addEventListener("pointerup", () => {
    dragging = false;
    experienceViewport.classList.remove("is-dragging");
  });
  canvas.addEventListener("click", () => { pulse = 1; });

  if (reduceMotion) render(0);
  else animationFrame = window.requestAnimationFrame(render);

  doc.addEventListener("visibilitychange", () => {
    if (reduceMotion) return;
    if (doc.hidden) {
      window.cancelAnimationFrame(animationFrame);
      return;
    }
    animationFrame = window.requestAnimationFrame(render);
  });
})();
