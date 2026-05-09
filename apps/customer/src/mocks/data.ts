/**
 * Fake data used when DEMO_MODE = true.
 * All prices are in paise (₹1 = 100 paise).
 */
import type { Shop, Product, ShopDetail, Review, Order } from '@/types';
import type { Profile, SavedAddress } from '@/types/profile';

// ─── Shops ───────────────────────────────────────────────────────────────────

export const DEMO_SHOPS: Shop[] = [
  {
    id: 'shop-1',
    name: 'Ramesh General & Kirana',
    category: 'kirana',
    address: '14, Banjara Hills Lane 3, Hyderabad',
    distance: 0.3,
    rating: 4.7,
    trust_score: 91,
    is_open: true,
    thumbnail_url: null,
    lat: 17.4126,
    lng: 78.4458,
  },
  {
    id: 'shop-2',
    name: 'Lakshmi Vegetables & Fruits',
    category: 'vegetables',
    address: '7, Jubilee Hills Market, Hyderabad',
    distance: 0.5,
    rating: 4.4,
    trust_score: 79,
    is_open: true,
    thumbnail_url: null,
    lat: 17.4317,
    lng: 78.4068,
  },
  {
    id: 'shop-3',
    name: 'Apollo Pharmacy',
    category: 'pharmacy',
    address: '22, Road No. 12, Banjara Hills, Hyderabad',
    distance: 0.8,
    rating: 4.8,
    trust_score: 95,
    is_open: true,
    thumbnail_url: null,
    lat: 17.4165,
    lng: 78.4473,
  },
  {
    id: 'shop-4',
    name: 'Spice Garden Restaurant',
    category: 'restaurant',
    address: '3, Film Nagar, Hyderabad',
    distance: 1.1,
    rating: 4.5,
    trust_score: 83,
    is_open: true,
    thumbnail_url: null,
    lat: 17.4248,
    lng: 78.4100,
  },
  {
    id: 'shop-5',
    name: 'Paws & Claws Pet Store',
    category: 'pet_store',
    address: '9, Jubilee Hills Check Post, Hyderabad',
    distance: 1.4,
    rating: 4.2,
    trust_score: 72,
    is_open: false,
    thumbnail_url: null,
    lat: 17.4326,
    lng: 78.4047,
  },
  {
    id: 'shop-6',
    name: 'TechZone Mobile Accessories',
    category: 'mobile',
    address: '55, Ameerpet Main Road, Hyderabad',
    distance: 0.6,
    rating: 4.3,
    trust_score: 77,
    is_open: true,
    thumbnail_url: null,
    lat: 17.3728,
    lng: 78.4477,
  },
];

// ─── Shop Details (for shop profile screen) ───────────────────────────────────

export const DEMO_SHOP_DETAILS: Record<string, ShopDetail> = {
  'shop-1': {
    id: 'shop-1',
    name: 'Ramesh General & Kirana',
    category: 'kirana',
    description:
      'Your neighbourhood kirana since 1987. We stock 2000+ everyday items — dal, rice, oils, spices, household goods — and deliver within 30 minutes.',
    is_open: true,
    is_verified: true,
    trust_score: 91,
    avg_rating: 4.7,
    image_url: null,
    thumbnail_url: null,
    open_time: '07:00',
    close_time: '22:00',
    address: '14, Banjara Hills Lane 3, Hyderabad',
    city: 'Hyderabad',
    review_count: 248,
  },
  'shop-2': {
    id: 'shop-2',
    name: 'Lakshmi Vegetables & Fruits',
    category: 'vegetables',
    description:
      'Fresh farm produce sourced directly from Bowenpally market every morning. Best deals on seasonal vegetables and exotic fruits.',
    is_open: true,
    is_verified: true,
    trust_score: 79,
    avg_rating: 4.4,
    image_url: null,
    thumbnail_url: null,
    open_time: '06:00',
    close_time: '20:00',
    address: '7, Jubilee Hills Market, Hyderabad',
    city: 'Hyderabad',
    review_count: 134,
  },
  'shop-3': {
    id: 'shop-3',
    name: 'Apollo Pharmacy',
    category: 'pharmacy',
    description:
      'Licensed pharmacy with qualified pharmacists. All medicines, healthcare products, and baby care. Prescription delivery available.',
    is_open: true,
    is_verified: true,
    trust_score: 95,
    avg_rating: 4.8,
    image_url: null,
    thumbnail_url: null,
    open_time: '08:00',
    close_time: '22:30',
    address: '22, Road No. 12, Banjara Hills, Hyderabad',
    city: 'Hyderabad',
    review_count: 512,
  },
  'shop-4': {
    id: 'shop-4',
    name: 'Spice Garden Restaurant',
    category: 'restaurant',
    description:
      'Authentic Hyderabadi biryani, haleem, and South Indian tiffins. Family recipes since 1995. Pure veg & non-veg options.',
    is_open: true,
    is_verified: true,
    trust_score: 83,
    avg_rating: 4.5,
    image_url: null,
    thumbnail_url: null,
    open_time: '09:00',
    close_time: '23:00',
    address: '3, Film Nagar, Hyderabad',
    city: 'Hyderabad',
    review_count: 389,
  },
  'shop-5': {
    id: 'shop-5',
    name: 'Paws & Claws Pet Store',
    category: 'pet_store',
    description:
      'Premium pet food, accessories, and grooming supplies for dogs, cats, fish, and birds. Vet consultation on weekends.',
    is_open: false,
    is_verified: false,
    trust_score: 72,
    avg_rating: 4.2,
    image_url: null,
    thumbnail_url: null,
    open_time: '10:00',
    close_time: '20:00',
    address: '9, Jubilee Hills Check Post, Hyderabad',
    city: 'Hyderabad',
    review_count: 67,
  },
  'shop-6': {
    id: 'shop-6',
    name: 'TechZone Mobile Accessories',
    category: 'mobile',
    description:
      'Original cables, chargers, cases, screen guards, and repair services for all smartphone brands. Trusted for 12 years.',
    is_open: true,
    is_verified: true,
    trust_score: 77,
    avg_rating: 4.3,
    image_url: null,
    thumbnail_url: null,
    open_time: '10:00',
    close_time: '21:00',
    address: '55, Ameerpet Main Road, Hyderabad',
    city: 'Hyderabad',
    review_count: 198,
  },
};

// ─── Products ─────────────────────────────────────────────────────────────────

export const DEMO_PRODUCTS: Record<string, (Product & { shop_name: string })[]> = {
  'shop-1': [
    { id: 'p1-1', shop_id: 'shop-1', shop_name: 'Ramesh General & Kirana', name: 'Toor Dal 1 kg', price: 14000, stock_qty: 80, image_url: null, category: 'dal', is_available: true },
    { id: 'p1-2', shop_id: 'shop-1', shop_name: 'Ramesh General & Kirana', name: 'Basmati Rice 5 kg', price: 38000, stock_qty: 30, image_url: null, category: 'rice', is_available: true },
    { id: 'p1-3', shop_id: 'shop-1', shop_name: 'Ramesh General & Kirana', name: 'Fortune Sunflower Oil 1 L', price: 14500, stock_qty: 55, image_url: null, category: 'oil', is_available: true },
    { id: 'p1-4', shop_id: 'shop-1', shop_name: 'Ramesh General & Kirana', name: 'Aashirvaad Atta 5 kg', price: 26000, stock_qty: 22, image_url: null, category: 'atta', is_available: true },
    { id: 'p1-5', shop_id: 'shop-1', shop_name: 'Ramesh General & Kirana', name: 'Amul Butter 500 g', price: 28000, stock_qty: 15, image_url: null, category: 'dairy', is_available: true },
    { id: 'p1-6', shop_id: 'shop-1', shop_name: 'Ramesh General & Kirana', name: 'Maggi Noodles (12 pack)', price: 16800, stock_qty: 40, image_url: null, category: 'noodles', is_available: true },
    { id: 'p1-7', shop_id: 'shop-1', shop_name: 'Ramesh General & Kirana', name: 'Colgate MaxFresh 200 g', price: 9500, stock_qty: 60, image_url: null, category: 'personal care', is_available: true },
    { id: 'p1-8', shop_id: 'shop-1', shop_name: 'Ramesh General & Kirana', name: 'Surf Excel 1 kg', price: 22000, stock_qty: 28, image_url: null, category: 'detergent', is_available: true },
    { id: 'p1-9', shop_id: 'shop-1', shop_name: 'Ramesh General & Kirana', name: 'MDH Garam Masala 100 g', price: 7500, stock_qty: 45, image_url: null, category: 'spices', is_available: true },
    { id: 'p1-10', shop_id: 'shop-1', shop_name: 'Ramesh General & Kirana', name: 'Parle-G Biscuits 800 g', price: 5500, stock_qty: 90, image_url: null, category: 'snacks', is_available: true },
  ],
  'shop-2': [
    { id: 'p2-1', shop_id: 'shop-2', shop_name: 'Lakshmi Vegetables & Fruits', name: 'Tomatoes 1 kg', price: 4000, stock_qty: 120, image_url: null, category: 'vegetables', is_available: true },
    { id: 'p2-2', shop_id: 'shop-2', shop_name: 'Lakshmi Vegetables & Fruits', name: 'Onions 1 kg', price: 3500, stock_qty: 150, image_url: null, category: 'vegetables', is_available: true },
    { id: 'p2-3', shop_id: 'shop-2', shop_name: 'Lakshmi Vegetables & Fruits', name: 'Potatoes 1 kg', price: 3000, stock_qty: 200, image_url: null, category: 'vegetables', is_available: true },
    { id: 'p2-4', shop_id: 'shop-2', shop_name: 'Lakshmi Vegetables & Fruits', name: 'Spinach 250 g', price: 2500, stock_qty: 60, image_url: null, category: 'leafy greens', is_available: true },
    { id: 'p2-5', shop_id: 'shop-2', shop_name: 'Lakshmi Vegetables & Fruits', name: 'Green Chillies 100 g', price: 1500, stock_qty: 80, image_url: null, category: 'vegetables', is_available: true },
    { id: 'p2-6', shop_id: 'shop-2', shop_name: 'Lakshmi Vegetables & Fruits', name: 'Alphonso Mangoes (6 pcs)', price: 24000, stock_qty: 25, image_url: null, category: 'fruits', is_available: true },
    { id: 'p2-7', shop_id: 'shop-2', shop_name: 'Lakshmi Vegetables & Fruits', name: 'Bananas 12 pcs', price: 6000, stock_qty: 70, image_url: null, category: 'fruits', is_available: true },
    { id: 'p2-8', shop_id: 'shop-2', shop_name: 'Lakshmi Vegetables & Fruits', name: 'Capsicum 250 g', price: 5500, stock_qty: 45, image_url: null, category: 'vegetables', is_available: true },
  ],
  'shop-3': [
    { id: 'p3-1', shop_id: 'shop-3', shop_name: 'Apollo Pharmacy', name: 'Dolo 650 (15 tabs)', price: 3500, stock_qty: 200, image_url: null, category: 'medicine', is_available: true },
    { id: 'p3-2', shop_id: 'shop-3', shop_name: 'Apollo Pharmacy', name: 'Digene Antacid Gel 200 ml', price: 12000, stock_qty: 40, image_url: null, category: 'medicine', is_available: true },
    { id: 'p3-3', shop_id: 'shop-3', shop_name: 'Apollo Pharmacy', name: 'Himalaya Liv 52 DS (60 tabs)', price: 16500, stock_qty: 35, image_url: null, category: 'supplements', is_available: true },
    { id: 'p3-4', shop_id: 'shop-3', shop_name: 'Apollo Pharmacy', name: 'Savlon Antiseptic Liquid 200 ml', price: 9900, stock_qty: 55, image_url: null, category: 'first aid', is_available: true },
    { id: 'p3-5', shop_id: 'shop-3', shop_name: 'Apollo Pharmacy', name: 'Vicks VapoRub 50 g', price: 11500, stock_qty: 60, image_url: null, category: 'cold & flu', is_available: true },
    { id: 'p3-6', shop_id: 'shop-3', shop_name: 'Apollo Pharmacy', name: 'Cetaphil Moisturiser 250 ml', price: 42000, stock_qty: 18, image_url: null, category: 'skincare', is_available: true },
  ],
  'shop-4': [
    { id: 'p4-1', shop_id: 'shop-4', shop_name: 'Spice Garden Restaurant', name: 'Chicken Biryani (Full)', price: 38000, stock_qty: 30, image_url: null, category: 'biryani', is_available: true },
    { id: 'p4-2', shop_id: 'shop-4', shop_name: 'Spice Garden Restaurant', name: 'Veg Dum Biryani', price: 25000, stock_qty: 30, image_url: null, category: 'biryani', is_available: true },
    { id: 'p4-3', shop_id: 'shop-4', shop_name: 'Spice Garden Restaurant', name: 'Masala Dosa', price: 9000, stock_qty: 50, image_url: null, category: 'tiffin', is_available: true },
    { id: 'p4-4', shop_id: 'shop-4', shop_name: 'Spice Garden Restaurant', name: 'Idli Sambar (4 pcs)', price: 7000, stock_qty: 50, image_url: null, category: 'tiffin', is_available: true },
    { id: 'p4-5', shop_id: 'shop-4', shop_name: 'Spice Garden Restaurant', name: 'Haleem Bowl', price: 18000, stock_qty: 20, image_url: null, category: 'special', is_available: true },
    { id: 'p4-6', shop_id: 'shop-4', shop_name: 'Spice Garden Restaurant', name: 'Gulab Jamun (2 pcs)', price: 5000, stock_qty: 40, image_url: null, category: 'desserts', is_available: true },
  ],
  'shop-5': [
    { id: 'p5-1', shop_id: 'shop-5', shop_name: 'Paws & Claws Pet Store', name: 'Royal Canin Dog Food 3 kg', price: 190000, stock_qty: 12, image_url: null, category: 'dog food', is_available: true },
    { id: 'p5-2', shop_id: 'shop-5', shop_name: 'Paws & Claws Pet Store', name: 'Whiskas Cat Food 1.2 kg', price: 62000, stock_qty: 20, image_url: null, category: 'cat food', is_available: true },
    { id: 'p5-3', shop_id: 'shop-5', shop_name: 'Paws & Claws Pet Store', name: 'Pet Collar (M size)', price: 35000, stock_qty: 15, image_url: null, category: 'accessories', is_available: true },
  ],
  'shop-6': [
    { id: 'p6-1', shop_id: 'shop-6', shop_name: 'TechZone Mobile Accessories', name: 'USB-C Fast Charger 65W', price: 129900, stock_qty: 25, image_url: null, category: 'chargers', is_available: true },
    { id: 'p6-2', shop_id: 'shop-6', shop_name: 'TechZone Mobile Accessories', name: 'Tempered Glass (Universal)', price: 14900, stock_qty: 80, image_url: null, category: 'screen guards', is_available: true },
    { id: 'p6-3', shop_id: 'shop-6', shop_name: 'TechZone Mobile Accessories', name: 'Braided Lightning Cable 1.5m', price: 59900, stock_qty: 40, image_url: null, category: 'cables', is_available: true },
    { id: 'p6-4', shop_id: 'shop-6', shop_name: 'TechZone Mobile Accessories', name: 'Bluetooth Earbuds TWS', price: 149900, stock_qty: 18, image_url: null, category: 'audio', is_available: true },
    { id: 'p6-5', shop_id: 'shop-6', shop_name: 'TechZone Mobile Accessories', name: 'Phone Stand Adjustable', price: 29900, stock_qty: 35, image_url: null, category: 'accessories', is_available: true },
  ],
};

// ─── Reviews ──────────────────────────────────────────────────────────────────

export const DEMO_REVIEWS: Record<string, Review[]> = {
  'shop-1': [
    { id: 'r1-1', customer_name: 'Priya Reddy', rating: 5, comment: 'Super fast delivery! Got my groceries in 20 mins. Fresh stock too.', created_at: '2026-04-28T10:22:00Z', order_id: null },
    { id: 'r1-2', customer_name: 'Sanjay M.', rating: 5, comment: 'Ramesh bhai always keeps quality stock. Been ordering for 2 years. Highly recommend!', created_at: '2026-04-22T18:15:00Z', order_id: null },
    { id: 'r1-3', customer_name: 'Anita K.', rating: 4, comment: 'Good variety of products. Prices are fair. Delivery was a bit slow once but overall great.', created_at: '2026-04-15T12:30:00Z', order_id: null },
    { id: 'r1-4', customer_name: 'Rahul T.', rating: 5, comment: 'Best kirana near our area. Always has what I need and the packaging is neat.', created_at: '2026-04-10T09:45:00Z', order_id: null },
  ],
  'shop-2': [
    { id: 'r2-1', customer_name: 'Meena V.', rating: 5, comment: 'Freshest vegetables in Jubilee Hills. The mangoes are amazing this season!', created_at: '2026-05-01T08:30:00Z', order_id: null },
    { id: 'r2-2', customer_name: 'Kishore G.', rating: 4, comment: 'Good quality and reasonable prices. Could improve on delivery timing.', created_at: '2026-04-25T14:10:00Z', order_id: null },
    { id: 'r2-3', customer_name: 'Deepa S.', rating: 4, comment: 'Very fresh produce, got spinach and tomatoes and they were perfect.', created_at: '2026-04-18T17:00:00Z', order_id: null },
  ],
  'shop-3': [
    { id: 'r3-1', customer_name: 'Dr. Padma R.', rating: 5, comment: 'Genuine medicines, pharmacist actually explained dosage. Rare these days!', created_at: '2026-04-30T11:00:00Z', order_id: null },
    { id: 'r3-2', customer_name: 'Vijay K.', rating: 5, comment: 'Available 24x7, delivered my prescription in under 30 mins. Lifesaver!', created_at: '2026-04-27T03:15:00Z', order_id: null },
  ],
  'shop-4': [
    { id: 'r4-1', customer_name: 'Faiz M.', rating: 5, comment: 'Best biryani in the area. The haleem is absolutely divine. Must try!', created_at: '2026-05-02T20:45:00Z', order_id: null },
    { id: 'r4-2', customer_name: 'Lakshmi D.', rating: 4, comment: 'Masala dosa was crispy and fresh. Good quality tiffin service.', created_at: '2026-04-28T09:20:00Z', order_id: null },
    { id: 'r4-3', customer_name: 'Arun P.', rating: 5, comment: 'Ordered for family gathering — everyone loved the biryani. Portions are generous!', created_at: '2026-04-20T13:00:00Z', order_id: null },
  ],
  'shop-5': [],
  'shop-6': [
    { id: 'r6-1', customer_name: 'Harish T.', rating: 4, comment: 'Got a charger and cable — both original branded. Fair price.', created_at: '2026-04-29T16:30:00Z', order_id: null },
    { id: 'r6-2', customer_name: 'Sneha B.', rating: 5, comment: 'Screen guard fitted perfectly and they applied it in-shop for free!', created_at: '2026-04-21T12:00:00Z', order_id: null },
  ],
};

// ─── Orders ───────────────────────────────────────────────────────────────────

export const DEMO_ORDERS: Order[] = [
  {
    id: 'ord-1',
    shop_id: 'shop-3',
    shop_name: 'Apollo Pharmacy',
    status: 'out_for_delivery',
    total_paise: 19400,
    payment_method: 'upi',
    created_at: new Date(Date.now() - 25 * 60000).toISOString(),
    items: [
      { product_id: 'p3-1', name: 'Dolo 650 (15 tabs)', price: 3500, qty: 2 },
      { product_id: 'p3-5', name: 'Vicks VapoRub 50 g', price: 11500, qty: 1 },
      { product_id: 'p3-4', name: 'Savlon Antiseptic Liquid 200 ml', price: 900, qty: 1 },
    ],
    delivery_address: '12 MG Road, Banjara Hills, Hyderabad - 500034',
    delivery_partner: { id: 'dp-1', name: 'Suresh Kumar', phone: '+919876543211', rating: 4.6 },
    delivery_eta_seconds: 420,
  },
  {
    id: 'ord-2',
    shop_id: 'shop-1',
    shop_name: 'Ramesh General & Kirana',
    status: 'delivered',
    total_paise: 52300,
    payment_method: 'upi',
    created_at: new Date(Date.now() - 2 * 24 * 3600000).toISOString(),
    items: [
      { product_id: 'p1-1', name: 'Toor Dal 1 kg', price: 14000, qty: 1 },
      { product_id: 'p1-4', name: 'Aashirvaad Atta 5 kg', price: 26000, qty: 1 },
      { product_id: 'p1-9', name: 'MDH Garam Masala 100 g', price: 7500, qty: 1 },
      { product_id: 'p1-7', name: 'Colgate MaxFresh 200 g', price: 4800, qty: 1 },
    ],
    delivery_address: '12 MG Road, Banjara Hills, Hyderabad - 500034',
    delivery_partner: null,
  },
  {
    id: 'ord-3',
    shop_id: 'shop-4',
    shop_name: 'Spice Garden Restaurant',
    status: 'delivered',
    total_paise: 73000,
    payment_method: 'cod',
    created_at: new Date(Date.now() - 5 * 24 * 3600000).toISOString(),
    items: [
      { product_id: 'p4-1', name: 'Chicken Biryani (Full)', price: 38000, qty: 1 },
      { product_id: 'p4-3', name: 'Masala Dosa', price: 9000, qty: 1 },
      { product_id: 'p4-6', name: 'Gulab Jamun (2 pcs)', price: 5000, qty: 2 },
    ],
    delivery_address: '12 MG Road, Banjara Hills, Hyderabad - 500034',
    delivery_partner: null,
  },
];

// ─── Profile ──────────────────────────────────────────────────────────────────

export const DEMO_PROFILE: Profile = {
  id: 'demo-user-1',
  phone: '+919876543210',
  role: 'customer',
  name: 'Arjun Sharma',
  avatar_url: null,
  created_at: '2025-08-12T10:00:00Z',
  total_orders: 34,
  avg_rating: null,
};

export const DEMO_SAVED_ADDRESSES: SavedAddress[] = [
  {
    id: 'addr-1',
    label: 'Home',
    address_line_1: '12, MG Road, Banjara Hills',
    address_line_2: 'Near HDFC Bank',
    city: 'Hyderabad',
    postal_code: '500034',
    phone: '+919876543210',
    lat: 17.4126,
    lng: 78.4458,
    is_default: true,
    created_at: '2025-08-12T10:00:00Z',
  },
  {
    id: 'addr-2',
    label: 'Office',
    address_line_1: '44, Cyber Towers, Hi-Tech City',
    city: 'Hyderabad',
    postal_code: '500081',
    phone: '+919876543210',
    lat: 17.4435,
    lng: 78.3772,
    is_default: false,
    created_at: '2025-09-01T10:00:00Z',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Filter demo shops by category. */
export function filterDemoShops(category: string | null): Shop[] {
  if (!category) return DEMO_SHOPS;
  return DEMO_SHOPS.filter((s) => s.category === category);
}

/** Search demo products across all shops by query string. */
export function searchDemoProducts(
  query: string
): (Product & { shop_name: string })[] {
  const q = query.toLowerCase();
  const all = Object.values(DEMO_PRODUCTS).flat();
  return all.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.shop_name.toLowerCase().includes(q)
  );
}
