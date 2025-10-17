import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Breadcrumb from './components/Breadcrumb';
import SearchBar from './components/SearchBar';
import ThemeToggle from './components/ThemeToggle';
// import ModelSelector from './components/ModelSelector'; // Commented out - no logic implemented
import SchoolList from './components/SchoolList';
import ClassList from './components/ClassList';
import SubjectList from './components/SubjectList';
import TopicList from './components/TopicList';
import ProtectedRoute from './components/ProtectedRoute';
import TeacherTraining from './components/TeacherTraining';
import AdminDashboard from './components/AdminDashboard';
import AcademicRecordsManager from './components/AcademicRecordsManager';
import { GraduationCap, Home, Shield } from 'lucide-react';
import './App.css';
import './styles/Auth.css';

const AppContent: React.FC = () => {
  const { currentPath, loading, classLoading } = useApp();
  const { user, logout } = useAuth();
  const { school, class: cls, subject } = currentPath;
  const [showTraining, setShowTraining] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminView, setAdminView] = useState<string>('dashboard');

  const isAdmin = user?.user_type === 'admin';

  const handleAdminNavigation = (view: string) => {
    setAdminView(view);
  };

  const renderContent = () => {
    if (showAdmin && isAdmin) {
      if (adminView === 'dashboard') {
        return <AdminDashboard onNavigate={handleAdminNavigation} />;
      } else if (adminView === 'academic-records') {
        return <AcademicRecordsManager onBack={() => setAdminView('dashboard')} />;
      }
    } else if (showTraining) {
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
          <div className="header-top">
            <div className="header-title">
              <h1>Sprout AI</h1>
              <p>AI-Powered Learning Assistant for Personalized Education</p>
            </div>
            <div className="header-actions">
              <SearchBar />
              {/* <ModelSelector /> */} {/* Commented out - no logic implemented */}
              {user && (
                <div className="user-info">
                  {isAdmin && (
                    <button 
                      onClick={() => {
                        setShowAdmin(!showAdmin);
                        setShowTraining(false);
                        if (!showAdmin) setAdminView('dashboard');
                      }} 
                      className={`nav-button ${showAdmin ? 'active' : ''}`}
                      title={showAdmin ? 'Back to Main' : 'Admin Panel'}
                    >
                      {showAdmin ? <Home size={16} /> : <Shield size={16} />}
                      {showAdmin ? 'Back to Main' : 'Admin'}
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      setShowTraining(!showTraining);
                      setShowAdmin(false);
                    }} 
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