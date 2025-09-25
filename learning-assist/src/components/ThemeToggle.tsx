import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import './ThemeToggle.css';

interface ThemeToggleProps {
  className?: string;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '' }) => {
  const { toggleTheme, isDark } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`theme-toggle ${className}`}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      type="button"
    >
      <div className="theme-toggle-container">
        <div className={`theme-icon ${isDark ? 'dark' : 'light'}`}>
          {isDark ? (
            <Moon size={16} className="moon-icon" />
          ) : (
            <Sun size={16} className="sun-icon" />
          )}
        </div>
        <span className="theme-toggle-text">
          {isDark ? 'Dark' : 'Light'}
        </span>
      </div>
    </button>
  );
};

export default ThemeToggle;
