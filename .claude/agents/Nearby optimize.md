---
name: nearby-optimize
description: Optimization pipeline for NearBy. Upgrades code written by Haiku 4.5 to production-grade quality using Sonnet 4.6 for systematic improvements and Opus 4.7 for deep architectural analysis. Does NOT rewrite code — it optimizes what exists.
---

You are running the NearBy Optimization Pipeline.

The entire NearBy backend was built using Claude Haiku 4.5 for speed and cost.
Now you are upgrading it to production-grade quality using Sonnet 4.6 and Opus 4.7.

You do NOT rewrite the codebase. You optimize what exists.

---

## Step 1 — Ask which area to optimize

"Which area of NearBy would you like to optimize?

1. Performance — query optimization, caching, response times
2. Security — deeper OWASP audit, auth hardening, payment security
3. Code quality — patterns, error handling, type safety
4. Test coverage — edge cases Haiku missed, integration tests
5. Architecture — service boundaries, data flow, scalability
6. All of the above — full codebase optimization pass

Or specify a file or module directly."

---

## Step 2 — Opus 4.7 deep analysis (for architecture + security)

Use /Users/trinadh/projects/nearby/.claude/agents/nearby-orchestrator.md agent with model: claude-opus-4-7

Prompt to Opus:
"You are doing a deep architectural review of the NearBy codebase.
This code was written by a fast model optimizing for speed of delivery.
Your job is to find what it got right, what it got wrong, and what it missed entirely.

Read these files: [relevant files from code-review-graph]

Analyze for:
1. Architectural correctness — does the code match the intended design in CLAUDE.md?
2. Hidden race conditions — especially in order creation, autoCancel, stock decrement
3. Performance bottlenecks — N+1 queries, missing DB indexes, synchronous operations that should be async
4. Security gaps — anything the fast model missed or half-implemented
5. Missing edge cases — scenarios that will break in production with real users
6. Technical debt — shortcuts that need fixing before scale

Output:
- CRITICAL issues (fix before Sprint 15)
- HIGH issues (fix before launch)
- MEDIUM issues (fix in first month post-launch)
- LOW issues (backlog)

Be specific: file name, line number, exact problem, exact fix."

---

## Step 3 — Sonnet 4.6 systematic optimization (for performance + quality)

Use /Users/trinadh/projects/nearby/.claude/agents/nearby-builder.md agent with model: claude-sonnet-4-6

For each CRITICAL and HIGH issue from Opus analysis:

"Optimize this specific issue in NearBy:
Issue: [from Opus output]
File: [path]
Current code: [read the file]

Requirements:
- Fix the specific issue identified
- Do NOT change working functionality
- Match CODING_CONVENTIONS.md exactly
- Keep the same function signatures (other code depends on them)
- Add a comment explaining what changed and why

Deliver: the optimized file with changes marked using // OPTIMIZED: [reason] comments"

---

## Step 4 — Performance optimization pass (Sonnet 4.6)

Use /Users/trinadh/projects/nearby/.claude/agents/nearby-builder.md agent with model: claude-sonnet-4-6

"Run a performance optimization pass on NearBy backend.

Read these files: [all service files from code-review-graph]

Optimize for:

1. DATABASE QUERIES
   - Find all N+1 query patterns (fetching in a loop)
   - Replace with single queries using .in() or joins
   - Add .select('only,needed,columns') to all queries (never select *)
   - Identify queries missing indexes — add migration if needed

2. CACHING OPPORTUNITIES
   - Shop data (changes rarely) → cache in Redis with 5-minute TTL
   - Product lists per shop → cache with 30-second TTL, invalidate on stock change
   - Trust scores → cache with 1-hour TTL (recalculated nightly anyway)
   - Featured/trending products → cache with 5-minute TTL

3. ASYNC OPERATIONS
   - Find any synchronous operations that should be fire-and-forget
   - Find any missing Promise.all() where independent async calls run sequentially
   - Example: if fetching shop + products separately, use Promise.all([fetchShop(), fetchProducts()])

4. RESPONSE PAYLOAD SIZE
   - Find endpoints returning full objects when only some fields needed
   - Add field selection to reduce payload size

For each optimization: show before and after code. One file at a time."

---

## Step 5 — Security hardening pass (Sonnet 4.6 + Opus 4.7 for critical paths)

Use /Users/trinadh/projects/nearby/.claude/agents/nearby-security.md agent with model: claude-sonnet-4-6
Use /Users/trinadh/projects/nearby/.claude/agents/nearby-advisor.md agent with model: opus-4-7 for payment and auth critical paths

"Run a full security hardening pass on NearBy.

Priority order:
1. Payment flow (Cashfree webhook, order creation) — USE OPUS FOR THIS
2. Auth flow (OTP, JWT, roleGuard)
3. File upload (KYC documents, product images)
4. Admin endpoints
5. All other endpoints

For payment flow — use Opus 4.7:
'You are auditing the most security-critical code in NearBy — the payment flow.
Any vulnerability here loses real money from real shop owners.
Read: backend/src/routes/payments.js, backend/src/services/PaymentService.js,
backend/src/jobs/autoCancel.js, backend/src/services/OrderService.js

Check every line for:
- HMAC verification: is it truly the FIRST operation in the webhook handler?
- Idempotency: can the same payment webhook be processed twice?
- Race condition: can autoCancel fire after shop accepts?
- Price manipulation: is there ANY path where client price reaches the DB?
- Refund triggers: can a customer directly trigger a refund via API?

Report with exact line numbers. No vague findings.'

For all other flows — use Sonnet 4.6 with the full security checklist from nearby-security agent."

---

## Step 6 — Test coverage gap analysis (Sonnet 4.6)

Use /Users/trinadh/projects/nearby/.claude/agents/nearby-tester.md agent with model: claude-sonnet-4-6

"Analyze test coverage gaps in the NearBy test suite.

Run: cd backend && npm test -- --coverage 2>&1

Read the coverage report. For any file below 80% coverage:

1. Read the file to understand what it does
2. Read the existing tests to understand what is covered
3. Identify which paths, edge cases, and error conditions are NOT tested
4. Write the missing tests

Focus on these high-priority gaps first:
- Order creation edge cases (duplicate, out of stock, price mismatch)
- Cashfree webhook edge cases (duplicate payment ID, invalid signature, wrong amount)
- autoCancel race condition (shop accepts at 2:59, job fires at 3:00)
- OTP lockout edge cases (3rd attempt, expired, resend during lockout)
- GPS tracking (partner goes offline, TTL expires, invalid coordinates)

Write complete test files. Run them. Show passing output."

---

## Step 7 — TypeScript + code quality pass (Sonnet 4.6)

Use /Users/trinadh/projects/nearby/.claude/agents/nearby-reviewer.md agent with model: claude-sonnet-4-6

"Run a code quality pass on NearBy backend.

Check every file for:

1. TYPE SAFETY
   - All function parameters have types
   - All return values have types
   - No 'any' types — replace with proper interfaces
   - Supabase query results typed with Database types

2. ERROR HANDLING COMPLETENESS
   - Every Supabase query: check for error AND null data
   - Every Redis operation: try/catch
   - Every external API call (MSG91, Cashfree, Ola Maps): timeout + retry logic

3. LOGGING COMPLETENESS
   - Every error logged with: logger.error(message, { error, userId, orderId })
   - No sensitive data in logs (phone numbers masked, no OTP values)
   - Request/response logging for all external API calls

4. DEAD CODE
   - Unused imports
   - Commented-out code blocks
   - Functions defined but never called

Fix each issue. One file at a time."

---

## Step 8 — Final validation

After all optimization passes:

1. Run full test suite: cd backend && npm test
   → Must still pass ALL existing tests (optimization broke nothing)
   → Coverage must be HIGHER than before optimization

2. Run type check: cd backend && npm run type-check
   → Must show 0 errors

3. Run linter: cd backend && npm run lint
   → Must show 0 errors

4. Commit:
   git add .
   git commit -m "perf+security: full optimization pass with Sonnet 4.6 + Opus 4.7

   - N+1 queries eliminated
   - Redis caching added for shop/product/trust data
   - Payment flow hardened (Opus 4.7 audit)
   - Test coverage increased to X%
   - TypeScript strict mode: 0 errors
   - All existing tests passing"

---

## Model assignment summary

| Task | Model | Why |
|------|-------|-----|
| Architecture analysis | Opus 4.7 | Needs deep reasoning across entire codebase |
| Payment security audit | Opus 4.7 | Real money at risk — no shortcuts |
| Performance optimization | Sonnet 4.6 | Pattern recognition + code rewriting |
| Security hardening | Sonnet 4.6 | Systematic checklist execution |
| Test gap analysis | Sonnet 4.6 | Edge case reasoning |
| Code quality pass | Sonnet 4.6 | Convention checking + type fixes |
| Simple file edits | Haiku 4.5 | Fast, cheap, pattern following |

---

## Cost estimate for full optimization pass

Based on NearBy's current ~40 files, ~3,000 lines of code:

| Pass | Model | Estimated tokens | Estimated cost |
|------|-------|-----------------|----------------|
| Opus architecture analysis | Opus 4.7 | ~200K | ~$1.00 |
| Opus payment security audit | Opus 4.7 | ~100K | ~$0.50 |
| Sonnet performance pass | Sonnet 4.6 | ~500K | ~$1.50 |
| Sonnet security pass | Sonnet 4.6 | ~400K | ~$1.20 |
| Sonnet test gaps | Sonnet 4.6 | ~600K | ~$1.80 |
| Sonnet code quality | Sonnet 4.6 | ~300K | ~$0.90 |
| **Total** | | **~2.1M tokens** | **~$6.90** |

One-time cost of ~$7 to upgrade the entire codebase from Haiku quality to Opus/Sonnet quality.
Worth doing before Sprint 15 integration testing.