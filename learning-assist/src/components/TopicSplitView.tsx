import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Topic } from '../types';
import TopicSidebar from './TopicSidebar';
import TopicTabbedView from './TopicTabbedView';
import NewTopicPanel from './NewTopicPanel';
import '../styles/TopicSplitView.css';

const TopicSplitView: React.FC = () => {
  const { currentPath, refreshTopics, loading, selectedTopicId, setSelectedTopicId } = useApp();
  const { school, class: cls, subject } = currentPath;
  const [selectedTopic, setSelectedTopic] = useState<Topic | undefined>();
  const [isCreatingNewTopic, setIsCreatingNewTopic] = useState(false);

  // Sort topics alphabetically by name
  const sortedTopics = [...(subject?.topics || [])].sort((a, b) => 
    a.name.toLowerCase().localeCompare(b.name.toLowerCase())
  );

  // Handle topic selection and updates when topics change
  useEffect(() => {
    if (isCreatingNewTopic) return; // Don't auto-select when creating new topic

    if (sortedTopics.length === 0) {
      setSelectedTopic(undefined);
      setSelectedTopicId(null);
      return;
    }

    // If we have a selected topic ID from context, try to find and select it
    if (selectedTopicId) {
      const topicFromContext = sortedTopics.find(t => t.id === selectedTopicId);
      if (topicFromContext) {
        setSelectedTopic(topicFromContext);
        return;
      }
    }

    // If no topic selected or context topic not found, auto-select first one
    if (!selectedTopic) {
      const firstTopic = sortedTopics[0];
      setSelectedTopic(firstTopic);
      setSelectedTopicId(firstTopic.id);
      return;
    }

    // Check if currently selected topic still exists and update it
    const updatedTopic = sortedTopics.find(t => t.id === selectedTopic.id);
    if (updatedTopic) {
      // Topic exists, update with latest data
      setSelectedTopic(updatedTopic);
      setSelectedTopicId(updatedTopic.id);
    } else {
      // Topic was deleted, select first available
      const firstTopic = sortedTopics[0];
      setSelectedTopic(firstTopic);
      setSelectedTopicId(firstTopic.id);
    }
  }, [sortedTopics, isCreatingNewTopic, selectedTopicId]);

  // Update selectedTopic when currentPath.topic changes (for updates)
  useEffect(() => {
    if (currentPath.topic && currentPath.topic.id === selectedTopicId) {
      setSelectedTopic(currentPath.topic);
    }
  }, [currentPath.topic, selectedTopicId]);

  if (!school || !cls || !subject) {
    return null;
  }

  const handleTopicDeleted = () => {
    setSelectedTopic(undefined);
    setSelectedTopicId(null);
  };

  const handleNewTopicClick = () => {
    setSelectedTopic(undefined);
    setSelectedTopicId(null);
    setIsCreatingNewTopic(true);
  };

  const handleNewTopicCancel = () => {
    setIsCreatingNewTopic(false);
    // Auto-select first topic if available
    if (sortedTopics.length > 0) {
      const firstTopic = sortedTopics[0];
      setSelectedTopic(firstTopic);
      setSelectedTopicId(firstTopic.id);
    }
  };

  const handleTopicCreated = () => {
    setIsCreatingNewTopic(false);
    // The newly created topic will be auto-selected by the useEffect
  };

  const handleTopicSelect = (topic: Topic) => {
    setIsCreatingNewTopic(false);
    setSelectedTopic(topic);
    setSelectedTopicId(topic.id);
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
            key={selectedTopic.id}
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
