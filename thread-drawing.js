(function() {
  const canvas = document.getElementById("heroCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const SHIRT_OFFWHITE = "#F2EFE9";
  const SHIRT_BLACK = "#1C1418";
  const THREAD_COLORS = ["#9B5566", "#4E6FA8", "#C05A4A", "#7A6E95", "#8A7D86", "#5F8F86", "#B0574F"];
  const SVG_SHIRT = "M176.24,594.87l247.9,.32c-1.03,-65.35,-2.07,-130.7,-3.1,-196.05l35.61,15.42,48.03,-62.22,-93.95,-75.82,-80.52,-29.08s-3.95,43.87,-31.85,45.38c-27.9,1.51,-34.43,-43.97,-34.43,-43.97l-70.76,23.49,-102.59,79.4,49.45,62.81,36.02,-17.37c.06,65.89,.12,131.78,.18,197.67Z";
  const SVG_COLLAR_FILL = "M265.35,247.58s31.65,10.12,63.76,-.88c.6,3.91,3.03,22.39,-9.15,36.76c-2.92,3.45,-10.21,12.04,-21.59,12.47c-11.08,.42,-18.84,-7.18,-21.61,-9.89c-14.39,-14.08,-11.85,-35.22,-11.42,-38.46Z";
  let shirtColor = SHIRT_OFFWHITE;
  let threadColor = THREAD_COLORS[0];
  let trails = [];
  let currentTrail = null;
  let isDrawing = false;
  let W = 0, H = 0;
  let shirtPath = null;
  let shirtMx = null;
  let shirtMidY = 0;
  let shirtScale = 1;
  let shirtBottomY = 0;
  let hintOpacity = 1;
  let hasDrawn = false;
  let swatchHits = [];
  function isDark() {
    return document.documentElement.getAttribute("data-theme") === "dark";
  }
  const SVG_SHIRT_LEFT = 91, SVG_SHIRT_TOP = 247, SVG_SHIRT_W = 414, SVG_SHIRT_H = 348;
  function buildShirtPath() {
    const widthShare = W < 560 ? 0.92 : W < 900 ? 0.74 : 0.58;
    const targetW = Math.min(W * widthShare, H * 0.68);
    const scale = targetW / SVG_SHIRT_W;
    shirtScale = scale;
    const offsetX = W / 2 - (SVG_SHIRT_LEFT + SVG_SHIRT_W / 2) * scale;
    const offsetY = H * 0.05 + 50 - SVG_SHIRT_TOP * scale;
    shirtMx = new DOMMatrix([scale, 0, 0, scale, offsetX, offsetY]);
    const raw = new Path2D(SVG_SHIRT);
    shirtPath = new Path2D();
    shirtPath.addPath(raw, shirtMx);
    shirtBottomY = offsetY + 595 * scale;
    shirtMidY = offsetY + (SVG_SHIRT_TOP + SVG_SHIRT_H / 2) * scale;
  }
  function buildSwatchHits() {
    const n = THREAD_COLORS.length;
    const r = Math.min(13, W * 0.75 / (n * 3.2));
    const spacing = r * 3.2;
    const startX = W / 2 - (n - 1) * spacing / 2;
    const swY = shirtBottomY + (H * 0.9 - shirtBottomY) * 0.42;
    swatchHits = THREAD_COLORS.map((color, i) => ({
      x: startX + i * spacing,
      y: swY,
      r,
      color
    }));
  }
  function resize() {
    W = canvas.width = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
    buildShirtPath();
    buildSwatchHits();
  }
  function hexToRgb(hex) {
    return { r: parseInt(hex.slice(1, 3), 16), g: parseInt(hex.slice(3, 5), 16), b: parseInt(hex.slice(5, 7), 16) };
  }
  function txPath(d) {
    const p = new Path2D();
    p.addPath(new Path2D(d), shirtMx);
    return p;
  }
  function drawGrid() {
    const dark = isDark();
    ctx.strokeStyle = dark ? "rgba(242,239,233,0.05)" : "rgba(42,14,19,0.09)";
    ctx.lineWidth = 0.5;
    const sp = 22;
    for (let x = 0; x < W; x += sp) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += sp) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
  }
  function drawShirtFill() {
    if (!shirtPath || !shirtMx) return;
    const dark = isDark();
    ctx.save();
    ctx.shadowColor = dark ? "rgba(0,0,0,0.70)" : "rgba(42,14,19,0.28)";
    ctx.shadowBlur = 38;
    ctx.shadowOffsetX = 6;
    ctx.shadowOffsetY = 16;
    ctx.fillStyle = shirtColor;
    ctx.fill(shirtPath);
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = dark ? "rgba(0,0,0,0.20)" : "rgba(0,0,0,0.11)";
    ctx.fill(txPath(SVG_COLLAR_FILL));
    ctx.restore();
  }
  function drawThreads() {
    if (!shirtPath || trails.length === 0) return;
    ctx.save();
    ctx.clip(shirtPath);
    trails.forEach((trail) => {
      if (trail.pts.length < 2) return;
      const { r, g, b } = hexToRgb(trail.color);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = 1.6;
      for (let i = 1; i < trail.pts.length; i++) {
        const a = trail.pts[i - 1], bp = trail.pts[i];
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(bp.x, bp.y);
        ctx.strokeStyle = `rgba(${r},${g},${b},0.80)`;
        ctx.stroke();
      }
    });
    ctx.restore();
  }
  function drawShirtOverlay() {
    if (!shirtPath || !shirtMx) return;
    const dark = isDark();
    ctx.save();
    ctx.strokeStyle = dark ? "rgba(242,239,233,0.42)" : "rgba(42,14,19,0.38)";
    ctx.lineWidth = 1.5;
    ctx.stroke(shirtPath);
    ctx.restore();
  }
  function drawSwatches() {
    const dark = isDark();
    swatchHits.forEach((sw) => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
      ctx.fillStyle = sw.color;
      ctx.fill();
      const selected = sw.color === threadColor;
      ctx.strokeStyle = selected ? dark ? "rgba(242,239,233,0.95)" : "rgba(42,14,19,0.85)" : dark ? "rgba(242,239,233,0.45)" : "rgba(42,14,19,0.45)";
      ctx.lineWidth = selected ? 2.5 : 0.5;
      ctx.stroke();
      if (selected) {
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.r + 5, 0, Math.PI * 2);
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.restore();
    });
    const first = swatchHits[0];
    if (!first) return;
    ctx.save();
    ctx.font = '500 8px "Instrument Sans", sans-serif';
    ctx.letterSpacing = "0.16em";
    ctx.fillStyle = isDark() ? "rgba(242,239,233,0.70)" : "rgba(42,14,19,0.60)";
    ctx.textAlign = "center";
    ctx.fillText("THREAD COLOR", W / 2, first.y - first.r - 12);
    ctx.textAlign = "left";
    ctx.letterSpacing = "0";
    ctx.restore();
  }
  const isTouch = window.matchMedia("(pointer: coarse)").matches;
  function shirtTextColor() {
    const hex = shirtColor.replace("#", "");
    const r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
    const lum = (r * 299 + g * 587 + b * 114) / 1e3;
    return lum > 128 ? "44,26,14" : "240,232,220";
  }
  const SVG_TORSO_LEFT = 176.24, SVG_TORSO_RIGHT = 424.14;
  function fitHintLines(phrases, maxW) {
    for (let size = 10; size >= 7.5; size -= 0.5) {
      ctx.font = `500 ${size}px "Instrument Sans", sans-serif`;
      ctx.letterSpacing = size >= 9 ? "0.14em" : "0.08em";
      const out = [];
      let fits = true;
      for (const phrase of phrases) {
        let cur = "";
        for (const word of phrase.split(" ")) {
          const test = cur ? `${cur} ${word}` : word;
          if (ctx.measureText(test).width <= maxW) {
            cur = test;
            continue;
          }
          if (cur) out.push(cur);
          if (ctx.measureText(word).width > maxW) fits = false;
          cur = word;
        }
        if (cur) out.push(cur);
      }
      if (fits) return { size, lines: out };
    }
    return null;
  }
  function drawHint() {
    if (hintOpacity <= 0 || !shirtPath) return;
    const base = shirtTextColor();
    const phrases = isTouch ? ["DRAG INSIDE THE SHIRT TO STITCH", "DOUBLE-TAP TO FLIP THE SHIRT"] : ["CLICK & DRAG INSIDE THE SHIRT TO STITCH", "DOUBLE-CLICK TO FLIP THE SHIRT"];
    ctx.save();
    const torsoW = (SVG_TORSO_RIGHT - SVG_TORSO_LEFT) * shirtScale;
    const fitted = fitHintLines(phrases, torsoW - 18);
    if (!fitted) {
      ctx.restore();
      return;
    }
    ctx.clip(shirtPath);
    ctx.font = `500 ${fitted.size}px "Instrument Sans", sans-serif`;
    ctx.letterSpacing = fitted.size >= 9 ? "0.14em" : "0.08em";
    ctx.fillStyle = `rgba(${base},${hintOpacity * 0.52})`;
    ctx.textAlign = "center";
    const lh = fitted.size * 1.9;
    const top = shirtMidY - (fitted.lines.length - 1) * lh / 2;
    fitted.lines.forEach((line, i) => ctx.fillText(line, W / 2, top + i * lh));
    ctx.textAlign = "left";
    ctx.letterSpacing = "0";
    ctx.restore();
  }
  function drawFrame() {
    requestAnimationFrame(drawFrame);
    ctx.clearRect(0, 0, W, H);
    drawGrid();
    drawShirtFill();
    drawThreads();
    drawShirtOverlay();
    if (hasDrawn) hintOpacity = Math.max(0, hintOpacity - 0.012);
    drawHint();
    drawSwatches();
  }
  function getXY(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }
  function inShirt(x, y) {
    return shirtPath ? ctx.isPointInPath(shirtPath, x, y) : false;
  }
  function hitSwatch(x, y) {
    return swatchHits.find((s) => Math.hypot(x - s.x, y - s.y) <= s.r * 1.5);
  }
  function addPoint(x, y) {
    if (!currentTrail) {
      currentTrail = { pts: [], color: threadColor };
      trails.push(currentTrail);
    }
    const last = currentTrail.pts[currentTrail.pts.length - 1];
    if (!last || Math.hypot(x - last.x, y - last.y) > 4) {
      currentTrail.pts.push({ x, y });
      hasDrawn = true;
    }
  }
  const section = canvas.parentElement;
  section.addEventListener("mousedown", (e) => {
    const { x, y } = getXY(e);
    const sw = hitSwatch(x, y);
    if (sw) {
      threadColor = sw.color;
      return;
    }
    if (inShirt(x, y)) {
      isDrawing = true;
      currentTrail = null;
      addPoint(x, y);
    }
  });
  section.addEventListener("mousemove", (e) => {
    if (!isDrawing) return;
    const { x, y } = getXY(e);
    if (inShirt(x, y)) addPoint(x, y);
  });
  section.addEventListener("mouseup", () => {
    isDrawing = false;
    currentTrail = null;
  });
  section.addEventListener("mouseleave", () => {
    isDrawing = false;
    currentTrail = null;
  });
  section.addEventListener("dblclick", (e) => {
    const { x, y } = getXY(e);
    if (inShirt(x, y)) {
      shirtColor = shirtColor === SHIRT_OFFWHITE ? SHIRT_BLACK : SHIRT_OFFWHITE;
    }
  });
  let lastTap = 0;
  section.addEventListener("touchstart", (e) => {
    const { x, y } = getXY(e.touches[0]);
    const sw = hitSwatch(x, y);
    if (sw) {
      threadColor = sw.color;
      return;
    }
    if (inShirt(x, y)) {
      isDrawing = true;
      currentTrail = null;
      addPoint(x, y);
    }
    const now = Date.now();
    if (now - lastTap < 300 && inShirt(x, y)) {
      shirtColor = shirtColor === SHIRT_OFFWHITE ? SHIRT_BLACK : SHIRT_OFFWHITE;
    }
    lastTap = now;
  }, { passive: true });
  section.addEventListener("touchmove", (e) => {
    e.preventDefault();
    if (!isDrawing) return;
    const { x, y } = getXY(e.touches[0]);
    if (inShirt(x, y)) addPoint(x, y);
  }, { passive: false });
  section.addEventListener("touchend", () => {
    isDrawing = false;
    currentTrail = null;
  });
  window.addEventListener("resize", resize);
  resize();
  drawFrame();
})();
