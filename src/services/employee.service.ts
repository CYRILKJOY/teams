import { EmployeeRepository } from './repositories/employee.repository.js';
import { AuditLogRepository } from './repositories/audit-log.repository.js';
import { Employee } from '../types/database.js';
import { logger } from '../utils/logger.js';

export class EmployeeService {
  /**
   * Securely maps ClickUp and/or Microsoft identities to an employee record.
   * This operation generates a strict audit log entry.
   */
  static async mapIdentity(
    employeeId: string,
    microsoftId: string | null,
    clickupId: string | null,
    actorId: string // The ID of the admin/manager performing this action
  ): Promise<Employee> {
    const existingEmployee = await EmployeeRepository.findById(employeeId);
    if (!existingEmployee) {
      throw new Error('Employee not found');
    }

    const previousState = {
      microsoft_id: existingEmployee.microsoft_id,
      clickup_id: existingEmployee.clickup_id
    };

    const updatedEmployee = await EmployeeRepository.updateMapping(
      employeeId,
      microsoftId,
      clickupId
    );

    await AuditLogRepository.log(
      existingEmployee.org_id,
      'UPDATE_IDENTITY_MAPPING',
      'employee',
      employeeId,
      actorId,
      { before: previousState, after: { microsoft_id: microsoftId, clickup_id: clickupId } }
    );

    logger.info(
      { employeeId, actorId, microsoftId, clickupId },
      'Employee identity mapping updated securely'
    );

    return updatedEmployee;
  }

  /**
   * Used when receiving a verified payload (e.g., from Microsoft Teams Bot Framework)
   * to resolve the immutable microsoft_id to our internal Employee record securely.
   * Never trust an employee ID sent directly by the client.
   */
  static async verifyIdentity(microsoftId: string): Promise<Employee> {
    const employee = await EmployeeRepository.findByMicrosoftId(microsoftId);

    if (!employee) {
      logger.warn({ microsoftId }, 'Unmapped Microsoft identity attempted access');
      throw new Error('Unmapped Microsoft identity');
    }

    return employee;
  }
}
