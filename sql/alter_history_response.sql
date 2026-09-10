-- Existing installs: add response text to integration history
ALTER TABLE `integrations_history`
    ADD COLUMN `response` TEXT NULL AFTER `prompt`;
