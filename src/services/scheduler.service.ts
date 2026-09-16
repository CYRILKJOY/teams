import { OrganizationRepository } from './repositories/organization.repository.js';
import { NotificationRepository } from './repositories/notification.repository.js';
import { EmployeeRepository } from './repositories/employee.repository.js';
import { TaskRepository } from './repositories/task.repository.js';
import { NotificationService } from './notification.service.js';
import { logger } from '../utils/logger.js';
import { toZonedTime, format } from 'date-fns-tz';
import { parse, isAfter, isEqual, startOfDay, isBefore, isSameDay } from 'date-fns';
import { TaskSummaryCounts } from './teams/cards/index.js';
import { Task, Organization } from '../types/database.js';

export class SchedulerService {
  private static interval: NodeJS.Timeout | null = null;
  private static isRunning = false;

  static start() {
    if (this.interval) return;
    logger.info('Starting SchedulerService');
    // Check every minute
    this.interval = setInterval(() => this.tick(), 60 * 1000);
    // Run immediately on start
    this.tick();
  }

  static stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  static async tick() {
    if (this.isRunning) return;
    this.isRunning = true;
    try {
      // 1. Process Reviews
      const orgs = await OrganizationRepository.findAll();
      for (const org of orgs) {
        await this.processOrganization(org);
      }

      // 2. Retry failed notifications
      await NotificationService.retryFailedNotifications();

      // 3. Expire old notifications (hourly tick essentially, but safe to call often since it uses timestamps)
      await NotificationService.expireOldNotifications();
    } catch (error: unknown) {
      logger.error({ error: (error as Error).message }, 'Scheduler run failed');
    } finally {
      this.isRunning = false;
    }
  }

  private static async processOrganization(org: Organization) {
    if (!org.timezone) return;

    const now = new Date();
    const zonedNow = toZonedTime(now, org.timezone);
    const todayStr = format(zonedNow, 'yyyy-MM-dd', { timeZone: org.timezone });

    if (org.morning_notification_enabled && org.morning_notification_time) {
      const scheduledTime = parse(org.morning_notification_time, 'HH:mm:ss', zonedNow);
      if (isAfter(zonedNow, scheduledTime) || isEqual(zonedNow, scheduledTime)) {
        await this.triggerReview(org.id, org.timezone, todayStr, 'MORNING_REVIEW');
      }
    }

    if (org.evening_notification_enabled && org.evening_notification_time) {
      const scheduledTime = parse(org.evening_notification_time, 'HH:mm:ss', zonedNow);
      if (isAfter(zonedNow, scheduledTime) || isEqual(zonedNow, scheduledTime)) {
        await this.triggerReview(org.id, org.timezone, todayStr, 'EVENING_REVIEW');
      }
    }
  }

  private static async triggerReview(
    orgId: string,
    timezone: string,
    dateStr: string,
    type: 'MORNING_REVIEW' | 'EVENING_REVIEW'
  ) {
    const employees = await EmployeeRepository.findByOrgId(orgId);

    for (const employee of employees) {
      if (!employee.microsoft_id) continue;

      // 1. Check idempotency: did we already send this review type today to this employee?
      // Since notifications table uses created_at, we can check if there's a matching notification for today
      const alreadySent = await NotificationRepository.hasNotificationForDate(
        employee.id,
        type,
        dateStr,
        timezone
      );

      if (alreadySent) continue;

      // 2. Gather tasks and calculate summary
      const tasks = await TaskRepository.getTasksForEmployee(employee.id);
      const summary = this.calculateSummary(tasks, timezone);

      // 3. Dispatch notification
      try {
        await NotificationService.notifyDailyReview(employee, type, tasks, summary);
        logger.info({ orgId, employeeId: employee.id, type }, 'Scheduled review dispatched');
      } catch (error: unknown) {
        logger.error(
          { employeeId: employee.id, error: (error as Error).message },
          'Failed to dispatch scheduled review'
        );
      }
    }
  }

  static calculateSummary(tasks: Task[], timezone: string): TaskSummaryCounts {
    let overdue = 0;
    let dueToday = 0;
    let upcoming = 0;
    let completedToday = 0;
    let incomplete = 0;

    const now = new Date();
    const zonedNow = toZonedTime(now, timezone);
    const todayStart = startOfDay(zonedNow);

    for (const task of tasks) {
      // Exclude generic 'closed' statuses from incomplete
      const isCompleted =
        task.status.toLowerCase() === 'closed' || task.status.toLowerCase() === 'complete';

      if (!isCompleted) {
        incomplete++;
        if (task.due_date) {
          // Parse due_date (assuming ms timestamp or ISO string from ClickUp)
          const dueDate = new Date(Number(task.due_date));
          const zonedDueDate = toZonedTime(dueDate, timezone);
          const dueStart = startOfDay(zonedDueDate);

          if (isBefore(dueStart, todayStart)) {
            overdue++;
          } else if (isSameDay(dueStart, todayStart)) {
            dueToday++;
          } else {
            upcoming++;
          }
        } else {
          upcoming++;
        }
      } else {
        // If it's completed, check if it was completed today
        const updatedDate = new Date(task.updated_at);
        const zonedUpdated = toZonedTime(updatedDate, timezone);
        if (isSameDay(zonedUpdated, zonedNow)) {
          completedToday++;
        }
      }
    }

    return { overdue, dueToday, upcoming, completedToday, incomplete };
  }
}
