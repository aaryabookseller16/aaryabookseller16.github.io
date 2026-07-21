/* Interactive transformer-attention landing experience. */
(function () {
  "use strict";

  const canvas = document.querySelector("#landingNeural");
  if (!canvas) return;

  const context = canvas.getContext("2d", { alpha: true });
  if (!context) return;

  const viewport = canvas.closest(".experience-sticky") || canvas.parentElement;
  const tokenInput = document.querySelector("#landingTokens");
  const layerInput = document.querySelector("#landingLayers");
  const densityInput = document.querySelector("#landingDensity");
  const tokenOutput = document.querySelector("#landingTokensValue");
  const layerOutput = document.querySelector("#landingLayersValue");
  const densityOutput = document.querySelector("#landingDensityValue");
  const randomizeButton = document.querySelector("#landingRandomize");
  const statusText = document.querySelector("[data-neural-status]");
  const titleText = document.querySelector("[data-neural-title]");
  const detailText = document.querySelector("[data-neural-detail]");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let width = 1;
  let height = 1;
  let pixelRatio = 1;
  let seed = 42;
  let tokens = Number(tokenInput?.value || 12);
  let layers = Number(layerInput?.value || 5);
  let density = Number(densityInput?.value || 58);
  let scrollProgress = 0;
  let focusColumn = -1;
  let pointerX = 0;
  let pointerY = 0;
  let smoothX = 0;
  let smoothY = 0;
  let pulse = 0;
  let weights = [];
  let animationFrame = 0;

  const seededRandom = () => {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value = value + Math.imul(value ^ (value >>> 7), 61 | value) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };

  const rebuild = () => {
    tokens = Number(tokenInput?.value || tokens);
    layers = Number(layerInput?.value || layers);
    density = Number(densityInput?.value || density);
    if (tokenOutput) tokenOutput.textContent = String(tokens);
    if (layerOutput) layerOutput.textContent = String(layers);
    if (densityOutput) densityOutput.textContent = String(density);

    weights = [];
    for (let layer = 0; layer < layers - 1; layer += 1) {
      const matrix = [];
      for (let source = 0; source < tokens; source += 1) {
        const row = [];
        let total = 0;
        for (let target = 0; target < tokens; target += 1) {
          const distance = Math.abs(source - target);
          const locality = Math.exp(-distance * 0.24);
          const value = seededRandom() * 0.72 + locality * 0.48;
          row.push(value);
          total += value;
        }
        matrix.push(row.map((value) => value / total));
      }
      weights.push(matrix);
    }
    pulse = 1;
    updateReadout();
    if (reduceMotion) render(0);
  };

  const resize = () => {
    const bounds = viewport.getBoundingClientRect();
    width = Math.max(1, Math.round(bounds.width));
    height = Math.max(1, Math.round(bounds.height));
    pixelRatio = Math.min(window.devicePixelRatio || 1, 1.75);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    if (reduceMotion) render(0);
  };

  const updateScroll = () => {
    const hero = canvas.closest(".hero--experience");
    const travel = Math.max(1, (hero?.offsetHeight || window.innerHeight) - window.innerHeight);
    scrollProgress = Math.max(0, Math.min(1, window.scrollY / travel));
    if (reduceMotion) render(0);
  };

  const networkBounds = () => {
    const mobile = width < 760;
    return {
      left: width * (mobile ? 0.09 : 0.27),
      right: width * (mobile ? 0.91 : 0.73),
      top: height * (mobile ? 0.34 : 0.2),
      bottom: height * (mobile ? 0.68 : 0.78)
    };
  };

  const nodePosition = (layer, token) => {
    const bounds = networkBounds();
    const baseX = tokens === 1 ? (bounds.left + bounds.right) / 2 : bounds.left + (token / (tokens - 1)) * (bounds.right - bounds.left);
    const baseY = layers === 1 ? (bounds.top + bounds.bottom) / 2 : bounds.top + (layer / (layers - 1)) * (bounds.bottom - bounds.top);
    const centerX = (bounds.left + bounds.right) / 2;
    const centerY = (bounds.top + bounds.bottom) / 2;
    const unfoldX = 1 + scrollProgress * 0.56;
    const unfoldY = 1 + scrollProgress * 0.24;
    const perspective = (layer / Math.max(1, layers - 1) - 0.5) * smoothY * 24;
    const drift = Math.sin((token + 1) * 1.7 + layer * 0.8) * scrollProgress * 12;
    return {
      x: centerX + (baseX - centerX) * unfoldX + perspective + drift,
      y: centerY + (baseY - centerY) * unfoldY + smoothX * (layer - (layers - 1) / 2) * 2.4
    };
  };

  const updateReadout = () => {
    if (!statusText || !titleText || !detailText) return;
    if (focusColumn < 0) {
      statusText.textContent = "ATTENTION FIELD / ACTIVE";
      titleText.textContent = "Move across tokens to trace attention.";
      detailText.textContent = `${tokens} tokens · ${layers} layers · ${density}% density`;
      return;
    }

    let activeConnections = 0;
    const threshold = 0.13 - density * 0.00085;
    weights.forEach((matrix) => {
      matrix.forEach((row, source) => {
        row.forEach((value, target) => {
          if ((source === focusColumn || target === focusColumn) && value > threshold) activeConnections += 1;
        });
      });
    });
    statusText.textContent = `TOKEN_${String(focusColumn + 1).padStart(2, "0")} / TRACE`;
    titleText.textContent = "Attention path isolated.";
    detailText.textContent = `${activeConnections} visible weighted connections across ${layers} layers.`;
  };

  const drawBackdrop = (time) => {
    const horizon = height * 0.62;
    const glow = context.createRadialGradient(width * 0.5, height * 0.46, 0, width * 0.5, height * 0.46, Math.max(width, height) * 0.52);
    glow.addColorStop(0, "rgba(255,255,255,0.25)");
    glow.addColorStop(0.4, "rgba(235,237,239,0.08)");
    glow.addColorStop(1, "rgba(25,29,34,0)");
    context.fillStyle = glow;
    context.fillRect(0, 0, width, height);

    context.save();
    context.lineWidth = 0.7;
    for (let row = 0; row < 18; row += 1) {
      const progress = row / 17;
      const y = horizon + Math.pow(progress, 1.7) * height * 0.46;
      context.beginPath();
      for (let column = 0; column <= 32; column += 1) {
        const x = column / 32 * width;
        const wave = Math.sin(column * 0.58 + row * 0.44 + time * 0.00015) * (3 + progress * 15);
        if (column === 0) context.moveTo(x, y + wave);
        else context.lineTo(x, y + wave);
      }
      context.strokeStyle = `rgba(255,255,255,${0.055 + progress * 0.11})`;
      context.stroke();
    }

    for (let column = 0; column <= 30; column += 1) {
      const progress = column / 30;
      context.beginPath();
      context.moveTo(width * (0.5 + (progress - 0.5) * 0.07), horizon);
      context.lineTo(width * progress, height * 1.05);
      context.strokeStyle = "rgba(255,255,255,0.055)";
      context.stroke();
    }
    context.restore();
  };

  const drawEdges = (time) => {
    const threshold = 0.13 - density * 0.00085;
    context.save();
    context.globalCompositeOperation = "screen";

    for (let layer = 0; layer < layers - 1; layer += 1) {
      const matrix = weights[layer];
      for (let source = 0; source < tokens; source += 1) {
        const start = nodePosition(layer, source);
        for (let target = 0; target < tokens; target += 1) {
          const weight = matrix[source][target];
          const motion = reduceMotion ? 0.72 : 0.48 + 0.52 * Math.sin(time * 0.0016 + layer * 0.8 + source * 0.31 + target * 0.43);
          const strength = weight * (0.72 + motion * 0.8);
          if (strength < threshold) continue;

          const end = nodePosition(layer + 1, target);
          const isFocused = focusColumn < 0 || source === focusColumn || target === focusColumn;
          const alpha = Math.min(0.68, strength * (isFocused ? 3.6 : 0.45));
          const focusedEdge = focusColumn >= 0 && (source === focusColumn || target === focusColumn);
          context.strokeStyle = focusedEdge
            ? `rgba(255,117,83,${Math.max(0.16, alpha)})`
            : `rgba(249,250,248,${Math.max(0.025, alpha)})`;
          context.lineWidth = focusedEdge ? 1.4 + strength * 2.1 : 0.45 + strength * 1.45;
          context.beginPath();
          context.moveTo(start.x, start.y);
          const bend = (target - source) * 2.3 + smoothX * 14;
          context.bezierCurveTo(
            start.x + bend,
            start.y + (end.y - start.y) * 0.42,
            end.x - bend,
            start.y + (end.y - start.y) * 0.58,
            end.x,
            end.y
          );
          context.stroke();
        }
      }
    }
    context.restore();
  };

  const drawNodes = (time) => {
    const mobile = width < 760;
    context.save();
    for (let layer = 0; layer < layers; layer += 1) {
      for (let token = 0; token < tokens; token += 1) {
        const point = nodePosition(layer, token);
        const focused = focusColumn === token;
        const oscillation = reduceMotion ? 0 : Math.sin(time * 0.002 + token * 0.7 + layer) * 1.4;
        const radius = (mobile ? 2.3 : 3.1) + oscillation * 0.25 + pulse * (focused || focusColumn < 0 ? 2 : 0.4);

        if (focused) {
          context.beginPath();
          context.arc(point.x, point.y, radius + 8, 0, Math.PI * 2);
          context.fillStyle = "rgba(255,91,53,0.11)";
          context.fill();
        }

        context.beginPath();
        context.arc(point.x, point.y, radius, 0, Math.PI * 2);
        context.fillStyle = focused ? "rgba(255,117,83,0.98)" : "rgba(251,252,249,0.9)";
        context.shadowBlur = focused ? 18 : 8;
        context.shadowColor = focused ? "rgba(255,91,53,0.75)" : "rgba(255,255,255,0.45)";
        context.fill();
        context.shadowBlur = 0;

        if (!mobile && layer === layers - 1 && (token === focusColumn || (focusColumn < 0 && token % 4 === 0))) {
          context.font = "9px SFMono-Regular, Menlo, monospace";
          context.fillStyle = focused ? "rgba(255,140,110,.95)" : "rgba(255,255,255,.54)";
          context.textAlign = "center";
          context.fillText(`T_${String(token + 1).padStart(2, "0")}`, point.x, point.y + 19);
        }
      }
    }
    context.restore();
  };

  const drawLayerLabels = () => {
    if (width < 760) return;
    const bounds = networkBounds();
    context.save();
    context.font = "9px SFMono-Regular, Menlo, monospace";
    context.fillStyle = "rgba(255,255,255,.48)";
    context.textAlign = "right";
    for (let layer = 0; layer < layers; layer += 1) {
      const point = nodePosition(layer, 0);
      context.fillText(`LAYER_${String(layer + 1).padStart(2, "0")}`, bounds.left - 22, point.y + 3);
      context.beginPath();
      context.moveTo(bounds.left - 17, point.y);
      context.lineTo(bounds.left - 4, point.y);
      context.strokeStyle = "rgba(255,255,255,.24)";
      context.stroke();
    }
    context.restore();
  };

  const render = (time) => {
    smoothX += (pointerX - smoothX) * 0.045;
    smoothY += (pointerY - smoothY) * 0.045;
    pulse *= 0.92;
    context.clearRect(0, 0, width, height);
    drawBackdrop(time);
    drawEdges(time);
    drawNodes(time);
    drawLayerLabels();
    if (!reduceMotion) animationFrame = window.requestAnimationFrame(render);
  };

  const updatePointer = (event) => {
    const bounds = viewport.getBoundingClientRect();
    pointerX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
    pointerY = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;

    const network = networkBounds();
    const withinVerticalField = event.clientY - bounds.top > network.top - 40 && event.clientY - bounds.top < network.bottom + 40;
    const relativeX = event.clientX - bounds.left;
    if (!withinVerticalField || relativeX < network.left - 30 || relativeX > network.right + 30) {
      focusColumn = -1;
    } else {
      const normalized = (relativeX - network.left) / (network.right - network.left);
      focusColumn = Math.max(0, Math.min(tokens - 1, Math.round(normalized * (tokens - 1))));
    }
    updateReadout();
    if (reduceMotion) render(0);
  };

  const resetPointer = () => {
    focusColumn = -1;
    pointerX = 0;
    pointerY = 0;
    updateReadout();
    if (reduceMotion) render(0);
  };

  const randomize = () => {
    seed = Math.floor(Math.random() * 1_000_000) + 1;
    rebuild();
  };

  tokenInput?.addEventListener("input", rebuild);
  layerInput?.addEventListener("input", rebuild);
  densityInput?.addEventListener("input", rebuild);
  randomizeButton?.addEventListener("click", randomize);
  canvas.addEventListener("pointermove", updatePointer, { passive: true });
  canvas.addEventListener("pointerleave", resetPointer, { passive: true });
  canvas.addEventListener("click", randomize);
  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener("scroll", updateScroll, { passive: true });
  window.addEventListener("keydown", (event) => {
    const tag = event.target?.tagName?.toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return;
    if (event.key.toLowerCase() === "r") randomize();
  });

  document.addEventListener("visibilitychange", () => {
    if (reduceMotion) return;
    if (document.hidden) {
      window.cancelAnimationFrame(animationFrame);
    } else {
      animationFrame = window.requestAnimationFrame(render);
    }
  });

  resize();
  updateScroll();
  rebuild();
  if (reduceMotion) render(0);
  else animationFrame = window.requestAnimationFrame(render);
})();
