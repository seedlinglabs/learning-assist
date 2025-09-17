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
    <div className="search-container">
      <div className="search-input-container">
        <Search size={20} className="search-icon" />
        <input
          type="text"
          placeholder="Search topics, subjects, classes..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="search-input"
        />
        {searchQuery && (
          <button onClick={handleClearSearch} className="clear-search">
            <X size={16} />
          </button>
        )}
      </div>

      {isSearchOpen && searchResults.length > 0 && (
        <div className="search-results">
          {searchResults.map((result, index) => (
            <button
              key={index}
              onClick={() => handleResultClick(result)}
              className="search-result-item"
            >
              <div className="search-result-icon">
                {getResultIcon(result.type)}
              </div>
              <div className="search-result-content">
                <div className="search-result-title">
                  {result.item.name}
                </div>
                <div className="search-result-path">
                  {getResultPath(result)} • {result.type}
                </div>
                {result.item.description && (
                  <div className="search-result-description">
                    {result.item.description}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {isSearchOpen && searchResults.length === 0 && searchQuery.trim() && (
        <div className="search-results">
          <div className="search-no-results">
            No results found for "{searchQuery}"
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchBar;