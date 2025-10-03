import React, { useState, useEffect } from 'react';
import { Parent, Subject, Topic } from '../types';
import { TopicsService } from '../services/topicsService';

interface DashboardProps {
  user: Parent;
  onLogout: () => void;
  onTopicSelect: (topic: Topic) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout, onTopicSelect }) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSubjects();
  }, [user.class_access, user.school_id]);

  const loadSubjects = async () => {
    if (!user.class_access || user.class_access.length === 0) {
      setError('No class access found. Please contact your school administrator.');
      setLoading(false);
      return;
    }

    if (!user.school_id) {
      setError('No school information found. Please contact your school administrator.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // Debug: Check what's in localStorage
      console.log('Current token in localStorage:', localStorage.getItem('parent_auth_token'));
      console.log('User school_id:', user.school_id);
      console.log('User class access:', user.class_access);
      
      const allSubjects: Subject[] = [];
      for (const classId of user.class_access) {
        try {
          console.log(`Loading subjects for school: ${user.school_id}, class: ${classId}`);
          const classSubjects = await TopicsService.getSubjectsBySchoolAndClass(user.school_id, classId);
          console.log(`Subjects for school ${user.school_id}, class ${classId}:`, classSubjects);
          allSubjects.push(...classSubjects);
        } catch (err) {
          console.error(`Error loading subjects for school ${user.school_id}, class ${classId}:`, err);
        }
      }
      
      setSubjects(allSubjects);
    } catch (err) {
      setError('Failed to load subjects. Please try again.');
      console.error('Error loading subjects:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTopics = async (subject: Subject) => {
    try {
      setLoading(true);
      setError('');
      const subjectTopics = await TopicsService.getTopicsBySubject(subject.id);
      setTopics(subjectTopics);
      setSelectedSubject(subject);
    } catch (err) {
      setError('Failed to load topics. Please try again.');
      console.error('Error loading topics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToSubjects = () => {
    setSelectedSubject(null);
    setTopics([]);
  };

  if (loading && subjects.length === 0) {
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

  if (selectedSubject) {
    return (
      <div>
        <div className="header">
          <div className="container">
            <div className="header-content">
              <div>
                <button onClick={handleBackToSubjects} className="back-button" style={{ marginRight: '16px' }}>
                  ← Back
                </button>
                <div>
                  <h1>{selectedSubject.name}</h1>
                  <p>Topics and content</p>
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
            {loading ? (
              <div className="loading">
                <div className="spinner"></div>
                <span>Loading topics...</span>
              </div>
            ) : topics.length === 0 ? (
              <div className="empty-state">
                <h3>No Topics Available</h3>
                <p>No topics have been created for this subject yet. Topics are loaded from the backend API.</p>
              </div>
            ) : (
              <div className="topic-list">
                {topics.map((topic) => (
                  <div
                    key={topic.id}
                    className="topic-item"
                    onClick={() => onTopicSelect(topic)}
                  >
                    <h4>{topic.name}</h4>
                    {topic.description && <p>{topic.description}</p>}
                  </div>
                ))}
              </div>
            )}
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
            Select a subject to view topics and content
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
                  onClick={() => loadTopics(subject)}
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