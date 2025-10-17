import React, { useState } from 'react';
import { BookOpen, ChevronRight, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';
import ChapterPlannerModal from './ChapterPlannerModal';

const SubjectList: React.FC = () => {
  const { currentPath, setCurrentPath, refreshTopics } = useApp();
  const { school, class: cls } = currentPath;
  const [showChapterPlanner, setShowChapterPlanner] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<any>(null);

  if (!school || !cls) return null;

  const handleSubjectClick = (subject: any) => {
    setCurrentPath({ school, class: cls, subject });
  };

  const handleChapterPlannerClick = (subject: any) => {
    setSelectedSubject(subject);
    setShowChapterPlanner(true);
  };

  const handleTopicsCreated = async (topics: any[]) => {
    // Refresh topics to show the newly created ones
    await refreshTopics();
    setShowChapterPlanner(false);
    setSelectedSubject(null);
  };

  return (
    <div className="content-container">
      <div className="content-header">
        <h1>Subjects in {cls.name}</h1>
        <p>Select a subject to browse topics</p>
      </div>

      <div className="grid-container">
        {cls.subjects.map((subject) => (
          <div key={subject.id} className="subject-card">
            <div
              onClick={() => handleSubjectClick(subject)}
              className="card clickable-card subject-main-card"
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

      {showChapterPlanner && selectedSubject && (
        <ChapterPlannerModal
          subject={selectedSubject}
          class={cls}
          school={school}
          onClose={() => {
            setShowChapterPlanner(false);
            setSelectedSubject(null);
          }}
          onTopicsCreated={handleTopicsCreated}
        />
      )}
    </div>
  );
};

export default SubjectList;