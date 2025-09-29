import React, { useMemo, useState } from 'react';
import { FileText, Plus, Search, Calendar, Sparkles, ChevronDown, ChevronRight } from 'lucide-react';
import { Topic } from '../types';
import ChapterPlannerModal from './ChapterPlannerModal';

interface TopicSidebarProps {
  topics: Topic[];
  selectedTopic?: Topic;
  onTopicSelect: (topic: Topic) => void;
  onNewTopicClick: () => void;
  subjectId: string;
  subjectName: string;
  isCreatingNewTopic?: boolean;
  subject: any;
  class: any;
  school: any;
  onTopicsCreated: (topics: Topic[]) => void;
  loading?: boolean;
}

const TopicSidebar: React.FC<TopicSidebarProps> = ({ 
  topics, 
  selectedTopic, 
  onTopicSelect, 
  onNewTopicClick,
  subjectId, 
  subjectName,
  isCreatingNewTopic = false,
  subject,
  class: cls,
  school,
  onTopicsCreated,
  loading = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showChapterPlanner, setShowChapterPlanner] = useState(false);
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({});

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric'
    }).format(new Date(date));
  };

  const filteredTopics = topics.filter(topic =>
    topic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (topic.description && topic.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Parse topics into hierarchical chapters based on naming pattern:
  // "Chapter 1: The Wonderful World of Science - Part 1: What is Science?"
  // Group key: "Chapter 1: The Wonderful World of Science"
  // Child label: "What is Science?" (after Part X: )
  const { groupedChapters, ungroupedTopics } = useMemo(() => {
    const chapterMap: Record<string, { chapter: string; items: { topic: Topic; label: string }[] }> = {};
    const others: Topic[] = [];

    const chapterRegex = /^(.+?)\s*-\s*Part\s*\d+\s*:\s*(.+)$/i;

    filteredTopics.forEach((t) => {
      const match = t.name.match(chapterRegex);
      if (!match) {
        others.push(t);
        return;
      }

      const chapterAndMaybeTitle = match[1].trim(); // e.g., "Chapter 1: The Wonderful World of Science"
      const subLabel = match[2].trim(); // e.g., "What is Science?"

      const chapterKey = chapterAndMaybeTitle;
      if (!chapterMap[chapterKey]) {
        chapterMap[chapterKey] = { chapter: chapterKey, items: [] };
      }
      chapterMap[chapterKey].items.push({ topic: t, label: subLabel });
    });

    // Sort chapters and items for consistent display
    const grouped = Object.values(chapterMap)
      .sort((a, b) => a.chapter.localeCompare(b.chapter))
      .map((group) => ({
        chapter: group.chapter,
        items: group.items.sort((a, b) => a.label.localeCompare(b.label))
      }));

    // Sort ungrouped by name
    const ungrouped = others.sort((a, b) => a.name.localeCompare(b.name));

    return { groupedChapters: grouped, ungroupedTopics: ungrouped };
  }, [filteredTopics]);

  const toggleChapter = (chapter: string) => {
    setExpandedChapters(prev => ({ ...prev, [chapter]: !(prev[chapter] ?? false) }));
  };

  return (
    <div className="topic-sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title">
          <h3>{subjectName} Topics</h3>
          <span className="topic-count">{topics.length}</span>
        </div>
        <div className="sidebar-actions">
          <button
            onClick={() => setShowChapterPlanner(true)}
            className="btn btn-secondary btn-sm"
            title="Chapter Planner"
          >
            <Sparkles size={16} />
          </button>
          <button
            onClick={onNewTopicClick}
            className={`btn btn-primary btn-sm ${isCreatingNewTopic ? 'active' : ''}`}
            title="Add new topic"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      <div className="sidebar-search">
        <div className="search-input-container">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      <div className="sidebar-content">
        {loading ? (
          <div className="empty-sidebar">
            <div className="spinner" />
            <p>Loading topics...</p>
          </div>
        ) : filteredTopics.length === 0 ? (
          <div className="empty-sidebar">
            {searchQuery ? (
              <div className="no-results">
                <Search size={32} />
                <p>No topics found matching "{searchQuery}"</p>
              </div>
            ) : (
              <div className="no-topics">
                <FileText size={32} />
                <p>No topics yet</p>
                <button
                  onClick={onNewTopicClick}
                  className="btn btn-primary btn-sm"
                >
                  <Plus size={16} />
                  Add First Topic
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="topic-list">
            {groupedChapters.length > 0 && (
              <div className="chapter-groups">
                {groupedChapters.map((group) => {
                  const isExpanded = expandedChapters[group.chapter] ?? false;
                  return (
                    <div key={group.chapter} className="chapter-group">
                      <button
                        type="button"
                        className="chapter-header"
                        onClick={() => toggleChapter(group.chapter)}
                        aria-expanded={isExpanded}
                        aria-controls={`chapter-${group.chapter}`}
                        title={isExpanded ? 'Collapse' : 'Expand'}
                      >
                        <div className="chapter-header-left">
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          <span className="chapter-title">{group.chapter}</span>
                        </div>
                        <span className="topic-count">{group.items.length}</span>
                      </button>
                      {isExpanded && (
                        <div id={`chapter-${group.chapter}`} className="chapter-topics">
                          {group.items.map(({ topic, label }) => (
                        <div
                          key={topic.id}
                          className={`topic-item ${selectedTopic?.id === topic.id && !isCreatingNewTopic ? 'selected' : ''}`}
                          onClick={() => onTopicSelect(topic)}
                        >
                          <div className="topic-item-header">
                            <FileText size={16} />
                            <span className="topic-name">{label}</span>
                          </div>
                          {topic.description && (
                            <p className="topic-preview">
                              {topic.description.length > 60 
                                ? `${topic.description.substring(0, 60)}...`
                                : topic.description
                              }
                            </p>
                          )}
                          {topic.aiContent && topic.aiContent.lessonPlan && (
                            <div className="topic-summary-badge">
                              ✨ Has AI Content
                            </div>
                          )}
                          <div className="topic-item-meta">
                            <Calendar size={12} />
                            <span>{formatDate(topic.updatedAt)}</span>
                            {topic.documentLinks && topic.documentLinks.length > 0 && (
                              <span className="doc-count">
                                {topic.documentLinks.length} doc{topic.documentLinks.length !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {ungroupedTopics.length > 0 && (
              <div className="ungrouped-topics">
                {groupedChapters.length > 0 && (
                  <div className="chapter-header">
                    <span className="chapter-title">Other Topics</span>
                    <span className="topic-count">{ungroupedTopics.length}</span>
                  </div>
                )}
                {ungroupedTopics.map((topic) => (
                  <div
                    key={topic.id}
                    className={`topic-item ${selectedTopic?.id === topic.id && !isCreatingNewTopic ? 'selected' : ''}`}
                    onClick={() => onTopicSelect(topic)}
                  >
                    <div className="topic-item-header">
                      <FileText size={16} />
                      <span className="topic-name">{topic.name}</span>
                    </div>
                    {topic.description && (
                      <p className="topic-preview">
                        {topic.description.length > 60 
                          ? `${topic.description.substring(0, 60)}...`
                          : topic.description
                        }
                      </p>
                    )}
                    {topic.aiContent && topic.aiContent.lessonPlan && (
                      <div className="topic-summary-badge">
                        ✨ Has AI Content
                      </div>
                    )}
                    <div className="topic-item-meta">
                      <Calendar size={12} />
                      <span>{formatDate(topic.updatedAt)}</span>
                      {topic.documentLinks && topic.documentLinks.length > 0 && (
                        <span className="doc-count">
                          {topic.documentLinks.length} doc{topic.documentLinks.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showChapterPlanner && (
        <ChapterPlannerModal
          subject={subject}
          class={cls}
          school={school}
          onClose={() => setShowChapterPlanner(false)}
          onTopicsCreated={onTopicsCreated}
        />
      )}
    </div>
  );
};

export default TopicSidebar;
