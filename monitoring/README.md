# Monitoring Configuration for Grafana Cloud

This directory contains monitoring configurations for Lingali with Grafana Cloud integration.

## 🚨 CRITICAL: Promtail Log Filtering Issue (October 23, 2025)

### Root Cause Analysis (RCA)

**Problem**: After migrating to new Debian 13 server, Promtail filters stopped working and ALL logs (including health checks) were flooding Grafana Cloud.

**Root Cause**:
1. **Promtail 2.9.2 behavior change on Debian 13**: The `drop` stage without explicit `source:` parameter was NOT matching against the extracted `output` field as expected
2. **Complex pipeline stages**: Using `match` stages with selectors and nested `source: output` failed silently
3. **Config reload issue**: `docker-compose restart` did NOT properly reload the Promtail configuration file

**Working Solution**:
- Simplified `drop` stages that match directly against the log line (Promtail's default behavior after JSON extraction)
- **MUST recreate the container** (not just restart) when config changes:
  ```bash
  docker-compose -f docker-compose.prod.yml stop promtail
  docker-compose -f docker-compose.prod.yml rm -f promtail
  docker-compose -f docker-compose.prod.yml up -d promtail
  ```

### 🔒 How to Ensure the Fix Stays

**1. When Modifying Promtail Config:**
```bash
# Always use this sequence (not just "restart")
cd /root/apps/language-learning-agentic-app
git pull origin main
docker-compose -f docker-compose.prod.yml stop promtail
docker-compose -f docker-compose.prod.yml rm -f promtail
docker-compose -f docker-compose.prod.yml up -d promtail
```

**2. Verify Filtering is Working:**
```bash
# Generate test log
docker exec german-practice-webapp-backend-1 python -c 'import structlog; logger = structlog.get_logger(); logger.error("FILTER_TEST", test_id="verify123")'

# Wait 15 seconds, then check Grafana Cloud
# You should see: FILTER_TEST (✅)
# You should NOT see: health check logs (❌)
```

**3. Monitor Promtail Errors:**
```bash
# Check for Grafana Cloud rejection errors
docker logs german-practice-webapp-promtail-1 2>&1 | grep -i "error\|400\|rejected"

# Common error: "entry too far behind" = Grafana Cloud time window (6 hours)
# Solution: This is normal when recreating Promtail, new logs will work
```

**4. Config File Rules:**
- ✅ Keep `drop` stages simple with direct regex patterns
- ✅ Match against default log line (after JSON extraction)
- ❌ Avoid complex `match` stages with selectors
- ❌ Avoid explicit `source: output` (it doesn't work reliably on Debian 13)

### Current Working Configuration

**File**: `promtail-config-prod.yml`

**Key Drop Filters**:
```yaml
# Health checks
- drop:
    expression: '.*GET /api/health HTTP.*'
    drop_counter_reason: "health_check_logs"

# HealthService logs
- drop:
    expression: '.*HealthService initialized.*'
    drop_counter_reason: "health_service_init"

# Uvicorn 2xx responses
- drop:
    expression: '.*INFO:\s+\d+\.\d+\.\d+\.\d+:\d+.*HTTP/1\.[01].*2\d{2}.*'
    drop_counter_reason: "uvicorn_2xx_requests"

# Promtail's own logs
- drop:
    expression: '.*(caller=|level=info ts=|level=warn ts=).*'
    drop_counter_reason: "promtail_internal"
```

---

## Current Setup

### Production Components

- **Promtail**: Log collector that sends logs directly to Grafana Cloud
- **Grafana Cloud**: Dashboard and visualization platform
- **Docker Compose**: Manages Promtail as a service

### Configuration Files

- `promtail-config-prod.yml` - **PRODUCTION CONFIG** (actively used)
- `test-grafana-logs.sh` - Test script to verify log ingestion

---

## 🎯 What Gets Filtered Out (DROPPED)

- Database connection/auth/network logs
- HTTP health check requests to `/api/health`
- HealthService initialization logs
- Uvicorn server lifecycle logs
- Uvicorn HTTP 2xx success responses
- LangChain deprecation warnings
- Promtail's own internal logs
- Nginx worker process notices
- Empty lines

## ✅ What Gets Kept (SENT TO GRAFANA)

- Application ERROR logs
- Application WARNING logs
- HTTP 4xx/5xx error responses
- Structured application logs with custom fields
- Exception traces

## 📊 Expected Result

**95%+ reduction in log volume** sent to Grafana Cloud.

## 🚀 Quick Apply Commands

### Option 1: Docker Command (Direct)

```bash
cd monitoring

# Stop existing Promtail
docker stop promtail 2>/dev/null || true
docker rm promtail 2>/dev/null || true

# Start with clean config
docker run -d \
  --name promtail \
  --restart unless-stopped \
  -v $(pwd)/promtail-config-app-logs.yml:/etc/promtail/config.yml \
  -v /var/lib/docker/containers:/var/lib/docker/containers:ro \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -p 9080:9080 \
  grafana/promtail:latest \
  -config.file=/etc/promtail/config.yml

# Check status
docker ps | grep promtail
```

### Option 2: Using the Script

```bash
cd monitoring
chmod +x restart-promtail-clean.sh
./restart-promtail-clean.sh
```

### Option 3: Test Filtering First

```bash
cd monitoring
chmod +x test-log-filtering.sh
./test-log-filtering.sh
```

## 🔍 Verification

1. **Check Promtail is running**: `docker ps | grep promtail`
2. **Monitor Grafana Cloud**: Log volume should drop dramatically
3. **Verify only app logs**: Only structured JSON logs and errors should appear

## 📝 Configuration Files

- `promtail-config-app-logs.yml` - Clean filtering config
- `promtail-config.yml` - Main config (also updated)
- `restart-promtail-clean.sh` - Restart script
- `test-log-filtering.sh` - Test filtering patterns

## 🎯 Health Check Fix

The specific pattern `127.0.0.1:xxxxx - "GET /api/health HTTP/1.1" 200 OK` is now caught by TWO filters:

1. General HTTP request filter
2. Specific health check filter (extra safety net)

This ensures health check spam is completely eliminated from Grafana Cloud.

---

## 🚀 Deployment Commands (Production)

### Updating Promtail Config

**⚠️ CRITICAL: Must recreate container, not just restart!**

```bash
# SSH into production server
ssh root@72.61.182.225

# Navigate to app directory
cd /root/apps/language-learning-agentic-app

# Pull latest changes
git pull origin main

# IMPORTANT: Stop, remove, and recreate (not just restart)
docker-compose -f docker-compose.prod.yml stop promtail
docker-compose -f docker-compose.prod.yml rm -f promtail
docker-compose -f docker-compose.prod.yml up -d promtail

# Verify it's running
docker ps | grep promtail

# Check for errors (should be clean)
docker logs --tail 50 german-practice-webapp-promtail-1
```

### Testing Log Filtering

```bash
# Generate test logs
./monitoring/test-grafana-logs.sh

# Or manually:
docker exec german-practice-webapp-backend-1 python -c 'import structlog; logger = structlog.get_logger(); logger.error("TEST_FILTER_WORKING", test_id="123")'

# Wait 15 seconds, then check Grafana Cloud
# Expected: You see the ERROR log
# Expected: You DON'T see health check logs
```

---

## 🔧 Troubleshooting

### Issue: Health checks still appearing in Grafana

**Solution**:
1. Verify config is deployed: `cat /root/apps/language-learning-agentic-app/monitoring/promtail-config-prod.yml | grep "health_check_logs"`
2. **Recreate container** (not just restart): See deployment commands above
3. Wait 1 minute for new logs to flow through

### Issue: "entry too far behind" errors in Promtail logs

**Cause**: Grafana Cloud has a 6-hour time window for accepting logs

**Solution**: This is normal when recreating Promtail (it tries to re-send old logs). New logs will work fine. Ignore this error.

### Issue: No logs appearing in Grafana at all

**Check**:
1. Promtail container is running: `docker ps | grep promtail`
2. No authentication errors: `docker logs german-practice-webapp-promtail-1 | grep -i "auth|401|403"`
3. Grafana Cloud URL is correct in `promtail-config-prod.yml`
4. Generate test log and wait 15 seconds

---

## 🎯 Filter Effectiveness

**Before optimization**: ~10,000 log entries/day (mostly noise)  
**After optimization**: ~500-1,000 log entries/day (errors + warnings only)  
**Reduction**: **95%+ decrease** in log volume

This ensures:
- ✅ Grafana Cloud free tier limits not exceeded
- ✅ Only actionable logs visible
- ✅ Faster log searches and analysis
- ✅ Reduced noise for debugging
