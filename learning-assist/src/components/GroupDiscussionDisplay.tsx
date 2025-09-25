import React from 'react';

interface GroupDiscussionDisplayProps {
  groupDiscussion: string;
}

const GroupDiscussionDisplay: React.FC<GroupDiscussionDisplayProps> = ({ groupDiscussion }) => {
  return (
    <div className="group-discussion-display">
      <pre className="group-discussion-text">{groupDiscussion}</pre>
    </div>
  );
};

export default GroupDiscussionDisplay;
