import React, { useState, useEffect } from 'react';
import { Topic } from '../types';
import { TopicsService } from '../services/topicsService';

interface TopicDetailProps {
  topic: Topic;
  onBack: () => void;
}

const TopicDetail: React.FC<TopicDetailProps> = ({ topic, onBack }) => {
  const [fullTopic, setFullTopic] = useState<Topic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'videos' | 'assessment'>('videos');

  useEffect(() => {
    loadFullTopic();
  }, [topic.id]);

  const loadFullTopic = async () => {
    try {
      setLoading(true);
      setError('');
      const topicData = await TopicsService.getTopicById(topic.id);
      setFullTopic(topicData);
    } catch (err) {
      setError('Failed to load topic details. Please try again.');
      console.error('Error loading topic:', err);
    } finally {
      setLoading(false);
    }
  };

  const videos = fullTopic?.aiContent?.videos || [];
  const assessmentQuestions = fullTopic?.aiContent?.assessmentQuestions || '';

  if (loading) {
    return (
      <div>
        <div className="header">
          <div className="container">
            <div className="header-content">
              <button onClick={onBack} className="back-button" style={{ marginRight: '16px' }}>
                ← Back
              </button>
              <div>
                <h1>{topic.name}</h1>
                <p>Loading content...</p>
              </div>
            </div>
          </div>
        </div>
        <div className="main-content">
          <div className="container">
            <div className="loading">
              <div className="spinner"></div>
              <span>Loading topic details...</span>
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
              <button onClick={onBack} className="back-button" style={{ marginRight: '16px' }}>
                ← Back
              </button>
              <div>
                <h1>{topic.name}</h1>
                <p>Error loading content</p>
              </div>
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
            <button onClick={onBack} className="back-button" style={{ marginRight: '16px' }}>
              ← Back
            </button>
            <div>
              <h1>{topic.name}</h1>
              <p>Educational content and assessments</p>
            </div>
          </div>
        </div>
      </div>
      <div className="main-content">
        <div className="container">
          <div className="card" style={{ padding: '24px' }}>
            {topic.description && (
              <p style={{ color: '#4d2917', fontSize: '16px', marginBottom: '24px', lineHeight: '1.6' }}>
                {topic.description}
              </p>
            )}

            {/* Tab Navigation */}
            <div style={{ 
              display: 'flex', 
              borderBottom: '2px solid rgba(218, 164, 41, 0.2)', 
              marginBottom: '24px' 
            }}>
              <button
                onClick={() => setActiveTab('videos')}
                style={{
                  padding: '12px 24px',
                  border: 'none',
                  background: activeTab === 'videos' ? 'linear-gradient(135deg, #4d2917 0%, #daa429 100%)' : 'transparent',
                  color: activeTab === 'videos' ? 'white' : '#4d2917',
                  fontWeight: '600',
                  cursor: 'pointer',
                  borderBottom: activeTab === 'videos' ? '2px solid #daa429' : '2px solid transparent',
                  transition: 'all 0.3s ease'
                }}
              >
                Videos ({videos.length})
              </button>
              <button
                onClick={() => setActiveTab('assessment')}
                style={{
                  padding: '12px 24px',
                  border: 'none',
                  background: activeTab === 'assessment' ? 'linear-gradient(135deg, #4d2917 0%, #daa429 100%)' : 'transparent',
                  color: activeTab === 'assessment' ? 'white' : '#4d2917',
                  fontWeight: '600',
                  cursor: 'pointer',
                  borderBottom: activeTab === 'assessment' ? '2px solid #daa429' : '2px solid transparent',
                  transition: 'all 0.3s ease'
                }}
              >
                Assessment
              </button>
            </div>

            {/* Videos Tab */}
            {activeTab === 'videos' && (
              <div>
                <h3 style={{ color: '#4d2917', fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
                  Teaching Videos
                </h3>
                {videos.length === 0 ? (
                  <div className="empty-state" style={{ padding: '20px' }}>
                    <h4>No Videos Available</h4>
                    <p>No teaching videos have been added to this topic yet.</p>
                  </div>
                ) : (
                  <div className="video-list">
                    {videos.map((video, index) => (
                      <div key={index} className="video-item">
                        <div className="video-icon">▶</div>
                        <div className="video-content">
                          <div className="video-title">{video.title}</div>
                          {video.duration && (
                            <div className="video-duration">{video.duration}</div>
                          )}
                        </div>
                        <button
                          onClick={() => window.open(video.url, '_blank')}
                          className="btn btn-secondary"
                          style={{ width: 'auto', padding: '8px 16px', fontSize: '14px' }}
                        >
                          Watch
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Assessment Tab */}
            {activeTab === 'assessment' && (
              <div>
                <h3 style={{ color: '#4d2917', fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
                  Assessment Questions
                </h3>
                {!assessmentQuestions ? (
                  <div className="empty-state" style={{ padding: '20px' }}>
                    <h4>No Assessment Available</h4>
                    <p>No assessment questions have been created for this topic yet.</p>
                  </div>
                ) : (
                  <div className="assessment-content">
                    <div className="assessment-questions">
                      {assessmentQuestions}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopicDetail;