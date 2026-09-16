import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AcknowledgementService } from '../../src/services/acknowledgement.service.js';
import { EmployeeService } from '../../src/services/employee.service.js';
import { NotificationRepository } from '../../src/services/repositories/notification.repository.js';
import { AcknowledgementRepository } from '../../src/services/repositories/acknowledgement.repository.js';
import { TaskAssignmentRepository } from '../../src/services/repositories/task-assignment.repository.js';
import { AuditLogRepository } from '../../src/services/repositories/audit-log.repository.js';
import { Employee, Notification, TaskAssignment } from '../../src/types/database.js';

vi.mock('../../src/config/env.js', () => ({
  env: {
    PORT: '3000',
    NODE_ENV: 'test',
    JWT_SECRET: 'test-secret',
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test',
    TEAMS_INBOUND_WEBHOOK_SECRET: 'test-secret'
  }
}));

vi.mock('../../src/services/employee.service.js');
vi.mock('../../src/services/repositories/notification.repository.js');
vi.mock('../../src/services/repositories/acknowledgement.repository.js');
vi.mock('../../src/services/repositories/task-assignment.repository.js');
vi.mock('../../src/services/repositories/audit-log.repository.js');

describe('AcknowledgementService', () => {
  const mockEmployee = {
    id: 'emp1',
    org_id: 'org1',
    user_id: 'u1',
    microsoft_id: 'ms-uuid-123'
  } as Employee;

  const mockNotification = {
    id: 'notif1',
    employee_id: 'emp1',
    task_id: 'task1',
    delivery_state: 'DELIVERED'
  } as Notification;

  const mockAssignment = {
    id: 'assign1',
    employee_id: 'emp1',
    task_id: 'task1'
  } as TaskAssignment;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(EmployeeService.verifyIdentity).mockResolvedValue(mockEmployee);
    vi.mocked(NotificationRepository.getById).mockResolvedValue(mockNotification);
    vi.mocked(NotificationRepository.updateState).mockResolvedValue(mockNotification);
    vi.mocked(TaskAssignmentRepository.getAssigneesForTask).mockResolvedValue([mockAssignment]);
    vi.mocked(AcknowledgementRepository.create).mockResolvedValue({
      id: 'ack1'
    } as unknown as import('../../src/types/database.js').Acknowledgement);
  });

  it('should successfully process a valid acknowledgement', async () => {
    await AcknowledgementService.submitAcknowledgement('ms-uuid-123', 'notif1', 'WILL_COMPLETE');

    expect(AcknowledgementRepository.create).toHaveBeenCalledWith(
      'assign1',
      'emp1',
      'SEEN_WILL_COMPLETE'
    );
    expect(NotificationRepository.updateState).toHaveBeenCalledWith('notif1', 'ACKNOWLEDGED');
    expect(AuditLogRepository.log).toHaveBeenCalledWith(
      'org1',
      'u1',
      'SUBMIT_ACKNOWLEDGEMENT',
      'ACKNOWLEDGEMENT',
      'ack1',
      expect.objectContaining({ response: 'SEEN_WILL_COMPLETE' })
    );
  });

  it('should reject if notification is not found', async () => {
    vi.mocked(NotificationRepository.getById).mockResolvedValue(null);
    await expect(
      AcknowledgementService.submitAcknowledgement('ms-uuid-123', 'notif1', 'WILL_COMPLETE')
    ).rejects.toThrow('Notification not found');
  });

  it('should reject if notification belongs to a different employee (cross-user spoofing)', async () => {
    vi.mocked(NotificationRepository.getById).mockResolvedValue({
      ...mockNotification,
      employee_id: 'hacker_emp'
    });
    await expect(
      AcknowledgementService.submitAcknowledgement('ms-uuid-123', 'notif1', 'WILL_COMPLETE')
    ).rejects.toThrow('Unauthorized acknowledgement');
  });

  it('should reject if notification is EXPIRED', async () => {
    vi.mocked(NotificationRepository.getById).mockResolvedValue({
      ...mockNotification,
      delivery_state: 'EXPIRED'
    });
    await expect(
      AcknowledgementService.submitAcknowledgement('ms-uuid-123', 'notif1', 'WILL_COMPLETE')
    ).rejects.toThrow('Notification expired');
  });

  it('should reject if notification is already ACKNOWLEDGED', async () => {
    vi.mocked(NotificationRepository.getById).mockResolvedValue({
      ...mockNotification,
      delivery_state: 'ACKNOWLEDGED'
    });
    await expect(
      AcknowledgementService.submitAcknowledgement('ms-uuid-123', 'notif1', 'WILL_COMPLETE')
    ).rejects.toThrow('Already acknowledged');
  });

  it('should reject if employee is no longer assigned to the task', async () => {
    vi.mocked(TaskAssignmentRepository.getAssigneesForTask).mockResolvedValue([]);
    await expect(
      AcknowledgementService.submitAcknowledgement('ms-uuid-123', 'notif1', 'WILL_COMPLETE')
    ).rejects.toThrow('Employee not assigned to task');
  });

  it('should map NEEDS_CLARIFICATION correctly', async () => {
    await AcknowledgementService.submitAcknowledgement(
      'ms-uuid-123',
      'notif1',
      'NEEDS_CLARIFICATION'
    );
    expect(AcknowledgementRepository.create).toHaveBeenCalledWith(
      'assign1',
      'emp1',
      'SEEN_NEED_CLARIFICATION'
    );
  });

  it('should map CANNOT_COMPLETE correctly', async () => {
    await AcknowledgementService.submitAcknowledgement('ms-uuid-123', 'notif1', 'CANNOT_COMPLETE');
    expect(AcknowledgementRepository.create).toHaveBeenCalledWith(
      'assign1',
      'emp1',
      'CANNOT_COMPLETE'
    );
  });

  it('should reject invalid response string', async () => {
    await expect(
      AcknowledgementService.submitAcknowledgement('ms-uuid-123', 'notif1', 'INVALID_RESPONSE')
    ).rejects.toThrow('Invalid response');
  });
});
