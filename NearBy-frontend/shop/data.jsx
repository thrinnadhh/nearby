// Shop Owner mock data — Kumar's Kirana perspective

const SHOP_PROFILE = {
  name: "Kumar's Kirana",
  owner: "Rajesh Kumar",
  area: "Basheerbagh, Hyderabad",
  trustScore: 98,
  rating: 4.8,
  reviews: 2145,
  hue: 28,
};

const SHOP_TODAY = {
  orders: 12,
  revenue: 1840,
  completion: 94,
  avgResponseMin: 1.2,
  pendingCount: 3,
};

// Pending/active orders
const SHOP_ORDERS_PENDING = [
  {
    id: "o1",
    orderNo: "NB-4821",
    customerFirstName: "Priya",
    customerArea: "Basheerbagh",
    total: 149,
    paid: true,
    payment: "UPI",
    receivedAgo: 42, // seconds ago
    items: [
      { q: 2, name: "Tomato",    unit: "500 g" },
      { q: 1, name: "Onion",     unit: "1 kg"  },
      { q: 3, name: "Bread",     unit: "400 g" },
      { q: 1, name: "Dettol",    unit: "250 ml"},
    ],
  },
  {
    id: "o2",
    orderNo: "NB-4822",
    customerFirstName: "Arjun",
    customerArea: "Himayath Nagar",
    total: 412,
    paid: true,
    payment: "UPI",
    receivedAgo: 118,
    items: [
      { q: 1, name: "Sona Masoori Rice", unit: "5 kg" },
      { q: 2, name: "Toor Dal",          unit: "1 kg" },
      { q: 1, name: "Sunflower Oil",     unit: "1 L"  },
    ],
  },
  {
    id: "o3",
    orderNo: "NB-4823",
    customerFirstName: "Meera",
    customerArea: "Punjagutta",
    total: 86,
    paid: false,
    payment: "Cash",
    receivedAgo: 165,
    items: [
      { q: 4, name: "Parle-G Gold",  unit: "100 g" },
      { q: 1, name: "Good Day",      unit: "100 g" },
      { q: 2, name: "Lay's Classic", unit: "52 g"  },
    ],
  },
];

const SHOP_ORDERS_ACTIVE = [
  {
    id: "a1", orderNo: "NB-4818", customerFirstName: "Vikram",
    customerArea: "Kukatpally", total: 235, status: "Preparing",
    readyInMin: 6, items: [{ q: 1, name: "Aashirvaad Atta", unit: "5 kg" }],
  },
  {
    id: "a2", orderNo: "NB-4819", customerFirstName: "Sneha",
    customerArea: "Banjara Hills", total: 178, status: "Ready",
    readyInMin: 0, items: [{ q: 2, name: "Paneer", unit: "200 g" }],
  },
];

// Products inventory
const SHOP_INVENTORY = [
  { id: "i1",  name: "Sona Masoori Rice",  unit: "5 kg",  price: 385, stock: 24, cat: "Staples",  hue: 38, avail: true  },
  { id: "i2",  name: "Toor Dal",           unit: "1 kg",  price: 165, stock: 48, cat: "Staples",  hue: 48, avail: true  },
  { id: "i3",  name: "Sunflower Oil",      unit: "1 L",   price: 148, stock: 60, cat: "Staples",  hue: 52, avail: true  },
  { id: "i4",  name: "Aashirvaad Atta",    unit: "5 kg",  price: 245, stock: 18, cat: "Staples",  hue: 30, avail: true  },
  { id: "i5",  name: "Amul Milk",          unit: "500 ml",price: 33,  stock: 3,  cat: "Dairy",    hue: 210,avail: true  },
  { id: "i6",  name: "Paneer",             unit: "200 g", price: 95,  stock: 8,  cat: "Dairy",    hue: 40, avail: true  },
  { id: "i7",  name: "Brown Bread",        unit: "400 g", price: 55,  stock: 0,  cat: "Bakery",   hue: 24, avail: false },
  { id: "i8",  name: "Eggs (brown)",       unit: "6 pc",  price: 78,  stock: 14, cat: "Dairy",    hue: 28, avail: true  },
  { id: "i9",  name: "Haldiram Bhujia",    unit: "200 g", price: 58,  stock: 21, cat: "Snacks",   hue: 18, avail: true  },
  { id: "i10", name: "Parle-G Gold",       unit: "100 g", price: 10,  stock: 90, cat: "Snacks",   hue: 42, avail: true  },
  { id: "i11", name: "Good Day Butter",    unit: "100 g", price: 35,  stock: 33, cat: "Snacks",   hue: 46, avail: true  },
  { id: "i12", name: "Lay's Classic",      unit: "52 g",  price: 20,  stock: 72, cat: "Snacks",   hue: 54, avail: true  },
];

// 7-day revenue (₹ rounded hundreds)
const SHOP_REVENUE_WEEK = [
  { day: "Mon", orders: 9,  revenue: 1240 },
  { day: "Tue", orders: 11, revenue: 1580 },
  { day: "Wed", orders: 14, revenue: 2120 },
  { day: "Thu", orders: 10, revenue: 1410 },
  { day: "Fri", orders: 16, revenue: 2560 },
  { day: "Sat", orders: 22, revenue: 3480 },
  { day: "Sun", orders: 12, revenue: 1840 },
];

// Top products (30-day)
const SHOP_TOP_PRODUCTS = [
  { name: "Parle-G Gold",      orders: 184, revenue: 1840, hue: 42 },
  { name: "Amul Milk",         orders: 146, revenue: 4818, hue: 210 },
  { name: "Toor Dal",          orders: 88,  revenue: 14520, hue: 48 },
  { name: "Sona Masoori Rice", orders: 62,  revenue: 23870, hue: 38 },
  { name: "Sunflower Oil",     orders: 54,  revenue: 7992, hue: 52 },
];

// Heatmap: 7 rows (Mon-Sun), 24 cols (hours). Values 0..10.
// Simulate peak at 9-11am and 6-8pm.
const SHOP_HEATMAP = (() => {
  const days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const rows = days.map((d, di) => {
    const row = [];
    for (let h = 0; h < 24; h++) {
      let v = 0;
      if (h >= 8  && h <= 11) v = 3 + Math.round(Math.random() * 5);
      if (h >= 17 && h <= 21) v = 4 + Math.round(Math.random() * 6);
      if (h === 19 || h === 20) v += 2;
      if (di >= 4)             v += 1; // busier weekends
      if (di === 5)            v += 1; // saturday
      if (h < 7 || h > 22)     v = Math.max(0, v - 3);
      row.push(Math.min(10, v));
    }
    return { day: d, row };
  });
  return rows;
})();

const SHOP_TRUST_BREAKDOWN = [
  { k: "Rating score",      v: 4.8,  max: 5,   pct: 96 },
  { k: "Completion rate",   v: 94,   max: 100, pct: 94, unit: "%" },
  { k: "Response score",    v: 4.7,  max: 5,   pct: 94 },
  { k: "Verified bonus",    v: "✓",  max: null, pct: 100 },
];

Object.assign(window, {
  SHOP_PROFILE, SHOP_TODAY, SHOP_ORDERS_PENDING, SHOP_ORDERS_ACTIVE,
  SHOP_INVENTORY, SHOP_REVENUE_WEEK, SHOP_TOP_PRODUCTS, SHOP_HEATMAP, SHOP_TRUST_BREAKDOWN,
});
