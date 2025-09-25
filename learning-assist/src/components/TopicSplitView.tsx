import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Topic } from '../types';
import TopicSidebar from './TopicSidebar';
import TopicTabbedView from './TopicTabbedView';
import NewTopicPanel from './NewTopicPanel';
import '../styles/TopicSplitView.css';

const TopicSplitView: React.FC = () => {
  const { currentPath, refreshTopics, loading } = useApp();
  const { school, class: cls, subject } = currentPath;
  const [selectedTopic, setSelectedTopic] = useState<Topic | undefined>();
  const [isCreatingNewTopic, setIsCreatingNewTopic] = useState(false);

  // Sort topics alphabetically by name
  const sortedTopics = [...(subject?.topics || [])].sort((a, b) => 
    a.name.toLowerCase().localeCompare(b.name.toLowerCase())
  );

  // Auto-select first topic when topics change
  useEffect(() => {
    if (isCreatingNewTopic) return; // Don't auto-select when creating new topic

    if (sortedTopics.length > 0 && !selectedTopic) {
      setSelectedTopic(sortedTopics[0]);
    } else if (sortedTopics.length === 0) {
      setSelectedTopic(undefined);
    } else if (selectedTopic && sortedTopics.length > 0) {
      // Update selected topic with latest data
      const updatedTopic = sortedTopics.find(t => t.id === selectedTopic.id);
      if (updatedTopic) {
        setSelectedTopic(updatedTopic);
      } else {
        // Topic was deleted, select first available or none
        setSelectedTopic(sortedTopics.length > 0 ? sortedTopics[0] : undefined);
      }
    }
  }, [sortedTopics, selectedTopic, isCreatingNewTopic]);

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
    if (sortedTopics.length > 0) {
      setSelectedTopic(sortedTopics[0]);
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

  const handleTopicsCreated = async (topics: Topic[]) => {
    // Refresh topics to show the newly created ones
    await refreshTopics();
  };

  return (
    <div className="topic-split-view">
      <div className="split-sidebar">
        <TopicSidebar
          topics={sortedTopics}
          selectedTopic={isCreatingNewTopic ? undefined : selectedTopic}
          onTopicSelect={handleTopicSelect}
          onNewTopicClick={handleNewTopicClick}
          subjectId={subject.id}
          subjectName={subject.name}
          isCreatingNewTopic={isCreatingNewTopic}
          subject={subject}
          class={cls}
          school={school}
          onTopicsCreated={handleTopicsCreated}
          loading={loading}
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
          <TopicTabbedView
            topic={selectedTopic}
            onTopicDeleted={handleTopicDeleted}
          />
        ) : (
          <div className="no-topic-selected">
            <div className="empty-state-large">
              <div className="empty-icon">📚</div>
              <h3>Select a topic to view details</h3>
              <p>Choose a topic from the sidebar to view and edit its content, documents, and AI-generated lesson plan.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TopicSplitView;
