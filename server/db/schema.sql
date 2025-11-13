-- NOTE: Database creation is handled by admin. This schema assumes
-- the target database already exists and the connection selects it.

-- Temporarily disable foreign key checks while creating tables
SET FOREIGN_KEY_CHECKS = 0;

-- Users (admin, advisor, student)
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `role` ENUM('admin','advisor','student') NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NULL,
  `full_name` VARCHAR(255) NOT NULL,
  `status` ENUM('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;



-- Advisor availability slots (per-date occurrences created in UI)
CREATE TABLE IF NOT EXISTS `advisor_slots` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `advisor_user_id` INT UNSIGNED NOT NULL,
  `start_datetime` DATETIME NOT NULL,
  `end_datetime` DATETIME NOT NULL,
  `mode` ENUM('online','face_to_face','hybrid') NOT NULL DEFAULT 'online',
  `room` VARCHAR(255) DEFAULT NULL,
  `status` ENUM('available','booked','cancelled') NOT NULL DEFAULT 'available',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_slots_advisor` (`advisor_user_id`),
  KEY `idx_slots_start` (`start_datetime`),
  CONSTRAINT `fk_slots_advisor`
    FOREIGN KEY (`advisor_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- Advisor profile details
CREATE TABLE IF NOT EXISTS `advisor_profiles` (
  `user_id` INT UNSIGNED NOT NULL,
  `title` VARCHAR(255) NULL,
  `department` VARCHAR(255) NULL,
  `department_id` INT UNSIGNED NULL,
  `avatar_url` TEXT NULL,
  `bio` TEXT NULL,
  `office_location` VARCHAR(255) NULL,
  `status` ENUM('available','unavailable','busy') NOT NULL DEFAULT 'available',
  PRIMARY KEY (`user_id`),
  CONSTRAINT `fk_advisor_profile_user`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Student profile details
CREATE TABLE IF NOT EXISTS `student_profiles` (
  `user_id` INT UNSIGNED NOT NULL,
  `avatar_url` TEXT NULL,
  `program` VARCHAR(255) NULL,
  `program_id` INT UNSIGNED NULL,
  `year_level` VARCHAR(50) NULL,
  PRIMARY KEY (`user_id`),
  CONSTRAINT `fk_student_profile_user`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Advisor courses taught
CREATE TABLE IF NOT EXISTS `advisor_courses` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `advisor_user_id` INT UNSIGNED NOT NULL,
  `course_name` VARCHAR(255) NOT NULL,
  `subject_code` VARCHAR(50) NOT NULL,
  `subject_name` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_courses_advisor` (`advisor_user_id`),
  KEY `idx_courses_subject_code` (`subject_code`),
  KEY `idx_courses_subject_name` (`subject_name`),
  CONSTRAINT `fk_courses_advisor`
    FOREIGN KEY (`advisor_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Advisor topics
CREATE TABLE IF NOT EXISTS `advisor_topics` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `advisor_user_id` INT UNSIGNED NOT NULL,
  `topic` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_topics_advisor` (`advisor_user_id`),
  CONSTRAINT `fk_topics_advisor`
    FOREIGN KEY (`advisor_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Advisor preparation guidelines
CREATE TABLE IF NOT EXISTS `advisor_guidelines` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `advisor_user_id` INT UNSIGNED NOT NULL,
  `guideline_text` TEXT NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_guidelines_advisor` (`advisor_user_id`),
  CONSTRAINT `fk_guidelines_advisor`
    FOREIGN KEY (`advisor_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Advisor consultation modes
CREATE TABLE IF NOT EXISTS `advisor_modes` (
  `advisor_user_id` INT UNSIGNED NOT NULL,
  `online_enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `in_person_enabled` TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`advisor_user_id`),
  CONSTRAINT `fk_modes_advisor`
    FOREIGN KEY (`advisor_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Advisor weekly availability (recurring)
CREATE TABLE IF NOT EXISTS `advisor_availability` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `advisor_user_id` INT UNSIGNED NOT NULL,
  `day_of_week` ENUM('monday','tuesday','wednesday','thursday','friday','saturday','sunday') NOT NULL,
  `start_time` TIME NOT NULL,
  `end_time` TIME NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_availability_advisor` (`advisor_user_id`),
  CONSTRAINT `fk_availability_advisor`
    FOREIGN KEY (`advisor_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Consultations
CREATE TABLE IF NOT EXISTS `consultations` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `student_user_id` INT UNSIGNED NOT NULL,
  `advisor_user_id` INT UNSIGNED NOT NULL,
  `topic` VARCHAR(255) NOT NULL,
  `category` VARCHAR(100) NULL,
  `mode` ENUM('online','in-person') NOT NULL,
  `status` ENUM('pending','approved','declined','completed','cancelled','missed') NOT NULL DEFAULT 'pending',
  `decline_reason` TEXT NULL,
  `cancel_reason` TEXT NULL,
  `meeting_link` TEXT NULL,
  `room_name` VARCHAR(255) NULL,
  `location` VARCHAR(255) NULL,
  `student_notes` TEXT NULL,
  `start_datetime` DATETIME NOT NULL,
  `end_datetime` DATETIME NOT NULL,
  `actual_start_datetime` DATETIME NULL,
  `actual_end_datetime` DATETIME NULL,
  `duration_minutes` INT UNSIGNED NULL,
  `booking_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `summary_notes` TEXT NULL,
  `final_transcript` LONGTEXT NULL,
  `ai_summary` LONGTEXT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_consult_student` (`student_user_id`),
  KEY `idx_consult_advisor` (`advisor_user_id`),
  KEY `idx_consult_status` (`status`),
  CONSTRAINT `fk_consult_student`
    FOREIGN KEY (`student_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_consult_advisor`
    FOREIGN KEY (`advisor_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Optional per-consultation guidelines (snapshot)
CREATE TABLE IF NOT EXISTS `consultation_guidelines` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `consultation_id` INT UNSIGNED NOT NULL,
  `guideline_text` TEXT NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_guidelines_consultation` (`consultation_id`),
  CONSTRAINT `fk_guidelines_consultation`
    FOREIGN KEY (`consultation_id`) REFERENCES `consultations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Transcriptions captured during consultations (after consultations)
CREATE TABLE IF NOT EXISTS `transcriptions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `consultation_id` INT UNSIGNED NOT NULL,
  `meeting_id` VARCHAR(255) NOT NULL,
  `advisor_user_id` INT UNSIGNED NULL,
  `student_user_id` INT UNSIGNED NULL,
  `speaker` VARCHAR(50) NULL,
  `text` TEXT NOT NULL,
  `timestamp` DATETIME NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_transcripts_consultation` (`consultation_id`),
  KEY `idx_transcripts_meeting` (`meeting_id`),
  CONSTRAINT `fk_transcriptions_consultation`
    FOREIGN KEY (`consultation_id`) REFERENCES `consultations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Notifications (system-generated user notifications)
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `type` VARCHAR(50) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `data_json` JSON NULL,
  `is_read` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notifications_user` (`user_id`),
  KEY `idx_notifications_read` (`is_read`),
  CONSTRAINT `fk_notifications_user`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Notification settings (user preferences)
CREATE TABLE IF NOT EXISTS `notification_settings` (
  `user_id` INT UNSIGNED NOT NULL,
  `email_notifications` TINYINT(1) NOT NULL DEFAULT 1,
  `consultation_reminders` TINYINT(1) NOT NULL DEFAULT 1,
  `new_request_notifications` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  CONSTRAINT `fk_notification_settings_user`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Advisor operational settings
CREATE TABLE IF NOT EXISTS `advisor_settings` (
  `advisor_user_id` INT UNSIGNED NOT NULL,
  `auto_accept_requests` TINYINT(1) NOT NULL DEFAULT 0,
  `max_daily_consultations` INT UNSIGNED NOT NULL DEFAULT 10,
  `default_consultation_duration` INT UNSIGNED NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`advisor_user_id`),
  CONSTRAINT `fk_advisor_settings_user`
    FOREIGN KEY (`advisor_user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Re-enable foreign key checks after all tables are created
SET FOREIGN_KEY_CHECKS = 1;

-- Lookup tables for departments and programs
CREATE TABLE IF NOT EXISTS `departments` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL UNIQUE,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `programs` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL UNIQUE,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE `advisor_profiles`
  ADD KEY `idx_advisor_department_id` (`department_id`);
ALTER TABLE `student_profiles`
  ADD KEY `idx_student_program_id` (`program_id`);

ALTER TABLE `advisor_profiles`
  ADD CONSTRAINT `fk_advisor_department`
    FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `student_profiles`
  ADD CONSTRAINT `fk_student_program`
    FOREIGN KEY (`program_id`) REFERENCES `programs`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;