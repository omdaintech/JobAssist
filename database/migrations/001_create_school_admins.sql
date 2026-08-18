-- Migration: Create school_admins table
-- Date: 2025-09-13
-- Description: Add school_admins table for school domain authentication

-- Create school_admins table
CREATE TABLE IF NOT EXISTS `school_admins` (
  `id` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `school_id` varchar(24) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `last_login` datetime DEFAULT NULL,
  `permissions` json DEFAULT ('["manage_users", "view_analytics"]'),
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_school_admins_school_id` (`school_id`),
  KEY `idx_school_admins_email` (`email`),
  KEY `idx_school_admins_active` (`is_active`),
  CONSTRAINT `fk_school_admins_school_id` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create school admins for existing schools
-- B2C School: Direct Students
INSERT INTO `school_admins` (
    `id`, 
    `school_id`, 
    `email`, 
    `password_hash`, 
    `name`, 
    `is_active`, 
    `created_at`, 
    `permissions`
) VALUES (
    'b2c_admin_direct_001',
    '886eb0635e5a4825bc3323d0',  -- Direct Students (B2C)
    'admin@example.com',
    '$2b$12$EXAMPLE_HASH_REPLACE_THIS_WITH_REAL_HASH',  -- Change this to real password hash!
    'Direct Students Administrator',
    1,
    NOW(),
    '["manage_users", "view_analytics"]'
) ON DUPLICATE KEY UPDATE 
    `name` = VALUES(`name`),
    `is_active` = VALUES(`is_active`);

-- B2B School: Example School
INSERT INTO `school_admins` (
    `id`, 
    `school_id`, 
    `email`, 
    `password_hash`, 
    `name`, 
    `is_active`, 
    `created_at`, 
    `permissions`
) VALUES (
    'b2b_admin_example_001',
    '886eb0635e5a4825bc3323d3',  -- Example School (B2B)
    'school-admin@example.com',
    '$2b$12$EXAMPLE_HASH_REPLACE_THIS_WITH_REAL_HASH',  -- Change this to real password hash!
    'Example School Administrator',
    1,
    NOW(),
    '["manage_users", "view_analytics"]'
) ON DUPLICATE KEY UPDATE 
    `name` = VALUES(`name`),
    `is_active` = VALUES(`is_active`);

-- Verify the migration
SELECT 'School admins table created successfully' as status;
SELECT COUNT(*) as school_admin_count FROM school_admins;
