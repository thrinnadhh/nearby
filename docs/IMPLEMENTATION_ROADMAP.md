# NearBy — Implementation Roadmap

> **Status:** Sprint 1 (Infrastructure & Auth) — Starting Now  
> **Target:** OTP login works end-to-end locally  
> **Timeline:** 2-3 weeks  
> **Team:** 1 backend dev focus

---

## 🎯 Sprint 1 Critical Path

### Phase 1: Database Foundation (Days 1-3)

**Goal:** Supabase migrations complete, RLS policies active

#### Task 1.1: Create profiles table

**File:** `supabase/migrations/001_profiles.sql`

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(15) UNIQUE NOT NULL,
  role ENUM('customer', 'shop_owner', 'delivery', 'admin') NOT NULL DEFAULT 'customer',
  shop_id UUID,  -- Foreign key (set later after shops table created)
  fcm_token TEXT,  -- For push notifications
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_profiles_phone ON profiles(phone);
CREATE INDEX idx_profiles_role ON profiles(role);
```

**Acceptance Criteria:**
- [ ] Migration runs without errors: `supabase db push`
- [ ] Table visible in Supabase UI
- [ ] Can insert test profile with phone + role

**Time:** 30 min

---

#### Task 1.2: Create shops table

**File:** `supabase/migrations/002_shops.sql`

```sql
CREATE TABLE shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50),  -- 'kirana', 'pharmacy', 'restaurant', etc.
  address TEXT NOT NULL,
  latitude FLOAT NOT NULL,
  longitude FLOAT NOT NULL,
  kyc_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  kyc_docs JSONB,  -- { id_doc_url, address_proof_url, etc. }
  is_open BOOLEAN DEFAULT FALSE,
  trust_score INT DEFAULT 50,  -- 0-100
  avg_rating FLOAT,
  completion_rate FLOAT,
  response_time_minutes INT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_shops_owner ON shops(owner_id);
CREATE INDEX idx_shops_status ON shops(kyc_status);
CREATE INDEX idx_shops_open ON shops(is_open);
CREATE INDEX idx_shops_trust ON shops(trust_score DESC);
CREATE INDEX idx_shops_location ON shops USING GIST(
  ll_to_earth(latitude, longitude)
);

-- Foreign key constraint from profiles.shop_id
ALTER TABLE profiles ADD CONSTRAINT fk_profiles_shop 
  FOREIGN KEY (shop_id) REFERENCES shops(id);
```

**Acceptance Criteria:**
- [ ] Migration runs without errors
- [ ] Geospatial index created
- [ ] Can insert shop with location

**Time:** 45 min

---

#### Task 1.3: Create products table

**File:** `supabase/migrations/003_products.sql`

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  price_paise INT NOT NULL,  -- Always in paise (₹100 = 10000 paise)
  stock INT NOT NULL DEFAULT 0,
  image_url TEXT,  -- Cloudflare R2 public URL
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_products_shop ON products(shop_id);
CREATE INDEX idx_products_available ON products(is_available);
CREATE INDEX idx_products_category ON products(category);
```

**Acceptance Criteria:**
- [ ] Migration runs
- [ ] Can insert product with price in paise

**Time:** 30 min

---

#### Task 1.4: Create orders & order_items tables

**File:** `supabase/migrations/004_orders.sql`

```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES profiles(id),
  shop_id UUID NOT NULL REFERENCES shops(id),
  delivery_partner_id UUID REFERENCES profiles(id),
  status ENUM('pending', 'accepted', 'packing', 'ready', 'assigned', 
              'picked_up', 'out_for_delivery', 'delivered', 'cancelled',
              'auto_cancelled', 'refunded') DEFAULT 'pending',
  total_paise INT NOT NULL,  -- Server-calculated from order_items
  payment_method ENUM('card', 'upi', 'cod') DEFAULT 'cod',
  payment_status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
  cashfree_order_id VARCHAR(255),
  idempotency_key UUID UNIQUE,  -- Prevent duplicate orders
  created_at TIMESTAMP DEFAULT NOW(),
  accepted_at TIMESTAMP,
  delivered_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price_paise INT NOT NULL,  -- Price at time of order
  total_paise INT NOT NULL,  -- unit_price * quantity
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_shop ON orders(shop_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_order_items_order ON order_items(order_id);
```

**Acceptance Criteria:**
- [ ] Both tables created
- [ ] Foreign keys enforced
- [ ] Idempotency key unique constraint works

**Time:** 45 min

---

#### Task 1.5: Create reviews, disputes, analytics tables

**File:** `supabase/migrations/005_additional_tables.sql`

```sql
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  reviewer_id UUID NOT NULL REFERENCES profiles(id),
  reviewee_id UUID NOT NULL REFERENCES profiles(id),
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  complaint_by UUID NOT NULL REFERENCES profiles(id),
  type ENUM('missing_items', 'damaged', 'late', 'wrong_items'),
  description TEXT NOT NULL,
  status ENUM('open', 'in_review', 'resolved', 'rejected') DEFAULT 'open',
  resolution TEXT,
  refund_amount_paise INT,
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);

CREATE TABLE analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id),
  date DATE NOT NULL,
  orders_count INT DEFAULT 0,
  completed_orders INT DEFAULT 0,
  total_revenue_paise INT DEFAULT 0,
  avg_acceptance_time_minutes FLOAT,
  reviews_count INT DEFAULT 0,
  avg_rating FLOAT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(shop_id, date)
);

CREATE INDEX idx_reviews_order ON reviews(order_id);
CREATE INDEX idx_disputes_order ON disputes(order_id);
CREATE INDEX idx_disputes_status ON disputes(status);
CREATE INDEX idx_analytics_shop ON analytics(shop_id, date DESC);
```

**Acceptance Criteria:**
- [ ] All tables created
- [ ] Constraints working

**Time:** 30 min

---

#### Task 1.6: Set up RLS (Row-Level Security) policies

**File:** `supabase/migrations/006_rls_policies.sql`

```sql
-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can only see their own profile
CREATE POLICY "users_see_own_profile" ON profiles
  FOR SELECT USING (auth.uid = id);

-- Shops: Anyone can read approved shops (search)
CREATE POLICY "anyone_read_approved_shops" ON shops
  FOR SELECT USING (kyc_status = 'approved');

-- Shop owners can read/update their own shop
CREATE POLICY "shop_owner_manage_own" ON shops
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid AND p.shop_id = shops.id
    )
  );

-- Orders: Customers see own orders
CREATE POLICY "customers_see_own_orders" ON orders
  FOR SELECT USING (auth.uid = customer_id);

-- Orders: Shop owners see their shop's orders
CREATE POLICY "shop_owners_see_own_orders" ON orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid AND p.shop_id = orders.shop_id
    )
  );

-- Admin bypasses RLS (use service_role key backend-only)
```

**Acceptance Criteria:**
- [ ] All policies created
- [ ] Can test: Insert as customer, verify can only see own data

**Time:** 45 min

---

### Phase 2: Backend Auth System (Days 4-6)

**Goal:** OTP send/verify endpoints work, JWT issued

#### Task 2.1: Implement POST /auth/send-otp

**File:** `backend/src/routes/auth.js`

```javascript
import { Router } from 'express'
import Joi from 'joi'
import { v4 as uuidv4 } from 'uuid'
import { validate } from '../middleware/validate.js'
import { rateLimit } from '../middleware/rateLimit.js'
import { msg91 } from '../services/msg91.js'
import { redis } from '../services/redis.js'
import logger from '../utils/logger.js'

const router = Router()

const sendOtpSchema = Joi.object({
  phone: Joi.string().regex(/^\+91\d{10}$/).required()  // +919876543210
})

// POST /api/v1/auth/send-otp
router.post('/send-otp',
  rateLimit({ windowMs: 60000, max: 5 }),  // 5 per minute
  validate(sendOtpSchema),
  async (req, res, next) => {
    try {
      const { phone } = req.body
      
      // Check if locked out (3 failed attempts)
      const lockoutKey = `otp:lockout:${phone}`
      const isLocked = await redis.get(lockoutKey)
      
      if (isLocked) {
        logger.warn({ event: 'otp_locked', phone })
        return res.status(429).json({
          success: false,
          error: {
            code: 'OTP_LOCKED',
            message: 'Too many attempts. Try again in 10 minutes.'
          }
        })
      }
      
      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString()
      
      // Store in Redis (5-minute TTL)
      const otpKey = `otp:${phone}`
      await redis.setex(otpKey, 300, otp)
      
      // Log for local testing (remove in production)
      logger.info({ event: 'otp_generated', phone, otp })
      
      // Send via MSG91
      try {
        await msg91.send({
          to: phone,
          message: `Your NearBy OTP is ${otp}. Valid for 5 minutes.`,
          route: 'otp'  // Uses registered DLT template
        })
      } catch (smsError) {
        logger.warn({ event: 'sms_failed', phone, error: smsError.message })
        // Don't fail request if SMS fails (user can retry)
      }
      
      res.json({
        success: true,
        data: {
          message: 'OTP sent to your phone',
          phone_masked: phone.replace(/(\d{2})/, '+91****'),
          expires_in_seconds: 300
        }
      })
    } catch (err) {
      next(err)
    }
  }
)

export default router
```

**Acceptance Criteria:**
- [ ] Endpoint responds with success on valid phone
- [ ] OTP stored in Redis with 5-min TTL
- [ ] Rate limiting enforced (test with 6 requests)
- [ ] Lockout enforced after failed attempts
- [ ] Test via: `curl -X POST http://localhost:3000/api/v1/auth/send-otp -H "Content-Type: application/json" -d '{"phone":"+919876543210"}'`

**Time:** 2 hours

---

#### Task 2.2: Implement POST /auth/verify-otp

**File:** `backend/src/routes/auth.js` (append to existing)

```javascript
import jwt from 'jsonwebtoken'

const verifyOtpSchema = Joi.object({
  phone: Joi.string().regex(/^\+91\d{10}$/).required(),
  otp: Joi.string().length(6).pattern(/^\d+$/).required()
})

// POST /api/v1/auth/verify-otp
router.post('/verify-otp',
  rateLimit({ windowMs: 60000, max: 5 }),
  validate(verifyOtpSchema),
  async (req, res, next) => {
    try {
      const { phone, otp } = req.body
      
      // Check attempts (max 3)
      const attemptsKey = `otp:attempts:${phone}`
      const attempts = await redis.incr(attemptsKey)
      await redis.expire(attemptsKey, 600)  // 10-min window
      
      if (attempts > 3) {
        logger.warn({ event: 'otp_max_attempts', phone, attempts })
        await redis.setex(`otp:lockout:${phone}`, 600, '1')  // 10-min lockout
        return res.status(429).json({
          success: false,
          error: {
            code: 'OTP_MAX_ATTEMPTS',
            message: 'Too many failed attempts. Try again in 10 minutes.'
          }
        })
      }
      
      // Get stored OTP from Redis
      const otpKey = `otp:${phone}`
      const storedOtp = await redis.get(otpKey)
      
      if (!storedOtp) {
        logger.warn({ event: 'otp_expired', phone })
        return res.status(401).json({
          success: false,
          error: {
            code: 'OTP_EXPIRED',
            message: 'OTP expired. Request a new one.'
          }
        })
      }
      
      if (storedOtp !== otp) {
        logger.warn({ event: 'otp_invalid', phone, attempts })
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_OTP',
            message: `Incorrect OTP. ${3 - attempts} attempts remaining.`
          }
        })
      }
      
      // OTP verified! Clean up
      await redis.del(otpKey, attemptsKey)
      
      // Create or update profile in Supabase
      const { data: user, error: dbError } = await supabase
        .from('profiles')
        .upsert(
          { phone, role: 'customer' },
          { onConflict: 'phone' }
        )
        .select()
        .single()
      
      if (dbError) throw dbError
      
      // Issue JWT (1-week expiry)
      const token = jwt.sign(
        {
          sub: user.id,
          phone: user.phone,
          role: user.role,
          shopId: user.shop_id
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      )
      
      logger.info({ event: 'user_authenticated', phone, role: user.role })
      
      res.json({
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            phone: user.phone,
            role: user.role
          },
          expires_in: 604800  // 7 days in seconds
        }
      })
    } catch (err) {
      next(err)
    }
  }
)

export default router
```

**Acceptance Criteria:**
- [ ] Accepts OTP from Redis
- [ ] Rejects invalid OTP with attempt counter
- [ ] Locks after 3 failed attempts
- [ ] Creates profile if doesn't exist
- [ ] Issues JWT with correct payload
- [ ] JWT verifiable with JWT_SECRET
- [ ] Test: Send OTP → Verify with wrong OTP 3x → Locked → Verify with correct OTP → Get token

**Time:** 3 hours

---

#### Task 2.3: Implement auth middleware (JWT verification)

**File:** `backend/src/middleware/auth.js`

```javascript
import jwt from 'jsonwebtoken'
import logger from '../utils/logger.js'

export const auth = () => {
  return (req, res, next) => {
    try {
      const authHeader = req.headers.authorization
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'MISSING_TOKEN',
            message: 'Authorization header required: Bearer {token}'
          }
        })
      }
      
      const token = authHeader.slice(7)  // Remove 'Bearer '
      
      // Verify signature
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      
      // Set req.user for downstream handlers
      req.user = {
        userId: decoded.sub,
        phone: decoded.phone,
        role: decoded.role,
        shopId: decoded.shopId
      }
      
      logger.debug({ event: 'jwt_verified', userId: decoded.sub })
      next()
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: {
            code: 'TOKEN_EXPIRED',
            message: 'Token expired. Login again.'
          }
        })
      }
      
      if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid token.'
          }
        })
      }
      
      logger.error({ event: 'jwt_error', error: err.message })
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Server error' }
      })
    }
  }
}
```

**Acceptance Criteria:**
- [ ] Accepts valid JWT in Authorization header
- [ ] Rejects missing token
- [ ] Rejects invalid signature
- [ ] Rejects expired token
- [ ] Sets req.user with decoded payload
- [ ] Test protected endpoint: GET /api/v1/auth/me

**Time:** 1.5 hours

---

#### Task 2.4: Implement roleGuard middleware

**File:** `backend/src/middleware/roleGuard.js`

```javascript
export const roleGuard = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'NOT_AUTHENTICATED', message: 'JWT required' }
      })
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Role '${req.user.role}' not allowed. Required: ${allowedRoles.join(' or ')}`
        }
      })
    }
    
    next()
  }
}
```

**Acceptance Criteria:**
- [ ] Rejects missing req.user
- [ ] Rejects disallowed roles
- [ ] Allows matching role
- [ ] Test: Route with `roleGuard(['shop_owner'])` rejects customer, allows shop_owner

**Time:** 45 min

---

#### Task 2.5: Add GET /auth/me endpoint

**File:** `backend/src/routes/auth.js` (append)

```javascript
// GET /api/v1/auth/me
router.get('/me',
  auth(),
  async (req, res) => {
    try {
      const { data: user } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', req.user.userId)
        .single()
      
      res.json({
        success: true,
        data: { user }
      })
    } catch (err) {
      next(err)
    }
  }
)
```

**Acceptance Criteria:**
- [ ] Returns current user profile
- [ ] Rejects request without JWT
- [ ] Test: Use token from verify-otp to call GET /me

**Time:** 30 min

---

### Phase 3: Testing & Verification (Days 7)

**Goal:** Full OTP flow works end-to-end

#### Task 3.1: Write auth tests

**File:** `backend/tests/routes/auth.test.js`

```javascript
import request from 'supertest'
import { app } from '../../src/index.js'
import { redis } from '../../src/services/redis.js'
import { supabase } from '../../src/services/supabase.js'

describe('POST /api/v1/auth/send-otp', () => {
  it('should send OTP for valid phone', async () => {
    const res = await request(app)
      .post('/api/v1/auth/send-otp')
      .send({ phone: '+919876543210' })
    
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.expires_in_seconds).toBe(300)
  })
  
  it('should reject invalid phone', async () => {
    const res = await request(app)
      .post('/api/v1/auth/send-otp')
      .send({ phone: '9876543210' })  // Missing +91
    
    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
  })
  
  it('should enforce rate limit', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/v1/auth/send-otp')
        .send({ phone: '+919876543210' })
    }
    
    const res = await request(app)
      .post('/api/v1/auth/send-otp')
      .send({ phone: '+919876543210' })
    
    expect(res.status).toBe(429)
  })
})

describe('POST /api/v1/auth/verify-otp', () => {
  it('should issue JWT for correct OTP', async () => {
    // First, send OTP
    await request(app)
      .post('/api/v1/auth/send-otp')
      .send({ phone: '+919876543210' })
    
    // Get OTP from Redis (in tests, we can access it)
    const otp = await redis.get('otp:+919876543210')
    
    // Verify
    const res = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phone: '+919876543210', otp })
    
    expect(res.status).toBe(200)
    expect(res.body.data.token).toBeDefined()
    expect(res.body.data.user.phone).toBe('+919876543210')
  })
  
  it('should reject invalid OTP', async () => {
    await request(app)
      .post('/api/v1/auth/send-otp')
      .send({ phone: '+919876543210' })
    
    const res = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phone: '+919876543210', otp: '000000' })
    
    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('INVALID_OTP')
  })
  
  it('should lock after 3 failed attempts', async () => {
    await request(app)
      .post('/api/v1/auth/send-otp')
      .send({ phone: '+919876543210' })
    
    // Try 3 times with wrong OTP
    for (let i = 0; i < 3; i++) {
      await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({ phone: '+919876543210', otp: '000000' })
    }
    
    // 4th attempt should be locked
    const res = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phone: '+919876543210', otp: '000000' })
    
    expect(res.status).toBe(429)
    expect(res.body.error.code).toBe('OTP_MAX_ATTEMPTS')
  })
})

describe('GET /api/v1/auth/me', () => {
  it('should return user profile with valid JWT', async () => {
    // Get token
    await request(app).post('/api/v1/auth/send-otp').send({ phone: '+919876543210' })
    const otp = await redis.get('otp:+919876543210')
    const authRes = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ phone: '+919876543210', otp })
    const token = authRes.body.data.token
    
    // Call /me
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`)
    
    expect(res.status).toBe(200)
    expect(res.body.data.user.phone).toBe('+919876543210')
  })
  
  it('should reject missing JWT', async () => {
    const res = await request(app).get('/api/v1/auth/me')
    
    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('MISSING_TOKEN')
  })
})
```

**Acceptance Criteria:**
- [ ] All tests pass: `npm run test -- auth.test.js`
- [ ] Coverage ≥ 80%: `npm run test -- --coverage`
- [ ] No hardcoded secrets in test file

**Time:** 2 hours

---

#### Task 3.2: Manual end-to-end test

**Steps:**

```bash
# 1. Start local environment
docker-compose up

# 2. In another terminal, start backend
cd backend
npm run dev

# 3. Health check
curl http://localhost:3000/health

# 4. Send OTP
PHONE="+919876543210"
curl -X POST http://localhost:3000/api/v1/auth/send-otp \
  -H "Content-Type: application/json" \
  -d "{\"phone\":\"$PHONE\"}"

# Response should be:
# {
#   "success": true,
#   "data": { "message": "OTP sent...", "expires_in_seconds": 300 }
# }

# 5. Get OTP from Redis (for local testing)
redis-cli GET otp:+919876543210
# Returns: "123456" (example)

# 6. Verify OTP
OTP="123456"
curl -X POST http://localhost:3000/api/v1/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d "{\"phone\":\"$PHONE\",\"otp\":\"$OTP\"}"

# Response:
# {
#   "success": true,
#   "data": {
#     "token": "eyJhbGc...",
#     "user": { "id": "...", "phone": "+919876543210", "role": "customer" },
#     "expires_in": 604800
#   }
# }

# 7. Use JWT to call /me
TOKEN="eyJhbGc..."
curl http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer $TOKEN"

# Response:
# {
#   "success": true,
#   "data": { "user": { "id": "...", "phone": "+919876543210", ... } }
# }

# 8. Test with wrong OTP (3 times)
for i in {1..3}; do
  curl -X POST http://localhost:3000/api/v1/auth/verify-otp \
    -H "Content-Type: application/json" \
    -d "{\"phone\":\"$PHONE\",\"otp\":\"000000\"}"
done

# 4th attempt should return 429 (locked)
```

**Acceptance Criteria:**
- [ ] Send OTP returns success
- [ ] Verify OTP with correct OTP returns JWT
- [ ] Verify OTP with wrong OTP 3x locks account
- [ ] GET /me with JWT returns user
- [ ] Manual test without errors

**Time:** 1 hour

---

## 📋 Task Checklist (Print & Track)

### Database (Day 1-3)

- [ ] 1.1: Create profiles table
- [ ] 1.2: Create shops table  
- [ ] 1.3: Create products table
- [ ] 1.4: Create orders & order_items tables
- [ ] 1.5: Create reviews, disputes, analytics tables
- [ ] 1.6: Set up RLS policies

**Status:** ⬜ Not started | 🔵 In Progress | ✅ Complete

### Backend Auth (Day 4-6)

- [ ] 2.1: Implement POST /auth/send-otp
- [ ] 2.2: Implement POST /auth/verify-otp
- [ ] 2.3: Implement auth middleware
- [ ] 2.4: Implement roleGuard middleware
- [ ] 2.5: Add GET /auth/me endpoint

**Status:** ⬜ Not started | 🔵 In Progress | ✅ Complete

### Testing (Day 7)

- [ ] 3.1: Write auth tests
- [ ] 3.2: Manual end-to-end test

**Status:** ⬜ Not started | 🔵 In Progress | ✅ Complete

---

## 🔧 Environment Setup Required

Before starting, ensure:

```bash
# .env file filled with:
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
JWT_SECRET=your-secret-key-min-32-chars
REDIS_URL=redis://localhost:6379
MSG91_AUTH_KEY=your-msg91-key
NODE_ENV=development
```

---

## 📞 Blockers & Dependencies

| Task | Depends On | Status |
|------|-----------|--------|
| Verify OTP | Supabase project | ⬜ Needs setup |
| Send SMS | MSG91 account | ⬜ Needs setup |
| Store OTP | Redis running | ✅ docker-compose |
| Issue JWT | JWT_SECRET in .env | ⬜ Manual config |

---

## 🎯 Definition of Done (Sprint 1)

**All of the following must be true:**

1. ✅ Supabase migrations pass: `supabase db push`
2. ✅ Backend starts: `npm run dev` (no errors)
3. ✅ Health check works: `curl http://localhost:3000/health`
4. ✅ OTP send endpoint works and stores in Redis
5. ✅ OTP verify endpoint works with rate limiting & lockout
6. ✅ JWT issued correctly with 1-week expiry
7. ✅ Auth middleware verifies JWT signature
8. ✅ RoleGuard enforces role-based access
9. ✅ All auth tests pass with 80%+ coverage
10. ✅ Manual E2E test completes (send OTP → verify → JWT → /me)
11. ✅ No hardcoded secrets in code
12. ✅ All endpoints follow response format: `{ success, data?, error? }`
13. ✅ Documentation updated in API.md
14. ✅ Code committed with clear messages

---

## 🚀 Next After Sprint 1

Once Sprint 1 is complete:

1. **Sprint 2:** Shop CRUD + KYC upload + Product management
2. **Sprint 3:** Order creation + 3-minute auto-cancel
3. **Sprint 4:** Payment integration (Cashfree)

---

**Start Date:** April 6, 2026  
**Target Completion:** April 21, 2026 (2 weeks)  
**Time Estimate:** 40-50 hours

Good luck! 🚀
