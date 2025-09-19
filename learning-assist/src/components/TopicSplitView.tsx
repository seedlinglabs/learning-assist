import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Topic } from '../types';
import TopicSidebar from './TopicSidebar';
import TopicDetailPanel from './TopicDetailPanel';
import '../styles/TopicSplitView.css';

const TopicSplitView: React.FC = () => {
  const { currentPath } = useApp();
  const { school, class: cls, subject } = currentPath;
  const [selectedTopic, setSelectedTopic] = useState<Topic | undefined>();

  // Auto-select first topic when topics change
  useEffect(() => {
    if (subject?.topics && subject.topics.length > 0 && !selectedTopic) {
      setSelectedTopic(subject.topics[0]);
    } else if (subject?.topics && subject.topics.length === 0) {
      setSelectedTopic(undefined);
    } else if (selectedTopic && subject?.topics) {
      // Update selected topic with latest data
      const updatedTopic = subject.topics.find(t => t.id === selectedTopic.id);
      if (updatedTopic) {
        setSelectedTopic(updatedTopic);
      } else {
        // Topic was deleted, select first available or none
        setSelectedTopic(subject.topics.length > 0 ? subject.topics[0] : undefined);
      }
    }
  }, [subject?.topics, selectedTopic]);

  if (!school || !cls || !subject) {
    return null;
  }

  const handleTopicDeleted = () => {
    setSelectedTopic(undefined);
  };

  return (
    <div className="topic-split-view">
      <div className="split-sidebar">
        <TopicSidebar
          topics={subject.topics}
          selectedTopic={selectedTopic}
          onTopicSelect={setSelectedTopic}
          subjectId={subject.id}
          subjectName={subject.name}
        />
      </div>
      <div className="split-main">
        {selectedTopic ? (
          <TopicDetailPanel
            topic={selectedTopic}
            onTopicDeleted={handleTopicDeleted}
          />
        ) : (
          <div className="no-topic-selected">
            <div className="empty-state-large">
              <div className="empty-icon">📚</div>
              <h3>Select a topic to view details</h3>
              <p>Choose a topic from the sidebar to view and edit its content, documents, and AI-generated summary.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TopicSplitView;
