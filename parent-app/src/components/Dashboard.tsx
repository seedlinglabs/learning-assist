import React, { useState, useEffect, useCallback } from 'react';
import { Parent, Subject, Topic } from '../types';
import { TopicsService } from '../services/topicsService';
import { AcademicRecordsService } from '../services/academicRecordsService';
import Quiz from './Quiz';

interface DashboardProps {
  user: Parent;
  onLogout: () => void;
}

interface TopicWithCompletion extends Topic {
  completedAt?: string;
}

interface SubjectWithProgress extends Subject {
  completedTopics?: number;
  totalTopics?: number;
  completedTopicsList?: TopicWithCompletion[];
}

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const [subjects, setSubjects] = useState<SubjectWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [selectedTopic, setSelectedTopic] = useState<TopicWithCompletion | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);

  const loadSubjects = useCallback(async () => {
    console.log('=== DEBUG: Loading subjects from academic records ===');
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
      
      const academicYear = '2025-26'; // Current academic year
      console.log('Fetching academic records for academic year:', academicYear);
      
      // Fetch academic records for all parent's classes
      const allRecords = await AcademicRecordsService.getRecordsForParent(
        user.school_id,
        academicYear,
        user.class_access
      );
      
      console.log('Academic records received:', allRecords);
      console.log('Total records found:', allRecords.length);
      
      // Build subject map from academic records
      const subjectMap = new Map<string, {
        subjectName: string;
        grade: string;
        section: string;
        completedTopics: Map<string, { topicId: string; topicName: string; completedAt: string }>;
      }>();
      
      // Group records by subject
      for (const record of allRecords) {
        if (record.status === 'completed') {
          const key = record.subject_id;
          
          if (!subjectMap.has(key)) {
            subjectMap.set(key, {
              subjectName: record.subject_name,
              grade: record.grade,
              section: record.section,
              completedTopics: new Map()
            });
          }
          
          const subjectData = subjectMap.get(key)!;
          subjectData.completedTopics.set(record.topic_id, {
            topicId: record.topic_id,
            topicName: record.topic_name,
            completedAt: record.updated_at
          });
        }
      }
      
      console.log('Subjects with completed topics:', Array.from(subjectMap.keys()));
      console.log('Subject map:', subjectMap);
      
      // Fetch full topic details for each subject
      const subjectsWithProgress: SubjectWithProgress[] = [];
      
      for (const [subjectId, subjectData] of Array.from(subjectMap.entries())) {
        try {
          console.log(`Fetching all topics for subject: ${subjectId}`);
          const allTopics = await TopicsService.getTopicsBySubject(subjectId);
          console.log(`Subject ${subjectData.subjectName}: Found ${allTopics.length} total topics`);
          
          // Filter to get completed topics with full details and add completion dates
          const completedTopicsList = allTopics
            .filter(topic => subjectData.completedTopics.has(topic.id))
            .map(topic => ({
              ...topic,
              completedAt: subjectData.completedTopics.get(topic.id)?.completedAt
            }))
            // Sort by completion date (most recent first)
            .sort((a, b) => {
              const dateA = new Date(a.completedAt || 0).getTime();
              const dateB = new Date(b.completedAt || 0).getTime();
              return dateB - dateA;
            });
          
          console.log(`Subject ${subjectData.subjectName}: ${completedTopicsList.length} completed topics`);
          
          // Create a subject object
          const subject: SubjectWithProgress = {
            id: subjectId,
            name: subjectData.subjectName,
            description: `Grade ${subjectData.grade}${subjectData.section} - ${subjectData.subjectName}`,
            class_id: `${subjectData.grade}${subjectData.section}`,
            school_id: user.school_id,
            school_name: user.school_id,
            class_name: `Grade ${subjectData.grade}${subjectData.section}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            totalTopics: allTopics.length,
            completedTopics: completedTopicsList.length,
            completedTopicsList: completedTopicsList
          };
          
          subjectsWithProgress.push(subject);
        } catch (err) {
          console.error(`Error fetching topics for subject ${subjectId}:`, err);
        }
      }
      
      console.log('Final subjects with progress:', subjectsWithProgress);
      setSubjects(subjectsWithProgress);
      
      if (subjectsWithProgress.length === 0) {
        setError('No completed topics found yet. Topics will appear here as your child progresses.');
      }
      
    } catch (err) {
      setError('Failed to load academic records. Please try again.');
      console.error('Error loading subjects:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const toggleTopic = (topicId: string) => {
    setExpandedTopics(prev => {
      const newSet = new Set(prev);
      if (newSet.has(topicId)) {
        newSet.delete(topicId);
      } else {
        newSet.add(topicId);
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
                <h1>Sprout AI</h1>
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
                <h1>Sprout AI</h1>
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
                <h1>Sprout AI</h1>
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
                const hasCompletedTopics = (subject.completedTopicsList?.length || 0) > 0;
                
                const formatDate = (dateStr?: string) => {
                  if (!dateStr) return '';
                  const date = new Date(dateStr);
                  return date.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  });
                };
                
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
                          overflow: 'hidden',
                          marginBottom: '16px'
                        }}>
                          <div style={{
                            width: `${progress}%`,
                            height: '100%',
                            backgroundColor: progress === 100 ? '#4caf50' : '#daa429',
                            transition: 'width 0.3s ease'
                          }} />
                        </div>
                      </div>
                    )}
                    
                    {/* Completed Topics Accordions */}
                    {hasCompletedTopics && (
                      <div style={{ marginTop: '16px' }}>
                        {subject.completedTopicsList!.map((topic, index) => {
                          const isTopicExpanded = expandedTopics.has(topic.id);
                          const videos = topic.aiContent?.videos || [];
                          const hasAssessment = topic.aiContent?.assessmentQuestions;
                          
                          // Debug logging
                          if (isTopicExpanded) {
                            console.log('=== TOPIC EXPANDED ===');
                            console.log('Topic:', topic.name);
                            console.log('Full topic object:', topic);
                            console.log('Topic keys:', Object.keys(topic));
                            console.log('Has aiContent?', !!topic.aiContent);
                            console.log('Has ai_content?', !!(topic as any).ai_content);
                            console.log('Videos from aiContent:', videos);
                            console.log('Videos from ai_content:', (topic as any).ai_content?.videos);
                            console.log('Videos length:', videos.length);
                            console.log('Has assessment?', !!hasAssessment);
                          }
                          
                          return (
                            <div
                              key={topic.id}
                              style={{
                                marginBottom: '8px',
                                border: '1px solid rgba(76, 175, 80, 0.3)',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                backgroundColor: 'white'
                              }}
                            >
                              {/* Topic Header (Accordion Button) */}
                              <button
                                onClick={() => toggleTopic(topic.id)}
                                style={{
                                  width: '100%',
                                  padding: '12px 16px',
                                  backgroundColor: isTopicExpanded ? 'rgba(76, 175, 80, 0.08)' : 'white',
                                  border: 'none',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '12px',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s',
                                  textAlign: 'left'
                                }}
                                onMouseEnter={(e) => {
                                  if (!isTopicExpanded) {
                                    e.currentTarget.style.backgroundColor = 'rgba(76, 175, 80, 0.05)';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!isTopicExpanded) {
                                    e.currentTarget.style.backgroundColor = 'white';
                                  }
                                }}
                              >
                                <span style={{
                                  fontSize: '16px',
                                  color: '#4caf50',
                                  flexShrink: 0
                                }}>
                                  ✓
                                </span>
                                <div style={{ flex: 1 }}>
                                  <div style={{
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    color: '#4d2917',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    gap: '12px'
                                  }}>
                                    <span>{topic.name}</span>
                                    {topic.completedAt && (
                                      <span style={{
                                        fontSize: '11px',
                                        color: '#4caf50',
                                        fontWeight: '500',
                                        whiteSpace: 'nowrap'
                                      }}>
                                        {formatDate(topic.completedAt)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <span style={{
                                  fontSize: '14px',
                                  color: '#4d2917',
                                  transition: 'transform 0.2s',
                                  transform: isTopicExpanded ? 'rotate(90deg)' : 'rotate(0deg)'
                                }}>
                                  ▶
                                </span>
                              </button>

                              {/* Topic Content (Videos + Quiz Button) */}
                              {isTopicExpanded && (
                                <div style={{
                                  padding: '16px',
                                  backgroundColor: 'rgba(76, 175, 80, 0.02)',
                                  borderTop: '1px solid rgba(76, 175, 80, 0.2)'
                                }}>
                                  {/* Videos */}
                                  {videos.length > 0 ? (
                                    <div style={{ marginBottom: hasAssessment ? '16px' : '0' }}>
                                      <div style={{
                                        fontSize: '13px',
                                        fontWeight: '600',
                                        color: '#4d2917',
                                        marginBottom: '12px'
                                      }}>
                                        📺 Videos
                                      </div>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {videos.map((video, vidIndex) => (
                                          <a
                                            key={vidIndex}
                                            href={video.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                              padding: '10px 12px',
                                              backgroundColor: 'white',
                                              border: '1px solid rgba(218, 164, 41, 0.3)',
                                              borderRadius: '6px',
                                              textDecoration: 'none',
                                              color: '#4d2917',
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '12px',
                                              transition: 'all 0.2s'
                                            }}
                                            onMouseEnter={(e) => {
                                              e.currentTarget.style.borderColor = '#daa429';
                                              e.currentTarget.style.backgroundColor = 'rgba(218, 164, 41, 0.05)';
                                              e.currentTarget.style.transform = 'translateX(4px)';
                                            }}
                                            onMouseLeave={(e) => {
                                              e.currentTarget.style.borderColor = 'rgba(218, 164, 41, 0.3)';
                                              e.currentTarget.style.backgroundColor = 'white';
                                              e.currentTarget.style.transform = 'translateX(0)';
                                            }}
                                          >
                                            <span style={{
                                              width: '32px',
                                              height: '32px',
                                              backgroundColor: 'rgba(218, 164, 41, 0.2)',
                                              borderRadius: '6px',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              fontSize: '14px',
                                              flexShrink: 0
                                            }}>
                                              ▶
                                            </span>
                                            <div style={{ flex: 1 }}>
                                              <div style={{ fontSize: '13px', fontWeight: '500' }}>
                                                {video.title}
                                              </div>
                                              {video.duration && (
                                                <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                                                  {video.duration}
                                                </div>
                                              )}
                                            </div>
                                          </a>
                                        ))}
                                      </div>
                                    </div>
                                  ) : (
                                    <div style={{
                                      padding: '12px',
                                      textAlign: 'center',
                                      color: '#666',
                                      fontSize: '13px',
                                      marginBottom: hasAssessment ? '16px' : '0'
                                    }}>
                                      No videos available
                                    </div>
                                  )}

                                  {/* Quiz Button */}
                                  {hasAssessment && (
                                    <button
                                      onClick={() => {
                                        setSelectedTopic(topic);
                                        setShowQuiz(true);
                                      }}
                                      style={{
                                        width: '100%',
                                        padding: '12px',
                                        backgroundColor: 'linear-gradient(135deg, #4d2917 0%, #6b3a1e 100%)',
                                        background: 'linear-gradient(135deg, #4d2917 0%, #6b3a1e 100%)',
                                        border: 'none',
                                        borderRadius: '8px',
                                        color: 'white',
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px'
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(77, 41, 23, 0.3)';
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = 'none';
                                      }}
                                    >
                                      <span>🎯</span>
                                      <span>Take Quiz</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quiz Modal */}
      {selectedTopic && showQuiz && (
        <Quiz
          topic={selectedTopic}
          onClose={() => {
            setShowQuiz(false);
            setSelectedTopic(null);
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;