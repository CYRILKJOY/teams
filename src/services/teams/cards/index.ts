import { Task } from '../../../types/database.js';

export function generateTaskAssignedCard(task: Partial<Task>, notificationId: string) {
  return {
    type: 'AdaptiveCard',
    version: '1.4',
    body: [
      { type: 'TextBlock', size: 'Medium', weight: 'Bolder', text: 'New Task Assigned' },
      {
        type: 'TextBlock',
        text: `You have been assigned a new task: **${task.name}**`,
        wrap: true
      },
      {
        type: 'FactSet',
        facts: [
          { title: 'Status:', value: task.status || 'Open' },
          { title: 'Priority:', value: task.priority || 'Normal' },
          {
            title: 'Due Date:',
            value: task.due_date ? new Date(task.due_date).toLocaleDateString() : 'None'
          }
        ]
      }
    ],
    actions: [
      {
        type: 'Action.Submit',
        title: 'I will complete this',
        data: { notification_id: notificationId, response: 'WILL_COMPLETE' }
      },
      {
        type: 'Action.Submit',
        title: 'I need clarification',
        data: { notification_id: notificationId, response: 'NEEDS_CLARIFICATION' }
      },
      {
        type: 'Action.Submit',
        title: 'I cannot complete this',
        data: { notification_id: notificationId, response: 'CANNOT_COMPLETE' }
      }
    ]
  };
}

export function generateTaskUpdatedCard(task: Partial<Task>, notificationId: string) {
  return {
    type: 'AdaptiveCard',
    version: '1.4',
    body: [
      { type: 'TextBlock', size: 'Medium', weight: 'Bolder', text: 'Task Updated' },
      { type: 'TextBlock', text: `The task **${task.name}** has been updated.`, wrap: true },
      {
        type: 'FactSet',
        facts: [
          { title: 'Status:', value: task.status || 'Open' },
          { title: 'Priority:', value: task.priority || 'Normal' }
        ]
      }
    ],
    actions: [
      {
        type: 'Action.Submit',
        title: 'Acknowledged',
        data: { notification_id: notificationId, response: 'WILL_COMPLETE' }
      }
    ]
  };
}

export interface TaskSummaryCounts {
  overdue: number;
  dueToday: number;
  upcoming: number;
  completedToday: number;
  incomplete: number;
}

export function generateDailyReviewCard(
  type: 'MORNING' | 'EVENING',
  tasks: Partial<Task>[],
  counts: TaskSummaryCounts,
  notificationId: string
) {
  const title = type === 'MORNING' ? 'Morning Plan' : 'Evening Review';
  const intro =
    type === 'MORNING'
      ? 'Here are your tasks for today. Please review and acknowledge.'
      : 'Please review your progress for today and acknowledge.';

  const metricsFactSet =
    type === 'MORNING'
      ? {
          type: 'FactSet',
          facts: [
            { title: 'Overdue:', value: counts.overdue.toString() },
            { title: 'Due Today:', value: counts.dueToday.toString() },
            { title: 'Upcoming:', value: counts.upcoming.toString() }
          ]
        }
      : {
          type: 'FactSet',
          facts: [
            { title: 'Completed Today:', value: counts.completedToday.toString() },
            { title: 'Incomplete:', value: counts.incomplete.toString() }
          ]
        };

  const taskList =
    tasks.map((t) => `- **${t.name}** (${t.status})`).join('\n') || 'No tasks assigned.';

  return {
    type: 'AdaptiveCard',
    version: '1.4',
    body: [
      { type: 'TextBlock', size: 'Medium', weight: 'Bolder', text: title },
      { type: 'TextBlock', text: intro, wrap: true },
      metricsFactSet,
      { type: 'TextBlock', text: taskList, wrap: true }
    ],
    actions: [
      {
        type: 'Action.Submit',
        title: 'Looks good',
        data: { notification_id: notificationId, response: 'WILL_COMPLETE' }
      },
      {
        type: 'Action.Submit',
        title: 'I have concerns',
        data: { notification_id: notificationId, response: 'NEEDS_CLARIFICATION' }
      }
    ]
  };
}
