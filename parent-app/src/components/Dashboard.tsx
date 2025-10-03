import React, { useState, useEffect, useCallback } from 'react';
import { Parent, Subject, Topic } from '../types';
import { TopicsService } from '../services/topicsService';
import { AcademicRecordsService } from '../services/academicRecordsService';

interface DashboardProps {
  user: Parent;
  onLogout: () => void;
}

interface SubjectWithProgress extends Subject {
  completedTopics?: number;
  totalTopics?: number;
  completedTopicsList?: Topic[];
}

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const [subjects, setSubjects] = useState<SubjectWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());

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
      // Extract unique grades from class_access (e.g., "6A" -> "6")
      const gradesSet = new Set<string>();
      for (const classAccess of user.class_access) {
        const gradeMatch = classAccess.match(/^(\d+)/);
        if (gradeMatch) {
          gradesSet.add(gradeMatch[1]);
        }
      }
      
      const grades = Array.from(gradesSet);
      console.log('Extracted grades from class_access:', grades);
      
      // Load subjects for each unique grade
      for (const grade of grades) {
        try {
          console.log(`Loading subjects for school: ${user.school_id}, grade: ${grade}`);
          const classSubjects = await TopicsService.getSubjectsBySchoolAndClass(user.school_id, grade);
          console.log(`Subjects found for grade ${grade}:`, classSubjects);
          allSubjects.push(...classSubjects);
        } catch (err) {
          console.error(`Error loading subjects for school ${user.school_id}, grade ${grade}:`, err);
        }
      }
      
      console.log('Total subjects loaded:', allSubjects);
      
      // Load academic records for completed topics
      await loadAcademicRecords(allSubjects);
      
      setSubjects(allSubjects);
    } catch (err) {
      setError('Failed to load subjects. Please try again.');
      console.error('Error loading subjects:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadAcademicRecords = async (subjectsList: Subject[]) => {
    try {
      const academicYear = '2025-26'; // Current academic year
      console.log('=== LOADING ACADEMIC RECORDS ===');
      console.log('Academic Year:', academicYear);
      console.log('School ID:', user.school_id);
      console.log('Class Access:', user.class_access);
      
      // Fetch academic records for all parent's classes
      const allRecords = await AcademicRecordsService.getRecordsForParent(
        user.school_id,
        academicYear,
        user.class_access
      );
      
      console.log('Academic records received:', allRecords);
      console.log('Total records found:', allRecords.length);
      
      // Group completed topics by subject
      const completedBySubject = new Map<string, Set<string>>();
      
      let completedCount = 0;
      for (const record of allRecords) {
        console.log(`Record: ${record.subject_name} - ${record.topic_name} - Status: ${record.status}`);
        if (record.status === 'completed') {
          completedCount++;
          if (!completedBySubject.has(record.subject_id)) {
            completedBySubject.set(record.subject_id, new Set());
          }
          completedBySubject.get(record.subject_id)!.add(record.topic_id);
        }
      }
      
      console.log('Total completed records:', completedCount);
      console.log('Completed topics by subject:', completedBySubject);
      console.log('Subjects with completed topics:', Array.from(completedBySubject.keys()));
      
      // Update subjects with progress information and completed topics list
      const updatedSubjects = await Promise.all(
        subjectsList.map(async (subject) => {
          try {
            const allTopics = await TopicsService.getTopicsBySubject(subject.id);
            const completedSet = completedBySubject.get(subject.id) || new Set();
            
            // Filter to get only completed topics
            const completedTopicsList = allTopics.filter(topic => completedSet.has(topic.id));
            
            console.log(`Subject ${subject.name}: ${completedTopicsList.length} completed out of ${allTopics.length} topics`);
            
            return {
              ...subject,
              totalTopics: allTopics.length,
              completedTopics: completedSet.size,
              completedTopicsList: completedTopicsList
            };
          } catch (err) {
            console.error(`Error loading topics for subject ${subject.id}:`, err);
            return {
              ...subject,
              totalTopics: 0,
              completedTopics: 0,
              completedTopicsList: []
            };
          }
        })
      );
      
      setSubjects(updatedSubjects);
    } catch (err) {
      console.error('Error loading academic records:', err);
    }
  };

  const toggleSubject = (subjectId: string) => {
    setExpandedSubjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(subjectId)) {
        newSet.delete(subjectId);
      } else {
        newSet.add(subjectId);
      }
      return newSet;
    });
  };

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
              {subjects.map((subject) => {
                const progress = subject.totalTopics && subject.totalTopics > 0
                  ? Math.round((subject.completedTopics || 0) / subject.totalTopics * 100)
                  : 0;
                const isExpanded = expandedSubjects.has(subject.id);
                const hasCompletedTopics = (subject.completedTopicsList?.length || 0) > 0;
                
                return (
                  <div
                    key={subject.id}
                    className="card subject-card"
                  >
                    <div style={{ marginBottom: '12px' }}>
                      <h3>{subject.name}</h3>
                      {subject.class_name && (
                        <p style={{ fontSize: '12px', color: '#daa429', fontWeight: '600', marginBottom: '4px' }}>
                          {subject.class_name}
                        </p>
                      )}
                      {subject.description && <p style={{ fontSize: '14px', opacity: 0.8, marginTop: '8px' }}>{subject.description}</p>}
                    </div>
                    
                    {/* Progress Information */}
                    {subject.totalTopics !== undefined && (
                      <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(218, 164, 41, 0.2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '13px', fontWeight: '600', color: '#4d2917' }}>
                            Progress
                          </span>
                          <span style={{ fontSize: '13px', fontWeight: '600', color: '#daa429' }}>
                            {subject.completedTopics || 0} / {subject.totalTopics} topics
                          </span>
                        </div>
                        
                        {/* Progress Bar */}
                        <div style={{
                          width: '100%',
                          height: '8px',
                          backgroundColor: 'rgba(218, 164, 41, 0.2)',
                          borderRadius: '4px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: `${progress}%`,
                            height: '100%',
                            backgroundColor: progress === 100 ? '#4caf50' : '#daa429',
                            transition: 'width 0.3s ease'
                          }} />
                        </div>
                        
                        <div style={{ marginTop: '8px', textAlign: 'center' }}>
                          <span style={{ 
                            fontSize: '12px', 
                            fontWeight: '600',
                            color: progress === 100 ? '#4caf50' : '#666'
                          }}>
                            {progress}% Complete
                          </span>
                        </div>
                        
                        {/* View Completed Topics Button or Message */}
                        {hasCompletedTopics ? (
                          <button
                            onClick={() => toggleSubject(subject.id)}
                            style={{
                              width: '100%',
                              marginTop: '12px',
                              padding: '10px',
                              backgroundColor: isExpanded ? 'rgba(218, 164, 41, 0.1)' : 'transparent',
                              border: '1px solid #daa429',
                              borderRadius: '6px',
                              color: '#4d2917',
                              fontSize: '13px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                          >
                            {isExpanded ? '▼ Hide' : '▶'} Completed Topics ({subject.completedTopics})
                          </button>
                        ) : (
                          <div style={{
                            marginTop: '12px',
                            padding: '10px',
                            backgroundColor: 'rgba(158, 158, 158, 0.1)',
                            border: '1px solid rgba(158, 158, 158, 0.3)',
                            borderRadius: '6px',
                            color: '#666',
                            fontSize: '12px',
                            textAlign: 'center'
                          }}>
                            No topics completed yet
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Completed Topics List */}
                    {isExpanded && hasCompletedTopics && (
                      <div style={{
                        marginTop: '12px',
                        paddingTop: '12px',
                        borderTop: '1px solid rgba(218, 164, 41, 0.2)'
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {subject.completedTopicsList!.map((topic, index) => (
                            <div
                              key={topic.id}
                              style={{
                                padding: '12px',
                                backgroundColor: 'rgba(76, 175, 80, 0.05)',
                                border: '1px solid rgba(76, 175, 80, 0.2)',
                                borderRadius: '6px',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '10px'
                              }}
                            >
                              <span style={{
                                fontSize: '16px',
                                color: '#4caf50',
                                flexShrink: 0,
                                marginTop: '2px'
                              }}>
                                ✓
                              </span>
                              <div style={{ flex: 1 }}>
                                <div style={{
                                  fontSize: '14px',
                                  fontWeight: '600',
                                  color: '#4d2917',
                                  marginBottom: '4px'
                                }}>
                                  {index + 1}. {topic.name}
                                </div>
                                {topic.description && (
                                  <div style={{
                                    fontSize: '12px',
                                    color: '#666',
                                    lineHeight: '1.4'
                                  }}>
                                    {topic.description}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;