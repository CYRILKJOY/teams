import { supabase } from '../supabase.js';
import { Employee } from '../../types/database.js';

export class EmployeeRepository {
  static async findById(id: string): Promise<Employee | null> {
    const { data, error } = await supabase.from('employees').select('*').eq('id', id).single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    return data;
  }

  static async findByUserId(userId: string): Promise<Employee | null> {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    return data;
  }

  static async findByMicrosoftId(microsoftId: string): Promise<Employee | null> {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('microsoft_id', microsoftId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    return data;
  }

  static async findByClickUpId(clickUpId: string): Promise<Employee | null> {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('clickup_id', clickUpId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    return data;
  }

  static async updateMapping(
    employeeId: string,
    microsoftId: string | null,
    clickupId: string | null
  ): Promise<Employee> {
    const { data, error } = await supabase
      .from('employees')
      .update({
        microsoft_id: microsoftId,
        clickup_id: clickupId,
        updated_at: new Date().toISOString()
      })
      .eq('id', employeeId)
      .select('*')
      .single();

    // Catch unique constraint violations for duplicate mappings (23505)
    if (error) {
      if (error.code === '23505') {
        throw new Error('Identity mapping already exists for another employee');
      }
      throw error;
    }

    return data;
  }

  static async findByOrgId(orgId: string): Promise<Employee[]> {
    const { data, error } = await supabase.from('employees').select('*').eq('org_id', orgId);

    if (error) throw error;
    return data || [];
  }
}
