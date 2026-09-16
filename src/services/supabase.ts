import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

// The TaskFlow API operates as a privileged backend service, hence we use the SERVICE_ROLE_KEY.
// This allows the backend to perform synchronization and identity mapping operations without
// being hindered by RLS (which is defined primarily as a failsafe for accidental client exposure).
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
