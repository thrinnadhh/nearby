# Supabase Database Setup

> Complete guide to running NearBy database migrations locally and in production.
> All migrations are numbered sequentially (001–011) and executed in order.

---

## Quick Start

### Local Development

```bash
# 1. Install Supabase CLI
npm install -g supabase

# 2. Start Supabase locally
supabase start

# 3. Expected output:
# API URL: http://localhost:54321
# Anon Key: eyJ...
# Service Role Key: eyJ...
# Database: localhost:5432

# 4. Run migrations
supabase migration up

# 5. Verify tables created
supabase db list

# 6. View data (SQL Editor)
supabase sql
```

### Production Deployment

```bash
# 1. Create Supabase project on supabase.com
# 2. Link local project to production
supabase link --project-ref YOUR_PROJECT_REF

# 3. Run migrations in production
supabase db push

# 4. Verify in Supabase dashboard
# Go to Dashboard → SQL Editor → Run: SELECT * FROM pg_tables;
```

---

## Migration Files

All migrations are stored in `supabase/migrations/` and numbered in execution order:

### 001_profiles.sql
Creates user profile table and authentication setup.

**Tables:**
- `profiles` — User accounts (customers, shop owners, delivery partners)
  - `id` (UUID) — Primary key
  - `phone` (varchar) — Unique phone number
  - `role` (enum) — customer | shop_owner | delivery | admin
  - `display_name` (varchar)
  - `avatar_url` (varchar) — R2 URL
  - `is_verified` (boolean) — KYC verified
  - `is_active` (boolean)
  - `created_at` (timestamp)

**RLS Policies:**
- Users can only see their own profile
- Admins can see all profiles

---

### 002_shops.sql
Creates shop listings and metadata.

**Tables:**
- `shops` — Shop information
  - `id` (UUID) — Primary key
  - `owner_id` (UUID) — FK to profiles
  - `name` (varchar) — Shop name
  - `category` (varchar) — kirana | pharmacy | restaurant | etc.
  - `description` (text)
  - `phone` (varchar)
  - `is_open` (boolean)
  - `is_verified` (boolean) — KYC approved
  - `trust_score` (numeric) — 0–100
  - `avg_rating` (numeric) — 1–5
  - `total_orders` (integer)
  - `geo` (geometry) — PostGIS point (lat, lng)
  - `address` (text)
  - `city` (varchar)
  - `pincode` (varchar)
  - `opening_time` (time)
  - `closing_time` (time)
  - `created_at` (timestamp)
  - `updated_at` (timestamp)

**Indexes:**
- `idx_shops_geo` — For geo search (3km radius)
- `idx_shops_owner_id` — For shop owner queries
- `idx_shops_category` — For category filtering
- `idx_shops_is_open` — For availability filtering

**RLS Policies:**
- Customers can see verified shops only
- Shop owners can only edit their own shop
- Admins can see all shops

**PostGIS:**
- `geo` column stores point (geometry)
- Queries use `ST_DWithin(geo, point, distance)` for radius search
- Index uses GIST for fast spatial queries

---

### 003_products.sql
Creates product catalog.

**Tables:**
- `products` — Product listings
  - `id` (UUID) — Primary key
  - `shop_id` (UUID) — FK to shops
  - `name` (varchar) — Product name
  - `description` (text)
  - `category` (varchar) — Optional category
  - `price` (integer) — In paise (₹1 = 100 paise)
  - `stock_qty` (integer) — Quantity available
  - `image_url` (varchar) — R2 CDN URL (product-600x600.jpg)
  - `image_thumbnail_url` (varchar) — R2 CDN URL (product-150x150.jpg)
  - `is_active` (boolean) — Soft delete flag
  - `created_at` (timestamp)
  - `updated_at` (timestamp)

**Indexes:**
- `idx_products_shop_id` — For shop's products
- `idx_products_name` — For full-text search (via Typesense)
- `idx_products_is_active` — For availability

**RLS Policies:**
- Customers see only active products from open shops
- Shop owners can only edit their own products
- Admins can see all products

**Note:**
- Actual search (filtering, fuzzy matching) handled by Typesense
- Supabase stores canonical product data + images URLs
- Images stored in Cloudflare R2 (not Supabase)

---

### 004_orders.sql
Creates order and order items tables.

**Tables:**
- `orders` — Order header
  - `id` (UUID) — Primary key
  - `customer_id` (UUID) — FK to profiles
  - `shop_id` (UUID) — FK to shops
  - `delivery_partner_id` (UUID) — FK to delivery partner (when assigned)
  - `status` (enum) — pending | accepted | packing | ready | assigned | picked_up | out_for_delivery | delivered | cancelled | auto_cancelled
  - `total_amount` (integer) — Sum of items + delivery fee (in paise)
  - `delivery_fee` (integer) — in paise (₹0–100)
  - `delivery_address` (text) — Where customer wants delivery
  - `delivery_lat` (numeric)
  - `delivery_lng` (numeric)
  - `payment_mode` (varchar) — cod | upi | card | wallet
  - `payment_status` (varchar) — pending | completed | failed | refunded
  - `cashfree_order_id` (varchar) — For payment reconciliation
  - `idempotency_key` (UUID) — Prevents duplicate orders
  - `notes` (text) — Special instructions
  - `cancellation_reason` (text)
  - `created_at` (timestamp)
  - `updated_at` (timestamp)
  - `delivered_at` (timestamp)

- `order_items` — Items in order
  - `id` (UUID) — Primary key
  - `order_id` (UUID) — FK to orders
  - `product_id` (UUID) — FK to products
  - `quantity` (integer)
  - `unit_price` (integer) — Price at time of order (in paise)
  - `total_price` (integer) — quantity * unit_price (in paise)
  - `status` (varchar) — available | unavailable (if removed by shop)
  - `created_at` (timestamp)

**Indexes:**
- `idx_orders_customer_id` — Customer's order history
- `idx_orders_shop_id` — Shop's orders
- `idx_orders_status` — Filter by status
- `idx_orders_created_at` — Sorting by date
- `idx_orders_delivery_partner_id` — Partner's assignments
- `idx_order_items_product_id` — Product in orders

**RLS Policies:**
- Customers see only their own orders
- Shop owners see only orders for their shops
- Delivery partners see only assigned orders
- Admins see all orders

**Important:**
- `idempotency_key` prevents duplicate order creation (checked in Redis)
- `cashfree_order_id` stores payment gateway reference
- `status` flows: pending → accepted → packing → ready → assigned → picked_up → out_for_delivery → delivered
- Cancellable statuses: pending, accepted (not after picked_up)

---

### 005_reviews.sql
Creates customer reviews and ratings.

**Tables:**
- `reviews` — Customer ratings
  - `id` (UUID) — Primary key
  - `order_id` (UUID) — FK to orders
  - `shop_id` (UUID) — FK to shops
  - `customer_id` (UUID) — FK to profiles
  - `rating` (integer) — 1–5 stars
  - `comment` (text) — Optional review text
  - `photo_url` (varchar) — Optional photo (R2 URL)
  - `delivery_rating` (integer) — 1–5 (for delivery partner feedback)
  - `delivery_comment` (text)
  - `created_at` (timestamp)

**Indexes:**
- `idx_reviews_shop_id` — Shop's reviews
- `idx_reviews_customer_id` — Customer's reviews
- `idx_reviews_order_id` — Link to order

**RLS Policies:**
- Customers can only see reviews
- Shop owners can see reviews of their shops
- Admins can see all reviews

**Triggers:**
- Auto-updates `shops.avg_rating` when review created
- Used for trust score calculation

---

### 006_disputes.sql
Creates dispute tracking for order issues.

**Tables:**
- `disputes` — Order disputes
  - `id` (UUID) — Primary key
  - `order_id` (UUID) — FK to orders
  - `customer_id` (UUID) — FK to profiles
  - `shop_id` (UUID) — FK to shops
  - `reason` (varchar) — wrong_item | missing_item | damaged | quality_issue | other
  - `description` (text) — Details of issue
  - `photo_urls` (varchar[]) — Array of R2 URLs
  - `status` (varchar) — open | investigating | resolved | rejected
  - `resolution` (text) — How it was resolved (refund/replacement/etc.)
  - `refund_amount` (integer) — in paise (if applicable)
  - `created_at` (timestamp)
  - `resolved_at` (timestamp)

**Indexes:**
- `idx_disputes_order_id`
- `idx_disputes_shop_id`
- `idx_disputes_status`

**RLS Policies:**
- Customers see own disputes
- Shop owners see disputes for their orders
- Admins see all disputes

---

### 007_analytics.sql
Creates analytics aggregations for dashboards.

**Tables:**
- `shop_daily_stats` — Daily metrics per shop
  - `id` (UUID)
  - `shop_id` (UUID) — FK to shops
  - `date` (date) — Aggregation date
  - `total_orders` (integer)
  - `total_revenue` (integer) — in paise
  - `avg_rating` (numeric) — From reviews that day
  - `completed_orders` (integer)
  - `cancelled_orders` (integer)
  - `created_at` (timestamp)

- `product_popular_stats` — Most ordered products
  - `id` (UUID)
  - `product_id` (UUID) — FK to products
  - `date` (date)
  - `order_count` (integer)
  - `revenue` (integer) — in paise
  - `created_at` (timestamp)

**Materialized View:**
- `top_shops_by_rating` — Automatically updated nightly
  - Joins `shops` + `reviews` + `orders`
  - Ranked by trust score
  - Refreshed at 2 AM IST via BullMQ scheduled job

**Purpose:**
- Analytics data pre-aggregated (faster queries)
- Admin dashboards show shop performance
- No real-time aggregation (no performance impact)

---

### 008_rls_policies.sql
Defines Row-Level Security (RLS) policies for all tables.

**RLS Overview:**
- Every table (except admin tables) has RLS enabled
- Policies enforce data isolation
- Customers can only see their own data
- Shop owners can only see their shop's data
- Admins see everything (via service role key)

**Policy Examples:**

```sql
-- Customers see only their own orders
CREATE POLICY "customers_see_own_orders" ON orders
FOR SELECT USING (auth.uid() = customer_id OR auth.role() = 'admin');

-- Shop owners see orders for their shops
CREATE POLICY "shop_owners_see_own_shop_orders" ON orders
FOR SELECT USING (
  auth.uid() IN (
    SELECT owner_id FROM shops WHERE id = shop_id
  ) OR auth.role() = 'admin'
);
```

**How RLS Works in NearBy:**
1. User authenticates via OTP → JWT token issued
2. JWT contains: `userId, phone, role, shopId`
3. Backend sends Supabase requests with JWT as Authorization header
4. Supabase RLS checks JWT claims vs. row owner
5. Only authorized rows are returned

**Testing RLS:**
```sql
-- In Supabase SQL Editor, impersonate user:
-- Go to SQL Editor
-- Run: SELECT * FROM orders;
-- Without RLS, you'd see all orders
-- With RLS, you see only your orders

-- To test as different user, use service_role key (only backend)
-- curl -X GET https://YOUR_PROJECT.supabase.co/rest/v1/orders \
--   -H "Authorization: Bearer SERVICE_ROLE_KEY"
```

---

### 009_add_analytics_tables.sql

Creates additional analytics and monitoring tables.

**Tables:**
- `shop_analytics` — Real-time shop performance metrics
  - `id` (UUID) — Primary key
  - `shop_id` (UUID) — FK to shops
  - `metric_name` (varchar) — daily_revenue, completion_rate, avg_response_time, etc.
  - `metric_value` (numeric) — Value of metric
  - `recorded_at` (timestamp) — When metric was recorded
  - `created_at` (timestamp)

- `delivery_partner_stats` — Delivery performance tracking
  - `id` (UUID) — Primary key
  - `delivery_partner_id` (UUID) — FK to profiles
  - `total_deliveries` (integer)
  - `completed_deliveries` (integer)
  - `avg_rating` (numeric) — 1–5 from customers
  - `avg_delivery_time_minutes` (integer)
  - `earnings_total` (integer) — in paise
  - `updated_at` (timestamp)

**Purpose:**
- Tracks shop and delivery partner performance for trust scoring
- Supports admin dashboard metrics
- Used for partner onboarding quality assessment

---

### 010_add_products_soft_delete_flag.sql

Adds soft delete capability for products.

**Changes:**
- Adds `is_active` (boolean) column to `products` table (default: true)
- Soft-deleted products (is_active = false) are hidden from search

**RLS Policies Updated:**
- Customer search queries now filter `WHERE is_active = true`
- Shop owners can view all products (active and soft-deleted) for their shop
- Admin can view all products

**Purpose:**
- Preserves product history for order references
- Allows shop owners to deactivate products without losing order data
- Prevents "product not found" errors on historical orders

---

### 011_add_order_item_partial_cancellations.sql

Adds support for partial item cancellations in orders.

**Changes to `order_items` table:**
- Adds `cancelled_quantity` (integer, default: 0) — How many items were cancelled
- Adds `cancellation_reason` (varchar) — out_of_stock | damaged | unavailable | customer_request
- Adds `cancelled_at` (timestamp) — When cancellation occurred

**Logic:**
- When shop removes items from order: `cancelled_quantity` incremented
- If `cancelled_quantity = quantity`, entire item is effectively cancelled
- Partial refunds calculated: `(cancelled_quantity / quantity) * total_price`

**RLS Policies:**
- Shop owners can update `cancelled_quantity` for their orders
- Customers can view cancellation history
- Admin can view all cancellations

**Purpose:**
- Handles cases where shop runs out of stock during order preparation
- Enables partial refunds and inventory adjustments
- Maintains accurate order-to-refund reconciliation

---

## Running Migrations

### Local Development

```bash
# Start Supabase locally
supabase start

# Push all migrations to local DB
supabase migration up

# OR push to production
supabase link --project-ref YOUR_PROJECT_REF
supabase db push

# Verify migrations
supabase migration list
```

### Manual Migration (if CLI unavailable)

1. Go to Supabase Dashboard → **SQL Editor**
2. Open each migration file (001–008)
3. Copy-paste SQL into editor
4. Click **Run**
5. Verify table created

### Verify Migrations Completed

```bash
# Option 1: Supabase CLI
supabase db list

# Option 2: SQL Query
-- In Supabase SQL Editor
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Expected tables:
-- delivery_partner_stats
-- disputes
-- order_items
-- orders
-- product_popular_stats
-- products
-- profiles
-- reviews
-- shop_analytics
-- shop_daily_stats
-- shops
-- migrations (auto-created)
```

---

## Schema Diagram

```
profiles (users)
├── id (PK)
├── phone (UK) — Unique
├── role (customer|shop_owner|delivery|admin)
└── ...

shops (business)
├── id (PK)
├── owner_id (FK→profiles)
├── geo (PostGIS point)
└── ...

products (inventory)
├── id (PK)
├── shop_id (FK→shops)
├── price (integer, in paise)
└── ...

orders (transactions)
├── id (PK)
├── customer_id (FK→profiles)
├── shop_id (FK→shops)
├── delivery_partner_id (FK→profiles)
├── cashfree_order_id (payment reconciliation)
└── ...

order_items (line items)
├── id (PK)
├── order_id (FK→orders)
├── product_id (FK→products)
└── ...

reviews (ratings)
├── id (PK)
├── order_id (FK→orders)
├── shop_id (FK→shops)
└── ...

disputes (issues)
├── id (PK)
├── order_id (FK→orders)
├── shop_id (FK→shops)
└── ...

analytics
├── shop_daily_stats
└── product_popular_stats
```

---

## Common Database Operations

### Create New User

```sql
INSERT INTO profiles (id, phone, role, display_name, is_verified, is_active)
VALUES (
  gen_random_uuid(),
  '+919999999999',
  'customer',
  'John Doe',
  false,
  true
);
```

### Find Shops Near User

```sql
SELECT id, name, avg_rating, trust_score
FROM shops
WHERE st_dwithin(
  geo,
  st_makepoint(78.4744, 17.3850)::geography,
  5000  -- 5km radius in meters
)
AND is_open = true
AND is_verified = true
ORDER BY trust_score DESC
LIMIT 10;
```

### Get Order History

```sql
SELECT 
  o.id, o.created_at, s.name, o.total_amount, o.status
FROM orders o
JOIN shops s ON o.shop_id = s.id
WHERE o.customer_id = 'USER_ID'
ORDER BY o.created_at DESC;
```

### Calculate Shop Stats

```sql
SELECT 
  s.name,
  COUNT(o.id) as total_orders,
  AVG(r.rating) as avg_rating,
  SUM(CASE WHEN o.status = 'delivered' THEN 1 ELSE 0 END)::float 
    / COUNT(o.id) as completion_rate
FROM shops s
LEFT JOIN orders o ON s.id = o.shop_id
LEFT JOIN reviews r ON o.id = r.order_id
WHERE s.id = 'SHOP_ID'
GROUP BY s.id, s.name;
```

---

## Backup & Recovery

### Automatic Backups

Supabase backs up daily:
- Time: 2 AM - 4 AM IST
- Retention: 30 days
- Access: Dashboard → Backups

### Manual Backup

```bash
# Before major changes, create snapshot
supabase db backup create -p YOUR_PROJECT_REF -n "pre-migration-backup"
```

### Restore from Backup

```bash
# In Supabase dashboard:
# 1. Go to Backups
# 2. Click "Restore" on desired backup
# 3. Confirm (takes 5-10 minutes)
# 4. All data reverted to backup point-in-time
```

### Export Data

```bash
# Export specific table
supabase db dump -p YOUR_PROJECT_REF --output-file shops.sql --table shops

# Export all data
supabase db dump -p YOUR_PROJECT_REF --output-file backup.sql
```

---

## Troubleshooting

### Migration Failed

```bash
# Check migration status
supabase migration list

# If stuck, manually reset (LOCAL ONLY, not production)
supabase db reset

# Then re-run migrations
supabase migration up
```

### Connection Refused

```bash
# Verify Supabase is running
supabase status

# Restart if needed
supabase stop
supabase start
```

### RLS Preventing Access

```bash
# Temporarily disable RLS for debugging (NOT for production)
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;

# Re-enable after
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
```

### Disk Space Growing

```sql
-- Find largest tables
SELECT 
  schemaname, tablename, 
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;

-- Vacuum to reclaim space
VACUUM ANALYZE;
```

---

## Migration Checklist Before Production Deploy

- [ ] All 11 migrations run successfully
- [ ] All 12 tables visible in Supabase dashboard
- [ ] RLS policies enabled on all tables
- [ ] Indexes created and visible
- [ ] Backups enabled and tested
- [ ] Performance tested with sample data
- [ ] PostGIS geo queries tested
- [ ] Service role key stored securely
- [ ] Connection pooling configured
- [ ] Monitoring alerts set up

---

*Last updated: April 12, 2026*
