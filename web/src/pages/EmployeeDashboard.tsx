import { useEffect, useState } from 'react';
import { api } from '../api';
import { format, isPast, isToday } from 'date-fns';
import { ExternalLink, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Task {
  id: string;
  clickup_task_id: string;
  name: string;
  status: string;
  priority: string | null;
  due_date: string | null;
  url: string;
}

interface DashboardData {
  tasks: Task[];
  reviews: {
    morning: unknown;
    evening: unknown;
  };
}

export default function EmployeeDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'today' | 'upcoming' | 'overdue'>('today');

  useEffect(() => {
    let mounted = true;

    const fetchDashboard = async () => {
      try {
        const response = await api.get<DashboardData>('/dashboards/employee');
        if (mounted) {
          setData(response);
          setIsLoading(false);
        }
      } catch (err: unknown) {
        if (mounted) {
          if (err instanceof Error) {
            setError(err.message);
          } else {
            setError('Failed to load dashboard');
          }
          setIsLoading(false);
        }
      }
    };

    fetchDashboard();

    return () => {
      mounted = false;
    };
  }, []);

  if (isLoading) return <div className="flex-center" style={{ height: '100%' }}><div className="spinner"></div></div>;
  if (error) return <div className="badge badge-danger p-4">{error}</div>;
  if (!data) return null;

  const getTaskStatus = (task: Task) => {
    if (!task.due_date) return 'upcoming';
    const dueDate = new Date(task.due_date);
    if (isPast(dueDate) && !isToday(dueDate)) return 'overdue';
    if (isToday(dueDate)) return 'today';
    return 'upcoming';
  };

  const filteredTasks = data.tasks.filter(t => {
    if (t.status.toLowerCase() === 'closed' || t.status.toLowerCase() === 'complete') return false;
    return getTaskStatus(t) === activeTab;
  });

  const getPriorityBadge = (priority: string | null) => {
    if (!priority) return null;
    const p = priority.toLowerCase();
    if (p === 'urgent' || p === 'high') return <span className="badge badge-danger">High Priority</span>;
    if (p === 'normal') return <span className="badge badge-info">Normal</span>;
    if (p === 'low') return <span className="badge badge-default">Low</span>;
    return null;
  };

  return (
    <div className="animate-fade-in flex-column gap-6">
      <div className="flex-between">
        <div>
          <h1 style={{ marginBottom: '0.25rem' }}>My Tasks</h1>
          <p>Review and manage your assigned tasks</p>
        </div>
        
        <div className="flex-center gap-4">
          <div className="glass-card" style={{ padding: '0.75rem 1rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Morning Review:</span>
            {data.reviews.morning ? <span className="badge badge-success"><CheckCircle2 size={12} style={{ marginRight: '4px' }}/> Acknowledged</span> : <span className="badge badge-warning"><AlertCircle size={12} style={{ marginRight: '4px' }}/> Pending</span>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-light)' }}>
        {(['today', 'upcoming', 'overdue'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '1rem 0.5rem',
              color: activeTab === tab ? 'var(--primary-color)' : 'var(--text-secondary)',
              fontWeight: activeTab === tab ? 600 : 400,
              borderBottom: activeTab === tab ? '2px solid var(--primary-color)' : '2px solid transparent',
              cursor: 'pointer',
              textTransform: 'capitalize',
              fontSize: '1rem'
            }}
          >
            {tab} Tasks
          </button>
        ))}
      </div>

      {/* Task List */}
      <div className="flex-column gap-4">
        {filteredTasks.length === 0 ? (
          <div className="glass-card flex-center flex-column" style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <CheckCircle2 size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <h3 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>All caught up!</h3>
            <p>No {activeTab} tasks found.</p>
          </div>
        ) : (
          filteredTasks.map(task => (
            <div key={task.id} className="glass-card" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{task.name}</h3>
                  {getPriorityBadge(task.priority)}
                  <span className="badge badge-default">{task.status}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  {task.due_date && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Clock size={14} />
                      Due {format(new Date(task.due_date), 'MMM d, yyyy')}
                    </span>
                  )}
                  <span>ID: {task.clickup_task_id}</span>
                </div>
              </div>
              <a 
                href={`https://app.clickup.com/t/${task.clickup_task_id}`} 
                target="_blank" 
                rel="noreferrer"
                className="btn btn-secondary"
              >
                <ExternalLink size={16} />
                Open in ClickUp
              </a>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
