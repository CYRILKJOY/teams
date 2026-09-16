-- Migration: 0003_reporting_indexes
-- Description: Adds indexes to optimize manager reporting and analytic queries

-- 1. Tasks: Optimize querying for overdue tasks and trends
CREATE INDEX IF NOT EXISTS idx_tasks_status_due_date ON tasks(status, due_date);

-- 2. Acknowledgements: Optimize querying for blocked/clarification tasks
CREATE INDEX IF NOT EXISTS idx_acknowledgements_response ON acknowledgements(response, created_at);

-- 3. Daily Reviews: Optimize completion rate calculations
CREATE INDEX IF NOT EXISTS idx_daily_reviews_date_type ON daily_reviews(date, type);

-- 4. Notifications: Optimize calculating acknowledgement rates
CREATE INDEX IF NOT EXISTS idx_notifications_type_delivery ON notifications(type, delivery_state);

-- Note: We assume the delivery_state column on notifications exists (as updated in phase 7).
