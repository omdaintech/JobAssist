-- Migration: Add complete credit rules for speaking exams
-- Date: 2025-01-15
-- Description: Add practice and exam speaking credit rules for all levels (A1-B2)

-- Insert practice speaking rules (LLM-based evaluation, 3-6 points)
INSERT INTO credit_rules (id, session_type, activity_type, level, points_cost, evaluation_method, llm_provider, llm_model, description, active, created_at, updated_at)
VALUES 
('cr_practice_speaking_a1', 'practice', 'speaking', 'A1', 3, 'llm', 'openai', 'gpt-5-mini', 'A1 Speaking practice (audio monologue)', 1, NOW(), NOW()),
('cr_practice_speaking_a2', 'practice', 'speaking', 'A2', 4, 'llm', 'openai', 'gpt-5-mini', 'A2 Speaking practice (audio monologue)', 1, NOW(), NOW()),
('cr_practice_speaking_b1', 'practice', 'speaking', 'B1', 5, 'llm', 'openai', 'gpt-5-mini', 'B1 Speaking practice (audio monologue)', 1, NOW(), NOW()),
('cr_practice_speaking_b2', 'practice', 'speaking', 'B2', 6, 'llm', 'openai', 'gpt-5-mini', 'B2 Speaking practice (audio monologue)', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE
    points_cost = VALUES(points_cost),
    evaluation_method = VALUES(evaluation_method),
    llm_model = VALUES(llm_model),
    description = VALUES(description),
    updated_at = NOW();

-- Insert exam speaking rules (LLM-based evaluation, 5-8 points)
INSERT INTO credit_rules (id, session_type, activity_type, level, points_cost, evaluation_method, llm_provider, llm_model, description, active, created_at, updated_at)
VALUES 
('cr_exam_speaking_a1', 'exam', 'speaking', 'A1', 5, 'llm', 'openai', 'gpt-5-mini', 'A1 Exam speaking (audio monologue)', 1, NOW(), NOW()),
('cr_exam_speaking_a2', 'exam', 'speaking', 'A2', 6, 'llm', 'openai', 'gpt-5-mini', 'A2 Exam speaking (audio monologue)', 1, NOW(), NOW()),
('cr_exam_speaking_b1', 'exam', 'speaking', 'B1', 7, 'llm', 'openai', 'gpt-5-mini', 'B1 Exam speaking (audio monologue)', 1, NOW(), NOW()),
('cr_exam_speaking_b2', 'exam', 'speaking', 'B2', 8, 'llm', 'openai', 'gpt-5-mini', 'B2 Exam speaking (audio monologue)', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE
    points_cost = VALUES(points_cost),
    evaluation_method = VALUES(evaluation_method),
    llm_model = VALUES(llm_model),
    description = VALUES(description),
    updated_at = NOW();

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
WHERE activity_type = 'speaking'
  AND active = 1
ORDER BY session_type, level;

