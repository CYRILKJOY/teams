import { supabase } from './src/services/supabase.js';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, task_assignments(id, employee_id, acknowledgements(response))')
    .limit(1);
    
  console.log(JSON.stringify({ data, error }, null, 2));
}

run();
