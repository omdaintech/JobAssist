-- Migration: Add activity-specific credit rules for deterministic evaluation optimization
-- Date: November 10, 2025
-- Purpose: Enable per-activity credit pricing (reading/hearing=0, writing/grammar=2)
-- Business Impact: 33% credit cost reduction per exam session (6 points → 4 points)

-- Context:
-- - Deterministic evaluation (rule-based) used for reading/hearing (MCQ/True-False)
-- - LLM evaluation still required for writing/grammar (subjective responses)
-- - Fallback to "any" rules if specific activity_type not found (backward compatible)

-- =============================================================================
-- PRACTICE SESSION RULES (reading/hearing deterministic = 0 points)
-- =============================================================================

INSERT INTO credit_rules (id, session_type, activity_type, level, points_cost, description, created_at) VALUES
-- Reading: Deterministic evaluation (MCQ/True-False from question_bank.correct_answer)
('cr_practice_reading_a1', 'practice', 'reading', 'A1', 0, 'A1 Reading practice (deterministic evaluation)', NOW()),
('cr_practice_reading_a2', 'practice', 'reading', 'A2', 0, 'A2 Reading practice (deterministic evaluation)', NOW()),
('cr_practice_reading_b1', 'practice', 'reading', 'B1', 0, 'B1 Reading practice (deterministic evaluation)', NOW()),

-- Hearing: Deterministic evaluation (MCQ/True-False from question_bank.correct_answer)
('cr_practice_hearing_a1', 'practice', 'hearing', 'A1', 0, 'A1 Hearing practice (deterministic evaluation)', NOW()),
('cr_practice_hearing_a2', 'practice', 'hearing', 'A2', 0, 'A2 Hearing practice (deterministic evaluation)', NOW()),
('cr_practice_hearing_b1', 'practice', 'hearing', 'B1', 0, 'B1 Hearing practice (deterministic evaluation)', NOW());

-- Note: Writing/Grammar for practice sessions will fallback to "any" rules (2 points)
-- This maintains backward compatibility with existing credit_rules

-- =============================================================================
-- EXAM SESSION RULES (activity-specific pricing)
-- =============================================================================

INSERT INTO credit_rules (id, session_type, activity_type, level, points_cost, description, created_at) VALUES
-- Reading: Deterministic evaluation (0 points)
('cr_exam_reading_a1', 'exam', 'reading', 'A1', 0, 'A1 Exam reading (deterministic)', NOW()),
('cr_exam_reading_a2', 'exam', 'reading', 'A2', 0, 'A2 Exam reading (deterministic)', NOW()),
('cr_exam_reading_b1', 'exam', 'reading', 'B1', 0, 'B1 Exam reading (deterministic)', NOW()),

-- Hearing: Deterministic evaluation (0 points)
('cr_exam_hearing_a1', 'exam', 'hearing', 'A1', 0, 'A1 Exam hearing (deterministic)', NOW()),
('cr_exam_hearing_a2', 'exam', 'hearing', 'A2', 0, 'A2 Exam hearing (deterministic)', NOW()),
('cr_exam_hearing_b1', 'exam', 'hearing', 'B1', 0, 'B1 Exam hearing (deterministic)', NOW()),

-- Writing: LLM required (2 points per activity)
('cr_exam_writing_a1', 'exam', 'writing', 'A1', 2, 'A1 Exam writing (LLM evaluation)', NOW()),
('cr_exam_writing_a2', 'exam', 'writing', 'A2', 2, 'A2 Exam writing (LLM evaluation)', NOW()),
('cr_exam_writing_b1', 'exam', 'writing', 'B1', 2, 'B1 Exam writing (LLM evaluation)', NOW()),

-- Grammar: LLM required (2 points per activity)
('cr_exam_grammar_a1', 'exam', 'grammar', 'A1', 2, 'A1 Exam grammar (LLM evaluation)', NOW()),
('cr_exam_grammar_a2', 'exam', 'grammar', 'A2', 2, 'A2 Exam grammar (LLM evaluation)', NOW()),
('cr_exam_grammar_b1', 'exam', 'grammar', 'B1', 2, 'B1 Exam grammar (LLM evaluation)', NOW());

-- =============================================================================
-- CREDIT COST COMPARISON
-- =============================================================================
--
-- OLD SYSTEM (flat rate per session):
-- - Practice (any activity): 2 points
-- - Exam (4 activities):     6 points (flat rate)
--
-- NEW SYSTEM (per-activity pricing):
-- - Practice reading:  0 points (deterministic)
-- - Practice hearing:  0 points (deterministic)
-- - Practice writing:  2 points (fallback to "any")
-- - Practice grammar:  2 points (fallback to "any")
--
-- - Exam reading:   0 points (deterministic)
-- - Exam hearing:   0 points (deterministic)
-- - Exam writing:   2 points (LLM)
-- - Exam grammar:   2 points (LLM)
-- - TOTAL:          4 points (33% savings vs 6 points)
--
-- =============================================================================
-- ANNUAL COST SAVINGS PROJECTION (100K exam sessions)
-- =============================================================================
--
-- Old cost: 100,000 sessions × 6 points = 600,000 credits
-- New cost: 100,000 sessions × 4 points = 400,000 credits
-- Savings:  200,000 credits × $0.005/credit = $1,000/year
--
-- Additional API cost savings: $300/year (no LLM calls for reading/hearing)
-- TOTAL ANNUAL SAVINGS: $1,300/year (33% reduction)
--
-- =============================================================================
-- BACKWARD COMPATIBILITY & ROLLBACK
-- =============================================================================
--
-- Existing "any" and "multiple" rules remain in database as fallback.
-- Credit lookup logic (session_credit_deduction.py):
--   1. Try specific activity_type (e.g., "reading", "writing")
--   2. Fallback to "any" if not found
--   3. Fail fast if neither found
--
-- Rollback (if needed):
-- DELETE FROM credit_rules 
-- WHERE activity_type IN ('reading', 'hearing', 'writing', 'grammar');
--
-- System will automatically revert to "any"/"multiple" rules.
--
-- =============================================================================
-- VALIDATION QUERIES
-- =============================================================================

-- Verify all rules inserted correctly:
-- SELECT session_type, activity_type, level, points_cost 
-- FROM credit_rules 
-- WHERE activity_type IN ('reading', 'hearing', 'writing', 'grammar')
-- ORDER BY session_type, activity_type, level;

-- Check exam session total cost (should be 4 points):
-- SELECT activity_type, points_cost 
-- FROM credit_rules 
-- WHERE session_type = 'exam' AND level = 'A1' 
--   AND activity_type IN ('reading', 'hearing', 'writing', 'grammar')
-- ORDER BY activity_type;

-- Expected result:
-- | activity_type | points_cost |
-- |---------------|-------------|
-- | grammar       | 2           |
-- | hearing       | 0           |
-- | reading       | 0           |
-- | writing       | 2           |
-- TOTAL: 0 + 0 + 2 + 2 = 4 points ✅

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
