const showcase = document.querySelector("#gpu-showcase");
const frame = document.querySelector("#gpu-model");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const modelId = "1035d0d5985d4c3b8c91e3da9eb1fade";
let viewer;
let camera;
let visible = true;
let queued = false;
let lastTurn = -1;

function rotateWithScroll() {
  queued = false;
  const bounds = showcase.getBoundingClientRect();
  const top = bounds.top + scrollY;
  const start = Math.max(0, top - innerHeight * 0.65);
  const end = Math.max(start + 1, top + bounds.height - innerHeight * 0.25);
  const phase = reducedMotion.matches ? 0 : Math.min(1, Math.max(0, (scrollY - start) / (end - start)));
  const angle = phase * Math.PI * 0.32;
  showcase.style.setProperty("--model-turn", `${Math.round(phase * 58)}deg`);
  if (!viewer || !camera || !visible || Math.abs(angle - lastTurn) < 0.025) return;
  lastTurn = angle;
  const [x, y, z] = camera.position;
  const [tx, ty, tz] = camera.target;
  const zoom = 0.9;
  const dx = (x - tx) * zoom;
  const dy = (y - ty) * zoom;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  viewer.setCameraLookAt([tx + dx * c - dy * s, ty + dx * s + dy * c, tz + (z - tz) * zoom], [tx, ty, tz], 0);
}

function queueRotation() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(rotateWithScroll);
}

function startViewer() {
  if (typeof Sketchfab !== "function") return;
  const client = new Sketchfab("1.12.1", frame);
  client.init(modelId, {
    autostart: 1,
    camera: 0,
    dnt: 1,
    scrollwheel: 0,
    success(api) {
      viewer = api;
      api.start();
      api.addEventListener("viewerready", () => {
        api.setUserInteraction(false);
        api.getCameraLookAt((error, initialCamera) => {
          if (error || !initialCamera?.position || !initialCamera?.target) return;
          camera = initialCamera;
          showcase.classList.add("has-model");
          queueRotation();
        });
      });
    },
    error() { showcase.classList.remove("has-model"); },
  });
}

const observer = new IntersectionObserver(([entry]) => {
  visible = entry.isIntersecting;
  if (visible) queueRotation();
  if (!visible || showcase.dataset.modelRequested) return;
  showcase.dataset.modelRequested = "true";
  const script = document.createElement("script");
  script.src = "https://static.sketchfab.com/api/sketchfab-viewer-1.12.1.js";
  script.async = true;
  script.onload = startViewer;
  document.head.append(script);
}, { rootMargin: "200px" });
observer.observe(showcase);
window.addEventListener("scroll", queueRotation, { passive: true });
window.addEventListener("resize", queueRotation);
reducedMotion.addEventListener("change", queueRotation);
queueRotation();
