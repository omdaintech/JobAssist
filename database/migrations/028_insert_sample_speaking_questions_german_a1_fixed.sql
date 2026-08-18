-- Migration: Insert sample German A1 speaking questions (FIXED for MariaDB)
-- Date: 2025-01-15
-- Description: Add sample speaking (monologue) questions for German A1 level

-- Insert Sample Speaking Questions for German A1
INSERT INTO question_bank (
    id, 
    language_id, 
    activity_type, 
    level, 
    difficulty_level,
    transcript,
    question,
    correct_answer,
    correct_answer_reason,
    topic,
    question_type,
    audio_url,
    generated_by_admin,
    generation_method,
    created_datetime,
    date_string,
    time_string,
    is_active,
    usage_count,
    question_metadata
) VALUES

-- Question 1: Self Introduction
(
    '6883967022be817edbf47041',
    '687b9e32e94239d063f47070',  -- German language ID
    'speaking',
    'A1', 
    'easy',
    'Bitte stellen Sie sich vor. Sagen Sie Ihren Namen, woher Sie kommen und was Sie gerne machen.',
    'Introduce yourself. Say your name, where you are from, and what you like to do.',
    'A good response includes: name, country/city of origin, and at least one hobby or interest. Should be 3-5 sentences.',
    'The response should be personal, clear, and use basic A1 vocabulary. Expected elements: Ich heiße..., Ich komme aus..., Ich mag/liebe...',
    'Self Introduction',
    'monologue',
    NULL,
    'system',
    'json_upload',
    NOW(),
    DATE_FORMAT(NOW(), '%Y-%m-%d'),
    DATE_FORMAT(NOW(), '%H:%i:%s'),
    1,
    0,
    JSON_OBJECT(
        'min_answer_seconds', 15,
        'max_answer_seconds', 45,
        'suggested_duration', 30,
        'difficulty_notes', 'Basic self-introduction suitable for A1 beginners',
        'key_vocabulary', JSON_ARRAY('Name', 'Land', 'Stadt', 'Hobby', 'mögen')
    )
),

-- Question 2: Daily Routine
(
    '6883967022be817edbf47042',
    '687b9e32e94239d063f47070',
    'speaking',
    'A1', 
    'easy',
    'Beschreiben Sie Ihren typischen Tag. Was machen Sie morgens, mittags und abends?',
    'Describe your typical day. What do you do in the morning, afternoon, and evening?',
    'A good response includes: morning activities (wake up, breakfast), afternoon activities (work/school), and evening activities (dinner, free time). Should use present tense.',
    'The response should include time expressions and daily activities using A1 vocabulary. Expected verbs: aufstehen, frühstücken, arbeiten, essen, schlafen.',
    'Daily Routine',
    'monologue',
    NULL,
    'system',
    'json_upload',
    NOW(),
    DATE_FORMAT(NOW(), '%Y-%m-%d'),
    DATE_FORMAT(NOW(), '%H:%i:%s'),
    1,
    0,
    JSON_OBJECT(
        'min_answer_seconds', 20,
        'max_answer_seconds', 50,
        'suggested_duration', 35,
        'difficulty_notes', 'Describing daily routine with basic time expressions',
        'key_vocabulary', JSON_ARRAY('morgens', 'mittags', 'abends', 'aufstehen', 'essen', 'arbeiten')
    )
),

-- Question 3: Hobbies and Free Time
(
    '6883967022be817edbf47043',
    '687b9e32e94239d063f47070',
    'speaking',
    'A1', 
    'easy',
    'Was machen Sie gern in Ihrer Freizeit? Sprechen Sie über Ihre Hobbys.',
    'What do you like to do in your free time? Talk about your hobbies.',
    'A good response includes: at least 2-3 hobbies or leisure activities, frequency expressions (often, sometimes), and reasons why they enjoy these activities.',
    'The response should use "gern" and hobby vocabulary. Expected elements: Ich spiele gern..., Ich lese..., In meiner Freizeit...',
    'Hobbies and Leisure',
    'monologue',
    NULL,
    'system',
    'json_upload',
    NOW(),
    DATE_FORMAT(NOW(), '%Y-%m-%d'),
    DATE_FORMAT(NOW(), '%H:%i:%s'),
    1,
    0,
    JSON_OBJECT(
        'min_answer_seconds', 15,
        'max_answer_seconds', 40,
        'suggested_duration', 25,
        'difficulty_notes', 'Talking about hobbies using basic vocabulary',
        'key_vocabulary', JSON_ARRAY('Freizeit', 'Hobby', 'spielen', 'lesen', 'Sport', 'Musik')
    )
),

-- Question 4: Family Description
(
    '6883967022be817edbf47044',
    '687b9e32e94239d063f47070',
    'speaking',
    'A1', 
    'medium',
    'Erzählen Sie über Ihre Familie. Wer gehört zu Ihrer Familie?',
    'Tell about your family. Who belongs to your family?',
    'A good response includes: family members (parents, siblings, etc.), their names or descriptions, and perhaps what they do.',
    'The response should use possessive pronouns (mein, meine) and family vocabulary. Expected elements: Mein Vater/Meine Mutter heißt..., Ich habe... Geschwister.',
    'Family',
    'monologue',
    NULL,
    'system',
    'json_upload',
    NOW(),
    DATE_FORMAT(NOW(), '%Y-%m-%d'),
    DATE_FORMAT(NOW(), '%H:%i:%s'),
    1,
    0,
    JSON_OBJECT(
        'min_answer_seconds', 20,
        'max_answer_seconds', 50,
        'suggested_duration', 35,
        'difficulty_notes', 'Describing family with possessive pronouns',
        'key_vocabulary', JSON_ARRAY('Familie', 'Vater', 'Mutter', 'Bruder', 'Schwester', 'Eltern')
    )
),

-- Question 5: Favorite Food
(
    '6883967022be817edbf47045',
    '687b9e32e94239d063f47070',
    'speaking',
    'A1', 
    'easy',
    'Was essen und trinken Sie gern? Sprechen Sie über Ihr Lieblingsessen.',
    'What do you like to eat and drink? Talk about your favorite food.',
    'A good response includes: favorite foods and drinks, meals (breakfast, lunch, dinner), and simple reasons (lecker, gesund).',
    'The response should use food vocabulary and preference expressions. Expected elements: Ich esse gern..., Mein Lieblingsessen ist..., Zum Frühstück esse ich...',
    'Food and Drink',
    'monologue',
    NULL,
    'system',
    'json_upload',
    NOW(),
    DATE_FORMAT(NOW(), '%Y-%m-%d'),
    DATE_FORMAT(NOW(), '%H:%i:%s'),
    1,
    0,
    JSON_OBJECT(
        'min_answer_seconds', 15,
        'max_answer_seconds', 40,
        'suggested_duration', 25,
        'difficulty_notes', 'Talking about food preferences',
        'key_vocabulary', JSON_ARRAY('essen', 'trinken', 'Lieblingsessen', 'Frühstück', 'Mittagessen', 'lecker')
    )
);

-- Verification: Check inserted questions
SELECT 
    id,
    level,
    topic,
    LEFT(question, 50) as question_preview,
    JSON_VALUE(question_metadata, '$.min_answer_seconds') as min_seconds,
    JSON_VALUE(question_metadata, '$.max_answer_seconds') as max_seconds,
    is_active
FROM question_bank 
WHERE activity_type = 'speaking' 
  AND language_id = '687b9e32e94239d063f47070'
  AND level = 'A1'
ORDER BY created_datetime DESC;

SELECT 'Speaking questions inserted successfully!' AS Status;
