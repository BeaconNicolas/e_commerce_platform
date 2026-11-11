// The "database". In a real shop this would be Postgres, MongoDB, etc.
// It lives only on the server, so the browser can never change a price.

const img = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=80`;

const PRODUCTS = [
  { id: 'ines-satchel', name: 'The Ines Satchel', category: 'Bags', price: 18900, stock: 24, photo: 'photo-1605733513597-a8f8341084e6', blurb: 'Structured dove-grey leather with brushed gold buckles.' },
  { id: 'blush-top-handle', name: 'Blush Mini Top-Handle', category: 'Bags', price: 12900, stock: 30, photo: 'photo-1681747685985-a401c271156c', blurb: 'A petite evening bag in soft rose pebbled leather.' },
  { id: 'scarlet-slip-dress', name: 'Scarlet Slip Dress', category: 'Clothing', price: 14800, stock: 40, photo: 'photo-1651047666890-8eab731ee345', blurb: 'Bias-cut satin that moves like water.' },
  { id: 'dove-blazer', name: 'Tailored Dove Blazer', category: 'Clothing', price: 16500, stock: 28, photo: 'photo-1608234808654-2a8875faa7fd', blurb: 'Sharp shoulders, relaxed waist, fully lined.' },
  { id: 'velvet-rouge', name: 'Velvet Rouge Lipstick', category: 'Beauty', price: 2400, stock: 200, photo: 'photo-1626895872564-b691b6877b83', blurb: 'One-swipe matte colour that stays comfortable all day.' },
  { id: 'midnight-serum', name: 'Midnight Renewal Serum', category: 'Beauty', price: 5800, stock: 120, photo: 'photo-1620916297397-a4a5402a3c6c', blurb: 'Overnight repair with squalane and niacinamide.' },
  { id: 'noir-or-parfum', name: 'Noir & Or Eau de Parfum', category: 'Beauty', price: 9600, stock: 60, photo: 'photo-1594035910387-fea47794261f', blurb: 'Amber, black orchid and a whisper of vanilla.' },
  { id: 'oval-pendant', name: 'Oval Pendant Necklace', category: 'Jewellery', price: 7400, stock: 75, photo: 'photo-1783541507490-edb026e2a961', blurb: '18k gold vermeil on a fine cable chain.' },
  { id: 'solitaire-ring', name: 'Solitaire Gold Ring', category: 'Jewellery', price: 11200, stock: 50, photo: 'photo-1617038260897-41a1f14a8ca0', blurb: 'A single brilliant stone on a polished band.' },
  { id: 'fleur-pumps', name: 'Fleur Almond-Toe Pumps', category: 'Shoes', price: 13500, stock: 36, photo: 'photo-1543163521-1bf539c55dd2', blurb: 'Hand-finished floral jacquard on a 9cm heel.' },
  { id: 'riviera-sunglasses', name: 'Riviera Sunglasses', category: 'Accessories', price: 6900, stock: 90, photo: 'photo-1508296695146-257a814070b4', blurb: 'Lightweight acetate frames with UV400 lenses.' },
  { id: 'ivory-silk-scarf', name: 'Ivory Silk Scarf', category: 'Accessories', price: 4500, stock: 110, photo: 'photo-1606259458027-54d2a728b6ab', blurb: 'Pure mulberry silk with hand-rolled edges.' },
].map((p) => ({ ...p, image: img(p.photo) }));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Async on purpose: it behaves like a real database query (with a small simulated delay).
async function listProducts(category) {
  await sleep(40);
  return category && category !== 'All' ? PRODUCTS.filter((p) => p.category === category) : PRODUCTS;
}

async function findProductsByIds(ids) {
  await sleep(40);
  const map = new Map();
  for (const p of PRODUCTS) if (ids.includes(p.id)) map.set(p.id, p);
  return map;
}

module.exports = { listProducts, findProductsByIds };
