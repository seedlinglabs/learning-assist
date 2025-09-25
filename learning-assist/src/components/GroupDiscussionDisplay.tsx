import React from 'react';
import { Users, Clock, Target, MessageCircle, Lightbulb, CheckCircle } from 'lucide-react';
import './GroupDiscussionDisplay.css';

interface GroupDiscussionDisplayProps {
  groupDiscussion: string;
  topicName: string;
  classLevel: string;
}

const GroupDiscussionDisplay: React.FC<GroupDiscussionDisplayProps> = ({
  groupDiscussion,
  topicName,
  classLevel
}) => {
  if (!groupDiscussion) {
    return (
      <div className="group-discussion-display">
        <div className="no-content">
          <Users size={48} className="no-content-icon" />
          <h3>No Group Discussion Available</h3>
          <p>Generate AI content to create group discussion activities for this topic.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="group-discussion-display">
      <div className="discussion-header">
        <div className="header-icon">
          <Users size={24} />
        </div>
        <div className="header-content">
          <h2>Group Discussion Activities</h2>
          <p className="topic-info">
            <strong>{topicName}</strong> • {classLevel}
          </p>
        </div>
      </div>

      <div className="discussion-content">
        <div className="discussion-text">
          {groupDiscussion.split('\n').map((line, index) => {
            // Handle different types of content formatting
            if (line.startsWith('**') && line.endsWith('**')) {
              // Bold headers
              return (
                <h3 key={index} className="discussion-section-header">
                  {line.replace(/\*\*/g, '')}
                </h3>
              );
            } else if (line.startsWith('- ')) {
              // Bullet points
              return (
                <div key={index} className="discussion-bullet-point">
                  <CheckCircle size={16} className="bullet-icon" />
                  <span>{line.substring(2)}</span>
                </div>
              );
            } else if (line.startsWith('1. ') || line.startsWith('2. ') || line.startsWith('3. ') || line.startsWith('4. ')) {
              // Numbered lists
              return (
                <div key={index} className="discussion-numbered-item">
                  <div className="number-badge">
                    {line.split('.')[0]}
                  </div>
                  <span>{line.substring(3)}</span>
                </div>
              );
            } else if (line.trim() === '') {
              // Empty lines for spacing
              return <br key={index} />;
            } else if (line.includes('**') && !line.startsWith('**')) {
              // Inline bold text
              const parts = line.split('**');
              return (
                <p key={index} className="discussion-paragraph">
                  {parts.map((part, partIndex) => 
                    partIndex % 2 === 1 ? (
                      <strong key={partIndex}>{part}</strong>
                    ) : (
                      part
                    )
                  )}
                </p>
              );
            } else {
              // Regular paragraphs
              return (
                <p key={index} className="discussion-paragraph">
                  {line}
                </p>
              );
            }
          })}
        </div>
      </div>

      <div className="discussion-tips">
        <div className="tips-header">
          <Lightbulb size={20} />
          <h4>Discussion Facilitation Tips</h4>
        </div>
        <div className="tips-content">
          <div className="tip-item">
            <Clock size={16} />
            <span>Set clear time limits for each discussion phase</span>
          </div>
          <div className="tip-item">
            <Target size={16} />
            <span>Keep discussions focused on learning objectives</span>
          </div>
          <div className="tip-item">
            <MessageCircle size={16} />
            <span>Encourage all students to participate actively</span>
          </div>
          <div className="tip-item">
            <Users size={16} />
            <span>Monitor group dynamics and provide support as needed</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupDiscussionDisplay;
