import { NotificationRepository } from './repositories/notification.repository.js';
import { AcknowledgementRepository } from './repositories/acknowledgement.repository.js';
import { AuditLogRepository } from './repositories/audit-log.repository.js';
import { TaskAssignmentRepository } from './repositories/task-assignment.repository.js';
import { EmployeeService } from './employee.service.js';
import { logger } from '../utils/logger.js';
import { AcknowledgementResponse } from '../types/database.js';

export class AcknowledgementService {
  /**
   * Processes an incoming acknowledgement from Microsoft Teams.
   * Performs rigorous validation:
   * 1. Resolves employee from the trusted microsoft_id.
   * 2. Validates notification exists and belongs to the employee.
   * 3. Validates notification is not EXPIRED or already acknowledged (though we don't have a direct status for "ACKNOWLEDGED", we check if an acknowledgement record already exists).
   * 4. Validates the employee is actually assigned to the task.
   */
  static async submitAcknowledgement(
    microsoftId: string,
    notificationId: string,
    response: string
  ): Promise<void> {
    logger.info({ microsoftId, notificationId, response }, 'Processing task acknowledgement');

    // 1. Resolve Identity securely
    // This throws a 401 if the microsoft_id is not mapped.
    const employee = await EmployeeService.verifyIdentity(microsoftId);

    // 2. Validate Notification
    const notification = await NotificationRepository.getById(notificationId);
    if (!notification) {
      logger.warn({ notificationId }, 'Acknowledgement failed: Notification not found');
      throw new Error('Notification not found');
    }

    if (notification.employee_id !== employee.id) {
      logger.warn(
        { notificationId, employeeId: employee.id },
        'Acknowledgement failed: Cross-user acknowledgement attempt'
      );
      throw new Error('Unauthorized acknowledgement');
    }

    if (notification.delivery_state === 'EXPIRED') {
      logger.warn({ notificationId }, 'Acknowledgement failed: Notification expired');
      throw new Error('Notification expired');
    }

    if (notification.delivery_state === 'ACKNOWLEDGED') {
      logger.warn({ notificationId }, 'Acknowledgement failed: Already acknowledged');
      throw new Error('Already acknowledged');
    }

    if (!notification.task_id) {
      logger.warn(
        { notificationId },
        'Acknowledgement failed: Notification has no associated task'
      );
      throw new Error('Notification is not associated with a task');
    }

    // 4. Validate Task Assignment
    // Check if the employee is currently assigned to the task
    const assignments = await TaskAssignmentRepository.getAssigneesForTask(notification.task_id);
    const assignment = assignments.find(
      (a: import('../types/database.js').TaskAssignment) => a.employee_id === employee.id
    );
    if (!assignment) {
      logger.warn(
        { taskId: notification.task_id, employeeId: employee.id },
        'Acknowledgement failed: Employee not assigned to task'
      );
      throw new Error('Employee not assigned to task');
    }

    // 5. Map response payload to Enum
    let mappedResponse: AcknowledgementResponse;
    switch (response) {
      case 'WILL_COMPLETE':
        mappedResponse = 'SEEN_WILL_COMPLETE';
        break;
      case 'NEEDS_CLARIFICATION':
        mappedResponse = 'SEEN_NEED_CLARIFICATION';
        break;
      case 'CANNOT_COMPLETE':
        mappedResponse = 'CANNOT_COMPLETE';
        break;
      default:
        throw new Error(`Invalid response: ${response}`);
    }

    // 6. Persist Acknowledgement
    const acknowledgement = await AcknowledgementRepository.create(
      assignment.id,
      employee.id,
      mappedResponse
    );

    // We also need to link the acknowledgement to the notification.
    // Our schema doesn't have `notification_id` in the `acknowledgements` table currently.
    // We will store it in the Audit log.

    // 7. Update Notification state
    await NotificationRepository.updateState(notification.id, 'ACKNOWLEDGED');

    // 8. Create Audit Log
    await AuditLogRepository.log(
      employee.org_id,
      employee.user_id || 'system',
      'SUBMIT_ACKNOWLEDGEMENT',
      'ACKNOWLEDGEMENT',
      acknowledgement.id,
      {
        notification_id: notification.id,
        task_id: notification.task_id,
        response: mappedResponse,
        microsoft_id: microsoftId
      }
    );

    logger.info(
      { acknowledgementId: acknowledgement.id },
      'Acknowledgement successfully processed'
    );
  }
}
