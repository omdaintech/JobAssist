-- Migration: Create messages table for contact and feedback
-- Date: 2025-10-24
-- Description: Single table to handle both contact form (public) and feedback (authenticated users)

CREATE TABLE messages (
    id VARCHAR(24) PRIMARY KEY,
    message_type ENUM('contact', 'feedback') NOT NULL,
    
    -- Contact form fields (required for contact, optional for feedback)
    name VARCHAR(100),
    email VARCHAR(100),
    subject VARCHAR(200),
    
    -- Common fields
    message TEXT NOT NULL,
    
    -- Feedback specific fields
    user_id VARCHAR(24),
    category ENUM('bug_report', 'feature_request', 'general_feedback', 'user_experience', 'content_quality'),
    user_context JSON,
    severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    
    -- Metadata
    source VARCHAR(50) DEFAULT 'website',
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    -- Admin management
    is_read BOOLEAN DEFAULT FALSE,
    admin_notes TEXT,
    read_at DATETIME NULL,
    read_by VARCHAR(24) NULL,
    
    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Constraints
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Indexes for performance
    INDEX idx_message_type (message_type),
    INDEX idx_user_id (user_id),
    INDEX idx_email (email),
    INDEX idx_category (category),
    INDEX idx_severity (severity),
    INDEX idx_is_read (is_read),
    INDEX idx_created_at (created_at),
    INDEX idx_source (source)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
