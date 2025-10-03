import React, { useState, useEffect } from 'react';
import { Parent } from './types';
import { AuthService } from './services/authService';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import './App.css';

type AppState = 'loading' | 'login' | 'dashboard';

function App() {
  const [appState, setAppState] = useState<AppState>('loading');
  const [user, setUser] = useState<Parent | null>(null);

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
    setAppState('login');
  };

  if (appState === 'loading') {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <span>Loading...</span>
      </div>
    );
  }

  if (appState === 'login') {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  if (appState === 'dashboard' && user) {
    return (
      <>
        <Dashboard
          user={user}
          onLogout={handleLogout}
        />
        <PWAInstallPrompt />
      </>
    );
  }

  return null;
}

export default App;