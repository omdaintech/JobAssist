
-- Ensure legacy A0 target levels do not break the enum change
UPDATE `users` SET `target_level` = NULL WHERE `target_level` = 'A0';

ALTER TABLE `users`
    MODIFY `current_level` ENUM('A0', 'A1', 'A2', 'B1') DEFAULT 'A1',
    ADD COLUMN `is_onboarded` TINYINT(1) NOT NULL DEFAULT 0 AFTER `preferred_language_id`,
    ADD COLUMN `onboarding_goal` VARCHAR(50) DEFAULT NULL AFTER `is_onboarded`,
    ADD COLUMN `target_level` ENUM('A1', 'A2', 'B1') DEFAULT NULL AFTER `onboarding_goal`,
    ADD COLUMN `practice_frequency_per_week` INT DEFAULT NULL AFTER `target_level`;
