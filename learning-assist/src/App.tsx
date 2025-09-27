import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Breadcrumb from './components/Breadcrumb';
import SearchBar from './components/SearchBar';
import ThemeToggle from './components/ThemeToggle';
import SchoolList from './components/SchoolList';
import ClassList from './components/ClassList';
import SubjectList from './components/SubjectList';
import TopicList from './components/TopicList';
import ProtectedRoute from './components/ProtectedRoute';
import TeacherTraining from './components/TeacherTraining';
import { GraduationCap, Home } from 'lucide-react';
import './App.css';
import './styles/Auth.css';

const AppContent: React.FC = () => {
  const { currentPath, loading, classLoading } = useApp();
  const { user, logout } = useAuth();
  const { school, class: cls, subject } = currentPath;
  const [showTraining, setShowTraining] = useState(false);

  const renderContent = () => {
    if (showTraining) {
      return <TeacherTraining />;
    } else if (!school) {
      return <SchoolList />;
    } else if (!cls) {
      return <ClassList />;
    } else if (!subject) {
      return <SubjectList />;
    } else {
      return <TopicList />;
    }
  };

  const renderLoadingContent = () => {
    return (
      <div className="content-loading">
        <div className="loading-animation">
          <div className="loading-spinner"></div>
          <div className="loading-text">
            <h3>Loading Content</h3>
            <p>Please wait while we prepare your learning materials...</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="header-title">
            <h1>Sprout AI</h1>
            <p>AI-Powered Learning Assistant for Personalized Education</p>
          </div>
          <div className="header-actions">
            <SearchBar />
            {user && (
              <div className="user-info">
                <button 
                  onClick={() => setShowTraining(!showTraining)} 
                  className={`nav-button ${showTraining ? 'active' : ''}`}
                  title={showTraining ? 'Back to Main' : 'Teacher Training'}
                >
                  {showTraining ? <Home size={16} /> : <GraduationCap size={16} />}
                  {showTraining ? 'Back to Main' : 'Training'}
                </button>
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
          <div className="theme-toggle-container">
            <ThemeToggle />
          </div>
        </div>
        <Breadcrumb />
      </header>

      <main className="app-main">
        {(loading || classLoading) ? renderLoadingContent() : renderContent()}
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ProtectedRoute>
          <AppProvider>
            <AppContent />
          </AppProvider>
        </ProtectedRoute>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;