import { useEffect, useState } from 'react';
import { api } from '../api';
import { Users, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface TeamMember {
  id: string;
  user_id: string;
  microsoft_id: string | null;
  clickup_id: string | null;
  reviews: { morning: unknown; evening: unknown };
  tasks: { id: string; status: string; due_date: string | null; name: string; clickup_task_id: string }[];
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
  const [filterEmployee, setFilterEmployee] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

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
  let overdueTasks = 0;
  let completedReviews = 0;

  data.team.forEach(emp => {
    totalTasks += emp.tasks.length;
    overdueTasks += emp.tasks.filter(t => {
      if (!t.due_date || t.status.toLowerCase() === 'closed') return false;
      return new Date(t.due_date) < new Date();
    }).length;
    if (emp.reviews.morning) completedReviews++;
  });

  const filteredTeam = filterEmployee === 'all' 
    ? data.team 
    : data.team.filter(e => e.id === filterEmployee);

  return (
    <div className="animate-fade-in flex-column gap-6">
      <div>
        <h1 style={{ marginBottom: '0.25rem' }}>Team Overview</h1>
        <p>Monitor your team's progress and tasks for {format(new Date(data.date), 'MMMM d, yyyy')}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid-cols-3">
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
          <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{overdueTasks}</p>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div className="flex-between" style={{ marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Morning Reviews</h3>
            <div style={{ padding: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px' }}>
              <Users size={20} color="var(--success-color)" />
            </div>
          </div>
          <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            {completedReviews} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/ {data.team.length}</span>
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card" style={{ padding: '1rem 1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>Filters:</span>
        <select 
          value={filterEmployee} 
          onChange={e => setFilterEmployee(e.target.value)}
          style={{ width: 'auto', minWidth: '200px', background: 'transparent' }}
        >
          <option value="all">All Employees</option>
          {data.team.map(emp => (
            <option key={emp.id} value={emp.id}>Employee {emp.id.substring(0, 8)}</option>
          ))}
        </select>

        <select 
          value={filterStatus} 
          onChange={e => setFilterStatus(e.target.value)}
          style={{ width: 'auto', minWidth: '200px', background: 'transparent' }}
        >
          <option value="all">All Statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
        </select>
      </div>

      {/* Employee List */}
      <div className="flex-column gap-4">
        {filteredTeam.map(emp => (
          <div key={emp.id} className="glass-card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
                  E
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Employee {emp.id.substring(0, 8)}</h3>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{emp.tasks.length} assigned tasks</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="flex-column" style={{ alignItems: 'flex-end', gap: '0.25rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Morning</span>
                  {emp.reviews.morning ? <span className="badge badge-success">Done</span> : <span className="badge badge-warning">Pending</span>}
                </div>
              </div>
            </div>
            
            <div style={{ padding: '1.5rem' }}>
              {emp.tasks.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>No tasks assigned.</p>
              ) : (
                <div className="flex-column gap-2">
                  {emp.tasks.filter(t => filterStatus === 'all' ? true : t.status.toLowerCase().includes(filterStatus.replace('_', ' '))).map(task => (
                    <div key={task.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <span style={{ fontWeight: 500 }}>{task.name}</span>
                        <span className="badge badge-default" style={{ fontSize: '0.65rem' }}>{task.status}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {task.due_date && <span><Clock size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-2px' }}/> {format(new Date(task.due_date), 'MMM d')}</span>}
                        <span>#{task.clickup_task_id}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
