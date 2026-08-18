-- Migration: Extend school details with comprehensive information
-- Date: 2025-09-15
-- Description: Add billing, address, tax, and internal management fields to schools table

-- Add new columns to schools table
ALTER TABLE `schools` 
ADD COLUMN `contact_phone` varchar(50) DEFAULT NULL AFTER `contact_email`,
ADD COLUMN `admin_phone` varchar(50) DEFAULT NULL AFTER `admin_email`,
ADD COLUMN `billing_email` varchar(100) DEFAULT NULL AFTER `admin_phone`,
ADD COLUMN `billing_contact_name` varchar(200) DEFAULT NULL AFTER `billing_email`,
ADD COLUMN `billing_phone` varchar(50) DEFAULT NULL AFTER `billing_contact_name`,
ADD COLUMN `payment_method_info` json DEFAULT NULL AFTER `billing_phone`,
ADD COLUMN `physical_address` json DEFAULT NULL AFTER `payment_method_info`,
ADD COLUMN `billing_address` json DEFAULT NULL AFTER `physical_address`,
ADD COLUMN `tax_address` json DEFAULT NULL AFTER `billing_address`,
ADD COLUMN `tax_id` varchar(100) DEFAULT NULL AFTER `tax_address`,
ADD COLUMN `vat_number` varchar(100) DEFAULT NULL AFTER `tax_id`,
ADD COLUMN `tax_exemption_status` tinyint(1) DEFAULT '0' AFTER `vat_number`,
ADD COLUMN `priority_support` tinyint(1) DEFAULT '0' AFTER `tax_exemption_status`,
ADD COLUMN `account_manager_notes` text DEFAULT NULL AFTER `priority_support`,
ADD COLUMN `internal_tags` json DEFAULT NULL AFTER `account_manager_notes`;

-- Add indexes for commonly queried fields
ALTER TABLE `schools` 
ADD INDEX `idx_schools_billing_email` (`billing_email`),
ADD INDEX `idx_schools_tax_id` (`tax_id`),
ADD INDEX `idx_schools_vat_number` (`vat_number`),
ADD INDEX `idx_schools_priority_support` (`priority_support`);

-- Update existing schools with sample data structure for addresses
-- This shows the expected JSON structure for address fields
UPDATE `schools` SET 
    `physical_address` = JSON_OBJECT(
        'street', '',
        'city', '',
        'state', '',
        'country', '',
        'postal_code', ''
    ),
    `billing_address` = JSON_OBJECT(
        'street', '',
        'city', '',
        'state', '',
        'country', '',
        'postal_code', ''
    ),
    `tax_address` = JSON_OBJECT(
        'street', '',
        'city', '',
        'state', '',
        'country', '',
        'postal_code', ''
    ),
    `payment_method_info` = JSON_OBJECT(
        'preferred_method', 'invoice',
        'payment_terms', '30',
        'currency', 'USD',
        'notes', ''
    ),
    `internal_tags` = JSON_ARRAY()
WHERE `physical_address` IS NULL;

-- Add comments to document the new fields
ALTER TABLE `schools` 
MODIFY COLUMN `contact_phone` varchar(50) DEFAULT NULL COMMENT 'Primary contact phone number',
MODIFY COLUMN `admin_phone` varchar(50) DEFAULT NULL COMMENT 'School admin phone number',
MODIFY COLUMN `billing_email` varchar(100) DEFAULT NULL COMMENT 'Billing contact email',
MODIFY COLUMN `billing_contact_name` varchar(200) DEFAULT NULL COMMENT 'Billing contact person name',
MODIFY COLUMN `billing_phone` varchar(50) DEFAULT NULL COMMENT 'Billing contact phone',
MODIFY COLUMN `payment_method_info` json DEFAULT NULL COMMENT 'Payment method preferences and details',
MODIFY COLUMN `physical_address` json DEFAULT NULL COMMENT 'School physical address',
MODIFY COLUMN `billing_address` json DEFAULT NULL COMMENT 'Billing address',
MODIFY COLUMN `tax_address` json DEFAULT NULL COMMENT 'Tax registration address',
MODIFY COLUMN `tax_id` varchar(100) DEFAULT NULL COMMENT 'Tax identification number',
MODIFY COLUMN `vat_number` varchar(100) DEFAULT NULL COMMENT 'VAT registration number',
MODIFY COLUMN `tax_exemption_status` tinyint(1) DEFAULT '0' COMMENT 'Tax exemption status',
MODIFY COLUMN `priority_support` tinyint(1) DEFAULT '0' COMMENT 'Priority support flag (internal)',
MODIFY COLUMN `account_manager_notes` text DEFAULT NULL COMMENT 'Internal account manager notes',
MODIFY COLUMN `internal_tags` json DEFAULT NULL COMMENT 'Internal categorization tags';
