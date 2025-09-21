import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Breadcrumb from './components/Breadcrumb';
import SearchBar from './components/SearchBar';
import SchoolList from './components/SchoolList';
import ClassList from './components/ClassList';
import SubjectList from './components/SubjectList';
import TopicList from './components/TopicList';
import ProtectedRoute from './components/ProtectedRoute';
import LoginForm from './components/LoginForm';
import './App.css';
import './styles/Auth.css';

const AppContent: React.FC = () => {
  const { currentPath } = useApp();
  const { user, logout } = useAuth();
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
          <div className="header-actions">
            <SearchBar />
            {user && (
              <div className="user-info">
                <span className={`user-type-badge user-type-${user.user_type}`}>
                  {user.user_type}
                </span>
                <span className="user-name">{user.name}</span>
                <button onClick={logout} className="logout-btn">
                  Logout
                </button>
              </div>
            )}
          </div>
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
    <AuthProvider>
      <ProtectedRoute>
        <AppProvider>
          <AppContent />
        </AppProvider>
      </ProtectedRoute>
    </AuthProvider>
  );
};

export default App;