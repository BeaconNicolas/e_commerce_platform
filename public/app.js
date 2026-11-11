/* Rosaline storefront.
   The browser never calculates a price. It sends product ids and quantities
   to the API and renders whatever the server answers. */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const money = (cents) => (cents < 0 ? '−' : '') + '$' + (Math.abs(cents) / 100).toFixed(2);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const CATEGORIES = ['All', 'Bags', 'Clothing', 'Beauty', 'Jewellery', 'Shoes', 'Accessories'];

const state = {
  products: [], // full catalogue, from GET /api/products
  rules: null,
  category: 'All',
  cart: loadCart(), // [{ id, qty }]
  promo: '',
  quote: null, // last answer from POST /api/quote
  cartError: '',
  showMath: false,
  calls: [],
};

function loadCart() {
  try { return JSON.parse(localStorage.getItem('rosaline-cart')) || []; } catch { return []; }
}
function saveCart() {
  try { localStorage.setItem('rosaline-cart', JSON.stringify(state.cart)); } catch { /* private mode */ }
}

/* ---------- API client: every backend call goes through here ---------- */

async function api(method, path, body) {
  const started = performance.now();
  $('#consoleDot').className = 'dot busy';
  let status = 0, data = null;
  try {
    const res = await fetch(path, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    status = res.status;
    data = await res.json().catch(() => null);
  } catch {
    data = { error: { code: 'NETWORK', message: 'Could not reach the server.' } };
  }
  const ms = Math.round(performance.now() - started);
  const ok = status >= 200 && status < 300;
  logCall({ method, path, status, ms, ok, request: body || null, response: data });
  if (!ok) {
    const err = new Error(data?.error?.message || 'The request failed.');
    Object.assign(err, { status, data, ms });
    throw err;
  }
  return { data, status, ms };
}

function highlight(value) {
  const json = esc(JSON.stringify(value, null, 2));
  return json.replace(/(&quot;(?:\\.|(?!&quot;).)*&quot;)(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?)/g, (m, str, colon, bool, num) => {
    if (str) return colon ? `<span class="j-key">${str}</span>${colon}` : `<span class="j-str">${str}</span>`;
    if (bool) return `<span class="j-bool">${bool}</span>`;
    return `<span class="j-num">${num}</span>`;
  });
}

function logCall(call) {
  state.calls.unshift(call);
  state.calls = state.calls.slice(0, 30);
  $('#consoleDot').className = 'dot ' + (call.ok ? 'ok' : 'bad');
  $('#consoleCount').textContent = state.calls.length;
  $('#consoleList').innerHTML = state.calls.map((c) => `
    <li><details class="call">
      <summary><span class="m">${c.method}</span><span class="p">${esc(c.path)}</span><span class="s ${c.ok ? 'ok' : 'bad'}">${c.status || 'ERR'}</span><span class="t">${c.ms} ms</span></summary>
      ${c.request ? `<p class="cap">Request body</p><pre>${highlight(c.request)}</pre>` : ''}
      <p class="cap">Response</p><pre>${highlight(trim(c.response))}</pre>
    </details></li>`).join('');
}

// Keep long product lists readable in the console.
function trim(data) {
  if (data && Array.isArray(data.products) && data.products.length > 2) {
    return { ...data, products: [...data.products.slice(0, 2), `… ${data.products.length - 2} more`] };
  }
  return data;
}

/* ---------- Shop ---------- */

function renderChips() {
  $('#chips').innerHTML = CATEGORIES.map((c) => `<button class="chip ${c === state.category ? 'active' : ''}" data-cat="${c}">${c}</button>`).join('');
}

async function loadProducts(category = 'All') {
  state.category = category;
  renderChips();
  const grid = $('#grid');
  grid.innerHTML = Array.from({ length: 4 }, () => '<div class="skeleton"></div>').join('');
  const path = category === 'All' ? '/api/products' : `/api/products?category=${encodeURIComponent(category)}`;
  $('#fetchNote').innerHTML = `<b>GET</b> ${path} …`;
  try {
    const { data, ms } = await api('GET', path);
    if (category === 'All') state.products = data.products;
    state.rules = data.rules;
    $('#fetchNote').innerHTML = `<b>GET</b> ${path} → 200 OK · ${data.count} products · ${ms} ms`;
    grid.innerHTML = data.products.map((p, i) => `
      <article class="card" style="animation-delay:${i * 45}ms">
        <div class="card-img"><img src="${p.image}" alt="${esc(p.name)}" loading="lazy"><span class="card-tag">${p.category}</span></div>
        <div class="card-body">
          <h3>${esc(p.name)}</h3>
          <p>${esc(p.blurb)}</p>
          <div class="card-row"><span class="price">${money(p.price)}</span><button class="add" data-add="${p.id}">Add to bag</button></div>
        </div>
      </article>`).join('');
  } catch (err) {
    $('#fetchNote').innerHTML = `<b>GET</b> ${path} → failed`;
    grid.innerHTML = `<p>${esc(err.message)}</p>`;
  }
}

/* ---------- Bag ---------- */

const product = (id) => state.products.find((p) => p.id === id);
const maxQty = () => state.rules?.maxQtyPerLine || 20;

function setQty(id, qty) {
  const line = state.cart.find((l) => l.id === id);
  if (qty <= 0) state.cart = state.cart.filter((l) => l.id !== id);
  else if (line) line.qty = Math.min(qty, maxQty());
  else state.cart.push({ id, qty: Math.min(qty, maxQty()) });
  saveCart();
  renderCount();
  renderDrawer(true);
  requestQuote();
}

function renderCount() {
  const n = state.cart.reduce((s, l) => s + l.qty, 0);
  const el = $('#bagCount');
  el.textContent = n;
  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');
}

let quoteTimer, quoteRun = 0;
function requestQuote() {
  clearTimeout(quoteTimer);
  if (!state.cart.length) { state.quote = null; state.cartError = ''; renderDrawer(); return; }
  quoteTimer = setTimeout(async () => {
    const run = ++quoteRun;
    const body = { items: state.cart.map(({ id, qty }) => ({ id, qty })) };
    if (state.promo) body.promo = state.promo;
    try {
      const { data, ms } = await api('POST', '/api/quote', body);
      if (run !== quoteRun) return;
      state.quote = { ...data, ms };
      state.cartError = '';
    } catch (err) {
      if (run !== quoteRun) return;
      state.cartError = err.message;
      if (err.data?.error?.code === 'INVALID_PROMO') { state.promo = ''; requestQuote(); }
    }
    renderDrawer();
  }, 220);
}

function renderDrawer(loading = false) {
  const body = $('#drawerBody'), foot = $('#drawerFoot');
  if (!state.cart.length) {
    body.innerHTML = '<div class="empty"><b>Your bag is empty</b>Add a piece and watch the server price it.</div>';
    foot.innerHTML = '';
    return;
  }
  const q = state.quote;
  body.innerHTML = state.cart.map((l) => {
    const p = product(l.id);
    if (!p) return '';
    const ql = q?.lines.find((x) => x.id === l.id && x.qty === l.qty);
    const math = ql
      ? `${money(ql.unitPrice)} × ${ql.qty} = ${money(ql.lineSubtotal)}${ql.discount ? ` <span class="save">− ${Math.round(ql.discountRate * 100)}% multi-buy</span>` : ''}`
      : `${money(p.price)} × ${l.qty} = asking server…`;
    return `
      <div class="line">
        <img src="${p.image}" alt="">
        <div>
          <h4>${esc(p.name)}</h4>
          <p class="line-math">${math}</p>
          <div class="stepper"><button data-dec="${l.id}" aria-label="One fewer">−</button><span>${l.qty}</span><button data-inc="${l.id}" aria-label="One more">+</button></div>
        </div>
        <div class="line-end">
          <b>${ql ? `${ql.discount ? `<s>${money(ql.lineSubtotal)}</s>` : ''}${money(ql.lineTotal)}` : '…'}</b>
          <button class="remove" data-remove="${l.id}">Remove</button>
        </div>
      </div>`;
  }).join('');

  foot.classList.toggle('loading', loading);
  if (!q) { foot.innerHTML = `${state.cartError ? `<p class="err-msg">${esc(state.cartError)}</p>` : '<p class="server-note"><span class="dot busy"></span>Asking the server for prices…</p>'}`; return; }
  foot.innerHTML = `
    ${state.cartError ? `<p class="err-msg">${esc(state.cartError)}</p>` : ''}
    <form class="promo" id="promoForm"><input id="promoInput" placeholder="Promo code — try WELCOME10" value="${esc(state.promo)}" autocomplete="off"><button>Apply</button></form>
    <div class="sums">
      <div class="sum"><span>Items</span><span>${money(q.itemsTotal)}</span></div>
      ${q.multiBuyDiscount ? `<div class="sum save"><span>Multi-buy saving</span><span>${money(-q.multiBuyDiscount)}</span></div>` : ''}
      ${q.promo ? `<div class="sum save"><span>Promo ${esc(q.promo.code)}</span><span>${money(-q.promo.amount)}</span></div>` : ''}
      <div class="sum"><span>Shipping</span><span>${q.shipping ? money(q.shipping) : 'Free'}</span></div>
      <div class="sum"><span>Tax (${Math.round(q.taxRate * 100)}%)</span><span>${money(q.tax)}</span></div>
      <div class="sum grand"><span>Total</span><span>${money(q.total)}</span></div>
    </div>
    <button class="math-toggle" id="mathToggle">${state.showMath ? 'Hide' : 'Show'} the server's working</button>
    ${state.showMath ? `<div class="math">${q.steps.map((s) => `<div><span>${esc(s.label)}: ${esc(s.formula)}</span><span>${money(s.amount)}</span></div>`).join('')}</div>` : ''}
    <button class="btn btn-rose" id="checkoutBtn">Place demo order · ${money(q.total)}</button>
    <p class="server-note"><span class="dot ok"></span>Priced by POST /api/quote in ${q.ms} ms</p>`;
}

function openDrawer(open = true) {
  $('#drawer').classList.toggle('open', open);
  $('#scrim').classList.toggle('open', open);
}

async function checkout() {
  const btn = $('#checkoutBtn');
  btn.disabled = true;
  btn.textContent = 'Confirming with server…';
  const body = { items: state.cart.map(({ id, qty }) => ({ id, qty })) };
  if (state.promo) body.promo = state.promo;
  try {
    const { data } = await api('POST', '/api/checkout', body);
    state.cart = []; state.quote = null; state.promo = '';
    saveCart(); renderCount(); renderDrawer(); openDrawer(false);
    $('#modalCard').innerHTML = `
      <div class="tick">✓</div>
      <h3>Order confirmed</h3>
      <p>Order <code>${esc(data.orderId)}</code> · ${data.itemCount} item${data.itemCount === 1 ? '' : 's'} · <b>${money(data.total)}</b></p>
      <p>The server priced your bag again before confirming. This is a demo, so nothing was charged.</p>
      <button class="btn btn-dark" id="modalClose">Keep browsing</button>`;
    $('#modal').classList.add('open');
  } catch (err) {
    state.cartError = err.message;
    renderDrawer();
  }
}

/* ---------- The lab: one product, bought many times ---------- */

const lab = { id: 'velvet-rouge', qty: 1, promo: false, tab: 'req', request: null, response: null };
let labTimer, labRun = 0;

const NARRATION = {
  browser: 'The <b>browser</b> builds a request with just the product id and quantity. Notice there is no price in it.',
  api: 'The request travels to <code>POST /api/quote</code>. The <b>API route</b> checks that the body is well-formed and the quantity is allowed.',
  catalog: 'The server fetches the real unit price from the <b>catalog</b>. This is the only place prices live.',
  pricing: 'The <b>pricing engine</b> multiplies unit price × quantity, then applies the multi-buy tier, shipping and tax.',
};

function renderLabControls() {
  const p = product(lab.id);
  if (!p) return;
  $('#labProduct').innerHTML = `<img src="${p.image}" alt=""><div><b>${esc(p.name)}</b><span>${money(p.price)} each</span></div>`;
  $('#labPicks').innerHTML = state.products.map((x) => `<button class="pick ${x.id === lab.id ? 'active' : ''}" data-pick="${x.id}" title="${esc(x.name)}"><img src="${x.image.replace('w=900', 'w=120')}" alt="${esc(x.name)}"></button>`).join('');
  $('#labQty').textContent = lab.qty;
  const tiers = state.rules.tiers;
  $('#tiers').innerHTML = tiers.map((t, i) => {
    const next = tiers[i + 1];
    const active = lab.qty >= t.min && (!next || lab.qty < next.min);
    return `<div class="tier ${active ? 'active' : ''}"><b>${t.rate ? `${Math.round(t.rate * 100)}% off` : 'Full price'}</b>${next ? `${t.min}–${next.min - 1}` : `${t.min}+`} pcs</div>`;
  }).join('');
}

function renderLabCode() {
  $$('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === lab.tab));
  const el = $('#labCode');
  if (lab.tab === 'req') {
    el.innerHTML = lab.request ? `<span class="j-dim">POST /api/quote\nContent-Type: application/json\n\n</span>${highlight(lab.request)}` : '';
  } else {
    el.innerHTML = lab.response ? highlight(lab.response) : '<span class="j-dim">Waiting for the server…</span>';
  }
}

function setNode(name, cls) {
  const order = ['browser', 'api', 'catalog', 'pricing'];
  $$('.node').forEach((n) => {
    const i = order.indexOf(n.dataset.node), at = order.indexOf(name);
    n.classList.remove('active', 'done', 'error');
    if (at < 0) return;
    if (i < at) n.classList.add('done');
    if (i === at) n.classList.add(cls);
  });
}
function pulseWire(i, dir) {
  const w = $(`[data-wire="${i}"]`);
  w.classList.remove('fwd', 'back');
  void w.offsetWidth;
  w.classList.add(dir);
}

function scheduleLab(qtyOverride) {
  clearTimeout(labTimer);
  labTimer = setTimeout(() => runLab(qtyOverride), 180);
}

async function runLab(qtyOverride) {
  const run = ++labRun;
  const stale = () => run !== labRun;
  const body = { items: [{ id: lab.id, qty: qtyOverride || lab.qty }] };
  if (lab.promo) body.promo = 'WELCOME10';
  lab.request = body; lab.response = null; lab.tab = 'req';
  renderLabCode();
  const pill = $('#labStatus');
  pill.className = 'status-pill'; pill.textContent = 'sending…';
  $('#labSteps').innerHTML = ''; $('#labFoot').textContent = '';

  // The real request starts now; the animation walks through what it is doing.
  const pending = api('POST', '/api/quote', body).then((r) => ({ ok: true, ...r }), (err) => ({ ok: false, err }));

  setNode('browser', 'active'); $('#narration').innerHTML = NARRATION.browser;
  await wait(650); if (stale()) return;
  pulseWire(0, 'fwd'); await wait(420); if (stale()) return;
  setNode('api', 'active'); $('#narration').innerHTML = NARRATION.api;
  const result = await pending; if (stale()) return;
  await wait(650); if (stale()) return;

  if (!result.ok) {
    const { err } = result;
    setNode('api', 'error');
    lab.response = err.data; lab.tab = 'res'; renderLabCode();
    pill.className = 'status-pill bad'; pill.textContent = `${err.status || 'ERR'} · ${err.ms} ms`;
    $('#narration').innerHTML = `The API route <b>rejected</b> the request with status <code>${err.status}</code> before touching the catalog. Bad input never reaches the maths.`;
    $('#labSteps').innerHTML = `<li class="step err">${esc(err.message)}</li>`;
    return;
  }

  pulseWire(1, 'fwd'); await wait(420); if (stale()) return;
  setNode('catalog', 'active'); $('#narration').innerHTML = NARRATION.catalog;
  await wait(800); if (stale()) return;
  pulseWire(2, 'fwd'); await wait(420); if (stale()) return;
  setNode('pricing', 'active'); $('#narration').innerHTML = NARRATION.pricing;
  await wait(800); if (stale()) return;
  [2, 1, 0].forEach((i, n) => setTimeout(() => !stale() && pulseWire(i, 'back'), n * 220));
  await wait(700); if (stale()) return;

  const { data, status, ms } = result;
  $$('.node').forEach((n) => { n.classList.remove('active'); n.classList.add('done'); });
  lab.response = data; lab.tab = 'res'; renderLabCode();
  pill.className = 'status-pill ok'; pill.textContent = `${status} OK · ${ms} ms`;
  const line = data.lines[0];
  $('#narration').innerHTML = `The JSON response is back in <b>${ms} ms</b>. The browser simply displays it: ${line.qty} × ${money(line.unitPrice)} comes to <b>${money(data.total)}</b> all in.`;
  $('#labSteps').innerHTML = data.steps.map((s, i) => `
    <li class="step ${s.kind}" style="animation-delay:${i * 160}ms">
      <span class="step-label">${esc(s.label)}</span>
      <span class="step-amount">${s.kind === 'shipping' && s.amount === 0 ? 'Free' : money(s.amount)}</span>
      <span class="step-formula">${esc(s.formula)}</span>
    </li>`).join('');
  const serverMs = data.trace.reduce((s, t) => s + t.ms, 0).toFixed(1);
  $('#labFoot').textContent = `server work ${serverMs} ms (${data.trace.map((t) => `${t.stage} ${t.ms}`).join(' · ')}) · round trip ${ms} ms`;
}

/* ---------- "Run it" buttons in the API section ---------- */

async function tryEndpoint(name) {
  $('#console').classList.add('open');
  const sample = { items: [{ id: 'velvet-rouge', qty: 3 }, { id: 'ivory-silk-scarf', qty: 1 }] };
  try {
    if (name === 'products') await api('GET', '/api/products?category=Beauty');
    if (name === 'quote') await api('POST', '/api/quote', sample);
    if (name === 'checkout') await api('POST', '/api/checkout', sample);
  } catch { /* shown in the console */ }
  const first = $('#consoleList details');
  if (first) first.open = true;
}

/* ---------- Wiring ---------- */

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

document.addEventListener('click', (e) => {
  const t = e.target.closest('button, a');
  if (!t) return;
  const d = t.dataset;
  const qtyOf = (id) => state.cart.find((l) => l.id === id)?.qty || 0;
  if (d.cat) loadProducts(d.cat);
  else if (d.add) {
    if (qtyOf(d.add) >= maxQty()) return toast(`Limit of ${maxQty()} per piece`);
    setQty(d.add, qtyOf(d.add) + 1); openDrawer();
  }
  else if (d.inc) { if (qtyOf(d.inc) >= maxQty()) toast(`Limit of ${maxQty()} per piece`); else setQty(d.inc, qtyOf(d.inc) + 1); }
  else if (d.dec) setQty(d.dec, qtyOf(d.dec) - 1);
  else if (d.remove) setQty(d.remove, 0);
  else if (d.pick) { lab.id = d.pick; renderLabControls(); scheduleLab(); }
  else if (d.tab) { lab.tab = d.tab; renderLabCode(); }
  else if (d.try) tryEndpoint(d.try);
  else if (t.id === 'bagBtn') openDrawer();
  else if (t.id === 'drawerClose') openDrawer(false);
  else if (t.id === 'mathToggle') { state.showMath = !state.showMath; renderDrawer(); }
  else if (t.id === 'checkoutBtn') checkout();
  else if (t.id === 'modalClose') $('#modal').classList.remove('open');
  else if (t.id === 'consoleToggle') $('#console').classList.toggle('open');
  else if (t.id === 'labPlus') { lab.qty = Math.min(lab.qty + 1, maxQty()); renderLabControls(); scheduleLab(); }
  else if (t.id === 'labMinus') { lab.qty = Math.max(lab.qty - 1, 1); renderLabControls(); scheduleLab(); }
  else if (t.id === 'labBreak') scheduleLab(999);
});
$('#scrim').addEventListener('click', () => openDrawer(false));
$('#labPromo').addEventListener('change', (e) => { lab.promo = e.target.checked; scheduleLab(); });
document.addEventListener('submit', (e) => {
  if (e.target.id !== 'promoForm') return;
  e.preventDefault();
  state.promo = $('#promoInput').value.trim().toUpperCase();
  renderDrawer(true);
  requestQuote();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { openDrawer(false); $('#modal').classList.remove('open'); }
});

(async function start() {
  renderChips();
  await loadProducts('All');
  if (!state.products.length) return;
  state.cart = state.cart.filter((l) => product(l.id));
  renderCount();
  renderDrawer();
  requestQuote();
  renderLabControls();
  // Play the lab the first time it scrolls into view.
  const seen = new IntersectionObserver((entries) => {
    if (entries.some((x) => x.isIntersecting)) { seen.disconnect(); lab.qty = 3; renderLabControls(); runLab(); }
  }, { threshold: 0.25 });
  seen.observe($('#pipeline'));
})();
