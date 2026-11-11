// Request Flow 3D
// Every button sends a real request to the Rosaline store API (through the /api rewrite
// in vercel.json). The 3D scene then acts out what that request did, using the real response.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const C = { bg: 0x0b0612, pink: 0xff6b9d, cyan: 0x5ee6ff, green: 0x5dffb0, gold: 0xffc857, red: 0xff4d5e, violet: 0x9d7bff };
const css = (hex) => '#' + hex.toString(16).padStart(6, '0');
const $ = (s) => document.querySelector(s);
const V = (x, y, z) => new THREE.Vector3(x, y, z);

/* ------------------------------------------------------------------ renderer */

const stage = $('#stage');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true });
} catch {
  stage.innerHTML = '<div class="fallback">This animation needs WebGL, which is not available in this browser.</div>';
  throw new Error('WebGL unavailable');
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
stage.appendChild(renderer.domElement);

const labels = new CSS2DRenderer();
labels.setSize(innerWidth, innerHeight);
labels.domElement.className = 'labels';
document.body.appendChild(labels.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(C.bg);
scene.fog = new THREE.FogExp2(C.bg, 0.016);

const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 300);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 2.2, 1);
controls.enableDamping = true;
controls.autoRotate = false;
controls.maxPolarAngle = Math.PI * 0.49;
controls.minDistance = 10;
controls.maxDistance = 60;
const base = new THREE.Vector3();
let userMoved = false;
function frameCamera() {
  const narrow = innerWidth / innerHeight < 1;
  base.set(narrow ? 2 : 0.5, narrow ? 14 : 8, narrow ? 34 : 20); camera.position.copy(controls.target).add(base);
}
frameCamera();

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.75, 0.6, 0.2);
composer.addPass(bloom);
composer.addPass(new OutputPass());

addEventListener('resize', () => {
  if (!userMoved) frameCamera();
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
  labels.setSize(innerWidth, innerHeight);
});

/* ------------------------------------------------------------------ world */

scene.add(new THREE.AmbientLight(0xcbb8ff, 2.2));
const sun = new THREE.DirectionalLight(0xffffff, 3.2);
sun.position.set(6, 14, 10);
scene.add(sun);

const grid = new THREE.GridHelper(120, 120, 0x7a45ad, 0x2c1b4a);
grid.position.y = -0.01;
scene.add(grid);

{
  const n = 900, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const r = 70 + Math.random() * 50, a = Math.random() * Math.PI * 2, b = Math.random() * Math.PI * 0.5;
    pos.set([r * Math.cos(a) * Math.cos(b), r * Math.sin(b) + 2, r * Math.sin(a) * Math.cos(b)], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xd9c8ff, size: 0.35, fog: false })));
}

const metal = (color, emissive = 0x000000, k = 1) => new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: k, metalness: 0.5, roughness: 0.35 });
const glow = (color) => new THREE.MeshBasicMaterial({ color });

function label(title, sub, y) {
  const el = document.createElement('div');
  el.className = 'node-label';
  el.innerHTML = `${title}<small>${sub}</small>`;
  const o = new CSS2DObject(el);
  o.position.set(0, y, 0);
  return o;
}

function station(name, title, sub, pos, color, labelY) {
  const group = new THREE.Group();
  group.position.copy(pos);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.6, 0.4, 6), metal(0x2d1d44));
  base.position.y = 0.2;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.35, 0.045, 8, 6), glow(color));
  ring.rotation.x = Math.PI / 2;
  ring.rotation.z = Math.PI / 6;
  ring.position.y = 0.42;
  const lamp = new THREE.PointLight(color, 14, 9);
  lamp.position.y = 2.5;
  const body = new THREE.Group();
  group.add(base, ring, lamp, body, label(title, sub, labelY));
  scene.add(group);
  return { name, group, body, ring, lamp, color, baseLamp: 14 };
}

// Browser: a laptop whose screen is a live canvas.
const browser = station('browser', 'Browser', 'the storefront', V(-9.5, 0, 2), C.cyan, 4.3);
browser.group.rotation.y = 0.55;
const screenCanvas = document.createElement('canvas');
screenCanvas.width = 512; screenCanvas.height = 320;
const screenTex = new THREE.CanvasTexture(screenCanvas);
screenTex.colorSpace = THREE.SRGBColorSpace;
{
  const deck = new THREE.Mesh(new THREE.BoxGeometry(3, 0.12, 2), metal(0x4a3566));
  deck.position.y = 0.5;
  const lid = new THREE.Group();
  lid.position.set(0, 0.56, -1);
  lid.rotation.x = -0.22;
  const shell = new THREE.Mesh(new THREE.BoxGeometry(3, 1.95, 0.08), metal(0x4a3566));
  shell.position.y = 0.98;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 1.75), new THREE.MeshBasicMaterial({ map: screenTex }));
  face.position.set(0, 0.98, 0.045);
  lid.add(shell, face);
  browser.body.add(deck, lid);
}
function drawScreen(title, lines = [], accent = '#ff6b9d') {
  const g = screenCanvas.getContext('2d');
  g.fillStyle = '#150c1f'; g.fillRect(0, 0, 512, 320);
  g.fillStyle = '#24152f'; g.fillRect(0, 0, 512, 44);
  ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(24 + i * 22, 22, 7, 0, 7); g.fill(); });
  g.fillStyle = '#6d5a7d'; g.font = '16px monospace'; g.fillText('rosaline.shop', 110, 28);
  g.fillStyle = accent; g.font = 'bold 38px Georgia, serif'; g.fillText(title, 28, 110);
  g.fillStyle = '#e9dff0'; g.font = '24px sans-serif';
  lines.forEach((l, i) => g.fillText(l, 28, 160 + i * 38));
  screenTex.needsUpdate = true;
}
drawScreen('Rosaline', ['Ready when you are.']);

// API server: a rack with blinking lights and a scanner ring.
const server = station('server', 'API route', 'serverless function', V(0, 0, 0), C.violet, 4.6);
const leds = [];
for (let i = 0; i < 4; i++) {
  const slab = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.5, 2.3), metal(0x4b3a7a, C.violet, 0.25));
  slab.position.y = 0.75 + i * 0.62;
  server.body.add(slab);
  for (let j = 0; j < 4; j++) {
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.04), glow(j % 2 ? C.cyan : C.green));
    led.position.set(-0.8 + j * 0.28, slab.position.y, 1.17);
    server.body.add(led);
    leds.push(led);
  }
}
const scanner = new THREE.Mesh(new THREE.TorusGeometry(1.85, 0.05, 8, 48), glow(C.cyan));
scanner.rotation.x = Math.PI / 2;
scanner.visible = false;
server.body.add(scanner);

// Database: stacked discs.
const db = station('db', 'Catalog', 'trusted prices', V(8, 0, -4.5), C.gold, 4.2);
const discs = new THREE.Group();
for (let i = 0; i < 3; i++) {
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 0.55, 40), metal(0x6b4d1c, C.gold, 0.35));
  disc.position.y = 0.85 + i * 0.75;
  const band = new THREE.Mesh(new THREE.TorusGeometry(1.27, 0.035, 8, 48), glow(C.gold));
  band.rotation.x = Math.PI / 2;
  band.position.y = disc.position.y + 0.3;
  discs.add(disc, band);
}
db.body.add(discs);

// Pricing engine: a spinning crystal.
const pricing = station('pricing', 'Pricing engine', 'does the maths', V(6, 0, 5.5), C.pink, 4.4);
const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.75, 0), metal(0x5a1f38, C.pink, 1.4));
const cage = new THREE.Mesh(new THREE.IcosahedronGeometry(1.3, 1), new THREE.MeshBasicMaterial({ color: C.pink, wireframe: true, transparent: true, opacity: 0.5 }));
core.position.y = cage.position.y = 2.2;
pricing.body.add(core, cage);

const anchor = {
  browser: V(-8.9, 2.7, 1.6),
  server: V(0, 3.5, 0),
  db: V(8, 3.3, -4.5),
  pricing: V(6, 2.2, 5.5),
};
const wires = {
  net: new THREE.QuadraticBezierCurve3(anchor.browser, V(-4.6, 8, 1), anchor.server),
  db: new THREE.QuadraticBezierCurve3(anchor.server, V(4.2, 6.6, -1.8), anchor.db),
  pricing: new THREE.QuadraticBezierCurve3(anchor.server, V(3.6, 6, 3), anchor.pricing),
};
const wireColor = { net: C.cyan, db: C.gold, pricing: C.pink };
const motes = [];
for (const [key, curve] of Object.entries(wires)) {
  scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 80, 0.03, 6), new THREE.MeshBasicMaterial({ color: wireColor[key], transparent: true, opacity: 0.28 })));
  for (let i = 0; i < 7; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), new THREE.MeshBasicMaterial({ color: wireColor[key], transparent: true, opacity: 0.7 }));
    scene.add(m);
    motes.push({ m, curve, offset: i / 7 });
  }
}

// The "internet" gate the request flies through.
const gate = new THREE.Group();
gate.position.copy(wires.net.getPoint(0.5));
gate.lookAt(gate.position.clone().add(wires.net.getTangent(0.5)));
const gateRing = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.06, 10, 60), glow(C.cyan));
const gateRing2 = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.02, 8, 60), new THREE.MeshBasicMaterial({ color: C.cyan, transparent: true, opacity: 0.5 }));
gate.add(gateRing, gateRing2, label('HTTPS', 'the internet', 2.1));
scene.add(gate);

/* ------------------------------------------------------------------ animation helpers */

let speed = 1;
const tweens = [];
const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
function tween(ms, update) {
  return new Promise((resolve) => tweens.push({ start: performance.now(), ms: ms / speed, update, resolve }));
}
const wait = (ms) => tween(ms, () => {});

function travel(curve, { color, text, reverse = false, ms = 1500, size = 0.26 }) {
  const head = new THREE.Group();
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(size), glow(color));
  const light = new THREE.PointLight(color, 26, 8);
  head.add(gem, light);
  if (text) {
    const el = document.createElement('div');
    el.className = 'pkt';
    el.style.color = css(color);
    el.textContent = text;
    head.add(new CSS2DObject(el));
  }
  const tail = Array.from({ length: 12 }, (_, i) => {
    const s = new THREE.Mesh(new THREE.SphereGeometry(size * 0.6 * (1 - i / 13), 8, 8), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6 * (1 - i / 12) }));
    scene.add(s);
    return s;
  });
  scene.add(head);
  return tween(ms, (k) => {
    const e = ease(k), u = reverse ? 1 - e : e;
    curve.getPoint(u, head.position);
    gem.rotation.x += 0.12; gem.rotation.y += 0.17;
    tail.forEach((s, i) => curve.getPoint(THREE.MathUtils.clamp(u + (reverse ? 1 : -1) * (i + 1) * 0.014, 0, 1), s.position));
    if (k === 1) {
      scene.remove(head, ...tail);
      head.traverse((o) => o.isCSS2DObject && o.element.remove());
    }
  });
}

// A swarm of small packets (used for lists of products).
function swarm(curve, color, count, reverse) {
  const jobs = [];
  for (let i = 0; i < count; i++) jobs.push(wait(i * 90).then(() => travel(curve, { color, reverse, ms: 1100, size: 0.13 })));
  return Promise.all(jobs);
}

function pulse(st, color = st.color) {
  st.ring.material.color.setHex(color);
  st.lamp.color.setHex(color);
  return tween(520, (k) => {
    const s = 1 + Math.sin(k * Math.PI) * 0.14;
    st.body.scale.setScalar(s);
    st.ring.scale.setScalar(1 + Math.sin(k * Math.PI) * 0.12);
    st.lamp.intensity = st.baseLamp + Math.sin(k * Math.PI) * 60;
    if (k === 1 && color !== st.color) { st.ring.material.color.setHex(st.color); st.lamp.color.setHex(st.color); }
  });
}

function scan(color = C.cyan) {
  scanner.material.color.setHex(color);
  scanner.visible = true;
  return tween(900, (k) => {
    scanner.position.y = 0.5 + Math.sin(k * Math.PI) * 2.5;
    if (k === 1) scanner.visible = false;
  });
}

function floatText(at, text, color) {
  const el = document.createElement('div');
  el.className = 'float';
  el.style.color = css(color);
  el.textContent = text;
  const o = new CSS2DObject(el);
  o.position.copy(at);
  scene.add(o);
  tween(2400, (k) => {
    o.position.y = at.y + 0.6 + k * 3.2;
    el.style.opacity = k < 0.75 ? 1 : 1 - (k - 0.75) * 4;
    if (k === 1) { scene.remove(o); el.remove(); }
  });
}

let spin = { db: 0, pricing: 0 };
function spinUp(key, ms) {
  return tween(ms, (k) => { spin[key] = Math.sin(k * Math.PI) * 0.35; if (k === 1) spin[key] = 0; });
}

/* ------------------------------------------------------------------ HUD */

const money = (c) => (c < 0 ? '−' : '') + '$' + (Math.abs(c) / 100).toFixed(2);
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
function pretty(value) {
  if (value == null) return '<span class="dim">(none)</span>';
  return esc(JSON.stringify(value, null, 2)).replace(/("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?)/g, (m, str, colon, bool, num) => {
    if (str) return colon ? `<span class="k">${str}</span>${colon}` : `<span class="s">${str}</span>`;
    if (bool) return `<span class="b">${bool}</span>`;
    return `<span class="n">${num}</span>`;
  });
}
function trim(data) {
  if (data && Array.isArray(data.products)) return { ...data, products: [...data.products.slice(0, 2).map(({ id, name, price }) => ({ id, name, price })), `… ${data.products.length - 2} more`] };
  if (data && Array.isArray(data.lines)) { const { trace, ...rest } = data; return { ...rest, lines: data.lines.map(({ image, ...l }) => l) }; }
  return data;
}

function showRequest(method, path, body) {
  $('#verb').textContent = method;
  $('#verb').className = method === 'POST' ? 'post' : '';
  $('#path').textContent = path;
  $('#status').textContent = 'sending…'; $('#status').className = 'st';
  $('#reqBody').innerHTML = pretty(body);
  $('#resBody').innerHTML = '<span class="dim">waiting…</span>';
}
function showResponse(r) {
  $('#status').textContent = `${r.status || 'ERR'} · ${r.ms} ms`;
  $('#status').className = 'st ' + (r.ok ? 'ok' : 'bad');
  $('#resBody').innerHTML = pretty(trim(r.data));
}

let stepNames = [];
function setSteps(names) {
  stepNames = names;
  $('#steps').innerHTML = names.map((n, i) => `<li><i>${i + 1}</i>${n}</li>`).join('');
}
function step(i, caption, state = 'now') {
  [...$('#steps').children].forEach((li, j) => { li.className = j < i ? (li.classList.contains('skip') ? 'skip' : 'done') : j === i ? state : ''; });
  $('#caption').innerHTML = caption;
}
function finish(caption, skipFrom = -1) {
  [...$('#steps').children].forEach((li, j) => { if (skipFrom >= 0 && j >= skipFrom && j < stepNames.length - 2) li.className = 'skip'; else if (!li.classList.contains('fail')) li.className = 'done'; });
  $('#caption').innerHTML = caption;
}

async function call(method, path, body) {
  const t0 = performance.now();
  try {
    const res = await fetch(path, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, data, ms: Math.round(performance.now() - t0) };
  } catch {
    return { ok: false, status: 0, data: { error: { message: 'Could not reach the API.' } }, ms: Math.round(performance.now() - t0) };
  }
}

/* ------------------------------------------------------------------ the stories */

let qty = 3;
const PRODUCT = 'velvet-rouge';

async function outbound(method, path, body, text, color) {
  showRequest(method, path, body);
  const pending = call(method, path, body);
  await pulse(browser);
  step(1, 'The request leaves the browser and crosses the internet, encrypted with <b>HTTPS</b>.');
  await travel(wires.net, { color, text });
  return pending;
}

async function reject(r, at) {
  await Promise.all([scan(C.red), pulse(server, C.red)]);
  floatText(anchor.server, `✕ ${r.status || 'ERR'}`, C.red);
  step(at, `The API route <b>rejected</b> it: <code>${esc(r.data?.error?.message || 'error')}</code>`, 'fail');
  await wait(900);
  showResponse(r);
  step(stepNames.length - 2, 'An error response goes back. The catalog and pricing engine were never touched.');
  await travel(wires.net, { color: C.red, text: `${r.status || 'ERR'} ${r.data?.error?.code || ''}`, reverse: true });
  drawScreen('Oops', ['The server said no:', `${r.status} ${r.data?.error?.code || ''}`], '#ff4d5e');
  await pulse(browser, C.red);
  finish('The browser shows the error. <b>Bad input never reaches the maths</b>, which is why validation lives on the server.', at + 1);
}

async function runProducts() {
  setSteps(['Browser asks for products', 'Travels over HTTPS', 'API route receives it', 'Reads the catalog', 'JSON travels back', 'Browser draws the shop']);
  step(0, 'The browser sends <code>GET /api/products</code>. A GET only <b>asks</b> for data, so it carries no body.');
  drawScreen('Rosaline', ['Loading products…']);
  const pending = outbound('GET', '/api/products', null, 'GET /api/products', C.green);
  const r = await pending;
  step(2, 'The <b>API route</b> (a serverless function) wakes up and reads the request.');
  if (!r.ok) return reject(r, 2);
  await Promise.all([scan(), pulse(server)]);
  step(3, 'It asks the <b>catalog</b> for every product. This is the only place prices live.');
  await travel(wires.db, { color: C.gold, text: 'find all products', size: 0.18 });
  await Promise.all([spinUp('db', 1300), pulse(db), swarm(wires.db, C.gold, 10, true)]);
  showResponse(r);
  step(4, `The server packs <b>${r.data.count} products</b> into JSON and sends <code>200 OK</code> back.`);
  await Promise.all([travel(wires.net, { color: C.green, text: `200 OK · ${r.data.count} products`, reverse: true }), swarm(wires.net, C.green, 9, true)]);
  drawScreen('Rosaline', [`${r.data.count} products loaded`, `in ${r.ms} ms`], '#5dffb0');
  await pulse(browser, C.green);
  finish(`Done in <b>${r.ms} ms</b>. The browser turns the JSON into product cards.`);
}

async function runQuote({ checkout = false, bad = false } = {}) {
  const n = bad ? 999 : qty;
  const path = checkout ? '/api/checkout' : '/api/quote';
  const body = { items: [{ id: PRODUCT, qty: n }] };
  setSteps(['Browser sends id + quantity', 'Travels over HTTPS', 'API route validates', 'Looks up the real price', 'Pricing engine calculates', 'JSON travels back', checkout ? 'Browser confirms the order' : 'Browser shows the total']);
  step(0, `The browser sends <code>POST ${path}</code> with a body: product id and quantity <b>${n}</b>. A POST <b>delivers</b> data. Notice it sends no price.`);
  drawScreen('Your bag', [`Lipstick × ${n}`, 'Asking the server…']);
  const r = await outbound('POST', path, body, `POST ${path} · qty ${n}`, C.pink);
  step(2, 'The <b>API route</b> checks the body: is it valid JSON, is the quantity a sensible whole number?');
  if (!r.ok) return reject(r, 2);
  await Promise.all([scan(), pulse(server)]);
  floatText(anchor.server, '✓ valid', C.green);

  // The checkout endpoint returns only a confirmation, so fetch the matching quote to show its working.
  const quote = checkout ? (await call('POST', '/api/quote', body)).data : r.data;
  const line = quote?.lines?.[0];
  step(3, 'The server fetches the <b>trusted unit price</b> from the catalog, ignoring anything a browser might claim.');
  await travel(wires.db, { color: C.gold, text: `price of ${PRODUCT}?`, size: 0.18 });
  await Promise.all([spinUp('db', 900), pulse(db)]);
  await travel(wires.db, { color: C.gold, text: line ? `${money(line.unitPrice)} each` : 'price', reverse: true, size: 0.18 });

  step(4, `The <b>pricing engine</b> multiplies unit price × quantity, then applies multi-buy savings, shipping and tax.`);
  await travel(wires.pricing, { color: C.pink, text: line ? `${n} × ${money(line.unitPrice)}` : 'calculate', size: 0.2 });
  const spinning = spinUp('pricing', 600 + (quote?.steps?.length || 3) * 520);
  for (const s of quote?.steps || []) {
    const color = s.kind === 'discount' ? C.green : s.kind === 'total' ? C.gold : C.pink;
    floatText(anchor.pricing, s.kind === 'line' ? `${s.formula} = ${money(s.amount)}` : `${s.label}: ${s.amount === 0 ? 'free' : money(s.amount)}`, color);
    await wait(520);
  }
  await Promise.all([spinning, pulse(pricing)]);
  await travel(wires.pricing, { color: C.pink, text: quote ? `total ${money(quote.total)}` : 'total', reverse: true, size: 0.2 });

  showResponse(r);
  const total = money(r.data.total);
  step(5, checkout ? `The server answers <code>201 Created</code> with order <b>${esc(r.data.orderId)}</b>.` : `The server answers <code>200 OK</code> with every line of the calculation.`);
  await travel(wires.net, { color: C.green, text: checkout ? `201 Created · ${r.data.orderId}` : `200 OK · ${total}`, reverse: true });
  drawScreen(checkout ? 'Order confirmed' : 'Your bag', checkout ? [r.data.orderId, `Total ${total}`, '(demo — nothing charged)'] : [`Lipstick × ${n}`, `Total ${total}`], '#5dffb0');
  await pulse(browser, C.green);
  finish(checkout
    ? `Checkout <b>re-priced the bag on the server</b> before confirming, so the total (${total}) cannot be tampered with.`
    : `<b>${n} × ${money(line.unitPrice)}</b> came to <b>${total}</b> in ${r.ms} ms. Change the quantity and send it again.`);
}

const stories = {
  products: runProducts,
  quote: () => runQuote(),
  checkout: () => runQuote({ checkout: true }),
  bad: () => runQuote({ bad: true }),
};

let busy = false, touring = false;
async function play(name) {
  if (busy) return;
  busy = true;
  $('#controls').classList.add('busy');
  document.querySelectorAll('.run').forEach((b) => b.classList.toggle('active', b.dataset.run === name));
  try { await stories[name](); } catch (err) { console.error(err); $('#caption').textContent = 'Something went wrong while animating this request.'; }
  busy = false;
  $('#controls').classList.remove('busy');
  if (touring) { await wait(2200); if (touring) nextTour(); }
}
const order = ['products', 'quote', 'checkout', 'bad'];
let tourAt = 0;
function nextTour() { play(order[tourAt++ % order.length]); }

document.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.run) { touring = false; $('#tour').classList.remove('on'); $('#tour').textContent = '▶ Auto tour'; play(b.dataset.run); }
  else if (b.id === 'plus' || b.id === 'minus') { qty = THREE.MathUtils.clamp(qty + (b.id === 'plus' ? 1 : -1), 1, 20); $('#qty').textContent = qty; }
  else if (b.id === 'tour') {
    touring = !touring;
    b.classList.toggle('on', touring);
    b.textContent = touring ? '■ Stop tour' : '▶ Auto tour';
    if (touring && !busy) nextTour();
  }
});
renderer.domElement.addEventListener('pointerdown', () => { userMoved = true; });
renderer.domElement.addEventListener('wheel', () => { userMoved = true; }, { passive: true });

/* ------------------------------------------------------------------ loop */

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const t = clock.getElapsedTime(), now = performance.now();
  for (let i = tweens.length - 1; i >= 0; i--) {
    const tw = tweens[i], k = Math.min((now - tw.start) / tw.ms, 1);
    tw.update(k);
    if (k === 1) { tweens.splice(i, 1); tw.resolve(); }
  }
  motes.forEach(({ m, curve, offset }) => curve.getPoint((offset + t * 0.05) % 1, m.position));
  leds.forEach((l, i) => { l.visible = Math.sin(t * (2 + (i % 5)) + i) > -0.3; });
  discs.rotation.y += 0.004 + spin.db;
  core.rotation.x += 0.008 + spin.pricing; core.rotation.y += 0.012 + spin.pricing;
  cage.rotation.y -= 0.004 + spin.pricing * 0.6; cage.rotation.z += 0.002;
  core.position.y = cage.position.y = 2.2 + Math.sin(t * 1.4) * 0.12;
  gateRing.rotation.z = t * 0.6; gateRing2.rotation.z = -t * 0.9;
  gateRing2.scale.setScalar(1 + Math.sin(t * 2) * 0.05);
  if (!userMoved) { const a = Math.sin(t * 0.22) * 0.32; camera.position.set(controls.target.x + base.x * Math.cos(a) + base.z * Math.sin(a), controls.target.y + base.y + Math.sin(t * 0.3) * 0.5, controls.target.z + base.z * Math.cos(a) - base.x * Math.sin(a)); }
  controls.update();
  composer.render();
  labels.render(scene, camera);
});

// Start with one request so the scene is alive on arrival.
setTimeout(() => play('products'), 900);
