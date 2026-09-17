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

  static async getTasksForEmployee(employeeId: string): Promise<(Task & { acknowledgement_status?: string | null })[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*, task_assignments!inner(id, employee_id, acknowledgements(response))')
      .eq('task_assignments.employee_id', employeeId);

    if (error) throw error;
    
    return (data || []).map((t: any) => {
      const { task_assignments, ...task } = t;
      let acknowledgement_status = null;
      if (task_assignments && task_assignments.length > 0) {
        const assignment = task_assignments[0];
        if (assignment.acknowledgements && assignment.acknowledgements.length > 0) {
          acknowledgement_status = assignment.acknowledgements[0].response;
        }
      }
      return { ...task, acknowledgement_status } as Task & { acknowledgement_status?: string | null };
    });
  }
}
