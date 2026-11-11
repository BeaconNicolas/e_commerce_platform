// POST /api/checkout
// Re-prices the cart on the server (the total sent by a browser is never trusted)
// and returns a demo order confirmation. No payment is taken.

const { randomBytes } = require('crypto');
const { ApiError, buildQuote, sendError, readBody } = require('./_lib/pricing');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method !== 'POST') throw new ApiError(405, 'METHOD_NOT_ALLOWED', 'Use POST for this endpoint.');
    const quote = await buildQuote(readBody(req));
    res.status(201).json({
      orderId: `RSL-${randomBytes(3).toString('hex').toUpperCase()}`,
      status: 'confirmed',
      demo: true,
      placedAt: new Date().toISOString(),
      itemCount: quote.lines.reduce((n, l) => n + l.qty, 0),
      total: quote.total,
      currency: quote.currency,
    });
  } catch (err) {
    sendError(res, err);
  }
};
