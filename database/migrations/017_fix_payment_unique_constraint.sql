-- Fix Payment Transactions Unique Constraint
-- Allow multiple pending orders with NULL gateway_order_id
-- While maintaining uniqueness for actual payment gateway IDs

START TRANSACTION;

-- Drop existing unique constraint
ALTER TABLE payment_transactions 
DROP INDEX unique_gateway_order;

-- Modify gateway_order_id to allow NULL (instead of empty string for pending)
ALTER TABLE payment_transactions 
MODIFY COLUMN gateway_order_id VARCHAR(100) NULL DEFAULT NULL;

-- Add unique constraint (MySQL ignores NULLs in unique constraints)
-- This allows multiple "pending" transactions with NULL gateway_order_id
-- While enforcing uniqueness for actual payment gateway IDs
ALTER TABLE payment_transactions
ADD CONSTRAINT unique_gateway_order 
UNIQUE (gateway_provider, gateway_order_id);

COMMIT;
