// GET /api/products            -> every product + the public pricing rules
// GET /api/products?category=X -> only that category

const { listProducts } = require('./_lib/catalog');
const { RULES, ApiError, sendError } = require('./_lib/pricing');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method !== 'GET') throw new ApiError(405, 'METHOD_NOT_ALLOWED', 'Use GET for this endpoint.');
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const products = await listProducts(category);
    res.status(200).json({
      count: products.length,
      products: products.map(({ photo, ...p }) => p),
      rules: {
        currency: RULES.currency,
        tiers: RULES.tiers,
        taxRate: RULES.taxRate,
        shippingFlat: RULES.shippingFlat,
        freeShippingAt: RULES.freeShippingAt,
        maxQtyPerLine: RULES.maxQtyPerLine,
      },
    });
  } catch (err) {
    sendError(res, err);
  }
};
