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
  const focusToggle = document.querySelector("#landingFocusToggle");
  const focusClose = document.querySelector("#landingFocusClose");
  const focusHud = document.querySelector("#neuralFocusHud");
  const legendExit = document.querySelector("#landingLegendExit");
  const legendRandomize = document.querySelector("#landingLegendRandomize");
  const neuralControls = document.querySelector(".experience-neural-controls");
  const zoomInput = document.querySelector("#landingZoom");
  const zoomOutput = document.querySelector("#landingZoomValue");
  const focusTokenText = document.querySelector("[data-focus-token]");
  const focusLinksText = document.querySelector("[data-focus-links]");
  const focusPeakText = document.querySelector("[data-focus-peak]");
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
  let detailMode = false;
  let detailTarget = 0;
  let detailProgress = 0;
  let detailZoom = Number(zoomInput?.value || 112) / 100;
  let detailTransitionStart = 0;
  let detailTransitionFrom = 0;
  let detailTransitionDuration = 560;
  let frameBounds = null;
  let framePositions = [];
  let lockedColumn = -1;
  let focusOriginX = 0.5;
  let focusOriginY = 0.5;
  let clickTimer = 0;
  let exitTimer = 0;
  const focusHistoryKey = "landingNeuralMicroscope";

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
    if (reduceMotion && weights.length) render(0);
  };

  const resize = () => {
    const bounds = viewport.getBoundingClientRect();
    width = Math.max(1, Math.round(bounds.width));
    height = Math.max(1, Math.round(bounds.height));
    pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    if (reduceMotion && weights.length) render(0);
  };

  const updateScroll = () => {
    const hero = canvas.closest(".hero--experience");
    const travel = Math.max(1, (hero?.offsetHeight || window.innerHeight) - window.innerHeight);
    scrollProgress = Math.max(0, Math.min(1, window.scrollY / travel));
    if (reduceMotion && weights.length) render(0);
  };

  const networkBounds = () => {
    const mobile = width < 760;
    const base = {
      left: width * (mobile ? 0.09 : 0.27),
      right: width * (mobile ? 0.91 : 0.73),
      top: height * (mobile ? 0.34 : 0.2),
      bottom: height * (mobile ? 0.68 : 0.78)
    };
    const microscope = {
      left: width * (mobile ? 0.12 : 0.18),
      right: width * (mobile ? 0.88 : 0.82),
      top: height * (mobile ? 0.2 : 0.15),
      bottom: height * (mobile ? 0.74 : 0.85)
    };
    const progress = detailProgress * detailProgress * (3 - 2 * detailProgress);
    const left = base.left + (microscope.left - base.left) * progress;
    const right = base.right + (microscope.right - base.right) * progress;
    const top = base.top + (microscope.top - base.top) * progress;
    const bottom = base.bottom + (microscope.bottom - base.bottom) * progress;
    const fieldCenterX = (left + right) / 2;
    const fieldCenterY = (top + bottom) / 2;
    const centerX = fieldCenterX + (width * focusOriginX - fieldCenterX) * progress * 0.28;
    const centerY = fieldCenterY + (height * focusOriginY - fieldCenterY) * progress * 0.2;
    const zoom = 1 + (detailZoom - 1) * progress;
    return {
      left: centerX + (left - centerX) * zoom,
      right: centerX + (right - centerX) * zoom,
      top: centerY + (top - centerY) * zoom,
      bottom: centerY + (bottom - centerY) * zoom
    };
  };

  const positionForBounds = (layer, token, bounds, target = {}) => {
    const baseX = tokens === 1 ? (bounds.left + bounds.right) / 2 : bounds.left + (token / (tokens - 1)) * (bounds.right - bounds.left);
    const baseY = layers === 1 ? (bounds.top + bounds.bottom) / 2 : bounds.top + (layer / (layers - 1)) * (bounds.bottom - bounds.top);
    const centerX = (bounds.left + bounds.right) / 2;
    const centerY = (bounds.top + bounds.bottom) / 2;
    const pageUnfold = scrollProgress * (1 - detailProgress);
    const unfoldX = 1 + pageUnfold * 0.56;
    const unfoldY = 1 + pageUnfold * 0.24;
    const perspective = (layer / Math.max(1, layers - 1) - 0.5) * smoothY * (24 + detailProgress * 18);
    const drift = Math.sin((token + 1) * 1.7 + layer * 0.8) * pageUnfold * 12;
    target.x = centerX + (baseX - centerX) * unfoldX + perspective + drift;
    target.y = centerY + (baseY - centerY) * unfoldY + smoothX * (layer - (layers - 1) / 2) * 2.4;
    return target;
  };

  const prepareFrameGeometry = () => {
    frameBounds = networkBounds();
    framePositions.length = layers;
    for (let layer = 0; layer < layers; layer += 1) {
      const layerPositions = framePositions[layer] || [];
      layerPositions.length = tokens;
      for (let token = 0; token < tokens; token += 1) {
        layerPositions[token] = positionForBounds(layer, token, frameBounds, layerPositions[token] || {});
      }
      framePositions[layer] = layerPositions;
    }
  };

  const nodePosition = (layer, token) => framePositions[layer]?.[token]
    || positionForBounds(layer, token, frameBounds || networkBounds());

  const updateReadout = () => {
    let activeConnections = 0;
    let peakWeight = 0;
    const threshold = 0.13 - density * 0.00085;

    if (focusColumn >= 0) {
      weights.forEach((matrix) => {
        matrix.forEach((row, source) => {
          row.forEach((value, target) => {
            if (source !== focusColumn && target !== focusColumn) return;
            peakWeight = Math.max(peakWeight, value);
            if (value > threshold) activeConnections += 1;
          });
        });
      });
    }

    if (focusTokenText) focusTokenText.textContent = focusColumn < 0 ? "Free" : `T_${String(focusColumn + 1).padStart(2, "0")}${lockedColumn >= 0 ? " Hold" : ""}`;
    if (focusLinksText) focusLinksText.textContent = String(activeConnections);
    if (focusPeakText) focusPeakText.textContent = peakWeight.toFixed(3);
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

    if (detailProgress > 0.01) {
      const lensX = width * (0.5 + pointerX * 0.33);
      const lensY = height * (0.5 + pointerY * 0.3);
      context.save();
      context.globalAlpha = detailProgress;

      const lens = context.createRadialGradient(lensX, lensY, 0, lensX, lensY, Math.max(width, height) * 0.38);
      lens.addColorStop(0, "rgba(255,112,78,0.12)");
      lens.addColorStop(0.3, "rgba(255,255,255,0.035)");
      lens.addColorStop(1, "rgba(0,0,0,0)");
      context.fillStyle = lens;
      context.fillRect(0, 0, width, height);

      context.lineWidth = 0.65;
      context.strokeStyle = "rgba(255,255,255,0.075)";
      for (let column = 1; column < 12; column += 1) {
        const x = column / 12 * width;
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, height);
        context.stroke();
      }
      for (let row = 1; row < 8; row += 1) {
        const y = row / 8 * height;
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(width, y);
        context.stroke();
      }

      context.setLineDash([4, 7]);
      context.strokeStyle = "rgba(255,117,83,0.28)";
      context.beginPath();
      context.moveTo(lensX, 0);
      context.lineTo(lensX, height);
      context.moveTo(0, lensY);
      context.lineTo(width, lensY);
      context.stroke();
      context.restore();
    }
  };

  const drawTraceGuide = () => {
    if (detailProgress < 0.04 || focusColumn < 0) return;
    const first = nodePosition(0, focusColumn);
    const last = nodePosition(layers - 1, focusColumn);
    const glow = context.createLinearGradient(first.x, first.y, last.x, last.y);
    glow.addColorStop(0, "rgba(255,91,53,0)");
    glow.addColorStop(0.5, `rgba(255,91,53,${0.12 * detailProgress})`);
    glow.addColorStop(1, "rgba(255,91,53,0)");
    context.save();
    context.strokeStyle = glow;
    context.lineWidth = 26 + detailProgress * 22;
    context.beginPath();
    context.moveTo(first.x, first.y);
    context.lineTo(last.x, last.y);
    context.stroke();
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
          const alpha = Math.min(0.9, strength * (isFocused ? 3.6 + detailProgress * 2.8 : 0.45));
          const focusedEdge = focusColumn >= 0 && (source === focusColumn || target === focusColumn);
          context.strokeStyle = focusedEdge
            ? `rgba(255,117,83,${Math.max(0.16, alpha)})`
            : `rgba(249,250,248,${Math.max(0.025, alpha)})`;
          context.lineWidth = focusedEdge
            ? 1.4 + strength * 2.1 + detailProgress * 1.2
            : 0.45 + strength * (1.45 + detailProgress * 0.65);
          context.beginPath();
          context.moveTo(start.x, start.y);
          const bend = (target - source) * 2.3 + smoothX * 14;
          const controlOneX = start.x + bend;
          const controlOneY = start.y + (end.y - start.y) * 0.42;
          const controlTwoX = end.x - bend;
          const controlTwoY = start.y + (end.y - start.y) * 0.58;
          context.bezierCurveTo(
            controlOneX,
            controlOneY,
            controlTwoX,
            controlTwoY,
            end.x,
            end.y
          );
          context.stroke();

          if (detailProgress > 0.32 && focusedEdge && strength > threshold * 1.08) {
            const travel = (time * 0.00018 + layer * 0.17 + source * 0.031 + target * 0.047) % 1;
            const inverse = 1 - travel;
            const particleX = inverse ** 3 * start.x
              + 3 * inverse ** 2 * travel * controlOneX
              + 3 * inverse * travel ** 2 * controlTwoX
              + travel ** 3 * end.x;
            const particleY = inverse ** 3 * start.y
              + 3 * inverse ** 2 * travel * controlOneY
              + 3 * inverse * travel ** 2 * controlTwoY
              + travel ** 3 * end.y;
            context.beginPath();
            context.arc(particleX, particleY, 1.1 + detailProgress * 1.55, 0, Math.PI * 2);
            context.fillStyle = `rgba(255,190,168,${0.32 + detailProgress * 0.58})`;
            context.shadowBlur = 12;
            context.shadowColor = "rgba(255,91,53,0.92)";
            context.fill();
            context.shadowBlur = 0;
          }
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
        const radius = ((mobile ? 2.3 : 3.1) + oscillation * 0.25 + pulse * (focused || focusColumn < 0 ? 2 : 0.4)) * (1 + detailProgress * 0.72);

        if (focused) {
          context.beginPath();
          context.arc(point.x, point.y, radius + 8 + detailProgress * 6, 0, Math.PI * 2);
          context.fillStyle = `rgba(255,91,53,${0.11 + detailProgress * 0.08})`;
          context.fill();

          if (detailProgress > 0.25) {
            context.beginPath();
            context.arc(point.x, point.y, radius + 13 + Math.sin(time * 0.0025 + layer) * 2, 0, Math.PI * 2);
            context.strokeStyle = `rgba(255,161,132,${0.18 + detailProgress * 0.28})`;
            context.lineWidth = 0.8;
            context.stroke();
          }
        }

        context.beginPath();
        context.arc(point.x, point.y, radius, 0, Math.PI * 2);
        context.fillStyle = focused ? "rgba(255,117,83,0.98)" : "rgba(251,252,249,0.9)";
        context.shadowBlur = focused ? 18 : 8;
        context.shadowColor = focused ? "rgba(255,91,53,0.75)" : "rgba(255,255,255,0.45)";
        context.fill();
        context.shadowBlur = 0;

        const detailedLabel = detailProgress > 0.52 && (tokens <= 14 || token % 2 === 0) && (layer === 0 || layer === layers - 1);
        const standardLabel = !mobile && layer === layers - 1 && (token === focusColumn || (focusColumn < 0 && token % 4 === 0));
        if (!mobile && (detailedLabel || standardLabel)) {
          context.font = `${detailProgress > 0.52 ? 10 : 9}px Inter, "Helvetica Neue", Arial, sans-serif`;
          context.fillStyle = focused ? "rgba(255,140,110,.95)" : "rgba(255,255,255,.54)";
          context.textAlign = "center";
          const offset = layer === 0 && detailedLabel ? -17 : 20 + detailProgress * 3;
          context.fillText(`T_${String(token + 1).padStart(2, "0")}`, point.x, point.y + offset);
        }
      }
    }
    context.restore();
  };

  const layerMarkerOpacity = () => Math.max(0, Math.min(1, (detailProgress - 0.14) / 0.64));

  const drawLayerGuides = () => {
    const opacity = layerMarkerOpacity();
    if (opacity <= 0) return;
    const bounds = frameBounds || networkBounds();
    context.save();
    context.globalAlpha = opacity;
    context.setLineDash([2, 7]);
    context.lineWidth = 1;
    context.strokeStyle = "rgba(255,255,255,.14)";
    for (let layer = 0; layer < layers; layer += 1) {
      const point = nodePosition(layer, 0);
      context.beginPath();
      context.moveTo(Math.max(10, bounds.left - (width < 760 ? 3 : 12)), point.y);
      context.lineTo(bounds.right, point.y);
      context.stroke();
    }
    context.restore();
  };

  const drawLayerLabels = () => {
    const opacity = layerMarkerOpacity();
    if (opacity <= 0) return;
    const compact = width < 760;
    const bounds = frameBounds || networkBounds();
    const labelWidth = compact ? 34 : 72;
    const labelX = compact ? 10 : Math.max(18, bounds.left - labelWidth - 18);

    context.save();
    context.globalAlpha = opacity;
    context.font = `${compact ? 8 : 9}px Inter, "Helvetica Neue", Arial, sans-serif`;
    context.textAlign = "left";
    context.textBaseline = "middle";
    for (let layer = 0; layer < layers; layer += 1) {
      const point = nodePosition(layer, 0);
      context.fillStyle = "rgba(255,91,53,.9)";
      context.fillRect(labelX, point.y - 8, 2, 16);
      context.fillStyle = "rgba(255,255,255,.9)";
      context.shadowBlur = 6;
      context.shadowColor = "rgba(4,6,8,.9)";
      context.fillText(compact ? `L ${String(layer + 1).padStart(2, "0")}` : `LAYER ${String(layer + 1).padStart(2, "0")}`, labelX + 9, point.y + 0.5);
      context.shadowBlur = 0;
    }
    context.restore();
  };

  const render = (time) => {
    if (reduceMotion) detailProgress = detailTarget;
    else {
      const elapsed = Math.max(0, time - detailTransitionStart);
      const rawProgress = Math.min(1, elapsed / detailTransitionDuration);
      const easedProgress = 1 - Math.pow(1 - rawProgress, 3);
      detailProgress = detailTransitionFrom + (detailTarget - detailTransitionFrom) * easedProgress;
    }
    smoothX += (pointerX - smoothX) * 0.045;
    smoothY += (pointerY - smoothY) * 0.045;
    pulse *= 0.92;
    prepareFrameGeometry();
    context.clearRect(0, 0, width, height);
    drawBackdrop(time);
    drawLayerGuides();
    drawTraceGuide();
    drawEdges(time);
    drawNodes(time);
    drawLayerLabels();
    if (!reduceMotion) animationFrame = window.requestAnimationFrame(render);
  };

  const updatePointer = (event) => {
    const bounds = viewport.getBoundingClientRect();
    pointerX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
    pointerY = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;

    if (lockedColumn >= 0) {
      focusColumn = lockedColumn;
    } else {
      const network = networkBounds();
      const withinVerticalField = event.clientY - bounds.top > network.top - 40 && event.clientY - bounds.top < network.bottom + 40;
      const relativeX = event.clientX - bounds.left;
      if (!withinVerticalField || relativeX < network.left - 30 || relativeX > network.right + 30) {
        focusColumn = -1;
      } else {
        const normalized = (relativeX - network.left) / (network.right - network.left);
        focusColumn = Math.max(0, Math.min(tokens - 1, Math.round(normalized * (tokens - 1))));
      }
    }
    updateReadout();
    if (reduceMotion) render(0);
  };

  const resetPointer = () => {
    focusColumn = lockedColumn >= 0 ? lockedColumn : -1;
    pointerX = 0;
    pointerY = 0;
    updateReadout();
    if (reduceMotion) render(0);
  };

  const randomize = () => {
    seed = Math.floor(Math.random() * 1_000_000) + 1;
    rebuild();
  };

  const setZoom = (value) => {
    const next = Math.max(100, Math.min(135, Number(value) || 112));
    detailZoom = next / 100;
    if (zoomInput) zoomInput.value = String(next);
    if (zoomOutput) zoomOutput.textContent = `${detailZoom.toFixed(2)}×`;
    updateReadout();
    if (reduceMotion && weights.length) render(0);
  };

  const setDetailMode = (active, origin) => {
    window.clearTimeout(exitTimer);
    detailMode = Boolean(active);
    detailTransitionStart = performance.now();
    detailTransitionFrom = detailProgress;
    detailTransitionDuration = detailMode ? 560 : 420;
    detailTarget = detailMode ? 1 : 0;
    lockedColumn = -1;
    focusColumn = -1;
    pulse = 1;

    if (detailMode) {
      focusOriginX = Math.max(0.08, Math.min(0.92, origin?.x ?? 0.5));
      focusOriginY = Math.max(0.08, Math.min(0.92, origin?.y ?? 0.5));
      viewport.classList.remove("is-neural-exiting");
      viewport.classList.add("is-neural-focus");
      document.body.classList.add("neural-focus-active");
      focusHud?.setAttribute("aria-hidden", "false");
      focusHud?.removeAttribute("inert");
      neuralControls?.removeAttribute("inert");
      focusToggle?.setAttribute("aria-expanded", "true");
      canvas.setAttribute("aria-label", "Attention microscope active. Move across tokens, click to hold a trace, and press Escape to exit.");
      canvas.focus({ preventScroll: true });
    } else {
      viewport.classList.remove("is-neural-focus");
      viewport.classList.add("is-neural-exiting");
      focusHud?.setAttribute("aria-hidden", "true");
      focusHud?.setAttribute("inert", "");
      neuralControls?.setAttribute("inert", "");
      focusToggle?.setAttribute("aria-expanded", "false");
      canvas.setAttribute("aria-label", "Interactive transformer attention network. Double click to enter inspection mode.");
      exitTimer = window.setTimeout(() => {
        viewport.classList.remove("is-neural-exiting");
        document.body.classList.remove("neural-focus-active");
        focusToggle?.focus({ preventScroll: true });
      }, reduceMotion ? 0 : 540);
    }
    updateReadout();
    if (reduceMotion) render(0);
  };

  const isFocusHistoryState = (state = window.history.state) => Boolean(state?.[focusHistoryKey]);

  const openDetailMode = (origin) => {
    if (!isFocusHistoryState()) {
      window.history.pushState({ ...window.history.state, [focusHistoryKey]: true }, "", "#neural-inspector");
    }
    setDetailMode(true, origin);
  };

  const closeDetailMode = () => {
    if (!detailMode) return;
    if (isFocusHistoryState()) {
      window.history.back();
      return;
    }
    setDetailMode(false);
  };

  const toggleDetailMode = () => {
    if (detailMode) closeDetailMode();
    else openDetailMode();
  };

  const handleCanvasClick = () => {
    window.clearTimeout(clickTimer);
    clickTimer = window.setTimeout(() => {
      if (!detailMode) {
        randomize();
        return;
      }
      if (focusColumn < 0) return;
      lockedColumn = lockedColumn === focusColumn ? -1 : focusColumn;
      focusColumn = lockedColumn >= 0 ? lockedColumn : focusColumn;
      pulse = 1;
      updateReadout();
    }, 320);
  };

  const handleCanvasDoubleClick = (event) => {
    event.preventDefault();
    window.clearTimeout(clickTimer);
    const bounds = viewport.getBoundingClientRect();
    const origin = {
      x: (event.clientX - bounds.left) / Math.max(1, bounds.width),
      y: (event.clientY - bounds.top) / Math.max(1, bounds.height)
    };
    if (detailMode) closeDetailMode();
    else openDetailMode(origin);
  };

  tokenInput?.addEventListener("input", rebuild);
  layerInput?.addEventListener("input", rebuild);
  densityInput?.addEventListener("input", rebuild);
  randomizeButton?.addEventListener("click", randomize);
  legendRandomize?.addEventListener("click", randomize);
  legendExit?.addEventListener("click", closeDetailMode);
  zoomInput?.addEventListener("input", () => setZoom(zoomInput.value));
  focusToggle?.addEventListener("click", () => openDetailMode());
  focusClose?.addEventListener("click", closeDetailMode);
  canvas.addEventListener("pointermove", updatePointer, { passive: true });
  canvas.addEventListener("pointerleave", resetPointer, { passive: true });
  canvas.addEventListener("click", handleCanvasClick);
  canvas.addEventListener("dblclick", handleCanvasDoubleClick);
  canvas.addEventListener("wheel", (event) => {
    if (!detailMode) return;
    event.preventDefault();
    setZoom(Number(zoomInput?.value || detailZoom * 100) - Math.sign(event.deltaY) * 3);
  }, { passive: false });
  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener("scroll", updateScroll, { passive: true });
  window.addEventListener("popstate", (event) => {
    if (isFocusHistoryState(event.state)) {
      if (!detailMode) setDetailMode(true);
      return;
    }
    if (detailMode) setDetailMode(false);
  });
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && detailMode) {
      event.preventDefault();
      closeDetailMode();
      return;
    }
    if (event.target === canvas && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      toggleDetailMode();
      return;
    }
    const tag = event.target?.tagName?.toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return;
    if (event.key.toLowerCase() === "r") randomize();
    if (event.key.toLowerCase() === "f") toggleDetailMode();
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
  setZoom(detailZoom * 100);
  updateScroll();
  rebuild();
  if (isFocusHistoryState() && window.location.hash === "#neural-inspector") setDetailMode(true);
  if (reduceMotion) render(0);
  else animationFrame = window.requestAnimationFrame(render);
})();
