import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import TopicSidebar from './TopicSidebar';
import TopicTabbedView from './TopicTabbedView';
import NewTopicPanel from './NewTopicPanel';
import { Topic } from '../types';
import '../styles/TopicSplitView.css';

const TopicSplitView: React.FC = () => {
  const { currentPath, loading, refreshTopics, setCurrentPath } = useApp();
  const { subject } = currentPath;
  const [selectedTopicId, setSelectedTopicId] = useState<string | undefined>(undefined);
  const [isCreatingNewTopic, setIsCreatingNewTopic] = useState(false);

  // Get topics from the current subject
  const topics = subject?.topics || [];
  
  // Find the selected topic by ID to ensure it's always current
  const selectedTopic = selectedTopicId ? topics.find(topic => topic.id === selectedTopicId) : undefined;

  // Sync selectedTopicId with currentPath.topic when topics change
  useEffect(() => {
    if (currentPath.topic && topics.length > 0) {
      const topicExists = topics.find(t => t.id === currentPath.topic?.id);
      if (topicExists && selectedTopicId !== currentPath.topic.id) {
        setSelectedTopicId(currentPath.topic.id);
      }
    }
  }, [currentPath.topic, topics, selectedTopicId]);

  // Auto-select first topic if no topic is selected and topics are available
  useEffect(() => {
    if (!selectedTopicId && !isCreatingNewTopic && topics.length > 0) {
      const firstTopic = topics[0];
      setSelectedTopicId(firstTopic.id);
      setCurrentPath({ ...currentPath, topic: firstTopic });
    }
  }, [topics, selectedTopicId, isCreatingNewTopic, currentPath, setCurrentPath]);

  // Update selectedTopic when currentPath.topic changes (for updates)
  useEffect(() => {
    if (currentPath.topic && currentPath.topic.id === selectedTopicId) {
      // The selectedTopic is already computed from selectedTopicId and topics
      // This effect ensures the component re-renders when currentPath.topic updates
    }
  }, [currentPath.topic, selectedTopicId]);

  if (!subject) return null;

  const handleTopicSelect = (topic: Topic) => {
    setSelectedTopicId(topic.id);
    setIsCreatingNewTopic(false);
    // Also update the currentPath to include the selected topic
    setCurrentPath({ ...currentPath, topic });
  };

  const handleNewTopicClick = () => {
    setIsCreatingNewTopic(true);
    setSelectedTopicId(undefined);
    // Clear topic from currentPath when creating new topic
    setCurrentPath({ ...currentPath, topic: undefined });
  };

  const handleTopicsCreated = async (newTopics: Topic[]) => {
    await refreshTopics();
    // Select the first new topic if any were created
    if (newTopics.length > 0) {
      setSelectedTopicId(newTopics[0].id);
      // Update currentPath with the new topic
      setCurrentPath({ ...currentPath, topic: newTopics[0] });
    }
    setIsCreatingNewTopic(false);
  };

  const handleNewTopicCreated = (newTopic: Topic) => {
    // Set the newly created topic as selected
    setSelectedTopicId(newTopic.id);
    // Update currentPath with the new topic
    setCurrentPath({ ...currentPath, topic: newTopic });
    // Close the new topic panel
    setIsCreatingNewTopic(false);
  };

  const handleTopicDeleted = () => {
    setSelectedTopicId(undefined);
    setIsCreatingNewTopic(false);
    // Clear topic from currentPath when topic is deleted
    setCurrentPath({ ...currentPath, topic: undefined });
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
        {isCreatingNewTopic ? (
          <NewTopicPanel
            subjectId={subject.id}
            subjectName={subject.name}
            onCancel={() => setIsCreatingNewTopic(false)}
            onTopicCreated={handleNewTopicCreated}
          />
        ) : selectedTopic ? (
          <TopicTabbedView
            key={selectedTopic.id}
            topic={selectedTopic}
            onTopicDeleted={handleTopicDeleted}
          />
        ) : (
          <div className="empty-main-content">
            <h3>No Topics Available</h3>
            <p>Create your first topic to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TopicSplitView;
