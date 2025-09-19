import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Topic } from '../types';
import TopicSidebar from './TopicSidebar';
import TopicDetailPanel from './TopicDetailPanel';
import NewTopicPanel from './NewTopicPanel';
import '../styles/TopicSplitView.css';

const TopicSplitView: React.FC = () => {
  const { currentPath } = useApp();
  const { school, class: cls, subject } = currentPath;
  const [selectedTopic, setSelectedTopic] = useState<Topic | undefined>();
  const [isCreatingNewTopic, setIsCreatingNewTopic] = useState(false);

  // Auto-select first topic when topics change
  useEffect(() => {
    if (isCreatingNewTopic) return; // Don't auto-select when creating new topic

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
  }, [subject?.topics, selectedTopic, isCreatingNewTopic]);

  if (!school || !cls || !subject) {
    return null;
  }

  const handleTopicDeleted = () => {
    setSelectedTopic(undefined);
  };

  const handleNewTopicClick = () => {
    setSelectedTopic(undefined);
    setIsCreatingNewTopic(true);
  };

  const handleNewTopicCancel = () => {
    setIsCreatingNewTopic(false);
    // Auto-select first topic if available
    if (subject?.topics && subject.topics.length > 0) {
      setSelectedTopic(subject.topics[0]);
    }
  };

  const handleTopicCreated = () => {
    setIsCreatingNewTopic(false);
    // The newly created topic will be auto-selected by the useEffect
  };

  const handleTopicSelect = (topic: Topic) => {
    setIsCreatingNewTopic(false);
    setSelectedTopic(topic);
  };

  return (
    <div className="topic-split-view">
      <div className="split-sidebar">
        <TopicSidebar
          topics={subject.topics}
          selectedTopic={isCreatingNewTopic ? undefined : selectedTopic}
          onTopicSelect={handleTopicSelect}
          onNewTopicClick={handleNewTopicClick}
          subjectId={subject.id}
          subjectName={subject.name}
          isCreatingNewTopic={isCreatingNewTopic}
        />
      </div>
      <div className="split-main">
        {isCreatingNewTopic ? (
          <NewTopicPanel
            subjectId={subject.id}
            subjectName={subject.name}
            onCancel={handleNewTopicCancel}
            onTopicCreated={handleTopicCreated}
          />
        ) : selectedTopic ? (
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
