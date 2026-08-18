-- Payment Transactions Table Migration
-- Creates payment_transactions table for multi-gateway payment processing
-- Gateway-agnostic design supports PayPal, Stripe, Razorpay, etc.

START TRANSACTION;

CREATE TABLE payment_transactions (
    id VARCHAR(24) PRIMARY KEY,
    user_id VARCHAR(24) NOT NULL,
    
    -- Gateway-Agnostic Data (supports PayPal, Stripe, Razorpay, etc.)
    gateway_provider VARCHAR(50) NOT NULL DEFAULT 'paypal',
    gateway_order_id VARCHAR(100) NOT NULL,
    gateway_capture_id VARCHAR(100),
    gateway_payer_email VARCHAR(255),
    gateway_payer_id VARCHAR(100),
    
    -- Payment Details
    amount_value DECIMAL(10,2) NOT NULL,
    currency_code VARCHAR(3) NOT NULL DEFAULT 'EUR',
    credits_purchased INT NOT NULL,
    pricing_pack_id VARCHAR(24),
    
    -- Status Tracking
    status ENUM('created', 'completed', 'failed', 'refunded') NOT NULL DEFAULT 'created',
    
    -- Audit Trail
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    webhook_received_at DATETIME,
    webhook_payload JSON,
    
    -- Indexes for Performance
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_gateway_provider (gateway_provider),
    INDEX idx_gateway_order_id (gateway_order_id),
    INDEX idx_created_at (created_at),
    
    -- Unique constraint per gateway (prevents duplicate processing)
    UNIQUE KEY unique_gateway_order (gateway_provider, gateway_order_id),
    
    -- Foreign Keys
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (pricing_pack_id) REFERENCES pricing_packs(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

COMMIT;

