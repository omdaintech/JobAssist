-- Migration: Add Spanish language support
-- Date: 2025-11-06
-- Description: Add Spanish language with A1, A2, B1 and B2 level support to the languages table
-- Author: System Migration
-- Related: Prompt structure created at app/llm/prompts/690d0bddfc9266fb97420d16/

-- ============================================================================
-- SECTION 1: Add Spanish Language
-- ============================================================================

-- Insert Spanish language entry with proper configuration
INSERT INTO `languages` 
(`id`, `name`, `code`, `flag_emoji`, `is_active`, `supported_levels`, `created_at`, `updated_at`, `display_order`, `native_name`)
VALUES 
('690d0bddfc9266fb97420d16', 'Spanish', 'spanish', '🇪🇸', 1, '["A1", "A2", "B1", "B2"]', NOW(), NOW(), 2, 'Español')
ON DUPLICATE KEY UPDATE 
    supported_levels = '["A1", "A2", "B1", "B2"]',
    is_active = 1,
    updated_at = NOW();

-- ============================================================================
-- SECTION 2: Update German to include B2 (if not already present)
-- ============================================================================

UPDATE `languages`
SET 
    supported_levels = '["A1", "A2", "B1", "B2"]',
    updated_at = NOW()
WHERE 
    code = 'german'
    AND NOT JSON_CONTAINS(supported_levels, '"B2"', '$');

-- ============================================================================
-- SECTION 3: Update French to include all levels (A1, A2, B1, B2)
-- ============================================================================

UPDATE `languages`
SET 
    supported_levels = '["A1", "A2", "B1", "B2"]',
    updated_at = NOW()
WHERE 
    code = 'french';

-- ============================================================================
-- SECTION 4: Ensure proper display order for all languages
-- ============================================================================

-- Set display order: German=1, French=2, Spanish=3
UPDATE `languages` SET display_order = 1 WHERE code = 'german';
UPDATE `languages` SET display_order = 2 WHERE code = 'french';
UPDATE `languages` SET display_order = 3 WHERE code = 'spanish';

-- ============================================================================
-- SECTION 5: Verification Queries
-- ============================================================================

-- Verify all languages are properly configured
SELECT 
    id,
    name,
    code,
    flag_emoji,
    is_active,
    supported_levels,
    display_order,
    native_name,
    created_at,
    updated_at
FROM languages 
ORDER BY display_order;

-- Count active languages
SELECT COUNT(*) as active_languages FROM languages WHERE is_active = 1;

-- Verify Spanish specifically
SELECT * FROM languages WHERE code = 'spanish';
