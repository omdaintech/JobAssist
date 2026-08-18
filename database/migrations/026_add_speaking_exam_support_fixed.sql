-- Migration: Add speaking exam support (FIXED for existing schema)
-- Date: 2025-01-14
-- Description: Extend activity enums for speaking and add audio columns to exam_log

-- Extend activity enums to include the new speaking type (only tables that exist)
ALTER TABLE `credit_rules`
    MODIFY COLUMN `activity_type`
        ENUM('reading','writing','grammar','hearing','speaking','full_exam','any','multiple') NOT NULL;

ALTER TABLE `question_bank`
    MODIFY COLUMN `activity_type`
        ENUM('reading','writing','grammar','hearing','speaking','full_exam','any','multiple') NOT NULL;

ALTER TABLE `usage_log`
    MODIFY COLUMN `activity_type`
        ENUM('reading','writing','grammar','hearing','speaking','full_exam','any','multiple') NOT NULL;

-- Persist speaking audio artifacts on exam logs
ALTER TABLE `exam_log`
    ADD COLUMN IF NOT EXISTS `user_audio_url` VARCHAR(500) NULL AFTER `exam_log_meta`,
    ADD COLUMN IF NOT EXISTS `user_audio_transcript` TEXT NULL AFTER `user_audio_url`,
    ADD COLUMN IF NOT EXISTS `user_audio_meta` JSON NULL AFTER `user_audio_transcript`;

-- Verification (optional)
SELECT 'Speaking support added successfully!' AS Status;
DESCRIBE exam_log;
