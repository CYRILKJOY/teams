import { supabase } from '../supabase.js';
import { DailyReview, ReviewType } from '../../types/database.js';

export class DailyReviewRepository {
  static async upsert(
    employeeId: string,
    date: string,
    type: ReviewType,
    response: string
  ): Promise<DailyReview> {
    const { data, error } = await supabase
      .from('daily_reviews')
      .upsert(
        { employee_id: employeeId, date, type, response },
        { onConflict: 'employee_id,date,type' }
      )
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  static async findByEmployeeAndDate(
    employeeId: string,
    date: string,
    type: ReviewType
  ): Promise<DailyReview | null> {
    const { data, error } = await supabase
      .from('daily_reviews')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('date', date)
      .eq('type', type)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }
}
