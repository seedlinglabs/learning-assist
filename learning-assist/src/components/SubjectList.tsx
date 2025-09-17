import React from 'react';
import { BookOpen, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';

const SubjectList: React.FC = () => {
  const { currentPath, setCurrentPath } = useApp();
  const { school, class: cls } = currentPath;

  if (!school || !cls) return null;

  const handleSubjectClick = (subject: any) => {
    setCurrentPath({ school, class: cls, subject });
  };

  return (
    <div className="content-container">
      <div className="content-header">
        <h1>Subjects in {cls.name}</h1>
        <p>Select a subject to browse topics</p>
      </div>

      <div className="grid-container">
        {cls.subjects.map((subject) => (
          <div
            key={subject.id}
            onClick={() => handleSubjectClick(subject)}
            className="card clickable-card"
          >
            <div className="card-icon">
              <BookOpen size={32} />
            </div>
            <div className="card-content">
              <h3 className="card-title">{subject.name}</h3>
              {subject.description && (
                <p className="card-description">{subject.description}</p>
              )}
              <div className="card-stats">
                <span>{subject.topics.length} topics</span>
              </div>
            </div>
            <ChevronRight size={20} className="card-arrow" />
          </div>
        ))}
      </div>

      {cls.subjects.length === 0 && (
        <div className="empty-state">
          <BookOpen size={64} />
          <h3>No Subjects Available</h3>
          <p>There are no subjects configured for {cls.name}.</p>
        </div>
      )}
    </div>
  );
};

export default SubjectList;