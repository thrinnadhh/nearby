# NearBy Infrastructure Setup Guide

> Complete step-by-step guide to set up production infrastructure on DigitalOcean.
> Estimated time: 2-3 hours. Cost: $24/month (2vCPU, 4GB RAM droplet).

---

## Prerequisites

- DigitalOcean account (https://www.digitalocean.com/)
- Coolify account (https://coolify.io/)
- GitHub account with SSH keys configured
- Domain name (e.g., nearby.app, api.nearby.app)
- Cloudflare account (https://www.cloudflare.com/)

---

## Phase 1: DigitalOcean Droplet Setup

### 1.1 Create a Droplet

1. Log in to DigitalOcean Dashboard
2. Click **Create** → **Droplets**
3. Configure:
   - **Region**: Bangalore (BLR1) — **critical for 10ms latency to Hyderabad users**
   - **Operating System**: Ubuntu 22.04 LTS
   - **Droplet Type**: Basic (Shared CPU)
   - **Size**: 2GB memory / 1 vCPU — **$12/month**
     - (Recommended upgrade to 4GB / 2vCPU for production — $24/month)
   - **Authentication**: SSH keys (add your public key)
   - **Hostname**: `nearby-api-prod`
   - **VPC**: Default (or create new if preferred)

4. Click **Create Droplet**
5. Note your droplet's **public IP address** (e.g., `165.225.130.100`)

### 1.2 Initial Server Configuration

```bash
# SSH into your droplet
ssh root@YOUR_DROPLET_IP

# Update system packages
apt update && apt upgrade -y

# Install curl, wget, git, docker
apt install -y curl wget git

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
usermod -aG docker root

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" \
  -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Verify installations
docker --version
docker-compose --version

# Create app directory
mkdir -p /app/nearby
cd /app/nearby
```

### 1.3 Configure Firewall

```bash
# Enable UFW firewall
ufw enable

# Allow SSH (critical — do this FIRST)
ufw allow 22/tcp

# Allow HTTP/HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Allow API port
ufw allow 3000/tcp

# Allow Socket.IO
ufw allow 3001/tcp

# Verify rules
ufw status
```

---

## Phase 2: Coolify Installation & Configuration

### 2.1 Install Coolify on DigitalOcean Droplet

Coolify is a self-hosted deployment platform. It handles Docker, SSL, and container management.

```bash
# SSH into droplet
ssh root@YOUR_DROPLET_IP

# Install Coolify (official installation method)
# See https://coolify.io/docs for latest instructions
docker run -d \
  --name coolify \
  --restart always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /coolify:/data \
  -p 3000:3000 \
  coollabs/coolify:latest

# Wait 30 seconds for startup
sleep 30

# Get Coolify logs and note the admin token
docker logs coolify | grep -A 5 "Starting Coolify"
```

Access Coolify at: `http://YOUR_DROPLET_IP:3000`

### 2.2 Configure Coolify

1. **First time setup:**
   - Set admin email
   - Set strong password
   - Accept terms

2. **Add SSH key for GitHub:**
   - Go to Settings → SSH keys
   - Generate new SSH key or import existing
   - Add public key to GitHub (https://github.com/settings/keys)

3. **Connect GitHub repository:**
   - Go to Repositories
   - Click "Link Repository"
   - Select: `nearby-app/nearby`
   - Branch: `main`

4. **Create Docker application:**
   - Go to Applications → New Application
   - Name: `nearby-api`
   - Source: Docker Compose
   - Compose file location: `docker-compose.prod.yml`
   - Port: `3000`
   - Health check: `GET /health`

5. **Configure deployment:**
   - Auto-deploy on push to `main`: ✅ enabled
   - Auto-pull latest image: ✅ enabled
   - Auto-restart on failure: ✅ enabled

---

## Phase 3: Environment Variables & Secrets

### 3.1 Create Production .env

Create `/app/nearby/.env.production` on the droplet:

```bash
# ─── SERVER ──────────────────────────────────────────────────────────────────
PORT=3000
NODE_ENV=production

# ─── JWT ─────────────────────────────────────────────────────────────────────
JWT_SECRET=$(openssl rand -hex 32)  # Generate with: openssl rand -hex 32
JWT_EXPIRES_IN=7d

# ─── SUPABASE ─────────────────────────────────────────────────────────────────
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY

# ─── REDIS ────────────────────────────────────────────────────────────────────
# Redis runs in Docker on the same droplet
REDIS_URL=redis://redis:6379

# ─── SOCKET.IO ────────────────────────────────────────────────────────────────
SOCKET_ALLOWED_ORIGINS=https://app.nearby.app,https://admin.nearby.app,https://partner.nearby.app

# ─── TYPESENSE ────────────────────────────────────────────────────────────────
# Typesense runs in Docker on the same droplet
TYPESENSE_HOST=typesense
TYPESENSE_PORT=8108
TYPESENSE_PROTOCOL=http
TYPESENSE_API_KEY=$(openssl rand -hex 32)

# ─── CLOUDFLARE R2 ────────────────────────────────────────────────────────────
CLOUDFLARE_ACCOUNT_ID=YOUR_CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_R2_ACCESS_KEY_ID=YOUR_R2_ACCESS_KEY_ID
CLOUDFLARE_R2_SECRET_ACCESS_KEY=YOUR_R2_SECRET_ACCESS_KEY
R2_PRODUCTS_BUCKET=nearby-products
R2_KYC_BUCKET=nearby-kyc
R2_PUBLIC_URL=https://nearby-cdn.YOUR_DOMAIN.com

# ─── CASHFREE ─────────────────────────────────────────────────────────────────
CASHFREE_APP_ID=YOUR_CASHFREE_APP_ID
CASHFREE_SECRET_KEY=YOUR_CASHFREE_SECRET_KEY
CASHFREE_WEBHOOK_SECRET=YOUR_CASHFREE_WEBHOOK_SECRET
CASHFREE_ENV=production

# ─── MSG91 ────────────────────────────────────────────────────────────────────
MSG91_AUTH_KEY=YOUR_MSG91_AUTH_KEY
MSG91_TEMPLATE_ID=YOUR_MSG91_TEMPLATE_ID
MSG91_SENDER_ID=NEARBY

# ─── FIREBASE ─────────────────────────────────────────────────────────────────
FIREBASE_PROJECT_ID=YOUR_FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL=YOUR_FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY=YOUR_FIREBASE_PRIVATE_KEY

# ─── OLA MAPS ─────────────────────────────────────────────────────────────────
OLA_MAPS_API_KEY=YOUR_OLA_MAPS_API_KEY

# ─── APP CONFIG ───────────────────────────────────────────────────────────────
OTP_TTL_SECONDS=300
OTP_MAX_ATTEMPTS=3
OTP_LOCKOUT_SECONDS=600
ORDER_ACCEPT_WINDOW_MS=180000
GEO_DEFAULT_RADIUS_KM=3
GEO_EXPANDED_RADIUS_KM=5
```

### 3.2 Store Secrets in Coolify

In Coolify dashboard:

1. Go to **Application** → **nearby-api** → **Environment Variables**
2. Add each variable from `.env.production`
3. Mark sensitive values (passwords, keys) as **Secret**
4. Coolify will encrypt and not display them in logs

**Never commit `.env.production` to Git.**

---

## Phase 4: Database Setup (Supabase)

### 4.1 Create Supabase Project

1. Go to https://supabase.com/dashboard
2. Click **New Project**
3. Configure:
   - **Name**: `nearby-prod`
   - **Region**: Singapore (Asia, closest to India)
   - **Password**: Strong password (store in 1Password)

4. Wait for project to initialize (~3 minutes)

### 4.2 Run Migrations

```bash
# From your local machine
npm install -g supabase

# Link your project
supabase link --project-ref YOUR_PROJECT_REF

# Run all migrations in order
supabase db push

# Verify
supabase db list
```

Migrations create:
- `profiles` — user authentication & roles
- `shops` — shop listings
- `products` — product catalog
- `orders` — order history
- `order_items` — items in each order
- `reviews` — customer ratings
- `disputes` — order disputes
- RLS policies for data isolation

### 4.3 Enable RLS (Row-Level Security)

All tables except `profiles` have RLS enabled by default. Verify:

```sql
-- In Supabase SQL Editor
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' AND tablename != 'migrations';
```

---

## Phase 5: Redis Setup (Docker on DigitalOcean)

Redis runs as a Docker container on the same droplet. It persists data using AOF (Append-Only File).

### 5.1 Docker Compose for Redis

Create `/app/nearby/docker-compose.prod.yml`:

```yaml
services:
  api:
    image: nearby-api:latest
    container_name: nearby_api
    ports:
      - "3000:3000"
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - REDIS_URL=redis://redis:6379
      - TYPESENSE_HOST=typesense
    depends_on:
      - redis
      - typesense
    env_file:
      - .env.production
    restart: always

  redis:
    image: redis:7-alpine
    container_name: nearby_redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes --maxmemory 2gb --maxmemory-policy allkeys-lru
    restart: always
    healthcheck:
      test: ["CMD", "redis-cli", "PING"]
      interval: 10s
      timeout: 5s
      retries: 5

  typesense:
    image: typesense/typesense:0.25.2
    container_name: nearby_typesense
    ports:
      - "8108:8108"
    volumes:
      - typesense_data:/data
    command: --data-dir /data --api-key=${TYPESENSE_API_KEY} --enable-cors
    restart: always
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8108/health"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  redis_data:
  typesense_data:
```

### 5.2 Backup Redis Data

```bash
# SSH to droplet
ssh root@YOUR_DROPLET_IP

# Backup Redis daily
0 2 * * * docker exec nearby_redis redis-cli BGSAVE && \
  cp /var/lib/docker/volumes/nearby_redis_data/_data/dump.rdb \
  /backups/redis_dump_$(date +\%Y\%m\%d).rdb

# Add to crontab
crontab -e
```

---

## Phase 6: Typesense Setup (Docker on DigitalOcean)

Typesense runs as a Docker container on the same droplet for search.

### 6.1 Initialize Typesense Collections

After Typesense container starts, seed the collections:

```bash
# From droplet
docker exec nearby_api npm run seed:typesense

# Verify collections created
curl -X GET "http://localhost:8108/collections" \
  -H "X-TYPESENSE-API-KEY: ${TYPESENSE_API_KEY}"
```

Collections created:
- `shops` — searchable shop listings (name, category, trust_score, location)
- `products` — searchable products (name, price, shop_id, stock_qty)

---

## Phase 7: Cloudflare R2 Setup

### 7.1 Create Cloudflare R2 Buckets

1. Log in to Cloudflare (https://www.cloudflare.com/)
2. Go to **R2** → **Create bucket**

**Bucket 1: Products (Public)**
- Name: `nearby-products`
- Region: Singapore (APAC)
- Access: Public (serves product images via CDN)

**Bucket 2: KYC (Private)**
- Name: `nearby-kyc`
- Region: Singapore (APAC)
- Access: Private (only accessible via signed URLs)

### 7.2 Configure CORS for R2

For product images to load in browsers:

```json
[
  {
    "AllowedOrigins": ["https://app.nearby.app", "https://admin.nearby.app"],
    "AllowedMethods": ["GET"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

### 7.3 Create R2 API Token

1. Go to **R2** → **Account API Tokens**
2. Click **Create API Token**
3. Name: `nearby-api`
4. Permissions: **Object Read & Write**
5. Buckets: Both `nearby-products` and `nearby-kyc`
6. Save credentials in 1Password:
   - `CLOUDFLARE_R2_ACCESS_KEY_ID`
   - `CLOUDFLARE_R2_SECRET_ACCESS_KEY`
   - `CLOUDFLARE_ACCOUNT_ID`

### 7.4 Setup R2 CDN

1. Go to **R2** → **nearby-products** → **Settings**
2. Click **Create Public URL** (generates CDN URL)
3. Optionally add custom domain (requires CNAME to Cloudflare)

Custom domain setup:
```
nearby-cdn.YOUR_DOMAIN.com CNAME to c2d7f9a7.r2.cloudflarestorage.com
```

---

## Phase 8: Cloudflare DNS Configuration

### 8.1 Point Domain to DigitalOcean

1. Log in to Cloudflare
2. Go to **DNS** → **Records**
3. Add A records:

```
api.nearby.app          A  YOUR_DROPLET_IP
app.nearby.app          A  YOUR_DROPLET_IP
admin.nearby.app        A  YOUR_DROPLET_IP
nearby-cdn.nearby.app   CNAME  c2d7f9a7.r2.cloudflarestorage.com
```

4. Enable **Proxy** (orange cloud icon) for CDN caching
5. Enable **SSL/TLS** → **Full**

### 8.2 SSL Certificate Setup

Cloudflare provides free SSL/TLS. To auto-renew on DigitalOcean:

```bash
# SSH to droplet
ssh root@YOUR_DROPLET_IP

# Install Certbot for Let's Encrypt backup
apt install -y certbot python3-certbot-nginx

# Request certificate (for non-Cloudflare fallback)
certbot certonly --standalone -d api.nearby.app -d admin.nearby.app

# Auto-renew daily
echo "0 3 * * * certbot renew --quiet" | crontab -
```

---

## Phase 9: GitHub Actions Secrets

### 9.1 Add Deployment Secrets to GitHub

1. Go to **GitHub repo** → **Settings** → **Secrets and variables** → **Actions**

2. Add these secrets:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `REDIS_URL`
   - `TYPESENSE_HOST`
   - `TYPESENSE_PORT`
   - `TYPESENSE_API_KEY`
   - `JWT_SECRET`
   - `CLOUDFLARE_R2_ACCESS_KEY_ID`
   - `CLOUDFLARE_R2_SECRET_ACCESS_KEY`
   - `CLOUDFLARE_ACCOUNT_ID`
   - `CASHFREE_APP_ID`
   - `CASHFREE_SECRET_KEY`
   - `CASHFREE_WEBHOOK_SECRET`
   - `MSG91_AUTH_KEY`
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_PRIVATE_KEY`
   - `OLA_MAPS_API_KEY`
   - `COOLIFY_WEBHOOK_URL` — from Coolify app settings
   - `SLACK_WEBHOOK_URL` — optional, for Slack notifications

### 9.2 Verify Workflow File

Check `.github/workflows/deploy.yml` references all secrets:

```bash
grep -o "secrets\.[A-Z_]*" .github/workflows/deploy.yml
```

---

## Phase 10: Monitoring & Logging

### 10.1 Enable DigitalOcean Monitoring

```bash
# SSH to droplet
ssh root@YOUR_DROPLET_IP

# Install monitoring agent
curl -sSL https://repos.insights.digitalocean.com/install.sh | bash

# Verify
ps aux | grep monitoring
```

Monitor metrics:
- CPU usage
- Memory usage
- Disk I/O
- Network bandwidth

### 10.2 View Application Logs

```bash
# View Docker Compose logs
docker-compose -f /app/nearby/docker-compose.prod.yml logs -f api

# Tail specific service
docker logs --tail 100 nearby_api

# Save logs to file
docker logs nearby_api > /var/log/nearby_api.log 2>&1
```

---

## Phase 11: Backup & Disaster Recovery

### 11.1 DigitalOcean Snapshots

Create weekly snapshots of your droplet:

```bash
# SSH to droplet
doctl compute droplet-snapshot create \
  nearby-api-prod \
  --snapshot-name "nearby-backup-$(date +%Y%m%d)"
```

Add to crontab:
```bash
0 1 * * 0 doctl compute droplet-snapshot create nearby-api-prod --snapshot-name "nearby-backup-$(date +%Y%m%d)"
```

### 11.2 Database Backup

Supabase automatically backs up daily. Access backups:
1. Go to Supabase dashboard → **Backups**
2. Restore to point-in-time if needed

### 11.3 Redis Backup

Redis dump.rdb is automatically backed up daily:
```bash
# Manual backup
docker exec nearby_redis redis-cli BGSAVE

# Verify backup file
ls -lh /var/lib/docker/volumes/nearby_redis_data/_data/dump.rdb
```

---

## Phase 12: Health Checks & Verification

### 12.1 Verify All Services

```bash
# SSH to droplet
ssh root@YOUR_DROPLET_IP

# Check API
curl http://localhost:3000/health

# Check Redis
docker exec nearby_redis redis-cli PING

# Check Typesense
curl http://localhost:8108/health

# Check Socket.IO
curl -i http://localhost:3001/socket.io/?EIO=4&transport=polling

# View all running containers
docker ps
```

### 12.2 Test Deployment Pipeline

1. Make a small change to `backend/src/index.js`
2. Commit to `main` branch
3. Push to GitHub
4. Watch GitHub Actions in **Actions** tab
5. Verify deployment completes in Coolify
6. Test deployed API: `curl https://api.nearby.app/health`

---

## Troubleshooting

### Redis connection fails
```bash
# Restart Redis
docker restart nearby_redis

# Check logs
docker logs nearby_redis

# Verify connectivity
docker exec nearby_api node -e "require('ioredis')('redis://redis:6379')"
```

### Typesense collections missing
```bash
# Re-seed collections
docker exec nearby_api npm run seed:typesense

# View collections
curl -X GET "http://localhost:8108/collections" \
  -H "X-TYPESENSE-API-KEY: ${TYPESENSE_API_KEY}"
```

### Supabase migrations failed
```bash
# Check migration status
supabase migration list --project-ref YOUR_PROJECT_REF

# Manually run migration
supabase db push --project-ref YOUR_PROJECT_REF
```

### Coolify deployment stuck
1. Go to Coolify dashboard → **Logs**
2. Check Docker build output
3. Verify `.env.production` is set correctly
4. Restart: `docker-compose restart`

### Out of disk space
```bash
# Check disk usage
df -h

# Clean up Docker
docker system prune -a --volumes

# Check what's taking space
du -sh /var/lib/docker/*
```

---

## Cost Breakdown

| Service | Cost/Month | Notes |
|---------|-----------|-------|
| DigitalOcean Droplet | $24 | 2vCPU, 4GB RAM, Bangalore |
| Cloudflare | $0 | Free tier (includes R2 + DNS + SSL) |
| Supabase | $0–$25 | Free tier covers ~100k req/day; pay-as-you-go after |
| Cashfree | 1.75% of transactions | Payment processing fee |
| MSG91 | ₹0.18/SMS | Only for OTP sends (~₹500–1000/mo for 5k users) |
| Firebase | $0 | Free tier (FCM push notifications) |
| Ola Maps | $0 | 1M free calls/month included |
| **Total** | **~₹2,500–3,500** | **Per month** |

---

## Next Steps

1. Complete all 12 phases above
2. Run deployment test: push to `main` and verify
3. Monitor Slack notifications
4. Set up team access to Coolify, Supabase, Cloudflare dashboards
5. Document passwords in 1Password (team vault)
6. Schedule weekly backup verification
7. Set up on-call rotation for alerts

---

*Last updated: April 12, 2026*
