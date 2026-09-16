import { supabase } from '../supabase.js';
import { TaskAssignment } from '../../types/database.js';

export class TaskAssignmentRepository {
  static async getAssigneesForTask(taskId: string): Promise<TaskAssignment[]> {
    const { data, error } = await supabase
      .from('task_assignments')
      .select('*')
      .eq('task_id', taskId);

    if (error) throw error;
    return data || [];
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

  static async removeAssignment(taskId: string, employeeId: string): Promise<void> {
    const { error } = await supabase
      .from('task_assignments')
      .delete()
      .eq('task_id', taskId)
      .eq('employee_id', employeeId);

    if (error) throw error;
  }
}
