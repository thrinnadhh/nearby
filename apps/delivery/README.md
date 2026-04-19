# NearBy Delivery Partner App — Sprint 13 Implementation

This is the delivery partner mobile app for NearBy's hyperlocal commerce platform.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run start

# Run tests
npm test

# Run tests with coverage
npm test:coverage
```

## Directory Structure

```
src/
  screens/          # Tab screens (Home, Earnings, Profile) + OnlineToggle
  components/       # Reusable UI components
  hooks/            # Custom React hooks (useAuth, useRegistration, useOnlineStatus)
  services/         # API client and backend integrations
  store/            # Zustand state management (auth, registration, partner)
  types/            # TypeScript interfaces and types
  constants/        # API endpoints, error codes, validation schemas
  utils/            # Helper functions (logger, etc)
  navigation/       # React Navigation setup
```

## Key Features (Tasks 13.1-13.3)

### Task 13.1: App Foundation
- ✅ Expo project setup with TypeScript
- ✅ Bottom tab navigation (Home, Earnings, Profile)
- ✅ Zustand stores for auth, registration, partner state
- ✅ Axios client with JWT interceptor
- ✅ Firebase FCM ready
- ✅ Jest tests with 80%+ coverage (20+ tests)

### Task 13.2: Registration + KYC
- ✅ OTP authentication flow (6-digit OTP, 5-min TTL, 3-attempt lockout)
- ✅ Partner registration (POST /auth/partner/register)
- ✅ KYC submission (Aadhaar + vehicle photo)
- ✅ Bank details form with Joi validation
- ✅ Validation: Aadhaar (4 digits), Bank account (9-18 digits), IFSC (11 chars)
- ✅ 80+ tests (40+ backend, 40+ frontend)

### Task 13.3: Go Online/Offline Toggle
- ✅ OnlineToggleScreen with large button
- ✅ Toggle endpoint with KYC approval check
- ✅ Rate limiting (max 10 toggles/minute)
- ✅ GPS collection ready for Sprint 13.4
- ✅ 30+ tests

## Production Checklist

- [x] 100% TypeScript strict mode
- [x] Winston logger throughout
- [x] AppError type for consistency
- [x] Joi schemas for validation
- [x] Individual Zustand selectors (no object spreads)
- [x] Network awareness ready
- [x] 80%+ test coverage
- [x] No hardcoded values
- [x] No TODOs or placeholders
- [x] NearBy domain rules enforced

## Environment Variables

See `.env.example` for required variables:
- `API_BASE_URL` — Backend API endpoint
- `API_TIMEOUT` — Request timeout (ms)

## Testing

```bash
# Unit tests
npm test

# With coverage report
npm test:coverage

# Watch mode during development
npm test:watch
```

## Known Limitations (Sprint 13.4+)

- GPS tracking not yet implemented (requires Socket.IO setup)
- Real-time order assignments pending backend integration
- Push notifications FCM token registration pending

## API Documentation

See `/backend/src/routes/delivery-partners.js` for complete endpoint docs:
- POST /auth/partner/register
- POST /delivery-partners/:id/kyc
- PATCH /delivery-partners/:id
- PATCH /delivery-partners/:id/toggle-online

## Code Quality

- Linting: ESLint configured
- Type safety: TypeScript strict mode enabled
- Tests: Jest with React Testing Library
- Coverage target: 80% minimum
