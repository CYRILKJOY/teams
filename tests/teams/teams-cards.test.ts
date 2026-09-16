import { describe, it, expect } from 'vitest';
import {
  generateTaskAssignedCard,
  generateTaskUpdatedCard,
  generateDailyReviewCard
} from '../../src/services/teams/cards/index.js';

describe('Teams Adaptive Card Generation', () => {
  it('should generate a valid TASK_ASSIGNED card without user data', () => {
    const task = {
      name: 'Fix bugs',
      status: 'In Progress',
      priority: 'High',
      due_date: '2023-12-01'
    };
    const card = generateTaskAssignedCard(task);

    expect(card.type).toBe('AdaptiveCard');
    expect(card.version).toBe('1.4');
    // Ensure task data is present
    expect(JSON.stringify(card)).toContain('Fix bugs');
    // Ensure no sensitive employee info is hardcoded (it only relies on task)
    expect(JSON.stringify(card)).not.toContain('microsoft_id');
  });

  it('should generate a valid TASK_UPDATED card', () => {
    const task = { name: 'Update docs', status: 'Done', priority: 'Low' };
    const card = generateTaskUpdatedCard(task);

    expect(card.type).toBe('AdaptiveCard');
    expect(JSON.stringify(card)).toContain('Update docs');
  });

  it('should generate a valid MORNING_REVIEW card', () => {
    const card = generateDailyReviewCard(
      'MORNING',
      [],
      { overdue: 0, dueToday: 0, upcoming: 0, completedToday: 0, incomplete: 0 },
      'notif2'
    );
    expect(card.type).toBe('AdaptiveCard');
    expect(card.body).toEqual(
      expect.arrayContaining([expect.objectContaining({ text: 'Morning Plan' })])
    );
  });

  it('should generate a valid EVENING_REVIEW card', () => {
    const card = generateDailyReviewCard(
      'EVENING',
      [],
      { overdue: 0, dueToday: 0, upcoming: 0, completedToday: 0, incomplete: 0 },
      'notif3'
    );
    expect(card.type).toBe('AdaptiveCard');
    expect(card.body).toEqual(
      expect.arrayContaining([expect.objectContaining({ text: 'Evening Review' })])
    );
  });
});
