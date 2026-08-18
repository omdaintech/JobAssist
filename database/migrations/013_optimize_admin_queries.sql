-- Migration: Optimize Admin Module Query Performance
-- Date: 2025-10-21
-- Description: Add indexes for admin-specific query patterns
-- Impact: Improves admin dashboard, school management, and question management performance

-- ============================================================================
-- HIGH PRIORITY: Optimize schools admin listing
-- ============================================================================
-- This index covers admin school management dashboard queries
-- Frequently used for:
-- - School listing page
-- - School statistics
-- - Pagination through schools
--
-- Query pattern:
--   SELECT * FROM schools 
--   WHERE is_active = ? 
--   ORDER BY created_at DESC 
--   LIMIT ? OFFSET ?

CREATE INDEX IF NOT EXISTS idx_schools_admin_list 
ON schools (is_active, created_at DESC);

-- ============================================================================
-- MEDIUM PRIORITY: Optimize question bank admin queries
-- ============================================================================
-- This index covers the main admin question management interface
-- Frequently used for:
-- - Admin question browsing
-- - Question filtering and pagination
-- - Question bank statistics
--
-- Query pattern:
--   SELECT qb.*, l.name FROM question_bank qb
--   JOIN languages l ON qb.language_id = l.id
--   WHERE qb.is_active = 1 
--   [AND qb.language_id = ?]
--   ORDER BY qb.created_datetime DESC
--   LIMIT ? OFFSET ?

CREATE INDEX IF NOT EXISTS idx_question_bank_admin_list 
ON question_bank (is_active, created_datetime DESC, language_id);

-- ============================================================================
-- MEDIUM PRIORITY: Add session_id index to usage_log
-- ============================================================================
-- This index helps admin session verification queries
-- Used for:
-- - Admin session verification
-- - Usage log analysis by session
-- - Session debugging and auditing
--
-- Query pattern:
--   SELECT * FROM usage_log 
--   WHERE session_id = ? 
--   ORDER BY timestamp DESC

CREATE INDEX IF NOT EXISTS idx_usage_log_session_timestamp 
ON usage_log (session_id, timestamp DESC);

-- ============================================================================
-- LOW PRIORITY (Optional): School admins lookup
-- ============================================================================
-- This index helps lookup active school admins for a specific school
-- Used for:
-- - School admin notifications
-- - School admin management
-- - Getting primary contact for a school
--
-- Note: Low priority because query volume is low and result sets are small
-- Uncomment if needed:
-- 
-- CREATE INDEX IF NOT EXISTS idx_school_admins_school_active_created 
-- ON school_admins (school_id, is_active, created_at);

-- ============================================================================
-- Verification
-- ============================================================================
-- Verify schools index
SELECT 
    'schools' as table_name,
    INDEX_NAME,
    COLUMN_NAME,
    SEQ_IN_INDEX,
    COLLATION,
    NON_UNIQUE
FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'schools'
  AND INDEX_NAME = 'idx_schools_admin_list'
ORDER BY SEQ_IN_INDEX;

-- Verify question_bank index
SELECT 
    'question_bank' as table_name,
    INDEX_NAME,
    COLUMN_NAME,
    SEQ_IN_INDEX,
    COLLATION,
    NON_UNIQUE
FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'question_bank'
  AND INDEX_NAME = 'idx_question_bank_admin_list'
ORDER BY SEQ_IN_INDEX;

-- Verify usage_log index
SELECT 
    'usage_log' as table_name,
    INDEX_NAME,
    COLUMN_NAME,
    SEQ_IN_INDEX,
    COLLATION,
    NON_UNIQUE
FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'usage_log'
  AND INDEX_NAME = 'idx_usage_log_session_timestamp'
ORDER BY SEQ_IN_INDEX;

-- ============================================================================
-- Rollback (if needed)
-- ============================================================================
-- To rollback these changes, run:
-- DROP INDEX IF EXISTS idx_schools_admin_list ON schools;
-- DROP INDEX IF EXISTS idx_question_bank_admin_list ON question_bank;
-- DROP INDEX IF EXISTS idx_usage_log_session_timestamp ON usage_log;
-- DROP INDEX IF EXISTS idx_school_admins_school_active_created ON school_admins;

-- ============================================================================
-- Performance Testing Commands
-- ============================================================================
-- Run these EXPLAIN queries before and after migration to verify improvement:

-- Test 1: Schools admin listing (should use idx_schools_admin_list)
-- EXPLAIN SELECT * FROM schools 
-- WHERE is_active = 1 
-- ORDER BY created_at DESC 
-- LIMIT 20 OFFSET 0;

-- Test 2: Question bank admin listing (should use idx_question_bank_admin_list)
-- EXPLAIN SELECT qb.*, l.name as language_name, l.code as language_code
-- FROM question_bank qb
-- JOIN languages l ON qb.language_id = l.id
-- WHERE qb.is_active = 1
-- ORDER BY qb.created_datetime DESC
-- LIMIT 100 OFFSET 0;

-- Test 3: Usage log session lookup (should use idx_usage_log_session_timestamp)
-- EXPLAIN SELECT * FROM usage_log 
-- WHERE session_id = 'some_session_id' 
-- ORDER BY timestamp DESC 
-- LIMIT 1;

-- Expected EXPLAIN results:
--   - type: 'ref', 'range', or 'index'
--   - key: should show the new composite index name
--   - rows: should be significantly reduced compared to full table scan
--   - Extra: should show 'Using index' or 'Using index condition'

-- ============================================================================
-- Notes
-- ============================================================================
-- 1. These indexes are safe to add on production (no downtime required)
-- 2. Index creation may take a few seconds depending on table size
-- 3. Total storage impact: < 2 MB
-- 4. No impact on existing queries (only improves performance)
-- 5. Consider running during low-traffic period if tables are very large (> 1M rows)

