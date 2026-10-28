const showcase = document.querySelector("#gpu-showcase");
const frame = document.querySelector("#gpu-model");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const modelId = "1035d0d5985d4c3b8c91e3da9eb1fade";
const turnDuration = 12000;
let viewer;
let camera;
let visible = false;
let frameId = 0;
let lastTime = 0;
let lastPaint = 0;
let elapsed = 0;

function setCamera(angle) {
  const [x, y, z] = camera.position;
  const [tx, ty, tz] = camera.target;
  const zoom = 1.3;
  const dx = (x - tx) * zoom;
  const dy = (y - ty) * zoom;
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  viewer.setCameraLookAt([tx + dx * cosine - dy * sine, ty + dx * sine + dy * cosine, tz + (z - tz) * zoom], [tx, ty, tz], 0);
}

function turn(time) {
  frameId = requestAnimationFrame(turn);
  elapsed += lastTime ? Math.min(time - lastTime, 64) : 0;
  lastTime = time;
  if (time - lastPaint < 33) return;
  lastPaint = time;
  setCamera(Math.sin(elapsed / turnDuration * Math.PI * 2) * Math.PI / 9);
}

function syncMotion() {
  if (visible && viewer && camera && !reducedMotion.matches) {
    if (!frameId) frameId = requestAnimationFrame(turn);
    return;
  }
  if (frameId) cancelAnimationFrame(frameId);
  frameId = 0;
  lastTime = 0;
  if (reducedMotion.matches && viewer && camera) setCamera(0);
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
          syncMotion();
        });
      });
    },
    error() { showcase.classList.remove("has-model"); },
  });
}

const observer = new IntersectionObserver(([entry]) => {
  visible = entry.isIntersecting;
  syncMotion();
  if (!visible || showcase.dataset.modelRequested) return;
  showcase.dataset.modelRequested = "true";
  const script = document.createElement("script");
  script.src = "https://static.sketchfab.com/api/sketchfab-viewer-1.12.1.js";
  script.async = true;
  script.onload = startViewer;
  document.head.append(script);
}, { rootMargin: "200px" });
observer.observe(showcase);
reducedMotion.addEventListener("change", syncMotion);
