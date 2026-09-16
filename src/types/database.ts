export type UserRole = 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
export type AcknowledgementResponse =
  'SEEN_WILL_COMPLETE' | 'SEEN_NEED_CLARIFICATION' | 'CANNOT_COMPLETE';
export type NotificationType = 'TASK_ASSIGNED' | 'MORNING_REVIEW' | 'EVENING_REVIEW';
export type NotificationStatus =
  'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'EXPIRED' | 'ACKNOWLEDGED';
export type ReviewType = 'MORNING' | 'EVENING';

export interface User {
  id: string;
  org_id: string;
  email: string;
  password_hash: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  morning_notification_enabled: boolean;
  morning_notification_time: string;
  evening_notification_enabled: boolean;
  evening_notification_time: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: string;
  org_id: string;
  user_id: string | null;
  display_name: string;
  email: string;
  microsoft_id: string | null;
  clickup_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  workspace_id: string;
  clickup_task_id: string;
  name: string;
  description: string | null;
  status: string;
  priority: string | null;
  due_date: string | null;
  raw_data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface TaskAssignment {
  id: string;
  task_id: string;
  employee_id: string;
  created_at: string;
}

export interface Acknowledgement {
  id: string;
  task_assignment_id: string;
  employee_id: string;
  response: AcknowledgementResponse;
  created_at: string;
}

export interface DailyReview {
  id: string;
  employee_id: string;
  date: string;
  type: ReviewType;
  response: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  org_id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  changes: Record<string, unknown> | null;
  created_at: string;
}

export interface IntegrationEvent {
  id: string;
  source: string;
  event_type: string;
  idempotency_key: string;
  payload: Record<string, unknown>;
  processed_at: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  employee_id: string;
  task_id: string | null;
  type: NotificationType | 'TASK_UPDATED';
  delivery_state: NotificationStatus | 'EXPIRED';
  provider_message_id: string | null;
  correlation_id: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationDelivery {
  id: string;
  notification_id: string;
  status: NotificationStatus;
  error_message: string | null;
  provider_tracking_id: string | null;
  attempted_at: string;
}
