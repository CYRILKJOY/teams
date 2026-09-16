import { supabase } from '../supabase.js';
import { Acknowledgement, AcknowledgementResponse } from '../../types/database.js';

export class AcknowledgementRepository {
  static async create(
    taskAssignmentId: string,
    employeeId: string,
    response: AcknowledgementResponse
  ): Promise<Acknowledgement> {
    const { data, error } = await supabase
      .from('acknowledgements')
      .insert({
        task_assignment_id: taskAssignmentId,
        employee_id: employeeId,
        response
      })
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  static async findByAssignment(taskAssignmentId: string): Promise<Acknowledgement[]> {
    const { data, error } = await supabase
      .from('acknowledgements')
      .select('*')
      .eq('task_assignment_id', taskAssignmentId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }
}
