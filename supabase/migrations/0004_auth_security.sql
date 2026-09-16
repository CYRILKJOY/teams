-- Add password hashing column for security audit
ALTER TABLE users ADD COLUMN password_hash VARCHAR(255);

-- Pre-populate default password hashes for all existing users (only for development context)
-- Using bcrypt hash for 'password123': $2b$10$EP0366Jt0k1o60t/HlY7cOMhL2oJmJ.W4L1l1gKq0uO9r5oH/4rFW
UPDATE users SET password_hash = '$2b$10$EP0366Jt0k1o60t/HlY7cOMhL2oJmJ.W4L1l1gKq0uO9r5oH/4rFW';

-- Make it NOT NULL for future inserts to prevent bypassing
ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;
