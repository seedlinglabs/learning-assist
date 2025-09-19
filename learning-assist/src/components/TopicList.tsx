import React from 'react';
import { useApp } from '../context/AppContext';
import TopicSplitView from './TopicSplitView';

const TopicList: React.FC = () => {
  const { currentPath } = useApp();
  const { school, class: cls, subject } = currentPath;

  if (!school || !cls || !subject) return null;

  return <TopicSplitView />;
};

export default TopicList;