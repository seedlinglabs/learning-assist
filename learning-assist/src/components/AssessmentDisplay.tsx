import React from 'react';

interface AssessmentDisplayProps {
  assessmentQuestions: string;
}

const AssessmentDisplay: React.FC<AssessmentDisplayProps> = ({ assessmentQuestions }) => {
  return (
    <div className="assessment-display">
      <pre className="assessment-text">{assessmentQuestions}</pre>
    </div>
  );
};

export default AssessmentDisplay;
