-- Enable Row Level Security (RLS) on all tables

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE clickup_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE clickup_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE acknowledgements ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_events ENABLE ROW LEVEL SECURITY;

-- Note: The TaskFlow Node.js backend interacts with the database using the 
-- SUPABASE_SERVICE_ROLE_KEY, which inherently bypasses RLS for administrative tasks.
-- However, we define strict policies here to ensure that if anonymous or authenticated 
-- client keys are ever accidentally exposed or deliberately used in the future, 
-- they cannot access unauthorized data.

-- Drop existing policies if any (for idempotency in local dev)
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON ' || quote_ident(r.tablename);
    END LOOP;
END $$;

-- Policy: Deny all access to anonymous users
CREATE POLICY "Deny anonymous access to organizations" ON organizations AS RESTRICTIVE FOR ALL TO anon USING (false);
CREATE POLICY "Deny anonymous access to users" ON users AS RESTRICTIVE FOR ALL TO anon USING (false);
CREATE POLICY "Deny anonymous access to employees" ON employees AS RESTRICTIVE FOR ALL TO anon USING (false);
CREATE POLICY "Deny anonymous access to workspaces" ON clickup_workspaces AS RESTRICTIVE FOR ALL TO anon USING (false);
CREATE POLICY "Deny anonymous access to webhooks" ON clickup_webhooks AS RESTRICTIVE FOR ALL TO anon USING (false);
CREATE POLICY "Deny anonymous access to tasks" ON tasks AS RESTRICTIVE FOR ALL TO anon USING (false);
CREATE POLICY "Deny anonymous access to assignments" ON task_assignments AS RESTRICTIVE FOR ALL TO anon USING (false);
CREATE POLICY "Deny anonymous access to acknowledgements" ON acknowledgements AS RESTRICTIVE FOR ALL TO anon USING (false);
CREATE POLICY "Deny anonymous access to notifications" ON notifications AS RESTRICTIVE FOR ALL TO anon USING (false);
CREATE POLICY "Deny anonymous access to reviews" ON daily_reviews AS RESTRICTIVE FOR ALL TO anon USING (false);
CREATE POLICY "Deny anonymous access to audit logs" ON audit_logs AS RESTRICTIVE FOR ALL TO anon USING (false);
CREATE POLICY "Deny anonymous access to events" ON integration_events AS RESTRICTIVE FOR ALL TO anon USING (false);

-- Assuming future direct client access using auth.uid(), we would define policies like:
-- CREATE POLICY "Employees can read their own assignments" 
-- ON task_assignments FOR SELECT TO authenticated
-- USING (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));

-- Since the Node API is the sole intermediary for now, we rely on the service_role bypassing RLS,
-- but the tables are secured against unauthorized direct PostgREST access.
