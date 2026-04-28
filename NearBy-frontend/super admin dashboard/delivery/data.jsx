// Delivery Partner mock data

const DP_PROFILE = {
  name: "Rakesh Yadav",
  vehicle: "Honda Activa · TS-09 AB 4521",
  rating: 4.9,
  completed: 1284,
  hue: 210,
};

const DP_TODAY = {
  earnings: 685,
  orders: 9,
  onlineHours: 4.5,
  distanceKm: 38,
  goalEarnings: 900,
};

const DP_WEEK = [
  { day: "Mon", earnings: 720 },
  { day: "Tue", earnings: 640 },
  { day: "Wed", earnings: 810 },
  { day: "Thu", earnings: 590 },
  { day: "Fri", earnings: 920 },
  { day: "Sat", earnings: 1140 },
  { day: "Sun", earnings: 685 },
];

// Incoming request to accept
const DP_INCOMING = {
  orderNo: "NB-4830",
  payout: 42,
  surge: false,
  shopName: "Kumar's Kirana",
  shopArea: "Basheerbagh",
  shopDistanceKm: 0.8,
  dropArea: "Himayath Nagar",
  dropDistanceKm: 2.1,
  totalKm: 2.9,
  itemsCount: 4,
  customerFirstName: "Arjun",
  countdownSec: 15,
};

// Phase 1: go to shop
const DP_PHASE1 = {
  orderNo: "NB-4830",
  shopName: "Kumar's Kirana",
  shopAddress: "Shop 12, Lane 4, Basheerbagh, Hyd",
  shopPhone: "+91 98••• •4521",
  etaMin: 4,
  distanceKm: 0.8,
  itemsCount: 4,
  payout: 42,
  instructions: "Order will be packed on arrival. Ring bell.",
};

// Phase 2: go to customer, OTP
const DP_PHASE2 = {
  orderNo: "NB-4830",
  customerFirstName: "Arjun",
  customerPhone: "+91 97••• •8812",
  customerAddress: "Flat 302, Greenwood Apts, Himayath Nagar",
  customerInstructions: "Gate code 2341 · Call when at gate",
  etaMin: 8,
  distanceKm: 2.1,
  payout: 42,
  items: [
    { q: 1, name: "Sona Masoori Rice", unit: "5 kg" },
    { q: 2, name: "Toor Dal",          unit: "1 kg" },
    { q: 1, name: "Sunflower Oil",     unit: "1 L"  },
  ],
  collectCash: 0,
  otp: "4821",
};

Object.assign(window, { DP_PROFILE, DP_TODAY, DP_WEEK, DP_INCOMING, DP_PHASE1, DP_PHASE2 });
