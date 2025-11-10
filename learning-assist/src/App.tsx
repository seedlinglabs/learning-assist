import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import Breadcrumb from './components/Breadcrumb';
import SearchBar from './components/SearchBar';
import ThemeToggle from './components/ThemeToggle';
import CommandPalette from './components/CommandPalette';
import SchoolList from './components/SchoolList';
import ClassList from './components/ClassList';
import SubjectList from './components/SubjectList';
import TopicList from './components/TopicList';
import ProtectedRoute from './components/ProtectedRoute';
import TeacherTraining from './components/TeacherTraining';
import AdminDashboard from './components/AdminDashboard';
import AcademicRecordsManager from './components/AcademicRecordsManager';
import { GraduationCap, Home, Shield, LogOut, Loader2 } from 'lucide-react';
import './App.css';
import './styles/Auth.css';

const AppContent: React.FC = () => {
  const { currentPath, loading, classLoading } = useApp();
  const { user, logout } = useAuth();
  const { school, class: cls, subject } = currentPath;
  const [showTraining, setShowTraining] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminView, setAdminView] = useState<string>('dashboard');
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  const isAdmin = user?.user_type === 'admin';

  // Command Palette keyboard shortcut (Cmd+K or Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

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
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="flex flex-col items-center gap-6 p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 max-w-md w-full">
          <Loader2 className="w-14 h-14 text-primary-600 dark:text-primary-400 animate-spin" />
          <div className="text-center space-y-2">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Loading Content
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Please wait while we prepare your learning materials...
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Modern Header with Glassmorphism */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-700/50 shadow-lg">
        <div className="w-full px-6 lg:px-8">
          {/* Top Bar */}
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Left: Logo and Title */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-500 bg-clip-text text-transparent">
                  Sprout AI
                </h1>
              </div>
              <div className="hidden lg:block text-sm text-gray-600 dark:text-gray-400 border-l border-gray-300 dark:border-gray-600 pl-3">
                AI-Powered Learning Assistant
              </div>
            </div>

            {/* Center: Search Bar */}
            <div className="flex-1 max-w-2xl mx-4">
              <SearchBar />
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <ThemeToggle />
              
              {user && (
                <>
                  {/* Navigation Buttons */}
                  <div className="hidden md:flex items-center gap-2">
                    {isAdmin && (
                      <button
                        onClick={() => {
                          setShowAdmin(!showAdmin);
                          setShowTraining(false);
                          if (!showAdmin) setAdminView('dashboard');
                        }}
                        className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          showAdmin
                            ? 'bg-primary-600 text-white shadow-md'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                        title={showAdmin ? 'Back to Main' : 'Admin Panel'}
                      >
                        {showAdmin ? <Home size={16} /> : <Shield size={16} />}
                        <span className="hidden lg:inline">{showAdmin ? 'Main' : 'Admin'}</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setShowTraining(!showTraining);
                        setShowAdmin(false);
                      }}
                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        showTraining
                          ? 'bg-primary-600 text-white shadow-md'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                      title={showTraining ? 'Back to Main' : 'Teacher Training'}
                    >
                      {showTraining ? <Home size={16} /> : <GraduationCap size={16} />}
                      <span className="hidden lg:inline">{showTraining ? 'Main' : 'Training'}</span>
                    </button>
                  </div>

                  {/* User Info */}
                  <div className="flex items-center gap-3 pl-3 border-l border-gray-300 dark:border-gray-600">
                    <div className="hidden sm:flex flex-col items-end">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {user.name}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        user.user_type === 'admin'
                          ? 'bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400'
                          : user.user_type === 'teacher'
                          ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                          : 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400'
                      }`}>
                        {user.user_type}
                      </span>
                    </div>
                    <button
                      onClick={logout}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:text-error-600 dark:hover:text-error-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all duration-200"
                      title="Logout"
                    >
                      <LogOut size={18} />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Breadcrumb */}
          <Breadcrumb />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full">
        <div className="w-full px-6 lg:px-8 py-6">
          {(loading || classLoading) ? renderLoadingContent() : renderContent()}
        </div>
      </main>

      {/* Command Palette */}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
      />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <ProtectedRoute>
            <AppProvider>
              <AppContent />
            </AppProvider>
          </ProtectedRoute>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
};

export default App;