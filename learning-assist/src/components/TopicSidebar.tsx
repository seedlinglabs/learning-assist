import React, { useMemo, useState } from 'react';
import { FileText, Plus, Search, Calendar, Sparkles, ChevronDown, ChevronRight, CheckCircle, BookOpen } from 'lucide-react';
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
    <div className="flex flex-col h-full">
      {/* Sidebar Header */}
      <div className="px-5 py-5 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center border border-primary-200 bg-primary-50 text-primary-600 shadow-sm">
              <BookOpen size={16} />
            </div>
            <div className="flex flex-col min-w-0">
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                {subjectName}
              </h3>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {topics.length} {topics.length === 1 ? 'topic' : 'topics'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowChapterPlanner(true)}
              className="p-2.5 rounded-lg border border-purple-200 bg-purple-50 text-purple-600 hover:bg-purple-100 hover:border-purple-300 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-200 dark:hover:bg-purple-900/40 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-1"
              title="AI Chapter Planner"
            >
              <Sparkles size={18} />
            </button>
            <button
              onClick={onNewTopicClick}
              className={`p-2.5 rounded-lg border transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-1 ${
                isCreatingNewTopic
                  ? 'bg-primary-500 text-white border-primary-500 hover:bg-primary-600'
                  : 'bg-primary-50 text-primary-600 border-primary-200 hover:bg-primary-100 hover:border-primary-300 dark:bg-primary-900/20 dark:text-primary-200 dark:border-primary-800 dark:hover:bg-primary-900/40'
              }`}
              title="Add new topic"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none">
            <Search size={16} />
          </div>
          <input
            type="text"
            placeholder="Search topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2.5 bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
          />
        </div>
      </div>

      {/* Sidebar Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <div className="w-10 h-10 border-3 border-gray-300 dark:border-gray-600 border-t-primary-600 dark:border-t-primary-400 rounded-full animate-spin mb-3" />
            <p className="text-gray-600 dark:text-gray-400">Loading topics...</p>
          </div>
        ) : filteredTopics.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            {searchQuery ? (
              <>
                <Search size={48} className="text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-gray-600 dark:text-gray-400">
                  No topics found matching <span className="font-semibold">"{searchQuery}"</span>
                </p>
              </>
            ) : (
              <>
                <FileText size={48} className="text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-gray-600 dark:text-gray-400 mb-4">No topics yet</p>
                <button
                  onClick={onNewTopicClick}
                  className="btn btn-primary inline-flex items-center gap-2 shadow-sm hover:shadow-md"
                >
                  <Plus size={16} />
                  Add First Topic
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="py-3">
            {groupedChapters.length > 0 && (
              <div className="space-y-2 px-3">
                {groupedChapters.map((group) => {
                  const isExpanded = expandedChapters[group.chapter] ?? false;
                  return (
                    <div key={group.chapter} className="mb-2">
                      <button
                        type="button"
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:border-primary-300 dark:hover:border-primary-600 transition-all shadow-sm hover:shadow-md"
                        onClick={() => toggleChapter(group.chapter)}
                        aria-expanded={isExpanded}
                        aria-controls={`chapter-${group.chapter}`}
                        title={isExpanded ? 'Collapse' : 'Expand'}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {isExpanded ? <ChevronDown size={16} className="flex-shrink-0" /> : <ChevronRight size={16} className="flex-shrink-0" />}
                          <span className="text-sm font-semibold truncate">{group.chapter}</span>
                        </div>
                        <span className="px-2 py-0.5 bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300 rounded-full text-xs font-bold flex-shrink-0">
                          {group.items.length}
                        </span>
                      </button>
                      {isExpanded && (
                        <div id={`chapter-${group.chapter}`} className="mt-2 space-y-1.5 pl-1">
                          {group.items.map(({ topic, label }) => (
                        <div
                          key={topic.id}
                          className={`px-4 py-3 rounded-lg cursor-pointer transition-all border ${
                            selectedTopic?.id === topic.id && !isCreatingNewTopic
                              ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-300 dark:border-primary-600 shadow-md'
                              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-primary-200 dark:hover:border-primary-800'
                          }`}
                          onClick={() => onTopicSelect(topic)}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <div className={`p-1.5 rounded ${
                                selectedTopic?.id === topic.id && !isCreatingNewTopic
                                  ? 'bg-primary-100 dark:bg-primary-800'
                                  : 'bg-gray-100 dark:bg-gray-700'
                              }`}>
                                <FileText size={14} className={
                                  selectedTopic?.id === topic.id && !isCreatingNewTopic
                                    ? 'text-primary-600 dark:text-primary-400'
                                    : 'text-gray-500 dark:text-gray-400'
                                } />
                              </div>
                              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight">
                                {label}
                              </span>
                            </div>
                            {topic.completionStatus === 'completed' && (
                              <div className="flex items-center gap-1 px-2 py-0.5 bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400 rounded-full text-xs font-semibold flex-shrink-0">
                                <CheckCircle size={12} />
                                <span>Done</span>
                              </div>
                            )}
                            {topic.completionStatus === 'in_progress' && (
                              <div className="flex items-center gap-1 px-2 py-0.5 bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-400 rounded-full text-xs font-semibold flex-shrink-0">
                                <div className="w-2 h-2 bg-warning-500 rounded-full animate-pulse" />
                                <span>Active</span>
                              </div>
                            )}
                          </div>
                          {topic.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2 leading-relaxed pl-9">
                              {topic.description}
                            </p>
                          )}
                          
                          {/* Badges Row */}
                          <div className="flex flex-wrap items-center gap-2 pl-9 mb-2">
                            {topic.aiContent && topic.aiContent.lessonPlan && (
                              <div className="inline-flex items-center gap-1 px-2 py-1 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-md text-xs font-semibold border border-primary-200 dark:border-primary-700">
                                <Sparkles size={12} />
                                <span>AI Generated</span>
                              </div>
                            )}
                            {topic.documentLinks && topic.documentLinks.length > 0 && (
                              <div className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md text-xs font-medium">
                                <FileText size={11} />
                                <span>{topic.documentLinks.length} {topic.documentLinks.length === 1 ? 'doc' : 'docs'}</span>
                              </div>
                            )}
                          </div>
                          
                          {topic.completedSections && topic.completedSections.length > 0 && (
                            <div className="text-xs text-success-700 dark:text-success-400 bg-success-50 dark:bg-success-900/20 px-2.5 py-1.5 rounded-lg border-l-3 border-success-500 mb-2 pl-9">
                              <span className="font-bold">Completed: </span>
                              <span>{topic.completedSections.join(', ')}</span>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 pl-9">
                            <Calendar size={12} />
                            <span>{formatDate(topic.updatedAt)}</span>
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
              <div className="mt-4 px-3 space-y-1.5">
                {groupedChapters.length > 0 && (
                  <div className="flex items-center justify-between px-3 py-2 mb-2 bg-gray-200 dark:bg-gray-700 rounded-lg">
                    <span className="text-sm font-bold text-gray-800 dark:text-gray-200">Other Topics</span>
                    <span className="px-2 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded-full text-xs font-bold">
                      {ungroupedTopics.length}
                    </span>
                  </div>
                )}
                {ungroupedTopics.map((topic) => (
                  <div
                    key={topic.id}
                    className={`px-4 py-3 rounded-lg cursor-pointer transition-all border ${
                      selectedTopic?.id === topic.id && !isCreatingNewTopic
                        ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-300 dark:border-primary-600 shadow-md'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-primary-200 dark:hover:border-primary-800'
                    }`}
                    onClick={() => onTopicSelect(topic)}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`p-1.5 rounded ${
                        selectedTopic?.id === topic.id && !isCreatingNewTopic
                          ? 'bg-primary-100 dark:bg-primary-800'
                          : 'bg-gray-100 dark:bg-gray-700'
                      }`}>
                        <FileText size={14} className={
                          selectedTopic?.id === topic.id && !isCreatingNewTopic
                            ? 'text-primary-600 dark:text-primary-400'
                            : 'text-gray-500 dark:text-gray-400'
                        } />
                      </div>
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight">
                        {topic.name}
                      </span>
                    </div>
                    {topic.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2 leading-relaxed pl-9">
                        {topic.description}
                      </p>
                    )}
                    
                    {/* Badges Row */}
                    <div className="flex flex-wrap items-center gap-2 pl-9 mb-2">
                      {topic.aiContent && topic.aiContent.lessonPlan && (
                        <div className="inline-flex items-center gap-1 px-2 py-1 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-md text-xs font-semibold border border-primary-200 dark:border-primary-700">
                          <Sparkles size={12} />
                          <span>AI Generated</span>
                        </div>
                      )}
                      {topic.documentLinks && topic.documentLinks.length > 0 && (
                        <div className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md text-xs font-medium">
                          <FileText size={11} />
                          <span>{topic.documentLinks.length} {topic.documentLinks.length === 1 ? 'doc' : 'docs'}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 pl-9">
                      <Calendar size={12} />
                      <span>{formatDate(topic.updatedAt)}</span>
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
