# Contributing to NearBy

> Complete guide to contributing code, ensuring quality, and shipping features.
> Follow this process for every feature, bug fix, or refactor.

---

## Table of Contents

1. Getting Started
2. Development Workflow
3. Code Standards
4. Testing Requirements
5. Pull Request Process
6. Code Review Checklist
7. Merge & Deploy

---

## 1. Getting Started

### Before Your First Commit

1. **Read the docs:**
   - [CLAUDE.md](CLAUDE.md) — Domain rules (non-negotiable)
   - [docs/CODING_CONVENTIONS.md](docs/CODING_CONVENTIONS.md) — Code style
   - [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — System design
   - [docs/API.md](docs/API.md) — API endpoints

2. **Setup your environment:**
   ```bash
   git clone https://github.com/nearby-app/nearby.git
   cd nearby
   cp .env.example .env
   # Fill in .env with test credentials
   docker-compose up -d redis typesense
   cd backend && npm install && npm run dev
   ```

3. **Verify everything works:**
   ```bash
   curl http://localhost:3000/health
   # Expected: {"status":"ok"}
   ```

### Branch Naming Convention

```
feature/description          — New features (feature/add-cart)
fix/description             — Bug fixes (fix/otp-timeout-issue)
refactor/description        — Code refactoring (refactor/auth-service)
docs/description            — Documentation (docs/api-reference)
chore/description           — Maintenance (chore/update-dependencies)
```

---

## 2. Development Workflow

### Phase 1: Plan

Before writing code:

1. **Understand the requirement:**
   - Read the sprint plan: [docs/SPRINT_PLAN.md](docs/SPRINT_PLAN.md)
   - Read the task specification
   - Ask questions if unclear

2. **Check existing code:**
   - Does this feature already exist?
   - Can you reuse existing patterns?
   - Are there related services/routes?

3. **Design the solution:**
   - What API endpoint(s) are needed?
   - What database changes?
   - What third-party integrations?
   - What error cases?
   - What async jobs?

### Phase 2: Test-Driven Development (TDD)

**MANDATORY: Write tests FIRST, code SECOND.**

```bash
# 1. Create test file (following existing patterns)
# Example: src/__tests__/integration/cart.test.js

# 2. Write test for happy path
describe('POST /api/v1/cart', () => {
  it('should create cart item', async () => {
    const response = await request(app)
      .post('/api/v1/cart')
      .set('Authorization', `Bearer ${token}`)
      .send({ product_id: 'abc', quantity: 2 });
    
    expect(response.status).toBe(201);
    expect(response.body.data.quantity).toBe(2);
  });
});

# 3. Run test (it should FAIL)
npm test -- src/__tests__/integration/cart.test.js
# Expected: FAIL

# 4. Write minimal implementation
# src/routes/cart.js → POST /api/v1/cart handler

# 5. Run test again (it should PASS)
npm test -- src/__tests__/integration/cart.test.js
# Expected: PASS

# 6. Write tests for error cases
it('should reject if product not found', async () => {
  const response = await request(app)
    .post('/api/v1/cart')
    .set('Authorization', `Bearer ${token}`)
    .send({ product_id: 'invalid', quantity: 2 });
  
  expect(response.status).toBe(404);
  expect(response.body.error.code).toBe('PRODUCT_NOT_FOUND');
});

# 7. Run all tests
npm test -- --coverage

# 8. Verify coverage >= 80%
```

### Phase 3: Code Implementation

**Pattern: Thin Routes, Fat Services**

Route handler (40 lines max):
```javascript
// routes/cart.js
router.post('/', authenticate, roleGuard(['customer']), async (req, res, next) => {
  try {
    const { error, value } = cartSchema.validate(req.body);
    if (error) return res.status(400).json(
      errorResponse('VALIDATION_ERROR', error.details[0].message)
    );
    
    const cart = await CartService.addItem(req.user.id, value);
    res.status(201).json(successResponse(cart));
  } catch (err) {
    logger.error('add cart item failed', { error: err.message, userId: req.user.id });
    next(err);
  }
});
```

Service method (business logic):
```javascript
// services/cart.js
static async addItem(customerId, { productId, quantity }) {
  // 1. Validate
  const product = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single();
  
  if (!product) throw new NotFoundError('PRODUCT_NOT_FOUND');
  
  // 2. Check stock
  if (product.stock_qty < quantity) {
    throw new ValidationError('INSUFFICIENT_STOCK');
  }
  
  // 3. Create / update
  const cart = await supabase
    .from('carts')
    .upsert({
      customer_id: customerId,
      product_id: productId,
      quantity,
    });
  
  // 4. Queue async jobs
  await notificationQueue.add('new-cart-item', {
    customerId,
    productId,
  });
  
  // 5. Return
  return cart;
}
```

### Phase 4: Code Review

Before creating PR:

```bash
# Run full test suite
npm test -- --coverage

# Verify 80%+ coverage
# If below 80%, add more tests

# Lint code
npm run lint

# Check for hardcoded secrets
grep -r "CASHFREE_SECRET\|JWT_SECRET\|MSG91_KEY" src/
# Should return ZERO matches (all should be from .env)

# Review your code
git diff HEAD~1 HEAD
# Ask: Would I understand this in 6 months?
```

---

## 3. Code Standards

### JavaScript/Node.js

**File organization:**
```
src/routes/
  orders.js           ← 200-300 lines (thin route handlers)
  
src/services/
  order.js            ← 300-400 lines (business logic)
  payment.js
  
src/jobs/
  notifyShop.js       ← 150-200 lines (single job)
  autoCancel.js
  
src/utils/
  errors.js           ← Standard error definitions
  logger.js
```

**Naming conventions:**
```javascript
// Files: kebab-case
auto-cancel.js

// Constants: SCREAMING_SNAKE_CASE
const MAX_OTP_ATTEMPTS = 3;
const ORDER_ACCEPT_WINDOW_MS = 180000;

// Functions: camelCase, verb-first
async function createOrder() {}
async function findNearestDeliveryPartner() {}
const isOrderCancellable = () => {};

// Variables: camelCase
const orderTotal = 500;
const shopId = req.params.id;

// Classes: PascalCase
class OrderService {}
class NotFoundError extends Error {}
```

**Async/Await Only:**
```javascript
// ❌ WRONG
service.create().then(data => {
  // ...
}).catch(err => {
  // ...
});

// ✅ CORRECT
try {
  const data = await service.create();
  // ...
} catch (err) {
  logger.error('creation failed', { error: err.message });
  next(err);
}
```

**Error Handling:**
```javascript
// ❌ WRONG (silent failure)
const order = await supabase.from('orders').select().single();
// If order not found, returns null, code breaks downstream

// ✅ CORRECT (explicit error)
const { data: order, error } = await supabase
  .from('orders')
  .select()
  .eq('id', orderId)
  .single();

if (error || !order) {
  throw new NotFoundError('ORDER_NOT_FOUND', { orderId });
}
```

**Logging (Never console.log):**
```javascript
// ❌ WRONG
console.log('Order created:', order);

// ✅ CORRECT
logger.info('order created', { orderId: order.id, shopId: order.shop_id });

// For errors
logger.error('payment failed', {
  error: err.message,
  orderId: order.id,
  paymentId: payment.id,
});
```

**Comments (Why, Not What):**
```javascript
// ❌ WRONG (describes what code does — obvious from reading)
// Check if status is pending
if (order.status === 'pending') {
  // ...
}

// ✅ CORRECT (explains WHY)
// Only pending orders can be cancelled (not picked_up or delivered)
if (order.status === 'pending') {
  await cancelOrder(order);
}
```

### React Native / TypeScript

See [docs/CODING_CONVENTIONS.md](docs/CODING_CONVENTIONS.md) for React Native patterns.

---

## 4. Testing Requirements

### Minimum Coverage: 80%

All code must have 80%+ coverage for:
- Statements
- Branches
- Functions
- Lines

```bash
npm test -- --coverage

# Output:
# Statements   : 85.5%
# Branches     : 82.3%
# Functions    : 88.1%
# Lines        : 86.2%
```

### Test Types (All Required)

**1. Unit Tests** — Individual functions

```javascript
describe('calculateTrust Score', () => {
  it('should calculate correct score', () => {
    const score = calculateTrustScore({
      avgRating: 4.5,
      completionRate: 0.95,
      responseScore: 1.0,
      kycBonus: 1.0,
    });
    
    expect(score).toBe(
      4.5 * 0.40 + 0.95 * 0.35 + 1.0 * 0.15 + 1.0 * 0.10
    );
  });

  it('should handle missing ratings', () => {
    const score = calculateTrustScore({
      avgRating: 0,
      completionRate: 0.9,
      responseScore: 0.8,
      kycBonus: 0,
    });
    
    expect(score).toBeGreaterThan(0);
  });
});
```

**2. Integration Tests** — API endpoints

```javascript
describe('POST /api/v1/orders', () => {
  it('should create order and lock stock', async () => {
    // 1. Get initial stock
    const before = await getProductStock(productId);
    
    // 2. Create order
    const response = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${jwt}`)
      .send({ shopId, items: [{ productId, qty: 1 }] });
    
    // 3. Verify response
    expect(response.status).toBe(201);
    expect(response.body.data.id).toBeDefined();
    
    // 4. Verify stock decremented
    const after = await getProductStock(productId);
    expect(after).toBe(before - 1);
    
    // 5. Verify idempotency (same request returns same order)
    const response2 = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${jwt}`)
      .send({ 
        shopId, 
        items: [{ productId, qty: 1 }],
        idempotencyKey: response.body.data.idempotencyKey,
      });
    
    expect(response2.body.data.id).toBe(response.body.data.id);
  });

  it('should validate required fields', async () => {
    const response = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${jwt}`)
      .send({}); // Missing fields
    
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should reject if shop not verified', async () => {
    const unverifiedShop = await createShop({ is_verified: false });
    
    const response = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${jwt}`)
      .send({ shopId: unverifiedShop.id, items: [] });
    
    expect(response.status).toBe(400);
  });
});
```

**3. Error Handling Tests**

```javascript
it('should return 401 if JWT missing', async () => {
  const response = await request(app).post('/api/v1/orders');
  expect(response.status).toBe(401);
  expect(response.body.error.code).toBe('UNAUTHORIZED');
});

it('should return 500 if Supabase down', async () => {
  // Mock Supabase to throw error
  jest.spyOn(supabase.from, 'select').mockRejectedValue(
    new Error('Connection refused')
  );
  
  const response = await request(app)
    .post('/api/v1/orders')
    .set('Authorization', `Bearer ${jwt}`)
    .send({ shopId, items });
  
  expect(response.status).toBe(500);
  expect(response.body.error.code).toBe('INTERNAL_SERVER_ERROR');
});
```

### Running Tests

```bash
# All tests
npm test

# Specific file
npm test -- src/__tests__/integration/orders.test.js

# Watch mode (re-run on file change)
npm test -- --watch

# Coverage report
npm test -- --coverage
# Open: coverage/lcov-report/index.html

# Test specific sprint
npm run test:sprint3
```

---

## 5. Pull Request Process

### Step 1: Create Feature Branch

```bash
git checkout develop
git pull origin develop
git checkout -b feature/add-cart-functionality
```

### Step 2: Make Changes & Commit

```bash
# Make changes
# Run tests
npm test -- --coverage

# Commit (atomic commits with clear messages)
git add src/routes/cart.js src/services/cart.js src/__tests__/
git commit -m "feat(cart): add item to cart with stock validation

- Create POST /api/v1/cart endpoint
- Validate product exists and has stock
- Decrement product stock on successful add
- Queue notification job for user
- Full integration test coverage (3 scenarios)
- 85% coverage"
```

### Step 3: Push & Create PR

```bash
git push origin feature/add-cart-functionality
# GitHub shows "Compare & pull request" button

# OR from GitHub UI:
# 1. Go to https://github.com/nearby-app/nearby
# 2. Click "New Pull Request"
# 3. Base: develop, Compare: feature/add-cart-functionality
# 4. Fill PR description
```

### Step 4: PR Description Template

```markdown
## Summary
Add ability for customers to add items to shopping cart with real-time stock validation.

## Type of Change
- [x] New feature
- [ ] Bug fix
- [ ] Breaking change

## Changes
- Added POST /api/v1/cart endpoint
- Created CartService with addItem() method
- Implemented stock validation (rejects if insufficient stock)
- Added async notification queue for new items
- Full test coverage: 6 tests, 85% coverage

## Testing
- [x] Unit tests pass (npm test)
- [x] Integration tests pass
- [x] Manual testing in Expo app
- [x] Tested error case: product not found
- [x] Tested error case: insufficient stock
- [x] Tested happy path: item added and stock decremented

## Database Changes
- No schema changes
- Uses existing `carts` and `products` tables

## Screenshots / Evidence
(If UI changes, include screenshots)

## Checklist
- [x] Tests pass locally (npm test)
- [x] Coverage >= 80%
- [x] No console.log or debug statements
- [x] No hardcoded secrets
- [x] Code follows CODING_CONVENTIONS.md
- [x] Updated API docs if endpoint changed
- [x] Reviewed CLAUDE.md domain rules

## Related Issues
Closes #123 (add shopping cart)

## Deployed?
- Development: Local testing only
- Production: Ready after approval
```

---

## 6. Code Review Checklist

When reviewing another engineer's code:

### Security (CRITICAL)

- [ ] No hardcoded secrets (API keys, JWT_SECRET, etc.)
- [ ] All user inputs validated with Joi schemas
- [ ] SQL injection prevention (using parameterized queries)
- [ ] HMAC signature verified on webhooks (Cashfree, etc.)
- [ ] Authorization checks present (roleGuard, RLS policies)
- [ ] Rate limiting on sensitive endpoints

**If ANY security issue → REJECT**

### Code Quality (HIGH)

- [ ] Functions < 50 lines
- [ ] Files < 800 lines
- [ ] No deep nesting (>4 levels)
- [ ] No mutation (immutable patterns)
- [ ] Error handling on all async operations
- [ ] Logging (no console.log)
- [ ] Comments explain WHY, not WHAT
- [ ] No TODO or FIXME without context

### Testing (HIGH)

- [ ] Coverage >= 80% for new code
- [ ] Unit + integration tests present
- [ ] Happy path tested
- [ ] Error cases tested (at least 3)
- [ ] Edge cases tested

### API Patterns (MEDIUM)

- [ ] Follows REST conventions
- [ ] Uses proper HTTP methods (GET, POST, PATCH, DELETE)
- [ ] Error responses use consistent format
- [ ] Responses include metadata for pagination
- [ ] Documentation updated if endpoint changed

### Performance (MEDIUM)

- [ ] No N+1 queries (use JOINs)
- [ ] Database indexes appropriate
- [ ] Redis cache used for frequent queries
- [ ] Large arrays paginated
- [ ] Third-party API calls are rate-limited

### Database (MEDIUM)

- [ ] RLS policies correct
- [ ] Column names match migrations exactly
- [ ] No schema changes without migration
- [ ] Indexes created for foreign keys

### Documentation (LOW)

- [ ] README updated if setup changed
- [ ] API docs updated if endpoint changed
- [ ] JSDoc comments for complex functions
- [ ] CHANGELOG updated

### Approval Criteria

| Result | Meaning | Action |
|--------|---------|--------|
| ✅ Approve | No blockers | Merge ready |
| ⚠️ Request Changes | Issues found | Author fixes, request re-review |
| ❌ Reject | Security/critical issues | Do not merge |

---

## 7. Merge & Deploy

### Merge to Main

```bash
# Ensure all checks pass:
# 1. GitHub Actions tests passed (green checkmark)
# 2. Code review approved
# 3. No merge conflicts
# 4. Branch is up-to-date with main

# Click "Squash and merge" on GitHub
# (Squash combines all commits into one clean commit)

# Verify on GitHub
# PR shows "Merged" status
```

### Auto-Deploy (GitHub Actions)

```bash
# After merge to main, GitHub Actions automatically:
# 1. Runs: npm test -- --coverage
# 2. Runs: npm run lint
# 3. Builds: docker build -t nearby-api:latest ./backend
# 4. Deploys to DigitalOcean via Coolify
# 5. Notifies Slack: ✅ Deployment successful

# Watch deployment:
# Go to GitHub → Actions → Latest workflow run
# Or Slack #deployments channel
```

### Manual Verification

```bash
# After deployment completes, verify:

# 1. Check API is up
curl https://api.nearby.app/health
# Expected: {"status":"ok"}

# 2. Check logs for errors
ssh root@YOUR_DROPLET_IP
docker logs nearby_api | grep ERROR
# Expected: No errors (or expected operational errors)

# 3. Test the feature manually
# Use curl or Postman to test new endpoint
curl https://api.nearby.app/api/v1/cart \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{...}'

# 4. Monitor for 30 minutes
# Check error rates in logs
# Check DigitalOcean metrics (CPU, memory, disk)
```

---

## Best Practices

### Do's ✅

- Write tests FIRST, code second
- Keep commits small and focused
- Use clear, descriptive commit messages
- Ask questions if requirements unclear
- Reference issue numbers in commit messages
- Reuse existing patterns/services
- Handle all error cases
- Log important events
- Document edge cases

### Don'ts ❌

- Don't push directly to main
- Don't skip tests ("I'll test manually")
- Don't hardcode secrets or config
- Don't mutate objects (create new ones)
- Don't use console.log in production code
- Don't have functions > 50 lines
- Don't silently catch errors
- Don't ignore RLS policies
- Don't make database changes without migration
- Don't deploy to production with <80% coverage

---

## Getting Help

| Question | Reference |
|----------|-----------|
| "How do I set up locally?" | [README.md](README.md#-getting-started-30-minutes) |
| "What's the API pattern?" | [docs/API.md](docs/API.md) |
| "How do I structure my code?" | [docs/CODING_CONVENTIONS.md](docs/CODING_CONVENTIONS.md) |
| "What are the domain rules?" | [CLAUDE.md](CLAUDE.md) |
| "How do I test this?" | [Section 4: Testing](#4-testing-requirements) |
| "What's the deployment process?" | [docs/CI_CD_RUNBOOK.md](docs/CI_CD_RUNBOOK.md) |

---

## Code Review Response Time

| Scenario | SLA |
|----------|-----|
| Routine PR (feature/fix) | 24 hours |
| Urgent (production hotfix) | 2 hours |
| Documentation | 12 hours |

Reviewers aim to provide constructive feedback, not gatekeeping.

---

*Last updated: April 12, 2026*
