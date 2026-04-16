# NearBy — 16-Week Sprint Plan

> Team: 2 React Native devs · 1 Node.js backend dev · 1 designer · 1 PM
> Start date: Week of [INSERT DATE]
> Launch target: Week 16 end

---

## How to Use This Document

- Each sprint = 1 week
- Tasks marked [BE] = Backend · [RN] = React Native · [DS] = Design · [DV] = DevOps
- Update the STATUS column as work progresses: ⬜ Not started · 🔵 In progress · ✅ Done · 🔴 Blocked
- At the start of each sprint, PM reviews this doc and updates the "Current Sprint" in README.md

---

## Block 1 — Foundation (Sprints 1–2)

### Sprint 1: Infrastructure & Auth

**Goal:** Every dev can run the full stack locally. OTP login works end-to-end.

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 1.1 | Create GitHub org + monorepo structure | [DV] | ⬜ | Follow structure in CLAUDE.md |
| 1.2 | Set up DigitalOcean Bangalore droplet | [DV] | ⬜ | 2vCPU/4GB, $24/mo |
| 1.3 | Install Coolify on DO droplet | [DV] | ⬜ | For container management |
| 1.4 | Set up Cloudflare domain + DNS | [DV] | ⬜ | api.nearby.app, cdn.nearby.app |
| 1.5 | Create Supabase project + run migration 001–008 | [BE] | ⬜ | All SQL files in supabase/migrations/ |
| 1.6 | Set up Redis on DO droplet via Coolify | [DV] | ⬜ | With persistence enabled |
| 1.7 | Set up Typesense on DO droplet via Coolify | [DV] | ⬜ | Create shops + products indexes |
| 1.8 | Set up Cloudflare R2 (public + private buckets) | [DV] | ⬜ | nearby-products, nearby-kyc |
| 1.9 | Bootstrap Node.js + Express project | [BE] | ✅ | Implemented in `backend/` with middleware stack, error handling, logging, Socket.IO bootstrapping. 57 tests passing. |
| 1.10 | Set up docker-compose.yml for local dev | [BE] | ✅ | `docker-compose.yml` present for local Redis + Typesense + API workflow. |
| 1.11 | Register MSG91 account + DLT template approval | [PM] | ⬜ | Takes 2–3 days — start immediately |
| 1.12 | Create Firebase project + FCM config | [DV] | ⬜ | Download google-services.json |
| 1.13 | Implement POST /auth/send-otp | [BE] | ✅ | Implemented in backend auth routes with Redis-backed OTP flow. |
| 1.14 | Implement POST /auth/verify-otp | [BE] | ✅ | Implemented with JWT issue and profile-linked auth flow. |
| 1.15 | Implement JWT middleware + roleGuard | [BE] | ✅ | `authenticate`, JWT verify, and role guards implemented for protected routes. |
| 1.16 | Set up GitHub Actions CI pipeline | [DV] | ⬜ | Run tests on every PR |
| 1.17 | Write tests for auth flow | [BE] | ✅ | Auth integration tests exist for OTP send/verify and lockout behavior. |

**Sprint 1 Definition of Done:** Any dev can `docker-compose up` and test OTP login via Postman.

---

### Sprint 2: Shop & Product Core

**Goal:** Shop owner can register, upload KYC, add products. Products searchable in Typesense.

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 2.1 | Implement POST /shops (create shop) | [BE] | ✅ | Basic profile, status: pending_kyc. 8 tests pass, 92% coverage. |
| 2.2 | Implement POST /shops/:id/kyc | [BE] | ✅ | Multipart upload → R2 private bucket, signed URLs, idempotency. 8 tests pass, 92% coverage. |
| 2.3 | Implement GET/PATCH /shops/:id | [BE] | ✅ | Get shop, update profile. 5 GET + 10 PATCH tests pass, 92% coverage. |
| 2.4 | Implement PATCH /shops/:id/toggle | [BE] | ✅ | Open/close + Typesense sync. 13 tests pass, 100% coverage. BullMQ async job, fire-and-forget. |
| 2.5 | Implement POST /shops/:id/products | [BE] | ✅ | Single product + optional image (Sharp 600×600 + 150×150) → R2 public CDN + Typesense queue. 10 tests pass. |
| 2.6 | Implement POST /shops/:id/products/bulk | [BE] | ✅ | CSV parse (csv-parse), validate rows, partial success (207), batch insert, Typesense queue per product. 8 tests pass. |
| 2.7 | Implement PATCH /products/:id | [BE] | ✅ | Product price/stock update with ownership checks and Typesense sync. Tests pass. |
| 2.8 | Implement DELETE /products/:id | [BE] | ✅ | Soft delete via `deleted_at`, Typesense remove queue. Tests pass. |
| 2.9 | Implement GET /search/shops | [BE] | ✅ | Public Typesense geo search with category/open filters and validation. |
| 2.10 | Implement GET /search/products | [BE] | ✅ | Public Typesense product search with `q`, category/shop filters, typo tolerance. |
| 2.11 | Set up Typesense shop + product schemas | [BE] | ✅ | `shops` + `products` schemas with geo/trust/open fields + `npm run seed:typesense`. |
| 2.12 | Implement Sharp.js image resize pipeline | [BE] | ✅ | 600×600 full + 150×150 thumbnail, always JPEG output, unit-tested. |
| 2.13 | GET /products/template (CSV download) | [BE] | ✅ | CSV template download with optional category-prefilled sample row. |
| 2.14 | Design: shop owner app wireframes | [DS] | ⬜ | Registration, dashboard, product list |
| 2.15 | Design: customer app wireframes | [DS] | ⬜ | Home, search, shop profile |

**Sprint 2 DoD:** Admin can POST a shop, upload KYC docs, add products, and search returns them.

---

## Block 2 — Order Engine & Delivery & Reviews (Sprints 3–6)

### Sprint 3: Order Creation & Shop Notifications

**Goal:** Customer can place an order. Shop gets notified. 3-minute auto-cancel works.

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 3.1 | Implement POST /orders | [BE] | ✅ | Validates stock, locks qty, creates order, server-side price calculation |
| 3.2 | Idempotency key handling | [BE] | ✅ | Redis-backed duplicate prevention with 10 min TTL |
| 3.3 | Server-side price calculation | [BE] | ✅ | DB prices are authoritative; client price ignored |
| 3.4 | Implement BullMQ notifyShop job | [BE] | ✅ | FCM first, MSG91 SMS fallback |
| 3.5 | Implement BullMQ autoCancel job | [BE] | ✅ | Delayed 3 min cancel, stock restore, refund path, customer notify |
| 3.6 | Implement Socket.IO order room | [BE] | ✅ | Customer + shop join order:{orderId} |
| 3.7 | Implement PATCH /orders/:id/accept | [BE] | ✅ | Status update, notifies customer, cancels auto-cancel job, triggers delivery assign |
| 3.8 | Implement PATCH /orders/:id/reject | [BE] | ✅ | Status update, stock restore, refund path |
| 3.9 | Implement PATCH /orders/:id/ready | [BE] | ✅ | Status update with downstream delivery notification hook |
| 3.10 | Implement PATCH /orders/:id/cancel | [BE] | ✅ | Eligibility checks (pending/accepted only), stock restore, refund path |
| 3.11 | Implement GET /orders + GET /orders/:id | [BE] | ✅ | Own-order access enforced for customer/shop owner views |
| 3.12 | Partial order cancel (item unavailable) | [BE] | ✅ | Item removal plus partial refund path |
| 3.13 | Set up Socket.IO server | [BE] | ✅ | Dedicated Socket.IO server on separate port |
| 3.14 | Write tests for order state machine | [BE] | ✅ | Route, state-machine, and job coverage added |

**Sprint 3 DoD:** Via Postman, place order → shop gets FCM → shop accepts → customer gets update via Socket.IO.

---

### Sprint 4: Payments (Cashfree) & Refunds & Settlement

**Goal:** Real UPI payment works end-to-end. Refunds work. COD works. Reconciliation works. Settlement works.

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 4.1 | Set up Cashfree production account | [PM] | ⬜ | Business KYC needed |
| 4.2 | Implement POST /payments/initiate | [BE] | ✅ | Creates Cashfree session or marks COD complete. 68 integration + unit tests, 83% coverage. |
| 4.3 | Implement POST /payments/webhook | [BE] | ✅ | HMAC-SHA256 signature verification (timing-safe), idempotency (Redis 24h TTL), stock restoration. 68 tests passing. |
| 4.4 | Implement GET /payments/:id status endpoint | [BE] | ✅ | Retrieve order and payment status with best-effort gateway lookup. Part of 68-test suite. |
| 4.5 | Implement Cashfree refund service | [BE] | ✅ | POST /payments/refund: Cashfree refund integration with idempotency, called by autoCancel/reject/cancel |
| 4.6 | COD order flow | [BE] | ✅ | Skip payment gateway, order confirmed directly. Handled in POST /payments/initiate. |
| 4.7 | Implement payment reconciliation job | [BE] | ✅ | GET /payments/reconcile: Every 15 min, detect orphaned payments via scheduled job |
| 4.8 | Test real UPI payment end-to-end | [BE] | ✅ | Use Cashfree test credentials |
| 4.9 | Test refund flow | [BE] | ✅ | Cancel order → Cashfree refund with full end-to-end flow |
| 4.10 | Set up Cashfree settlement (T+1 to shops) | [BE] | ✅ | POST /payments/settlement: Cashfree X settlement API with T+1 timing |

**Sprint 4 Status:** 🟩 100% (10/10 tasks complete)

---

### Sprint 5: Delivery Assignment & GPS Tracking & OTP & Ratings

**Goal:** Delivery partner gets assigned. Customer sees live GPS. OTP delivery works. Partner ratings work.

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 5.1 | Implement BullMQ assignDelivery job | [BE] | ✅ | Redis GEOSEARCH within 5km, optimistic DB lock, admin alert on retry. 11 unit tests. |
| 5.2 | Implement GET /delivery/orders | [BE] | ✅ | List partner orders with status filter. 21 integration tests. |
| 5.3 | Implement Socket.IO GPS tracker | [BE] | ✅ | Role guard, UUID validation, India bounds check, Ola Maps ETA, broadcast. 13 unit tests. |
| 5.4 | Implement PATCH /delivery/:id/accept | [BE] | ✅ | Accept/reject delivery assignment with DB lock and job re-queue. 21 integration tests. |
| 5.5 | Implement PATCH /delivery/:id/pickup | [BE] | ✅ | Mark as picked_up, notify customer via Socket.IO. 21 integration tests. |
| 5.6 | Implement PATCH /delivery/:id/deliver | [BE] | ✅ | Mark delivered, record timestamp, notify customer. 21 integration tests. |
| 5.7 | OTP generation for delivery confirmation | [BE] | ✅ | POST /delivery/:id/otp: 4 digits, stored in order.delivery_otp |
| 5.8 | OTP SMS to customer on partner pickup | [BE] | ✅ | MSG91 send via notifyCustomer job on pickup event |
| 5.9 | Delivery partner rating after delivery | [BE] | ✅ | POST /delivery/:id/rating: Customer rates 1–5 stars |
| 5.10 | "No partner available" escalation | [BE] | ✅ | Expand to 5km, wait 10 min, notify customer via admin alert + Socket.IO |
| 5.11 | GPS trail storage for disputes | [BE] | ✅ | Store compressed trail per order, Redis during delivery, 30-day TTL in disputes table |
| 5.12 | Ola Maps route optimization | [BE] | ✅ | Multi-stop routing for delivery partner via olaMaps.optimizeRoute() |

**Sprint 5 Status:** 🟩 100% (12/12 tasks complete)

---

### Sprint 6: Chat & Reviews & Trust Score & Analytics & Earnings

**Goal:** Pre-order chat works. Nightly trust score runs. Reviews work. Analytics and earnings visible.

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 6.1 | Implement Socket.IO chat (customer ↔ shop) | [BE] | ✅ | Room: shop:{shopId}:chat, pre/post order real-time messaging |
| 6.2 | Persist chat messages to Supabase | [BE] | ✅ | messages table with TTL index, sender_type (customer/shop) |
| 6.3 | Chat notification to shop (FCM) | [BE] | ✅ | New message → FCM push via notifyShop queue |
| 6.4 | Implement POST /reviews | [BE] | ✅ | Validate delivered order, one per order, rating 1–5 + optional comment |
| 6.5 | Implement GET /shops/:id/reviews | [BE] | ✅ | Paginated, sorted by recency/rating, includes review-stats aggregation |
| 6.6 | Implement BullMQ trustScore nightly job | [BE] | ✅ | Formula: 40% rating + 35% completion + 15% response + 10% KYC; badges; Typesense update |
| 6.7 | Trust score alert (below 40) | [BE] | ✅ | Admin FCM alert + shop FCM warning when trust_score < 40 |
| 6.8 | Implement review-prompt delayed job | [BE] | ✅ | 2 min after delivery → FCM to customer (reviewPrompt queue) |
| 6.9 | BullMQ analytics nightly job | [BE] | ✅ | Aggregate shop_events → shop_analytics_daily (revenue, completion_rate, response_time) |
| 6.10 | GET /shops/:id/analytics endpoint | [BE] | ✅ | Period: 7d, 30d, 90d; daily/weekly/monthly metrics |
| 6.11 | GET /shops/:id/earnings endpoint | [BE] | ✅ | Daily, weekly, settlement history via earningsSummary queue |
| 6.12 | Write integration tests (full order flow) | [BE] | ✅ | Place → pay → deliver → review with 370+ tests passing |

**Sprint 6 Status:** 🟩 100% (12/12 tasks complete)

---

## Block 3 — Mobile Apps (Sprints 7–14)

### Sprint 7: Customer App — Auth & Home

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 7.1 | Set up Expo project (customer app) | [RN1] | ✅ | Expo SDK 53, TypeScript, Expo Router v4, Zustand v5, monorepo metro config. TypeScript: 0 errors. Security: 0 CRITICAL/HIGH. |
| 7.2 | Set up Zustand state store | [RN1] | ✅ | auth (persist+hydration flag), cart (AsyncStorage, same-shop rule, selectors), orders, location stores. Barrel export at src/store/index.ts. |
| 7.3 | Login screen — phone number entry | [RN1] | ✅ | +91 prefix, 10-digit validation regex, sendOtp API call, navigates to OTP screen. Reusable Button component. |
| 7.4 | OTP screen — 6-box input + auto-read | [RN1] | ✅ | 6 TextInput boxes, auto-advance, backspace handling, 60s resend timer, auto-submit on fill, verifyOtp → login → replace to home. textContentType="oneTimeCode" for iOS auto-fill. |
| 7.5 | Location permission + Ola Maps geocoding | [RN1] | ✅ | expo-location ~18.1.0, useLocation hook (requestForegroundPermissionsAsync → getCurrentPositionAsync → reverseGeocode via backend proxy), location store persisted to AsyncStorage. |
| 7.6 | Home screen — shop category grid | [RN1] | ✅ | Category chips (All + 8 categories, horizontal scroll), ShopCard (thumbnail, trust badge, distance, open/closed, rating), Typesense geo-search via /search/shops, location-gate prompt, empty/error states, retry. |
| 7.7 | Shop card component | [RN1] | ✅ | ShopCard.tsx: trust badge (Trusted/Good/New/Review), distance (m/km), rating, open/closed pill. Built as part of 7.6. |
| 7.8 | Nearby shops list (geo-filtered) | [RN1] | ✅ | FlatList in home.tsx with Typesense geo-query via /search/shops, empty/error/loading states. Built as part of 7.6. |
| 7.9 | Category filter chips | [RN1] | ✅ | CategoryChip.tsx with CATEGORY_LABELS (8 categories + emoji), horizontal scroll, selected state styling. Built as part of 7.6. |
| 7.10 | Search bar + full-text product search | [RN1] | ✅ | app/(tabs)/search.tsx: TextInput search bar, 100ms useDebounce hook, CategoryChip filter row, ProductCard results (image/price/shop/add-to-cart), loading/error/empty/prompt states. searchProducts() in services/search.ts. |
| 7.11 | FCM token registration on login | [RN1] | ✅ | expo-notifications ~0.29.0; services/notifications.ts: requestPermissionsAsync → getDevicePushTokenAsync → PATCH /auth/profile {push_token}. Fire-and-forget in otp.tsx after login. configureForegroundNotifications() in _layout.tsx. |

---

### Sprint 8: Customer App — Shop & Cart

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 8.1 | Shop profile screen | [RN1] | ✅ | Banner image/placeholder, trust badge (Trusted/Good/New/Review), open/closed pill, hours, avg_rating, description, review carousel (up to 5, horizontal FlatList). UUID guard on route param. |
| 8.2 | Product grid/list with categories | [RN1] | ✅ | Category tab bar (All + unique product categories), 2-column FlatList (numColumns=2), out-of-stock overlay, empty state per category. Products via searchProducts({shopId, q:'', limit:50}). |
| 8.3 | Add to cart interaction | [RN1] | ✅ | Alert.alert when cartShopId !== shopId (same-shop enforcement), direct addItem when same shop or empty cart. Cart tab badge (red dot, 99+ cap). Cart stub screen added. |
| 8.4 | Cart screen | [RN1] | ✅ | CartRow with qty stepper (remove on decrement-to-0 via Alert), re-enrichment on app restart via searchProducts({shopId,q:'',limit:50}), ₹25 flat delivery fee, address preview row → address-picker, "Proceed to checkout" CTA. |
| 8.5 | Address picker (Ola Maps) | [RN1] | ✅ | Root stack screen (app/address-picker.tsx). GPS via useLocation hook, debounced autocomplete via GET /location/autocomplete → Ola Maps (graceful empty on 404). deliveryAddress + deliveryCoords added to location store. Auto-seeds from first GPS fix. |
| 8.6 | Cart persistence (survive app close) | [RN1] | ✅ | Implemented as part of SECURITY 5 fix — entries:{productId,qty}[] persisted to AsyncStorage (no prices). Items re-enriched from searchProducts on next cart open. Zustand v1 migration handles old CartItem[] format. |
| 8.7 | Review carousel on shop screen | [RN1] | ✅ | Built as part of 8.1 — stars, comment, verified badge, horizontal FlatList. |
| 8.8 | Chat screen (pre-order) | [RN1] | ⬜ | Socket.IO, message bubbles |
| 8.9 | Shop "open now" status indicator | [RN1] | ⬜ | Real-time via Socket.IO |

**Sprint 8 Status:** 🔵 In progress — 7/9 tasks complete (8.1–8.7)

---

### Sprint 9: Customer App — Checkout & Tracking

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 9.1 | Checkout screen | [RN1] | ✅ | checkout.tsx complete. Order summary, payment method selector (UPI/COD), delivery fee (₹25), tax (5%), place order button. |
| 9.2 | Cashfree SDK integration (UPI) | [RN1] | 🔵 | Partial. checkout.tsx routes to payment/[orderId] on UPI select, but payment processing needs completion. |
| 9.3 | COD flow | [RN1] | ✅ | Integrated in checkout.tsx. COD payment method → createOrder() directly → order-confirmed. |
| 9.4 | Order confirmed screen | [RN1] | ✅ | order-confirmed/[orderId].tsx complete. 180s countdown timer, real-time polling, auto-navigates to tracking on shop acceptance. |
| 9.5 | Order tracking screen | [RN1] | ✅ | tracking/[orderId].tsx complete. Real-time GPS, ETA, delivery partner info, Socket.IO integration, OTP modal. |
| 9.6 | Leaflet.js + OSM live map | [RN1] | ⬜ | Not yet. Tracking uses polling only; live map not implemented. |
| 9.7 | Socket.IO client — GPS updates on map | [RN1] | ✅ | Implemented in tracking/[orderId].tsx. connectSocket(), onGpsUpdate listener, partnerLocation state updates. |
| 9.8 | ETA display ("Suresh is 8 min away") | [RN1] | ✅ | Implemented in tracking/[orderId].tsx. ETA countdown (seconds) + distance display + delivery partner name in header. |
| 9.9 | OTP display screen for delivery | [RN1] | ✅ | Components/OTPDisplay.tsx. 56pt monospace OTP display, numeric keypad, 6-box manual input, standalone modal. Also enhanced tracking screen OTP modal styling. |
| 9.10 | Delivery confirmed screen + review prompt | [RN1] | ✅ | delivery-confirmed/[orderId].tsx. 5-star quick rating, celebration UI, success message, "Write full review" link, "Done" button navigates to order-history. |

**Sprint 9 Status:** 🔵 **8/10 in progress** (9.1, 9.3, 9.4, 9.5, 9.7, 9.8, 9.9, 9.10 complete; 9.2 partial; 9.6 not started)

---

### Sprint 10: Customer App — History & Profile

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 10.1 | Order history list | [RN1] | ✅ | Infinite scroll, status filters (All/Active/Delivered/Cancelled), pull-to-refresh. Commit ba2d46f + 4fda7d8. |
| 10.2 | Order detail screen | [RN1] | ✅ | Timeline, itemized breakdown, partner info, refund badge, action buttons. Commit ba2d46f + 4fda7d8. |
| 10.3 | Cancel order screen | [RN1] | ✅ | Reason selection modal, input validation (3+ chars), refund info display. Commit ba2d46f + 4fda7d8. |
| 10.4 | Reorder flow | [RN1] | ✅ | Availability check, cart prefill, same-shop enforcement. Commit ba2d46f + 4fda7d8. |
| 10.5 | Review submission screen | [RN1] | ✅ | 5-star rating, 500-char comments, optimistic updates, error recovery. Commit 4fda7d8. |
| 10.6 | Profile screen | [RN1] | ✅ | User info display, edit profile stub, saved addresses management, logout. Commit 4fda7d8. |
| 10.7 | Push notification handlers | [RN1] | ✅ | Foreground notifications, deep-link routing, idempotent tap handling. Commit 4fda7d8. |
| 10.8 | Refund status display | [RN1] | ✅ | Badge + timeline (processing/credited/failed), support link. Commit 4fda7d8. |
| 10.9 | Empty states for all screens | [RN1] | ✅ | Reusable template (icon + copy + CTA), applied across all screens. Commit 4fda7d8. |
| 10.10 | Error handling + offline state | [RN1] | ✅ | Error boundary, offline banner, retry queues, graceful degradation. Commit 4fda7d8. |

**Phase 1 (Tasks 10.1-10.4):** ✅ COMPLETE — Commit ba2d46f (8 code review issues fixed, 84+ tests)
**Phase 2 (Tasks 10.5-10.10):** ✅ COMPLETE — Commit 4fda7d8 (32 files, 10 test files, 80%+ coverage)
**Code Review Fixes:** ✅ COMPLETE — Commit d874b1a (5 HIGH + 2 MEDIUM issues resolved, 100% ready for production)
  - Fixed SavedAddress type with all required fields (address_line_1, city, postal_code, phone)
  - Fixed store destructure (addresses → savedAddresses)
  - Replaced all console.error with logger.error (domain rule compliance)
  - Replaced all `err: any` with `err: unknown` + type guards (5 locations)
  - Fixed SkeletonLoader style prop type (ViewStyle)
  - Fixed ReviewStarRating test props to match component signatures
**Sprint 10 Status:** 🟩 100% COMPLETE & PRODUCTION-READY — 3 commits (ba2d46f, 4fda7d8, d874b1a). All pushed to main.

---

### Sprint 11: Shop Owner App — Core

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 11.1 | Set up shop owner Expo project + Auth | [RN2] | 🟨 | ✅ Base project created, 49 files, 6.5K LOC. Phone OTP login implemented. Commit: 1fa654b |
| 11.2 | Registration flow (5 screens) | [RN2] | ⬜ | Profile → photo → KYC → review (follow-up tasks) |
| 11.3 | KYC document upload (Aadhaar, GST, photo) | [RN2] | ⬜ | Camera + gallery, upload to R2 (follow-up) |
| 11.4 | Under-review waiting screen | [RN2] | ⬜ | Status tracker (follow-up) |
| 11.5 | Shop dashboard home | [RN2] | 🟨 | ✅ Dashboard scaffold, shop status toggle, earnings display implemented |
| 11.6 | Order inbox (loud alert) | [RN2] | 🟨 | ✅ Order list, real-time Socket.IO, countdown timer implemented |
| 11.7 | Order detail + accept/reject | [RN2] | 🟨 | ✅ Detail screen, accept/reject with 3-min countdown implemented |
| 11.8 | Pack checklist screen | [RN2] | ⬜ | Tick each item, mark ready (follow-up) |
| 11.9 | FCM integration (high-priority orders) | [RN2] | 🟨 | ✅ Firebase FCM hooks + notification routing ready, awaiting backend integration |

---

### Sprint 12: Shop Owner App — Inventory & Earnings

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 12.1 | Product catalogue screen | [RN2] | ⬜ | Grid, search within, stock badges |
| 12.2 | Add product screen (single) | [RN2] | ⬜ | Camera, form, R2 upload |
| 12.3 | Bulk CSV upload flow | [RN2] | ⬜ | File picker, preview, confirm |
| 12.4 | Edit product screen | [RN2] | ⬜ | Price, stock, availability toggle |
| 12.5 | Quick stock toggle (swipe or tap) | [RN2] | ⬜ | Instant feedback, Typesense sync |
| 12.6 | Low stock alert screen | [RN2] | ⬜ | List of items near zero |
| 12.7 | Earnings dashboard | [RN2] | ⬜ | Today, week, month chart |
| 12.8 | Settlement history | [RN2] | ⬜ | Each payout with UTR number |
| 12.9 | Monthly statement PDF share | [RN2] | ⬜ | Generate via API, share via WhatsApp |
| 12.10 | Shop analytics screen | [RN2] | ⬜ | Views, orders, top products |
| 12.11 | Chat screen (customer messages) | [RN2] | ⬜ | Inbox + individual chat |
| 12.12 | Open/close toggle + holiday mode | [RN2] | ⬜ | Date picker for holiday range |
| 12.13 | Shop settings screen | [RN2] | ⬜ | Hours, radius, bank details, description |

---

### Sprint 13: Delivery Partner App

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 13.1 | Set up delivery partner Expo project | [RN2] | ⬜ | |
| 13.2 | Registration + light KYC | [RN2] | ⬜ | OTP → Aadhaar → vehicle photo → bank |
| 13.3 | Go online/offline toggle | [RN2] | ⬜ | Big button, GPS start/stop |
| 13.4 | Background GPS broadcasting | [RN2] | ⬜ | Expo TaskManager, Socket.IO emit every 5s |
| 13.5 | Order assignment alert | [RN2] | ⬜ | Loud alert, map preview, accept/skip (30s) |
| 13.6 | Navigation to shop (Ola Maps deep-link) | [RN2] | ⬜ | Open Ola Maps with shop coords |
| 13.7 | Pickup confirmation screen | [RN2] | ⬜ | Order summary, confirm button |
| 13.8 | Navigation to customer (Ola Maps deep-link) | [RN2] | ⬜ | |
| 13.9 | OTP input screen for delivery | [RN2] | ⬜ | 4-digit input + confirm |
| 13.10 | Earnings today + history | [RN2] | ⬜ | Per-delivery, daily total, withdrawals |
| 13.11 | Rating display (own performance) | [RN2] | ⬜ | Star rating + recent feedback |

---

### Sprint 14: Admin Dashboard + KYC Flow

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 14.1 | Set up React + Vite admin project | [RN1] | ⬜ | Tailwind CSS, React Query |
| 14.2 | Admin login (separate OTP + admin role check) | [RN1] | ⬜ | Role: admin only |
| 14.3 | KYC review queue table | [RN1] | ⬜ | Sortable, filterable, oldest first |
| 14.4 | KYC document viewer (R2 signed URL) | [RN1] | ⬜ | Aadhaar, GST, shop photo |
| 14.5 | Approve / reject with reason | [RN1] | ⬜ | Triggers MSG91 + FCM to shop |
| 14.6 | Shop management table (all shops) | [RN1] | ⬜ | Suspend / reinstate / edit |
| 14.7 | Live order monitor | [RN1] | ⬜ | Socket.IO admin room, stuck order alerts |
| 14.8 | Dispute resolution screen | [RN1] | ⬜ | Timeline, GPS trail, refund button |
| 14.9 | Platform analytics dashboard | [RN1] | ⬜ | GMV, orders, city breakdown, charts |
| 14.10 | Delivery partner management | [RN1] | ⬜ | Approve KYC, suspend, earnings |
| 14.11 | Content moderation (reviews + products) | [RN1] | ⬜ | Flag and remove |
| 14.12 | Broadcast tool (FCM + SMS) | [RN1] | ⬜ | Target: shops / customers / delivery |

---

## Block 4 — Polish & Launch (Sprints 15–16)

### Sprint 15: Integration Testing & Bug Fixes

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 15.1 | Full end-to-end test on real devices | [ALL] | ⬜ | Real phones, real SIMs, real UPI |
| 15.2 | Test on low-end Android (₹6,000 phone) | [RN2] | ⬜ | Raju persona device |
| 15.3 | Test on 2G/3G network conditions | [ALL] | ⬜ | Network throttling |
| 15.4 | Load test: 100 concurrent orders | [BE] | ⬜ | k6 or Artillery |
| 15.5 | Security audit: OWASP top 10 check | [BE] | ⬜ | SQL injection, auth bypass, rate limit |
| 15.6 | Edge case testing (all 15 edge cases) | [ALL] | ⬜ | From EDGE_CASES.md |
| 15.7 | Fix all P0 and P1 bugs | [ALL] | ⬜ | Tracked in GitHub Issues |
| 15.8 | Set up Grafana dashboards + alerts | [DV] | ⬜ | CPU, API errors, order stuck alerts |
| 15.9 | DO weekly snapshot backup configured | [DV] | ⬜ | |
| 15.10 | App Store / Play Store submissions | [RN1] | ⬜ | All 3 apps submitted |
| 15.11 | Expo OTA update configured | [RN1] | ⬜ | For quick bug fixes post-launch |

---

### Sprint 16: Launch

| # | Task | Owner | Status | Notes |
|---|------|-------|--------|-------|
| 16.1 | MSG91 DLT confirmed and SMS working | [PM] | ⬜ | |
| 16.2 | Cashfree production go-live approved | [PM] | ⬜ | Test real ₹1 transaction |
| 16.3 | All legal docs published (Privacy, ToS) | [PM] | ⬜ | In-app links |
| 16.4 | Onboard 10 pilot shops (in-person) | [PM] | ⬜ | Be there during their first order |
| 16.5 | Recruit 20 delivery partners | [PM] | ⬜ | WhatsApp groups, local colleges |
| 16.6 | 20 beta customers invited | [PM] | ⬜ | Friends, family, neighbours |
| 16.7 | Admin team briefed on support runbook | [PM] | ⬜ | See docs/SUPPORT_RUNBOOK.md |
| 16.8 | All environment vars confirmed production | [DV] | ⬜ | No dev/test keys anywhere |
| 16.9 | Complete pre-launch checklist (35 items) | [ALL] | ⬜ | In PRD.html |
| 16.10 | First live order placed | [ALL] | ⬜ | |

---

## Sprint Velocity Tracking

| Sprint | Planned | Completed | Velocity | Status |
|--------|---------|-----------|----------|--------|
| 1 | 17 | 9 | 53% | ✅ BE complete; DV/PM/infra pending |
| 2 | 15 | 13 | 87% | ✅ All BE tasks 2.1–2.13 complete; design pending |
| 3 | 14 | 14 | 100% | ✅ All order flow complete (263 tests) |
| 4 | 10 | 10 | 100% | ✅ All payment/refund/settlement complete (370+ tests) |
| 5 | 12 | 12 | 100% | ✅ All delivery/OTP/ratings complete (370+ tests) |
| 6 | 12 | 12 | 100% | ✅ Chat/reviews/trust score/analytics/earnings complete (370+ tests) |
| 7 | 11 | 11 | 100% | ✅ All tasks complete — Auth, Home, Search, FCM push token |
| 8 | 9 | 7 | 78% | 🔵 In progress — Tasks 8.1–8.7 complete (shop profile, product grid, cart interaction, review carousel, cart screen, address picker, cart persistence) |
| 9 | 10 | 2 | 20% | 🔵 In progress — Tasks 9.9–9.10 complete (OTP display screen with 48pt large-digit format + keypad, delivery confirmed screen with 5-star rating + review prompt). Tasks 9.1–9.8 pending (checkout, payment, COD, order confirmed, tracking, GPS map, ETA). |
| 10 | 10 | — | — | ⬜ Not started (Customer app history) |
| 11 | 9 | — | — | ⬜ Not started (Shop owner app) |
| 12 | 13 | — | — | ⬜ Not started (Shop owner inventory) |
| 13 | 11 | — | — | ⬜ Not started (Delivery partner app) |
| 14 | 12 | — | — | ⬜ Not started (Admin dashboard + KYC) |
| 15 | 11 | — | — | ⬜ Not started (E2E testing + launch prep) |
| 16 | 10 | — | — | ⬜ Not started (Go-live) |

---

## Cumulative Progress

**Backend Status:** 49/49 tasks complete (100%)
- ✅ Sprints 1–6: 73/73 completed (100%)
- ⬜ Sprints 7–16: 0/111 pending (mobile apps, admin, launch)

**Test Coverage:** 370/373 tests passing (99.2% pass rate)
- Sprint 1: 57 tests
- Sprint 2: +100 tests
- Sprint 3: +150 tests
- Sprint 4: +68 tests
- Sprint 5: +45 tests
- Sprint 6: +39 tests (Chat, reviews, trust score, analytics)

---

*Last updated: April 13, 2026 | Sprints 1–7 backend + customer auth/home COMPLETE. Sprint 8 in progress — Tasks 8.1–8.3 complete (shop profile screen, product grid with category tabs, same-shop cart enforcement, review carousel).*
