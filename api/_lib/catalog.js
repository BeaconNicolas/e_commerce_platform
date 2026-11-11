// The "database". In a real shop this would be Postgres, MongoDB, etc.
// It lives only on the server, so the browser can never change a price.

const img = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=80`;

const PRODUCTS = [
  { id: 'ines-satchel', name: 'The Ines Satchel', category: 'Bags', price: 18900, stock: 24, photo: 'photo-1605733513597-a8f8341084e6', blurb: 'Structured dove-grey leather with brushed gold buckles.' },
  { id: 'blush-top-handle', name: 'Blush Mini Top-Handle', category: 'Bags', price: 12900, stock: 30, photo: 'photo-1681747685985-a401c271156c', blurb: 'A petite evening bag in soft rose pebbled leather.' },
  { id: 'cognac-tote', name: 'Cognac Leather Tote', category: 'Bags', price: 21000, stock: 22, photo: 'photo-1624687943971-e86af76d57de', blurb: 'Full-grain leather that deepens in colour with every year.' },
  { id: 'perle-pouch', name: 'Perle Pleated Pouch', category: 'Bags', price: 11800, stock: 34, photo: 'photo-1761646238176-b480909e6ba6', blurb: 'A sculpted cream pouch with a gilded top handle.' },
  { id: 'cranberry-knit', name: 'Cranberry Knit Jumper', category: 'Clothing', price: 8900, stock: 60, photo: 'photo-1608984361471-ff566593088f', blurb: 'Chunky merino blend in a rich winter red.' },
  { id: 'camel-trench', name: 'Classic Camel Trench', category: 'Clothing', price: 24500, stock: 18, photo: 'photo-1651491646869-3f18f4d30be0', blurb: 'Double-breasted, belted and cut to the knee.' },
  { id: 'linen-shift', name: 'Sand Linen Shift Dress', category: 'Clothing', price: 11200, stock: 45, photo: 'photo-1747396206869-75ea57b325ce', blurb: 'Breathable washed linen with an easy, unlined shape.' },
  { id: 'scarlet-slip-dress', name: 'Scarlet Slip Dress', category: 'Clothing', price: 14800, stock: 40, photo: 'photo-1651047666890-8eab731ee345', blurb: 'Bias-cut satin that moves like water.' },
  { id: 'dove-blazer', name: 'Tailored Dove Blazer', category: 'Clothing', price: 16500, stock: 28, photo: 'photo-1608234808654-2a8875faa7fd', blurb: 'Sharp shoulders, relaxed waist, fully lined.' },
  { id: 'velvet-rouge', name: 'Velvet Rouge Lipstick', category: 'Beauty', price: 2400, stock: 200, photo: 'photo-1626895872564-b691b6877b83', blurb: 'One-swipe matte colour that stays comfortable all day.' },
  { id: 'midnight-serum', name: 'Midnight Renewal Serum', category: 'Beauty', price: 5800, stock: 120, photo: 'photo-1620916297397-a4a5402a3c6c', blurb: 'Overnight repair with squalane and niacinamide.' },
  { id: 'noir-or-parfum', name: 'Ambre & Or Eau de Parfum', category: 'Beauty', price: 9600, stock: 60, photo: 'photo-1733660227163-01bc46e0d7d7', blurb: 'Warm amber, orange blossom and a whisper of vanilla.' },
  { id: 'gel-lacquer', name: 'Gel Shine Nail Lacquer', category: 'Beauty', price: 1400, stock: 300, photo: 'photo-1763987300719-fd27c51a3227', blurb: 'High-gloss colour that lasts ten days without a lamp.' },
  { id: 'sunset-quad', name: 'Sunset Blush Quad', category: 'Beauty', price: 3600, stock: 140, photo: 'photo-1625093525885-282384697917', blurb: 'Four buildable shades from soft peach to deep berry.' },
  { id: 'cloud-cream', name: 'Cloud Cream Moisturiser', category: 'Beauty', price: 4200, stock: 160, photo: 'photo-1763503834047-ac85c4105c0b', blurb: 'A whipped, fragrance-free cream for day and night.' },
  { id: 'baroque-pearls', name: 'Baroque Pearl Earrings', category: 'Jewellery', price: 6400, stock: 70, photo: 'photo-1763628212781-7d52844cf358', blurb: 'Freshwater pearls set in warm gold, each one unique.' },
  { id: 'curb-bracelet', name: 'Curb Chain Bracelet', category: 'Jewellery', price: 8200, stock: 65, photo: 'photo-1602173574767-37ac01994b2a', blurb: 'A bold polished chain with a secure toggle clasp.' },
  { id: 'oval-pendant', name: 'Oval Pendant Necklace', category: 'Jewellery', price: 7400, stock: 75, photo: 'photo-1783541507490-edb026e2a961', blurb: '18k gold vermeil on a fine cable chain.' },
  { id: 'solitaire-ring', name: 'Solitaire Gold Ring', category: 'Jewellery', price: 11200, stock: 50, photo: 'photo-1617038260897-41a1f14a8ca0', blurb: 'A single brilliant stone on a polished band.' },
  { id: 'fleur-pumps', name: 'Fleur Almond-Toe Pumps', category: 'Shoes', price: 13500, stock: 36, photo: 'photo-1543163521-1bf539c55dd2', blurb: 'Hand-finished floral jacquard on a 9cm heel.' },
  { id: 'nude-booties', name: 'Nude Peep-Toe Booties', category: 'Shoes', price: 14200, stock: 30, photo: 'photo-1621996659490-3275b4d0d951', blurb: 'Soft blush leather on a slim stiletto heel.' },
  { id: 'onyx-boots', name: 'Onyx Ankle Boots', category: 'Shoes', price: 16800, stock: 32, photo: 'photo-1605732440685-d0654d81aa30', blurb: 'Polished black leather with a side zip and block heel.' },
  { id: 'mesh-watch', name: 'Mesh Strap Watch', category: 'Accessories', price: 13500, stock: 40, photo: 'photo-1506193095-80bc749473f2', blurb: 'A slim round dial on a fine stainless mesh band.' },
  { id: 'straw-hat', name: 'Riviera Straw Hat', category: 'Accessories', price: 4800, stock: 80, photo: 'photo-1728920585150-4a56461e7eec', blurb: 'Hand-woven raffia with a wide, sun-shading brim.' },
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
