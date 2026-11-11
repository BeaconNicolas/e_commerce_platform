// POST /api/quote
// Body:    { "items": [{ "id": "velvet-rouge", "qty": 3 }], "promo": "WELCOME10" }
// Returns: every line, discount, shipping, tax and the total — plus the steps used to get there.
// The browser sends only ids and quantities. Prices always come from the server.

const { ApiError, buildQuote, sendError, readBody } = require('./_lib/pricing');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method !== 'POST') throw new ApiError(405, 'METHOD_NOT_ALLOWED', 'Use POST for this endpoint.');
    const quote = await buildQuote(readBody(req));
    res.status(200).json(quote);
  } catch (err) {
    sendError(res, err);
  }
};
