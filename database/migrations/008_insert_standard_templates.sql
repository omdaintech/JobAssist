-- Insert Standard Templates Migration
-- This replaces hardcoded templates with database entries

-- Insert standard exam templates for all levels (A1, A2, B1)
-- Using Direct Students school (886eb0635e5a4825bc3323d0) for generic templates

-- Mini Read Write Exam Templates
INSERT INTO templates (id, school_id, template_name, level, session_type, template_data, is_active, created_at, updated_at)
VALUES 
-- A1 Mini Read Write
('6876c221cbe142a4c3f53b33', '886eb0635e5a4825bc3323d0', 'Mini Read Write Exam', 'A1', 'exam', 
 '{"reading": 3, "writing": 2, "grammar": 2, "hearing": 0}', 1, NOW(), NOW()),
-- A2 Mini Read Write
('6876c221cbe142a4c3f53b43', '886eb0635e5a4825bc3323d0', 'Mini Read Write Exam', 'A2', 'exam', 
 '{"reading": 3, "writing": 2, "grammar": 2, "hearing": 0}', 1, NOW(), NOW()),
-- B1 Mini Read Write
('6876c221cbe142a4c3f53b53', '886eb0635e5a4825bc3323d0', 'Mini Read Write Exam', 'B1', 'exam', 
 '{"reading": 3, "writing": 2, "grammar": 2, "hearing": 0}', 1, NOW(), NOW()),

-- Standard Mixed Exam Templates
-- A1 Standard Mixed
('6876c221cbe142a4c3f53b34', '886eb0635e5a4825bc3323d0', 'Standard Mixed Exam', 'A1', 'exam', 
 '{"reading": 5, "writing": 3, "grammar": 5, "hearing": 2}', 1, NOW(), NOW()),
-- A2 Standard Mixed
('6876c221cbe142a4c3f53b44', '886eb0635e5a4825bc3323d0', 'Standard Mixed Exam', 'A2', 'exam', 
 '{"reading": 5, "writing": 3, "grammar": 5, "hearing": 2}', 1, NOW(), NOW()),
-- B1 Standard Mixed
('6876c221cbe142a4c3f53b54', '886eb0635e5a4825bc3323d0', 'Standard Mixed Exam', 'B1', 'exam', 
 '{"reading": 5, "writing": 3, "grammar": 5, "hearing": 2}', 1, NOW(), NOW()),

-- Comprehensive Exam Templates
-- A1 Comprehensive
('6876c221cbe142a4c3f53b38', '886eb0635e5a4825bc3323d0', 'Comprehensive Exam', 'A1', 'exam', 
 '{"reading": 8, "writing": 5, "grammar": 5, "hearing": 0}', 1, NOW(), NOW()),
-- A2 Comprehensive
('6876c221cbe142a4c3f53b48', '886eb0635e5a4825bc3323d0', 'Comprehensive Exam', 'A2', 'exam', 
 '{"reading": 8, "writing": 5, "grammar": 5, "hearing": 0}', 1, NOW(), NOW()),
-- B1 Comprehensive
('6876c221cbe142a4c3f53b58', '886eb0635e5a4825bc3323d0', 'Comprehensive Exam', 'B1', 'exam', 
 '{"reading": 8, "writing": 5, "grammar": 5, "hearing": 0}', 1, NOW(), NOW()),

-- Practice Templates (for practice sessions)
-- Reading Practice Templates
('6876c221cbe142a4c3f53b35', '886eb0635e5a4825bc3323d0', 'Reading Practice Session', 'A1', 'practice', 
 '{"reading": 5, "writing": 0, "grammar": 0, "hearing": 0}', 1, NOW(), NOW()),
('6876c221cbe142a4c3f53b45', '886eb0635e5a4825bc3323d0', 'Reading Practice Session', 'A2', 'practice', 
 '{"reading": 5, "writing": 0, "grammar": 0, "hearing": 0}', 1, NOW(), NOW()),
('6876c221cbe142a4c3f53b55', '886eb0635e5a4825bc3323d0', 'Reading Practice Session', 'B1', 'practice', 
 '{"reading": 5, "writing": 0, "grammar": 0, "hearing": 0}', 1, NOW(), NOW()),

-- Writing Practice Templates
('6876c221cbe142a4c3f53b36', '886eb0635e5a4825bc3323d0', 'Writing Practice Session', 'A1', 'practice', 
 '{"reading": 0, "writing": 5, "grammar": 0, "hearing": 0}', 1, NOW(), NOW()),
('6876c221cbe142a4c3f53b46', '886eb0635e5a4825bc3323d0', 'Writing Practice Session', 'A2', 'practice', 
 '{"reading": 0, "writing": 5, "grammar": 0, "hearing": 0}', 1, NOW(), NOW()),
('6876c221cbe142a4c3f53b56', '886eb0635e5a4825bc3323d0', 'Writing Practice Session', 'B1', 'practice', 
 '{"reading": 0, "writing": 5, "grammar": 0, "hearing": 0}', 1, NOW(), NOW()),

-- Grammar Practice Templates
('6876c221cbe142a4c3f53b37', '886eb0635e5a4825bc3323d0', 'Grammar Practice Session', 'A1', 'practice', 
 '{"reading": 0, "writing": 0, "grammar": 5, "hearing": 0}', 1, NOW(), NOW()),
('6876c221cbe142a4c3f53b47', '886eb0635e5a4825bc3323d0', 'Grammar Practice Session', 'A2', 'practice', 
 '{"reading": 0, "writing": 0, "grammar": 5, "hearing": 0}', 1, NOW(), NOW()),
('6876c221cbe142a4c3f53b57', '886eb0635e5a4825bc3323d0', 'Grammar Practice Session', 'B1', 'practice', 
 '{"reading": 0, "writing": 0, "grammar": 5, "hearing": 0}', 1, NOW(), NOW()),

-- Hearing Practice Templates
('6876c221cbe142a4c3f53b39', '886eb0635e5a4825bc3323d0', 'Hearing Practice Session', 'A1', 'practice', 
 '{"reading": 0, "writing": 0, "grammar": 0, "hearing": 5}', 1, NOW(), NOW()),
('6876c221cbe142a4c3f53b49', '886eb0635e5a4825bc3323d0', 'Hearing Practice Session', 'A2', 'practice', 
 '{"reading": 0, "writing": 0, "grammar": 0, "hearing": 5}', 1, NOW(), NOW()),
('6876c221cbe142a4c3f53b59', '886eb0635e5a4825bc3323d0', 'Hearing Practice Session', 'B1', 'practice', 
 '{"reading": 0, "writing": 0, "grammar": 0, "hearing": 5}', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE 
    template_name = VALUES(template_name),
    template_data = VALUES(template_data),
    updated_at = NOW();