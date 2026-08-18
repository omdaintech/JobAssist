-- Migration: Add Hearing Exam Support
-- Date: 2024-12-19
-- Description: Add 'hearing' activity type and audio fields to support hearing exams

-- Step 1: Add 'hearing' to ActivityTypeEnum in question_bank table
-- Note: MySQL enum modification requires recreating the column
ALTER TABLE question_bank 
MODIFY COLUMN activity_type ENUM('reading', 'writing', 'grammar', 'hearing', 'full_exam', 'any', 'multiple') NOT NULL;

-- Step 2: Add audio fields to question_bank table
ALTER TABLE question_bank 
ADD COLUMN audio_url VARCHAR(500) NULL COMMENT 'URL to the audio file (e.g., S3)',
ADD COLUMN transcript TEXT NULL COMMENT 'Optional transcript of the audio';

-- Step 3: Add 'hearing' to ActivityTypeEnum in credit_rules table
ALTER TABLE credit_rules 
MODIFY COLUMN activity_type ENUM('reading', 'writing', 'grammar', 'hearing', 'full_exam', 'any', 'multiple') NOT NULL;

-- Step 4: Add 'hearing' to ActivityTypeEnum in usage_log table
ALTER TABLE usage_log 
MODIFY COLUMN activity_type ENUM('reading', 'writing', 'grammar', 'hearing', 'full_exam', 'any', 'multiple') NOT NULL;

-- Step 5: Insert default credit rules for hearing activities
INSERT INTO credit_rules (id, session_type, activity_type, level, points_cost, active, description, created_at, updated_at)
VALUES 
('67647b4d3e5a4825bc3323e1', 'exam', 'hearing', 'A1', 3, 1, 'A1 Hearing Exam', NOW(), NOW()),
('67647b4d3e5a4825bc3323e2', 'exam', 'hearing', 'A2', 3, 1, 'A2 Hearing Exam', NOW(), NOW()),
('67647b4d3e5a4825bc3323e3', 'exam', 'hearing', 'B1', 3, 1, 'B1 Hearing Exam', NOW(), NOW()),
('67647b4d3e5a4825bc3323e4', 'practice', 'hearing', 'A1', 2, 1, 'A1 Hearing Practice', NOW(), NOW()),
('67647b4d3e5a4825bc3323e5', 'practice', 'hearing', 'A2', 2, 1, 'A2 Hearing Practice', NOW(), NOW()),
('67647b4d3e5a4825bc3323e6', 'practice', 'hearing', 'B1', 2, 1, 'B1 Hearing Practice', NOW(), NOW()),
('67647b4d3e5a4825bc3323e7', 'exam', 'hearing', 'ALL', 3, 1, 'All Levels Hearing Exam', NOW(), NOW()),
('67647b4d3e5a4825bc3323e8', 'practice', 'hearing', 'ALL', 2, 1, 'All Levels Hearing Practice', NOW(), NOW());

-- Step 6: Insert sample hearing question using the provided Goethe MP4 URL
INSERT INTO question_bank (
    id, 
    language_id, 
    activity_type, 
    level, 
    difficulty_level,
    question,
    correct_answer,
    correct_answer_reason,
    options,
    audio_url,
    transcript,
    generated_by_admin,
    generation_method,
    created_datetime,
    date_string,
    time_string,
    is_active,
    usage_count,
    question_metadata
) VALUES (
    '67647b4d3e5a4825bc3323d1',  -- Generated ID
    '6876c221cbe142a4c3f53b30',  -- German language ID (assuming exists)
    'hearing',
    'A1', 
    'medium',
    'Listen to the audio and answer: What is the main topic being discussed?',
    'German language practice exercises',
    'The audio discusses practice exercises for German language learning at A1 level.',
    JSON_ARRAY(
        'German language practice exercises',
        'Italian cooking recipes', 
        'French literature discussion',
        'Spanish grammar rules'
    ),
    'https://goethemp4s.akamaized.net/resources/files/mp468/fit1_02_uebungssatz-v3.mp4',
    'This audio contains German language practice exercises suitable for A1 level learners.',
    'system',
    'individual',
    NOW(),
    DATE_FORMAT(NOW(), '%Y-%m-%d'),
    DATE_FORMAT(NOW(), '%H:%i:%s'),
    1,
    0,
    JSON_OBJECT(
        'audio_duration_seconds', 120,
        'audio_format', 'mp4',
        'source', 'Goethe Institute',
        'difficulty_notes', 'Clear pronunciation suitable for beginners'
    )
);

-- Verification queries (commented out - run manually to verify)
-- SELECT activity_type FROM question_bank WHERE activity_type = 'hearing';
-- SELECT * FROM credit_rules WHERE activity_type = 'hearing';
-- DESCRIBE question_bank;
