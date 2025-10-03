import React from 'react';
import { Topic } from '../types';
import '../styles/TopicViewer.css';

interface TopicViewerProps {
  topic: Topic;
  completedAt?: string;
  onClose: () => void;
  onStartQuiz: () => void;
}

const TopicViewer: React.FC<TopicViewerProps> = ({ topic, completedAt, onClose, onStartQuiz }) => {
  const videos = topic.aiContent?.videos || [];
  const hasAssessment = topic.aiContent?.assessmentQuestions;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div className="topic-viewer-overlay" onClick={onClose}>
      <div className="topic-viewer-modal" onClick={(e) => e.stopPropagation()}>
        <div className="topic-viewer-header">
          <div>
            <h2>{topic.name}</h2>
            {completedAt && (
              <p className="completed-date">
                ✓ Completed on {formatDate(completedAt)}
              </p>
            )}
          </div>
          <button className="close-button" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="topic-viewer-content">
          {topic.description && (
            <div className="topic-description">
              <p>{topic.description}</p>
            </div>
          )}

          {videos.length > 0 ? (
            <div className="videos-section">
              <h3>📺 Learning Videos</h3>
              <div className="videos-grid">
                {videos.map((video, index) => (
                  <div key={index} className="video-card">
                    <div className="video-thumbnail">
                      <a 
                        href={video.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="video-link"
                      >
                        <div className="play-icon">▶</div>
                        <span className="video-title">{video.title}</span>
                      </a>
                    </div>
                    {video.duration && (
                      <div className="video-duration">{video.duration}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="no-videos">
              <p>No videos available for this topic yet.</p>
            </div>
          )}

          {hasAssessment && (
            <div className="quiz-section">
              <button className="quiz-button" onClick={onStartQuiz}>
                🎯 Take Quiz
                <span className="quiz-subtitle">Test your understanding</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TopicViewer;

