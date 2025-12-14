import React, { useState, useEffect, useCallback } from 'react';
import { Search, School, GraduationCap, BookOpen, FileText, X, Command } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const { schools, setCurrentPath, performSearch, searchResults } = useApp();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Perform search when query changes
  useEffect(() => {
    if (query.trim()) {
      performSearch(query);
    }
  }, [query, performSearch]);

  // Reset when opened/closed
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(searchResults.length, 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + Math.max(searchResults.length, 1)) % Math.max(searchResults.length, 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (searchResults[selectedIndex]) {
          handleResultClick(searchResults[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }, [isOpen, searchResults, selectedIndex, onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleResultClick = (result: any) => {
    setCurrentPath(result.path);
    onClose();
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'school':
        return <School size={20} className="text-primary-600 dark:text-primary-400" />;
      case 'class':
        return <GraduationCap size={20} className="text-secondary-600 dark:text-secondary-400" />;
      case 'subject':
        return <BookOpen size={20} className="text-success-600 dark:text-success-400" />;
      case 'topic':
        return <FileText size={20} className="text-gray-600 dark:text-gray-400" />;
      default:
        return <FileText size={20} className="text-gray-600 dark:text-gray-400" />;
    }
  };

  const getResultPath = (result: any) => {
    const parts = [];
    if (result.path.school) parts.push(result.path.school.name);
    if (result.path.class) parts.push(result.path.class.name);
    if (result.path.subject) parts.push(result.path.subject.name);
    return parts.join(' → ');
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="relative border-b border-gray-200 dark:border-gray-700">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
            <Search size={20} />
          </div>
          <input
            type="text"
            placeholder="Search schools, classes, subjects, topics..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-12 pr-12 py-4 bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 text-lg focus:outline-none"
            autoFocus
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs font-medium rounded border border-gray-300 dark:border-gray-600">
              <Command size={10} />K
            </kbd>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto scrollbar-thin">
          {query.trim() && searchResults.length > 0 ? (
            <div className="py-2">
              {searchResults.map((result, index) => (
                <button
                  key={index}
                  onClick={() => handleResultClick(result)}
                  className={`w-full flex items-start gap-4 px-4 py-3 text-left transition-colors ${
                    index === selectedIndex
                      ? 'bg-primary-50 dark:bg-primary-900/30'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getResultIcon(result.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 dark:text-gray-100 mb-0.5">
                      {result.item.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {getResultPath(result)}
                      {result.path && ' → '}
                      <span className="capitalize font-medium">{result.type}</span>
                    </div>
                    {result.item.description && (
                      <div className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-1">
                        {result.item.description}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : query.trim() ? (
            <div className="py-12 text-center text-gray-500 dark:text-gray-400">
              <Search size={48} className="mx-auto mb-3 opacity-30" />
              <p>No results found for <span className="font-semibold">"{query}"</span></p>
            </div>
          ) : (
            <div className="py-8 px-4">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-2">
                Quick Navigation
              </div>
              <div className="space-y-1">
                <div className="px-2 py-2 text-sm text-gray-600 dark:text-gray-400">
                  Type to search across all schools, classes, subjects, and topics
                </div>
                <div className="px-2 py-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600 font-mono">↑↓</kbd>
                  Navigate
                </div>
                <div className="px-2 py-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600 font-mono">Enter</kbd>
                  Select
                </div>
                <div className="px-2 py-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600 font-mono">Esc</kbd>
                  Close
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;

