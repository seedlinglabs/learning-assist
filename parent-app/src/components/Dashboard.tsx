import React, { useState, useEffect, useCallback } from 'react';
import { Parent, Subject } from '../types';
import { TopicsService } from '../services/topicsService';

interface DashboardProps {
  user: Parent;
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadSubjects = useCallback(async () => {
    console.log('=== DEBUG: Loading subjects ===');
    console.log('User data:', user);
    console.log('user.class_access:', user.class_access);
    console.log('user.school_id:', user.school_id);
    
    if (!user.class_access || user.class_access.length === 0) {
      console.log('ERROR: No class access found');
      setError('No class access found. Please contact your school administrator.');
      setLoading(false);
      return;
    }

    if (!user.school_id) {
      console.log('ERROR: No school_id found');
      setError('No school information found. Please contact your school administrator.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const allSubjects: Subject[] = [];
      for (const classId of user.class_access) {
        try {
          console.log(`Loading subjects for school: ${user.school_id}, class: ${classId}`);
          const classSubjects = await TopicsService.getSubjectsBySchoolAndClass(user.school_id, classId);
          console.log(`Subjects found for class ${classId}:`, classSubjects);
          allSubjects.push(...classSubjects);
        } catch (err) {
          console.error(`Error loading subjects for school ${user.school_id}, class ${classId}:`, err);
        }
      }
      
      console.log('Total subjects loaded:', allSubjects);
      setSubjects(allSubjects);
    } catch (err) {
      setError('Failed to load subjects. Please try again.');
      console.error('Error loading subjects:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadSubjects();
  }, [loadSubjects]);

  if (loading) {
    return (
      <div>
        <div className="header">
          <div className="container">
            <div className="header-content">
              <div>
                <h1>SeedlingLabs Parent Portal</h1>
                <p>Welcome back, {user.name || 'Parent'}</p>
              </div>
              <button onClick={onLogout} className="back-button">
                Logout
              </button>
            </div>
          </div>
        </div>
        <div className="main-content">
          <div className="container">
            <div className="loading">
              <div className="spinner"></div>
              <span>Loading subjects...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="header">
          <div className="container">
            <div className="header-content">
              <div>
                <h1>SeedlingLabs Parent Portal</h1>
                <p>Welcome back, {user.name || 'Parent'}</p>
              </div>
              <button onClick={onLogout} className="back-button">
                Logout
              </button>
            </div>
          </div>
        </div>
        <div className="main-content">
          <div className="container">
            <div className="error">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="header">
        <div className="container">
          <div className="header-content">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img 
                src="/SeedlingLabsLogo.png" 
                alt="SeedlingLabs Logo" 
                style={{ width: '40px', height: '40px' }}
              />
              <div>
                <h1>SeedlingLabs Parent Portal</h1>
                <p>Welcome back, {user.name || 'Parent'}</p>
                {user.school_id && (
                  <p style={{ fontSize: '12px', opacity: 0.8 }}>
                    School: {user.school_id} | Classes: {user.class_access?.join(', ') || 'None'}
                  </p>
                )}
              </div>
            </div>
            <button onClick={onLogout} className="back-button">
              Logout
            </button>
          </div>
        </div>
      </div>
      <div className="main-content">
        <div className="container">
          <h2 style={{ color: 'white', fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>
            Subjects
          </h2>
          <p style={{ color: 'rgba(255, 255, 255, 0.8)', marginBottom: '24px' }}>
            Subjects available for your child's class
          </p>
          
          {subjects.length === 0 ? (
            <div className="empty-state">
              <h3>No Subjects Available</h3>
              <p>No subjects have been assigned to your child's class yet.</p>
            </div>
          ) : (
            <div className="subjects-grid">
              {subjects.map((subject) => (
                <div
                  key={subject.id}
                  className="card subject-card"
                >
                  <h3>{subject.name}</h3>
                  {subject.class_name && (
                    <p style={{ fontSize: '12px', color: '#daa429', fontWeight: '600', marginBottom: '4px' }}>
                      {subject.class_name}
                    </p>
                  )}
                  {subject.description && <p>{subject.description}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;