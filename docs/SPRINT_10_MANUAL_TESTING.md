# Sprint 10 Manual Testing Quick Start

**Status**: Ready for manual verification  
**Duration**: ~2-3 hours for complete manual testing  
**Required**: iOS simulator/device + Android emulator/device

---

## ✅ Auto-Verified (No Action Needed)

### Code Quality
- ✅ TypeScript compilation (0 errors)
- ✅ Linting (all standards met)
- ✅ 7 code review issues fixed (5 HIGH + 2 MEDIUM)
- ✅ 164+ unit tests passing
- ✅ 80%+ code coverage achieved
- ✅ All domain rules enforced
- ✅ No security vulnerabilities
- ✅ All API contracts match types

### Files Verified
```
Phase 1 (ba2d46f): 18 files, 3,201 insertions, 84+ tests
Phase 2 (4fda7d8): 35 files, 3,216 insertions, 80+ tests  
Code Review Fixes (d874b1a): 7 files, fixes (5 HIGH + 2 MEDIUM)
Total: 53+ files changed, 6,417+ insertions
```

---

## 📋 Manual Testing Checklist (By Feature)

### Quick Test Path (30 minutes)
Start here for fast validation:

```bash
# 1. Order History & Detail (5 min)
□ App home screen loads
□ Scroll order history
□ Tap order → Detail screen
□ Timeline shows status changes
□ Items list visible with prices

# 2. Order Cancellation (5 min)
□ Tap "Cancel Order" button
□ Modal appears with reason field
□ Type reason (< 3 chars) → Show error
□ Type valid reason → Cancel succeeds
□ Order status changes to "Cancelled"

# 3. Reorder Flow (5 min)
□ Tap "Reorder" on delivered order
□ Cart prefilled with same items
□ Navigate to checkout
□ Can proceed with payment

# 4. Profile & Addresses (5 min)
□ Tab to Profile screen
□ User info displays (phone, avatar)
□ Tap "Saved Addresses"
□ Addresses list loads
□ Tap "Add" → Address picker works

# 5. Review Submission (5 min)
□ On delivered order, tap "Review"
□ Rate 5 stars
□ Type comment (test 500 char limit)
□ Submit → Optimistic update
□ Review appears on order detail

# 6. Error & Offline (5 min)
□ Toggle airplane mode ON
□ Offline banner appears
□ Try to submit review → Error shown
□ Toggle airplane mode OFF
□ Offline banner disappears
□ Retry button works
```

### Full Test Path (2-3 hours)
Complete feature + integration testing:

Use the checklist in [SPRINT_10_VERIFICATION.md](./SPRINT_10_VERIFICATION.md):
- Section 2: Customer App Feature Verification
- Section 3: Integration Testing Checklist
- Section 5: Performance Verification
- Section 6: Platform Verification

---

## 🔧 Setup for Manual Testing

### Prerequisites
```bash
# 1. Clone repo
git clone https://github.com/thrinnadhh/nearby.git
cd nearby/apps/customer

# 2. Install dependencies
npm install
# or
yarn install

# 3. Start backend services
cd ../../
docker-compose up  # Starts API, Redis, Typesense

# 4. Configure env
cp .env.example .env
# Update with test API URL, Firebase config, etc.
```

### iOS Testing
```bash
# Start iOS simulator
open -a Simulator

# Run app
npm run ios
# or
expo start --ios

# App should launch on simulator
# Accept all permissions when prompted
```

### Android Testing
```bash
# Start Android emulator (from Android Studio)
# or: emulator -avd Pixel_4_API_30

# Run app
npm run android
# or
expo start --android

# App should launch on emulator
# Accept all permissions when prompted
```

---

## 🎯 What to Test & How

### TEST 1: Order History Flow (10 min)

**Prerequisites**:
- App running on simulator/device
- Backend running (docker-compose up)
- Logged in as customer

**Steps**:
1. Navigate to "Orders" tab
2. Verify list shows previous orders (or empty state)
3. Scroll down (test infinite scroll if 10+ orders exist)
4. Pull down to refresh
5. Tap any order
6. Verify details page shows:
   - Order ID and date
   - Status timeline (pending → delivered)
   - Item list with prices
   - Partner (delivery person) info
   - Address
   - Total amount

**Expected**:
- ✅ List loads within 2 seconds
- ✅ Detail screen loads within 1 second
- ✅ All data displays correctly
- ✅ No console errors
- ✅ Smooth scrolling (60 FPS)

**If Issues**:
- Check backend logs: `docker-compose logs api | tail -50`
- Check app logs: Xcode console or Android Studio

---

### TEST 2: Order Cancellation (10 min)

**Prerequisites**:
- Order in "pending" or "accepted" status
- On order detail screen

**Steps**:
1. Tap "Cancel Order" button (red)
2. Modal appears with reason field
3. Try typing just "ab" (2 chars)
4. Verify error: "Reason must be at least 3 characters"
5. Type valid reason: "Product unavailable"
6. Tap "Confirm Cancel"
7. Verify status changes to "Cancelled"
8. Verify refund info displays

**Expected**:
- ✅ Input validation works
- ✅ Error alerts shown for invalid input
- ✅ Cancel succeeds and status updates
- ✅ Modal closes
- ✅ API call completes within 2 seconds

**If Issues**:
- Check: Is order in cancellable status? (not picked_up or delivered)
- Check backend: `docker-compose logs api | grep cancel`

---

### TEST 3: Reorder Flow (10 min)

**Prerequisites**:
- Delivered order visible on history
- On order detail screen

**Steps**:
1. Tap "Reorder" button (blue)
2. Verify cart filled with same items
3. Tap cart icon in header
4. Verify cart screen shows:
   - Same items as original order
   - Original quantities
   - ₹25 delivery fee
5. Proceed to checkout
6. Select payment method (UPI or COD)
7. Complete payment or COD confirmation
8. Verify order created successfully

**Expected**:
- ✅ Cart prefilled within 1 second
- ✅ Item quantities match original
- ✅ Delivery fee applied
- ✅ Can checkout successfully
- ✅ New order appears in history

**If Issues**:
- Check: Are items still available? (not deleted from shop)
- Check: Are you reordering from same shop?

---

### TEST 4: Review Submission (10 min)

**Prerequisites**:
- Delivered order without review
- On order detail screen or order history

**Steps**:
1. Tap "Write Review" button (or review icon)
2. Rating screen appears with 5 stars
3. Tap star 4 (4-star rating)
4. Stars 1-4 fill with color
5. Tap comment field
6. Type comment: "Great product and fast delivery!" (19 chars)
7. Verify character counter shows "19/500"
8. Type until 500 chars
9. Verify counter shows "500/500"
10. Type one more char
11. Verify it's blocked at 500
12. Tap "Submit Review"
13. Verify:
    - Loading state shows
    - Cart updates immediately (optimistic)
    - Submit succeeds after 1-2 seconds
    - Review appears on order detail

**Expected**:
- ✅ Rating selection works (tap feedback visual)
- ✅ Character counter accurate
- ✅ 500 char limit enforced
- ✅ Optimistic update shows immediately
- ✅ Backend sync completes within 2 seconds
- ✅ No errors on submit

**If Issues**:
- Check: Is order marked as "delivered"?
- Check: Have you already reviewed this order? (one per order)
- Check backend: `docker-compose logs api | grep review`

---

### TEST 5: Profile & Addresses (10 min)

**Prerequisites**:
- Logged in as customer
- Have saved addresses in backend (or create one via address-picker)

**Steps**:
1. Tap "Profile" tab
2. Verify screen shows:
   - User avatar or initials
   - Phone number
   - Account creation date
   - "Customer" role badge
3. Tap "Saved Addresses"
4. Verify addresses list:
   - Shows all saved addresses
   - Displays label (Home, Work, etc.)
   - Shows full address and city
   - Shows "Default" badge on primary address
5. Tap "Add New Address"
6. Address picker opens
7. Tap on map or search
8. Verify address details fill
9. Save address
10. Verify new address in list

**Expected**:
- ✅ Profile info displays correctly
- ✅ Addresses load within 1 second
- ✅ Address picker works smoothly
- ✅ Can add/view addresses
- ✅ List updates after add

**If Issues**:
- Check: Are you logged in?
- Check: Do you have saved addresses? (backend must have responses)

---

### TEST 6: Offline Support (10 min)

**Prerequisites**:
- App running on simulator/device
- Connected to internet initially

**Steps**:
1. Open app normally (verify internet works)
2. Navigate to Orders tab
3. Scroll and load some data
4. **Enable Airplane Mode** (or disconnect wifi)
5. Verify **Offline Banner** appears at top
6. Try to:
   - Scroll order list (should show cached data)
   - Tap order detail (should show cached order, if viewed before)
   - Tap "Reorder" → Should say "No internet connection"
   - Tap "Cancel" → Should say "No internet connection"
   - Tap "Review" → Should say "No internet connection"
7. **Disable Airplane Mode** (reconnect to internet)
8. Verify **Offline Banner** disappears
9. Tap "Retry" on any failed action
10. Verify request succeeds and UI updates

**Expected**:
- ✅ Offline banner appears/disappears correctly
- ✅ Cached data shows while offline
- ✅ Buttons disabled with helpful message
- ✅ Retry works after reconnect
- ✅ No app crashes while offline

**If Issues**:
- Check: Is your WiFi actually disconnected?
- Verify: Launch app, then disconnect (not before)

---

### TEST 7: Error Handling & Recovery (10 min)

**Prerequisites**:
- App running
- Backend running

**Steps**:
1. Open app (should load normally)
2. **Stop backend**: `docker-compose down`
3. Try to:
   - Load orders → Should show error "Failed to load orders"
   - Tap retry → Should show loading spinner
   - **Start backend**: `docker-compose up` (in another terminal)
   - Tap retry again → Should load successfully
4. Navigate to profile
5. Try to load addresses
6. **Stop backend again** while loading
7. Verify error shows gracefully
8. **Start backend** again
9. Verify retry works and loads data

**Expected**:
- ✅ Network errors show friendly messages
- ✅ No app crashes on error
- ✅ Retry button appears and works
- ✅ Works after backend restarts
- ✅ Data loads successfully on retry

**If Issues**:
- Check: Is docker-compose actually running?
- Check app logs for detailed error messages

---

### TEST 8: Performance Check (10 min)

**Prerequisites**:
- App running on actual device (not simulator for accurate results)
- Feature tests completed

**Steps**:
1. Open Performance Monitor (iOS: Xcode, Android: Android Studio)
2. Load order history
3. Record metrics:
   - CPU usage (should be < 30% at idle)
   - Memory usage (should be < 200 MB)
   - Scroll 50 orders
   - Record: Frame rate (should be 60 FPS smooth)
4. Load order detail (record time)
5. Load profile (record time)
6. Submit review (record time)
7. Compare to targets:
   - Order list load: < 2s
   - Order detail load: < 1s
   - Review submit: < 3s
   - Memory: < 200 MB
   - CPU idle: < 20%

**Expected**:
- ✅ Smooth scrolling (60 FPS)
- ✅ Load times within targets
- ✅ Memory reasonable
- ✅ CPU low at idle

**If Slow**:
- Check: Are you on slow network? (4G vs WiFi)
- Check: Is backend responding slowly?
- Check: Device CPU/memory available?

---

## 📝 Test Results Template

Copy this for your test run:

```markdown
## Sprint 10 Manual Testing Results

**Tester**: [Your Name]  
**Date**: [Date]  
**Device**: [iPhone XX iOS 17 / Pixel 6 Android 14]  

### Test Results

| Test | Status | Notes |
|------|--------|-------|
| Order History | ✅ PASS | - |
| Order Detail | ✅ PASS | - |
| Cancel Order | ⚠️ PARTIAL | Issue: [describe] |
| Reorder | ✅ PASS | - |
| Review Submit | ✅ PASS | - |
| Profile | ✅ PASS | - |
| Addresses | ✅ PASS | - |
| Offline | ✅ PASS | - |
| Error Recovery | ✅ PASS | - |
| Performance | ✅ PASS | - |

### Issues Found
1. [Issue description] (Severity: HIGH/MEDIUM/LOW)
2. [Issue description]

### Sign-Off
- [ ] All tests passed OR
- [ ] Issues found but non-blocking OR
- [ ] Critical issues found, needs fix

**Recommendation**: 🟩 READY / 🟡 FIX ISSUES / 🔴 BLOCK
```

---

## ⚡ Quick Commands

```bash
# Check backend logs
docker-compose logs api --tail=50 -f

# Restart backend
docker-compose restart api

# Stop all services
docker-compose down

# Start all services
docker-compose up

# View running containers
docker-compose ps

# Check app logs (iOS)
# Xcode → Window → Devices and Simulators → Select device → View logs

# Check app logs (Android)
# Android Studio → Logcat tab → Filter: your-app-name
```

---

## 🎯 Success Criteria

**Sprint 10 is production-ready when**:
- ✅ All 10 feature tests PASS
- ✅ No HIGH severity issues found
- ✅ No crashes or exceptions
- ✅ Performance acceptable
- ✅ Offline mode works
- ✅ Error recovery works
- ✅ Both iOS and Android tested

**Then**: Update [SPRINT_10_VERIFICATION.md](./SPRINT_10_VERIFICATION.md) final status → 🟩 **PRODUCTION READY**

---

**Document**: Sprint 10 Manual Testing Guide  
**Created**: April 16, 2026  
**Status**: Ready for manual testing phase
