# Credit Cleanup Job

Automated cleanup of orphaned credit reservations.

---

## 📋 Overview

**File**: `cleanup_orphaned_credit_reservations.py`  
**Schedule**: Every hour (0 * * * *)  
**Purpose**: Release credits stuck in "reserved" state  
**Timeout**: 60 minutes (reservations older than this are cleaned)

---

## 🎯 What It Does

When a user starts an exam analysis, credits are reserved. If the analysis fails or times out, these credits can get stuck. This job:

1. Finds reservations older than 60 minutes
2. Returns reserved credits to available balance
3. Updates user status back to "active"
4. Logs all cleanup operations

---

## 🚀 Usage

### Production (Docker)
```bash
# Runs automatically every hour via cron
# No manual intervention needed
docker logs -f $(docker ps -q -f name=credit-cron)
```

### Manual Execution
```bash
# Dry run (test mode - no changes)
docker exec $(docker ps -q -f name=credit-cron) \
  env DRY_RUN=true python jobs/cleanup_orphaned_credit_reservations.py

# Live run
docker exec $(docker ps -q -f name=credit-cron) \
  python jobs/cleanup_orphaned_credit_reservations.py
```

### Local Testing
```bash
# Dry run
DRY_RUN=true python jobs/cleanup_orphaned_credit_reservations.py

# Live run
python jobs/cleanup_orphaned_credit_reservations.py
```

---

## 🔍 What Gets Cleaned

### Conditions for Cleanup:
1. User status = "analysis_initiated"
2. reserved_credits > 0
3. reservation_time > 60 minutes old

### Actions Taken:
1. Credits returned: `credits += reserved_credits`
2. Reserved cleared: `reserved_credits = 0`
3. Status reset: `status = "active"`
4. Timestamp cleared: `reservation_time = NULL`

---

## 📊 Output Example

```
================================================
Credit Cleanup Job - Starting
================================================
Found 3 orphaned credit reservations to clean up

User: user123@example.com (ID: 507f1f77bcf86cd799439011)
  Reserved: 5 credits
  Age: 73 minutes
  ✅ Cleaned up successfully

User: user456@example.com (ID: 507f191e810c19729de860ea)
  Reserved: 3 credits
  Age: 125 minutes
  ✅ Cleaned up successfully

================================================
Cleanup Summary
================================================
Total Orphaned: 3
Successfully Cleaned: 3
Failed: 0
Total Credits Returned: 8
================================================
```

---

## 🔧 Configuration

### Environment Variables
```bash
# Required
MYSQL_HOST=your-mysql-host
MYSQL_PORT=3306
MYSQL_USER=your-user
MYSQL_PASSWORD=your-password
MYSQL_DATABASE=cefr_practice

# Optional
DRY_RUN=true  # Test mode, no database changes
```

### Timeout Setting
Change the 60-minute timeout in the script:
```python
# Current: 60 minutes
RESERVATION_TIMEOUT_MINUTES = 60

# Example: 30 minutes
RESERVATION_TIMEOUT_MINUTES = 30
```

---

## 📝 Database Query

The job runs this query to find orphaned reservations:

```sql
SELECT user_id, credits, reserved_credits, reservation_time,
       TIMESTAMPDIFF(MINUTE, reservation_time, NOW()) as age_minutes
FROM user_access
WHERE status = 'analysis_initiated'
  AND reserved_credits > 0
  AND reservation_time < NOW() - INTERVAL 60 MINUTE;
```

---

## 🐛 Troubleshooting

### No Cleanups Happening
```bash
# Check for orphaned records manually
docker exec $(docker ps -q -f name=credit-cron) \
  mysql -h $MYSQL_HOST -u $MYSQL_USER -p$MYSQL_PASSWORD $MYSQL_DATABASE -e \
  "SELECT COUNT(*) FROM user_access WHERE status='analysis_initiated' AND reserved_credits > 0;"
```

### Job Not Running
```bash
# Check cron is active
docker exec $(docker ps -q -f name=credit-cron) ps aux | grep cron

# Check cron schedule
docker exec $(docker ps -q -f name=credit-cron) crontab -l

# View logs
docker logs $(docker ps -q -f name=credit-cron)
```

### Database Connection Errors
```bash
# Test connection
docker exec $(docker ps -q -f name=credit-cron) \
  mysql -h $MYSQL_HOST -u $MYSQL_USER -p$MYSQL_PASSWORD -e "SELECT 1;"
```

---

## 📊 Monitoring

### Check Execution History
```bash
# View recent runs
docker exec $(docker ps -q -f name=credit-cron) \
  tail -n 100 /var/log/cron.log | grep cleanup
```

### Alert Conditions
Set up alerts for:
- ⚠️ More than 10 orphaned records per hour (indicates a problem)
- ⚠️ Job hasn't run in 2+ hours
- ⚠️ Database connection failures

---

## ✅ Success Criteria

- ✓ Runs every hour without errors
- ✓ Finds and cleans orphaned reservations
- ✓ Credits properly returned to users
- ✓ Logs show successful executions
- ✓ No database connection issues

---

## 🔄 Cron Schedule

### Current Schedule
```cron
0 * * * * cd /app && python jobs/cleanup_orphaned_credit_reservations.py >> /var/log/cron.log 2>&1
```

### Alternative Schedules

**Every 30 minutes:**
```cron
*/30 * * * * cd /app && python jobs/cleanup_orphaned_credit_reservations.py >> /var/log/cron.log 2>&1
```

**Every 2 hours:**
```cron
0 */2 * * * cd /app && python jobs/cleanup_orphaned_credit_reservations.py >> /var/log/cron.log 2>&1
```

After changing, rebuild:
```bash
docker-compose -f docker-compose.prod.yml build credit-cron
docker-compose -f docker-compose.prod.yml up -d credit-cron
```

---

**Last Updated**: October 22, 2025
