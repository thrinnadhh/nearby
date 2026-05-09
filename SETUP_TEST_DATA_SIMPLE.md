# Setup Test Data - Manual Alternative

If the automated script is having FK constraint issues, use these manual curl commands instead:

## 1. Create Test Customers (via OTP endpoint)

```bash
# Customer 1
curl -X POST http://localhost:3000/api/v1/auth/otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210"}'

# Verify OTP (use 000000)
curl -X POST http://localhost:3000/api/v1/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210", "otp": "000000"}'
```

## 2. Create Test Shops

```bash
# Shop 1 - Kirana
curl -X POST http://localhost:3000/api/v1/shops \
  -H "Authorization: Bearer {shop_owner_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Fresh Kirana Hub",
    "phone": "+919988776655",
    "category": "kirana",
    "address": "123 Main St, Hyderabad",
    "latitude": 17.3850,
    "longitude": 78.4867
  }'
```

## Alternative: Direct Database Insert

If you have psql access to Supabase:

```sql
-- Clear old test data
DELETE FROM profiles WHERE phone LIKE '+9198765432%';

-- Insert test customers
INSERT INTO profiles (id, phone, role, created_at, updated_at) VALUES
  ('cust-1', '+919876543210', 'customer', NOW(), NOW()),
  ('cust-2', '+919876543211', 'customer', NOW(), NOW()),
  ('cust-3', '+919876543212', 'customer', NOW(), NOW()),
  ('cust-4', '+919876543213', 'customer', NOW(), NOW()),
  ('cust-5', '+919876543214', 'customer', NOW(), NOW());

-- Insert test shop owners
INSERT INTO profiles (id, phone, role, created_at, updated_at) VALUES
  ('shop-owner-1', '+919988776655', 'shop_owner', NOW(), NOW()),
  ('shop-owner-2', '+919988776656', 'shop_owner', NOW(), NOW()),
  ('shop-owner-3', '+919988776657', 'shop_owner', NOW(), NOW());

-- Insert test shops
INSERT INTO shops (id, owner_id, name, phone, category, city, latitude, longitude, is_open, is_verified, trust_score, kyc_status, created_at, updated_at) VALUES
  ('shop-1', 'shop-owner-1', 'Fresh Kirana Hub', '+919988776655', 'kirana', 'Hyderabad', 17.3850, 78.4867, true, true, 85.0, 'approved', NOW(), NOW()),
  ('shop-2', 'shop-owner-2', 'Vegetable Paradise', '+919988776656', 'vegetables', 'Hyderabad', 17.3860, 78.4875, true, true, 85.0, 'approved', NOW(), NOW()),
  ('shop-3', 'shop-owner-3', 'MedPlus Pharmacy', '+919988776657', 'pharmacy', 'Hyderabad', 17.3870, 78.4885, true, true, 85.0, 'approved', NOW(), NOW());

-- Update profiles with shop_ids
UPDATE profiles SET shop_id = 'shop-1' WHERE id = 'shop-owner-1';
UPDATE profiles SET shop_id = 'shop-2' WHERE id = 'shop-owner-2';
UPDATE profiles SET shop_id = 'shop-3' WHERE id = 'shop-owner-3';

-- Insert test delivery partners
INSERT INTO profiles (id, phone, role, created_at, updated_at) VALUES
  ('deliv-1', '+919876543220', 'delivery', NOW(), NOW()),
  ('deliv-2', '+919876543221', 'delivery', NOW(), NOW());

-- Insert delivery partner records
INSERT INTO delivery_partners (id, user_id, phone, kyc_status, is_online, rating, completed_deliveries, earnings_today, earnings_total, created_at, updated_at) VALUES
  ('dp-1', 'deliv-1', '+919876543220', 'approved', false, 4.8, 150, 0, 1500000, NOW(), NOW()),
  ('dp-2', 'deliv-2', '+919876543221', 'approved', false, 4.8, 150, 0, 1500000, NOW(), NOW());
```

## Test Credentials

After setup, you can use:

**Customers:**
- +919876543210
- +919876543211
- +919876543212
- +919876543213
- +919876543214

**Shop Owners:**
- +919988776655 (Kirana)
- +919988776656 (Vegetables)
- +919988776657 (Pharmacy)

**Delivery Partners:**
- +919876543220
- +919876543221

**OTP for all:** 000000
