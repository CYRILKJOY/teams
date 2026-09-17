import { useOutletContext, useParams, useNavigate } from 'react-router-dom';
import { Clock, Moon, Sun, CheckSquare, XCircle, HelpCircle, ArrowLeft } from 'lucide-react';
import { format, eachDayOfInterval, parseISO } from 'date-fns';

interface Task {
  id: string;
  status: string;
  due_date: string | null;
  name: string;
  clickup_task_id: string;
  created_at: string;
  acknowledgement_status?: string | null;
}

interface DailyReview {
  id: string;
  date: string;
  type: 'MORNING' | 'EVENING';
  response: string;
}

interface TeamMember {
  id: string;
  user_id: string;
  display_name: string;
  microsoft_id: string | null;
  clickup_id: string | null;
  reviews: DailyReview[];
  tasks: Task[];
}

interface ManagerData {
  team: TeamMember[];
  date: string;
  timezone: string;
}

interface OutletContextType {
  managerData: ManagerData | null;
  isLoading: boolean;
  error: string;
}

export default function ManagerTaskDetails() {
  const { managerData, isLoading, error } = useOutletContext<OutletContextType>();
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();

  if (isLoading) return <div className="flex-center" style={{ height: '100%' }}><div className="spinner"></div></div>;
  if (error) return <div className="badge badge-danger p-4">{error}</div>;
  if (!managerData) return null;

  let foundTask: Task | null = null;
  let assignedEmployee: TeamMember | null = null;

  for (const emp of managerData.team) {
    const task = emp.tasks.find(t => t.id === taskId);
    if (task) {
      foundTask = task;
      assignedEmployee = emp;
      break;
    }
  }

  if (!foundTask || !assignedEmployee) {
    return (
      <div className="flex-column gap-4" style={{ alignItems: 'flex-start' }}>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Back
        </button>
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', width: '100%' }}>
          <h3>Task not found</h3>
          <p className="text-muted">The task you are looking for does not exist or you do not have permission to view it.</p>
        </div>
      </div>
    );
  }

  const getAcknowledgementBadge = (status?: string | null) => {
    if (!status) return <span className="badge badge-default">Notification Not Accepted</span>;
    if (status === 'SEEN_WILL_COMPLETE') return <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center' }}><CheckSquare size={12} style={{ marginRight: '4px' }}/> Accepted</span>;
    if (status === 'SEEN_NEED_CLARIFICATION') return <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center' }}><HelpCircle size={12} style={{ marginRight: '4px' }}/> Needs Clarification</span>;
    if (status === 'CANNOT_COMPLETE') return <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center' }}><XCircle size={12} style={{ marginRight: '4px' }}/> Cannot Complete</span>;
    return <span className="badge badge-default">{status}</span>;
  };

  const computePendingReviews = (taskCreatedAt: string, allReviews: DailyReview[]) => {
    try {
      const today = new Date(managerData.date);
      const start = parseISO(taskCreatedAt);
      
      if (start > today) return { pendingMorning: 0, pendingEvening: 0, details: [] };
      
      const days = eachDayOfInterval({ start, end: today });
      
      let pendingMorning = 0;
      let pendingEvening = 0;
      const details: { date: string, hasMorning: boolean, hasEvening: boolean }[] = [];
      
      days.forEach(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const hasMorning = allReviews.some(r => r.date === dayStr && r.type === 'MORNING');
        const hasEvening = allReviews.some(r => r.date === dayStr && r.type === 'EVENING');
        
        if (!hasMorning) pendingMorning++;
        if (!hasEvening) pendingEvening++;

        details.push({ date: dayStr, hasMorning, hasEvening });
      });
      
      return { pendingMorning, pendingEvening, details: details.reverse() };
    } catch (e) {
      return { pendingMorning: 0, pendingEvening: 0, details: [] };
    }
  };

  const { pendingMorning, pendingEvening, details } = computePendingReviews(foundTask.created_at, assignedEmployee.reviews);

  return (
    <div className="animate-fade-in flex-column gap-6">
      <div>
        <button 
          onClick={() => navigate(`/manager?employeeId=${assignedEmployee?.id}`)} 
          style={{ 
            background: 'none', 
            border: 'none', 
            color: 'var(--text-secondary)', 
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            marginBottom: '1rem',
            padding: 0,
            fontSize: '0.9rem',
            fontWeight: 500
          }}
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
        <h1 style={{ marginBottom: '0.25rem' }}>Task Details</h1>
        <p>Reviewing performance metrics for this specific task.</p>
      </div>

      <div className="glass-card" style={{ padding: '2rem', borderLeft: (pendingMorning > 0 || pendingEvening > 0) ? '4px solid var(--warning-color)' : '4px solid var(--success-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem' }}>{foundTask.name}</h2>
            <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              <span>ClickUp Task: #{foundTask.clickup_task_id}</span>
              <span>&bull;</span>
              <span>Created: {format(new Date(foundTask.created_at), 'MMMM d, yyyy')}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            {getAcknowledgementBadge(foundTask.acknowledgement_status)}
            <span className="badge badge-default" style={{ fontSize: '1rem', padding: '0.25rem 0.75rem' }}>{foundTask.status}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '3rem', marginBottom: '2rem', padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)' }}>
          <div>
            <p style={{ margin: '0 0 0.5rem 0', color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Assigned Employee</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: 'white', fontWeight: 'bold' }}>
                {assignedEmployee.display_name ? assignedEmployee.display_name.charAt(0).toUpperCase() : 'E'}
              </div>
              <span style={{ fontWeight: 500 }}>{assignedEmployee.display_name}</span>
            </div>
          </div>
          
          <div>
            <p style={{ margin: '0 0 0.5rem 0', color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Due Date</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: foundTask.due_date && new Date(foundTask.due_date) < new Date() && foundTask.status !== 'closed' ? 'var(--danger-color)' : 'var(--text-primary)' }}>
              <Clock size={16}/> 
              {foundTask.due_date ? format(new Date(foundTask.due_date), 'MMMM d, yyyy') : 'No due date'}
            </div>
          </div>

          <div>
            <p style={{ margin: '0 0 0.5rem 0', color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Missing Morning Reviews</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: pendingMorning > 0 ? 'var(--warning-color)' : 'var(--success-color)' }}>
              <Sun size={16} /> {pendingMorning} Missed
            </div>
          </div>
          
          <div>
            <p style={{ margin: '0 0 0.5rem 0', color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Missing Evening Reviews</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: pendingEvening > 0 ? 'var(--warning-color)' : 'var(--success-color)' }}>
              <Moon size={16} /> {pendingEvening} Missed
            </div>
          </div>
        </div>

        <div>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>Daily Review Breakdown</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {details.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>Task created today, no history available.</p>
            ) : (
              details.map(d => (
                <div key={d.date} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255,255,255,0.02)' }}>
                  <span style={{ fontWeight: 500, fontSize: '0.95rem' }}>{format(parseISO(d.date), 'EEEE, MMMM d, yyyy')}</span>
                  <div style={{ display: 'flex', gap: '3rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: d.hasMorning ? 'var(--success-color)' : 'var(--danger-color)' }}>
                      <Sun size={18} /> {d.hasMorning ? 'Morning Reviewed' : 'Morning Missed'}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: d.hasEvening ? 'var(--primary-color)' : 'var(--danger-color)' }}>
                      <Moon size={18} /> {d.hasEvening ? 'Evening Reviewed' : 'Evening Missed'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
