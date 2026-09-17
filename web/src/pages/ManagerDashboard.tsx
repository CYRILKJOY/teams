import { useState } from 'react';
import { useOutletContext, useSearchParams, useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Clock, Moon, Sun, CheckSquare, XCircle, HelpCircle, Users } from 'lucide-react';
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

export default function ManagerDashboard() {
  const { managerData, isLoading, error } = useOutletContext<OutletContextType>();
  const [searchParams] = useSearchParams();
  const selectedEmployeeId = searchParams.get('employeeId');
  const navigate = useNavigate();

  if (isLoading) return <div className="flex-center" style={{ height: '100%' }}><div className="spinner"></div></div>;
  if (error) return <div className="badge badge-danger p-4">{error}</div>;
  if (!managerData) return null;

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
      
      // If task created in the future (timezone diffs), no pending reviews
      if (start > today) return { pendingMorning: 0, pendingEvening: 0 };
      
      const days = eachDayOfInterval({ start, end: today });
      
      let pendingMorning = 0;
      let pendingEvening = 0;
      
      days.forEach(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const hasMorning = allReviews.some(r => r.date === dayStr && r.type === 'MORNING');
        const hasEvening = allReviews.some(r => r.date === dayStr && r.type === 'EVENING');
        
        if (!hasMorning) pendingMorning++;
        if (!hasEvening) pendingEvening++;
      });
      
      return { pendingMorning, pendingEvening };
    } catch (e) {
      return { pendingMorning: 0, pendingEvening: 0 };
    }
  };

  const renderTeamStats = () => {
    let totalTasks = 0;
    let overdueTasksCount = 0;
    let completedMorningReviews = 0;
    let completedEveningReviews = 0;

    managerData.team.forEach(emp => {
      const hasMorning = emp.reviews.some(r => r.date === managerData.date && r.type === 'MORNING');
      const hasEvening = emp.reviews.some(r => r.date === managerData.date && r.type === 'EVENING');
      
      if (hasMorning) completedMorningReviews++;
      if (hasEvening) completedEveningReviews++;

      emp.tasks.forEach(t => {
        totalTasks++;
        const isOverdue = t.due_date && t.status.toLowerCase() !== 'closed' && new Date(t.due_date) < new Date();
        if (isOverdue) overdueTasksCount++;
      });
    });

    return (
      <div className="grid-cols-4 mb-6">
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <div className="flex-between" style={{ marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Total Open Tasks</h3>
            <div style={{ padding: '0.5rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '8px' }}>
              <CheckCircle2 size={20} color="var(--primary-color)" />
            </div>
          </div>
          <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{totalTasks}</p>
        </div>
        
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <div className="flex-between" style={{ marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Overdue Tasks</h3>
            <div style={{ padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}>
              <AlertTriangle size={20} color="var(--danger-color)" />
            </div>
          </div>
          <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{overdueTasksCount}</p>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div className="flex-between" style={{ marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Today's Morning</h3>
            <div style={{ padding: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px' }}>
              <Sun size={20} color="var(--success-color)" />
            </div>
          </div>
          <p style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 1rem 0' }}>
            {completedMorningReviews} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/ {managerData.team.length}</span>
          </p>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto', maxHeight: '120px' }}>
            {managerData.team.filter(emp => emp.reviews.some(r => r.date === managerData.date && r.type === 'MORNING')).length === 0 ? (
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No reviews yet</span>
            ) : (
              managerData.team.filter(emp => emp.reviews.some(r => r.date === managerData.date && r.type === 'MORNING')).map(emp => (
                <div key={emp.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--success-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: 'white', fontWeight: 'bold' }}>
                    {emp.display_name ? emp.display_name.charAt(0).toUpperCase() : 'E'}
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{emp.display_name}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div className="flex-between" style={{ marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Today's Evening</h3>
            <div style={{ padding: '0.5rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '8px' }}>
              <Moon size={20} color="var(--primary-color)" />
            </div>
          </div>
          <p style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 1rem 0' }}>
            {completedEveningReviews} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/ {managerData.team.length}</span>
          </p>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto', maxHeight: '120px' }}>
            {managerData.team.filter(emp => emp.reviews.some(r => r.date === managerData.date && r.type === 'EVENING')).length === 0 ? (
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No reviews yet</span>
            ) : (
              managerData.team.filter(emp => emp.reviews.some(r => r.date === managerData.date && r.type === 'EVENING')).map(emp => (
                <div key={emp.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: 'white', fontWeight: 'bold' }}>
                    {emp.display_name ? emp.display_name.charAt(0).toUpperCase() : 'E'}
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{emp.display_name}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  const selectedEmployee = managerData.team.find(emp => emp.id === selectedEmployeeId);

  return (
    <div className="animate-fade-in flex-column gap-6">
      <div>
        <h1 style={{ marginBottom: '0.25rem' }}>Manager Dashboard</h1>
        <p>Overview for {format(new Date(managerData.date), 'MMMM d, yyyy')}</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {!selectedEmployeeId ? (
          <div className="animate-fade-in">
            {renderTeamStats()}
            <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Users size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
              <h3>Select an employee from the sidebar</h3>
              <p>Click on an employee in the main navigation sidebar to view their specific tasks and historical review tracking.</p>
            </div>
          </div>
        ) : (
          <div className="animate-fade-in flex-column gap-6">
            <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, color: 'white', fontSize: '1.25rem' }}>
                    {selectedEmployee?.display_name ? selectedEmployee.display_name.charAt(0).toUpperCase() : 'E'}
                  </div>
                  {selectedEmployee?.display_name}
                </h2>
                <p style={{ margin: 0, color: 'var(--text-muted)' }}>{selectedEmployee?.email || `ID: ${selectedEmployee?.id.substring(0, 8)}`}</p>
              </div>
              <div style={{ display: 'flex', gap: '2rem', textAlign: 'right' }}>
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--danger-color)' }}>
                    {selectedEmployee?.tasks.filter(t => t.due_date && t.status.toLowerCase() !== 'closed' && new Date(t.due_date) < new Date()).length || 0}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Overdue Tasks</div>
                </div>
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{selectedEmployee?.tasks.length}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Tasks Assigned</div>
                </div>
              </div>
            </div>

            {selectedEmployee?.tasks.length === 0 ? (
              <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <CheckCircle2 size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.5, color: 'var(--success-color)' }} />
                <h3>No tasks assigned</h3>
                <p>This employee currently has no tasks.</p>
              </div>
            ) : (
              <div className="flex-column gap-4">
                {selectedEmployee?.tasks.map(task => {
                  const { pendingMorning, pendingEvening } = computePendingReviews(task.created_at, selectedEmployee.reviews);
                  
                  return (
                    <div 
                      key={task.id} 
                      className="glass-card" 
                      onClick={() => navigate(`/manager/task/${task.id}`)}
                      style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '1rem', 
                        padding: '1.5rem', 
                        transition: 'all 0.2s', 
                        borderLeft: (pendingMorning > 0 || pendingEvening > 0) ? '3px solid var(--warning-color)' : '3px solid var(--success-color)',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>{task.name}</span>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>ClickUp Task: #{task.clickup_task_id}</span>
                            <span>&bull;</span>
                            <span>Created: {format(new Date(task.created_at), 'MMM d, yyyy')}</span>
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                          {getAcknowledgementBadge(task.acknowledgement_status)}
                          <span className="badge badge-default" style={{ fontSize: '0.85rem' }}>{task.status}</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Clock size={16}/> 
                          {task.due_date ? 
                             <span style={{ color: new Date(task.due_date) < new Date() && task.status !== 'closed' ? 'var(--danger-color)' : 'inherit' }}>
                               Due: {format(new Date(task.due_date), 'MMM d, yyyy')}
                             </span> 
                             : 'No due date'}
                        </div>
                        
                        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', background: 'var(--bg-input)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)' }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Missing Reviews (Since Creation):</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: pendingMorning > 0 ? 'var(--warning-color)' : 'var(--success-color)', fontWeight: 500 }}>
                            <Sun size={16} /> {pendingMorning} Morning
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: pendingEvening > 0 ? 'var(--warning-color)' : 'var(--success-color)', fontWeight: 500 }}>
                            <Moon size={16} /> {pendingEvening} Evening
                          </span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--primary-color)', marginLeft: '1rem' }}>
                            View Details →
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
