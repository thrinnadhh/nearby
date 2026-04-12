# NearBy CI/CD Runbook

> Operational guide for deploying, rolling back, monitoring, and debugging the NearBy platform in production.
> Reference this document when deploying, troubleshooting, or responding to incidents.

---

## Table of Contents

1. Deployment Process
2. Health Checks
3. Monitoring & Logging
4. Rollback Procedures
5. Common Issues & Fixes
6. Incident Response
7. Database Management
8. Performance Tuning

---

## 1. Deployment Process

### 1.1 Pre-Deployment Checklist

Before every deployment to production:

```bash
# 1. Ensure you're on the main branch
git status
# Expected: "On branch main"

# 2. Pull latest changes
git pull origin main

# 3. Run all tests locally
cd backend
npm test -- --coverage

# 4. Verify coverage >= 80%
# Expected: All metrics (statements, branches, functions, lines) >= 80%

# 5. Check for security vulnerabilities
npm audit

# 6. Verify Docker build
docker build -t nearby-api:test ./backend

# 7. Review changes
git log --oneline main -5
git diff origin/main...HEAD

# 8. Verify .env.example has all required vars
grep -c "^[A-Z_]*=" .env.example
# Expected: 30+ variables
```

### 1.2 Standard Deployment Flow

**Option A: Automatic (Recommended)**

GitHub Actions automatically deploys on push to `main`:

```bash
# 1. Make code changes in a feature branch
git checkout -b feature/my-feature

# 2. Commit and push
git add .
git commit -m "feat: add new feature"
git push origin feature/my-feature

# 3. Create Pull Request on GitHub
# https://github.com/nearby-app/nearby/pull/new/feature/my-feature

# 4. Wait for tests to pass (5-10 minutes)
# Go to PR → "Checks" tab

# 5. Merge to main (after approval)
# Click "Squash and merge"

# 6. GitHub Actions auto-deploys
# Go to repo → "Actions" → watch deploy workflow

# 7. Verify deployment in Coolify
# https://coolify.nearby.app → Applications → nearby-api → Logs
```

**Option B: Manual Deployment (Emergency)**

If GitHub Actions fails, deploy manually:

```bash
# SSH to production droplet
ssh root@YOUR_DROPLET_IP

# Navigate to app directory
cd /app/nearby

# Pull latest code
git pull origin main

# Rebuild Docker image
docker build -t nearby-api:latest ./backend

# Restart container in Coolify
docker-compose down
docker-compose -f docker-compose.prod.yml up -d

# Verify deployment
curl -s http://localhost:3000/health | jq .

# Check logs
docker logs -f nearby_api --tail 100
```

### 1.3 Deployment Monitoring

Once deployed, monitor:

```bash
# 1. Check API health
curl -s https://api.nearby.app/health | jq .
# Expected: { "status": "ok", "version": "1.0.0" }

# 2. Check Socket.IO
curl -i https://api.nearby.app:3001/socket.io/?EIO=4&transport=polling
# Expected: HTTP 200

# 3. Monitor application logs
# Option 1: SSH to droplet
ssh root@YOUR_DROPLET_IP
docker logs -f nearby_api --tail 50

# Option 2: Coolify dashboard
# https://coolify.nearby.app → Applications → nearby-api → Logs

# 4. Check Slack notifications
# #deployments channel should have success message

# 5. Monitor for errors
# Expected: No ERROR or CRITICAL log lines in first 2 minutes

# 6. Check metrics
# Go to DigitalOcean droplet → Monitoring
# CPU < 30%, Memory < 60%, Disk < 80%
```

### 1.4 Post-Deployment Verification

Run these checks 30 minutes after deployment:

```bash
# 1. Test customer order creation
curl -X POST https://api.nearby.app/api/v1/orders \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "shop_id": "123e4567-e89b-12d3-a456-426614174000",
    "items": [{"product_id": "xyz", "qty": 1}],
    "delivery_address": "123 Main St"
  }'

# 2. Test shop search
curl https://api.nearby.app/api/v1/search/shops?lat=17.3&lng=78.5&radius=3

# 3. Check database connection
# Login to Supabase dashboard → SQL Editor
# Run: SELECT NOW();

# 4. Check Redis connection
ssh root@YOUR_DROPLET_IP
docker exec nearby_redis redis-cli PING
# Expected: PONG

# 5. Check Typesense
curl -s http://localhost:8108/health | jq .
# Expected: { "ok": true }

# 6. Monitor error rates
# Check logs for spike in 500 errors
docker logs nearby_api | grep "500" | wc -l
# Expected: 0 or very low number
```

---

## 2. Health Checks

### 2.1 Automated Health Checks

NearBy health endpoint checks all dependencies:

```bash
curl https://api.nearby.app/health
```

Response:
```json
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2026-04-12T10:30:00Z",
  "checks": {
    "database": "ok",
    "redis": "ok",
    "typesense": "ok",
    "r2": "ok",
    "cache": "ok"
  }
}
```

**If any check is down**, immediately run Section 5 (Common Issues).

### 2.2 Manual Service Checks

```bash
# SSH to droplet
ssh root@YOUR_DROPLET_IP

# Check all running containers
docker ps
# Expected: 3-4 containers running (api, redis, typesense, possibly others)

# Check Redis
docker exec nearby_redis redis-cli PING
# Expected: PONG

# Check Typesense health
docker exec nearby_typesense curl -s http://localhost:8108/health | jq .

# Check disk space
df -h
# Expected: / use < 80%

# Check memory
free -h
# Expected: Available > 500MB

# Check CPU
top -bn1 | head -15
# Expected: Load average < number of CPUs (e.g., < 2 for 2vCPU)

# Check network (Supabase)
docker exec nearby_api curl -s https://YOUR_PROJECT.supabase.co/health | jq .
```

### 2.3 Dependency Health Checks

```bash
# Supabase
curl -s -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  https://YOUR_PROJECT.supabase.co/rest/v1/profiles?limit=1

# Cloudflare R2
curl -s https://YOUR_DOMAIN.com/health  # Should reach DigitalOcean

# Cashfree
curl -X POST https://api.cashfree.com/pg/orders \
  -H "X-Client-Id: $CASHFREE_APP_ID" \
  -H "X-Client-Secret: $CASHFREE_SECRET_KEY" \
  2>&1 | grep -q "unauthorized"  # Expected: auth error (proves connectivity)

# Firebase
docker exec nearby_api node -e "
  require('firebase-admin').initializeApp();
  require('firebase-admin').messaging().send({
    data: { test: 'true' },
    topic: 'test'
  }).catch(e => console.log('Connected: ' + !!e));
"

# Ola Maps
curl -s "https://api.olamaps.io/routing/v1/directions?origin=17.3,78.5&destination=17.4,78.6&api_key=$OLA_MAPS_API_KEY" | jq .

# MSG91
curl -s "http://api.msg91.com/api/v5/flow/" \
  -H "authkey: $MSG91_AUTH_KEY" | grep -q "message"
```

---

## 3. Monitoring & Logging

### 3.1 Real-Time Logs

```bash
# SSH to droplet
ssh root@YOUR_DROPLET_IP

# Follow API logs
docker logs -f nearby_api --tail 100

# Follow Redis logs
docker logs -f nearby_redis --tail 100

# Follow Typesense logs
docker logs -f nearby_typesense --tail 100

# Combine all logs (requires docker-compose)
cd /app/nearby
docker-compose logs -f --tail 50

# Filter for errors
docker logs nearby_api | grep -i "error\|fatal\|critical"

# Filter for specific request
docker logs nearby_api | grep "request-id-123"
```

### 3.2 Log Parsing

```bash
# Count requests by endpoint
docker logs nearby_api | grep "GET\|POST\|PATCH\|DELETE" | \
  awk '{print $NF}' | sort | uniq -c | sort -rn

# Count errors by type
docker logs nearby_api | grep "ERROR" | \
  grep -oP '"error":\{"code":"[^"]+' | sort | uniq -c

# Check response times
docker logs nearby_api | grep "ms" | \
  awk '{print $(NF-1)}' | sed 's/ms//' | \
  awk '{sum+=$1; count++} END {print "Avg:", sum/count "ms"}'

# Check for OOM (out of memory) errors
docker logs nearby_api | grep -i "memory\|oom\|killed"
```

### 3.3 Metrics & Dashboards

**DigitalOcean Monitoring:**
```bash
# View in browser
# https://cloud.digitalocean.com/monitoring/droplets/YOUR_DROPLET_ID

# Metrics tracked:
# - CPU %
# - Memory %
# - Disk I/O
# - Bandwidth (in/out)
# - Load average
```

**Application Metrics (from logs):**
```bash
# Request rate (requests/minute)
docker logs nearby_api --since 1m | grep "GET\|POST" | wc -l

# Error rate
docker logs nearby_api --since 1m | grep "ERROR" | wc -l

# Average response time
docker logs nearby_api --since 10m | grep "ms" | \
  awk '{print $(NF-1)}' | sed 's/ms//' | \
  awk '{sum+=$1; count++} END {printf "%.0f\n", sum/count}'

# Unique users
docker logs nearby_api --since 1h | grep "userId" | \
  grep -oP 'userId[^,]*' | sort -u | wc -l
```

### 3.4 Alert Setup

Configure Slack notifications in GitHub:

```yaml
# .github/workflows/deploy.yml (already configured)
- name: Notify Slack on failure
  if: failure()
  env:
    SLACK_WEBHOOK: ${{ secrets.SLACK_WEBHOOK_URL }}
```

Manual alert if needed:

```bash
# Send Slack alert
curl -X POST $SLACK_WEBHOOK_URL \
  -H 'Content-Type: application/json' \
  -d '{
    "text": "🚨 NearBy API: High error rate detected (>5% errors/min)",
    "attachments": [{
      "color": "danger",
      "fields": [{
        "title": "Action Required",
        "value": "Check logs immediately"
      }]
    }]
  }'
```

---

## 4. Rollback Procedures

### 4.1 Rollback to Previous Version

If deployment causes critical issues:

```bash
# SSH to droplet
ssh root@YOUR_DROPLET_IP

# Option 1: Rollback to previous commit
cd /app/nearby
git log --oneline | head -5  # See recent commits

# Checkout previous commit
git checkout PREVIOUS_COMMIT_HASH

# Rebuild and restart
docker build -t nearby-api:latest ./backend
docker-compose down
docker-compose -f docker-compose.prod.yml up -d

# Verify
curl -s http://localhost:3000/health

# Option 2: Use DigitalOcean snapshot (if available)
# This restores the entire droplet to a previous state
# Go to DigitalOcean → Snapshots → Create from snapshot
# (Only if repository is corrupted or multiple services broken)
```

### 4.2 Graceful Rollback (Zero-Downtime)

For rolling back without downtime:

```bash
# Start old container while new one is running
docker run -d --name nearby_api_old \
  --network nearby_default \
  -e REDIS_URL=redis://redis:6379 \
  nearby-api:previous-tag

# Switch load balancer (if using one) or DNS
# Point nearby_api alias to nearby_api_old

# Wait for in-flight requests to complete (30 seconds)
sleep 30

# Stop new container
docker stop nearby_api

# Verify old container is healthy
curl -s http://localhost:3000/health

# Cleanup
docker rm nearby_api
docker rename nearby_api_old nearby_api
```

### 4.3 Database Rollback

If data corruption during deployment:

```bash
# Supabase automatic backup
# Go to Supabase dashboard → Backups
# Click "Restore" on daily backup
# Restores to point-in-time within 24 hours

# For urgent situations:
# Contact Supabase support for immediate backup recovery
```

### 4.4 Redis Data Recovery

If Redis data is lost:

```bash
# Redis persists to dump.rdb (daily backups)
ssh root@YOUR_DROPLET_IP

# Check backup file
ls -lh /var/lib/docker/volumes/nearby_redis_data/_data/dump.rdb

# Restore from backup
docker stop nearby_redis
cp /backups/redis_dump_PREVIOUS_DATE.rdb \
  /var/lib/docker/volumes/nearby_redis_data/_data/dump.rdb
docker start nearby_redis

# Verify
docker exec nearby_redis redis-cli DBSIZE
```

---

## 5. Common Issues & Fixes

### 5.1 API Returns 503 (Service Unavailable)

**Symptom:** `curl https://api.nearby.app/health` returns 503 error

**Diagnosis:**
```bash
# Check which dependency is down
curl -s http://localhost:3000/health | jq .checks

# Example response:
# "database": "down" or "redis": "down"
```

**Fix:**

**If Supabase is down:**
```bash
# 1. Check internet connectivity
docker exec nearby_api curl -s https://YOUR_PROJECT.supabase.co/health

# 2. Verify connection string in .env
echo $SUPABASE_URL

# 3. Check Supabase status: https://status.supabase.com/

# 4. If credentials are wrong, update .env.production
# Edit on droplet
ssh root@YOUR_DROPLET_IP
nano /app/nearby/.env.production
# Update SUPABASE_URL and keys
docker-compose restart api
```

**If Redis is down:**
```bash
# 1. Check Redis container
docker ps | grep redis
# If not running, start it
docker-compose up -d redis

# 2. Check Redis logs
docker logs nearby_redis | tail -50

# 3. Check disk space
df -h
# If full, run: docker system prune -a

# 4. Restart Redis
docker restart nearby_redis

# 5. Verify connectivity
docker exec nearby_redis redis-cli PING
```

**If Typesense is down:**
```bash
# 1. Check Typesense container
docker ps | grep typesense

# 2. Check Typesense health
docker exec nearby_typesense curl -s http://localhost:8108/health

# 3. Restart Typesense
docker restart nearby_typesense

# 4. Re-seed collections (if data lost)
docker exec nearby_api npm run seed:typesense
```

### 5.2 High Memory Usage (>80%)

**Symptom:** Memory usage climbing, application slowing down

**Diagnosis:**
```bash
# Check memory
free -h

# Check which container is consuming
docker stats

# Check for memory leaks
docker logs nearby_api | grep -i "memory\|heap"
```

**Fix:**
```bash
# Option 1: Increase droplet size
# Go to DigitalOcean → Droplet → Resize
# Recommended: 4GB → 8GB

# Option 2: Reduce memory usage
# 1. Clear Redis old data
docker exec nearby_redis redis-cli FLUSHDB
# WARNING: Clears all cache, may cause performance dip

# 2. Implement memory limits in docker-compose.prod.yml
# Add: memory: 2g  # 2GB per container

# 3. Restart containers
docker-compose down
docker-compose -f docker-compose.prod.yml up -d

# Option 3: Find and fix memory leak in code
docker logs nearby_api | grep -i "leak\|retained"
# Report to backend team for fix
```

### 5.3 Database Connection Pool Exhausted

**Symptom:** Errors like "Cannot acquire pool connection" or "Pool max connections reached"

**Diagnosis:**
```bash
# Check active connections
docker exec nearby_api psql $SUPABASE_URL -c \
  "SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;"
```

**Fix:**
```bash
# Option 1: Restart API (closes idle connections)
docker restart nearby_api

# Option 2: Increase pool size in Supabase
# Go to Supabase → Database → Configuration
# Increase connection limit

# Option 3: Investigate leaks
docker logs nearby_api | grep "pool\|connection"
# Report to backend team
```

### 5.4 Webhook Signature Verification Failures

**Symptom:** Cashfree webhook responses: "Invalid signature"

**Diagnosis:**
```bash
# Check webhook secret in .env
echo $CASHFREE_WEBHOOK_SECRET

# Verify it matches Cashfree dashboard
# Go to Cashfree → Settings → Webhooks → Copy secret
```

**Fix:**
```bash
# Option 1: Update webhook secret
ssh root@YOUR_DROPLET_IP
nano /app/nearby/.env.production
# Update CASHFREE_WEBHOOK_SECRET to match Cashfree dashboard
docker restart nearby_api

# Option 2: Regenerate webhook secret in Cashfree
# Go to Cashfree → Settings → Webhooks
# Delete old webhook, create new one
# Update .env.production and restart

# Option 3: Check webhook handler code
# backend/src/routes/payments.js
# Verify HMAC signature verification is enabled
```

### 5.5 OTP Not Sending (MSG91)

**Symptom:** Users not receiving OTP SMS

**Diagnosis:**
```bash
# Check MSG91 credits
# Go to MSG91 dashboard → Billing

# Check template approval
# Go to MSG91 → DLT Templates → Verify "APPROVED" status

# Check logs for errors
docker logs nearby_api | grep "msg91\|otp\|sms" -i
```

**Fix:**
```bash
# Option 1: Add credit to MSG91
# Go to MSG91 → Billing → Add Credit (₹1000 minimum)

# Option 2: Approve template in MSG91
# If template is pending, contact MSG91 support (2-4 hour wait)

# Option 3: Check AUTH_KEY in .env
ssh root@YOUR_DROPLET_IP
echo $MSG91_AUTH_KEY
# Verify it matches MSG91 dashboard

# Option 4: Test MSG91 directly
curl "http://api.msg91.com/api/v5/flow/" \
  -H "authkey: $MSG91_AUTH_KEY" \
  -d "route=4&sender=NEARBY&mobiles=919999999999&message=test"
```

### 5.6 Socket.IO Connection Refused

**Symptom:** Clients cannot connect to Socket.IO on port 3001

**Diagnosis:**
```bash
# Check if port is open
curl -i http://localhost:3001/socket.io/?EIO=4&transport=polling

# Check firewall
ufw status | grep 3001
```

**Fix:**
```bash
# Option 1: Open firewall port
ufw allow 3001/tcp

# Option 2: Check if Socket.IO server is running
docker logs nearby_api | grep "Socket.IO\|3001"

# Option 3: Check SOCKET_ALLOWED_ORIGINS
# Update in .env.production to include your domain
# Restart: docker restart nearby_api

# Option 4: Check reverse proxy (Coolify/Nginx)
# May need to configure WebSocket upgrade headers
```

---

## 6. Incident Response

### 6.1 Critical Incident Playbook

When production is down:

**Step 1: Assess Impact (2 minutes)**
```bash
# 1. Verify status
curl -s https://api.nearby.app/health | jq .

# 2. Check error rate
ssh root@YOUR_DROPLET_IP
docker logs nearby_api | grep "ERROR" | wc -l

# 3. Notify team (Slack)
# Message #incidents channel with status update

# 4. Estimate user impact
# E.g., "Affecting ~500 active orders"
```

**Step 2: Immediate Triage (5 minutes)**
```bash
# Check health of each dependency
# 1. Database: curl -s $SUPABASE_URL/health
# 2. Redis: docker exec nearby_redis redis-cli PING
# 3. Typesense: curl -s http://localhost:8108/health
# 4. Disk space: df -h | grep -E "/$|/app"
# 5. Memory: free -h
```

**Step 3: Quick Fixes (10 minutes)**
```bash
# Try basic recovery:
docker restart nearby_api
docker restart nearby_redis
docker restart nearby_typesense

# Verify recovery
curl -s http://localhost:3000/health
```

**Step 4: If Still Down (Rollback)**
```bash
# Reference Section 4.1 Rollback
git log --oneline | head -5
git checkout PREVIOUS_COMMIT_HASH
docker build -t nearby-api:latest ./backend
docker-compose down
docker-compose -f docker-compose.prod.yml up -d
```

**Step 5: Root Cause Analysis (30 minutes after recovery)**
```bash
# Collect logs
docker logs nearby_api > /tmp/incident_logs.txt
docker logs nearby_redis >> /tmp/incident_logs.txt

# Check error patterns
grep "ERROR\|CRITICAL" /tmp/incident_logs.txt

# Check resource usage spikes
docker stats --no-stream

# Document timeline
# 1. Time incident started
# 2. What was deployed
# 3. What caused the issue
# 4. How it was fixed
# 5. Prevention for next time
```

### 6.2 On-Call Rotation

Set up rotation for rapid response:

```bash
# On-call engineer responsibilities:
# - Respond to Slack alerts within 15 minutes
# - Perform initial triage
# - Rollback if necessary
# - Escalate to backend lead if unable to resolve

# Escalation matrix:
# Level 1 (On-call engineer): Basic restarts, health checks
# Level 2 (Backend lead): Code investigation, rollback
# Level 3 (CTO/DevOps): Architecture changes, infrastructure issues
```

### 6.3 Incident Postmortem Template

After every critical incident:

```markdown
# Incident Postmortem: [Incident Name]

## Summary
[Brief description of what happened]

## Timeline
- 10:30 AM: Alert triggered
- 10:32 AM: On-call engineer responded
- 10:45 AM: Root cause identified
- 10:50 AM: Fix deployed
- 11:00 AM: Verified recovered

## Root Cause
[What actually went wrong]

## Impact
- Duration: 20 minutes
- Users affected: ~5000
- Transactions failed: 0
- Revenue impact: $0

## Fix
[Temporary + permanent fix]

## Prevention
[What we'll do to prevent this]

## Action Items
- [ ] Implement monitoring alert
- [ ] Add automated test
- [ ] Update runbook
- [ ] Team training session
```

---

## 7. Database Management

### 7.1 Database Backups

**Automatic (Daily)**
```bash
# Supabase backs up automatically
# Backup window: 2 AM - 4 AM IST (daily)
# Retention: 30 days

# View backups:
# Go to Supabase dashboard → Backups
```

**Manual Backup**
```bash
# For critical deployments, create manual backup before:
# 1. Major data migration
# 2. Cashfree webhook integration
# 3. Payment reconciliation

# In Supabase dashboard → Backups → Create Backup
```

### 7.2 Database Restore

**Point-in-Time Restore**
```bash
# If data is accidentally deleted:
# 1. Go to Supabase → Backups
# 2. Click "Restore" on backup from before incident
# 3. Specify point-in-time (within 30 days)
# 4. Confirm restore (irreversible for ~30 seconds)

# Note: This restores ENTIRE database
# For selective restore, contact Supabase support
```

### 7.3 Vacuum & Maintenance

```bash
# Supabase automatically runs VACUUM weekly
# Manual trigger if needed:

ssh root@YOUR_DROPLET_IP
docker exec nearby_api psql $SUPABASE_URL -c "VACUUM ANALYZE;"

# This optimizes indexes and reclaims disk space
# Takes 5-10 minutes, causes no downtime
```

---

## 8. Performance Tuning

### 8.1 Identify Slow Queries

```bash
# Enable slow query log in Supabase
# Go to Supabase → Database → Configuration
# Set "log_min_duration_statement" = 1000 (1 second)

# View slow queries
docker exec nearby_api psql $SUPABASE_URL -c \
  "SELECT query, mean_exec_time FROM pg_stat_statements \
   WHERE mean_exec_time > 1000 \
   ORDER BY mean_exec_time DESC;"
```

### 8.2 Add Database Indexes

If slow queries detected:

```bash
# Example: Slow shop search query
# SELECT * FROM shops WHERE city_id = ? AND is_open = true
# Add index:
docker exec nearby_api psql $SUPABASE_URL -c \
  "CREATE INDEX idx_shops_city_open ON shops(city_id, is_open);"

# Verify index was created
docker exec nearby_api psql $SUPABASE_URL -c \
  "SELECT * FROM pg_indexes WHERE tablename = 'shops';"
```

### 8.3 Cache Strategy

**Redis Caching**
```bash
# Check cache hit rate
docker exec nearby_redis redis-cli INFO stats | grep "hits\|misses"

# Expected hit rate: >80%

# If hit rate low:
# 1. Increase cache TTL
# 2. Pre-populate cache on startup
# 3. Cache more endpoints
```

**Typesense Caching**
```bash
# Typesense caches search results
# Check cache size
docker exec nearby_typesense du -sh /data

# If collection gets too large (>1GB):
# 1. Archive old data to separate index
# 2. Implement pagination
# 3. Increase Typesense memory (docker-compose.yml)
```

### 8.4 Connection Pool Tuning

```bash
# In docker-compose.prod.yml, optimize connection pools:

# API connections to Supabase
# Recommended: min 5, max 20 connections

# Redis connections
# Recommended: min 1, max 10 connections

# Monitor current usage:
docker exec nearby_redis redis-cli CLIENT LIST | grep ADDR | wc -l

# If approaching limit, increase in backend/src/services/redis.js
```

---

## Checklists

### Daily Operations Checklist

- [ ] Check error rate in logs (should be < 0.1%)
- [ ] Verify all health checks passing
- [ ] Monitor disk usage (should be < 80%)
- [ ] Check backup completion logs
- [ ] Scan Slack for any alerts
- [ ] Review error logs for patterns
- [ ] Verify Redis memory usage

### Weekly Operations Checklist

- [ ] Rotate secrets (if scheduled)
- [ ] Review performance metrics
- [ ] Check database growth rate
- [ ] Verify all integrations working (Cashfree, MSG91, etc.)
- [ ] Test disaster recovery procedures
- [ ] Review and respond to GitHub issues
- [ ] Update runbook with lessons learned

### Monthly Operations Checklist

- [ ] Full security audit
- [ ] Upgrade dependencies (patch versions)
- [ ] Load test (simulate peak traffic)
- [ ] Disaster recovery drill
- [ ] Capacity planning (add more resources if needed)
- [ ] Cost review (DigitalOcean, Supabase, etc.)
- [ ] Team training on runbook

---

*Last updated: April 12, 2026*
