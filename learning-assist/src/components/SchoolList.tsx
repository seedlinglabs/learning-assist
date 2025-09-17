import React from 'react';
import { School, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';

const SchoolList: React.FC = () => {
  const { schools, setCurrentPath } = useApp();

  const handleSchoolClick = (school: any) => {
    setCurrentPath({ school });
  };

  return (
    <div className="content-container">
      <div className="content-header">
        <h1>Schools</h1>
        <p>Select a school to browse classes and subjects</p>
      </div>

      <div className="grid-container">
        {schools.map((school) => (
          <div
            key={school.id}
            onClick={() => handleSchoolClick(school)}
            className="card clickable-card"
          >
            <div className="card-icon">
              <School size={32} />
            </div>
            <div className="card-content">
              <h3 className="card-title">{school.name}</h3>
              {school.description && (
                <p className="card-description">{school.description}</p>
              )}
              <div className="card-stats">
                <span>{school.classes.length} classes</span>
                <span>•</span>
                <span>
                  {school.classes.reduce((total, cls) => total + cls.subjects.length, 0)} subjects
                </span>
              </div>
            </div>
            <ChevronRight size={20} className="card-arrow" />
          </div>
        ))}
      </div>

      {schools.length === 0 && (
        <div className="empty-state">
          <School size={64} />
          <h3>No Schools Available</h3>
          <p>There are no schools configured in the system.</p>
        </div>
      )}
    </div>
  );
};

export default SchoolList;