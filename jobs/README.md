# Background Jobs & Cron Scripts

Automated background jobs for database maintenance and backups.

---

## 📋 Available Jobs

| Job | Schedule | Purpose | Details |
|-----|----------|---------|---------|
| **cleanup_orphaned_credit_reservations.py** | Every hour | Clean up stuck credit reservations | [CREDIT_CLEANUP.md](CREDIT_CLEANUP.md) |
| **backup_database_to_s3.py** | Daily 2 AM UTC | Backup MySQL database to S3 | [DATABASE_BACKUP.md](DATABASE_BACKUP.md) |

---

## 🚀 Quick Start

### Start All Cron Jobs (Production)
```bash
docker-compose -f docker-compose.prod.yml up -d credit-cron
```

### View Logs
```bash
docker-compose -f docker-compose.prod.yml logs -f credit-cron
```

### Manual Test Run
```bash
# Dry run (no changes)
docker exec $(docker ps -q -f name=credit-cron) \
  env DRY_RUN=true python jobs/cleanup_orphaned_credit_reservations.py

# Real run
docker exec $(docker ps -q -f name=credit-cron) \
  python jobs/cleanup_orphaned_credit_reservations.py
```

---

## 🏗️ Architecture

### Separate Cron Container
- **Service**: `credit-cron`
- **Dockerfile**: `Dockerfile.cron`
- **Isolation**: Independent from API server
- **Logs**: `/var/log/cron.log` inside container

### Why Separate?
1. ✅ Resource isolation
2. ✅ Independent scaling
3. ✅ Easier monitoring
4. ✅ API restarts don't affect cron

---

## 📊 Monitoring

### Check Container Status
```bash
docker ps | grep cron
docker-compose -f docker-compose.prod.yml ps credit-cron
```

### View Logs
```bash
# Live tail
docker logs -f $(docker ps -q -f name=credit-cron)

# Last 100 lines
docker exec $(docker ps -q -f name=credit-cron) tail -n 100 /var/log/cron.log
```

### Verify Cron Schedule
```bash
docker exec $(docker ps -q -f name=credit-cron) crontab -l
```

---

## 🔧 Common Commands

### Build & Deploy
```bash
# Build cron container
docker-compose -f docker-compose.prod.yml build credit-cron

# Start
docker-compose -f docker-compose.prod.yml up -d credit-cron

# Restart
docker-compose -f docker-compose.prod.yml restart credit-cron

# Stop
docker-compose -f docker-compose.prod.yml stop credit-cron
```

### Testing
```bash
# Test credit cleanup
./test_backup_simple.sh

# Test database backup
docker exec $(docker ps -q -f name=credit-cron) \
  env ENVIRONMENT=production python jobs/backup_database_to_s3.py
```

---

## 🐛 Troubleshooting

### Cron Not Running?
```bash
# Check process
docker exec $(docker ps -q -f name=credit-cron) ps aux | grep cron

# Restart
docker-compose -f docker-compose.prod.yml restart credit-cron
```

### Check Environment Variables
```bash
docker exec $(docker ps -q -f name=credit-cron) env | grep -E "(MYSQL|AWS)"
```

### Verify Database Connection
```bash
docker exec $(docker ps -q -f name=credit-cron) \
  mysql -h $MYSQL_HOST -u $MYSQL_USER -p$MYSQL_PASSWORD -e "SELECT 1;"
```

---

## 📝 Environment Variables Required

```bash
# MySQL Database
MYSQL_HOST=your-mysql-host
MYSQL_PORT=3306
MYSQL_USER=your-user
MYSQL_PASSWORD=your-password
MYSQL_DATABASE=cefr_practice

# AWS S3 (for backups)
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_REGION=eu-central-1
BACKUP_S3_BUCKET=databaselingani

# Control
ENVIRONMENT=production  # Required for jobs to run
DRY_RUN=true           # Optional: test mode
```

---

## 🔐 Security

- ✅ All credentials from environment variables
- ✅ No hardcoded secrets
- ✅ S3 backups encrypted at rest (AES256)
- ✅ MySQL connections use secure authentication

---

## 📦 Docker Configuration

The jobs run in a dedicated container built from `Dockerfile.cron`:
- Includes `cron` daemon
- Includes `mysqldump` for backups
- Includes all Python dependencies
- Runs both jobs on separate schedules

---

## ⚙️ Cron Schedule

Current production schedule:
```cron
# Hourly: Cleanup orphaned credit reservations
0 * * * * cd /app && python jobs/cleanup_orphaned_credit_reservations.py

# Daily 2 AM UTC: Database backup to S3
0 2 * * * cd /app && ENVIRONMENT=production python jobs/backup_database_to_s3.py
```

---

## 📚 Documentation

- **[CREDIT_CLEANUP.md](CREDIT_CLEANUP.md)** - Credit cleanup job details
- **[DATABASE_BACKUP.md](DATABASE_BACKUP.md)** - Database backup job details

---

## ✅ Health Checks

Jobs are healthy when:
- ✓ Container is running
- ✓ Cron process is active
- ✓ Logs show regular executions
- ✓ No errors in `/var/log/cron.log`
- ✓ Database backups appear in S3

---

**Last Updated**: October 22, 2025  
**Tested**: Docker v24.0+, MySQL 8.0+

