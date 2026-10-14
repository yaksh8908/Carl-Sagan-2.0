/* ==========================================================================
   COSMOS — Explorando o Universo com Carl Sagan
   1. Imports  2. DOM Elements  3. Scene Setup  4. Camera  5. Renderer
   6. Lights  7. Stars  8. Solar System  9. Planets Data  10. Orbit Controls
   11. Raycasting  12. Camera Animation  13. Planet Information UI
   14. Scroll Effects  15. Intersection Observer  16. Chatbot API
   17. Event Listeners  18. Animation Loop  19. Resize Handler
   ========================================================================== */

/* 1. IMPORTS --------------------------------------------------------------- */
import * as THREE from "three";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";

/* 2. DOM ELEMENTS ------------------------------------------------------------ */
const dom = {
  loadingScreen: document.getElementById("loading-screen"),
  loadingBarFill: document.getElementById("loading-bar-fill"),
  header: document.getElementById("site-header"),
  navToggle: document.getElementById("nav-toggle"),
  primaryNav: document.getElementById("primary-nav"),
  canvas: document.getElementById("solar-canvas"),
  planetCard: document.getElementById("planet-card"),
  planetType: document.getElementById("planet-type"),
  planetIndex: document.getElementById("planet-index"),
  planetName: document.getElementById("planet-name"),
  statDiameter: document.getElementById("stat-diameter"),
  statDistance: document.getElementById("stat-distance"),
  statYear: document.getElementById("stat-year"),
  planetCuriosity: document.getElementById("planet-curiosity-text"),
  btnPrev: document.getElementById("btn-prev"),
  btnNext: document.getElementById("btn-next"),
  planetDots: document.getElementById("planet-dots"),
  chatMessages: document.getElementById("chat-messages"),
  chatForm: document.getElementById("chat-form"),
  chatInput: document.getElementById("chat-input"),
  chatSend: document.getElementById("chat-send"),
  chatSuggestions: document.getElementById("chat-suggestions"),
};

const isMobile = window.innerWidth < 768;
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* 9. PLANETS DATA ------------------------------------------------------------ */
// Escala artística (não astronômica): raio e distância pensados para leitura
// visual clara, não para proporção real. Estatísticas nos cards são reais.
const BODIES = [
  {
    key: "sol", name: "SOL", type: "ESTRELA",
    radius: 6, distance: 0, color: 0xffb35c,
    orbitSpeed: 0, rotationSpeed: 0.02,
    diameter: "1.392.700 km", distanceFromSun: "Centro do sistema", year: "—",
    curiosity: "Toda a luz que sustenta a vida na Terra nasce aqui, em reações que começaram bilhões de anos antes de existir alguém para admirá-las.",
  },
  {
    key: "mercurio", name: "MERCÚRIO", type: "PLANETA TERRESTRE",
    radius: 0.6, distance: 13, color: 0x9c9187,
    orbitSpeed: 0.75, rotationSpeed: 0.01,
    diameter: "4.879 km", distanceFromSun: "57,9 milhões km", year: "88 dias",
    curiosity: "Tão perto da fornalha solar e tão devagar em torno do próprio eixo: um dia em Mercúrio dura mais que o seu ano.",
  },
  {
    key: "venus", name: "VÊNUS", type: "PLANETA TERRESTRE",
    radius: 0.95, distance: 17, color: 0xd9b384,
    orbitSpeed: 0.6, rotationSpeed: 0.004,
    diameter: "12.104 km", distanceFromSun: "108,2 milhões km", year: "225 dias",
    curiosity: "Sob nuvens de ácido sulfúrico, gira ao contrário dos demais planetas — como se a natureza gostasse de exceções.",
  },
  {
    key: "terra", name: "TERRA", type: "PLANETA TERRESTRE",
    radius: 1, distance: 21, color: 0x3d8cff,
    orbitSpeed: 0.5, rotationSpeed: 0.03,
    diameter: "12.742 km", distanceFromSun: "149,6 milhões km", year: "365 dias",
    curiosity: "Neste pequeno mundo azul, uma espécie aprendeu a olhar para o céu e perguntar de onde veio.",
  },
  {
    key: "marte", name: "MARTE", type: "PLANETA TERRESTRE",
    radius: 0.75, distance: 26, color: 0xc1440e,
    orbitSpeed: 0.4, rotationSpeed: 0.028,
    diameter: "6.779 km", distanceFromSun: "227,9 milhões km", year: "687 dias",
    curiosity: "Vale de poeira avermelhada e vulcões adormecidos, é o horizonte mais próximo de outra casa para a humanidade.",
  },
  {
    key: "jupiter", name: "JÚPITER", type: "GIGANTE GASOSO",
    radius: 3.1, distance: 34, color: 0xd8ac7a,
    orbitSpeed: 0.22, rotationSpeed: 0.05,
    diameter: "139.820 km", distanceFromSun: "778,5 milhões km", year: "12 anos",
    curiosity: "Uma tempestade maior que a Terra gira em sua superfície há séculos: a Grande Mancha Vermelha não conhece pressa.",
  },
  {
    key: "saturno", name: "SATURNO", type: "GIGANTE GASOSO",
    radius: 2.7, distance: 43, color: 0xe3c78a, hasRing: true,
    orbitSpeed: 0.16, rotationSpeed: 0.046,
    diameter: "116.460 km", distanceFromSun: "1,43 bilhão km", year: "29 anos",
    curiosity: "Seus anéis são bilhões de fragmentos de gelo e rocha, cada um numa órbita silenciosa e própria ao redor do planeta.",
  },
  {
    key: "urano", name: "URANO", type: "GIGANTE DE GELO",
    radius: 1.7, distance: 51, color: 0x8fd6d0,
    orbitSpeed: 0.11, rotationSpeed: 0.034,
    diameter: "50.724 km", distanceFromSun: "2,87 bilhões km", year: "84 anos",
    curiosity: "Gira quase deitado, como se rolasse pela própria órbita — provavelmente o resultado de uma colisão antiga e violenta.",
  },
  {
    key: "netuno", name: "NETUNO", type: "GIGANTE DE GELO",
    radius: 1.65, distance: 58, color: 0x4363d8,
    orbitSpeed: 0.09, rotationSpeed: 0.032,
    diameter: "49.244 km", distanceFromSun: "4,50 bilhões km", year: "165 anos",
    curiosity: "Tão distante que recebe luz solar mil vezes mais fraca que a Terra, e ainda assim carrega os ventos mais violentos do sistema.",
  },
];

/* 3. SCENE SETUP -------------------------------------------------------------- */
const scene = new THREE.Scene();
const clock = new THREE.Clock();
let heroEl = document.getElementById("hero");

/* 4. CAMERA -------------------------------------------------------------------- */
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  2000
);
camera.position.set(0, 26, 58);

/* 5. RENDERER -------------------------------------------------------------------- */
const renderer = new THREE.WebGLRenderer({
  canvas: dom.canvas,
  antialias: true,
  alpha: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

/* 6. LIGHTS -------------------------------------------------------------------- */
scene.add(new THREE.AmbientLight(0x223355, 0.9));
const sunLight = new THREE.PointLight(0xfff1d6, 3.2, 0, 0.06);
sunLight.position.set(0, 0, 0);
scene.add(sunLight);

/* 7. STARS ------------------------------------------------------------------------ */
const STAR_COUNT = isMobile ? 2600 : 7000;
const starsGroup = new THREE.Group();
scene.add(starsGroup);

function buildStarfield() {
  const positions = new Float32Array(STAR_COUNT * 3);
  const sizes = new Float32Array(STAR_COUNT);
  const radiusMin = 90;
  const radiusMax = 480;

  for (let i = 0; i < STAR_COUNT; i++) {
    const r = radiusMin + Math.random() * (radiusMax - radiusMin);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(THREE.MathUtils.randFloatSpread(2));
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
    sizes[i] = Math.random() * 1.8 + 0.3;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

  const material = new THREE.PointsMaterial({
    color: 0xf5f9ff,
    size: 1.1,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });

  const points = new THREE.Points(geometry, material);
  starsGroup.add(points);
}
buildStarfield();

/* 8. SOLAR SYSTEM -------------------------------------------------------------------- */
const solarSystemGroup = new THREE.Group();
scene.add(solarSystemGroup);

// Glow sprite for the Sun, generated at runtime (no external texture files).
function makeGlowTexture() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2
  );
  gradient.addColorStop(0, "rgba(255, 220, 160, 0.9)");
  gradient.addColorStop(0.4, "rgba(255, 170, 90, 0.35)");
  gradient.addColorStop(1, "rgba(255, 140, 60, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

const glowTexture = makeGlowTexture();
const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({
  map: glowTexture,
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
}));
sunGlow.scale.set(34, 34, 1);
solarSystemGroup.add(sunGlow);

const orbitMaterialTemplate = new THREE.LineBasicMaterial({
  color: 0x1f6feb,
  transparent: true,
  opacity: 0.18,
});

function buildOrbitLine(radius) {
  const segments = 128;
  const points = [];
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  return new THREE.LineLoop(geometry, orbitMaterialTemplate.clone());
}

// Build meshes for every body (index 0 = Sol) and keep references on BODIES.
const raycastTargets = [];

BODIES.forEach((body, index) => {
  let material;
  if (index === 0) {
    material = new THREE.MeshBasicMaterial({ color: body.color });
  } else {
    material = new THREE.MeshStandardMaterial({
      color: body.color,
      roughness: 0.75,
      metalness: 0.05,
      emissive: new THREE.Color(body.color).multiplyScalar(0.06),
    });
  }

  const geometry = new THREE.SphereGeometry(body.radius, 32, 32);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData.bodyIndex = index;

  const orbitAngle = Math.random() * Math.PI * 2;
  mesh.position.set(
    Math.cos(orbitAngle) * body.distance,
    0,
    Math.sin(orbitAngle) * body.distance
  );

  solarSystemGroup.add(mesh);
  raycastTargets.push(mesh);

  body.mesh = mesh;
  body.angle = orbitAngle;

  if (body.distance > 0) {
    solarSystemGroup.add(buildOrbitLine(body.distance));
  }

  if (body.hasRing) {
    const ringGeometry = new THREE.RingGeometry(body.radius * 1.5, body.radius * 2.4, 64);
    // UVs so the ring reads as a flat disc rather than radial stripes.
    const pos = ringGeometry.attributes.position;
    const v3 = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v3.fromBufferAttribute(pos, i);
      ringGeometry.attributes.uv.setXY(i, v3.length() < body.radius * 2 ? 0 : 1, 1);
    }
    const ringMaterial = new THREE.MeshStandardMaterial({
      color: 0xd8c9a3,
      roughness: 0.8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75,
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI * 0.44;
    mesh.add(ring);
  }
});

/* 10. ORBIT CONTROLS -------------------------------------------------------------------- */
const controls = new OrbitControls(camera, dom.canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 9;
controls.maxDistance = 170;
controls.enablePan = false;
controls.target.set(0, 0, 0); 
// Drag-to-orbit is a desktop-mouse affordance only: on touch devices it is
// switched off entirely so a vertical swipe always scrolls the page instead
// of fighting OrbitControls for the gesture. Tapping a planet still works,
// since a tap needs no preventDefault.
if (isMobile) controls.enabled = false;
controls.update();

let userInteracting = false;
controls.addEventListener("start", () => {
  userInteracting = true;
  cameraTransition.active = false;
});

/* 12. CAMERA ANIMATION -------------------------------------------------------------------- */
const cameraTransition = {
  active: false,
  startPos: new THREE.Vector3(),
  endPos: new THREE.Vector3(),
  startTarget: new THREE.Vector3(),
  endTarget: new THREE.Vector3(),
  startTime: 0,
  duration: 1400,
};

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

const HOME_VIEW = { position: new THREE.Vector3(0, 26, 58), target: new THREE.Vector3(0, 0, 0) };
const _tmpTargetPos = new THREE.Vector3();
const _tmpOffset = new THREE.Vector3();
const _tmpDelta = new THREE.Vector3();

function focusOnBody(index) {
  const body = BODIES[index];
  body.mesh.getWorldPosition(_tmpTargetPos);

  let endPos;
  let endTarget;

  if (index === 0) {
    endPos = HOME_VIEW.position.clone();
    endTarget = HOME_VIEW.target.clone();
  } else {
    const viewDistance = Math.max(body.radius * 5, 6);
    _tmpOffset.set(1, 0.55, 1).normalize().multiplyScalar(viewDistance);
    endPos = _tmpTargetPos.clone().add(_tmpOffset);
    endTarget = _tmpTargetPos.clone();
  }

  cameraTransition.startPos.copy(camera.position);
  cameraTransition.endPos.copy(endPos);
  cameraTransition.startTarget.copy(controls.target);
  cameraTransition.endTarget.copy(endTarget);
  cameraTransition.startTime = performance.now();
  cameraTransition.active = true;

  userInteracting = false;
  currentIndex = index;
  updatePlanetCard(body, index);
  updateDots(index);
}

function updateCameraTransition() {
  if (!cameraTransition.active) return;
  const elapsed = performance.now() - cameraTransition.startTime;
  const t = Math.min(elapsed / cameraTransition.duration, 1);
  const eased = easeInOutCubic(t);

  camera.position.lerpVectors(cameraTransition.startPos, cameraTransition.endPos, eased);
  controls.target.lerpVectors(cameraTransition.startTarget, cameraTransition.endTarget, eased);

  if (t >= 1) cameraTransition.active = false;
}

// Gently keep the camera locked on the focused body as it continues to
// orbit, preserving the viewer's chosen angle/zoom, until they take control.
function followFocusedBody() {
  if (cameraTransition.active || userInteracting || currentIndex === null) return;
  const body = BODIES[currentIndex];
  if (!body || body.distance === 0) return;

  body.mesh.getWorldPosition(_tmpTargetPos);
  _tmpDelta.copy(_tmpTargetPos).sub(controls.target).multiplyScalar(0.06);
  if (_tmpDelta.lengthSq() < 0.00001) return;

  controls.target.add(_tmpDelta);
  camera.position.add(_tmpDelta);
}

/* 13. PLANET INFORMATION UI -------------------------------------------------------------------- */
let currentIndex = 0;

function updatePlanetCard(body, index) {
  dom.planetType.textContent = body.type;
  dom.planetIndex.textContent = `${index + 1} / ${BODIES.length}`;
  dom.planetName.textContent = body.name;
  dom.statDiameter.textContent = body.diameter;
  dom.statDistance.textContent = body.distanceFromSun;
  dom.statYear.textContent = body.year;
  dom.planetCuriosity.textContent = body.curiosity;
}

function buildDots() {
  dom.planetDots.innerHTML = "";
  BODIES.forEach((body, i) => {
    const dot = document.createElement("button");
    dot.className = "planet-dot" + (i === 0 ? " is-active" : "");
    dot.setAttribute("role", "tab");
    dot.setAttribute("aria-selected", i === 0 ? "true" : "false");
    dot.setAttribute("aria-label", body.name);
    dot.addEventListener("click", () => focusOnBody(i));
    dom.planetDots.appendChild(dot);
  });
}

function updateDots(index) {
  [...dom.planetDots.children].forEach((dot, i) => {
    dot.classList.toggle("is-active", i === index);
    dot.setAttribute("aria-selected", i === index ? "true" : "false");
  });
}

buildDots();
updatePlanetCard(BODIES[0], 0);

/* 11. RAYCASTING -------------------------------------------------------------------- */
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function onCanvasClick(event) {
  const rect = dom.canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(raycastTargets, false);
  if (intersects.length > 0) {
    const index = intersects[0].object.userData.bodyIndex;
    focusOnBody(index);
  }
}
dom.canvas.addEventListener("click", onCanvasClick);

/* 14. SCROLL EFFECTS -------------------------------------------------------------------- */
let ticking = false;

function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    const scrollY = window.scrollY;

    dom.header.classList.toggle("scrolled", scrollY > 40);
    document.documentElement.style.setProperty("--scroll-parallax", `${scrollY * 0.08}px`);

    // Fade the interactive solar system out of view once the hero scrolls
    // away, and hand pointer control back to the page underneath it.
    const heroHeight = heroEl.offsetHeight || window.innerHeight;
    const heroProgress = THREE.MathUtils.clamp(1 - scrollY / heroHeight, 0, 1);
    solarSystemGroup.visible = heroProgress > 0.02;
    dom.canvas.style.pointerEvents = heroProgress > 0.5 ? "auto" : "none";

    ticking = false;
  });
}
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

/* 15. INTERSECTION OBSERVER -------------------------------------------------------------------- */
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
);
document.querySelectorAll("[data-reveal]").forEach((el) => revealObserver.observe(el));

/* 16. CHATBOT API -------------------------------------------------------------------- */
const SYSTEM_PROMPT =
  "Você é uma IA assistente científica inspirada no estilo comunicativo do astrônomo e divulgador " +
  "científico Carl Sagan — mas você não é o Carl Sagan real e deve deixar isso claro se perguntado. " +
  "Sua personalidade é científica, curiosa, poética, inspiradora, didática e respeitosa. Explique " +
  "ciência de forma acessível e, quando fizer sentido, use metáforas relacionadas ao universo. " +
  "Responda sempre em português do Brasil, em no máximo 3 parágrafos curtos.";

const conversationHistory = [];
let isSending = false;

function formatTime() {
  const now = new Date();
  return now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function appendMessage(role, text, options = {}) {
  const wrapper = document.createElement("div");
  wrapper.className = `chat-message ${role}${options.isError ? " error" : ""}`;

  const bubble = document.createElement("div");
  bubble.className = "chat-bubble";
  bubble.textContent = text;
  wrapper.appendChild(bubble);

  if (!options.isTyping) {
    const time = document.createElement("span");
    time.className = "chat-time";
    time.textContent = formatTime();
    wrapper.appendChild(time);
  }

  dom.chatMessages.appendChild(wrapper);
  dom.chatMessages.scrollTop = dom.chatMessages.scrollHeight;
  return wrapper;
}

function appendTypingIndicator() {
  const wrapper = document.createElement("div");
  wrapper.className = "chat-message bot typing";
  wrapper.innerHTML =
    '<div class="chat-bubble">✦ Consultando as estrelas <span class="typing-dots"><span></span><span></span><span></span></span></div>';
  dom.chatMessages.appendChild(wrapper);
  dom.chatMessages.scrollTop = dom.chatMessages.scrollHeight;
  return wrapper;
}

function setChatBusy(busy) {
  isSending = busy;
  dom.chatSend.disabled = busy;
  dom.chatInput.disabled = busy;
}

async function askCosmos(question) {

  const response = await fetch("/api/chat", {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify({
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT
        },

        ...conversationHistory,

        {
          role: "user",
          content: question
        }
      ]
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.erro ||
      `HTTP ${response.status}`
    );
  }

  return (
    data?.answer?.trim() ||
    "O universo respondeu em silêncio."
  );
}


async function sendMessage(text) {
  const question = text.trim();
  if (!question || isSending) return;

  appendMessage("user", question);
  conversationHistory.push({ role: "user", content: question });
  if (conversationHistory.length > 12) conversationHistory.splice(0, 2);

  dom.chatInput.value = "";
  setChatBusy(true);
  const typingEl = appendTypingIndicator();

  try {
    const answer = await askCosmos(question);
    typingEl.remove();
    appendMessage("bot", answer || "O universo respondeu em silêncio. Tente reformular sua pergunta.");
    conversationHistory.push({ role: "assistant", content: answer });
  } catch (error) {
    typingEl.remove();
    appendMessage(
      "bot",
      "As estrelas parecem silenciosas neste momento. Tente novamente em alguns instantes.",
      { isError: true }
    );
  } finally {
    setChatBusy(false);
    dom.chatInput.focus();
  }
}

dom.chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  sendMessage(dom.chatInput.value);
});

dom.chatSuggestions.addEventListener("click", (event) => {
  const chip = event.target.closest(".suggestion-chip");
  if (!chip) return;
  sendMessage(chip.textContent);
});

/* 17. EVENT LISTENERS -------------------------------------------------------------------- */
dom.btnPrev.addEventListener("click", () => {
  const next = (currentIndex - 1 + BODIES.length) % BODIES.length;
  focusOnBody(next);
});
dom.btnNext.addEventListener("click", () => {
  const next = (currentIndex + 1) % BODIES.length;
  focusOnBody(next);
});

document.addEventListener("keydown", (event) => {
  if (document.activeElement === dom.chatInput) return;
  if (event.key === "ArrowLeft") dom.btnPrev.click();
  if (event.key === "ArrowRight") dom.btnNext.click();
});

dom.navToggle.addEventListener("click", () => {
  const isOpen = dom.primaryNav.classList.toggle("is-open");
  dom.navToggle.setAttribute("aria-expanded", String(isOpen));
});

dom.primaryNav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    dom.primaryNav.classList.remove("is-open");
    dom.navToggle.setAttribute("aria-expanded", "false");
  });
});

// Subtle mouse-driven parallax on the starfield.
const mouseTarget = { x: 0, y: 0 };
const mouseCurrent = { x: 0, y: 0 };
window.addEventListener("pointermove", (event) => {
  mouseTarget.x = (event.clientX / window.innerWidth - 0.5) * 2;
  mouseTarget.y = (event.clientY / window.innerHeight - 0.5) * 2;
});

/* 19. RESIZE HANDLER -------------------------------------------------------------------- */
function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}
window.addEventListener("resize", onResize);

/* 18. ANIMATION LOOP -------------------------------------------------------------------- */
function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.getElapsedTime();

  // Sun pulsation
  const pulse = 1 + Math.sin(elapsed * 1.4) * 0.03;
  BODIES[0].mesh.scale.setScalar(pulse);
  sunGlow.scale.setScalar(34 * (1 + Math.sin(elapsed * 1.4) * 0.05));

  // Orbits + self-rotation
  BODIES.forEach((body, i) => {
    if (i === 0) {
      body.mesh.rotation.y += body.rotationSpeed * delta * 10;
      return;
    }
    body.angle += body.orbitSpeed * delta * 0.15;
    body.mesh.position.set(
      Math.cos(body.angle) * body.distance,
      0,
      Math.sin(body.angle) * body.distance
    );
    body.mesh.rotation.y += body.rotationSpeed * delta * 10;
  });

  // Starfield parallax (mouse-driven), skipped for reduced-motion users
  if (!prefersReducedMotion) {
    mouseCurrent.x += (mouseTarget.x - mouseCurrent.x) * 0.03;
    mouseCurrent.y += (mouseTarget.y - mouseCurrent.y) * 0.03;
    starsGroup.rotation.y = elapsed * 0.006 + mouseCurrent.x * 0.05;
    starsGroup.rotation.x = mouseCurrent.y * 0.03;
  }

  updateCameraTransition();
  followFocusedBody();
  controls.update();
  renderer.render(scene, camera);
}
animate();

/* LOADING SCREEN -------------------------------------------------------------------- */
function runLoadingSequence() {
  const duration = 1200;
  const start = performance.now();

  function step(now) {
    const t = Math.min((now - start) / duration, 1);
    dom.loadingBarFill.style.width = `${t * 100}%`;
    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      dom.loadingScreen.classList.add("is-hidden");
    }
  }
  requestAnimationFrame(step);
}
runLoadingSequence();