import { useEffect, useState } from 'react';
import { api } from '../api';
import { Users, AlertTriangle, CheckCircle2, Clock, Moon, Sun, CheckSquare, XCircle, HelpCircle } from 'lucide-react';
import { format, isToday, isFuture, isPast } from 'date-fns';

interface Task {
  id: string;
  status: string;
  due_date: string | null;
  name: string;
  clickup_task_id: string;
  acknowledgement_status?: string | null;
}

interface TeamMember {
  id: string;
  user_id: string;
  display_name: string;
  microsoft_id: string | null;
  clickup_id: string | null;
  reviews: { morning: any; evening: any };
  tasks: Task[];
}

interface ManagerData {
  team: TeamMember[];
  date: string;
  timezone: string;
}

export default function ManagerDashboard() {
  const [data, setData] = useState<ManagerData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'tasks' | 'employees'>('tasks');

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      try {
        const response = await api.get<ManagerData>('/dashboards/manager');
        if (mounted) {
          setData(response);
          setIsLoading(false);
        }
      } catch (err: unknown) {
        if (mounted) {
          if (err instanceof Error) {
            setError(err.message);
          } else {
            setError('Failed to load team data');
          }
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      mounted = false;
    };
  }, []);

  if (isLoading) return <div className="flex-center" style={{ height: '100%' }}><div className="spinner"></div></div>;
  if (error) return <div className="badge badge-danger p-4">{error}</div>;
  if (!data) return null;

  // Calculate aggregates
  let totalTasks = 0;
  let overdueTasksCount = 0;
  let completedMorningReviews = 0;
  let completedEveningReviews = 0;

  const allTasks: (Task & { employeeName: string; employeeMorning: boolean; employeeEvening: boolean })[] = [];

  data.team.forEach(emp => {
    const hasMorning = !!emp.reviews.morning;
    const hasEvening = !!emp.reviews.evening;
    
    if (hasMorning) completedMorningReviews++;
    if (hasEvening) completedEveningReviews++;

    emp.tasks.forEach(t => {
      totalTasks++;
      const isOverdue = t.due_date && t.status.toLowerCase() !== 'closed' && new Date(t.due_date) < new Date();
      if (isOverdue) overdueTasksCount++;

      allTasks.push({
        ...t,
        employeeName: emp.display_name || `Employee ${emp.id.substring(0, 8)}`,
        employeeMorning: hasMorning,
        employeeEvening: hasEvening
      });
    });
  });

  const todayTasks = allTasks.filter(t => t.due_date && isToday(new Date(t.due_date)));
  const upcomingTasks = allTasks.filter(t => t.due_date && isFuture(new Date(t.due_date)));
  const overdueTasksList = allTasks.filter(t => t.due_date && isPast(new Date(t.due_date)) && !isToday(new Date(t.due_date)) && t.status.toLowerCase() !== 'closed');
  
  const noDueDateTasks = allTasks.filter(t => !t.due_date);

  const getAcknowledgementBadge = (status?: string | null) => {
    if (!status) return <span className="badge badge-default">Not Acknowledged</span>;
    if (status === 'SEEN_WILL_COMPLETE') return <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center' }}><CheckSquare size={12} style={{ marginRight: '4px' }}/> Will Complete</span>;
    if (status === 'SEEN_NEED_CLARIFICATION') return <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center' }}><HelpCircle size={12} style={{ marginRight: '4px' }}/> Needs Clarification</span>;
    if (status === 'CANNOT_COMPLETE') return <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center' }}><XCircle size={12} style={{ marginRight: '4px' }}/> Cannot Complete</span>;
    return <span className="badge badge-default">{status}</span>;
  };

  return (
    <div className="animate-fade-in flex-column gap-6">
      <div>
        <h1 style={{ marginBottom: '0.25rem' }}>Team Dashboard</h1>
        <p>Overview for {format(new Date(data.date), 'MMMM d, yyyy')}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid-cols-4">
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div className="flex-between" style={{ marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Total Open Tasks</h3>
            <div style={{ padding: '0.5rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '8px' }}>
              <CheckCircle2 size={20} color="var(--primary-color)" />
            </div>
          </div>
          <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{totalTasks}</p>
        </div>
        
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div className="flex-between" style={{ marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Overdue Tasks</h3>
            <div style={{ padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}>
              <AlertTriangle size={20} color="var(--danger-color)" />
            </div>
          </div>
          <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{overdueTasksCount}</p>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div className="flex-between" style={{ marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Morning Reviews</h3>
            <div style={{ padding: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px' }}>
              <Sun size={20} color="var(--success-color)" />
            </div>
          </div>
          <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            {completedMorningReviews} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/ {data.team.length}</span>
          </p>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div className="flex-between" style={{ marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Evening Reviews</h3>
            <div style={{ padding: '0.5rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '8px' }}>
              <Moon size={20} color="var(--primary-color)" />
            </div>
          </div>
          <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            {completedEveningReviews} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/ {data.team.length}</span>
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
        <button 
          onClick={() => setActiveTab('tasks')}
          style={{ 
            padding: '0.5rem 1rem', 
            borderRadius: 'var(--radius-md)', 
            background: activeTab === 'tasks' ? 'var(--primary-color)' : 'transparent', 
            color: activeTab === 'tasks' ? 'white' : 'var(--text-secondary)',
            border: 'none', 
            cursor: 'pointer',
            fontWeight: 500,
            transition: 'all 0.2s'
          }}
        >
          Tasks View
        </button>
        <button 
          onClick={() => setActiveTab('employees')}
          style={{ 
            padding: '0.5rem 1rem', 
            borderRadius: 'var(--radius-md)', 
            background: activeTab === 'employees' ? 'var(--primary-color)' : 'transparent', 
            color: activeTab === 'employees' ? 'white' : 'var(--text-secondary)',
            border: 'none', 
            cursor: 'pointer',
            fontWeight: 500,
            transition: 'all 0.2s'
          }}
        >
          Employees View
        </button>
      </div>

      {activeTab === 'tasks' && (
        <div className="flex-column gap-6">
          <TaskGroup title="Overdue Tasks" tasks={overdueTasksList} type="danger" />
          <TaskGroup title="Today's Tasks" tasks={todayTasks} type="primary" />
          <TaskGroup title="Upcoming Tasks" tasks={upcomingTasks} type="default" />
          <TaskGroup title="No Due Date" tasks={noDueDateTasks} type="default" />
        </div>
      )}

      {activeTab === 'employees' && (
        <div className="flex-column gap-6">
          {data.team.map(emp => (
            <div key={emp.id} className="glass-card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
                    {emp.display_name ? emp.display_name.charAt(0).toUpperCase() : 'E'}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{emp.display_name || `Employee ${emp.id.substring(0, 8)}`}</h3>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{emp.tasks.length} assigned tasks</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1.5rem' }}>
                  <div className="flex-column" style={{ alignItems: 'flex-end', gap: '0.25rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}><Sun size={12}/> Morning</span>
                    {emp.reviews.morning ? <span className="badge badge-success">Reviewed</span> : <span className="badge badge-warning">Pending</span>}
                  </div>
                  <div className="flex-column" style={{ alignItems: 'flex-end', gap: '0.25rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}><Moon size={12}/> Evening</span>
                    {emp.reviews.evening ? <span className="badge badge-success">Reviewed</span> : <span className="badge badge-warning">Pending</span>}
                  </div>
                </div>
              </div>
              
              <div style={{ padding: '1.5rem' }}>
                {emp.tasks.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>No tasks assigned.</p>
                ) : (
                  <div className="flex-column gap-3">
                    {emp.tasks.map(task => (
                      <div key={task.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <span style={{ fontWeight: 600, fontSize: '1rem' }}>{task.name}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ClickUp Task: #{task.clickup_task_id}</span>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            {getAcknowledgementBadge(task.acknowledgement_status)}
                            <span className="badge badge-default" style={{ fontSize: '0.75rem' }}>{task.status}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                          {task.due_date ? 
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={14}/> Due: {format(new Date(task.due_date), 'MMM d, yyyy')}</span> 
                            : <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={14}/> No due date</span>
                          }
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  function TaskGroup({ title, tasks, type }: { title: string, tasks: any[], type: string }) {
    if (tasks.length === 0) return null;
    
    return (
      <div className="glass-card" style={{ padding: '1.5rem', borderLeft: type === 'danger' ? '4px solid var(--danger-color)' : type === 'primary' ? '4px solid var(--primary-color)' : 'none' }}>
        <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {title} <span className="badge badge-default">{tasks.length}</span>
        </h3>
        <div className="flex-column gap-3">
          {tasks.map(task => (
            <div key={task.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '1rem' }}>{task.name}</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}><Users size={12} style={{ display: 'inline', marginRight: '4px' }}/> {task.employeeName}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <span className="badge badge-default">{task.status}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                     <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ClickUp: #{task.clickup_task_id}</span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={14}/> {task.due_date ? format(new Date(task.due_date), 'MMM d, yyyy') : 'None'}
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Reviews:</span>
                  <span title="Morning Review" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '50%', background: task.employeeMorning ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.05)' }}>
                    <Sun size={14} color={task.employeeMorning ? 'var(--success-color)' : 'var(--text-muted)'} />
                  </span>
                  <span title="Evening Review" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '50%', background: task.employeeEvening ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255,255,255,0.05)' }}>
                    <Moon size={14} color={task.employeeEvening ? 'var(--primary-color)' : 'var(--text-muted)'} />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
}
