-- Block 4: Multi-tenant license system migration
-- Run against TiDB Cloud

-- Add new columns to existing licenses table
ALTER TABLE licenses
  ADD COLUMN subdomain VARCHAR(100) DEFAULT NULL AFTER domain,
  ADD COLUMN maxUsers INT DEFAULT 5 NOT NULL AFTER tier,
  ADD COLUMN features JSON DEFAULT NULL AFTER maxUsers,
  ADD COLUMN logoUrl TEXT DEFAULT NULL AFTER features,
  ADD COLUMN primaryColor VARCHAR(7) DEFAULT '#0f2d5e' AFTER logoUrl;

-- Add unique index on subdomain
ALTER TABLE licenses ADD UNIQUE INDEX idx_license_subdomain (subdomain);

-- Create license_users table
CREATE TABLE IF NOT EXISTS license_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  licenseId INT NOT NULL,
  email VARCHAR(320) NOT NULL,
  passwordHash VARCHAR(255) NOT NULL,
  name VARCHAR(200) NOT NULL,
  role ENUM('owner', 'admin', 'editor', 'viewer') NOT NULL DEFAULT 'viewer',
  avatarUrl TEXT,
  isActive BOOLEAN NOT NULL DEFAULT TRUE,
  lastLoginAt TIMESTAMP NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE INDEX idx_license_user_email (licenseId, email)
);

-- Create license_settings table
CREATE TABLE IF NOT EXISTS license_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  licenseId INT NOT NULL,
  `key` VARCHAR(100) NOT NULL,
  value TEXT NOT NULL,
  type ENUM('number', 'string', 'boolean', 'json', 'text') NOT NULL DEFAULT 'string',
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE INDEX idx_license_setting_key (licenseId, `key`)
);

-- Create license_sessions table
CREATE TABLE IF NOT EXISTS license_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  licenseUserId INT NOT NULL,
  licenseId INT NOT NULL,
  tokenHash VARCHAR(64) NOT NULL,
  expiresAt TIMESTAMP NOT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
