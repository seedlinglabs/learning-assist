import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { useApp } from '../context/AppContext';

const Breadcrumb: React.FC = () => {
  const { currentPath, setCurrentPath } = useApp();
  const { school, class: cls, subject, topic } = currentPath;

  const handleNavigate = (level: 'home' | 'school' | 'class' | 'subject') => {
    switch (level) {
      case 'home':
        setCurrentPath({});
        break;
      case 'school':
        setCurrentPath({ school });
        break;
      case 'class':
        setCurrentPath({ school, class: cls });
        break;
      case 'subject':
        setCurrentPath({ school, class: cls, subject });
        break;
    }
  };

  return (
    <nav className="breadcrumb">
      <div className="breadcrumb-container">
        <button
          onClick={() => handleNavigate('home')}
          className={`breadcrumb-item ${!school ? 'active' : ''}`}
        >
          <Home size={16} />
          <span>Home</span>
        </button>

        {school && (
          <>
            <ChevronRight size={16} className="breadcrumb-separator" />
            <button
              onClick={() => handleNavigate('school')}
              className={`breadcrumb-item ${!cls ? 'active' : ''}`}
            >
              {school.name}
            </button>
          </>
        )}

        {cls && (
          <>
            <ChevronRight size={16} className="breadcrumb-separator" />
            <button
              onClick={() => handleNavigate('class')}
              className={`breadcrumb-item ${!subject ? 'active' : ''}`}
            >
              {cls.name}
            </button>
          </>
        )}

        {subject && (
          <>
            <ChevronRight size={16} className="breadcrumb-separator" />
            <button
              onClick={() => handleNavigate('subject')}
              className={`breadcrumb-item ${!topic ? 'active' : ''}`}
            >
              {subject.name}
            </button>
          </>
        )}

        {topic && (
          <>
            <ChevronRight size={16} className="breadcrumb-separator" />
            <span className="breadcrumb-item active">
              {topic.name}
            </span>
          </>
        )}
      </div>
    </nav>
  );
};

export default Breadcrumb;