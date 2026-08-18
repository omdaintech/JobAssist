-- Migration: 010_create_session_shares.sql
-- Date: 2025-10-21
-- Purpose: Add shareable links functionality for exam/practice session results

-- Create session_shares table for public shareable result links
CREATE TABLE IF NOT EXISTS `session_shares` (
  `id` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `share_code` varchar(12) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `session_id` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `expires_at` datetime DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `share_code` (`share_code`),
  KEY `idx_session_shares_session_id` (`session_id`),
  KEY `idx_session_shares_user_id` (`user_id`),
  KEY `idx_session_shares_share_code` (`share_code`),
  KEY `idx_session_shares_active` (`is_active`),
  CONSTRAINT `fk_session_shares_session` FOREIGN KEY (`session_id`) REFERENCES `exam_detail` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_session_shares_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verify the migration
SELECT 'Session shares table created successfully' as status;
SELECT COUNT(*) as session_share_count FROM session_shares;

