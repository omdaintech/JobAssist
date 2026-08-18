-- Migration: 007_b2b_billing_migration.sql
-- Purpose: Introduce billing pack configuration and school usage tracking
-- Notes: Designed to be idempotent via information_schema checks

-- =============================================
-- Add new billing configuration columns to schools
-- =============================================

-- billing_pack_id
SET @column_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'schools'
      AND COLUMN_NAME = 'billing_pack_id'
);

SET @sql := IF(@column_exists = 0,
    'ALTER TABLE schools ADD COLUMN billing_pack_id VARCHAR(24) NULL',
    'SELECT "Column billing_pack_id already exists on schools" AS status'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- student_pack_id
SET @column_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'schools'
      AND COLUMN_NAME = 'student_pack_id'
);

SET @sql := IF(@column_exists = 0,
    'ALTER TABLE schools ADD COLUMN student_pack_id VARCHAR(24) NULL',
    'SELECT "Column student_pack_id already exists on schools" AS status'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- billing_cycle
SET @column_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'schools'
      AND COLUMN_NAME = 'billing_cycle'
);

SET @sql := IF(@column_exists = 0,
    "ALTER TABLE schools ADD COLUMN billing_cycle ENUM('monthly','quarterly','annual') NOT NULL DEFAULT 'monthly'",
    'SELECT "Column billing_cycle already exists on schools" AS status'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- cycle_start
SET @column_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'schools'
      AND COLUMN_NAME = 'cycle_start'
);

SET @sql := IF(@column_exists = 0,
    'ALTER TABLE schools ADD COLUMN cycle_start DATE NULL',
    'SELECT "Column cycle_start already exists on schools" AS status'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- cycle_end
SET @column_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'schools'
      AND COLUMN_NAME = 'cycle_end'
);

SET @sql := IF(@column_exists = 0,
    'ALTER TABLE schools ADD COLUMN cycle_end DATE NULL',
    'SELECT "Column cycle_end already exists on schools" AS status'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- last_billed_at
SET @column_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'schools'
      AND COLUMN_NAME = 'last_billed_at'
);

SET @sql := IF(@column_exists = 0,
    'ALTER TABLE schools ADD COLUMN last_billed_at DATETIME NULL',
    'SELECT "Column last_billed_at already exists on schools" AS status'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =============================================
-- Add foreign keys for billing/student pack references
-- =============================================

SET @constraint_exists := (
    SELECT COUNT(*)
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'schools'
      AND CONSTRAINT_NAME = 'fk_schools_billing_pack'
);

SET @sql := IF(@constraint_exists = 0,
    'ALTER TABLE schools ADD CONSTRAINT fk_schools_billing_pack FOREIGN KEY (billing_pack_id) REFERENCES pricing_packs(id) ON DELETE SET NULL ON UPDATE CASCADE',
    'SELECT "Constraint fk_schools_billing_pack already exists" AS status'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @constraint_exists := (
    SELECT COUNT(*)
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'schools'
      AND CONSTRAINT_NAME = 'fk_schools_student_pack'
);

SET @sql := IF(@constraint_exists = 0,
    'ALTER TABLE schools ADD CONSTRAINT fk_schools_student_pack FOREIGN KEY (student_pack_id) REFERENCES pricing_packs(id) ON DELETE SET NULL ON UPDATE CASCADE',
    'SELECT "Constraint fk_schools_student_pack already exists" AS status'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =============================================
-- Add school_id tracking to usage_log
-- =============================================

SET @column_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'usage_log'
      AND COLUMN_NAME = 'school_id'
);

SET @sql := IF(@column_exists = 0,
    'ALTER TABLE usage_log ADD COLUMN school_id VARCHAR(24) NULL AFTER user_id',
    'SELECT "Column school_id already exists on usage_log" AS status'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Backfill school_id from users table
UPDATE usage_log ul
JOIN users u ON ul.user_id = u.id
SET ul.school_id = u.school_id
WHERE ul.school_id IS NULL AND u.school_id IS NOT NULL;

-- Ensure no orphaned entries remain before enforcing NOT NULL
SET @missing_school := (
    SELECT COUNT(*)
    FROM usage_log
    WHERE school_id IS NULL
);

-- Make school_id NOT NULL only when safe
SET @sql := IF(@missing_school = 0,
    'ALTER TABLE usage_log MODIFY COLUMN school_id VARCHAR(24) NOT NULL',
    'SELECT "Skipped NOT NULL enforcement for usage_log.school_id due to missing data" AS status'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add foreign key constraint for usage_log.school_id
SET @constraint_exists := (
    SELECT COUNT(*)
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'usage_log'
      AND CONSTRAINT_NAME = 'fk_usage_log_school'
);

SET @sql := IF(@constraint_exists = 0,
    'ALTER TABLE usage_log ADD CONSTRAINT fk_usage_log_school FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE RESTRICT ON UPDATE CASCADE',
    'SELECT "Constraint fk_usage_log_school already exists" AS status'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =============================================
-- Performance indexes for billing queries
-- =============================================

-- usage_log(school_id, timestamp)
SET @index_exists := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'usage_log'
      AND INDEX_NAME = 'idx_usage_log_school_timestamp'
);

SET @sql := IF(@index_exists = 0,
    'CREATE INDEX idx_usage_log_school_timestamp ON usage_log(school_id, timestamp)',
    'SELECT "Index idx_usage_log_school_timestamp already exists" AS status'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- schools(billing_cycle, cycle_start, cycle_end)
SET @index_exists := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'schools'
      AND INDEX_NAME = 'idx_schools_billing_cycle'
);

SET @sql := IF(@index_exists = 0,
    'CREATE INDEX idx_schools_billing_cycle ON schools(billing_cycle, cycle_start, cycle_end)',
    'SELECT "Index idx_schools_billing_cycle already exists" AS status'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =============================================
-- Verification queries (optional output)
-- =============================================
SELECT 'Schools billing columns' AS section;
SELECT COLUMN_NAME, COLUMN_TYPE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'schools'
  AND COLUMN_NAME IN ('billing_pack_id', 'student_pack_id', 'billing_cycle', 'cycle_start', 'cycle_end', 'last_billed_at');

SELECT 'Usage log school binding' AS section;
SELECT COLUMN_NAME, IS_NULLABLE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'usage_log'
  AND COLUMN_NAME = 'school_id';
