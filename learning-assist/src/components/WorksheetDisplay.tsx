import React from 'react';

interface WorksheetDisplayProps {
  worksheets: string;
}

const WorksheetDisplay: React.FC<WorksheetDisplayProps> = ({ worksheets }) => {
  return (
    <div className="worksheet-display">
      <pre className="worksheet-text">{worksheets}</pre>
    </div>
  );
};

export default WorksheetDisplay;
