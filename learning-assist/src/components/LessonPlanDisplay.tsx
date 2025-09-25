import React from 'react';

interface LessonPlanDisplayProps {
  lessonPlan: string;
}

const LessonPlanDisplay: React.FC<LessonPlanDisplayProps> = ({ lessonPlan }) => {
  return (
    <div className="lesson-plan-display">
      <pre className="lesson-plan-text">{lessonPlan}</pre>
    </div>
  );
};

export default LessonPlanDisplay;
