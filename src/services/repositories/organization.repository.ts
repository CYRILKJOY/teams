import { supabase } from '../supabase.js';
import { Organization } from '../../types/database.js';

export class OrganizationRepository {
  static async findById(id: string): Promise<Organization | null> {
    const { data, error } = await supabase.from('organizations').select('*').eq('id', id).single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    return data;
  }

  static async create(name: string): Promise<Organization> {
    const { data, error } = await supabase
      .from('organizations')
      .insert({ name })
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }
  static async updateSettings(id: string, settings: Partial<Organization>): Promise<Organization> {
    const { data, error } = await supabase
      .from('organizations')
      .update(settings)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  static async findAll(): Promise<Organization[]> {
    const { data, error } = await supabase.from('organizations').select('*');
    if (error) throw error;
    return data || [];
  }
}
