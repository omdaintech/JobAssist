-- ============================================================================
-- Migration 006: Merge activity_model_mapping into credit_rules
-- ============================================================================
-- Purpose: Consolidate model selection and pricing into single table
-- Date: 2025-11-10
-- Author: DevPaul
--
-- Changes:
-- 1. Add llm columns to credit_rules
-- 2. Migrate data from activity_model_mapping
-- 3. Drop activity_model_mapping table
-- ============================================================================

USE cefr_practice;

-- Step 1: Add new columns to credit_rules
ALTER TABLE credit_rules 
ADD COLUMN evaluation_method ENUM('deterministic', 'llm') DEFAULT 'llm' 
    COMMENT 'Evaluation method: deterministic (rule-based) or llm (AI)' 
    AFTER points_cost,
ADD COLUMN llm_provider VARCHAR(50) DEFAULT 'openai' 
    COMMENT 'LLM provider (openai, anthropic, etc)' 
    AFTER evaluation_method,
ADD COLUMN llm_model VARCHAR(100) DEFAULT NULL 
    COMMENT 'LLM model name (gpt-4o-mini, gpt-5-mini, etc)' 
    AFTER llm_provider;

-- Step 2: Set evaluation_method based on points_cost
-- Logic: 0 points = deterministic, >0 points = llm
UPDATE credit_rules 
SET evaluation_method = CASE 
    WHEN points_cost = 0 THEN 'deterministic'
    ELSE 'llm'
END;

-- Step 3: Populate llm_model ONLY for activities that use LLM
-- Writing and Grammar use gpt-5-mini (better reasoning for subjective evaluation)
UPDATE credit_rules 
SET llm_model = 'gpt-5-mini'
WHERE activity_type IN ('writing', 'grammar') 
  AND evaluation_method = 'llm';

-- Step 4: Reading/Hearing use deterministic evaluation - NO LLM MODEL
-- llm_model = NULL enforces fail-fast: if correct_answer is NULL, analysis fails
-- This prevents hidden LLM costs when deterministic can't evaluate
-- Admin must fix data quality instead of silent fallback charging us $$$
UPDATE credit_rules 
SET llm_model = NULL
WHERE activity_type IN ('reading', 'hearing') 
  AND evaluation_method = 'deterministic';

-- Step 5: Handle "any" and "multiple" activity types (generic fallbacks)
-- These should use gpt-5-mini as default for LLM evaluation
UPDATE credit_rules 
SET llm_model = 'gpt-5-mini'
WHERE activity_type IN ('any', 'multiple');

-- Step 5.5: Update hearing credit cost to 1 (business decision Nov 10, 2025)
-- Reason: Hearing analysis uses transcript generation which has minimal cost
UPDATE credit_rules 
SET points_cost = 1
WHERE activity_type = 'hearing';

-- Step 6: Verify migration results
SELECT 
    session_type,
    activity_type,
    level,
    points_cost,
    evaluation_method,
    llm_model
FROM credit_rules
ORDER BY session_type, activity_type, level;

-- Step 7: Rename activity_model_mapping table (safer than DROP)
-- After verification, rename to mark as deprecated
RENAME TABLE activity_model_mapping TO _deprecated_activity_model_mapping;

-- Note: Table preserved for rollback safety. Can be dropped after 30 days in production.
-- To restore if needed: RENAME TABLE _deprecated_activity_model_mapping TO activity_model_mapping;

-- ============================================================================
-- Rollback Instructions (if needed):
-- ============================================================================
-- ALTER TABLE credit_rules 
-- DROP COLUMN evaluation_method,
-- DROP COLUMN llm_provider,
-- DROP COLUMN llm_model;
-- ============================================================================
