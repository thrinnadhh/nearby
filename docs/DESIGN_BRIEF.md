# NearBy Design Brief

> Wireframe and UX specifications for mobile apps and web dashboard.
> All designs follow NearBy's trust-first, community-centric philosophy.

---

## Design Principles

1. **Trust First** — Show verification status, ratings, trust scores prominently
2. **Local Pride** — Celebrate local shops, highlight shop owner information
3. **Transparency** — Clear pricing, no hidden fees, real-time tracking
4. **Speed + Safety** — Fast checkout, but with safety nets (cancellation, disputes)
5. **Accessibility** — Large touch targets, clear typography, high contrast

---

## Color Palette

| Color | Hex | Usage |
|-------|-----|-------|
| Primary | #10B981 | Buttons, CTAs, verified badges |
| Secondary | #F59E0B | Warnings, price highlights, trust score |
| Success | #059669 | Order delivered, payment successful |
| Error | #DC2626 | Cancel, error states |
| Neutral | #6B7280 | Secondary text, dividers |
| Background | #FFFFFF | Main background |
| Surface | #F3F4F6 | Cards, sections |

---

## Typography

| Style | Font | Size | Weight | Usage |
|-------|------|------|--------|-------|
| Heading 1 | Inter | 28px | Bold | Page titles |
| Heading 2 | Inter | 24px | Bold | Section headers |
| Heading 3 | Inter | 18px | Semi | Subheaders |
| Body | Inter | 16px | Regular | Body text |
| Caption | Inter | 14px | Regular | Metadata, timestamps |
| Button | Inter | 16px | Semi | CTA buttons |

---

## Customer App

### Screen 1: Splash / Onboarding

**Purpose:** First-time user welcome + permission requests

```
┌─────────────────────────────┐
│                             │
│     🏪 nearby               │
│     Local. Trusted. Real.   │
│                             │
│   [Continue with Phone]     │
│                             │
└─────────────────────────────┘

## Permissions (sequential screens)
┌─────────────────────────────┐
│ Allow location access?      │
│                             │
│ We use your location to     │
│ find nearby shops.          │
│                             │
│ [Allow]  [Not now]          │
└─────────────────────────────┘

┌─────────────────────────────┐
│ Allow notifications?        │
│                             │
│ Get order updates & offers. │
│                             │
│ [Allow]  [Not now]          │
└─────────────────────────────┘
```

### Screen 2: Phone Login (OTP)

**Purpose:** Authenticate user via SMS OTP

```
┌─────────────────────────────┐
│ ← Log in                    │
│                             │
│ Phone Number                │
│ ┌───────────────────────┐   │
│ │ +91 |_______________|  │
│ └───────────────────────┘   │
│                             │
│ [Send OTP]                  │
│                             │
│ Or continue as guest →      │
└─────────────────────────────┘

## OTP Verification
┌─────────────────────────────┐
│ Verify OTP                  │
│                             │
│ Enter 6-digit code sent to  │
│ +91 9876543210              │
│                             │
│ ┌─┐ ┌─┐ ┌─┐ ┌─┐ ┌─┐ ┌─┐   │
│ │_│ │_│ │_│ │_│ │_│ │_│   │
│                             │
│ Resend in 45s →             │
│                             │
│ [Verify]                    │
└─────────────────────────────┘
```

### Screen 3: Home / Shop Discovery

**Purpose:** Browse nearby shops, search, filter

```
┌─────────────────────────────┐
│ nearby                  ☰   │ ← Header with user name
│                             │
│ 📍 Basheerbagh, Hyd    ▼    │ ← Location (tap to change)
│ Filter by: All ▼            │ ← Category filter
│                             │
│ ┌───────────────────────┐   │ ← Shop Card (repeats)
│ │ 🏪 Kumar's Kirana     │   │
│ │ ★★★★★ 4.8            │   │
│ │ 🟢 Open · 2.1 km away │   │
│ │                       │   │
│ │ Verified | 2145 orders│   │
│ └───────────────────────┘   │
│ ┌───────────────────────┐   │
│ │ 🏪 Fresh Pharmacy     │   │
│ │ ★★★★☆ 4.3            │   │
│ │ 🔴 Closed · 3.2 km    │   │
│ └───────────────────────┘   │
│                             │
│ [≡] Cart  [❤] Favorites    │ ← Bottom nav
└─────────────────────────────┘

## Search
┌─────────────────────────────┐
│ 🔍 Search by shop name      │ ← Search bar (tap)
│ Filter by: All ▼            │
│                             │
│ Suggested:                  │
│ Kirana stores               │
│ Pharmacies                  │
│ Restaurants                 │
│ Fresh vegetables            │
└─────────────────────────────┘
```

### Screen 4: Shop Detail

**Purpose:** View shop info, products, reviews

```
┌─────────────────────────────┐
│ ← Kumar's Kirana       ❤    │ ← Shop name + favorite
│                             │
│ ★★★★★ 4.8 · 2,145 reviews  │
│ 🟢 Open until 10 PM         │
│ 📍 2.1 km away              │
│ 🟢 Verified · 1,204 orders  │
│                             │
│ ┌───────────────────────┐   │ ← Trust badge prominently
│ │ 🏆 Trusted Seller     │   │
│ │ 98/100 trust score    │   │
│ │ Fast response, reliable│   │
│ └───────────────────────┘   │
│                             │
│ Products | About | Reviews  │ ← Tabs
│                             │
│ ┌───────────────────────┐   │ ← Product list
│ │ Rice (10kg)  ₹500     │   │
│ │ ★★★★★ (234)          │   │
│ │ [+] Stock: 45         │   │
│ └───────────────────────┘   │
│ ┌───────────────────────┐   │
│ │ Milk (500ml)  ₹40     │   │
│ │ ★★★★★ (156)          │   │
│ │ [-] [2] [+] Stock: 12 │   │
│ └───────────────────────┘   │
│                             │
└─────────────────────────────┘
```

### Screen 5: Cart

**Purpose:** Review items, apply codes, checkout

```
┌─────────────────────────────┐
│ ← Cart                      │
│                             │
│ Kumar's Kirana              │ ← Shop name
│ 2.1 km away · ₹25 delivery  │
│                             │
│ ┌───────────────────────┐   │
│ │ Rice (10kg)    ₹500   │   │ ← Item line
│ │ Qty: 1   [Remove]     │   │
│ └───────────────────────┘   │
│ ┌───────────────────────┐   │
│ │ Milk (500ml)   ₹40    │   │
│ │ Qty: 2   [Remove]     │   │
│ └───────────────────────┘   │
│                             │
│ Subtotal:    ₹580           │
│ Delivery:    ₹25            │
│ ─────────────────────       │
│ Total:       ₹605           │
│                             │
│ [Apply Coupon Code]         │ ← Optional
│                             │
│ [Checkout]                  │ ← CTA (green)
│                             │
│ [Continue Shopping]         │ ← Back
└─────────────────────────────┘
```

### Screen 6: Delivery & Payment

**Purpose:** Set delivery address, choose payment method

```
┌─────────────────────────────┐
│ ← Delivery Address          │
│                             │
│ [📍 Map showing address]    │ ← Map
│                             │
│ 123 Basheerbagh Lane,       │ ← Current address
│ Hyderabad 500029            │
│ [Edit Address]              │
│                             │
│ Estimated delivery:         │ ← ETA
│ 📍 25 min                   │ ← Once you order
│ ⏱️ By 5:30 PM               │
│                             │
│ [Proceed to Payment]        │
└─────────────────────────────┘

## Payment Method Selection
┌─────────────────────────────┐
│ ← Payment                   │
│                             │
│ ○ UPI                       │ ← Default (most used in India)
│ ○ Debit Card                │
│ ○ Credit Card               │
│ ○ Net Banking               │
│ ○ Wallet                    │
│ ○ Cash on Delivery          │
│                             │
│ ₹605 Total                  │
│ [Pay Securely]              │
│                             │
│ Secured by Cashfree ▢       │ ← Trust badge
└─────────────────────────────┘
```

### Screen 7: Order Confirmation

**Purpose:** Show order placed, provide tracking

```
┌─────────────────────────────┐
│ ✓ Order Placed!             │ ← Success state
│                             │
│ Order #ORD-2024-0125-001    │
│ From: Kumar's Kirana        │
│                             │
│ Items:                      │
│ • Rice (10kg) × 1   ₹500    │
│ • Milk (500ml) × 2  ₹80     │
│ • Subtotal:         ₹580    │
│ • Delivery:         ₹25     │
│ • Total:            ₹605    │
│                             │
│ Paid via UPI ✓              │
│                             │
│ [Track Order]               │ ← Main CTA
│ [Back to Shops]             │
└─────────────────────────────┘
```

### Screen 8: Order Tracking (Live)

**Purpose:** Real-time order status + delivery tracking

```
┌─────────────────────────────┐
│ Order Tracking              │
│ ORD-2024-0125-001           │
│                             │
│ ● Packing (in progress)     │ ← Step indicator
│ • Ready for pickup          │
│ ○ Assigned to rider         │
│ ○ Picked up                 │
│ ○ Out for delivery          │
│ ○ Delivered                 │
│                             │
│ ━━━━━━━━━━━━━━━━━━━━━━━━   │ ← Progress bar
│ 40% complete · ~18 min      │
│                             │
│ Shop: Kumar's Kirana        │ ← Details
│ Delivery Partner: Assigned  │
│ Delivery to: 123 Main St    │
│ Delivery: 📍25 min · ₹25    │
│                             │
│ ┌───────────────────────┐   │
│ │ [Map showing route]   │   │ ← Live map (if assigned)
│ │ 🚲 Delivery partner   │   │
│ │    near you           │   │
│ └───────────────────────┘   │
│                             │
│ [Chat with Shop] [Contact]  │ ← Actions
│ [Cancel Order]              │ ← If cancellable
└─────────────────────────────┘
```

### Screen 9: Order History

**Purpose:** Past orders, reorder, reviews

```
┌─────────────────────────────┐
│ Order History               │
│                             │
│ ┌───────────────────────┐   │
│ │ ORD-2024-0125-001     │   │ ← Order item
│ │ Kumar's Kirana        │   │
│ │ ✓ Delivered           │   │
│ │ Jan 25, 5:30 PM       │   │
│ │ ₹605                  │   │
│ │ [Review] [Reorder]    │   │
│ └───────────────────────┘   │
│ ┌───────────────────────┐   │
│ │ ORD-2024-0124-045     │   │
│ │ Fresh Pharmacy        │   │
│ │ ✓ Delivered           │   │
│ │ Jan 24, 6:15 PM       │   │
│ │ ₹320                  │   │
│ │ [Review] [Reorder]    │   │
│ └───────────────────────┘   │
│                             │
└─────────────────────────────┘
```

### Screen 10: Review / Rating

**Purpose:** Rate order + shop, provide feedback

```
┌─────────────────────────────┐
│ Rate Order                  │
│ ORD-2024-0125-001           │
│                             │
│ Shop: Kumar's Kirana        │
│ ★ ★ ★ ★ ★ (tap to rate)     │
│                             │
│ "Best kirana store nearby!" │ ← Optional comment
│ ┌───────────────────────┐   │
│ │                       │   │
│ │                       │   │
│ └───────────────────────┘   │
│                             │
│ Delivery Quality            │
│ ★ ★ ★ ★ ☆ (4 stars)        │
│                             │
│ [Submit Review]             │
│ [Skip]                      │
└─────────────────────────────┘
```

---

## Shop Owner App

### Screen 1: Onboarding / KYC

**Purpose:** Verify shop owner, collect business info

```
┌─────────────────────────────┐
│ Create Your Shop            │
│                             │
│ Business Name               │
│ ┌───────────────────────┐   │
│ │ Kumar's Kirana        │   │
│ └───────────────────────┘   │
│                             │
│ Category                    │
│ [Kirana Store    ▼]         │
│                             │
│ Address                     │
│ ┌───────────────────────┐   │
│ │ 123 Basheerbagh Lane  │   │
│ └───────────────────────┘   │
│                             │
│ Phone                       │
│ ┌───────────────────────┐   │
│ │ +91 9876543210        │   │
│ └───────────────────────┘   │
│                             │
│ [Next: Upload Documents]    │
└─────────────────────────────┘

## KYC Documents
┌─────────────────────────────┐
│ Verify Your Identity        │
│                             │
│ Upload documents to get     │
│ verified (takes 24 hours).  │
│                             │
│ [📄 Aadhar Card]            │ ← Click to upload
│ Verification: Pending       │
│                             │
│ [📄 Business License]       │
│ Verification: Pending       │
│                             │
│ [🏪 Shop Photo]             │
│ Verification: Pending       │
│                             │
│ [Complete Verification]     │
│ Status: 0/3 documents       │
└─────────────────────────────┘
```

### Screen 2: Shop Dashboard (Home)

**Purpose:** Overview of shop performance, new orders

```
┌─────────────────────────────┐
│ Shop Dashboard              │
│ Kumar's Kirana              │ ← Shop name
│                             │
│ Status: 🟢 Open             │ ← Toggle open/close
│ Today's stats:              │
│                             │
│ 📦 12 orders                │ ← Key metrics
│ ₹4,850 revenue              │
│ ⭐ 4.8 rating               │
│ 🏆 98/100 trust             │
│                             │
│ ┌───────────────────────┐   │ ← New order alert
│ │ 🔔 NEW ORDER!         │   │
│ │ Order #ORD-001        │   │
│ │ ₹605 · 5 items        │   │
│ │ [Accept] [Reject]     │   │
│ └───────────────────────┘   │
│                             │
│ Recent Activity             │
│ [Orders] [Analytics] [etc]  │ ← Tabs
└─────────────────────────────┘
```

### Screen 3: Active Orders

**Purpose:** Manage current orders (accept, mark ready, etc.)

```
┌─────────────────────────────┐
│ Active Orders (3)           │
│                             │
│ ┌───────────────────────┐   │
│ │ ORD-001 (PENDING)     │   │ ← Pending order
│ │ Customer: John D.     │   │
│ │ Items: 5              │   │
│ │ ₹605                  │   │
│ │ Ordered: 5 min ago    │   │
│ │                       │   │
│ │ [Accept] [Reject]     │   │ ← CTA
│ └───────────────────────┘   │
│ ┌───────────────────────┐   │
│ │ ORD-002 (PACKING)     │   │ ← In progress
│ │ Customer: Priya S.    │   │
│ │ Items: 3              │   │
│ │ ₹320                  │   │
│ │ Ordered: 15 min ago   │   │
│ │                       │   │
│ │ [Mark Ready]          │   │
│ └───────────────────────┘   │
│ ┌───────────────────────┐   │
│ │ ORD-003 (READY)       │   │
│ │ Customer: Raj M.      │   │
│ │ Items: 8              │   │
│ │ ₹890                  │   │
│ │ Ordered: 25 min ago   │   │
│ │ Delivery: Assigned    │   │
│ │                       │   │
│ │ [Chat] [Details]      │   │
│ └───────────────────────┘   │
└─────────────────────────────┘
```

### Screen 4: Analytics / Reports

**Purpose:** Performance metrics, revenue, ratings

```
┌─────────────────────────────┐
│ Analytics                   │
│ Today                       │
│                             │
│ ┌───────────────────────┐   │ ← Revenue chart
│ │ Revenue: ₹4,850       │   │
│ │ ╱╲╱╲╱╲ (graph)        │   │
│ │                       │   │
│ │ vs Yesterday: +12%    │   │
│ └───────────────────────┘   │
│                             │
│ Orders:  12 completed       │
│ Avg:     ₹404 per order     │
│ Rating:  ★4.8 (45 reviews)  │
│                             │
│ Top Products:               │
│ 1. Rice (45 units)          │
│ 2. Milk (38 units)          │
│ 3. Eggs (32 units)          │
│                             │
│ [Weekly] [Monthly] [YTD]    │ ← Time filter
└─────────────────────────────┘
```

### Screen 5: Inventory Management

**Purpose:** Manage products, update stock

```
┌─────────────────────────────┐
│ Inventory                   │
│ [+ Add Product]             │
│                             │
│ Search products...          │
│                             │
│ ┌───────────────────────┐   │
│ │ Rice (10kg)           │   │
│ │ ₹500 · Stock: 45      │   │
│ │ [Edit] [Delete]       │   │
│ │ Last updated: 2h ago  │   │
│ └───────────────────────┘   │
│ ┌───────────────────────┐   │
│ │ Milk (500ml)          │   │
│ │ ₹40 · Stock: 0        │   │
│ │ [Edit] [Delete]       │   │
│ │ OUT OF STOCK          │   │
│ │                       │   │
│ │ [Restock Alert]       │   │
│ └───────────────────────┘   │
│ ┌───────────────────────┐   │
│ │ Oil (1L)              │   │
│ │ ₹120 · Stock: 12      │   │
│ │ [Edit] [Delete]       │   │
│ └───────────────────────┘   │
│                             │
│ [Bulk Upload CSV]           │
└─────────────────────────────┘
```

---

## Delivery Partner App

### Screen 1: Login & Status

**Purpose:** Authenticate, show availability status

```
┌─────────────────────────────┐
│ Delivery Partner            │
│ Log in with phone           │
│                             │
│ [+91 | ____________]        │
│                             │
│ [Send OTP]                  │
│                             │
│ [OTP verification]          │
│ [Enter 6-digit code]        │
│                             │
│ [Login]                     │
└─────────────────────────────┘

## Status Toggle
┌─────────────────────────────┐
│ Raj - Delivery Partner      │
│                             │
│ 🟢 Online & Available       │ ← Toggle
│ OR                          │
│ ⚫ Offline                  │
│                             │
│ Rating: ★★★★★ 4.9          │
│ Deliveries: 342 completed   │
│ This week: 28 orders        │
└─────────────────────────────┘
```

### Screen 2: Available Orders

**Purpose:** See nearby orders to accept

```
┌─────────────────────────────┐
│ Available Orders            │
│                             │
│ ┌───────────────────────┐   │
│ │ ORD-001               │   │
│ │ 📍 Kumar's Kirana     │   │
│ │ 0.8 km away           │   │
│ │ → 123 Main Street     │   │
│ │ 1.2 km away           │   │
│ │                       │   │
│ │ ₹605 · 5 items        │   │
│ │ Est. 12 min delivery  │   │
│ │ +₹25 delivery fee     │   │
│ │                       │   │
│ │ [Accept Order]        │   │
│ │ [Details]             │   │
│ └───────────────────────┘   │
│ ┌───────────────────────┐   │
│ │ ORD-002               │   │
│ │ 📍 Fresh Pharmacy     │   │
│ │ 1.1 km away           │   │
│ │ → Basheerbagh Lane    │   │
│ │ 1.8 km away           │   │
│ │                       │   │
│ │ ₹320 · 3 items        │   │
│ │ Est. 15 min delivery  │   │
│ │ +₹20 delivery fee     │   │
│ │                       │   │
│ │ [Accept Order]        │   │
│ └───────────────────────┘   │
└─────────────────────────────┘
```

### Screen 3: Assigned Order Tracking

**Purpose:** Navigate to shop, pick up, deliver

```
┌─────────────────────────────┐
│ Delivery Assignment         │
│ ORD-001                     │
│                             │
│ Status: 📍 Assigned         │
│                             │
│ Step 1: Go to Shop          │ ← Current step
│ 📍 Kumar's Kirana           │
│ 0.8 km away · 3 min walk    │
│                             │
│ [Navigate] [Call Shop]      │
│                             │
│ Step 2: Pick up order       │
│ Step 3: Deliver to customer │
│                             │
│ Customer: John D.           │
│ 📞 Hidden (contact via app) │
│ Delivery: 123 Main St       │
│                             │
│ ┌───────────────────────┐   │
│ │ [Map showing route]   │   │ ← Live GPS
│ │ 📍 You are here       │   │
│ │ → Kumar's Kirana      │   │
│ └───────────────────────┘   │
│                             │
│ [Arrived at Shop]           │ ← CTA (button changes)
└─────────────────────────────┘

## After Pickup
┌─────────────────────────────┐
│ Step 3: Deliver Order       │ ← Updated step
│ ORD-001                     │
│                             │
│ 📍 123 Main Street          │
│ 1.2 km away · 5 min         │
│                             │
│ [Navigate] [Call Customer]  │
│                             │
│ ┌───────────────────────┐   │
│ │ [Map showing route]   │   │
│ │ 📍 You are here       │   │
│ │ → Customer location   │   │
│ └───────────────────────┘   │
│                             │
│ [Mark as Delivered]         │ ← After arriving
└─────────────────────────────┘
```

### Screen 4: Earnings & History

**Purpose:** Track earnings, completed deliveries

```
┌─────────────────────────────┐
│ Earnings                    │
│ Today                       │
│                             │
│ ✓ Completed: 12 deliveries  │
│ 💰 Earned: ₹840             │
│ ⏱️ Active time: 4.5 hours    │
│ 📊 Avg per delivery: ₹70    │
│                             │
│ This Week: ₹3,240           │
│ This Month: ₹12,560         │
│                             │
│ Completed Orders:           │
│ ┌───────────────────────┐   │
│ │ ORD-001 ✓ 2:30 PM    │   │
│ │ Kumar's Kirana        │   │
│ │ ₹70 (₹25 fee + tip)   │   │
│ │ John D.               │   │
│ │ 1.2 km · 12 min       │   │
│ │ Rating: ★★★★★        │   │
│ └───────────────────────┘   │
│                             │
│ [Weekly] [Monthly]          │ ← Time filter
└─────────────────────────────┘
```

---

## Admin Dashboard (Web)

### Screen 1: Dashboard Overview

**Purpose:** High-level metrics, alerts, monitoring

```
┌────────────────────────────────────┐
│ NearBy Admin Dashboard             │
│ April 12, 2026                     │
│                                    │
│ ┌──────────┬──────────┬──────────┐ │
│ │ Orders   │ GMV      │ Users    │ │
│ │ 1,245    │ ₹1.2M    │ 4,520    │ │
│ │ +12% MoM │ +8% MoM  │ +5% MoM  │ │
│ └──────────┴──────────┴──────────┘ │
│                                    │
│ Shops with Issues:                 │
│ ⚠️ 3 shops with trust < 60         │
│ 📋 5 KYC documents pending         │
│ 💬 12 disputes open                │
│                                    │
│ Recent Activity:                   │
│ [Orders] [Shops] [Users] [Disputes]│
│ • ORD-001: Delivered 2:30 PM       │
│ • Shop created: Fresh Pharmacy     │
│ • User complaint: Wrong item       │
│                                    │
│ [View Full Analytics]              │
└────────────────────────────────────┘
```

### Screen 2: KYC Review

**Purpose:** Approve/reject shop KYC documents

```
┌────────────────────────────────────┐
│ KYC Review                         │
│ Pending: 5 documents               │
│                                    │
│ ┌──────────────────────────────┐   │
│ │ Kumar's Kirana               │   │
│ │ Documents:                   │   │
│ │ ✓ Aadhar (verified)          │   │
│ │ ⏳ License (pending)          │   │
│ │ ⏳ Shop photo (pending)       │   │
│ │                              │   │
│ │ [View Documents] [Approve]   │   │
│ │ [Reject]                     │   │
│ └──────────────────────────────┘   │
│                                    │
│ Document Details:                  │
│ [📄 Business License]              │
│ [Full resolution image]            │
│                                    │
│ Notes:                             │
│ [Looks authentic, approve]         │
│                                    │
│ [Approve] [Reject] [Request Info]  │
└────────────────────────────────────┘
```

### Screen 3: Disputes & Issues

**Purpose:** Investigate and resolve order disputes

```
┌────────────────────────────────────┐
│ Disputes                           │
│ Open: 12 · Resolved: 156           │
│                                    │
│ ┌──────────────────────────────┐   │
│ │ Dispute #12                  │   │
│ │ Status: Open (3 days)        │   │
│ │ Order: ORD-001               │   │
│ │ Customer: John D.            │   │
│ │ Shop: Kumar's Kirana         │   │
│ │ Reason: Wrong item received  │   │
│ │ Amount: ₹605 (refund claim)  │   │
│ │                              │   │
│ │ [View Evidence] [Messages]   │   │
│ │ [Resolve] [Mark Escalated]   │   │
│ └──────────────────────────────┘   │
│                                    │
│ Resolution:                        │
│ [ ] Full refund to customer        │
│ [ ] Replacement order              │
│ [ ] Partial refund                 │
│ [ ] Reject claim                   │
│                                    │
│ Decision Notes:                    │
│ [Customer provided photo evidence] │
│ [Approve refund ₹605]              │
│                                    │
│ [Submit Decision]                  │
└────────────────────────────────────┘
```

### Screen 4: Analytics

**Purpose:** Detailed metrics, trends, insights

```
┌────────────────────────────────────┐
│ Analytics Dashboard                │
│ Filter: Last 7 days                │
│                                    │
│ GMV Trend:                         │
│ ╱╲╱╲╱╲ (line chart)                │
│ ₹1.2M · +8% vs last week           │
│                                    │
│ Order Distribution:                │
│ Kirana: 45% · Pharmacy: 30% · etc  │
│ (pie chart)                        │
│                                    │
│ Top Shops by Revenue:              │
│ 1. Kumar's Kirana - ₹85K           │
│ 2. Fresh Pharmacy - ₹62K           │
│ 3. ABC Restaurants - ₹48K          │
│                                    │
│ Customer Metrics:                  │
│ Repeat orders: 67%                 │
│ Avg order value: ₹480              │
│ Churn rate: 3%                     │
│                                    │
│ [Export as CSV] [Share Report]     │
└────────────────────────────────────┘
```

---

## Design System (Reusable Components)

### Buttons

```
Primary (Green):
┌──────────────┐
│ [Checkout]   │
└──────────────┘

Secondary (Gray):
┌──────────────┐
│ [Cancel]     │
└──────────────┘

Danger (Red):
┌──────────────┐
│ [Delete]     │
└──────────────┘

Loading:
┌──────────────┐
│ ⟳ Loading... │
└──────────────┘
```

### Cards

```
┌─────────────────────┐
│ Kumar's Kirana      │ ← Title
│ ★★★★★ 4.8 (234)    │ ← Rating
│ 2.1 km away         │ ← Distance
│ 🟢 Open             │ ← Status
│ ₹500 - ₹2000        │ ← Price range
│ Verified · 2145 ord │ ← Trust indicators
└─────────────────────┘
```

### Forms

```
Field Label
┌──────────────────────┐
│ Placeholder text     │
└──────────────────────┘
Optional helper text

Error State:
┌──────────────────────┐
│ Invalid input ✗      │
└──────────────────────┘
⚠️ This field is required
```

### Loading States

```
Skeleton Screen:
┌──────────────────┐
│ ▒▒▒▒▒▒▒▒▒▒▒     │ (shimmer animation)
│ ▒▒▒▒▒▒          │
│ ▒▒▒▒▒▒▒▒▒▒▒     │
└──────────────────┘

Loading Spinner:
⟳ (rotating)
"Finding shops nearby..."
```

### Toast Notifications

```
Success:
┌────────────────────────┐
│ ✓ Order created       │
└────────────────────────┘

Error:
┌────────────────────────┐
│ ✗ Payment failed      │
└────────────────────────┘

Info:
┌────────────────────────┐
│ ℹ Promotion ending    │
└────────────────────────┘
```

---

## Accessibility Requirements

- **Touch targets**: Minimum 48px × 48px
- **Text contrast**: WCAG AA (4.5:1 for body text)
- **Font sizes**: Minimum 14px for body text
- **Focus states**: Clear visual indicators
- **Screen reader support**: Semantic HTML + ARIA labels

---

## Animation & Microinteractions

- Page transitions: 300ms fade-in
- Button press: 100ms scale feedback
- Loading spinner: Smooth continuous rotation
- Toast notifications: Slide up, stay 3s, slide down
- Pull-to-refresh: Spring animation

---

## Responsive Design

| Device | Width | Design |
|--------|-------|--------|
| Mobile | 375px | Primary design (all apps) |
| Tablet | 768px | Responsive (customer app) |
| Desktop | 1024px+ | Admin dashboard (web) |

---

## Dark Mode (Optional v2)

All colors adjusted for OLED screens and reduced eye strain:
- Background: #121212
- Surface: #1E1E1E
- Text: #E0E0E0

---

*Design Brief v1 — April 12, 2026*
