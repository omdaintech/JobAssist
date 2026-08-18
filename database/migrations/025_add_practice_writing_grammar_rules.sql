-- Migration: Add specific credit rules for practice writing and grammar
-- Date: 2025-11-11
-- Description: Add missing practice/writing and practice/grammar rules to eliminate fallback dependency

-- Insert practice writing rules (LLM-based evaluation)
INSERT INTO credit_rules (id, session_type, activity_type, level, points_cost, evaluation_method, llm_provider, llm_model, description, active, created_at, updated_at)
VALUES 
('cr_practice_writing_a1', 'practice', 'writing', 'A1', 2, 'llm', 'openai', 'gpt-5-mini', 'A1 Writing Practice', 1, NOW(), NOW()),
('cr_practice_writing_a2', 'practice', 'writing', 'A2', 2, 'llm', 'openai', 'gpt-5-mini', 'A2 Writing Practice', 1, NOW(), NOW()),
('cr_practice_writing_b1', 'practice', 'writing', 'B1', 2, 'llm', 'openai', 'gpt-5-mini', 'B1 Writing Practice', 1, NOW(), NOW()),
('cr_practice_writing_b2', 'practice', 'writing', 'B2', 2, 'llm', 'openai', 'gpt-5-mini', 'B2 Writing Practice', 1, NOW(), NOW());

-- Insert practice grammar rules (LLM-based evaluation)
INSERT INTO credit_rules (id, session_type, activity_type, level, points_cost, evaluation_method, llm_provider, llm_model, description, active, created_at, updated_at)
VALUES 
('cr_practice_grammar_a1', 'practice', 'grammar', 'A1', 2, 'llm', 'openai', 'gpt-5-mini', 'A1 Grammar Practice', 1, NOW(), NOW()),
('cr_practice_grammar_a2', 'practice', 'grammar', 'A2', 2, 'llm', 'openai', 'gpt-5-mini', 'A2 Grammar Practice', 1, NOW(), NOW()),
('cr_practice_grammar_b1', 'practice', 'grammar', 'B1', 2, 'llm', 'openai', 'gpt-5-mini', 'B1 Grammar Practice', 1, NOW(), NOW()),
('cr_practice_grammar_b2', 'practice', 'grammar', 'B2', 2, 'llm', 'openai', 'gpt-5-mini', 'B2 Grammar Practice', 1, NOW(), NOW());

-- Verification query
SELECT 
    session_type, 
    activity_type, 
    level, 
    points_cost, 
    evaluation_method, 
    llm_model,
    description
FROM credit_rules 
WHERE activity_type IN ('writing', 'grammar') 
  AND session_type = 'practice'
  AND active = 1
ORDER BY activity_type, level;
