CREATE DATABASE IF NOT EXISTS `ai_hub`
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE `ai_hub`;

CREATE TABLE IF NOT EXISTS `alive` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `users` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(30) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `firstname` VARCHAR(50) NOT NULL,
    `lastname` VARCHAR(50) NOT NULL,
    `created_at` BIGINT NOT NULL,
    `updated_at` BIGINT NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_users_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `integrations` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `payload_sample` JSON NOT NULL,
    `result_path` VARCHAR(255) NULL,
    `usage_headers` JSON NULL,
    `created_at` BIGINT NOT NULL,
    `updated_at` BIGINT NOT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `integrations`
    ADD COLUMN IF NOT EXISTS `result_path` VARCHAR(255) NULL AFTER `payload_sample`,
    ADD COLUMN IF NOT EXISTS `usage_headers` JSON NULL AFTER `result_path`;

CREATE TABLE IF NOT EXISTS `integrations_api_keys` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `integration_id` INT UNSIGNED NOT NULL,
    `key` TEXT NOT NULL,
    `usage` INT UNSIGNED NOT NULL DEFAULT 0,
    `limit` INT UNSIGNED NOT NULL,
    `resets_at` BIGINT NULL,
    `note` VARCHAR(255) NOT NULL DEFAULT '',
    `created_at` BIGINT NOT NULL,
    `updated_at` BIGINT NOT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_integrations_api_keys_integration_id` (`integration_id`),
    CONSTRAINT `fk_integrations_api_keys_integration`
        FOREIGN KEY (`integration_id`) REFERENCES `integrations` (`id`)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `integrations_history` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `integration_id` INT UNSIGNED NOT NULL,
    `api_key_id` INT UNSIGNED NOT NULL,
    `prompt` TEXT NOT NULL,
    `response` TEXT NULL,
    `success` TINYINT(1) NOT NULL,
    `status_code` INT NULL,
    `error` TEXT NULL,
    `created_at` BIGINT NOT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_integrations_history_integration_id` (`integration_id`),
    KEY `idx_integrations_history_api_key_id` (`api_key_id`),
    CONSTRAINT `fk_integrations_history_integration`
        FOREIGN KEY (`integration_id`) REFERENCES `integrations` (`id`)
        ON DELETE CASCADE,
    CONSTRAINT `fk_integrations_history_api_key`
        FOREIGN KEY (`api_key_id`) REFERENCES `integrations_api_keys` (`id`)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
