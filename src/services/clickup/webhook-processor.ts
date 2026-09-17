import { logger } from '../../utils/logger.js';
import { ClickUpClient } from './client.js';
import { TaskRepository } from '../repositories/task.repository.js';
import { EmployeeRepository } from '../repositories/employee.repository.js';
import { TaskAssignmentRepository } from '../repositories/task-assignment.repository.js';

export class WebhookProcessor {
  /**
   * Processes a task-related webhook event.
   * Fetches the latest task state and synchronizes it and its assignees.
   */
  static async processTaskEvent(taskId: string, event: string): Promise<void> {
    logger.info({ taskId, event }, 'Processing ClickUp task event');

    // 1. Fetch latest task data from ClickUp
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clickUpTask = (await ClickUpClient.getTask(taskId)) as any;
    
    // Resolve internal Workspace UUID
    const clickupWorkspaceId = clickUpTask.team_id?.toString() || clickUpTask.space?.id || 'unknown';
    const { data: workspace, error: wsError } = await import('../supabase.js').then(m => m.supabase
      .from('clickup_workspaces')
      .select('id')
      .eq('clickup_workspace_id', clickupWorkspaceId)
      .single());
      
    if (wsError || !workspace) {
      logger.error({ clickupWorkspaceId }, 'Workspace not mapped in TaskFlow database. Ignoring task.');
      return;
    }

    // 2. Map and Upsert Task
    const mappedTask = {
      clickup_task_id: clickUpTask.id,
      workspace_id: workspace.id,
      name: clickUpTask.name,
      description: clickUpTask.description || null,
      status: clickUpTask.status?.status || 'Open',
      priority: clickUpTask.priority?.priority || null,
      due_date: clickUpTask.due_date
        ? new Date(parseInt(clickUpTask.due_date, 10)).toISOString()
        : null,
      raw_data: clickUpTask
    };

    const task = await TaskRepository.upsertTask(mappedTask);

    // 3. Synchronize Assignees
    await this.syncAssignees(
      task.id,
      (clickUpTask.assignees || []) as Array<{ id: string | number }>
    );
  }

  private static async syncAssignees(
    internalTaskId: string,
    clickUpAssignees: Array<{ id: string | number }>
  ): Promise<void> {
    // Current assignments in TaskFlow
    const currentAssignments = await TaskAssignmentRepository.getAssigneesForTask(internalTaskId);

    // Find matching employees for the new ClickUp assignees
    const newEmployeeIds = new Set<string>();

    for (const assignee of clickUpAssignees) {
      const clickupUserId = assignee.id.toString();
      const employee = await EmployeeRepository.findByClickUpId(clickupUserId);
      if (employee) {
        newEmployeeIds.add(employee.id);

        // Ensure they are assigned
        await TaskAssignmentRepository.assignTask(internalTaskId, employee.id);
      } else {
        logger.debug({ clickupUserId }, 'Unmapped ClickUp user assigned to task, ignoring.');
      }
    }

    // Remove assignments that are no longer in ClickUp
    for (const assignment of currentAssignments) {
      if (!newEmployeeIds.has(assignment.employee_id)) {
        await TaskAssignmentRepository.removeAssignment(internalTaskId, assignment.employee_id);
        logger.info(
          { taskId: internalTaskId, employeeId: assignment.employee_id },
          'Removed assignment based on ClickUp sync'
        );
      }
    }
  }
}
