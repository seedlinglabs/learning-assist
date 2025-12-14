import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

const SearchBar: React.FC = () => {
  const { searchQuery, setSearchQuery, performSearch, searchResults, setCurrentPath } = useApp();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    if (searchQuery.trim()) {
      performSearch(searchQuery);
      setIsSearchOpen(true);
    } else {
      setIsSearchOpen(false);
    }
  }, [searchQuery, performSearch]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setIsSearchOpen(false);
  };

  const handleResultClick = (result: any) => {
    setCurrentPath(result.path);
    setSearchQuery('');
    setIsSearchOpen(false);
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'school': return '🏫';
      case 'class': return '🎓';
      case 'subject': return '📚';
      case 'topic': return '📝';
      default: return '📄';
    }
  };

  const getResultPath = (result: any) => {
    const parts = [];
    if (result.path.school) parts.push(result.path.school.name);
    if (result.path.class) parts.push(result.path.class.name);
    if (result.path.subject) parts.push(result.path.subject.name);
    return parts.join(' > ');
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none">
          <Search size={18} />
        </div>
        <input
          type="text"
          placeholder="Search topics, subjects, classes..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="w-full pl-10 pr-10 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
        />
        {searchQuery && (
          <button
            onClick={handleClearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {isSearchOpen && searchResults.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 max-h-96 overflow-y-auto scrollbar-thin z-50">
          {searchResults.map((result, index) => (
            <button
              key={index}
              onClick={() => handleResultClick(result)}
              className="w-full flex items-start gap-3 p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-150 border-b border-gray-100 dark:border-gray-700/50 last:border-0"
            >
              <div className="text-2xl flex-shrink-0 mt-0.5">
                {getResultIcon(result.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  {result.item.name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {getResultPath(result)} • <span className="capitalize">{result.type}</span>
                </div>
                {result.item.description && (
                  <div className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                    {result.item.description}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {isSearchOpen && searchResults.length === 0 && searchQuery.trim() && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50">
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <Search size={48} className="mx-auto mb-3 opacity-30" />
            <p>No results found for <span className="font-semibold">"{searchQuery}"</span></p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchBar;