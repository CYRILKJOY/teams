-- Add unique constraint to prevent duplicate daily reviews for the same employee on the same day
-- Using a unique index on the date expression ensures idempotency at the database level against race conditions.

CREATE UNIQUE INDEX idx_notifications_daily_review_idempotency 
ON notifications (employee_id, type, (created_at::date))
WHERE type IN ('MORNING_REVIEW', 'EVENING_REVIEW');
