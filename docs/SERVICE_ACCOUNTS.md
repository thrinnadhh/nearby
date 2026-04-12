# NearBy Service Accounts Setup Checklist

> Comprehensive checklist for creating and managing all third-party service accounts.
> Each service is critical to production. Create accounts in order and store credentials in 1Password.

---

## Table of Contents

1. GitHub / DigitalOcean
2. Supabase
3. Cloudflare
4. Cashfree
5. MSG91
6. Firebase
7. Ola Maps
8. Slack (optional notifications)

---

## 1. GitHub & DigitalOcean

### 1.1 GitHub Organization Setup

- [ ] Create GitHub organization: `nearby-app` (https://github.com/new)
- [ ] Add team members as collaborators
- [ ] Enable branch protection on `main`:
  - [ ] Require pull request reviews before merging
  - [ ] Require status checks to pass
  - [ ] Require branches to be up to date
- [ ] Create GitHub Teams:
  - [ ] `@nearby-app/backend` — backend developers
  - [ ] `@nearby-app/mobile` — mobile app developers
  - [ ] `@nearby-app/devops` — infrastructure
  - [ ] `@nearby-app/security` — security reviews

### 1.2 GitHub SSH Key for Deployments

```bash
# Generate SSH key (no passphrase for CI/CD)
ssh-keygen -t rsa -b 4096 -C "github-ci@nearby.app" -f ~/.ssh/github_deploy -N ""

# Add public key to GitHub
cat ~/.ssh/github_deploy.pub | pbcopy
# Go to https://github.com/settings/keys → New SSH key → Paste

# Save private key to 1Password (team vault)
# Store as "GitHub Deploy Key"
```

### 1.3 DigitalOcean Setup

- [ ] Create DigitalOcean account: https://www.digitalocean.com/
- [ ] Create new team for NearBy project
- [ ] Add team members
- [ ] Generate API token for Coolify integration:
  - [ ] Go to **Account** → **API** → **Tokens**
  - [ ] Create token with **read** + **write** permissions
  - [ ] Store as `DIGITALOCEAN_API_TOKEN` in 1Password
- [ ] Create DigitalOcean Spaces (optional):
  - [ ] Region: Singapore (SG1)
  - [ ] For logs, backups, non-critical storage

---

## 2. Supabase (PostgreSQL + Auth)

### 2.1 Create Supabase Project

- [ ] Go to https://supabase.com/dashboard
- [ ] Click **New Project**
- [ ] Configure:
  - [ ] Name: `nearby-prod`
  - [ ] Region: Singapore (Asia, closest to India)
  - [ ] Database password: **Generate strong password** (20+ chars, mix of upper/lower/numbers/symbols)
  - [ ] Store password in 1Password

### 2.2 Get Supabase Credentials

After project initializes (~3 minutes), go to **Settings** → **API**:

- [ ] Copy **Project URL** → `SUPABASE_URL`
- [ ] Copy **Anon Key** → `SUPABASE_ANON_KEY`
- [ ] Copy **Service Role Key** → `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Store all in 1Password

### 2.3 Enable Required Features

- [ ] Go to **SQL Editor** → Run migrations from `supabase/migrations/`
- [ ] Go to **Database** → **Backups**
  - [ ] Confirm auto-backup is enabled (daily)
  - [ ] Set retention to 30 days
- [ ] Go to **Authentication** → **Providers**
  - [ ] Disable all OAuth providers (we use OTP only)
  - [ ] Enable OTP (email + SMS)
- [ ] Go to **Database** → **RLS (Row Level Security)**
  - [ ] Verify all policies are enabled
  - [ ] Test policies with test queries

### 2.4 Supabase Service Account (for Admin Operations)

The backend uses `SUPABASE_SERVICE_ROLE_KEY` for admin operations:
- Never expose this key to clients
- Only used in backend server code
- Stored in GitHub Secrets + environment variables
- Rotated every 90 days

---

## 3. Cloudflare (DNS, CDN, R2 Storage)

### 3.1 Cloudflare Account Setup

- [ ] Create account: https://www.cloudflare.com/
- [ ] Add domain: `nearby.app`
- [ ] Update nameservers to Cloudflare (provided during setup)
- [ ] Wait for DNS propagation (can take 24 hours)

### 3.2 Cloudflare R2 (Object Storage)

**Create 2 buckets:**

**Bucket 1: Public Products**
- [ ] Name: `nearby-products`
- [ ] Region: Singapore (APAC)
- [ ] Public URL: `https://cdn.nearby.app`
  - [ ] Add CNAME: `nearby-cdn.nearby.app` → Cloudflare R2
- [ ] CORS enabled for images
- [ ] Max object size: 50MB (for product images)

**Bucket 2: Private KYC Documents**
- [ ] Name: `nearby-kyc`
- [ ] Region: Singapore (APAC)
- [ ] Private (no public access)
- [ ] Accessible only via signed URLs (5-minute expiry)
- [ ] Max object size: 100MB (for documents)

### 3.3 Cloudflare R2 API Token

- [ ] Go to **R2** → **Account API Tokens**
- [ ] Create token:
  - [ ] Name: `nearby-api`
  - [ ] Permissions: Object Read & Write
  - [ ] TTL: 1 year
  - [ ] Buckets: Both `nearby-products` and `nearby-kyc`
- [ ] Store credentials:
  - [ ] `CLOUDFLARE_ACCOUNT_ID`
  - [ ] `CLOUDFLARE_R2_ACCESS_KEY_ID`
  - [ ] `CLOUDFLARE_R2_SECRET_ACCESS_KEY`

### 3.4 Cloudflare DNS Records

- [ ] Go to **DNS** → **Records**
- [ ] Create A record: `api.nearby.app` → Your DigitalOcean IP
- [ ] Create A record: `admin.nearby.app` → Your DigitalOcean IP
- [ ] Create A record: `app.nearby.app` → Your DigitalOcean IP (or CDN endpoint)
- [ ] Create CNAME: `nearby-cdn.nearby.app` → Cloudflare R2 endpoint
- [ ] Enable proxy (orange cloud) for CDN caching

### 3.5 SSL/TLS Setup

- [ ] Go to **SSL/TLS** → **Overview**
- [ ] Set to **Full** (Cloudflare terminates TLS)
- [ ] Go to **SSL/TLS** → **Edge Certificates**
  - [ ] Enable Universal SSL (free)
  - [ ] Auto-renewal: enabled
- [ ] Add Certificate Authority Authorization (CAA) record:
  ```
  example.com CAA 0 issue "letsencrypt.org"
  example.com CAA 0 issuewild "letsencrypt.org"
  ```

---

## 4. Cashfree (Payment Processing)

### 4.1 Cashfree Account Setup

- [ ] Create account: https://dashboard.cashfree.com/
- [ ] Verify business details
- [ ] Activate account (may require KYC verification)

### 4.2 Get Cashfree Credentials

- [ ] Go to **Settings** → **API Keys**
- [ ] Copy **App ID** → `CASHFREE_APP_ID`
- [ ] Copy **Secret Key** → `CASHFREE_SECRET_KEY`
- [ ] Create **Webhook Secret**:
  - [ ] Go to **Settings** → **Webhooks**
  - [ ] Create webhook for payment events
  - [ ] Set webhook URL: `https://api.nearby.app/webhooks/cashfree`
  - [ ] Copy webhook secret → `CASHFREE_WEBHOOK_SECRET`
- [ ] Store all in 1Password

### 4.3 Enable Payment Methods

- [ ] Go to **Settings** → **Payment Methods**
- [ ] Enable:
  - [ ] UPI (critical for India)
  - [ ] Debit Card
  - [ ] Credit Card
  - [ ] Net Banking
  - [ ] Wallet (Amazon Pay, PayZapp, etc.)
- [ ] Disable international cards initially

### 4.4 Configure Settlements

- [ ] Go to **Settings** → **Settlement**
- [ ] Bank account details:
  - [ ] Add shop settlement bank account
  - [ ] Verify bank account (small deposit confirmation)
  - [ ] Settlement schedule: Daily at 11 PM IST
- [ ] Settlement charges: 0% (direct to bank account)

### 4.5 Test Mode

- [ ] Use `CASHFREE_ENV=sandbox` during development
- [ ] Test credentials (separate from production):
  - [ ] Sandbox App ID
  - [ ] Sandbox Secret Key
  - [ ] Store separately in 1Password

**Production Credentials:**
- [ ] Switch `CASHFREE_ENV=production` before go-live
- [ ] Use production credentials from Cashfree
- [ ] Test payments with real money first

### 4.6 Webhook Verification

Backend validates webhook signature:
```javascript
// backend/src/services/cashfree.js
const crypto = require('crypto');
function verifyWebhookSignature(payload, signature, secret) {
  const digest = crypto.createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  return digest === signature;
}
```

Always enable in production.

---

## 5. MSG91 (OTP & SMS)

### 5.1 MSG91 Account Setup

- [ ] Create account: https://msg91.com/ (select India)
- [ ] Add payment method (credit/debit card)
- [ ] Verify phone number
- [ ] Complete KYC (required for India, takes ~2 hours)

### 5.2 Get MSG91 Credentials

- [ ] Go to **Dashboard** → **API**
- [ ] Copy **Auth Key** → `MSG91_AUTH_KEY`
- [ ] Go to **Templates** → **OTP Templates**
- [ ] Create template:
  - [ ] Message: `Your NearBy OTP is: #OTP#`
  - [ ] Copy **Template ID** → `MSG91_TEMPLATE_ID`
- [ ] Go to **Settings** → **Sender IDs**
  - [ ] Sender ID: `NEARBY` (must be pre-approved)
  - [ ] Copy **Sender ID** → `MSG91_SENDER_ID`
- [ ] Store all in 1Password

### 5.3 DLT Compliance (India Mandatory)

MSG91 OTPs require DLT (Distributed Ledger Technology) registration:

- [ ] Go to **DLT** → **Templates**
- [ ] Register template: `Your NearBy OTP is: #OTP#`
- [ ] DLT registration can take 2-4 hours
- [ ] Once approved, SMS sending is enabled

### 5.4 Add Credit / Set Budget

- [ ] Go to **Billing** → **Add Credit**
- [ ] Add credit (₹1000 minimum)
- [ ] SMS rate: ₹0.18/SMS
- [ ] OTP rate: ₹0.10/OTP (cheaper than regular SMS)
- [ ] Budget: ₹5000/month recommended

### 5.5 Monitor SMS Send Rate

- [ ] Go to **Reports** → **SMS**
- [ ] Check daily sent count
- [ ] Monitor bounce/failure rate
- [ ] Set up alerts for low credit

---

## 6. Firebase (Push Notifications)

### 6.1 Firebase Project Setup

- [ ] Go to https://console.firebase.google.com/
- [ ] Create new project: `nearby-prod`
- [ ] Add Google Cloud billing (credit card required, but free tier available)
- [ ] Wait for project initialization

### 6.2 Enable Firebase Services

- [ ] Enable **Cloud Messaging** (FCM)
  - [ ] Go to **Project Settings** → **Cloud Messaging**
  - [ ] Copy **Server API Key** (if needed, deprecated but kept for reference)
- [ ] Enable **Realtime Database** (optional, we use Socket.IO instead)
- [ ] Enable **Firestore** (optional, we use Supabase instead)

### 6.3 Create Service Account

- [ ] Go to **Project Settings** → **Service Accounts**
- [ ] Click **Generate New Private Key**
- [ ] JSON file downloads automatically
- [ ] Store in 1Password (team vault):
  - [ ] `FIREBASE_PROJECT_ID`
  - [ ] `FIREBASE_PRIVATE_KEY`
  - [ ] `FIREBASE_CLIENT_EMAIL`

**Never commit this JSON to Git.**

### 6.4 Setup FCM in Mobile Apps

Backend will send FCM messages using the service account:

```javascript
// Example FCM message send (backend code)
const admin = require('firebase-admin');
admin.messaging().sendMulticast({
  tokens: [deviceTokens],
  notification: {
    title: 'Order Accepted',
    body: 'Your order #123 has been accepted',
  },
  data: {
    orderId: '123',
    type: 'order_accepted',
  },
});
```

Mobile apps register for notifications (handled by Expo):
```javascript
// Customer app (React Native)
const token = await Notifications.getDevicePushTokenAsync();
// Send token to backend to store in user's profile
```

---

## 7. Ola Maps (Geolocation & Routing)

### 7.1 Ola Maps Account Setup

- [ ] Go to https://maps.olacabs.com/
- [ ] Create developer account
- [ ] Verify email
- [ ] Complete KYC (India-based, required)

### 7.2 Get Ola Maps API Key

- [ ] Go to **Developer Portal** → **Projects**
- [ ] Create new project: `nearby`
- [ ] Copy **API Key** → `OLA_MAPS_API_KEY`
- [ ] Store in 1Password

### 7.3 Enable Required APIs

- [ ] Enable **Geocoding API** (address to lat/lng)
- [ ] Enable **Distance Matrix API** (for ETA calculation)
- [ ] Enable **Routes API** (for turn-by-turn directions)
- [ ] Enable **Autocomplete API** (address suggestions)

### 7.4 API Quota & Rate Limits

- [ ] Free tier: 1M calls/month
- [ ] Default rate limit: 1000 req/minute
- [ ] NearBy usage: ~500k calls/month (geo search + ETA)

Monitor quota:
- [ ] Go to **Dashboard** → **Usage**
- [ ] Set up alerts for >80% quota

---

## 8. Slack Integration (Optional but Recommended)

### 8.1 Create Slack Workspace

- [ ] Go to https://slack.com/create
- [ ] Create workspace: `nearby-team`
- [ ] Invite team members

### 8.2 Enable Incoming Webhooks

- [ ] Go to https://api.slack.com/apps
- [ ] Create New App → From scratch
- [ ] Name: `Nearby Bot`
- [ ] Workspace: Select your workspace
- [ ] Go to **Incoming Webhooks** → **Add New Webhook to Workspace**
- [ ] Select channel: `#deployments` (create if needed)
- [ ] Copy **Webhook URL** → `SLACK_WEBHOOK_URL`
- [ ] Store in 1Password + GitHub Secrets

### 8.3 Enable Events API

- [ ] Go to **Event Subscriptions** → Toggle On
- [ ] Request URL: `https://api.nearby.app/webhooks/slack`
- [ ] Subscribe to events:
  - [ ] `message.channels`
  - [ ] `message.groups`

### 8.4 Create Bot User

- [ ] Go to **OAuth & Permissions** → **Scopes**
- [ ] Add bot token scopes:
  - [ ] `chat:write`
  - [ ] `channels:read`
  - [ ] `users:read`
- [ ] Install to workspace
- [ ] Copy **Bot User OAuth Token** (for advanced use)

---

## 9. Credentials Storage in 1Password

### 9.1 Create 1Password Vault Structure

```
Team Vault: NearBy Production
├── GitHub
│   ├── GitHub Deploy Key (SSH private key)
│   ├── GitHub PAT (Personal Access Token)
│   └── GitHub Actions Secrets
├── DigitalOcean
│   ├── API Token
│   ├── Droplet SSH Key
│   └── Spaces Keys
├── Supabase
│   ├── Project URL
│   ├── Anon Key
│   ├── Service Role Key
│   └── Database Password
├── Cloudflare
│   ├── Account ID
│   ├── R2 Access Key ID
│   ├── R2 Secret Access Key
│   └── API Token
├── Cashfree
│   ├── Production App ID
│   ├── Production Secret Key
│   ├── Webhook Secret
│   ├── Sandbox App ID
│   ├── Sandbox Secret Key
│   └── Bank Account Details
├── MSG91
│   ├── Auth Key
│   ├── Template ID
│   ├── Sender ID
│   └── Credit Balance
├── Firebase
│   ├── Service Account JSON
│   ├── Project ID
│   ├── Private Key
│   └── Client Email
├── Ola Maps
│   ├── API Key
│   └── Project Details
└── Slack
    └── Webhook URL
```

### 9.2 Access Control

- [ ] Grant access only to team members who need it
- [ ] Roles:
  - [ ] **Admin**: Full access to all secrets
  - [ ] **Backend Engineer**: Supabase, Cashfree, MSG91, Firebase, Ola Maps
  - [ ] **DevOps**: DigitalOcean, Cloudflare, GitHub, Coolify
  - [ ] **Frontend Engineer**: Read-only access to API endpoints

---

## 10. GitHub Secrets Configuration

### 10.1 Add Secrets to GitHub Actions

Navigate to **Settings** → **Secrets and variables** → **Actions**:

| Secret Name | Source | Notes |
|-------------|--------|-------|
| `SUPABASE_URL` | Supabase Settings | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Settings | Service role key |
| `REDIS_URL` | DigitalOcean | `redis://redis:6379` (production) |
| `TYPESENSE_HOST` | DigitalOcean | `typesense` (Docker service) |
| `TYPESENSE_PORT` | DigitalOcean | `8108` |
| `TYPESENSE_API_KEY` | .env.production | Random 32-char hex |
| `JWT_SECRET` | .env.production | Random 32-char hex |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare | From R2 settings |
| `CLOUDFLARE_R2_ACCESS_KEY_ID` | Cloudflare | From R2 API token |
| `CLOUDFLARE_R2_SECRET_ACCESS_KEY` | Cloudflare | From R2 API token |
| `CASHFREE_APP_ID` | Cashfree | Production App ID |
| `CASHFREE_SECRET_KEY` | Cashfree | Production Secret Key |
| `CASHFREE_WEBHOOK_SECRET` | Cashfree | Webhook secret |
| `MSG91_AUTH_KEY` | MSG91 | Auth key |
| `FIREBASE_PROJECT_ID` | Firebase | From service account |
| `FIREBASE_PRIVATE_KEY` | Firebase | From service account JSON |
| `OLA_MAPS_API_KEY` | Ola Maps | API key |
| `COOLIFY_WEBHOOK_URL` | Coolify | Deployment webhook |
| `SLACK_WEBHOOK_URL` | Slack | Incoming webhook URL |

### 10.2 Rotate Secrets Regularly

- [ ] Set calendar reminder for 90-day secret rotation
- [ ] Rotate all API keys quarterly
- [ ] Rotate passwords semi-annually
- [ ] Update 1Password after rotation

---

## 11. Verification Checklist

Before going to production, verify all accounts:

- [ ] All services created and credentials stored in 1Password
- [ ] GitHub secrets configured in Actions
- [ ] DNS records pointing to DigitalOcean
- [ ] SSL certificates active
- [ ] Database backups enabled
- [ ] Payment gateway (Cashfree) in production mode
- [ ] OTP service (MSG91) DLT registered
- [ ] Firebase service account JSON downloaded
- [ ] Slack notifications working
- [ ] Coolify webhook configured
- [ ] Health checks passing on all services
- [ ] Load test completed (at least 100 concurrent users)
- [ ] Security audit passed
- [ ] Incident response plan documented

---

## 12. Team Access Rights

| Role | Accounts | Access Level |
|------|----------|--------------|
| Backend Lead | All | Full |
| DevOps Engineer | DigitalOcean, Cloudflare, Coolify, GitHub | Full |
| Backend Engineer | Supabase, Cashfree, MSG91, Firebase, Ola Maps | Read-only to sensitive data |
| Mobile Engineer | Firebase, Slack | Read-only |
| Product Manager | Analytics dashboards only | Read-only |

---

## Emergency Contacts

Store these in 1Password + Team Wiki:

| Service | Support Email | Status Page |
|---------|--------------|------------|
| Cloudflare | support@cloudflare.com | https://www.cloudflarestatus.com/ |
| Supabase | support@supabase.io | https://status.supabase.com/ |
| Cashfree | support@cashfree.com | https://status.cashfree.com/ |
| MSG91 | support@msg91.com | https://status.msg91.com/ |
| Firebase | firebase-support@google.com | https://status.cloud.google.com/ |
| Ola Maps | support@olacabs.com | — |
| DigitalOcean | support@digitalocean.com | https://status.digitalocean.com/ |

---

*Last updated: April 12, 2026*
