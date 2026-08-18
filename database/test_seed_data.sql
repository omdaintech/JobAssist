-- ============================================================================
-- Test Database Seed Data
-- ============================================================================
-- Purpose: Initialize test database with essential data
-- Date: 2025-11-12
-- Updated with latest schema changes from production
-- ============================================================================

USE cefr_practice_test;

-- ============================================================================
-- DEFAULT SCHOOL (Required for user registration)
-- ============================================================================
INSERT INTO schools (
    id, 
    name, 
    display_name, 
    description, 
    is_active, 
    school_type, 
    contact_email, 
    admin_email
) VALUES (
    '886eb0635e5a4825bc3323d0',
    'Direct Students',
    'CEFR Practice - Direct Students',
    'Default school for B2C direct student registrations',
    1,
    'b2c',
    'support@example.com',
    'admin@example.com'
) ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    display_name = VALUES(display_name),
    description = VALUES(description);

-- ============================================================================
-- LANGUAGES (Active languages in production)
-- ============================================================================
INSERT INTO languages (
    id, 
    name, 
    code, 
    flag_emoji, 
    is_active, 
    display_order
) VALUES 
    ('687b9e32e94239d063f47070', 'German', 'german', '🇩🇪', 1, 1),
    ('687b9e32e94239d063f47071', 'French', 'french', '🇫🇷', 1, 2),
    ('690d0bddfc9266fb97420d16', 'Spanish', 'spanish', '🇪🇸', 1, 3)
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    code = VALUES(code),
    flag_emoji = VALUES(flag_emoji),
    is_active = VALUES(is_active),
    display_order = VALUES(display_order);

-- ============================================================================
-- CREDIT RULES (Latest from migration 024 + 025)
-- ============================================================================

-- Practice Reading (Deterministic - 0 points)
INSERT INTO credit_rules (
    id, 
    session_type, 
    activity_type, 
    level, 
    points_cost, 
    evaluation_method, 
    llm_provider, 
    llm_model, 
    description, 
    active
) VALUES 
    ('cr_practice_reading_a1', 'practice', 'reading', 'A1', 0, 'deterministic', 'openai', NULL, 'A1 Reading practice (deterministic evaluation)', 1),
    ('cr_practice_reading_a2', 'practice', 'reading', 'A2', 0, 'deterministic', 'openai', NULL, 'A2 Reading practice (deterministic evaluation)', 1),
    ('cr_practice_reading_b1', 'practice', 'reading', 'B1', 0, 'deterministic', 'openai', NULL, 'B1 Reading practice (deterministic evaluation)', 1),
    ('cr_practice_reading_b2', 'practice', 'reading', 'B2', 0, 'deterministic', 'openai', NULL, 'B2 Reading practice (deterministic evaluation)', 1)
ON DUPLICATE KEY UPDATE
    points_cost = VALUES(points_cost),
    evaluation_method = VALUES(evaluation_method),
    llm_model = VALUES(llm_model),
    description = VALUES(description);

-- Practice Hearing (Deterministic - 1 point)
INSERT INTO credit_rules (
    id, 
    session_type, 
    activity_type, 
    level, 
    points_cost, 
    evaluation_method, 
    llm_provider, 
    llm_model, 
    description, 
    active
) VALUES 
    ('cr_practice_hearing_a1', 'practice', 'hearing', 'A1', 1, 'deterministic', 'openai', NULL, 'A1 Hearing practice (deterministic evaluation)', 1),
    ('cr_practice_hearing_a2', 'practice', 'hearing', 'A2', 1, 'deterministic', 'openai', NULL, 'A2 Hearing practice (deterministic evaluation)', 1),
    ('cr_practice_hearing_b1', 'practice', 'hearing', 'B1', 1, 'deterministic', 'openai', NULL, 'B1 Hearing practice (deterministic evaluation)', 1),
    ('cr_practice_hearing_b2', 'practice', 'hearing', 'B2', 1, 'deterministic', 'openai', NULL, 'B2 Hearing practice (deterministic evaluation)', 1)
ON DUPLICATE KEY UPDATE
    points_cost = VALUES(points_cost),
    evaluation_method = VALUES(evaluation_method),
    llm_model = VALUES(llm_model),
    description = VALUES(description);

-- Practice Writing (LLM - 2 points) - Added in migration 025
INSERT INTO credit_rules (
    id, 
    session_type, 
    activity_type, 
    level, 
    points_cost, 
    evaluation_method, 
    llm_provider, 
    llm_model, 
    description, 
    active
) VALUES 
    ('cr_practice_writing_a1', 'practice', 'writing', 'A1', 2, 'llm', 'openai', 'gpt-5-mini', 'A1 Writing Practice', 1),
    ('cr_practice_writing_a2', 'practice', 'writing', 'A2', 2, 'llm', 'openai', 'gpt-5-mini', 'A2 Writing Practice', 1),
    ('cr_practice_writing_b1', 'practice', 'writing', 'B1', 2, 'llm', 'openai', 'gpt-5-mini', 'B1 Writing Practice', 1),
    ('cr_practice_writing_b2', 'practice', 'writing', 'B2', 2, 'llm', 'openai', 'gpt-5-mini', 'B2 Writing Practice', 1)
ON DUPLICATE KEY UPDATE
    points_cost = VALUES(points_cost),
    evaluation_method = VALUES(evaluation_method),
    llm_model = VALUES(llm_model),
    description = VALUES(description);

-- Practice Grammar (LLM - 2 points) - Added in migration 025
INSERT INTO credit_rules (
    id,
    session_type,
    activity_type, 
    level, 
    points_cost, 
    evaluation_method, 
    llm_provider, 
    llm_model, 
    description, 
    active
) VALUES 
    ('cr_practice_grammar_a1', 'practice', 'grammar', 'A1', 2, 'llm', 'openai', 'gpt-5-mini', 'A1 Grammar Practice', 1),
    ('cr_practice_grammar_a2', 'practice', 'grammar', 'A2', 2, 'llm', 'openai', 'gpt-5-mini', 'A2 Grammar Practice', 1),
    ('cr_practice_grammar_b1', 'practice', 'grammar', 'B1', 2, 'llm', 'openai', 'gpt-5-mini', 'B1 Grammar Practice', 1),
    ('cr_practice_grammar_b2', 'practice', 'grammar', 'B2', 2, 'llm', 'openai', 'gpt-5-mini', 'B2 Grammar Practice', 1)
ON DUPLICATE KEY UPDATE
    points_cost = VALUES(points_cost),
    evaluation_method = VALUES(evaluation_method),
    llm_model = VALUES(llm_model),
    description = VALUES(description);

-- Practice Speaking (LLM - 3-6 points)
INSERT INTO credit_rules (
    id,
    session_type,
    activity_type,
    level,
    points_cost,
    evaluation_method,
    llm_provider,
    llm_model,
    description,
    active
) VALUES
    ('cr_practice_speaking_a1', 'practice', 'speaking', 'A1', 3, 'llm', 'openai', 'gpt-5-mini', 'A1 Speaking practice (audio monologue)', 1),
    ('cr_practice_speaking_a2', 'practice', 'speaking', 'A2', 4, 'llm', 'openai', 'gpt-5-mini', 'A2 Speaking practice (audio monologue)', 1),
    ('cr_practice_speaking_b1', 'practice', 'speaking', 'B1', 5, 'llm', 'openai', 'gpt-5-mini', 'B1 Speaking practice (audio monologue)', 1),
    ('cr_practice_speaking_b2', 'practice', 'speaking', 'B2', 6, 'llm', 'openai', 'gpt-5-mini', 'B2 Speaking practice (audio monologue)', 1)
ON DUPLICATE KEY UPDATE
    points_cost = VALUES(points_cost),
    evaluation_method = VALUES(evaluation_method),
    llm_model = VALUES(llm_model),
    description = VALUES(description);

-- Practice "Any" (Fallback for LLM activities - 2 points)
INSERT INTO credit_rules (
    id,
    session_type,
    activity_type, 
    level, 
    points_cost, 
    evaluation_method, 
    llm_provider, 
    llm_model, 
    description, 
    active
) VALUES 
    ('6883967022be817edbf47070', 'practice', 'any', 'A1', 2, 'llm', 'openai', 'gpt-5-mini', 'A1 Reading practice session', 1),
    ('6883967022be817edbf47073', 'practice', 'any', 'A2', 2, 'llm', 'openai', 'gpt-5-mini', 'A2 Reading practice session', 1),
    ('6883967022be817edbf47076', 'practice', 'any', 'B1', 2, 'llm', 'openai', 'gpt-5-mini', 'B1 Reading practice session', 1),
    ('6883967022be817edbf47077', 'practice', 'any', 'B2', 2, 'llm', 'openai', 'gpt-5-mini', 'B2 Reading practice session', 1)
ON DUPLICATE KEY UPDATE
    points_cost = VALUES(points_cost),
    evaluation_method = VALUES(evaluation_method),
    llm_model = VALUES(llm_model),
    description = VALUES(description);

-- Exam Reading (Deterministic - 0 points)
INSERT INTO credit_rules (
    id, 
    session_type, 
    activity_type, 
    level, 
    points_cost, 
    evaluation_method, 
    llm_provider, 
    llm_model, 
    description, 
    active
) VALUES 
    ('cr_exam_reading_a1', 'exam', 'reading', 'A1', 0, 'deterministic', 'openai', NULL, 'A1 Exam reading (deterministic)', 1),
    ('cr_exam_reading_a2', 'exam', 'reading', 'A2', 0, 'deterministic', 'openai', NULL, 'A2 Exam reading (deterministic)', 1),
    ('cr_exam_reading_b1', 'exam', 'reading', 'B1', 0, 'deterministic', 'openai', NULL, 'B1 Exam reading (deterministic)', 1)
ON DUPLICATE KEY UPDATE
    points_cost = VALUES(points_cost),
    evaluation_method = VALUES(evaluation_method),
    llm_model = VALUES(llm_model),
    description = VALUES(description);

-- Exam Hearing (Deterministic - 1 point)
INSERT INTO credit_rules (
    id, 
    session_type, 
    activity_type, 
    level, 
    points_cost, 
    evaluation_method, 
    llm_provider, 
    llm_model, 
    description, 
    active
) VALUES 
    ('cr_exam_hearing_a1', 'exam', 'hearing', 'A1', 1, 'deterministic', 'openai', NULL, 'A1 Exam hearing (deterministic)', 1),
    ('cr_exam_hearing_a2', 'exam', 'hearing', 'A2', 1, 'deterministic', 'openai', NULL, 'A2 Exam hearing (deterministic)', 1),
    ('cr_exam_hearing_b1', 'exam', 'hearing', 'B1', 1, 'deterministic', 'openai', NULL, 'B1 Exam hearing (deterministic)', 1)
ON DUPLICATE KEY UPDATE
    points_cost = VALUES(points_cost),
    evaluation_method = VALUES(evaluation_method),
    llm_model = VALUES(llm_model),
    description = VALUES(description);

-- Exam Writing (LLM - 2 points)
INSERT INTO credit_rules (
    id, 
    session_type, 
    activity_type, 
    level, 
    points_cost, 
    evaluation_method, 
    llm_provider, 
    llm_model, 
    description, 
    active
) VALUES 
    ('cr_exam_writing_a1', 'exam', 'writing', 'A1', 2, 'llm', 'openai', 'gpt-5-mini', 'A1 Exam writing (LLM evaluation)', 1),
    ('cr_exam_writing_a2', 'exam', 'writing', 'A2', 2, 'llm', 'openai', 'gpt-5-mini', 'A2 Exam writing (LLM evaluation)', 1),
    ('cr_exam_writing_b1', 'exam', 'writing', 'B1', 2, 'llm', 'openai', 'gpt-5-mini', 'B1 Exam writing (LLM evaluation)', 1)
ON DUPLICATE KEY UPDATE
    points_cost = VALUES(points_cost),
    evaluation_method = VALUES(evaluation_method),
    llm_model = VALUES(llm_model),
    description = VALUES(description);

-- Exam Grammar (LLM - 2 points)
INSERT INTO credit_rules (
    id,
    session_type,
    activity_type, 
    level, 
    points_cost, 
    evaluation_method, 
    llm_provider, 
    llm_model, 
    description, 
    active
) VALUES 
    ('cr_exam_grammar_a1', 'exam', 'grammar', 'A1', 2, 'llm', 'openai', 'gpt-5-mini', 'A1 Exam grammar (LLM evaluation)', 1),
    ('cr_exam_grammar_a2', 'exam', 'grammar', 'A2', 2, 'llm', 'openai', 'gpt-5-mini', 'A2 Exam grammar (LLM evaluation)', 1),
    ('cr_exam_grammar_b1', 'exam', 'grammar', 'B1', 2, 'llm', 'openai', 'gpt-5-mini', 'B1 Exam grammar (LLM evaluation)', 1)
ON DUPLICATE KEY UPDATE
    points_cost = VALUES(points_cost),
    evaluation_method = VALUES(evaluation_method),
    llm_model = VALUES(llm_model),
    description = VALUES(description);

-- Exam Speaking (LLM - 5-8 points)
INSERT INTO credit_rules (
    id,
    session_type,
    activity_type,
    level,
    points_cost,
    evaluation_method,
    llm_provider,
    llm_model,
    description,
    active
) VALUES
    ('cr_exam_speaking_a1', 'exam', 'speaking', 'A1', 5, 'llm', 'openai', 'gpt-5-mini', 'A1 Exam speaking (audio monologue)', 1),
    ('cr_exam_speaking_a2', 'exam', 'speaking', 'A2', 6, 'llm', 'openai', 'gpt-5-mini', 'A2 Exam speaking (audio monologue)', 1),
    ('cr_exam_speaking_b1', 'exam', 'speaking', 'B1', 7, 'llm', 'openai', 'gpt-5-mini', 'B1 Exam speaking (audio monologue)', 1),
    ('cr_exam_speaking_b2', 'exam', 'speaking', 'B2', 8, 'llm', 'openai', 'gpt-5-mini', 'B2 Exam speaking (audio monologue)', 1)
ON DUPLICATE KEY UPDATE
    points_cost = VALUES(points_cost),
    evaluation_method = VALUES(evaluation_method),
    llm_model = VALUES(llm_model),
    description = VALUES(description);

-- Exam Multiple (Complete exam - 6 points)
INSERT INTO credit_rules (
    id, 
    session_type, 
    activity_type, 
    level, 
    points_cost, 
    evaluation_method, 
    llm_provider, 
    llm_model, 
    description, 
    active
) VALUES 
    ('6883967022be817edbf47079', 'exam', 'multiple', 'A1', 6, 'llm', 'openai', 'gpt-5-mini', 'A1 Complete exam', 1),
    ('6883967022be817edbf4707a', 'exam', 'multiple', 'A2', 6, 'llm', 'openai', 'gpt-5-mini', 'A2 Complete exam', 1),
    ('6883967022be817edbf4707b', 'exam', 'multiple', 'B1', 6, 'llm', 'openai', 'gpt-5-mini', 'B1 Complete exam', 1),
    ('6883967022be817edbf4707c', 'exam', 'multiple', 'B2', 6, 'llm', 'openai', 'gpt-5-mini', 'B2 Complete exam', 1)
ON DUPLICATE KEY UPDATE
    points_cost = VALUES(points_cost),
    evaluation_method = VALUES(evaluation_method),
    llm_model = VALUES(llm_model),
    description = VALUES(description);

-- ============================================================================
-- PRICING PACKS (Required for health check and user operations)
-- ============================================================================
INSERT INTO pricing_packs (
    id,
    pack_name,
    credits,
    price_euros,
    price_cents,
    description,
    is_popular,
    is_active,
    display_order,
    discount_percentage,
    llm_model
) VALUES
    ('pp_trial', 'Trial Pack', 12, 0.00, 0, 'Trying the AI platform', 0, 1, 0, 0, 'gpt-5-mini'),
    ('pp_starter', 'Starter Pack', 60, 2.00, 300, 'Perfect for trying out the platform', 1, 1, 1, 70, 'gpt-5-mini'),
    ('pp_standard', 'Standard Pack', 200, 7.00, 700, 'Most popular choice for regular practice', 0, 1, 2, 70, 'gpt-5-mini'),
    ('pp_premium', 'Premium Pack', 600, 16.00, 1600, 'Best value for dedicated learners', 0, 1, 3, 70, 'gpt-5-mini'),
    ('pp_professional', 'Professional Pack', 1299, 22.00, 2200, 'For intensive exam preparation', 0, 1, 4, 70, 'gpt-5-mini'),
    ('pp_school_light', 'School Rate', 1, 0.10, 0, 'School Bill per Student use', 0, 1, 5, 70, 'gpt-5-mini'),
    ('pp_admin_ai', 'Admin AI Pack', 999999, 0.00, 0, 'Unlimited AI access for admins', 0, 1, 6, 0, 'gpt-4o-mini')
ON DUPLICATE KEY UPDATE
    pack_name = VALUES(pack_name),
    credits = VALUES(credits),
    price_euros = VALUES(price_euros),
    price_cents = VALUES(price_cents),
    description = VALUES(description),
    is_popular = VALUES(is_popular),
    is_active = VALUES(is_active),
    display_order = VALUES(display_order),
    discount_percentage = VALUES(discount_percentage),
    llm_model = VALUES(llm_model);

-- ============================================================================
-- TEST USER (Required for running tests)
-- ============================================================================
-- Test user credentials: test@test.com / password123
-- Password hash generated with bcrypt
INSERT INTO users (
    id,
    email,
    password_hash,
    name,
    is_active,
    email_verified,
    school_id,
    auth_provider
) VALUES (
    'test_user_id_001',
    'test@test.com',
    '$2b$12$uB0Z41BVlolc4IDse/uqF.0zP2wKOkx4g33B.YNJyOV9IQjjR.Aue',
    'Test User',
    1,
    1,
    '886eb0635e5a4825bc3323d0',
    'email'
) ON DUPLICATE KEY UPDATE
    password_hash = VALUES(password_hash),
    name = VALUES(name),
    is_active = VALUES(is_active),
    email_verified = VALUES(email_verified);

-- Create user access record with initial credits
INSERT INTO user_access (
    id,
    user_id,
    allocated_count,
    used_count,
    current_pack_id,
    status
) VALUES (
    'test_user_access_001',
    'test_user_id_001',
    100,
    0,
    'pp_standard',
    'available'
) ON DUPLICATE KEY UPDATE
    allocated_count = VALUES(allocated_count),
    used_count = VALUES(used_count),
    current_pack_id = VALUES(current_pack_id),
    status = VALUES(status);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Uncomment to verify data after seeding:
-- SELECT COUNT(*) as school_count FROM schools WHERE id = '886eb0635e5a4825bc3323d0';
-- SELECT COUNT(*) as language_count FROM languages WHERE is_active = 1;
-- SELECT COUNT(*) as credit_rule_count FROM credit_rules WHERE active = 1;
-- SELECT COUNT(*) as pricing_pack_count FROM pricing_packs WHERE is_active = 1;
-- SELECT session_type, activity_type, level, points_cost, evaluation_method, llm_model 
-- FROM credit_rules 
-- WHERE active = 1 
-- ORDER BY session_type, activity_type, level;

-- ============================================================================
-- END OF SEED DATA
-- ============================================================================

