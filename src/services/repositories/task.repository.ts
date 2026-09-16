import { supabase } from '../supabase.js';
import { Task, TaskAssignment } from '../../types/database.js';

export class TaskRepository {
  static async upsertTask(
    taskData: Partial<Task> & { clickup_task_id: string; workspace_id: string }
  ): Promise<Task> {
    const { data, error } = await supabase
      .from('tasks')
      .upsert(taskData as Record<string, unknown>, { onConflict: 'clickup_task_id' })
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  static async findById(id: string): Promise<Task | null> {
    const { data, error } = await supabase.from('tasks').select('*').eq('id', id).single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  static async assignTask(taskId: string, employeeId: string): Promise<TaskAssignment> {
    const { data, error } = await supabase
      .from('task_assignments')
      .upsert({ task_id: taskId, employee_id: employeeId }, { onConflict: 'task_id,employee_id' })
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  static async getTasksForEmployee(employeeId: string): Promise<Task[]> {
    // Note: A proper enterprise approach might use an inner join view or RPC
    // Since Supabase JS client doesn't support direct joins that flatten nicely out of the box,
    // we query task_assignments and then tasks, or use the syntax: tasks!inner(task_assignments!inner())
    const { data, error } = await supabase
      .from('tasks')
      .select('*, task_assignments!inner(employee_id)')
      .eq('task_assignments.employee_id', employeeId);

    if (error) throw error;
    // Map to remove the joined field from the result to match Task interface
    return (data || []).map((t: Record<string, unknown>) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { task_assignments, ...task } = t;
      return task as unknown as Task;
    });
  }
}
