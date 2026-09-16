import { supabase } from '../supabase.js';
import { AuditLog } from '../../types/database.js';

export class AuditLogRepository {
  static async log(
    orgId: string,
    action: string,
    entityType: string,
    entityId: string,
    actorId?: string,
    changes?: Record<string, unknown>
  ): Promise<AuditLog> {
    const { data, error } = await supabase
      .from('audit_logs')
      .insert({
        org_id: orgId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        actor_id: actorId || null,
        changes: changes || null
      })
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }
}
