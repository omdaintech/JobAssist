-- Manual SQL Script: Insert Sample Hearing Question Data
-- Date: 2024-12-19
-- Description: Insert sample hearing question with Goethe MP4 audio URL
-- Instructions: Run this script manually in MySQL after running the schema migration

-- First, check if German language exists (adjust language_id if needed)
-- SELECT id, name FROM languages WHERE name LIKE '%German%' OR code = 'de';

-- Insert sample hearing question using the provided Goethe MP4 URL
-- Note: Replace '6876c221cbe142a4c3f53b30' with actual German language ID from your database
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
    '67647b4d3e5a4825bc3323d1',  -- Generated ID for hearing question
    '6876c221cbe142a4c3f53b30',  -- German language ID (ADJUST THIS IF NEEDED)
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

-- Insert a second hearing question with different difficulty
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
    '67647b4d3e5a4825bc3323d2',  -- Generated ID for second hearing question
    '6876c221cbe142a4c3f53b30',  -- German language ID (ADJUST THIS IF NEEDED)
    'hearing',
    'A2', 
    'easy',
    'Listen to the audio. How many people are speaking?',
    'Two people',
    'The audio contains a conversation between two people discussing language learning.',
    JSON_ARRAY(
        'One person',
        'Two people', 
        'Three people',
        'Four people'
    ),
    'https://goethemp4s.akamaized.net/resources/files/mp468/fit1_02_uebungssatz-v3.mp4',
    'This audio contains a dialogue between two speakers discussing German language practice.',
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
        'difficulty_notes', 'Simple dialogue for A2 level'
    )
);

-- Verification queries (run these to confirm insertion)
SELECT 
    id, 
    language_id, 
    activity_type, 
    level, 
    question, 
    audio_url,
    transcript
FROM question_bank 
WHERE activity_type = 'hearing'
ORDER BY created_datetime DESC;

-- Count hearing questions by level
SELECT level, COUNT(*) as hearing_questions_count
FROM question_bank 
WHERE activity_type = 'hearing' AND is_active = 1
GROUP BY level;
