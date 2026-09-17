import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const clickupToken = process.env.CLICKUP_API_TOKEN!;
  
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });

  console.log('1. Updating Admin User Login...');
  const { data: adminUser } = await supabase.from('users').select('*').eq('email', 'admin@acme.com').single();
  
  let userIdToUse = adminUser?.id;

  if (adminUser) {
    // Update admin credentials
    await supabase.from('users').update({ 
      email: 'cyril@iocod.com',
      password_hash: '$2b$10$NKiEFbiSqRe1S.Xr1EJFtu6s9SPm0NblDdJLjgQEYkRf7v95z6x/G' // Admin@123
    }).eq('id', adminUser.id);
    console.log('Admin login updated successfully.');
  } else {
    // maybe already updated
    const { data: cyrilUser } = await supabase.from('users').select('*').eq('email', 'cyril@iocod.com').single();
    if (cyrilUser) {
      console.log('cyril@iocod.com already exists. Updating password hash just in case.');
      await supabase.from('users').update({ 
        password_hash: '$2b$10$NKiEFbiSqRe1S.Xr1EJFtu6s9SPm0NblDdJLjgQEYkRf7v95z6x/G' // Admin@123
      }).eq('id', cyrilUser.id);
      userIdToUse = cyrilUser.id;
    }
  }

  console.log('2. Updating Employee Record...');
  if (userIdToUse) {
    const { data: employee } = await supabase.from('employees').select('*').eq('user_id', userIdToUse).single();
    if (employee) {
      await supabase.from('employees').update({
        display_name: 'Cyril IOCOD',
        email: 'cyril.iocod@gmail.com', // keep distinct from login if needed, or same
        clickup_id: '308579985'
      }).eq('id', employee.id);
      console.log('Employee updated.');
      
      console.log('3. Syncing ClickUp Tasks...');
      const tasksResponse = await fetch('https://api.clickup.com/api/v2/team/1300440000003977/task?subtasks=true', {
        headers: { 'Authorization': clickupToken }
      });
      const clickupData = await tasksResponse.json();
      const clickupTasks = clickupData.tasks;
      
      const { data: workspace } = await supabase.from('clickup_workspaces').select('*').limit(1).single();
        
      if (workspace && clickupTasks) {
        await supabase.from('tasks').delete().neq('id', '00000000-0000-0000-0000-000000000000'); 
        console.log('Cleared dummy tasks.');

        let synced = 0;
        for (const t of clickupTasks) {
          const { data: newTask, error: insertErr } = await supabase.from('tasks').insert({
            workspace_id: workspace.id,
            clickup_task_id: t.id,
            name: t.name,
            description: t.description || '',
            status: t.status.status,
            priority: t.priority?.priority || 'normal',
            due_date: t.due_date ? new Date(parseInt(t.due_date)).toISOString() : null,
            raw_data: t
          }).select().single();
            
          if (insertErr) {
            console.error('Failed to insert task:', insertErr.message);
            continue;
          }
          
          await supabase.from('task_assignments').insert({
            task_id: newTask.id,
            employee_id: employee.id
          });
          synced++;
        }
        console.log(`Successfully synced ${synced} real tasks!`);
      }
    }
  }
}

main().catch(console.error);
