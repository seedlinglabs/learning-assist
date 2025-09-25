import React, { useState } from 'react';
import { FileText, Plus, Search, Calendar, Sparkles } from 'lucide-react';
import { Topic } from '../types';
import ChapterPlannerModal from './ChapterPlannerModal';

interface TopicSidebarProps {
  topics: Topic[];
  selectedTopic?: Topic;
  onTopicSelect: (topic: Topic) => void;
  onNewTopicClick: () => void;
  subjectId: string;
  subjectName: string;
  isCreatingNewTopic?: boolean;
  subject: any;
  class: any;
  school: any;
  onTopicsCreated: (topics: Topic[]) => void;
}

const TopicSidebar: React.FC<TopicSidebarProps> = ({ 
  topics, 
  selectedTopic, 
  onTopicSelect, 
  onNewTopicClick,
  subjectId, 
  subjectName,
  isCreatingNewTopic = false,
  subject,
  class: cls,
  school,
  onTopicsCreated
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showChapterPlanner, setShowChapterPlanner] = useState(false);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric'
    }).format(new Date(date));
  };

  const filteredTopics = topics.filter(topic =>
    topic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (topic.description && topic.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="topic-sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title">
          <h3>{subjectName} Topics</h3>
          <span className="topic-count">{topics.length}</span>
        </div>
        <div className="sidebar-actions">
          <button
            onClick={() => setShowChapterPlanner(true)}
            className="btn btn-secondary btn-sm"
            title="Chapter Planner"
          >
            <Sparkles size={16} />
          </button>
          <button
            onClick={onNewTopicClick}
            className={`btn btn-primary btn-sm ${isCreatingNewTopic ? 'active' : ''}`}
            title="Add new topic"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      <div className="sidebar-search">
        <div className="search-input-container">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      <div className="sidebar-content">
        {filteredTopics.length === 0 ? (
          <div className="empty-sidebar">
            {searchQuery ? (
              <div className="no-results">
                <Search size={32} />
                <p>No topics found matching "{searchQuery}"</p>
              </div>
            ) : (
              <div className="no-topics">
                <FileText size={32} />
                <p>No topics yet</p>
                <button
                  onClick={onNewTopicClick}
                  className="btn btn-primary btn-sm"
                >
                  <Plus size={16} />
                  Add First Topic
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="topic-list">
            {filteredTopics.map((topic) => (
              <div
                key={topic.id}
                className={`topic-item ${selectedTopic?.id === topic.id && !isCreatingNewTopic ? 'selected' : ''}`}
                onClick={() => onTopicSelect(topic)}
              >
                <div className="topic-item-header">
                  <FileText size={16} />
                  <span className="topic-name">{topic.name}</span>
                </div>
                {topic.description && (
                  <p className="topic-preview">
                    {topic.description.length > 60 
                      ? `${topic.description.substring(0, 60)}...`
                      : topic.description
                    }
                  </p>
                )}
                {topic.aiContent && topic.aiContent.lessonPlan && (
                  <div className="topic-summary-badge">
                    ✨ Has AI Content
                  </div>
                )}
                <div className="topic-item-meta">
                  <Calendar size={12} />
                  <span>{formatDate(topic.updatedAt)}</span>
                  {topic.documentLinks && topic.documentLinks.length > 0 && (
                    <span className="doc-count">
                      {topic.documentLinks.length} doc{topic.documentLinks.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showChapterPlanner && (
        <ChapterPlannerModal
          subject={subject}
          class={cls}
          school={school}
          onClose={() => setShowChapterPlanner(false)}
          onTopicsCreated={onTopicsCreated}
        />
      )}
    </div>
  );
};

export default TopicSidebar;
