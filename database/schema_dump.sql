-- MySQL dump 10.13  Distrib 9.4.0, for macos15.4 (arm64)
--
-- Host: localhost    Database: cefr_practice
-- ------------------------------------------------------
-- Server version	9.4.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `_deprecated_activity_model_mapping`
--

DROP TABLE IF EXISTS `_deprecated_activity_model_mapping`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `_deprecated_activity_model_mapping` (
  `id` varchar(24) COLLATE utf8mb4_unicode_ci NOT NULL,
  `activity_type` enum('reading','writing','grammar','hearing','speaking') COLLATE utf8mb4_unicode_ci NOT NULL,
  `language_id` varchar(24) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'NULL = applies to all languages (V1), specific ID for overrides (V2)',
  `level` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'NULL = applies to all levels (V1), specific level for overrides (V2)',
  `llm_provider` varchar(45) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'openai' COMMENT 'openai, azure, anthropic, google',
  `llm_model` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Model name: gpt-4o-mini, gpt-5-mini, claude-3.5-sonnet, etc',
  `model_config` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin COMMENT 'Provider-specific config: temperature, max_tokens, deployment_name, etc',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `notes` text COLLATE utf8mb4_unicode_ci COMMENT 'Admin notes: why this mapping exists, business rationale',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_activity_mapping` (`activity_type`,`language_id`,`level`),
  KEY `idx_activity_lookup` (`activity_type`,`is_active`),
  KEY `idx_granular_lookup` (`activity_type`,`language_id`,`level`,`is_active`),
  KEY `fk_activity_mapping_language` (`language_id`),
  CONSTRAINT `fk_activity_mapping_language` FOREIGN KEY (`language_id`) REFERENCES `languages` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='V1: Global activity-to-model mappings. V2: Can add language/level overrides.';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `admin_users`
--

DROP TABLE IF EXISTS `admin_users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin_users` (
  `id` varchar(24) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` enum('admin','super_admin') COLLATE utf8mb4_unicode_ci DEFAULT 'admin',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `last_login` datetime DEFAULT NULL,
  `permissions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `created_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT 'system',
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_email` (`email`),
  KEY `idx_role` (`role`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `credit_rules`
--

DROP TABLE IF EXISTS `credit_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `credit_rules` (
  `id` varchar(24) COLLATE utf8mb4_unicode_ci NOT NULL,
  `session_type` enum('practice','exam','admin') COLLATE utf8mb4_unicode_ci NOT NULL,
  `activity_type` enum('reading','writing','grammar','hearing','speaking','full_exam','any','multiple') COLLATE utf8mb4_unicode_ci NOT NULL,
  `level` enum('A1','A2','B1','B2','ALL') COLLATE utf8mb4_unicode_ci NOT NULL,
  `points_cost` int NOT NULL,
  `evaluation_method` enum('deterministic','llm') COLLATE utf8mb4_unicode_ci DEFAULT 'llm' COMMENT 'Evaluation method: deterministic (rule-based) or llm (AI)',
  `llm_provider` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'openai' COMMENT 'LLM provider (openai, anthropic, etc)',
  `llm_model` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'LLM model name (gpt-4o-mini, gpt-5-mini, etc)',
  `description` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `active` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_rule` (`session_type`,`activity_type`,`level`),
  KEY `idx_active` (`active`),
  KEY `idx_session_activity` (`session_type`,`activity_type`),
  CONSTRAINT `credit_rules_chk_1` CHECK (((`points_cost` >= 0) and (`points_cost` <= 100)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `exam_detail`
--

DROP TABLE IF EXISTS `exam_detail`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `exam_detail` (
  `id` varchar(24) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(24) COLLATE utf8mb4_unicode_ci NOT NULL,
  `exam_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `language_id` varchar(24) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `level` varchar(2) COLLATE utf8mb4_unicode_ci NOT NULL,
  `template_id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `template` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'created',
  `session_type` enum('exam','practice') COLLATE utf8mb4_unicode_ci DEFAULT 'exam',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `completed_at` datetime DEFAULT NULL,
  `analyzed_at` datetime DEFAULT NULL,
  `exam_summary` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `analysis_step` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `started_at` datetime DEFAULT NULL,
  `created_by_school_id` varchar(24) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `school_metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_language_id` (`language_id`),
  KEY `idx_level` (`level`),
  KEY `idx_session_type` (`session_type`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_exam_detail_composite` (`user_id`,`session_type`,`status`),
  KEY `idx_user_completed_status` (`user_id`,`completed_at`,`status`),
  KEY `fk_exam_detail_created_by_school` (`created_by_school_id`),
  KEY `idx_user_time_lang_status` (`user_id`,`completed_at`,`language_id`,`status`),
  CONSTRAINT `exam_detail_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_exam_detail_created_by_school` FOREIGN KEY (`created_by_school_id`) REFERENCES `schools` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_exam_detail_language` FOREIGN KEY (`language_id`) REFERENCES `languages` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `exam_log`
--

DROP TABLE IF EXISTS `exam_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `exam_log` (
  `id` varchar(24) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(24) COLLATE utf8mb4_unicode_ci NOT NULL,
  `language_id` varchar(24) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `question_id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `activity_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `question_number` int NOT NULL,
  `question_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `user_answer` text COLLATE utf8mb4_unicode_ci,
  `feedback_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `session_type` enum('exam','practice') COLLATE utf8mb4_unicode_ci DEFAULT 'exam',
  `answered_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `exam_detail_id` varchar(24) COLLATE utf8mb4_unicode_ci NOT NULL,
  `exam_log_meta` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `user_audio_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_audio_transcript` text COLLATE utf8mb4_unicode_ci,
  `user_audio_meta` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_question_id` (`question_id`),
  KEY `idx_activity_type` (`activity_type`),
  KEY `idx_answered_at` (`answered_at`),
  KEY `idx_question_number` (`question_number`),
  KEY `idx_exam_log_exam_detail_id` (`exam_detail_id`),
  KEY `idx_exam_log_composite` (`exam_detail_id`,`question_number`),
  KEY `idx_exam_log_user_detail_order` (`exam_detail_id`,`user_id`,`question_number`),
  CONSTRAINT `exam_log_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_exam_log_exam_detail` FOREIGN KEY (`exam_detail_id`) REFERENCES `exam_detail` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `languages`
--

DROP TABLE IF EXISTS `languages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `languages` (
  `id` varchar(24) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `flag_emoji` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `supported_levels` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `display_order` int DEFAULT '0',
  `native_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `idx_code` (`code`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_display_order` (`display_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `llm_logs`
--

DROP TABLE IF EXISTS `llm_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `llm_logs` (
  `id` varchar(24) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(24) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `session_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `exam_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `activity_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `prompt_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `model_used` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `request_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `response_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `token_usage` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `processing_time_ms` int DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `error_message` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `llm_metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_session_id` (`session_id`),
  KEY `idx_exam_id` (`exam_id`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_status` (`status`),
  KEY `idx_model_used` (`model_used`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `messages`
--

DROP TABLE IF EXISTS `messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `messages` (
  `id` varchar(24) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message_type` enum('contact','feedback') COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `subject` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(24) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `category` enum('bug_report','feature_request','general_feedback','user_experience','content_quality') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_context` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `severity` enum('low','medium','high','critical') COLLATE utf8mb4_unicode_ci DEFAULT 'medium',
  `source` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'website',
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `is_read` tinyint(1) DEFAULT '0',
  `admin_notes` text COLLATE utf8mb4_unicode_ci,
  `read_at` datetime DEFAULT NULL,
  `read_by` varchar(24) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_message_type` (`message_type`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_email` (`email`),
  KEY `idx_category` (`category`),
  KEY `idx_severity` (`severity`),
  KEY `idx_is_read` (`is_read`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_source` (`source`),
  CONSTRAINT `messages_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `payment_transactions`
--

DROP TABLE IF EXISTS `payment_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_transactions` (
  `id` varchar(24) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(24) COLLATE utf8mb4_unicode_ci NOT NULL,
  `gateway_provider` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'paypal',
  `gateway_order_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gateway_capture_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gateway_payer_email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gateway_payer_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `amount_value` decimal(10,2) NOT NULL,
  `currency_code` varchar(3) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'EUR',
  `credits_purchased` int NOT NULL,
  `pricing_pack_id` varchar(24) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('created','completed','failed','refunded') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'created',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `completed_at` datetime DEFAULT NULL,
  `webhook_received_at` datetime DEFAULT NULL,
  `webhook_payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_gateway_order` (`gateway_provider`,`gateway_order_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_gateway_provider` (`gateway_provider`),
  KEY `idx_gateway_order_id` (`gateway_order_id`),
  KEY `idx_created_at` (`created_at`),
  KEY `pricing_pack_id` (`pricing_pack_id`),
  CONSTRAINT `payment_transactions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `payment_transactions_ibfk_2` FOREIGN KEY (`pricing_pack_id`) REFERENCES `pricing_packs` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `pricing_packs`
--

DROP TABLE IF EXISTS `pricing_packs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pricing_packs` (
  `id` varchar(24) COLLATE utf8mb4_unicode_ci NOT NULL,
  `pack_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `credits` int NOT NULL,
  `price_euros` decimal(10,2) NOT NULL,
  `price_cents` int NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `features` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `is_popular` tinyint(1) DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `display_order` int DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `stripe_price_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `discount_percentage` int DEFAULT '0',
  `llm_model` varchar(45) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'gpt-4o-mini',
  PRIMARY KEY (`id`),
  KEY `idx_active` (`is_active`),
  KEY `idx_display_order` (`display_order`),
  KEY `idx_is_popular` (`is_popular`),
  CONSTRAINT `pricing_packs_chk_1` CHECK ((`credits` > 0)),
  CONSTRAINT `pricing_packs_chk_2` CHECK ((`price_euros` >= 0)),
  CONSTRAINT `pricing_packs_chk_3` CHECK ((`price_cents` >= 0)),
  CONSTRAINT `pricing_packs_chk_4` CHECK (((`discount_percentage` >= 0) and (`discount_percentage` <= 100)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `question_bank`
--

DROP TABLE IF EXISTS `question_bank`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `question_bank` (
  `id` varchar(24) COLLATE utf8mb4_unicode_ci NOT NULL,
  `language_id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `activity_type` enum('reading','writing','grammar','hearing','speaking','full_exam','any','multiple') COLLATE utf8mb4_unicode_ci NOT NULL,
  `level` enum('A1','A2','B1','B2','ALL') COLLATE utf8mb4_unicode_ci NOT NULL,
  `difficulty_level` enum('easy','medium','difficult') COLLATE utf8mb4_unicode_ci DEFAULT 'difficult',
  `text` text COLLATE utf8mb4_unicode_ci,
  `question` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `correct_answer` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `correct_answer_reason` text COLLATE utf8mb4_unicode_ci,
  `options` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `instruction` text COLLATE utf8mb4_unicode_ci,
  `topic` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `requirements` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `minimum_words` int DEFAULT NULL,
  `writing_format` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `grammar_topic` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `task_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `question_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tip` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_id` varchar(24) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `generated_by_admin` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT 'system',
  `generation_method` enum('bulk_admin','bulk_admin_api','individual','ai_generated','json_upload') COLLATE utf8mb4_unicode_ci DEFAULT 'bulk_admin',
  `created_datetime` datetime DEFAULT CURRENT_TIMESTAMP,
  `date_string` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `time_string` varchar(8) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `usage_count` int DEFAULT '0',
  `last_used` datetime DEFAULT NULL,
  `tags` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `question_metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `audio_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'URL to the audio file (e.g., S3)',
  `transcript` text COLLATE utf8mb4_unicode_ci COMMENT 'Optional transcript of the audio',
  PRIMARY KEY (`id`),
  KEY `idx_language` (`language_id`),
  KEY `idx_activity_level` (`activity_type`,`level`),
  KEY `idx_created` (`created_datetime`),
  KEY `idx_active` (`is_active`),
  KEY `idx_difficulty` (`difficulty_level`),
  KEY `idx_question_bank_composite` (`activity_type`,`level`,`is_active`),
  KEY `idx_question_bank_admin_list` (`is_active`,`created_datetime` DESC,`language_id`),
  CONSTRAINT `question_bank_chk_1` CHECK (((`minimum_words` >= 10) and (`minimum_words` <= 1000)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `question_usage_log`
--

DROP TABLE IF EXISTS `question_usage_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `question_usage_log` (
  `id` varchar(24) COLLATE utf8mb4_unicode_ci NOT NULL,
  `question_id` varchar(24) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(24) COLLATE utf8mb4_unicode_ci NOT NULL,
  `activity_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `level` varchar(2) COLLATE utf8mb4_unicode_ci NOT NULL,
  `session_type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `used_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_question` (`question_id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_used_at` (`used_at`),
  KEY `idx_activity_level` (`activity_type`,`level`),
  CONSTRAINT `question_usage_log_ibfk_1` FOREIGN KEY (`question_id`) REFERENCES `question_bank` (`id`) ON DELETE CASCADE,
  CONSTRAINT `question_usage_log_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `school_admins`
--

DROP TABLE IF EXISTS `school_admins`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `school_admins` (
  `id` varchar(24) COLLATE utf8mb4_unicode_ci NOT NULL,
  `school_id` varchar(24) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `last_login` datetime DEFAULT NULL,
  `permissions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_school_admins_school_id` (`school_id`),
  KEY `idx_school_admins_email` (`email`),
  KEY `idx_school_admins_active` (`is_active`),
  CONSTRAINT `fk_school_admins_school_id` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `schools`
--

DROP TABLE IF EXISTS `schools`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `schools` (
  `id` varchar(24) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) DEFAULT '1',
  `school_type` enum('b2c','b2b','enterprise') COLLATE utf8mb4_unicode_ci DEFAULT 'b2c',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `contact_email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contact_phone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `admin_email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `admin_phone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `billing_email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `billing_contact_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `billing_phone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payment_method_info` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `physical_address` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `billing_address` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `tax_address` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `tax_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `vat_number` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tax_exemption_status` tinyint(1) DEFAULT '0',
  `priority_support` tinyint(1) DEFAULT '0',
  `account_manager_notes` text COLLATE utf8mb4_unicode_ci,
  `internal_tags` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `billing_pack_id` varchar(24) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `student_pack_id` varchar(24) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `billing_cycle` enum('monthly','quarterly','annual') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'monthly',
  `cycle_start` date DEFAULT NULL,
  `cycle_end` date DEFAULT NULL,
  `last_billed_at` datetime DEFAULT NULL,
  `settings` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  PRIMARY KEY (`id`),
  KEY `idx_name` (`name`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_school_type` (`school_type`),
  KEY `idx_schools_billing_email` (`billing_email`),
  KEY `idx_schools_tax_id` (`tax_id`),
  KEY `idx_schools_vat_number` (`vat_number`),
  KEY `idx_schools_priority_support` (`priority_support`),
  KEY `fk_schools_billing_pack` (`billing_pack_id`),
  KEY `fk_schools_student_pack` (`student_pack_id`),
  KEY `idx_schools_billing_cycle` (`billing_cycle`,`cycle_start`,`cycle_end`),
  KEY `idx_schools_admin_list` (`is_active`,`created_at` DESC),
  CONSTRAINT `fk_schools_billing_pack` FOREIGN KEY (`billing_pack_id`) REFERENCES `pricing_packs` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_schools_student_pack` FOREIGN KEY (`student_pack_id`) REFERENCES `pricing_packs` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `session_shares`
--

DROP TABLE IF EXISTS `session_shares`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `session_shares` (
  `id` varchar(24) COLLATE utf8mb4_unicode_ci NOT NULL,
  `share_code` varchar(12) COLLATE utf8mb4_unicode_ci NOT NULL,
  `session_id` varchar(24) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(24) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `expires_at` datetime DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `share_code` (`share_code`),
  KEY `idx_session_shares_session_id` (`session_id`),
  KEY `idx_session_shares_user_id` (`user_id`),
  KEY `idx_session_shares_share_code` (`share_code`),
  KEY `idx_session_shares_active` (`is_active`),
  KEY `idx_session_shares_expires_at` (`expires_at`),
  CONSTRAINT `fk_session_shares_session` FOREIGN KEY (`session_id`) REFERENCES `exam_detail` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_session_shares_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `templates`
--

DROP TABLE IF EXISTS `templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `templates` (
  `id` varchar(24) COLLATE utf8mb4_unicode_ci NOT NULL,
  `school_id` varchar(24) COLLATE utf8mb4_unicode_ci NOT NULL,
  `level` enum('A1','A2','B1','B2','C1','ALL') COLLATE utf8mb4_unicode_ci NOT NULL,
  `template_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `template_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `session_type` enum('exam','practice') COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_school_level` (`school_id`,`level`),
  KEY `idx_session_type` (`session_type`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_templates_composite` (`school_id`,`level`,`session_type`,`is_active`),
  CONSTRAINT `templates_ibfk_1` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `usage_log`
--

DROP TABLE IF EXISTS `usage_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usage_log` (
  `id` varchar(24) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `school_id` varchar(24) COLLATE utf8mb4_unicode_ci NOT NULL,
  `session_type` enum('practice','exam','admin') COLLATE utf8mb4_unicode_ci NOT NULL,
  `activity_type` enum('reading','writing','grammar','hearing','speaking','full_exam','any','multiple') COLLATE utf8mb4_unicode_ci NOT NULL,
  `level` enum('A1','A2','B1','B2','ALL') COLLATE utf8mb4_unicode_ci NOT NULL,
  `language_id` varchar(24) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `points_deducted` int NOT NULL,
  `points_remaining` int NOT NULL,
  `timestamp` datetime DEFAULT CURRENT_TIMESTAMP,
  `session_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `exam_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('pending','completed','failed') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `llm_analytics` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_timestamp` (`timestamp`),
  KEY `idx_session_type` (`session_type`),
  KEY `idx_status` (`status`),
  KEY `idx_exam_id` (`exam_id`),
  KEY `idx_usage_log_school_timestamp` (`school_id`,`timestamp`),
  KEY `idx_usage_log_session_timestamp` (`session_id`,`timestamp` DESC),
  KEY `idx_usage_log_user_status_timestamp` (`user_id`,`status`,`timestamp` DESC),
  KEY `idx_language_id` (`language_id`),
  CONSTRAINT `fk_usage_log_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `usage_log_chk_1` CHECK (((`points_deducted` >= 0) and (`points_deducted` <= 100))),
  CONSTRAINT `usage_log_chk_2` CHECK (((`points_remaining` >= 0) and (`points_remaining` <= 10000)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_access`
--

DROP TABLE IF EXISTS `user_access`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_access` (
  `id` varchar(24) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(24) COLLATE utf8mb4_unicode_ci NOT NULL,
  `allocated_count` int NOT NULL DEFAULT '0',
  `used_count` int DEFAULT '0',
  `current_pack_id` varchar(24) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `last_used` datetime DEFAULT NULL,
  `access_expires` datetime DEFAULT NULL,
  `reserved_credits` int DEFAULT '0',
  `reservation_time` datetime DEFAULT NULL,
  `status` enum('available','analysis_initiated','analysis_completed') COLLATE utf8mb4_unicode_ci DEFAULT 'available',
  `last_deduction_id` varchar(24) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reset_at` datetime DEFAULT NULL,
  `reset_by` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reset_reason` text COLLATE utf8mb4_unicode_ci,
  `topups` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_access` (`user_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_status` (`status`),
  KEY `idx_current_pack_id` (`current_pack_id`),
  CONSTRAINT `fk_user_access_current_pack` FOREIGN KEY (`current_pack_id`) REFERENCES `pricing_packs` (`id`) ON DELETE SET NULL,
  CONSTRAINT `user_access_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_used_not_exceed` CHECK ((`used_count` <= `allocated_count`)),
  CONSTRAINT `user_access_chk_1` CHECK (((`allocated_count` >= 0) and (`allocated_count` <= 10000))),
  CONSTRAINT `user_access_chk_2` CHECK (((`used_count` >= 0) and (`used_count` <= 10000))),
  CONSTRAINT `user_access_chk_3` CHECK (((`reserved_credits` >= 0) and (`reserved_credits` <= 100)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` varchar(24) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `current_level` enum('A0','A1','A2','B1') COLLATE utf8mb4_unicode_ci DEFAULT 'A1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `last_login` datetime DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `firebase_uid` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `auth_provider` enum('email','google','facebook','firebase') COLLATE utf8mb4_unicode_ci DEFAULT 'email',
  `photo_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email_verified` tinyint(1) DEFAULT '0',
  `phone_number` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `verification_code` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `verification_expires` datetime DEFAULT NULL,
  `verification_sent_at` datetime DEFAULT NULL,
  `reset_password_token` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reset_password_expires` datetime DEFAULT NULL,
  `favorite_activities` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `daily_goal` int DEFAULT '10',
  `preferred_language_id` varchar(24) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_onboarded` tinyint(1) NOT NULL DEFAULT '0',
  `onboarding_goal` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target_level` enum('A1','A2','B1') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `practice_frequency_per_week` int DEFAULT NULL,
  `last_activity_date` date DEFAULT NULL,
  `streak_days` int DEFAULT '0',
  `achievements` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `school_id` varchar(24) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '886eb0635e5a4825bc3323d0',
  `user_custom_school` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `firebase_uid` (`firebase_uid`),
  KEY `idx_email` (`email`),
  KEY `idx_firebase_uid` (`firebase_uid`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_users_preferred_language` (`preferred_language_id`),
  KEY `fk_users_school` (`school_id`),
  CONSTRAINT `fk_users_preferred_language` FOREIGN KEY (`preferred_language_id`) REFERENCES `languages` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_users_school` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-11-12 18:46:37
