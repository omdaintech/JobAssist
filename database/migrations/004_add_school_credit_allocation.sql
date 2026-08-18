-- Migration: Add school-level credit allocation
-- Date: 2025-09-15
-- Description: Add credit allocation and history tracking to schools table

-- Add new columns to schools table
ALTER TABLE `schools` 
ADD COLUMN `allocated_credits` int DEFAULT '0' AFTER `internal_tags`,
ADD COLUMN `credit_history` json DEFAULT NULL AFTER `allocated_credits`;

-- Add index for credit allocation queries
ALTER TABLE `schools` 
ADD INDEX `idx_schools_allocated_credits` (`allocated_credits`);

-- Initialize credit_history as empty array for existing schools
UPDATE `schools` SET `credit_history` = JSON_ARRAY() WHERE `credit_history` IS NULL;
