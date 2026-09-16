import { supabase } from '../supabase.js';
import { NotificationDelivery } from '../../types/database.js';

export class NotificationDeliveryRepository {
  static async logAttempt(
    data: Omit<NotificationDelivery, 'id' | 'attempted_at'>
  ): Promise<NotificationDelivery> {
    const { data: delivery, error } = await supabase
      .from('notification_deliveries')
      .insert(data)
      .select('*')
      .single();

    if (error) throw error;
    return delivery;
  }

  static async getAttemptsForNotification(notificationId: string): Promise<NotificationDelivery[]> {
    const { data, error } = await supabase
      .from('notification_deliveries')
      .select('*')
      .eq('notification_id', notificationId)
      .order('attempted_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }
}
