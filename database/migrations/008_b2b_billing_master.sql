-- B2B Billing schema update (single-shot manual script)
-- NOTE: run on a backup-tested environment first
-- This script adds billing columns, enforces usage tracking,
-- and creates supporting indexes. It does not include IF EXISTS guards.

START TRANSACTION;

-- Remove legacy school credit columns
ALTER TABLE schools
    DROP COLUMN allocated_credits,
    DROP COLUMN school_credit_remaining,
    DROP COLUMN credit_history;

-- Extend schools with billing configuration
ALTER TABLE schools
    ADD COLUMN billing_pack_id VARCHAR(24) NULL,
    ADD COLUMN student_pack_id VARCHAR(24) NULL,
    ADD COLUMN billing_cycle ENUM('monthly','quarterly','annual') NOT NULL DEFAULT 'monthly',
    ADD COLUMN cycle_start DATE NULL,
    ADD COLUMN cycle_end DATE NULL,
    ADD COLUMN last_billed_at DATETIME NULL;

-- Wire billing columns to pricing_packs
ALTER TABLE schools
    ADD CONSTRAINT fk_schools_billing_pack
        FOREIGN KEY (billing_pack_id) REFERENCES pricing_packs(id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    ADD CONSTRAINT fk_schools_student_pack
        FOREIGN KEY (student_pack_id) REFERENCES pricing_packs(id)
        ON UPDATE CASCADE ON DELETE SET NULL;

-- Track school ownership on usage logs
ALTER TABLE usage_log
    ADD COLUMN school_id VARCHAR(24) NULL;

-- Backfill school_id using existing user.school_id linkage
UPDATE usage_log AS ul
JOIN users AS u ON ul.user_id = u.id
SET ul.school_id = u.school_id
WHERE ul.school_id IS NULL;

-- Make the relationship mandatory and enforce referential integrity
ALTER TABLE usage_log
    MODIFY COLUMN school_id VARCHAR(24) NOT NULL,
    ADD CONSTRAINT fk_usage_log_school
        FOREIGN KEY (school_id) REFERENCES schools(id)
        ON UPDATE CASCADE ON DELETE RESTRICT;

-- Create supporting indexes for billing queries
CREATE INDEX idx_schools_billing_cycle
    ON schools (billing_cycle, cycle_start, cycle_end);

CREATE INDEX idx_usage_log_school_timestamp
    ON usage_log (school_id, timestamp);

COMMIT;
