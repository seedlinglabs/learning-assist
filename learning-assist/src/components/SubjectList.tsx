import React from 'react';
import { BookOpen, ChevronRight, FileText } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { EmptyState, SkeletonCard } from './common';

const SubjectList: React.FC = () => {
  const { currentPath, setCurrentPath, classLoading } = useApp();
  const { school, class: cls } = currentPath;

  if (!school || !cls) return null;

  const handleSubjectClick = (subject: any) => {
    setCurrentPath({ school, class: cls, subject });
  };

  if (classLoading) {
    return (
      <div className="space-y-6">
        <div className="mb-8">
          <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
          <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <SkeletonCard count={3} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Subjects in {cls.name}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Select a subject to browse topics or use AI Chapter Planner
        </p>
      </div>

      {/* Subject Cards Grid */}
      {cls.subjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cls.subjects.map((subject, index) => (
            <div
              key={subject.id}
              className="group relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-200 hover:-translate-y-1 shadow-lg hover:shadow-2xl hover:border-primary-300 dark:hover:border-primary-600 animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Main Content - Clickable */}
              <div
                onClick={() => handleSubjectClick(subject)}
                className="p-6 cursor-pointer"
              >
                {/* Icon */}
                <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl mb-4 group-hover:scale-110 transition-transform duration-200 shadow-md">
                  <BookOpen size={28} className="text-white" />
                </div>

                {/* Content */}
                <div className="mb-4">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                    {subject.name}
                  </h3>
                  {subject.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {subject.description}
                    </p>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                  <FileText size={16} />
                  <span>{subject.topics.length} {subject.topics.length === 1 ? 'topic' : 'topics'}</span>
                </div>

              {/* Arrow Indicator */}
              <div className="absolute top-6 right-6 text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 group-hover:translate-x-1 transition-all duration-200">
                <ChevronRight size={20} />
              </div>
            </div>
          </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={BookOpen}
          title="No Subjects Available"
          description={`There are no subjects configured for ${cls.name}.`}
        />
      )}
    </div>
  );
};

export default SubjectList;