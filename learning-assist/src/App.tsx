import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Breadcrumb from './components/Breadcrumb';
import SearchBar from './components/SearchBar';
import SchoolList from './components/SchoolList';
import ClassList from './components/ClassList';
import SubjectList from './components/SubjectList';
import TopicList from './components/TopicList';
import './App.css';

const AppContent: React.FC = () => {
  const { currentPath } = useApp();
  const { school, class: cls, subject } = currentPath;

  const renderContent = () => {
    if (!school) {
      return <SchoolList />;
    } else if (!cls) {
      return <ClassList />;
    } else if (!subject) {
      return <SubjectList />;
    } else {
      return <TopicList />;
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="header-title">
            <h1>Learning Assistant</h1>
            <p>Navigate your educational content with NotebookLM integration</p>
          </div>
          <SearchBar />
        </div>
        <Breadcrumb />
      </header>

      <main className="app-main">
        {renderContent()}
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default App;