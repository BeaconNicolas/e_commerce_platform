// The pricing engine. Every number the shopper sees is produced here, on the server.
// All money is kept in integer cents so that 0.1 + 0.2 style rounding bugs cannot happen.

const { findProductsByIds } = require('./catalog');

const RULES = {
  currency: 'USD',
  maxQtyPerLine: 20,
  // Buy the same product several times and each tier unlocks a bigger saving.
  tiers: [
    { min: 1, rate: 0 },
    { min: 3, rate: 0.05 },
    { min: 6, rate: 0.1 },
    { min: 10, rate: 0.15 },
  ],
  promos: { WELCOME10: { rate: 0.1 } },
  taxRate: 0.08,
  shippingFlat: 695,
  freeShippingAt: 15000,
};

const money = (cents) => `$${(Math.abs(cents) / 100).toFixed(2)}`;
const pct = (rate) => `${Math.round(rate * 100)}%`;

class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function tierFor(qty) {
  let tier = RULES.tiers[0];
  for (const t of RULES.tiers) if (qty >= t.min) tier = t;
  return tier;
}

function validate(body) {
  if (!body || typeof body !== 'object' || !Array.isArray(body.items)) {
    throw new ApiError(400, 'BAD_REQUEST', 'Body must look like { "items": [{ "id": "...", "qty": 1 }] }.');
  }
  if (body.items.length === 0) throw new ApiError(400, 'EMPTY_CART', 'There are no items to price.');
  if (body.items.length > 50) throw new ApiError(400, 'TOO_MANY_LINES', 'Too many different items.');
  const merged = new Map();
  for (const item of body.items) {
    if (!item || typeof item.id !== 'string') throw new ApiError(400, 'BAD_ITEM', 'Every item needs a product id.');
    if (!Number.isInteger(item.qty) || item.qty < 1) {
      throw new ApiError(422, 'INVALID_QUANTITY', `Quantity for "${item.id}" must be a whole number of 1 or more.`);
    }
    merged.set(item.id, (merged.get(item.id) || 0) + item.qty);
  }
  for (const [id, qty] of merged) {
    if (qty > RULES.maxQtyPerLine) {
      throw new ApiError(422, 'QUANTITY_LIMIT', `You asked for ${qty} of "${id}", but the limit is ${RULES.maxQtyPerLine} per order.`);
    }
  }
  let promo = null;
  if (body.promo != null && body.promo !== '') {
    promo = String(body.promo).trim().toUpperCase();
    if (!RULES.promos[promo]) throw new ApiError(422, 'INVALID_PROMO', `Promo code "${promo}" is not valid.`);
  }
  return { items: [...merged].map(([id, qty]) => ({ id, qty })), promo };
}

async function buildQuote(body) {
  const trace = [];
  const clock = () => Number(process.hrtime.bigint() / 1000n) / 1000;
  let mark = clock();
  const lap = (stage, detail) => {
    const now = clock();
    trace.push({ stage, detail, ms: Math.round((now - mark) * 100) / 100 });
    mark = now;
  };

  // 1. Never trust the client: check the shape of the request first.
  const { items, promo } = validate(body);
  lap('validate', `${items.length} line(s) accepted`);

  // 2. Fetch the trusted prices from the catalog.
  const found = await findProductsByIds(items.map((i) => i.id));
  for (const { id, qty } of items) {
    const product = found.get(id);
    if (!product) throw new ApiError(404, 'PRODUCT_NOT_FOUND', `No product with id "${id}".`);
    if (qty > product.stock) throw new ApiError(409, 'OUT_OF_STOCK', `Only ${product.stock} of "${product.name}" left.`);
  }
  lap('catalog', `looked up ${found.size} product(s)`);

  // 3. Do the maths.
  const steps = [];
  const lines = items.map(({ id, qty }) => {
    const p = found.get(id);
    const lineSubtotal = p.price * qty;
    const tier = tierFor(qty);
    const discount = Math.round(lineSubtotal * tier.rate);
    const lineTotal = lineSubtotal - discount;
    steps.push({ kind: 'line', label: p.name, formula: `${money(p.price)} × ${qty}`, amount: lineSubtotal });
    if (discount > 0) {
      steps.push({ kind: 'discount', label: `Multi-buy saving (${pct(tier.rate)} for ${tier.min}+)`, formula: `${money(lineSubtotal)} × ${pct(tier.rate)}`, amount: -discount });
    }
    return { id, name: p.name, image: p.image, unitPrice: p.price, qty, lineSubtotal, discountRate: tier.rate, discount, lineTotal };
  });

  const itemsTotal = lines.reduce((s, l) => s + l.lineSubtotal, 0);
  const multiBuyDiscount = lines.reduce((s, l) => s + l.discount, 0);
  let subtotal = itemsTotal - multiBuyDiscount;
  if (lines.length > 1 || multiBuyDiscount > 0) {
    steps.push({ kind: 'subtotal', label: 'Subtotal', formula: multiBuyDiscount ? `${money(itemsTotal)} − ${money(multiBuyDiscount)}` : lines.map((l) => money(l.lineSubtotal)).join(' + '), amount: subtotal });
  }

  let promoApplied = null;
  if (promo) {
    const rate = RULES.promos[promo].rate;
    const amount = Math.round(subtotal * rate);
    promoApplied = { code: promo, rate, amount };
    steps.push({ kind: 'discount', label: `Promo ${promo} (${pct(rate)})`, formula: `${money(subtotal)} × ${pct(rate)}`, amount: -amount });
    subtotal -= amount;
  }

  const shipping = subtotal >= RULES.freeShippingAt ? 0 : RULES.shippingFlat;
  steps.push({
    kind: 'shipping',
    label: 'Shipping',
    formula: shipping === 0 ? `free — order is ${money(RULES.freeShippingAt)} or more` : `flat rate — order is under ${money(RULES.freeShippingAt)}`,
    amount: shipping,
  });

  const tax = Math.round(subtotal * RULES.taxRate);
  steps.push({ kind: 'tax', label: `Tax (${pct(RULES.taxRate)})`, formula: `${money(subtotal)} × ${pct(RULES.taxRate)}`, amount: tax });

  const total = subtotal + shipping + tax;
  steps.push({ kind: 'total', label: 'Total', formula: `${money(subtotal)} + ${money(shipping)} + ${money(tax)}`, amount: total });
  lap('pricing', `${steps.length} calculation step(s)`);

  return {
    currency: RULES.currency,
    lines,
    itemsTotal,
    multiBuyDiscount,
    promo: promoApplied,
    subtotal,
    shipping,
    taxRate: RULES.taxRate,
    tax,
    total,
    steps,
    trace,
  };
}

function sendError(res, err) {
  const status = err instanceof ApiError ? err.status : 500;
  const code = err instanceof ApiError ? err.code : 'SERVER_ERROR';
  const message = err instanceof ApiError ? err.message : 'Something went wrong on the server.';
  res.status(status).json({ error: { status, code, message } });
}

function readBody(req) {
  try {
    return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    throw new ApiError(400, 'INVALID_JSON', 'The request body is not valid JSON.');
  }
}

module.exports = { RULES, ApiError, buildQuote, sendError, readBody };
