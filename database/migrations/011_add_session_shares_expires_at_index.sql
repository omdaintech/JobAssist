-- Migration: Add index on expires_at for session_shares table
-- Purpose: Optimize expiration checks and cleanup queries
-- Date: 2025-10-21

ALTER TABLE `session_shares` 
ADD INDEX `idx_session_shares_expires_at` (`expires_at`);

