import { supabase } from '../supabase.js';
import { User } from '../../types/database.js';

export class UserRepository {
  static async findById(id: string): Promise<User | null> {
    const { data, error } = await supabase.from('users').select('*').eq('id', id).single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  static async findByEmail(email: string): Promise<User | null> {
    const { data, error } = await supabase.from('users').select('*').eq('email', email).single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }
}
