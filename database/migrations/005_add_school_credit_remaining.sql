-- Migration: Add school_credit_remaining column to schools table
-- Version: 1.1.0
-- Date: 2025-09-15
-- Description: Add separate remaining credits column for topup credit management

-- Add school_credit_remaining column
ALTER TABLE `schools` 
ADD COLUMN `school_credit_remaining` int DEFAULT '0' AFTER `allocated_credits`;

-- Add index for performance
ALTER TABLE `schools`
ADD INDEX `idx_schools_credit_remaining` (`school_credit_remaining`);

-- Initialize school_credit_remaining with current allocated_credits for existing schools
-- This ensures existing schools have their current credits as remaining credits
UPDATE `schools` 
SET `school_credit_remaining` = `allocated_credits` 
WHERE `allocated_credits` > 0;
