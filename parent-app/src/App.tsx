import React, { useState, useEffect } from 'react';
import { Parent, Topic } from './types';
import { AuthService } from './services/authService';
import LoginForm from './components/LoginForm';
import Dashboard from './components/Dashboard';
import TopicDetail from './components/TopicDetail';
import './styles/globals.css';

type AppState = 'loading' | 'login' | 'dashboard' | 'topic-detail';

function App() {
  const [appState, setAppState] = useState<AppState>('loading');
  const [user, setUser] = useState<Parent | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      if (AuthService.isAuthenticated()) {
        const verification = await AuthService.verifyToken();
        if (verification.valid && verification.user) {
          setUser(verification.user);
          setAppState('dashboard');
        } else {
          setAppState('login');
        }
      } else {
        setAppState('login');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setAppState('login');
    }
  };

  const handleLoginSuccess = (userData: Parent) => {
    setUser(userData);
    setAppState('dashboard');
  };

  const handleLogout = async () => {
    await AuthService.logout();
    setUser(null);
    setSelectedTopic(null);
    setAppState('login');
  };

  const handleTopicSelect = (topic: Topic) => {
    setSelectedTopic(topic);
    setAppState('topic-detail');
  };

  const handleBackToDashboard = () => {
    setSelectedTopic(null);
    setAppState('dashboard');
  };

  if (appState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (appState === 'login') {
    return <LoginForm onLoginSuccess={handleLoginSuccess} />;
  }

  if (appState === 'dashboard' && user) {
    return (
      <Dashboard
        user={user}
        onLogout={handleLogout}
        onTopicSelect={handleTopicSelect}
      />
    );
  }

  if (appState === 'topic-detail' && selectedTopic) {
    return (
      <TopicDetail
        topic={selectedTopic}
        onBack={handleBackToDashboard}
      />
    );
  }

  return null;
}

export default App;
