import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import TopicSidebar from './TopicSidebar';
import TopicTabbedView from './TopicTabbedView';
import { Topic } from '../types';
import '../styles/TopicSplitView.css';

const TopicSplitView: React.FC = () => {
  const { currentPath, loading, refreshTopics } = useApp();
  const { subject } = currentPath;
  const [selectedTopic, setSelectedTopic] = useState<Topic | undefined>(undefined);
  const [isCreatingNewTopic, setIsCreatingNewTopic] = useState(false);

  if (!subject) return null;

  // Get topics from the current subject
  const topics = subject.topics || [];

  const handleTopicSelect = (topic: Topic) => {
    setSelectedTopic(topic);
    setIsCreatingNewTopic(false);
  };

  const handleNewTopicClick = () => {
    setIsCreatingNewTopic(true);
    setSelectedTopic(undefined);
  };

  const handleTopicsCreated = async (newTopics: Topic[]) => {
    await refreshTopics();
    // Select the first new topic if any were created
    if (newTopics.length > 0) {
      setSelectedTopic(newTopics[0]);
    }
    setIsCreatingNewTopic(false);
  };

  const handleTopicDeleted = () => {
    setSelectedTopic(undefined);
    setIsCreatingNewTopic(false);
  };

  return (
    <div className="topic-split-view">
      <div className="split-sidebar">
        <TopicSidebar
          topics={topics}
          selectedTopic={selectedTopic}
          onTopicSelect={handleTopicSelect}
          onNewTopicClick={handleNewTopicClick}
          subjectId={subject.id}
          subjectName={subject.name}
          isCreatingNewTopic={isCreatingNewTopic}
          subject={subject}
          class={currentPath.class}
          school={currentPath.school}
          onTopicsCreated={handleTopicsCreated}
          loading={loading}
        />
      </div>
      
      <div className="split-main">
        {selectedTopic ? (
          <TopicTabbedView
            topic={selectedTopic}
            onTopicDeleted={handleTopicDeleted}
          />
        ) : isCreatingNewTopic ? (
          <div className="empty-main-content">
            <h3>Creating New Topic</h3>
            <p>Use the form in the sidebar to create a new topic.</p>
          </div>
        ) : (
          <div className="empty-main-content">
            <h3>Select a Topic</h3>
            <p>Choose a topic from the sidebar to view its details, or create a new one.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TopicSplitView;
