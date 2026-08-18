-- Migration: Add activity_model_mapping table for per-activity LLM model selection
-- Created: 2025-11-07
-- Purpose: Enable different LLM models for different activity types (reading/writing/grammar/hearing)
--          V1: Global mappings only (language_id=NULL, level=NULL)
--          V2: Can add language/level-specific overrides in future

CREATE TABLE `activity_model_mapping` (
  `id` VARCHAR(24) PRIMARY KEY,
  `activity_type` ENUM('reading', 'writing', 'grammar', 'hearing') NOT NULL,
  `language_id` VARCHAR(24) NULL COMMENT 'NULL = applies to all languages (V1), specific ID for overrides (V2)',
  `level` VARCHAR(10) NULL COMMENT 'NULL = applies to all levels (V1), specific level for overrides (V2)',
  `llm_provider` VARCHAR(45) NOT NULL DEFAULT 'openai' COMMENT 'openai, azure, anthropic, google',
  `llm_model` VARCHAR(100) NOT NULL COMMENT 'Model name: gpt-4o-mini, gpt-5-mini, claude-3.5-sonnet, etc',
  `model_config` JSON NULL COMMENT 'Provider-specific config: temperature, max_tokens, deployment_name, etc',
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `notes` TEXT NULL COMMENT 'Admin notes: why this mapping exists, business rationale',
  
  -- V1: Simple lookup index
  INDEX `idx_activity_lookup` (`activity_type`, `is_active`),
  
  -- V2: Support language/level-specific lookups
  INDEX `idx_granular_lookup` (`activity_type`, `language_id`, `level`, `is_active`),
  
  -- Prevent duplicate mappings
  UNIQUE KEY `unique_activity_mapping` (`activity_type`, `language_id`, `level`),
  
  -- Foreign key for future language-specific mappings
  CONSTRAINT `fk_activity_mapping_language` 
    FOREIGN KEY (`language_id`) REFERENCES `languages`(`id`) 
    ON DELETE SET NULL
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='V1: Global activity-to-model mappings. V2: Can add language/level overrides.';

-- ========================================
-- V1: Insert Global Mappings (All languages, All levels)
-- ========================================

INSERT INTO `activity_model_mapping` 
(`id`, `activity_type`, `language_id`, `level`, `llm_provider`, `llm_model`, `model_config`, `is_active`, `notes`) 
VALUES
(
  'amm_reading_global',
  'reading',
  NULL,
  NULL,
  'openai',
  'gpt-4o-mini',
  NULL,
  1,
  'V1 Global: Simple comprehension analysis - cost effective model (gpt-4o-mini vs gpt-5-mini = 70% savings)'
),
(
  'amm_writing_global',
  'writing',
  NULL,
  NULL,
  'openai',
  'gpt-5-mini',
  NULL,
  1,
  'V1 Global: Complex evaluation requires reasoning capabilities - uses gpt-5-mini for better feedback quality'
),
(
  'amm_grammar_global',
  'grammar',
  NULL,
  NULL,
  'openai',
  'gpt-5-mini',
  NULL,
  1,
  'V1 Global: Pattern matching with reasoning - gpt-5-mini provides better grammatical analysis'
),
(
  'amm_hearing_global',
  'hearing',
  NULL,
  NULL,
  'openai',
  'gpt-4o-mini',
  NULL,
  1,
  'V1 Global: Transcript analysis - cost effective model sufficient for audio comprehension checks'
);

-- ========================================
-- Verification Queries
-- ========================================

-- Check all mappings created
SELECT 
  activity_type,
  llm_provider,
  llm_model,
  CASE 
    WHEN language_id IS NULL AND level IS NULL THEN 'Global (all languages/levels)'
    WHEN language_id IS NOT NULL AND level IS NULL THEN CONCAT('Language-specific: ', language_id)
    WHEN language_id IS NOT NULL AND level IS NOT NULL THEN CONCAT('Specific: ', language_id, '/', level)
  END as scope,
  notes
FROM activity_model_mapping
WHERE is_active = 1
ORDER BY activity_type;

-- Expected output:
-- grammar   | openai | gpt-5-mini   | Global (all languages/levels) | V1 Global: Pattern matching...
-- hearing   | openai | gpt-4o-mini  | Global (all languages/levels) | V1 Global: Transcript analysis...
-- reading   | openai | gpt-4o-mini  | Global (all languages/levels) | V1 Global: Simple comprehension...
-- writing   | openai | gpt-5-mini   | Global (all languages/levels) | V1 Global: Complex evaluation...
