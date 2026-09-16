import crypto from 'crypto';
import { NotificationRepository } from './repositories/notification.repository.js';
import { NotificationDeliveryRepository } from './repositories/notification-delivery.repository.js';
import { TeamsClient } from './teams/client.js';
import {
  generateTaskAssignedCard,
  generateTaskUpdatedCard,
  generateDailyReviewCard
} from './teams/cards/index.js';
import { Task, Employee, Notification } from '../types/database.js';
import { logger } from '../utils/logger.js';

export class NotificationService {
  /**
   * Orchestrates the creation and delivery of a notification.
   */
  private static async dispatchNotification(
    employee: Employee,
    type: Notification['type'],
    cardGenerator: (notificationId: string) => Record<string, unknown>,
    taskId?: string
  ) {
    if (!employee.microsoft_id) {
      logger.warn(
        { employeeId: employee.id },
        'Employee lacks microsoft_id; skipping notification delivery'
      );
      return;
    }

    const correlationId = crypto.randomUUID();

    // 1. Create PENDING notification record
    const notification = await NotificationRepository.createNotification({
      employee_id: employee.id,
      task_id: taskId || null,
      type,
      delivery_state: 'PENDING',
      provider_message_id: null,
      correlation_id: correlationId
    });

    const cardPayload = cardGenerator(notification.id);

    // 2. Dispatch to Teams via Client
    const result = await TeamsClient.sendNotification(employee.microsoft_id, cardPayload);

    // 3. Log delivery attempt
    await NotificationDeliveryRepository.logAttempt({
      notification_id: notification.id,
      status: result.success ? 'DELIVERED' : 'FAILED',
      error_message: result.error || null,
      provider_tracking_id: result.messageId || null
    });

    // 4. Update parent notification state
    const newState = result.success ? 'SENT' : 'FAILED';
    await NotificationRepository.updateState(notification.id, newState);

    logger.info({ notificationId: notification.id, newState }, 'Notification dispatched');
  }

  static async notifyTaskAssigned(employee: Employee, task: Task) {
    await this.dispatchNotification(
      employee,
      'TASK_ASSIGNED',
      (id) => generateTaskAssignedCard(task, id),
      task.id
    );
  }

  static async notifyTaskUpdated(employee: Employee, task: Task) {
    await this.dispatchNotification(
      employee,
      'TASK_UPDATED',
      (id) => generateTaskUpdatedCard(task, id),
      task.id
    );
  }

  static async notifyDailyReview(
    employee: Employee,
    type: 'MORNING_REVIEW' | 'EVENING_REVIEW',
    tasks: Task[],
    summary: import('./teams/cards/index.js').TaskSummaryCounts
  ) {
    try {
      await this.dispatchNotification(employee, type, (id) =>
        generateDailyReviewCard(
          type === 'MORNING_REVIEW' ? 'MORNING' : 'EVENING',
          tasks,
          summary,
          id
        )
      );
    } catch (err: unknown) {
      if (
        err instanceof Error &&
        err.message.includes('duplicate key value violates unique constraint')
      ) {
        logger.info(
          { employeeId: employee.id, type },
          'Skipped duplicate scheduled review creation due to idempotency constraint'
        );
        return;
      }
      throw err;
    }
  }

  /**
   * Background task to retry FAILED notifications.
   * Only retries up to a maximum number of attempts.
   */
  static async retryFailedNotifications() {
    logger.info('Starting retryFailedNotifications job');
    // Fetch notifications that are FAILED.
    // In a full implementation, we'd add an `attempts` column or join with deliveries.
    // We'll rely on the repository to provide failed notifications with less than 3 deliveries.
    const failedNotifications = await NotificationRepository.getFailedForRetry(3);

    for (const notification of failedNotifications) {
      logger.info({ notificationId: notification.id }, 'Retrying failed notification');
      try {
        const employee = await (
          await import('./repositories/employee.repository.js')
        ).EmployeeRepository.findById(notification.employee_id);
        if (!employee || !employee.microsoft_id) continue;

        let cardPayload;
        if (notification.type === 'TASK_ASSIGNED' || notification.type === 'TASK_UPDATED') {
          const task = await (
            await import('./repositories/task.repository.js')
          ).TaskRepository.findById(notification.task_id!);
          if (!task) continue;
          cardPayload =
            notification.type === 'TASK_ASSIGNED'
              ? generateTaskAssignedCard(task, notification.id)
              : generateTaskUpdatedCard(task, notification.id);
        } else {
          // For reviews, it's complex to reconstruct the state as it was.
          // For simplicity, we just mark it EXPIRED if we can't easily reconstruct the exact same payload, or we reconstruct it based on current state.
          // Since reviews are time-sensitive, we'll let them expire rather than send a stale review.
          await NotificationRepository.updateState(notification.id, 'EXPIRED');
          continue;
        }

        const result = await TeamsClient.sendNotification(employee.microsoft_id, cardPayload);

        await NotificationDeliveryRepository.logAttempt({
          notification_id: notification.id,
          status: result.success ? 'DELIVERED' : 'FAILED',
          error_message: result.error || null,
          provider_tracking_id: result.messageId || null
        });

        const newState = result.success ? 'SENT' : 'FAILED';
        await NotificationRepository.updateState(notification.id, newState);
      } catch (err) {
        logger.error(
          { notificationId: notification.id, error: (err as Error).message },
          'Failed during retry'
        );
      }
    }
  }

  /**
   * Background task to expire old PENDING, SENT, or FAILED notifications.
   */
  static async expireOldNotifications() {
    logger.info('Starting expireOldNotifications job');
    const expiredCount = await NotificationRepository.expireOlderThan(24);
    if (expiredCount > 0) {
      logger.info({ expiredCount }, 'Expired stale notifications');
    }
  }
}
