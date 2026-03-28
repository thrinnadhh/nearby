# NearBy — Hyperlocal Delivery Platform

NearBy is a high-performance hyperlocal delivery platform designed for Indian markets. It connects customers with local shops and delivery partners in real-time.

## 📁 Repository Structure
- `apps/customer`: Customer mobile app (React Native)
- `apps/shop`: Shop owner mobile app (React Native)
- `apps/delivery`: Delivery partner mobile app (React Native)
- `apps/admin`: Platform admin dashboard (React + Vite)
- `backend`: Node.js Express API server
- `supabase`: Database migrations and RLS policies
- `docs`: Full documentation (PRD, Architecture, ADRs)

## 🚀 Quick Start
1. `cp .env.example .env`
2. `docker-compose up -d`
3. `cd backend && npm install && npm run dev`
4. `cd apps/customer && npm install && npx expo start`

## 📚 Documentation
- [PRD](docs/PRD.html)
- [Architecture](docs/ARCHITECTURE.md)
- [API Reference](docs/API.md)
- [Sprint Plan](docs/SPRINT_PLAN.md)
