# Rosaline — e-commerce platform

A women's boutique storefront that also teaches how an online shop works: every time you add a
product or change a quantity, you can watch the request leave the browser, reach the API, and
come back with the calculated total.

## How it is built

| Part | Where | What it does |
| --- | --- | --- |
| Frontend | `public/` | Plain HTML, CSS and JavaScript. Renders the shop and never calculates a price itself. |
| Backend | `api/` | Three Vercel serverless functions (Node.js). |
| Catalog | `api/_lib/catalog.js` | The product "database" — the only place prices live. |
| Pricing engine | `api/_lib/pricing.js` | Validation and all of the maths, in whole cents. |

## API

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/products?category=Beauty` | Catalogue plus the public pricing rules |
| `POST` | `/api/quote` | Prices a bag: `{ "items": [{ "id": "velvet-rouge", "qty": 3 }], "promo": "WELCOME10" }` |
| `POST` | `/api/checkout` | Prices the bag again and returns a demo order confirmation |

## Pricing rules

1. Line price = unit price × quantity
2. Multi-buy saving on the same product: 3+ → 5%, 6+ → 10%, 10+ → 15%
3. Optional promo code `WELCOME10` → 10% off the subtotal
4. Shipping $6.95, free when the subtotal is $150 or more
5. Tax = 8% of the discounted subtotal
6. Total = subtotal + shipping + tax

Example: 3 × Velvet Rouge Lipstick ($24.00) → $72.00 − 5% ($3.60) = $68.40, + $6.95 shipping, + $5.47 tax = **$80.82**.

## Run locally

```bash
npx vercel dev
```

This is a demonstration store: no real orders or payments are taken.
