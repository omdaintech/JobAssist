# Database Backup to S3

Automated MySQL database backups to AWS S3.

---

## 📋 Overview

**File**: `backup_database_to_s3.py`  
**Schedule**: Daily at 2:00 AM UTC  
**Purpose**: Create compressed database backups and upload to S3  
**Retention**: 30 days (automatic cleanup)  
**Status**: ✅ TESTED & PRODUCTION READY

---

## 🎯 What It Does

1. **Create Backup**: Uses `mysqldump` to export database
2. **Compress**: gzip compression (~77% size reduction)
3. **Upload to S3**: Encrypted upload to S3 bucket
4. **Cleanup Old Backups**: Removes backups older than 30 days
5. **Cleanup Local Files**: Removes temporary files

---

## 📦 Backup Details

- **Format**: `{database}_{YYYYMMDD_HHMMSS}.sql.gz`
- **Example**: `cefr_practice_20251022_105900.sql.gz`
- **Storage Class**: STANDARD_IA (Infrequent Access)
- **Encryption**: AES256 server-side encryption
- **S3 Bucket**: `lingali-audio`
- **Typical Size**: 0.15 MB (compressed from 0.67 MB)
- **Compression**: ~77% size reduction

---

## 🚀 Usage

### Production (Automatic)
```bash
# Runs automatically daily at 2 AM UTC
# No manual intervention needed
docker logs -f $(docker ps -q -f name=credit-cron)
```

### Manual Backup
```bash
# Real backup
docker exec $(docker ps -q -f name=credit-cron) \
  bash -c "ENVIRONMENT=production python jobs/backup_database_to_s3.py"
```

### Test Backup (Dry Run)
```bash
# Dry run (no S3 upload)
docker exec $(docker ps -q -f name=credit-cron) \
  bash -c "DRY_RUN=true ENVIRONMENT=production python jobs/backup_database_to_s3.py"
```

### Run Test Script
```bash
# Comprehensive test (installs dependencies)
./jobs/test_backup_simple.sh
```

---

## 📊 Output Example

```
================================================================================
Database Backup to S3 - Starting
Mode: PRODUCTION
Database: cefr_practice
S3 Bucket: databaselingani
Retention: 30 days
Environment: production
================================================================================

[info] Creating database backup (backup_file=cefr_practice_20251022_105900.sql)
[info] Database backup created successfully (size=0.67 MB)
[info] Compressing backup...
[info] Backup compressed successfully (compressed=0.15 MB, ratio=77.4%)
[info] Uploading backup to S3...
[info] Backup uploaded successfully (s3://databaselingani/backups/cefr_practice_20251022_105900.sql.gz)
[info] Cleaning up old backups... (deleted=2)
[info] Local backup files cleaned up

================================================================================
Backup Result:
  Success: True
  S3 URL: s3://databaselingani/backups/cefr_practice_20251022_105900.sql.gz
  Old Backups Deleted: 2
  Cleanup Errors: 0
================================================================================
```

---

## 🔧 Configuration

### Environment Variables
```bash
# Required - MySQL
MYSQL_HOST=your-mysql-host
MYSQL_PORT=3306
MYSQL_USER=your-user
MYSQL_PASSWORD=your-password
MYSQL_DATABASE=cefr_practice

# Required - AWS S3
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_REGION=eu-central-1

# Optional
BACKUP_S3_BUCKET=lingali-audio     # Default bucket name
BACKUP_RETENTION_DAYS=30           # Default retention
DRY_RUN=true                      # Test mode
ENVIRONMENT=production            # Required for backup to run
```

### S3 Bucket Setup
```bash
# Bucket already exists: lingali-audio

# Verify access
aws s3 ls s3://lingali-audio/backups/
```

---

## 🔍 Verify Backups

### List Backups in S3
```bash
# List all backups
aws s3 ls s3://lingali-audio/backups/ --human-readable

# List recent backups
aws s3 ls s3://lingali-audio/backups/ --human-readable | tail -10
```

### Download Backup
```bash
# Download
aws s3 cp s3://lingali-audio/backups/cefr_practice_20251022_105900.sql.gz .

# Decompress
gunzip cefr_practice_20251022_105900.sql.gz
```

### Restore Backup
```bash
# Restore to database
mysql -h localhost -u cefrscore_app -p cefr_practice < cefr_practice_20251022_105900.sql

# Or with Docker
docker exec -i $(docker ps -q -f name=mysql) \
  mysql -u root -p$MYSQL_ROOT_PASSWORD cefr_practice < cefr_practice_20251022_105900.sql
```

---

## 🐛 Troubleshooting

### Backup Fails
```bash
# Check logs
docker logs $(docker ps -q -f name=credit-cron) | grep backup

# Check MySQL connection
docker exec $(docker ps -q -f name=credit-cron) \
  mysql -h $MYSQL_HOST -u $MYSQL_USER -p$MYSQL_PASSWORD -e "SELECT 1;"

# Check mysqldump
docker exec $(docker ps -q -f name=credit-cron) which mysqldump
```

### S3 Upload Fails
```bash
# Check AWS credentials
docker exec $(docker ps -q -f name=credit-cron) env | grep AWS

# Test S3 access
docker exec $(docker ps -q -f name=credit-cron) python -c \
  "import boto3; print(boto3.client('s3').list_buckets())"
```

### SSL Certificate Errors
Already fixed with `--skip-ssl` flag in mysqldump command.

### Backup File Empty
Check MySQL credentials and database permissions.

---

## 📊 Monitoring

### Check Last Backup
```bash
# List recent backups
aws s3 ls s3://lingali-audio/backups/ --human-readable | tail -5

# Get last backup details
aws s3api head-object \
  --bucket lingali-audio \
  --key backups/$(aws s3 ls s3://lingali-audio/backups/ | tail -1 | awk '{print $4}')
```

### Alert Conditions
Set up alerts for:
- ⚠️ No backup in last 36 hours
- ⚠️ Backup file size = 0
- ⚠️ S3 upload failures
- ⚠️ MySQL connection failures

---

## 🔄 Cron Schedule

### Current Schedule
```cron
0 2 * * * cd /app && ENVIRONMENT=production python jobs/backup_database_to_s3.py >> /var/log/cron.log 2>&1
```

### Alternative Schedules

**Twice daily (2 AM & 2 PM):**
```cron
0 2,14 * * * cd /app && ENVIRONMENT=production python jobs/backup_database_to_s3.py >> /var/log/cron.log 2>&1
```

**Every 6 hours:**
```cron
0 */6 * * * cd /app && ENVIRONMENT=production python jobs/backup_database_to_s3.py >> /var/log/cron.log 2>&1
```

After changing, rebuild and restart:
```bash
docker-compose -f docker-compose.prod.yml build credit-cron
docker-compose -f docker-compose.prod.yml up -d credit-cron
```

---

## 🔐 Security Features

- ✅ Server-side encryption (AES256)
- ✅ Storage class: STANDARD_IA (cost-effective)
- ✅ Metadata includes: database, host, date, environment
- ✅ No credentials in backup files
- ✅ Secure environment variable handling
- ✅ SSL disabled for local connections (intentional)

---

## 💰 Cost Estimation

**S3 Storage Costs (STANDARD_IA):**
- Storage: $0.0125 per GB/month
- PUT requests: $0.01 per 1,000 requests

**Example** (0.15 MB backup, 30 days retention):
- Storage: 30 × 0.15 MB = 4.5 MB = 0.0045 GB
- Cost: $0.0045 × $0.0125 = **$0.00006/month** (~$0.0007/year)

Essentially **free** for small databases!

---

## ✅ Success Criteria

- ✓ Runs daily at 2 AM UTC without errors
- ✓ Creates compressed backup file
- ✓ Uploads to S3 successfully
- ✓ Old backups cleaned up (30+ days)
- ✓ Logs show successful executions
- ✓ S3 bucket contains recent backups

---

## 🧪 Testing

### Run Full Test Suite
```bash
# Comprehensive test (recommended)
./jobs/test_backup_simple.sh
```

This will:
1. Install mysqldump in container
2. Test MySQL connection
3. Run dry-run backup
4. Optionally run real backup

### Test Results
- ✅ All tests passed on October 22, 2025
- ✅ Successfully uploaded to S3
- ✅ Compression ratio: 77.4%
- ✅ Production ready

---

**Last Updated**: October 22, 2025  
**Status**: ✅ Tested & Production Ready
