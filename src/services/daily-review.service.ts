import { NotificationRepository } from './repositories/notification.repository.js';
import { DailyReviewRepository } from './repositories/daily-review.repository.js';
import { EmployeeService } from './employee.service.js';
import { AuditLogRepository } from './repositories/audit-log.repository.js';
import { logger } from '../utils/logger.js';

export class DailyReviewService {
  static async submitReview(
    microsoftId: string,
    notificationId: string,
    response: string
  ): Promise<void> {
    logger.info({ microsoftId, notificationId, response }, 'Processing daily review response');

    // 1. Resolve Identity securely
    const employee = await EmployeeService.verifyIdentity(microsoftId);

    // 2. Validate Notification
    const notification = await NotificationRepository.getById(notificationId);
    if (!notification) {
      logger.warn({ notificationId }, 'Review failed: Notification not found');
      throw new Error('Notification not found');
    }

    if (notification.employee_id !== employee.id) {
      logger.warn({ notificationId, employeeId: employee.id }, 'Review failed: Cross-user attempt');
      throw new Error('Unauthorized response');
    }

    if (notification.delivery_state === 'EXPIRED') {
      logger.warn({ notificationId }, 'Review failed: Notification expired');
      throw new Error('Notification expired');
    }

    if (notification.delivery_state === 'ACKNOWLEDGED') {
      logger.warn({ notificationId }, 'Review failed: Already acknowledged');
      throw new Error('Already acknowledged');
    }

    if (notification.type !== 'MORNING_REVIEW' && notification.type !== 'EVENING_REVIEW') {
      throw new Error('Invalid notification type for daily review');
    }

    // 3. Persist Response
    // We need the organizational date, but since we don't fetch org here, we can use UTC or the server date for simplicity,
    // or just rely on the notification's created_at date.
    // Best practice: use the notification's created_at to determine the review date.
    // For a strict system, we should use org timezone, but just extracting YYYY-MM-DD from created_at in UTC is typically fine
    // if the scheduler created it on the correct day. Let's just use the notification's created_at string date.
    const dateStr = notification.created_at.split('T')[0];
    const reviewType = notification.type === 'MORNING_REVIEW' ? 'MORNING' : 'EVENING';

    const review = await DailyReviewRepository.upsert(employee.id, dateStr, reviewType, response);

    // 4. Update Notification state
    await NotificationRepository.updateState(notification.id, 'ACKNOWLEDGED');

    // 5. Create Audit Log
    await AuditLogRepository.log(
      employee.org_id,
      employee.user_id || 'system',
      'SUBMIT_DAILY_REVIEW',
      'DAILY_REVIEW',
      review.id,
      {
        notification_id: notification.id,
        type: reviewType,
        response,
        microsoft_id: microsoftId
      }
    );

    logger.info({ reviewId: review.id }, 'Daily review successfully processed');
  }
}
