import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { useApp } from '../context/AppContext';

const Breadcrumb: React.FC = () => {
  const { currentPath, setCurrentPath } = useApp();
  const { school, class: cls, subject, topic } = currentPath;

  const handleNavigate = (level: 'home' | 'school' | 'class' | 'subject') => {
    console.log('Breadcrumb navigation:', level, 'Current path:', currentPath);
    
    switch (level) {
      case 'home':
        setCurrentPath({});
        break;
      case 'school':
        if (school) {
          setCurrentPath({ school });
        }
        break;
      case 'class':
        if (school && cls) {
          setCurrentPath({ school, class: cls });
        }
        break;
      case 'subject':
        if (school && cls && subject) {
          setCurrentPath({ school, class: cls, subject });
        }
        break;
    }
  };

  return (
    <nav className="py-3 overflow-x-auto scrollbar-thin" aria-label="Breadcrumb">
      <div className="flex items-center gap-2 min-w-max">
        <button
          type="button"
          onClick={() => handleNavigate('home')}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer ${
            !school
              ? 'bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
          aria-current={!school ? 'page' : undefined}
        >
          <Home size={16} />
          <span>Home</span>
        </button>

        {school && (
          <>
            <ChevronRight size={16} className="text-gray-400 dark:text-gray-600 flex-shrink-0" />
            <button
              type="button"
              onClick={() => handleNavigate('school')}
              className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer ${
                !cls
                  ? 'bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
              aria-current={!cls ? 'page' : undefined}
            >
              {school.name}
            </button>
          </>
        )}

        {cls && (
          <>
            <ChevronRight size={16} className="text-gray-400 dark:text-gray-600 flex-shrink-0" />
            <button
              type="button"
              onClick={() => handleNavigate('class')}
              className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer ${
                !subject
                  ? 'bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
              aria-current={!subject ? 'page' : undefined}
            >
              {cls.name}
            </button>
          </>
        )}

        {subject && (
          <>
            <ChevronRight size={16} className="text-gray-400 dark:text-gray-600 flex-shrink-0" />
            <button
              type="button"
              onClick={() => handleNavigate('subject')}
              className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer ${
                !topic
                  ? 'bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
              aria-current={!topic ? 'page' : undefined}
            >
              {subject.name}
            </button>
          </>
        )}

        {topic && (
          <>
            <ChevronRight size={16} className="text-gray-400 dark:text-gray-600 flex-shrink-0" />
            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300" aria-current="page">
              {topic.name}
            </span>
          </>
        )}
      </div>
    </nav>
  );
};

export default Breadcrumb;