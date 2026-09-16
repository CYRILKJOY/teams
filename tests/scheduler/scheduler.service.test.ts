import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SchedulerService } from '../../src/services/scheduler.service.js';
import { OrganizationRepository } from '../../src/services/repositories/organization.repository.js';
import { EmployeeRepository } from '../../src/services/repositories/employee.repository.js';
import { TaskRepository } from '../../src/services/repositories/task.repository.js';
import { NotificationRepository } from '../../src/services/repositories/notification.repository.js';
import { NotificationService } from '../../src/services/notification.service.js';
import { Organization, Employee, Task } from '../../src/types/database.js';

vi.mock('../../src/services/repositories/organization.repository.js');
vi.mock('../../src/services/repositories/employee.repository.js');
vi.mock('../../src/services/repositories/task.repository.js');
vi.mock('../../src/services/repositories/notification.repository.js');
vi.mock('../../src/services/notification.service.js');
vi.mock('../../src/config/env.js', () => ({
  env: {
    NODE_ENV: 'test',
    SUPABASE_URL: 'http://localhost:54321',
    SUPABASE_SERVICE_ROLE_KEY: 'test-key',
    PORT: 3000
  }
}));

describe('SchedulerService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should trigger morning review when time is exactly at morning schedule', async () => {
    vi.setSystemTime(new Date('2026-09-16T09:00:00.000+05:30')); // 09:00 IST

    vi.mocked(OrganizationRepository.findAll).mockResolvedValue([
      {
        id: 'org1',
        timezone: 'Asia/Kolkata',
        morning_notification_enabled: true,
        morning_notification_time: '09:00:00',
        evening_notification_enabled: false,
        evening_notification_time: '17:00:00'
      } as Organization
    ]);

    vi.mocked(EmployeeRepository.findByOrgId).mockResolvedValue([
      {
        id: 'emp1',
        org_id: 'org1',
        microsoft_id: 'ms-1'
      } as Employee
    ]);

    vi.mocked(NotificationRepository.hasNotificationForDate).mockResolvedValue(false);
    vi.mocked(TaskRepository.getTasksForEmployee).mockResolvedValue([]);

    await SchedulerService.tick();

    expect(NotificationService.notifyDailyReview).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'emp1' }),
      'MORNING_REVIEW',
      [],
      expect.any(Object)
    );
  });

  it('should not trigger if already sent today', async () => {
    vi.setSystemTime(new Date('2026-09-16T09:15:00.000+05:30')); // 09:15 IST

    vi.mocked(OrganizationRepository.findAll).mockResolvedValue([
      {
        id: 'org1',
        timezone: 'Asia/Kolkata',
        morning_notification_enabled: true,
        morning_notification_time: '09:00:00',
        evening_notification_enabled: false,
        evening_notification_time: '17:00:00'
      } as Organization
    ]);

    vi.mocked(EmployeeRepository.findByOrgId).mockResolvedValue([
      {
        id: 'emp1',
        org_id: 'org1',
        microsoft_id: 'ms-1'
      } as Employee
    ]);

    vi.mocked(NotificationRepository.hasNotificationForDate).mockResolvedValue(true);

    await SchedulerService.tick();

    expect(NotificationService.notifyDailyReview).not.toHaveBeenCalled();
  });

  it('calculateSummary should correctly calculate task counts', () => {
    // 05:30Z is 11:00 IST
    vi.setSystemTime(new Date('2026-09-16T05:30:00.000Z'));

    const tasks: Partial<Task>[] = [
      {
        status: 'Open',
        due_date: new Date('2026-09-15T00:00:00Z').getTime().toString(),
        updated_at: '2026-09-15T00:00:00Z'
      }, // Overdue
      {
        status: 'In Progress',
        due_date: new Date('2026-09-16T00:00:00Z').getTime().toString(),
        updated_at: '2026-09-16T00:00:00Z'
      }, // Due Today
      {
        status: 'Open',
        due_date: new Date('2026-09-20T00:00:00Z').getTime().toString(),
        updated_at: '2026-09-16T00:00:00Z'
      }, // Upcoming
      { status: 'Closed', updated_at: '2026-09-16T02:00:00.000Z', due_date: null }, // Completed Today (in IST, this is 07:30 16th)
      { status: 'Complete', updated_at: '2026-09-10T00:00:00.000Z', due_date: null } // Completed Past
    ];

    const summary = SchedulerService.calculateSummary(tasks as Task[], 'Asia/Kolkata');

    expect(summary.overdue).toBe(1);
    expect(summary.dueToday).toBe(1);
    expect(summary.upcoming).toBe(1);
    expect(summary.completedToday).toBe(1);
    expect(summary.incomplete).toBe(3);
  });
});
