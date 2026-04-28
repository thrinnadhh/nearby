# NearBy — Complete Frontend Prompts
# Use these in Claude Code with /nearby-task
# Run ui-ux-pro-max skill before each section

===========================================================
## HOW TO USE THESE PROMPTS
===========================================================

1. Open Claude Code: cd ~/projects/nearby && claude
2. For each prompt below, type /nearby-task and paste the prompt
3. The nearby-ui agent handles all frontend tasks
4. After each task: git add . && git commit && code-review-graph update

===========================================================
## SECTION 1 — WEB FRONTEND (Next.js)
## apps/web/
===========================================================

---

### PROMPT W1 — Web Project Scaffold

/nearby-task

Use nearby-ui agent. Set up the Next.js 14 web frontend for NearBy.

Project location: apps/web/

Install and configure:
- Next.js 14 with App Router
- Tailwind CSS
- shadcn/ui component library
- React Query (TanStack Query v5)
- Framer Motion for animations
- next/font with Google Fonts
- next/image for optimised images
- Zustand for client state
- Axios for API calls

Run: npx create-next-app@latest apps/web --typescript --tailwind --app --no-src-dir

Then configure:
- tailwind.config.ts with NearBy design tokens (get from ui-ux-pro-max skill first)
- app/layout.tsx with font, metadata, providers
- lib/api.ts with base Axios instance pointing to backend API
- lib/queryClient.ts with React Query config
- components/ui/ with shadcn base components

Design system from ui-ux-pro-max:
Run: python3 .claude/skills/ui-ux-pro-max/scripts/search.py "hyperlocal commerce trust local india warm community" --design-system --stack nextjs

Apply the recommended: color palette, font pairing, spacing scale, border radius style.

NearBy brand constraints:
- Warm, community-feel — NOT corporate or cold
- Trust is the core emotion — verified, safe, local
- Primary color: warm (not blue — avoid tech-startup blue)
- Font: readable, friendly — NOT minimal/cold sans-serif

Deliver: complete scaffold that runs with `npm run dev` showing a blank page with correct fonts and colors.

---

### PROMPT W2 — Landing Page Hero + Navigation

/nearby-task

Use nearby-ui agent. Build the landing page hero section and navigation for apps/web/.

File: apps/web/app/page.tsx (start of the page)
File: apps/web/components/layout/Navbar.tsx
File: apps/web/components/layout/Footer.tsx

NAVBAR:
- Logo: "NearBy" wordmark (left)
- Nav links: How it works · For Shops · Download
- CTA button: "Download App" (right, filled button)
- Mobile: hamburger menu with slide-out drawer
- Sticky on scroll with subtle shadow
- Transparent on hero, white after scroll

HERO SECTION:
- Full viewport height
- Headline (large, bold): "Your neighbourhood, delivered"
- Subheadline: "Fresh groceries, medicines, food — from verified local shops near you. Not a warehouse. Not a dark store. Real shops. Real people."
- Two CTA buttons:
  - Primary: "Download for Android" (Play Store)
  - Secondary: "Download for iOS" (App Store)
- Hero visual: split layout — left text, right a warm illustration or phone mockup
  (use CSS/SVG illustration — no stock photos)
- Trust indicators below CTAs:
  - "2,400+ verified shops"
  - "Delivered in 30 minutes"
  - "Real reviews only"

FOOTER:
- Logo + tagline
- Links: About · For Shops · Privacy · Terms · Contact
- App store badges
- "Made with ❤️ for local India"
- Copyright

Animations:
- Hero text: fade in up on load (Framer Motion)
- Trust indicators: count up animation
- Navbar: smooth scroll behaviour

Mobile responsive: hero stacks vertically on mobile, headline size reduces.

---

### PROMPT W3 — Recommended Products Section

/nearby-task

Use nearby-ui agent. Build the Recommended Products section for the NearBy landing page.

File: apps/web/components/sections/RecommendedProducts.tsx
File: apps/web/components/cards/ProductCard.tsx
File: apps/web/lib/hooks/useFeaturedProducts.ts
File: apps/web/app/page.tsx (add section here)

DATA SOURCE:
- Fetches from: GET /api/v1/featured-products
- Response shape:
  {
    products: [{
      id, name, price, unit, image_url,
      shop: { id, name, trust_score, distance_km, is_open }
    }]
  }
- Next.js ISR: revalidate every 300 seconds (5 minutes)
- Empty state: hide section entirely if no products returned

SECTION LAYOUT:
- Section heading: "Handpicked for you" (left aligned)
- Subheading: "Curated by our team from verified local shops"
- Product grid: 4 columns desktop, 2 columns tablet, 1 column mobile
- Max 8 products shown

PRODUCT CARD:
- Product image (square, rounded corners, lazy loaded)
- Skeleton loader while image loads
- Product name (2 lines max, truncate)
- Shop name with verified badge (green checkmark if trust_score > 3.5)
- Price: "₹29" (large, bold)
- Unit: "per 500g" (small, muted)
- Distance: "1.2 km away" pill
- Shop open/closed badge (green dot = open, grey = closed)
- "Order on App" button → deep link to app

HOVER STATE (desktop):
- Card lifts with shadow
- Button becomes visible (hidden by default on desktop)

No hardcoded products — all from API. If API fails: hide section silently (no error shown to visitor).

---

### PROMPT W4 — Trending This Week Section

/nearby-task

Use nearby-ui agent. Build the Trending This Week section for the NearBy landing page.

File: apps/web/components/sections/TrendingProducts.tsx
File: apps/web/lib/hooks/useTrendingProducts.ts
File: apps/web/app/page.tsx (add after recommended section)

DATA SOURCE:
- Fetches from: GET /api/v1/trending-products
- Response shape:
  {
    products: [{
      id, name, price, unit, image_url, trending_label,
      shop: { id, name, trust_score, distance_km }
    }]
  }
- trending_label examples: "🔥 Hot this week", "⚡ Fast seller", "❤️ Community favourite"
- ISR revalidate: 300 seconds

SECTION LAYOUT:
- Section heading: "Trending this week" (left aligned)
- Horizontal scroll row (NOT grid) — feels like a curated list
- Scrollable on mobile with snap points
- Arrow buttons on desktop (prev/next)
- Scroll indicator dots on mobile

TRENDING CARD (wider than product card, landscape ratio):
- Left: product image (square)
- Right: product info
  - Trending label badge (coloured pill — red for 🔥, yellow for ⚡, pink for ❤️)
  - Product name
  - Shop name + verified badge
  - Price + unit
  - "X orders this week" social proof (if returned by API)
- Card background: slightly warm tint to stand out from recommended section

ANIMATION:
- Cards slide in from right on scroll into view (Framer Motion)
- Horizontal scroll is smooth with momentum

---

### PROMPT W5 — Shop Categories + How It Works + Download CTA

/nearby-task

Use nearby-ui agent. Build three remaining landing page sections.

Files:
- apps/web/components/sections/ShopCategories.tsx
- apps/web/components/sections/HowItWorks.tsx
- apps/web/components/sections/DownloadCTA.tsx
- apps/web/app/page.tsx (add all three)

SHOP CATEGORIES SECTION:
- Heading: "What can you order?"
- 7 category pills in a row (horizontal scroll on mobile):
  🛒 Kirana  🥬 Vegetables  💊 Pharmacy  🍱 Food & Tiffin  🐾 Pet Supplies  📱 Mobile  🪑 Furniture
- Each pill: icon + label, tappable, links to app deep link
- Background: light warm tint

HOW IT WORKS SECTION:
- Heading: "How NearBy works"
- 4 steps in a horizontal flow (vertical on mobile):
  1. 📍 Find shops near you — See verified shops within 3km
  2. 🛒 Pick what you need — Browse real-time inventory
  3. ✅ Place your order — Pay via UPI, card, or cash
  4. 🚀 Get it delivered — Local partner brings it in 30 min
- Each step: number circle + icon + title + description
- Connecting line between steps (desktop)
- Animate in sequence on scroll

DOWNLOAD CTA SECTION:
- Full-width warm background section
- Heading: "Ready to shop local?"
- Subheading: "Join thousands of customers supporting local businesses"
- Two buttons: Play Store + App Store
- QR code in center that links to app download page
- Social proof: "4.8★ rating · 10,000+ downloads"

---

### PROMPT W6 — Admin Dashboard Shell + Auth

/nearby-task

Use nearby-ui agent. Build the admin dashboard for NearBy web.

Files:
- apps/web/app/admin/layout.tsx
- apps/web/app/admin/page.tsx (redirects to /admin/featured)
- apps/web/app/admin/login/page.tsx
- apps/web/components/admin/AdminSidebar.tsx
- apps/web/components/admin/AdminHeader.tsx
- apps/web/lib/auth/adminAuth.ts

AUTH:
- Simple JWT auth — admin logs in with phone OTP (same as app)
- POST /api/v1/auth/send-otp → POST /api/v1/auth/verify-otp
- JWT stored in httpOnly cookie
- Middleware: apps/web/middleware.ts — protect all /admin/* routes
- Redirect unauthenticated to /admin/login

LOGIN PAGE:
- Centered card
- NearBy logo
- Phone number input → "Send OTP"
- OTP input (6 digits, auto-focus each box) → "Verify"
- Clean, minimal — this is an internal tool

ADMIN LAYOUT:
- Left sidebar (collapsible on mobile)
- Sidebar links:
  - 📌 Featured Products
  - 🔥 Trending Products
  - 🏪 Shops
  - 📋 KYC Queue
  - ⚖️ Disputes
  - 📊 Analytics
  - 📢 Broadcast
- Top header: NearBy Admin · logout button · admin name
- Main content area (right)

DESIGN: Clean, professional, minimal. Not the same warm style as public site — this is internal tooling. Use neutral greys, clear data tables, functional over decorative.

---

### PROMPT W7 — Admin Featured Products Manager

/nearby-task

Use nearby-ui agent. Build the Featured Products manager page in the admin dashboard.

Files:
- apps/web/app/admin/featured/page.tsx
- apps/web/components/admin/FeaturedProductsTable.tsx
- apps/web/components/admin/AddProductModal.tsx
- apps/web/lib/hooks/useAdminFeaturedProducts.ts

MAIN PAGE:
- Heading: "Featured Products" + "Last updated: [timestamp]"
- "Add Product" button (top right)
- "Preview on website" button → opens / in new tab
- Current featured products table

TABLE COLUMNS:
- Drag handle (⠿) for reordering position
- Position number
- Product image (small thumbnail)
- Product name
- Shop name
- Price
- Active toggle (on/off)
- Remove button (trash icon)

TABLE BEHAVIOUR:
- Drag to reorder → saves new positions via PATCH /api/v1/admin/featured-products/reorder
- Active toggle → PATCH /api/v1/admin/featured-products/:id { active: true/false }
- Remove → DELETE /api/v1/admin/featured-products/:id with confirm dialog
- Max 8 products (show warning if trying to add more)

ADD PRODUCT MODAL:
- Search input: "Search products..." → GET /api/v1/search/products?q=
- Results list: product name + shop name + price
- Click to select
- Position input (default: end of list)
- "Add to Featured" button → POST /api/v1/admin/featured-products
- Close on success, refresh table

---

### PROMPT W8 — Admin Trending Products Manager

/nearby-task

Use nearby-ui agent. Build the Trending Products manager. Same pattern as Featured but with trending label field.

Files:
- apps/web/app/admin/trending/page.tsx
- apps/web/components/admin/TrendingProductsTable.tsx
- apps/web/lib/hooks/useAdminTrendingProducts.ts

Same as W7 but add:
- "Trending label" column with editable field: dropdown of preset labels
  - 🔥 Hot this week
  - ⚡ Fast seller
  - ❤️ Community favourite
  - 🆕 New arrival
  - 💰 Best value
- Inline edit: click label → dropdown appears → save on select
- API: PATCH /api/v1/admin/trending-products/:id { trending_label: "..." }

===========================================================
## SECTION 2 — CUSTOMER MOBILE APP (React Native + Expo)
## apps/customer/
===========================================================

---

### PROMPT M1 — Customer App Scaffold

/nearby-task

Use nearby-ui agent. Set up the NearBy Customer React Native app.

Project location: apps/customer/

Run: npx create-expo-app apps/customer --template blank-typescript

Install:
- @react-navigation/native + @react-navigation/bottom-tabs + @react-navigation/stack
- react-native-safe-area-context
- react-native-screens
- @tanstack/react-query
- zustand
- axios
- socket.io-client
- @react-native-async-storage/async-storage
- react-native-maps (Ola Maps compatible)
- expo-location
- expo-camera
- expo-image-picker
- react-native-reanimated
- react-native-gesture-handler

Configure:
- app.json with app name "NearBy", bundle ID "com.nearby.customer"
- src/navigation/RootNavigator.tsx — Auth stack vs Main tab stack
- src/navigation/AuthNavigator.tsx — Splash, OTP screens
- src/navigation/MainNavigator.tsx — Home, Search, Orders, Profile tabs
- src/lib/api.ts — Axios instance with JWT interceptor
- src/lib/queryClient.ts
- src/store/ — Zustand stores: authStore, cartStore, locationStore
- src/constants/theme.ts — colors, fonts, spacing from ui-ux-pro-max

Get design system first:
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "hyperlocal commerce mobile india warm local" --design-system --stack react-native

Apply: color palette, font pairing, spacing scale to theme.ts

---

### PROMPT M2 — Onboarding + OTP Login Screens

/nearby-task

Use nearby-ui agent. Build onboarding and OTP authentication screens for the Customer app.

Files:
- apps/customer/src/screens/auth/SplashScreen.tsx
- apps/customer/src/screens/auth/OnboardingScreen.tsx
- apps/customer/src/screens/auth/PhoneScreen.tsx
- apps/customer/src/screens/auth/OTPScreen.tsx
- apps/customer/src/screens/auth/NameScreen.tsx
- apps/customer/src/hooks/useAuth.ts

SPLASH SCREEN:
- NearBy logo centered
- Warm background color
- 2 second delay then navigate to onboarding (first time) or home (returning user)
- Check AsyncStorage for existing JWT

ONBOARDING (3 slides, show only first time):
- Slide 1: "Find shops near you" — map illustration with shop pins
- Slide 2: "Order in seconds" — cart illustration
- Slide 3: "Delivered fast" — delivery partner illustration
- Skip button, Next button, dots indicator
- "Get Started" on last slide

PHONE SCREEN:
- "Enter your phone number"
- +91 prefix (fixed, India only)
- 10-digit phone input (numeric keyboard)
- "Send OTP" button → POST /api/v1/auth/send-otp
- Loading state on button
- Error: "Too many attempts. Try after 1 hour" for rate limit

OTP SCREEN:
- "Enter the 6-digit OTP sent to +91XXXXXXXX"
- 6 individual input boxes (auto-advance on each digit)
- Auto-submit when 6th digit entered
- Resend OTP timer: 30 seconds countdown, then "Resend OTP" link
- Wrong OTP: shake animation on boxes
- 3 wrong attempts: "Account locked for 10 minutes"

NAME SCREEN (new users only):
- "What should we call you?"
- Single name input
- "Continue" → PATCH /api/v1/auth/me { name }
- Skip option (name optional)

---

### PROMPT M3 — Home Screen

/nearby-task

Use nearby-ui agent. Build the Home screen for the NearBy Customer app.

File: apps/customer/src/screens/main/HomeScreen.tsx
File: apps/customer/src/components/ShopCard.tsx
File: apps/customer/src/components/CategoryChips.tsx
File: apps/customer/src/hooks/useNearbyShops.ts

HOME SCREEN LAYOUT (scrollable):
- Header: "Good morning, [name] 👋" + location pill ("📍 Kukatpally")
- Search bar: "Search shops or products..." → navigates to Search screen
- Category chips row (horizontal scroll):
  All · 🛒 Kirana · 🥬 Vegetables · 💊 Pharmacy · 🍱 Food · 🐾 Pets · 📱 Mobile
- Section: "Shops near you"
- Shop cards list (vertical scroll)
- Pull to refresh

DATA:
- Location: from expo-location or manual entry
- API: GET /api/v1/search/shops?lat=&lng=&radius=3&category=
- React Query with 60s stale time
- Loading: skeleton cards (3 placeholders)
- Empty: "No shops found nearby. Try expanding your area."

SHOP CARD:
- Shop cover photo (16:9, rounded top)
- Shop name (bold)
- Category chip (e.g. "Kirana")
- Trust score: ★ 4.2 (gold stars, number)
- Verified badge: ✓ Verified (green, small)
- Distance: 1.2 km
- Open/Closed badge (green pill / grey pill)
- Delivery time estimate: "~25 min"
- Minimum order: "Min ₹99" (if applicable)
- Press → navigate to ShopScreen

CATEGORY FILTER:
- Tap category chip → filters shop list
- Selected chip: filled background
- "All" selected by default

---

### PROMPT M4 — Shop Screen + Product Browsing

/nearby-task

Use nearby-ui agent. Build the Shop screen where customers browse products.

File: apps/customer/src/screens/main/ShopScreen.tsx
File: apps/customer/src/components/ProductGridItem.tsx
File: apps/customer/src/components/CartBar.tsx
File: apps/customer/src/hooks/useShopProducts.ts

SHOP SCREEN:
- Collapsible header with shop photo (collapses on scroll)
- Shop info: name, verified badge, trust score, open/closed
- Working hours (expandable)
- Delivery info: "Delivers to your area · ~25 min"

PRODUCT SECTIONS:
- Products grouped by category (from API)
- Each category is a section with header
- 2-column grid within each section
- Sticky category navigation bar (tap to jump to section)

PRODUCT GRID ITEM:
- Product image (square, 1:1)
- Product name (2 lines max)
- Price (bold): ₹29
- Unit: per 500g (muted)
- Stock: show "Only 3 left" if stock_qty < 5
- Out of stock: greyed out with "Unavailable" overlay
- Add button: "+" circle (bottom right of image)
- If in cart: show quantity control (- 2 +)
- Tap image: full screen product detail sheet

CART BAR (fixed bottom, appears when cart has items):
- "[N] items · ₹[total]"
- "View Cart →" button
- Bounces when item added

---

### PROMPT M5 — Cart + Checkout Screen

/nearby-task

Use nearby-ui agent. Build Cart and Checkout screens.

File: apps/customer/src/screens/main/CartScreen.tsx
File: apps/customer/src/screens/main/CheckoutScreen.tsx
File: apps/customer/src/components/AddressInput.tsx
File: apps/customer/src/hooks/useCreateOrder.ts

CART SCREEN:
- Shop name header
- Items list:
  - Product image + name + unit
  - Quantity control (- N +)
  - Line total: ₹58
  - Remove: swipe left to delete
- Price summary:
  - Subtotal
  - Delivery fee: ₹25 (or "Free delivery")
  - Total
- "Proceed to Checkout" button (disabled if shop closed)
- Empty cart: illustration + "Your cart is empty" + "Browse Shops" button

CHECKOUT SCREEN:
- Delivery address section:
  - Current GPS address (auto-filled)
  - Edit button → AddressInput component
  - Ola Maps autocomplete for address search
- Order summary (collapsed, expandable)
- Payment method selector:
  - UPI (recommended badge)
  - Card
  - Cash on Delivery
- "Place Order ₹[total]" button
- Idempotency key: generate UUID on screen mount, attach to order

On "Place Order":
- POST /api/v1/orders
- Loading overlay (prevent double tap)
- Success: navigate to OrderTrackingScreen
- Error: show specific message (SHOP_CLOSED, PRODUCT_OUT_OF_STOCK etc.)

---

### PROMPT M6 — Order Tracking Screen

/nearby-task

Use nearby-ui agent. Build the real-time order tracking screen.

File: apps/customer/src/screens/main/OrderTrackingScreen.tsx
File: apps/customer/src/components/OrderTimeline.tsx
File: apps/customer/src/components/LiveMap.tsx
File: apps/customer/src/hooks/useOrderTracking.ts

ORDER TRACKING SCREEN:
- Full screen map (top half) using react-native-maps
- Bottom sheet (bottom half, swipeable up)

MAP:
- Customer location pin (blue)
- Shop location pin (shop icon)
- Delivery partner pin (bike icon, moves in real time)
- Route line: shop → customer
- Map auto-pans to show all pins

BOTTOM SHEET:
- Order status banner (large, colored by status):
  - PENDING: amber "Waiting for shop to accept..." + 3min timer countdown
  - ACCEPTED: blue "Shop is preparing your order"
  - ASSIGNED: green "Partner is on the way" + partner name + rating
  - DELIVERED: green "Order delivered! 🎉"

ORDER TIMELINE:
- Vertical timeline with steps:
  ✓ Order placed (timestamp)
  ✓ Shop accepted (timestamp, or ⏳ pending)
  ○ Packed and ready
  ○ Partner picked up
  ○ Delivered

ETA:
- "Arriving in ~12 minutes" (large, updates every 5s)
- Partner details card (after assigned):
  - Partner photo + name + rating
  - "Call" button

REAL-TIME:
- Socket.IO: join room `order:{orderId}` on mount
- Listen: order_accepted, order_rejected, partner_assigned, location_update, order_delivered
- On location_update: animate partner pin to new coordinates
- On order_rejected: show rejection sheet with refund info

---

### PROMPT M7 — Orders History + Review Screen

/nearby-task

Use nearby-ui agent. Build Order History and Review screens.

File: apps/customer/src/screens/main/OrdersScreen.tsx
File: apps/customer/src/screens/main/ReviewScreen.tsx
File: apps/customer/src/components/OrderHistoryCard.tsx

ORDERS SCREEN:
- Tab navigation: Active · Past
- Active orders: real-time status, tap to go to tracking
- Past orders list:

ORDER HISTORY CARD:
- Shop name + date
- Items summary: "Tomatoes, Onions +3 more"
- Total amount
- Status badge
- "Reorder" button → pre-fills cart
- "Leave Review" button (if delivered and no review yet)

REVIEW SCREEN:
- Shop name + order summary
- Star rating (1-5, large interactive stars)
- Comment text area (optional, placeholder: "How was your experience?")
- "Submit Review" → POST /api/v1/reviews
- Thank you animation on submit (confetti or checkmark)
- Skip option

---

### PROMPT M8 — Profile Screen

/nearby-task

Use nearby-ui agent. Build the Profile screen.

File: apps/customer/src/screens/main/ProfileScreen.tsx

PROFILE SCREEN:
- Avatar (initials based, no photo upload for customers)
- Name + phone number
- Sections:
  - My Orders → OrdersScreen
  - Saved Addresses → AddressesScreen
  - Notifications settings toggle
  - Help & Support → opens WhatsApp or email
  - Rate the App → opens Play Store / App Store
  - About NearBy
  - Logout (red, bottom)
- App version at bottom

===========================================================
## SECTION 3 — SHOP OWNER APP (React Native + Expo)
## apps/shop/
===========================================================

---

### PROMPT S1 — Shop Owner App Scaffold + Dashboard

/nearby-task

Use nearby-ui agent. Set up and build the Shop Owner app for NearBy.

Project: apps/shop/ (same dependencies as customer app)
Bundle ID: com.nearby.shop

DASHBOARD SCREEN (apps/shop/src/screens/DashboardScreen.tsx):

Most important element — the OPEN/CLOSE toggle:
- Giant toggle switch at the top (full width, can't miss it)
- When OPEN: green background "Shop is OPEN"
- When CLOSED: grey background "Shop is CLOSED"
- Toggle → PATCH /api/v1/shops/:id/toggle { is_open: true/false }
- Typesense updates within 15 seconds

Today's stats row:
- Orders received: 12
- Revenue: ₹1,840
- Completion rate: 94%
- Avg response time: 1.2 min

Pending orders badge (large number, red):
- "3 orders waiting" → taps to Orders screen

Quick actions:
- Add Product
- View Analytics
- Edit Working Hours

---

### PROMPT S2 — Order Inbox Screen

/nearby-task

Use nearby-ui agent. Build the Order Inbox for shop owners — the most critical screen.

File: apps/shop/src/screens/OrderInboxScreen.tsx
File: apps/shop/src/components/PendingOrderCard.tsx
File: apps/shop/src/hooks/useOrderInbox.ts

ORDER INBOX:
- Tabs: Pending (badge) · Active · Completed
- Real-time via Socket.IO: join `shop:{shopId}` room
- New order: card slides in from top with sound notification

PENDING ORDER CARD (high urgency design):
- Timer: large countdown "2:47 remaining" (red when < 60s)
- Customer name (first name only)
- Items list: "2x Tomatoes 500g, 1x Onion 1kg, 3x Bread"
- Total: ₹149
- Payment: "UPI · Paid" or "Cash on Delivery"
- Delivery address (short form)
- Two large buttons:
  - ACCEPT (green, full width)  
  - REJECT (outlined red, smaller)

On ACCEPT:
- Bottom sheet: "Estimated ready time?"
- Options: 5 min · 10 min · 15 min · 20 min · 30 min
- Confirm → PATCH /api/v1/orders/:id/accept { estimated_ready_mins }

On REJECT:
- Bottom sheet: reason selector
  - Out of stock
  - Shop closing early  
  - Too many orders
  - Other
- Confirm → PATCH /api/v1/orders/:id/reject { reason }

ACTIVE ORDER CARD (after accept):
- Status: Preparing
- Timer: "Estimated ready in 8 min"
- "Mark as Ready" button → PATCH /api/v1/orders/:id/ready

---

### PROMPT S3 — Product Management Screen

/nearby-task

Use nearby-ui agent. Build the Product Management screen for shop owners.

File: apps/shop/src/screens/ProductsScreen.tsx
File: apps/shop/src/screens/AddProductScreen.tsx
File: apps/shop/src/components/ProductListItem.tsx

PRODUCTS SCREEN:
- Search bar to filter products
- Category tabs (horizontal scroll)
- Product list (not grid — list view better for management)

PRODUCT LIST ITEM:
- Product image (small, square)
- Product name + unit
- Price: ₹29
- Stock: "48 in stock" or "Out of stock" (red)
- Availability toggle (right side) → PATCH /api/v1/products/:id
- Tap → edit product
- Swipe left → delete (with confirm)

ADD PRODUCT SCREEN:
- Product name input
- Category dropdown
- Price input (numeric, ₹ prefix)
- Unit input (e.g. "500g", "1 litre", "piece")
- Stock quantity input
- Description (optional)
- Photo:
  - "Take Photo" button → expo-camera
  - "Choose from Gallery" → expo-image-picker
  - Image preview + retake option
- "Add Product" → POST /api/v1/shops/:id/products

CSV BULK UPLOAD (bottom of screen):
- "Upload CSV for bulk products" link
- Download template button
- File picker → POST /api/v1/shops/:id/products/bulk
- Progress: "Adding 47 products..." with progress bar
- Result: "47 added · 2 errors" with error details

---

### PROMPT S4 — Shop Analytics Screen

/nearby-task

Use nearby-ui agent. Build the Analytics screen for shop owners.

File: apps/shop/src/screens/AnalyticsScreen.tsx

ANALYTICS SCREEN:
- Period selector: Today · 7 Days · 30 Days · 90 Days
- Key metrics row:
  - Total Orders
  - Gross Revenue
  - Completion Rate
  - Avg Rating
- Revenue chart (line graph, daily) using react-native-chart-kit
- Top 5 products table: name · orders · revenue
- Peak hours heatmap (7 days × 24 hours grid, color intensity = order volume)
- Customer stats: New vs Returning %
- Trust score breakdown (tap for detail):
  - Rating component: X.X
  - Completion rate: XX%
  - Response score: X.X
  - Verified bonus: ✓

===========================================================
## SECTION 4 — DELIVERY PARTNER APP (React Native + Expo)
## apps/delivery/
===========================================================

---

### PROMPT D1 — Delivery App + Go Online Screen

/nearby-task

Use nearby-ui agent. Set up and build the Delivery Partner app.

Project: apps/delivery/ (same dependencies)
Bundle ID: com.nearby.delivery

HOME SCREEN (apps/delivery/src/screens/HomeScreen.tsx):

ONLINE/OFFLINE toggle (most prominent element):
- Full width, large
- ONLINE: green "You are Online · Accepting deliveries"
- OFFLINE: grey "You are Offline"
- Toggle → POST /api/v1/delivery/availability { is_available: true/false }

When ONLINE:
- "Waiting for delivery requests..."
- Today's earnings: ₹340
- Deliveries completed today: 8
- New delivery request: full screen overlay (see D2)

When OFFLINE:
- "Go online to start earning"
- Weekly earnings summary
- Settlement status

---

### PROMPT D2 — Active Delivery Screen

/nearby-task

Use nearby-ui agent. Build the Active Delivery screen for delivery partners.

File: apps/delivery/src/screens/ActiveDeliveryScreen.tsx
File: apps/delivery/src/hooks/useDelivery.ts
File: apps/delivery/src/services/locationService.ts

NEW DELIVERY REQUEST OVERLAY (full screen, dismisses after 60s):
- Shop name + distance: "Ramesh Kirana · 800m"
- Customer area: "Kukatpally"
- Estimated earnings: ₹35
- Distance: 2.4 km total
- ACCEPT (large green) / DECLINE (smaller outlined)
- Countdown timer ring around accept button

ACTIVE DELIVERY SCREEN (after accept):
Phase 1 — Go to shop:
- Map with route: current location → shop
- Shop name + address
- "Navigate" button (opens Ola Maps / Google Maps)
- "Mark as Picked Up" large button (bottom)

Phase 2 — Go to customer (after pickup):
- Map with route: current location → customer
- Customer area (not full address for privacy)
- "Navigate" button
- OTP entry: 6-digit input
- "Confirm Delivery" button → PATCH /api/v1/delivery/:id/deliver { otp }

GPS TRACKING (background):
- locationService sends GPS every 5 seconds when active
- POST /api/v1/delivery/:id/location { lat, lng }
- Continues even when app is backgrounded (expo-task-manager)
- Stops automatically when delivery confirmed

OTP CONFIRMATION:
- 6 individual boxes
- "Customer will show you this OTP"
- Wrong OTP: "Incorrect OTP, try again (X attempts left)"
- On success: success animation → Earnings summary

===========================================================
## SECTION 5 — BACKEND API ADDITIONS FOR FRONTEND
## (New endpoints needed by the UI)
===========================================================

---

### PROMPT B1 — Featured + Trending Products API

/nearby-task

Use nearby-builder agent (Haiku). Build the featured and trending products API endpoints needed by the web frontend.

Files to create:
- backend/src/routes/featured.js
- backend/src/services/FeaturedService.js
- backend/src/validators/featured.js

New Supabase migration needed:
- supabase/migrations/010_featured_products.sql

Migration content:
CREATE TABLE featured_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE trending_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  trending_label VARCHAR(50) NOT NULL DEFAULT '🔥 Hot this week',
  position INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ENDPOINTS:

GET /api/v1/featured-products (public, no auth)
- Returns active featured products with product + shop details
- Ordered by position ASC
- Max 8 results
- Include: id, name, price, unit, image_url, shop.name, shop.trust_score, shop.is_open, shop.distance (requires lat/lng query params, optional)

GET /api/v1/trending-products (public, no auth)
- Same shape + trending_label field
- Max 12 results

POST /api/v1/admin/featured-products (admin only)
PATCH /api/v1/admin/featured-products/:id (admin only)
DELETE /api/v1/admin/featured-products/:id (admin only)
PATCH /api/v1/admin/featured-products/reorder (admin only) — body: { positions: [{id, position}] }

POST /api/v1/admin/trending-products (admin only)
PATCH /api/v1/admin/trending-products/:id (admin only)
DELETE /api/v1/admin/trending-products/:id (admin only)
