-- Seed Data for Local Development

-- Ensure uuid-ossp is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Clear existing data (in reverse dependency order)
DELETE FROM integration_events;
DELETE FROM audit_logs;
DELETE FROM daily_reviews;
DELETE FROM notifications;
DELETE FROM acknowledgements;
DELETE FROM task_assignments;
DELETE FROM tasks;
DELETE FROM clickup_webhooks;
DELETE FROM clickup_workspaces;
DELETE FROM employees;
DELETE FROM users;
DELETE FROM organizations;

-- 1. Create Organization
INSERT INTO organizations (id, name) 
VALUES ('11111111-1111-1111-1111-111111111111', 'Acme Corp');

-- 2. Create Users
INSERT INTO users (id, org_id, email, role) 
VALUES 
('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'admin@acme.com', 'ADMIN'),
('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'manager@acme.com', 'MANAGER'),
('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'employee@acme.com', 'EMPLOYEE');

-- 3. Create Employees (mapped to users)
INSERT INTO employees (id, org_id, user_id, display_name, email, microsoft_id, clickup_id) 
VALUES 
('55555555-5555-5555-5555-555555555551', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'Admin Alice', 'admin@acme.com', 'ms-admin', 'cu-admin'),
('55555555-5555-5555-5555-555555555552', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'Manager Bob', 'manager@acme.com', 'ms-manager', 'cu-manager'),
('55555555-5555-5555-5555-555555555553', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'Employee Charlie', 'employee@acme.com', 'ms-employee', 'cu-employee');

-- 4. Create ClickUp Workspace
INSERT INTO clickup_workspaces (id, org_id, clickup_workspace_id, name, access_token) 
VALUES ('66666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', 'cu-workspace-1', 'Acme Engineering', 'fake-access-token');

-- 5. Create Tasks
INSERT INTO tasks (id, workspace_id, clickup_task_id, name, description, status, priority, raw_data) 
VALUES 
('77777777-7777-7777-7777-777777777771', '66666666-6666-6666-6666-666666666666', 'task-1', 'Setup Database', 'Install and configure PostgreSQL', 'in progress', 'high', '{"foo":"bar"}'),
('77777777-7777-7777-7777-777777777772', '66666666-6666-6666-6666-666666666666', 'task-2', 'Write Tests', 'Write unit tests for repositories', 'to do', 'normal', '{"foo":"bar"}');

-- 6. Assign Tasks
INSERT INTO task_assignments (id, task_id, employee_id) 
VALUES 
('88888888-8888-8888-8888-888888888881', '77777777-7777-7777-7777-777777777771', '55555555-5555-5555-5555-555555555553'),
('88888888-8888-8888-8888-888888888882', '77777777-7777-7777-7777-777777777772', '55555555-5555-5555-5555-555555555553');
