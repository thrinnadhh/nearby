# NearBy AI Master Context File

## 🛠 Tech Stack
- **Frontend**: React Native + Expo (TypeScript), React + Vite (Admin)
- **Backend**: Node.js + Express (JavaScript)
- **Database**: Supabase (PostgreSQL + RLS)
- **Cache**: Redis 7 (BullMQ, Rate Limiting, GPS)
- **Search**: Typesense 0.25 (Geo-search, full-text)
- **Auth**: OTP (MSG91) + JWT (jsonwebtoken)
- **Payments**: Cashfree (Webhooks, Settlements)
- **Storage**: Cloudflare R2 (Images, CSV uploads)
- **Maps**: Ola Maps (Geocoding, Routing, ETA)
- **Notifications**: FCM (Push), MSG91 (SMS)

## 🏗 Domain Rules
- **Pricing**: All delivery fee calculations must be server-side.
- **GPS**: Real-time partner locations stored in Redis (Geo-indexing).
- **HMAC**: All payment webhooks must verify HMAC signature.
- **Roles**: customer, shop, delivery, admin.

## 🔌 API Conventions
- **Base**: /api/v1/
- **Success**: { "success": true, "data": { ... } }
- **Error**: { "success": false, "error": { "code": "E001", "message": "..." } }

## 📡 Socket.IO Rooms
- `order:{orderId}`: order updates
- `shop:{shopId}`: new order alerts
- `delivery:{partnerId}`: assignments
- `admin`: monitor

## 🔧 Workflow
- Run infrastructure via `docker-compose up -d redis typesense`
- Start backend: `npm run dev`
- Commit: `feat(scope): message` or `fix(scope): message`

## 🔴 Never Do
- Never use local storage for permanent data.
- Never write DB queries in route handlers (use services).
- Never ignore try/catch in async flows.
