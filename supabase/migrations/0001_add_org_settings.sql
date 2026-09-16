-- Phase 8: Organization Settings for Scheduled Notifications

ALTER TABLE organizations
ADD COLUMN morning_notification_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN morning_notification_time TIME DEFAULT '09:00:00',
ADD COLUMN evening_notification_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN evening_notification_time TIME DEFAULT '17:00:00',
ADD COLUMN timezone TEXT DEFAULT 'Asia/Kolkata';

-- Create an index to quickly find organizations for the scheduler
CREATE INDEX idx_organizations_notifications 
ON organizations(morning_notification_enabled, evening_notification_enabled);
