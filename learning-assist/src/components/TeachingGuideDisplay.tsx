import React from 'react';

interface TeachingGuideDisplayProps {
  teachingGuide: string;
}

const TeachingGuideDisplay: React.FC<TeachingGuideDisplayProps> = ({ teachingGuide }) => {
  return (
    <div className="teaching-guide-display">
      <pre className="teaching-guide-text">{teachingGuide}</pre>
    </div>
  );
};

export default TeachingGuideDisplay;
