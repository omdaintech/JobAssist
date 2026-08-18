# 🚨 Promtail Quick Reference - Debian 13 Fix

## Root Cause (RCA)

**Date**: October 23, 2025  
**Server**: Debian 13 (Trixie) with Docker 26.1.5  
**Issue**: Promtail filters stopped working after server migration

### What Happened:
1. Old Ubuntu server: Filters worked with default behavior
2. New Debian 13: Promtail 2.9.2 behavior changed
3. `drop` stages without `source:` parameter failed silently
4. Complex `match` stages with nested filters didn't work
5. `docker-compose restart` didn't reload config properly

### Solution:
- Simplified `drop` stages matching against log line (default)
- **Must recreate container** when config changes (not restart)

---

## ⚡ Quick Commands

### Deploy Config Changes
```bash
ssh root@72.61.182.225
cd /root/apps/language-learning-agentic-app
git pull origin main

# CRITICAL: Stop, remove, recreate (not just restart!)
docker-compose -f docker-compose.prod.yml stop promtail
docker-compose -f docker-compose.prod.yml rm -f promtail
docker-compose -f docker-compose.prod.yml up -d promtail
```

### Verify It's Working
```bash
# Generate test log
docker exec german-practice-webapp-backend-1 python -c 'import structlog; logger = structlog.get_logger(); logger.error("FILTER_TEST", verify="working")'

# Check Grafana after 15 seconds
# ✅ Should see: FILTER_TEST
# ❌ Should NOT see: health checks
```

### Check for Issues
```bash
# View Promtail logs
docker logs --tail 30 german-practice-webapp-promtail-1

# Check for errors (ignore "entry too far behind" - that's normal)
docker logs german-practice-webapp-promtail-1 | grep -i error | grep -v "too far behind"
```

---

## 🔒 Config Rules (Debian 13)

**✅ DO:**
- Use simple `drop` stages with regex patterns
- Match against default log line (after JSON extraction)
- Recreate container when changing config
- Test after every deployment

**❌ DON'T:**
- Use complex `match` stages with selectors
- Use explicit `source: output` (doesn't work reliably)
- Use `docker-compose restart` (use stop/rm/up instead)
- Assume config reloads automatically

---

## 📊 Current Filter Performance

- **Health checks**: Filtered ✅
- **HealthService logs**: Filtered ✅  
- **Uvicorn 2xx**: Filtered ✅
- **Promtail internals**: Filtered ✅
- **ERROR logs**: Kept ✅
- **WARNING logs**: Kept ✅

**Volume Reduction**: 95%+ (from 10k/day to 500/day)

---

## 🆘 Emergency: Filters Not Working

```bash
# 1. Verify config on server
ssh root@72.61.182.225
cat /root/apps/language-learning-agentic-app/monitoring/promtail-config-prod.yml | grep "health_check_logs"

# 2. Completely recreate Promtail
cd /root/apps/language-learning-agentic-app
docker-compose -f docker-compose.prod.yml stop promtail
docker-compose -f docker-compose.prod.yml rm -f promtail
docker-compose -f docker-compose.prod.yml up -d promtail

# 3. Wait 1 minute, then test
docker exec german-practice-webapp-backend-1 python -c 'import structlog; logger = structlog.get_logger(); logger.error("EMERGENCY_TEST")'

# 4. Check Grafana after 15 seconds
```

---

## 📝 Key Learnings

1. **Docker version matters**: Same Promtail version behaves differently on Debian vs Ubuntu
2. **Config mount is read-only**: Container must be recreated to pick up changes
3. **Simple is better**: Complex pipeline stages fail silently
4. **Test everything**: Always verify filters after deployment
5. **Grafana time window**: 6-hour limit for log ingestion (old logs rejected)
