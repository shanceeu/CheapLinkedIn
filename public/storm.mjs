const canvas = document.querySelector("#crowstorm");
const context = canvas?.getContext("2d", { alpha: true });
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

if (context) {
  let width = 0;
  let height = 0;
  let particles = [];
  let frame = 0;
  let previous = 0;
  let effect = ["storm", "matrix", "still"].includes(localStorage.getItem("site-effect")) ? localStorage.getItem("site-effect") : "storm";

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    particles = Array.from({ length: width < 700 ? 24 : 48 }, (_, index) => ({
      angle: index * 2.399 + .7,
      distance: 70 + (index * 83) % Math.max(170, Math.min(width, height) * .43),
      size: 4 + (index * 7) % 11,
      speed: .00012 + (index % 7) * .000018,
      tone: index % 4 === 0 ? "rgba(199, 76, 88, .32)" : "rgba(9, 6, 10, .55)",
    }));
    draw(performance.now());
  }

  function draw(time) {
    context.clearRect(0, 0, width, height);
    if (effect === "matrix") return drawMatrix(time);
    if (effect === "still") return drawStill();
    const centerX = width < 700 ? width * .74 : width * .77;
    const centerY = height * .48;
    const radius = Math.min(width, height) * .48;
    const haze = context.createRadialGradient(centerX, centerY, 10, centerX, centerY, radius * 1.8);
    haze.addColorStop(0, "rgba(151, 34, 45, .29)");
    haze.addColorStop(.46, "rgba(65, 9, 18, .16)");
    haze.addColorStop(1, "rgba(35, 8, 15, 0)");
    context.fillStyle = haze;
    context.fillRect(0, 0, width, height);

    context.save();
    context.translate(centerX, centerY);
    const scrollPhase = reducedMotion.matches ? 0 : window.scrollY * .00045;
    context.rotate(reducedMotion.matches ? -.16 : time * .000035 + scrollPhase);
    context.strokeStyle = "rgba(215, 88, 98, .16)";
    context.lineWidth = 1;
    for (const scale of [.55, .86, 1.17]) {
      context.beginPath();
      context.ellipse(0, 0, radius * scale, radius * scale * .53, -.28, .1, Math.PI * 1.63);
      context.stroke();
    }
    context.restore();

    for (const particle of particles) {
      const angle = particle.angle + (reducedMotion.matches ? 0 : time * particle.speed + scrollPhase);
      const x = centerX + Math.cos(angle) * particle.distance;
      const y = centerY + Math.sin(angle) * particle.distance * .52;
      const rotation = angle + Math.PI / 2;
      context.save();
      context.translate(x, y);
      context.rotate(rotation);
      context.fillStyle = particle.tone;
      context.beginPath();
      context.moveTo(-particle.size * .75, 0);
      context.quadraticCurveTo(0, -particle.size * .47, particle.size, 0);
      context.quadraticCurveTo(0, particle.size * .22, -particle.size * .75, 0);
      context.fill();
      context.restore();
    }

    for (let index = 0; index < 7; index++) {
      const angle = index * 2.4 + (reducedMotion.matches ? 0 : time * (.000075 + index * .000003) + scrollPhase);
      const distance = radius * (.38 + index % 3 * .27);
      const size = 10 + index % 4 * 3;
      context.save();
      context.translate(centerX + Math.cos(angle) * distance, centerY + Math.sin(angle) * distance * .55);
      context.rotate(angle + Math.PI / 2);
      context.fillStyle = "rgba(11, 6, 10, .48)";
      context.beginPath();
      context.moveTo(-size, -size * .2);
      context.quadraticCurveTo(-size * .55, -size * .85, 0, 0);
      context.quadraticCurveTo(size * .55, -size * .85, size, -size * .2);
      context.quadraticCurveTo(size * .55, -size * .15, 0, size * .2);
      context.quadraticCurveTo(-size * .55, -size * .15, -size, -size * .2);
      context.fill();
      context.restore();
    }
  }

  function drawStill() {
    const glow = context.createRadialGradient(width * .8, height * .42, 1, width * .8, height * .42, Math.max(width, height) * .7);
    glow.addColorStop(0, "rgba(155, 45, 56, .26)");
    glow.addColorStop(1, "rgba(30, 8, 16, 0)");
    context.fillStyle = glow;
    context.fillRect(0, 0, width, height);
  }

  function drawMatrix(time) {
    context.fillStyle = "rgba(18, 6, 12, .28)";
    context.fillRect(0, 0, width, height);
    const gap = width < 700 ? 26 : 31;
    const rows = Math.ceil(height / gap) + 3;
    const columns = Math.ceil(width / gap);
    const phase = reducedMotion.matches ? 0 : Math.floor(time / 170 + window.scrollY * .12);
    context.font = `13px "Space Grotesk", sans-serif`;
    context.textAlign = "center";
    for (let column = 0; column < columns; column++) {
      const offset = (column * 17 + phase) % rows;
      for (let index = 0; index < 9; index++) {
        const row = (offset - index + rows) % rows;
        const seed = (column * 23 + row * 71 + Math.floor(phase / 3)) % 10;
        context.fillStyle = index === 0 ? "rgba(255, 183, 198, .46)" : `rgba(220, 75, 107, ${.22 * (1 - index / 10)})`;
        context.fillText(seed, column * gap + gap / 2, row * gap + gap / 2);
      }
    }
  }

  function loop(time) {
    if (time - previous >= 33) {
      draw(time);
      previous = time;
    }
    frame = requestAnimationFrame(loop);
  }

  function updateMotion() {
    cancelAnimationFrame(frame);
    if (reducedMotion.matches || document.hidden) draw(performance.now());
    else frame = requestAnimationFrame(loop);
  }

  window.addEventListener("resize", resize, { passive: true });
  document.addEventListener("visibilitychange", updateMotion);
  reducedMotion.addEventListener("change", updateMotion);
  window.addEventListener("site-effect-change", event => {
    effect = ["storm", "matrix", "still"].includes(event.detail) ? event.detail : "storm";
    updateMotion();
  });
  resize();
  updateMotion();
}
