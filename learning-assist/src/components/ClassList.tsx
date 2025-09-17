import React from 'react';
import { GraduationCap, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';

const ClassList: React.FC = () => {
  const { currentPath, setCurrentPath } = useApp();
  const school = currentPath.school;

  if (!school) return null;

  const handleClassClick = (cls: any) => {
    setCurrentPath({ school, class: cls });
  };

  return (
    <div className="content-container">
      <div className="content-header">
        <h1>Classes in {school.name}</h1>
        <p>Select a class to browse subjects</p>
      </div>

      <div className="grid-container">
        {school.classes.map((cls) => (
          <div
            key={cls.id}
            onClick={() => handleClassClick(cls)}
            className="card clickable-card"
          >
            <div className="card-icon">
              <GraduationCap size={32} />
            </div>
            <div className="card-content">
              <h3 className="card-title">{cls.name}</h3>
              {cls.description && (
                <p className="card-description">{cls.description}</p>
              )}
              <div className="card-stats">
                <span>{cls.subjects.length} subjects</span>
                <span>•</span>
                <span>
                  {cls.subjects.reduce((total, subject) => total + subject.topics.length, 0)} topics
                </span>
              </div>
            </div>
            <ChevronRight size={20} className="card-arrow" />
          </div>
        ))}
      </div>

      {school.classes.length === 0 && (
        <div className="empty-state">
          <GraduationCap size={64} />
          <h3>No Classes Available</h3>
          <p>There are no classes configured for {school.name}.</p>
        </div>
      )}
    </div>
  );
};

export default ClassList;