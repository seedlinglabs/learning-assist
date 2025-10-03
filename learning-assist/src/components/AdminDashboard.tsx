import React from 'react';
import { Users, BookOpen, Calendar, Settings } from 'lucide-react';

interface AdminDashboardProps {
  onNavigate: (view: string) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const adminModules = [
    {
      id: 'academic-records',
      title: 'Academic Records',
      description: 'Manage academic year, grades, sections, subjects, topics, teachers, and parent assignments',
      icon: BookOpen,
      color: '#4CAF50'
    },
    {
      id: 'users',
      title: 'User Management',
      description: 'Manage teachers, parents, and admin users',
      icon: Users,
      color: '#2196F3',
      disabled: true
    },
    {
      id: 'schedule',
      title: 'Class Schedule',
      description: 'Manage class schedules and timetables',
      icon: Calendar,
      color: '#FF9800',
      disabled: true
    },
    {
      id: 'settings',
      title: 'System Settings',
      description: 'Configure system-wide settings and preferences',
      icon: Settings,
      color: '#9C27B0',
      disabled: true
    }
  ];

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <p>Manage your school's academic system</p>
      </div>

      <div className="admin-modules-grid">
        {adminModules.map((module) => {
          const Icon = module.icon;
          return (
            <div
              key={module.id}
              className={`admin-module-card ${module.disabled ? 'disabled' : ''}`}
              onClick={() => !module.disabled && onNavigate(module.id)}
              style={{
                borderLeftColor: module.color,
                cursor: module.disabled ? 'not-allowed' : 'pointer'
              }}
            >
              <div className="module-icon" style={{ backgroundColor: `${module.color}15` }}>
                <Icon size={32} color={module.color} />
              </div>
              <div className="module-content">
                <h3>{module.title}</h3>
                <p>{module.description}</p>
                {module.disabled && <span className="coming-soon">Coming Soon</span>}
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        .admin-dashboard {
          padding: 24px;
          max-width: 1400px;
          margin: 0 auto;
        }

        .admin-header {
          margin-bottom: 32px;
        }

        .admin-header h1 {
          font-size: 32px;
          font-weight: 700;
          margin-bottom: 8px;
          color: var(--text-primary);
        }

        .admin-header p {
          font-size: 16px;
          color: var(--text-secondary);
        }

        .admin-modules-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 24px;
        }

        .admin-module-card {
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-left: 4px solid;
          border-radius: 12px;
          padding: 24px;
          transition: all 0.2s ease;
          display: flex;
          align-items: flex-start;
          gap: 16px;
        }

        .admin-module-card:not(.disabled):hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
        }

        .admin-module-card.disabled {
          opacity: 0.6;
        }

        .module-icon {
          width: 56px;
          height: 56px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .module-content {
          flex: 1;
        }

        .module-content h3 {
          font-size: 20px;
          font-weight: 600;
          margin-bottom: 8px;
          color: var(--text-primary);
        }

        .module-content p {
          font-size: 14px;
          color: var(--text-secondary);
          line-height: 1.5;
          margin-bottom: 0;
        }

        .coming-soon {
          display: inline-block;
          margin-top: 8px;
          padding: 4px 12px;
          background: var(--accent-color);
          color: white;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
};

export default AdminDashboard;

