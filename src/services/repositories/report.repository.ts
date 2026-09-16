import { supabase } from '../supabase.js';
import { subDays, format } from 'date-fns';

export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  employeeId?: string;
}

export class ReportRepository {
  /**
   * Retrieves the acknowledgement rate for task notifications
   */
  static async getAcknowledgementRate(orgId: string, filters: ReportFilters) {
    let query = supabase
      .from('notifications')
      .select(
        `
        id,
        delivery_state,
        employee_id,
        employees!inner(org_id)
      `,
        { count: 'exact' }
      )
      .eq('employees.org_id', orgId)
      .in('type', ['TASK_ASSIGNED', 'TASK_UPDATED']);

    if (filters.employeeId) query = query.eq('employee_id', filters.employeeId);
    if (filters.startDate) query = query.gte('created_at', filters.startDate);
    if (filters.endDate) query = query.lte('created_at', filters.endDate);

    const { data: totalNotifications, error: totalError } = await query;
    if (totalError) throw new Error('Failed to fetch total notifications for rate');

    const acknowledged =
      totalNotifications?.filter(
        (n: Record<string, unknown>) => n.delivery_state === 'ACKNOWLEDGED'
      ).length || 0;
    const total = totalNotifications?.length || 0;

    return {
      rate: total > 0 ? (acknowledged / total) * 100 : 0,
      total,
      acknowledged
    };
  }

  /**
   * Retrieves unacknowledged tasks assigned to an employee
   */
  static async getUnacknowledgedTasks(orgId: string, filters: ReportFilters) {
    // We look for notifications of TASK_ASSIGNED that are not ACKNOWLEDGED
    let query = supabase
      .from('notifications')
      .select(
        `
        id,
        delivery_state,
        task_id,
        employee_id,
        created_at,
        employees!inner(org_id, display_name)
      `
      )
      .eq('employees.org_id', orgId)
      .in('type', ['TASK_ASSIGNED', 'TASK_UPDATED'])
      .neq('delivery_state', 'ACKNOWLEDGED');

    if (filters.employeeId) query = query.eq('employee_id', filters.employeeId);
    if (filters.startDate) query = query.gte('created_at', filters.startDate);
    if (filters.endDate) query = query.lte('created_at', filters.endDate);

    const { data, error } = await query;
    if (error) throw new Error('Failed to fetch unacknowledged tasks');

    return data || [];
  }

  /**
   * Retrieves daily review completion metrics
   */
  static async getReviewCompletion(orgId: string, filters: ReportFilters) {
    let query = supabase
      .from('daily_reviews')
      .select(
        `
        id,
        type,
        date,
        employee_id,
        employees!inner(org_id)
      `
      )
      .eq('employees.org_id', orgId);

    if (filters.employeeId) query = query.eq('employee_id', filters.employeeId);
    if (filters.startDate) query = query.gte('date', filters.startDate);
    if (filters.endDate) query = query.lte('date', filters.endDate);

    const { data, error } = await query;
    if (error) throw new Error('Failed to fetch daily reviews');

    const morningCount =
      data?.filter((r: Record<string, unknown>) => r.type === 'MORNING').length || 0;
    const eveningCount =
      data?.filter((r: Record<string, unknown>) => r.type === 'EVENING').length || 0;

    return {
      morningCount,
      eveningCount,
      total: data?.length || 0
    };
  }

  /**
   * Identifies blockers (Clarification requested or blocked entirely)
   */
  static async getBlockers(orgId: string, filters: ReportFilters) {
    let query = supabase
      .from('acknowledgements')
      .select(
        `
        id,
        response,
        created_at,
        task_assignments!inner(
          task_id
        ),
        employees!inner(org_id, display_name)
      `
      )
      .eq('employees.org_id', orgId)
      .in('response', ['SEEN_NEED_CLARIFICATION', 'CANNOT_COMPLETE']);

    if (filters.employeeId) query = query.eq('employee_id', filters.employeeId);
    if (filters.startDate) query = query.gte('created_at', filters.startDate);
    if (filters.endDate) query = query.lte('created_at', filters.endDate);

    const { data, error } = await query;
    if (error) throw new Error('Failed to fetch blockers');

    return data || [];
  }

  /**
   * Retrieves task completion trends over the last N days
   */
  static async getTaskCompletionTrends(orgId: string, days: number = 7) {
    const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');

    // In our system, tasks have a status. We'll find tasks updated in the last N days
    // that are 'closed' or 'completed'.
    const { data, error } = await supabase
      .from('tasks')
      .select(
        `
        id,
        status,
        updated_at,
        clickup_workspaces!inner(org_id)
      `
      )
      .eq('clickup_workspaces.org_id', orgId)
      .gte('updated_at', startDate)
      .in('status', ['closed', 'completed']);

    if (error) throw new Error('Failed to fetch task trends');

    // Group by date
    const trends: Record<string, number> = {};
    for (let i = 0; i <= days; i++) {
      trends[format(subDays(new Date(), i), 'yyyy-MM-dd')] = 0;
    }

    if (data) {
      data.forEach((task: Record<string, unknown>) => {
        const dateKey = format(new Date(task.updated_at as string), 'yyyy-MM-dd');
        if (trends[dateKey] !== undefined) {
          trends[dateKey]++;
        }
      });
    }

    return trends;
  }
}
