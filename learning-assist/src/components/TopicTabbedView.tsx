import React, { useState, useEffect } from 'react';
import { FileText, Calendar, ExternalLink, Trash2, Save, Sparkles, GraduationCap, Search, Youtube, User, Users, ClipboardList, BookOpen, Plus, Edit3, X, Loader2, CheckCircle, Download, FileDown, AlertTriangle } from 'lucide-react';
import { Topic, DocumentLink } from '../types';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import secureGeminiService, { DEFAULT_WORKSHEET_GENERATION_OPTIONS } from '../services/secureGeminiService';
import type { WorksheetGenerationOptions, WorksheetQuestionType } from '../types';
import { youtubeService } from '../services/youtubeService';
import DocumentDiscoveryModal from './DocumentDiscoveryModal';
import { PDFUpload } from './PDFUpload';
import { AcademicRecordsService } from '../services/academicRecordsService';
import YouTubePlayer from './YouTubePlayer';
import { exportToPDF, exportToWord, isYouTubeURL, sanitizeFilename, extractYouTubeID } from '../utils/exportHelpers';
import MarkdownRenderer, { renderMarkdownToHtml } from './MarkdownRenderer';

type WorksheetDifficulty = WorksheetGenerationOptions['difficulty'];

const QUESTION_TYPE_LABELS: Record<WorksheetQuestionType, string> = {
  mcq: 'Multiple Choice',
  shortAnswer: 'Short Answer',
  essay: 'Essay',
  fillInTheBlanks: 'Fill-in-the-Blanks',
  trueFalse: 'True / False',
};

const normalizeWorksheetOptions = (
  options?: Partial<WorksheetGenerationOptions>
): WorksheetGenerationOptions => {
  const result: WorksheetGenerationOptions = {
    ...DEFAULT_WORKSHEET_GENERATION_OPTIONS,
    ...options,
    questionTypes: {
      ...DEFAULT_WORKSHEET_GENERATION_OPTIONS.questionTypes,
      ...(options?.questionTypes || {}),
    },
    markingScheme: {
      ...DEFAULT_WORKSHEET_GENERATION_OPTIONS.markingScheme,
      ...(options?.markingScheme || {}),
    },
  };

  // Ensure numeric values stay within reasonable bounds
  result.questionCount = Math.max(1, Math.min(60, result.questionCount || DEFAULT_WORKSHEET_GENERATION_OPTIONS.questionCount));
  result.worksheetCount = Math.max(1, Math.min(10, result.worksheetCount || DEFAULT_WORKSHEET_GENERATION_OPTIONS.worksheetCount));
  result.markingScheme.pointsPerQuestion = Math.max(0, result.markingScheme.pointsPerQuestion || DEFAULT_WORKSHEET_GENERATION_OPTIONS.markingScheme.pointsPerQuestion);
  result.markingScheme.totalPoints = Math.max(0, result.markingScheme.totalPoints || DEFAULT_WORKSHEET_GENERATION_OPTIONS.markingScheme.totalPoints);

  return result;
};

interface TopicTabbedViewProps {
  topic: Topic;
  onTopicDeleted: () => void;
}

type TabType = 'details' | 'lesson-plan' | 'teaching-guide' | 'group-discussion' | 'videos' | 'assessment' | 'worksheets';

const TopicTabbedView: React.FC<TopicTabbedViewProps> = ({ topic, onTopicDeleted }) => {
  const { updateTopic, deleteTopic, loading, error, clearError, currentPath } = useApp();
  const { user } = useAuth();
  
  // Use a more persistent approach for activeTab - store it per topic ID
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    // Try to get the last active tab for this topic from localStorage
    const savedTab = localStorage.getItem(`activeTab_${topic.id}`);
    return (savedTab as TabType) || 'details';
  });
  const [generatingAI, setGeneratingAI] = useState(false);
  const [findingVideos, setFindingVideos] = useState(false);
  const [aiGenerationStatus, setAiGenerationStatus] = useState<string>('');
  const [aiError, setAiError] = useState<string | null>(null);
  const [enhancedLessonPlan, setEnhancedLessonPlan] = useState<string | null>(null);
  const [teachingGuide, setTeachingGuide] = useState<string | null>(null);
  const [groupDiscussion, setGroupDiscussion] = useState<string | null>(null);
  const [assessmentQuestions, setAssessmentQuestions] = useState<string | null>(null);
  const [worksheets, setWorksheets] = useState<string | null>(null);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [showDiscoveryModal, setShowDiscoveryModal] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  
  // Mark Complete modal states
  const [showMarkCompleteModal, setShowMarkCompleteModal] = useState(false);
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [markingComplete, setMarkingComplete] = useState(false);
  const [markCompleteError, setMarkCompleteError] = useState<string | null>(null);
  const availableSections = ['A', 'B', 'C', 'D', 'E', 'F'];
  
  // Editing states for AI content
  const [isEditingLessonPlan, setIsEditingLessonPlan] = useState(false);
  const [isEditingTeachingGuide, setIsEditingTeachingGuide] = useState(false);
  const [isEditingGroupDiscussion, setIsEditingGroupDiscussion] = useState(false);
  const [isEditingAssessmentQuestions, setIsEditingAssessmentQuestions] = useState(false);
  const [isEditingWorksheets, setIsEditingWorksheets] = useState(false);
  const [editingLessonPlan, setEditingLessonPlan] = useState<string>('');
  const [editingTeachingGuide, setEditingTeachingGuide] = useState<string>('');
  const [editingGroupDiscussion, setEditingGroupDiscussion] = useState<string>('');
  const [editingAssessmentQuestions, setEditingAssessmentQuestions] = useState<string>('');
  const [editingWorksheets, setEditingWorksheets] = useState<string>('');
  const [savingContent, setSavingContent] = useState<string | null>(null);
  
  // Video link management states
  const [isAddingVideo, setIsAddingVideo] = useState(false);
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const [newVideo, setNewVideo] = useState({
    title: '',
    url: '',
    description: ''
  });
  const [videoUrlError, setVideoUrlError] = useState<string | null>(null);
  const [playingVideo, setPlayingVideo] = useState<{ id: string; title: string } | null>(null);
  
  // Export states
  const [exportingAssessment, setExportingAssessment] = useState(false);
  const [exportingWorksheets, setExportingWorksheets] = useState(false);
  const [worksheetOptions, setWorksheetOptions] = useState<WorksheetGenerationOptions>(() =>
    normalizeWorksheetOptions(topic.aiContent?.worksheetOptions)
  );
  const [pendingWorksheetGeneration, setPendingWorksheetGeneration] = useState(false);
  const [worksheetOptionsInitialized, setWorksheetOptionsInitialized] = useState(false);
  const questionTypeSelectedCount = React.useMemo(
    () => Object.values(worksheetOptions.questionTypes).filter(Boolean).length,
    [worksheetOptions.questionTypes]
  );
  const hasWorksheetContent = Boolean(topic.aiContent?.worksheets || worksheets);
  const worksheetContent = worksheets ?? topic.aiContent?.worksheets ?? '';

  const updateWorksheetOptionsState = (
    updater: (prev: WorksheetGenerationOptions) => WorksheetGenerationOptions
  ) => {
    setWorksheetOptions(prev => normalizeWorksheetOptions(updater(prev)));
  };

  const handleWorksheetCountChange = (value: number) => {
    updateWorksheetOptionsState(prev => ({
      ...prev,
      worksheetCount: value,
    }));
  };

  const handleQuestionCountChange = (value: number) => {
    updateWorksheetOptionsState(prev => ({
      ...prev,
      questionCount: value,
    }));
  };

  const handleQuestionTypeToggle = (type: WorksheetQuestionType) => {
    updateWorksheetOptionsState(prev => {
      const currentlySelected = prev.questionTypes[type];
      const selectedCount = Object.values(prev.questionTypes).filter(Boolean).length;
      if (currentlySelected && selectedCount <= 1) {
        return prev; // Keep at least one type selected
      }
      return {
        ...prev,
        questionTypes: {
          ...prev.questionTypes,
          [type]: !currentlySelected,
        },
      };
    });
  };

  const handleDifficultyChange = (difficulty: WorksheetDifficulty) => {
    updateWorksheetOptionsState(prev => ({
      ...prev,
      difficulty,
    }));
  };

  const handleMarkingSchemeChange = (field: 'pointsPerQuestion' | 'totalPoints', value: number) => {
    updateWorksheetOptionsState(prev => ({
      ...prev,
      markingScheme: {
        ...prev.markingScheme,
        [field]: value,
      },
    }));
  };

  const handleAnswerKeyToggle = (value: boolean) => {
    updateWorksheetOptionsState(prev => ({
      ...prev,
      autoGenerateAnswerKeys: value,
    }));
  };

  const handleRequestWorksheetGeneration = () => {
    if (generatingAI || isGeneratingContent) {
      return;
    }
    if (questionTypeSelectedCount === 0) {
      setAiError('Please select at least one question type for the worksheet.');
      return;
    }
    const confirmed = window.confirm('Generate worksheets with the current customization settings?');
    if (!confirmed) {
      return;
    }
    setAiError(null);
    setPendingWorksheetGeneration(true);
    if (activeTab !== 'worksheets') {
      setActiveTab('worksheets');
    }
  };
  const [formData, setFormData] = useState({
    name: topic.name,
    description: topic.description || '',
    documentLinkInput: '',
    documentLinkNameInput: '',
    documentLinks: topic.documentLinks ? [...topic.documentLinks] : [] as { name: string; url: string }[],
  });

  // Update form data when topic changes
  useEffect(() => {
    setWorksheetOptionsInitialized(false);

    setFormData({
      name: topic.name,
      description: topic.description || '',
      documentLinkInput: '',
      documentLinkNameInput: '',
      documentLinks: topic.documentLinks ? [...topic.documentLinks] : [] as { name: string; url: string }[],
    });
    
    // Load saved AI content or clear if not available
    if (topic.aiContent?.teachingGuide) {
      setTeachingGuide(topic.aiContent.teachingGuide);
    } else {
      setTeachingGuide(null);
    }
    
    if (topic.aiContent?.groupDiscussion) {
      setGroupDiscussion(topic.aiContent.groupDiscussion);
    } else {
      setGroupDiscussion(null);
    }
    
    if (topic.aiContent?.assessmentQuestions) {
      setAssessmentQuestions(topic.aiContent.assessmentQuestions);
    } else if (!isGeneratingContent) {
      setAssessmentQuestions(null);
    }
    
    if (topic.aiContent?.worksheets) {
      setWorksheets(topic.aiContent.worksheets);
    } else if (!isGeneratingContent) {
      setWorksheets(null);
    }
    
    // Initialize BOTH display AND editing states with current content
    if (topic.aiContent?.lessonPlan) {
      setEditingLessonPlan(topic.aiContent.lessonPlan);
    } else {
      setEditingLessonPlan('');
    }
    
    if (topic.aiContent?.teachingGuide) {
      setTeachingGuide(topic.aiContent.teachingGuide);  // ← FIX: Initialize display state!
      setEditingTeachingGuide(topic.aiContent.teachingGuide);
    } else {
      setTeachingGuide(null);
      setEditingTeachingGuide('');
    }
    
    if (topic.aiContent?.groupDiscussion) {
      setGroupDiscussion(topic.aiContent.groupDiscussion);  // ← FIX: Initialize display state!
      setEditingGroupDiscussion(topic.aiContent.groupDiscussion);
    } else {
      setGroupDiscussion(null);
      setEditingGroupDiscussion('');
    }
    
    if (topic.aiContent?.assessmentQuestions) {
      setAssessmentQuestions(topic.aiContent.assessmentQuestions);  // ← FIX: Initialize display state!
      setEditingAssessmentQuestions(topic.aiContent.assessmentQuestions);
    } else {
      setAssessmentQuestions(null);
      setEditingAssessmentQuestions('');
    }
    
    if (topic.aiContent?.worksheets) {
      setWorksheets(topic.aiContent.worksheets);  // This one was already set above
      setEditingWorksheets(topic.aiContent.worksheets);
    } else {
      setEditingWorksheets('');
    }

    const savedWorksheetOptions = topic.aiContent?.worksheetOptions;
    setWorksheetOptions(normalizeWorksheetOptions(savedWorksheetOptions));
    setWorksheetOptionsInitialized(true);
    
  }, [topic, isGeneratingContent]);

  useEffect(() => {
    if (!worksheetOptionsInitialized) {
      return;
    }
    if (isGeneratingContent || generatingAI) {
      return;
    }

    const savedOptions = topic.aiContent?.worksheetOptions;
    const normalizedSaved = normalizeWorksheetOptions(savedOptions);
    const normalizedCurrent = normalizeWorksheetOptions(worksheetOptions);

    const optionsChanged = JSON.stringify(normalizedSaved) !== JSON.stringify(normalizedCurrent);
    if (!optionsChanged) {
      return;
    }

    const timer = window.setTimeout(() => {
      updateTopic(
        topic.id,
        {
          aiContent: {
            ...(topic.aiContent || {}),
            worksheetOptions: normalizedCurrent,
          },
        },
        true
      ).catch(error => {
        console.error('Failed to persist worksheet options:', error);
      });
    }, 600);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [worksheetOptions, worksheetOptionsInitialized, topic.aiContent, topic.id, isGeneratingContent, generatingAI]);

  useEffect(() => {
    if (!worksheetOptionsInitialized) {
      return;
    }
    if (isGeneratingContent || generatingAI) {
      return;
    }

    const savedOptions = topic.aiContent?.worksheetOptions;
    const normalizedSaved = normalizeWorksheetOptions(savedOptions);
    const normalizedCurrent = normalizeWorksheetOptions(worksheetOptions);

    const optionsChanged = JSON.stringify(normalizedSaved) !== JSON.stringify(normalizedCurrent);
    if (!optionsChanged) {
      return;
    }

    const timer = window.setTimeout(() => {
      updateTopic(topic.id, {
        aiContent: {
          ...(topic.aiContent || {}),
          worksheetOptions: normalizedCurrent,
        },
      }, true).catch(error => {
        console.error('Failed to persist worksheet options:', error);
      });
    }, 600);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [worksheetOptions, worksheetOptionsInitialized, topic.aiContent, topic.id, isGeneratingContent, generatingAI]);

  // Save activeTab to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(`activeTab_${topic.id}`, activeTab);
  }, [activeTab, topic.id]);

  // Restore activeTab when topic changes (in case component re-mounts)
  useEffect(() => {
    const savedTab = localStorage.getItem(`activeTab_${topic.id}`);
    if (savedTab && savedTab !== activeTab) {
      setActiveTab(savedTab as TabType);
    }
  }, [topic.id]);

  // Auto-generate content when tab is clicked and content is missing
  useEffect(() => {
    const generateTabContent = async () => {
      // Skip if already generating or if it's the details tab
      if (generatingAI || isGeneratingContent || activeTab === 'details') {
        return;
      }
      if (activeTab === 'worksheets' && !pendingWorksheetGeneration) {
        return;
      }

      const classLevel = currentPath.class?.name || 'Class 1';
      const documentUrls = formData.documentLinks.map(link => link.url);
      const subject = currentPath.subject?.name || 'General';
      const existingContent = topic.aiContent || {};

      // Check if this tab's content is missing
      let needsGeneration = false;
      let contentType = '';

      switch (activeTab) {
        case 'lesson-plan':
          needsGeneration = !existingContent.lessonPlan;
          contentType = 'lesson plan';
          break;
        case 'teaching-guide':
          needsGeneration = !existingContent.teachingGuide;
          contentType = 'teaching guide';
          break;
        case 'group-discussion':
          needsGeneration = !existingContent.groupDiscussion;
          contentType = 'group discussion';
          break;
        case 'assessment':
          needsGeneration = !existingContent.assessmentQuestions || existingContent.assessmentQuestions.length === 0;
          contentType = 'assessment questions';
          break;
        case 'worksheets':
          needsGeneration = pendingWorksheetGeneration;
          contentType = 'worksheets';
          break;
        case 'videos':
          needsGeneration = !existingContent.videos || existingContent.videos.length === 0;
          contentType = 'videos';
          break;
      }

      if (!needsGeneration) {
        return;
      }

      // Generate content for this tab only
      console.log(`Auto-generating ${contentType} for tab: ${activeTab}`);
      setGeneratingAI(true);
      setIsGeneratingContent(true);
      setAiError(null);
      setAiGenerationStatus(`Generating ${contentType}... (30-60 seconds)`);

      try {
        let result: any = null;

        switch (activeTab) {
          case 'lesson-plan':
            result = await secureGeminiService.generateTopicContent(
              formData.name,
              formData.description || '',
              documentUrls,
              classLevel,
              subject
            );
            if (result.success && result.aiContent?.lessonPlan) {
              setEditingLessonPlan(result.aiContent.lessonPlan);
              await updateTopic(topic.id, {
                ...topic,
                aiContent: { ...existingContent, lessonPlan: result.aiContent.lessonPlan }
              });
            }
            break;

          case 'teaching-guide':
            result = await secureGeminiService.generateTeachingGuide(
              formData.name,
              formData.description || '',
              documentUrls,
              classLevel,
              subject
            );
            // SAVE PARTIAL PROGRESS: Even if incomplete, save what was generated
            if (result.success && result.teachingGuide) {
              setTeachingGuide(result.teachingGuide);
              setEditingTeachingGuide(result.teachingGuide);
              await updateTopic(topic.id, {
                ...topic,
                aiContent: { ...existingContent, teachingGuide: result.teachingGuide }
              });
              
              // Show warning if partial
              if (result.error) {
                setAiError(`⚠️ Partial success: ${result.error}. Content saved with placeholders for failed sections.`);
              }
            }
            break;

          case 'group-discussion':
            result = await secureGeminiService.generateGroupDiscussion(
              formData.name,
              formData.description || '',
              documentUrls,
              classLevel,
              subject
            );
            // Save partial progress
            if (result.success && result.groupDiscussion) {
              setGroupDiscussion(result.groupDiscussion);
              setEditingGroupDiscussion(result.groupDiscussion);
              await updateTopic(topic.id, {
                ...topic,
                aiContent: { ...existingContent, groupDiscussion: result.groupDiscussion }
              });
              if (result.error) {
                setAiError(`⚠️ ${result.error}`);
              }
            }
            break;

          case 'assessment':
            result = await secureGeminiService.generateAssessmentQuestions(
              formData.name,
              formData.description || '',
              documentUrls,
              classLevel,
              subject
            );
            if (result.success && result.assessmentQuestions) {
              setAssessmentQuestions(result.assessmentQuestions);
              setEditingAssessmentQuestions(result.assessmentQuestions);
              await updateTopic(topic.id, {
                ...topic,
                aiContent: { ...existingContent, assessmentQuestions: result.assessmentQuestions }
              });
            }
            break;

          case 'worksheets':
            result = await secureGeminiService.generateWorksheets(
              formData.name,
              formData.description || '',
              documentUrls,
              classLevel,
              subject,
              worksheetOptions
            );
            if (result.success && result.worksheets) {
              setEditingWorksheets(result.worksheets);
              await updateTopic(topic.id, {
                ...topic,
                aiContent: { ...existingContent, worksheets: result.worksheets, worksheetOptions }
              });
            }
            break;

          case 'videos':
            // Skip auto-generation for videos - they're from YouTube
            break;
        }

        setAiGenerationStatus(`✅ ${contentType} generated successfully!`);
        setTimeout(() => setAiGenerationStatus(''), 3000);

      } catch (error: any) {
        console.error(`Failed to generate ${contentType}:`, error);
        setAiError(error.message || `Failed to generate ${contentType}`);
      } finally {
        setGeneratingAI(false);
        setIsGeneratingContent(false);
        if (pendingWorksheetGeneration) {
          setPendingWorksheetGeneration(false);
        }
      }
    };

    generateTabContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, topic.id, pendingWorksheetGeneration]); // Re-run when tab changes or topic changes

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    }).format(new Date(date));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const addDocumentLink = () => {
    const url = formData.documentLinkInput.trim();
    if (!url) return;
    if (formData.documentLinks.some(l => l.url === url)) return;
    const name = formData.documentLinkNameInput.trim() || url;
    setFormData(prev => ({ 
      ...prev, 
      documentLinks: [...prev.documentLinks, { name, url }], 
      documentLinkInput: '', 
      documentLinkNameInput: '' 
    }));
  };

  const removeDocumentLink = (url: string) => {
    setFormData(prev => ({ 
      ...prev, 
      documentLinks: prev.documentLinks.filter(l => l.url !== url) 
    }));
  };

  const handlePDFTextExtracted = (extractedText: string, fileName: string) => {
    setFormData(prev => ({
      ...prev,
      description: extractedText
    }));
    setPdfError(null);
  };

  const handlePDFError = (error: string) => {
    setPdfError(error);
  };

  // AI Content editing handlers
  const handleStartEditingLessonPlan = () => {
    setIsEditingLessonPlan(true);
    setEditingLessonPlan(topic.aiContent?.lessonPlan || '');
  };

  const handleSaveLessonPlan = async () => {
    setSavingContent('lesson-plan');
    try {
      await updateTopic(topic.id, {
        aiContent: {
          ...topic.aiContent,
          lessonPlan: editingLessonPlan,
          generatedAt: new Date()
        }
      });
      setIsEditingLessonPlan(false);
    } catch (error) {
      console.error('Failed to save lesson plan:', error);
    } finally {
      setSavingContent(null);
    }
  };

  const handleCancelEditingLessonPlan = () => {
    setIsEditingLessonPlan(false);
    setEditingLessonPlan(topic.aiContent?.lessonPlan || '');
  };

  const handleStartEditingTeachingGuide = () => {
    setIsEditingTeachingGuide(true);
    setEditingTeachingGuide(topic.aiContent?.teachingGuide || '');
  };

  const handleSaveTeachingGuide = async () => {
    setSavingContent('teaching-guide');
    try {
      await updateTopic(topic.id, {
        aiContent: {
          ...topic.aiContent,
          teachingGuide: editingTeachingGuide,
          generatedAt: new Date()
        }
      });
      setIsEditingTeachingGuide(false);
    } catch (error) {
      console.error('Failed to save teaching guide:', error);
    } finally {
      setSavingContent(null);
    }
  };

  const handleCancelEditingTeachingGuide = () => {
    setIsEditingTeachingGuide(false);
    setEditingTeachingGuide(topic.aiContent?.teachingGuide || '');
  };

  const handleStartEditingGroupDiscussion = () => {
    setIsEditingGroupDiscussion(true);
    setEditingGroupDiscussion(topic.aiContent?.groupDiscussion || '');
  };

  const handleSaveGroupDiscussion = async () => {
    setSavingContent('group-discussion');
    try {
      await updateTopic(topic.id, {
        aiContent: {
          ...topic.aiContent,
          groupDiscussion: editingGroupDiscussion,
          generatedAt: new Date()
        }
      });
      setIsEditingGroupDiscussion(false);
    } catch (error) {
      console.error('Failed to save group discussion:', error);
    } finally {
      setSavingContent(null);
    }
  };

  const handleCancelEditingGroupDiscussion = () => {
    setIsEditingGroupDiscussion(false);
    setEditingGroupDiscussion(topic.aiContent?.groupDiscussion || '');
  };

  const handleStartEditingAssessmentQuestions = () => {
    setIsEditingAssessmentQuestions(true);
    setEditingAssessmentQuestions(topic.aiContent?.assessmentQuestions || '');
  };

  const handleSaveAssessmentQuestions = async () => {
    setSavingContent('assessment-questions');
    try {
      await updateTopic(topic.id, {
        aiContent: {
          ...topic.aiContent,
          assessmentQuestions: editingAssessmentQuestions,
          generatedAt: new Date()
        }
      });
      setIsEditingAssessmentQuestions(false);
    } catch (error) {
      console.error('Failed to save assessment questions:', error);
    } finally {
      setSavingContent(null);
    }
  };

  const handleCancelEditingAssessmentQuestions = () => {
    setIsEditingAssessmentQuestions(false);
    setEditingAssessmentQuestions(topic.aiContent?.assessmentQuestions || '');
  };

  const handleStartEditingWorksheets = () => {
    setIsEditingWorksheets(true);
    setEditingWorksheets(topic.aiContent?.worksheets || '');
  };

  const handleSaveWorksheets = async () => {
    setSavingContent('worksheets');
    try {
      await updateTopic(topic.id, {
        aiContent: {
          ...topic.aiContent,
          worksheets: editingWorksheets,
          worksheetOptions,
          generatedAt: new Date()
        }
      });
      setIsEditingWorksheets(false);
    } catch (error) {
      console.error('Failed to save worksheets:', error);
    } finally {
      setSavingContent(null);
    }
  };

  const handleCancelEditingWorksheets = () => {
    setIsEditingWorksheets(false);
    setEditingWorksheets(topic.aiContent?.worksheets || '');
  };

  // Keyboard shortcuts for editing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 's') {
          e.preventDefault();
          if (isEditingLessonPlan) {
            handleSaveLessonPlan();
          } else if (isEditingTeachingGuide) {
            handleSaveTeachingGuide();
          } else if (isEditingGroupDiscussion) {
            handleSaveGroupDiscussion();
          } else if (isEditingAssessmentQuestions) {
            handleSaveAssessmentQuestions();
          } else if (isEditingWorksheets) {
            handleSaveWorksheets();
          }
        } else if (e.key === 'Escape') {
          if (isEditingLessonPlan) {
            handleCancelEditingLessonPlan();
          } else if (isEditingTeachingGuide) {
            handleCancelEditingTeachingGuide();
          } else if (isEditingGroupDiscussion) {
            handleCancelEditingGroupDiscussion();
          } else if (isEditingAssessmentQuestions) {
            handleCancelEditingAssessmentQuestions();
          } else if (isEditingWorksheets) {
            handleCancelEditingWorksheets();
          }
        }
      }
    };

    if (isEditingLessonPlan || isEditingTeachingGuide || isEditingGroupDiscussion || isEditingAssessmentQuestions || isEditingWorksheets) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isEditingLessonPlan, isEditingTeachingGuide, isEditingGroupDiscussion, isEditingAssessmentQuestions, isEditingWorksheets]);

  const generateAllAIContent = async () => {
    if (!formData.name.trim()) {
      setAiError('Please enter a topic name before generating AI content.');
      return;
    }

    const classLevel = currentPath.class?.name || 'Class 1';
    const documentUrls = formData.documentLinks.map(link => link.url);
    const subject = currentPath.subject?.name || 'General';

    setGeneratingAI(true);
    setIsGeneratingContent(true);
    setAiError(null);
    setAiGenerationStatus('');

    // Track accumulated AI content locally
    let accumulatedAiContent: any = { ...(topic.aiContent || {}) };

    // Check which content items already exist
    const existingContent = topic.aiContent || {};
    const needsLessonPlan = !existingContent.lessonPlan;
    const needsTeachingGuide = !existingContent.teachingGuide;
    const needsGroupDiscussion = !existingContent.groupDiscussion;
    const needsAssessment = !existingContent.assessmentQuestions;
    const needsWorksheets = !existingContent.worksheets;
    const needsVideos = !existingContent.videos || existingContent.videos.length === 0;

    // Count how many items need to be generated
    const itemsToGenerate = [
      needsLessonPlan,
      needsTeachingGuide,
      needsGroupDiscussion,
      needsAssessment,
      needsWorksheets,
      needsVideos
    ].filter(Boolean).length;

    if (itemsToGenerate === 0) {
      setAiGenerationStatus('All AI content already exists!');
      setGeneratingAI(false);
      setIsGeneratingContent(false);
      setTimeout(() => setAiGenerationStatus(''), 2000);
      return;
    }

    try {
      // Step 1: Generate Lesson Plan (if needed)
      if (needsLessonPlan) {
        setAiGenerationStatus('Generating lesson plan...');
        const lessonPlanResult = await secureGeminiService.generateTopicContent(
          formData.name,
          formData.description || '',
          documentUrls,
          classLevel,
          subject
        );

        if (lessonPlanResult.success && lessonPlanResult.aiContent) {
          // Accumulate the lesson plan content
          accumulatedAiContent = {
            ...accumulatedAiContent,
            ...lessonPlanResult.aiContent,
            generatedAt: new Date()
          };
          
          // Update local state immediately for UI feedback
          if (lessonPlanResult.aiContent.lessonPlan) {
            setEditingLessonPlan(lessonPlanResult.aiContent.lessonPlan);
          }
        } else {
          throw new Error(lessonPlanResult.error || 'Failed to generate lesson plan');
        }
      }

      // Step 2: Generate Teaching Guide (if needed)
      if (needsTeachingGuide) {
        setAiGenerationStatus('Generating teaching guide... (this may take 1-2 minutes for complex topics)');
        
        // No timeout - let it complete naturally
        // Each API call takes 30-60s, total for all content: 3-5 minutes
        const teachingGuideResult = await secureGeminiService.generateTeachingGuide(
          formData.name,
          formData.description || '',
          documentUrls,
          classLevel,
          subject
        );

        if (teachingGuideResult.success && teachingGuideResult.teachingGuide) {
          // Update local state immediately for UI feedback
          setTeachingGuide(teachingGuideResult.teachingGuide);
          setEditingTeachingGuide(teachingGuideResult.teachingGuide);
          
          // Accumulate the teaching guide content
          accumulatedAiContent = {
            ...accumulatedAiContent,
            teachingGuide: teachingGuideResult.teachingGuide
          };
        } else {
          console.error('Failed to generate teaching guide:', teachingGuideResult.error);
          console.error('Teaching guide result details:', teachingGuideResult);
        }
      }

      // Step 3: Generate Group Discussion (if needed)
      if (needsGroupDiscussion) {
        setAiGenerationStatus('Generating group discussion activities...');
        
        // Add timeout to group discussion generation
        const groupDiscussionPromise = secureGeminiService.generateGroupDiscussion(
          formData.name,
          formData.description || '',
          documentUrls,
          classLevel,
          subject
        );
        
        const groupDiscussionTimeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Group discussion generation timeout after 180 seconds')), 180000)
        );
        
        const groupDiscussionResult = await Promise.race([groupDiscussionPromise, groupDiscussionTimeoutPromise]) as any;

        if (groupDiscussionResult.success && groupDiscussionResult.groupDiscussion) {
          // Update local state immediately for UI feedback
          setGroupDiscussion(groupDiscussionResult.groupDiscussion);
          setEditingGroupDiscussion(groupDiscussionResult.groupDiscussion);
          
          // Accumulate the group discussion content
          accumulatedAiContent = {
            ...accumulatedAiContent,
            groupDiscussion: groupDiscussionResult.groupDiscussion
          };
        } else {
          console.error('Failed to generate group discussion:', groupDiscussionResult.error);
          console.error('Group discussion result details:', groupDiscussionResult);
        }
      }

      // Step 4: Generate Assessment Questions (if needed)
      if (needsAssessment) {
        setAiGenerationStatus('Generating assessment questions...');
        
        const assessmentPromise = secureGeminiService.generateAssessmentQuestions(
          formData.name,
          formData.description || '',
          documentUrls,
          classLevel,
          subject
        );
        
        const assessmentTimeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Assessment generation timeout after 180 seconds')), 180000)
        );
        
        const assessmentResult = await Promise.race([assessmentPromise, assessmentTimeoutPromise]) as any;

        if (assessmentResult.success && assessmentResult.assessmentQuestions) {
          // Update local state immediately for UI feedback
          setAssessmentQuestions(assessmentResult.assessmentQuestions);
          setEditingAssessmentQuestions(assessmentResult.assessmentQuestions);
          
          // Accumulate the assessment questions content
          accumulatedAiContent = {
            ...accumulatedAiContent,
            assessmentQuestions: assessmentResult.assessmentQuestions
          };
        } else {
          console.error('Failed to generate assessment questions:', assessmentResult.error);
        }
      }

      // Step 5: Generate Worksheets (if needed)
      if (needsWorksheets) {
        setAiGenerationStatus('Generating worksheets...');
        
        const worksheetsPromise = secureGeminiService.generateWorksheets(
          formData.name,
          formData.description || '',
          documentUrls,
          classLevel,
          subject
        );
        
        const worksheetsTimeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Worksheets generation timeout after 180 seconds')), 180000)
        );
        
        const worksheetsResult = await Promise.race([worksheetsPromise, worksheetsTimeoutPromise]) as any;

        if (worksheetsResult.success && worksheetsResult.worksheets) {
          // Update local state immediately for UI feedback
          setWorksheets(worksheetsResult.worksheets);
          setEditingWorksheets(worksheetsResult.worksheets);
          
          // Accumulate the worksheets content
          accumulatedAiContent = {
            ...accumulatedAiContent,
            worksheets: worksheetsResult.worksheets
          };
        } else {
          console.error('Failed to generate worksheets:', worksheetsResult.error);
        }
      }

      // Step 6: Find Videos (if needed)
      if (needsVideos) {
        setAiGenerationStatus('Searching for educational videos...');
        await findVideosForTopic(accumulatedAiContent);
      }

      // Final step: Save all accumulated content to the topic
      setAiGenerationStatus('Saving content...');
      await updateTopic(topic.id, {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        documentLinks: formData.documentLinks || [],
        aiContent: accumulatedAiContent,
      });

      setAiGenerationStatus('Complete!');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred while generating AI content';
      setAiError(errorMessage);
      console.error('AI content generation error:', error);
      
      // If it's an API key error, show a more helpful message
      if (errorMessage.includes('temporarily unavailable') || errorMessage.includes('API key')) {
        setAiGenerationStatus('AI service unavailable - check configuration');
      }
    } finally {
      setGeneratingAI(false);
      setIsGeneratingContent(false);
      // Clear status after a short delay
      setTimeout(() => setAiGenerationStatus(''), 2000);
    }
  };

  const handleLessonPlanUpdate = (updatedLessonPlan: string) => {
    // Store the updated lesson plan to be saved
    setEnhancedLessonPlan(updatedLessonPlan);
    
    // Also update the topic's AI content immediately for display
    // This ensures the enhanced content is visible without needing to save
    if (topic.aiContent) {
      topic.aiContent.lessonPlan = updatedLessonPlan;
    }
  };

  const findVideosForTopic = async (accumulatedAiContent: any) => {
    if (!accumulatedAiContent?.lessonPlan) return;
    
    setFindingVideos(true);
    try {
      // Search for videos related to this topic
      const videoResults = await youtubeService.searchTopicVideos(
        topic.name,
        accumulatedAiContent.classLevel || 'Class 1',
        currentPath.subject?.name
      );

      if (videoResults.videos.length > 0) {
        // Update the accumulated AI content with videos
        accumulatedAiContent.videos = videoResults.videos;
        
        console.log('Found videos:', videoResults.videos);
      } else {
        console.log('No videos found for this topic');
      }
    } catch (error) {
      console.error('Error finding videos:', error);
      // Don't show alert for automatic video search
    } finally {
      setFindingVideos(false);
    }
  };

  const handleSectionUpdate = async (sectionId: string, newContent: string) => {
    // Update the lesson plan with the enhanced content
    if (topic.aiContent?.lessonPlan) {
      try {
        // Parse the current lesson plan
        const lessonPlanData = JSON.parse(topic.aiContent.lessonPlan);
        
        if (lessonPlanData && lessonPlanData.lessonPlan) {
          // Find and update the specific section
          const updatedLessonPlan = updateSectionInLessonPlan(lessonPlanData, sectionId, newContent);
          
          // Update the topic's AI content
          topic.aiContent.lessonPlan = JSON.stringify(updatedLessonPlan, null, 2);
          
          // Store for saving
          setEnhancedLessonPlan(JSON.stringify(updatedLessonPlan, null, 2));
        }
      } catch (error) {
        console.error('Error updating lesson plan:', error);
        // Fallback: just store the enhanced content
        setEnhancedLessonPlan(topic.aiContent.lessonPlan + '\n\n' + newContent);
      }
    }
  };

  const updateSectionInLessonPlan = (lessonPlanData: any, sectionId: string, newContent: string): any => {
    // This is a simplified approach - we'll add the enhanced content to the end
    // In a more sophisticated implementation, we'd parse the sectionId and update the specific section
    
    // For now, just append the enhanced content to the lesson plan
    if (!lessonPlanData.lessonPlan.resources) {
      lessonPlanData.lessonPlan.resources = [];
    }
    
    // Add the enhanced content as a new resource
    lessonPlanData.lessonPlan.resources.push(`Enhanced content: ${newContent}`);
    
    return lessonPlanData;
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('Please enter a topic name');
      return;
    }

    try {
      // Store current active tab to maintain it after save
      const currentTab = activeTab;
      
      // Use enhanced lesson plan if available, otherwise use original
      const lessonPlanToSave = enhancedLessonPlan || topic.aiContent?.lessonPlan;
      
      await updateTopic(topic.id, {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        documentLinks: formData.documentLinks || [],
        aiContent: {
          ...topic.aiContent,
          lessonPlan: lessonPlanToSave
        },
      }, true); // Skip refresh to prevent tab navigation
      
      // Clear the enhanced lesson plan after saving
      setEnhancedLessonPlan(null);
      
      // Ensure we stay on the same tab after saving
      setActiveTab(currentTab);
    } catch (error) {
      console.error('Failed to update topic:', error);
    }
  };

  const handleMarkCompleteClick = () => {
    setShowMarkCompleteModal(true);
    setSelectedSections([]);
    setMarkCompleteError(null);
  };

  const handleSectionToggle = (section: string) => {
    setSelectedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const handleMarkComplete = async () => {
    if (selectedSections.length === 0) {
      setMarkCompleteError('Please select at least one section');
      return;
    }

    setMarkingComplete(true);
    setMarkCompleteError(null);

    try {
      // Extract grade from class ID (e.g., "content-dev-grade-6" -> "6" or "class-1" -> "1")
      const classId = currentPath.class?.id || '';
      const gradeMatch = classId.match(/(\d+)/);
      const grade = gradeMatch ? gradeMatch[1] : '';

      if (!grade) {
        throw new Error('Unable to determine grade from class');
      }

      const schoolId = currentPath.school?.id || '';
      const subjectId = currentPath.subject?.id || '';
      const subjectName = currentPath.subject?.name || '';

      // Create/update academic records for each selected section
      console.log('Creating academic records for sections:', selectedSections);
      console.log('API payload:', {
        school_id: schoolId,
        academic_year: academicYear,
        grade: grade,
        subject_id: subjectId,
        subject_name: subjectName,
        topic_id: topic.id,
        topic_name: topic.name,
        teacher_id: user?.user_id,
        teacher_name: user?.name
      });

      for (const section of selectedSections) {
        try {
          const recordData = {
            school_id: schoolId,
            academic_year: academicYear,
            grade: grade,
            section: section,
            subject_id: subjectId,
            subject_name: subjectName,
            topic_id: topic.id,
            topic_name: topic.name,
            teacher_id: user?.user_id,
            teacher_name: user?.name,
            status: 'completed' as const,
            notes: `Marked complete by ${user?.name} on ${new Date().toLocaleDateString()}`
          };
          
          console.log(`Creating record for section ${section}:`, recordData);
          const result = await AcademicRecordsService.createRecord(recordData);
          console.log(`Successfully created record for section ${section}:`, result);
        } catch (err) {
          console.error(`Error marking section ${section} complete:`, err);
          // Continue with other sections even if one fails
        }
      }

      // Update local completion status after creating academic records
      const currentCompletedSections = topicCompletionStatus.completedSections;
      const newCompletedSections = Array.from(new Set([...currentCompletedSections, ...selectedSections]));
      
      let newStatus: 'completed' | 'in_progress' | 'not_started' = 'not_started';
      if (newCompletedSections.length === availableSections.length) {
        newStatus = 'completed';
      } else if (newCompletedSections.length > 0) {
        newStatus = 'in_progress';
      }

      setTopicCompletionStatus({
        status: newStatus,
        completedSections: newCompletedSections
      });

      // Success
      setShowMarkCompleteModal(false);
      setSelectedSections([]);
      alert(`Topic marked as completed for section(s): ${selectedSections.join(', ')}`);
    } catch (err) {
      setMarkCompleteError(err instanceof Error ? err.message : 'Failed to mark topic as complete');
    } finally {
      setMarkingComplete(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete "${topic.name}"? This action cannot be undone.`)) {
      try {
        await deleteTopic(topic.id);
        onTopicDeleted();
      } catch (error) {
        console.error('Failed to delete topic:', error);
        // Show user-friendly error message
        if (error instanceof Error) {
          if (error.message.includes('not found')) {
            alert('This topic has already been deleted or does not exist.');
            onTopicDeleted(); // Still navigate away from the deleted topic
          } else {
            alert(`Failed to delete topic: ${error.message}`);
          }
        } else {
          alert('Failed to delete topic. Please try again.');
        }
      }
    }
  };

  const handleDiscoveredDocuments = (discoveredDocs: DocumentLink[]) => {
    // Add discovered documents to the current document list
    const newDocuments = [...formData.documentLinks, ...discoveredDocs];
    setFormData(prev => ({
      ...prev,
      documentLinks: newDocuments
    }));
  };

  // Video link management functions
  const validateUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleAddVideo = async () => {
    if (!newVideo.title.trim() || !newVideo.url.trim()) {
      alert('Please fill in both title and URL');
      return;
    }

    if (!validateUrl(newVideo.url)) {
      alert('Please enter a valid URL');
      return;
    }

    // Validate YouTube URL
    if (!isYouTubeURL(newVideo.url)) {
      setVideoUrlError('Only YouTube links are allowed. Please provide a YouTube video URL (youtube.com or youtu.be) to ensure free, no-sign-up access for all users.');
      return;
    }

    setVideoUrlError(null);

    const videoLink: DocumentLink = {
      name: newVideo.title.trim(),
      url: newVideo.url.trim()
    };

    const updatedDocumentLinks = [...(topic.documentLinks || []), videoLink];
    
    try {
      await updateTopic(topic.id, {
        name: topic.name,
        description: topic.description,
        documentLinks: updatedDocumentLinks,
        aiContent: topic.aiContent,
      });
      
      setNewVideo({ title: '', url: '', description: '' });
      setIsAddingVideo(false);
    } catch (error) {
      console.error('Failed to add video:', error);
    }
  };

  const handleEditVideo = (videoUrl: string) => {
    const video = topic.documentLinks?.find(link => link.url === videoUrl);
    if (video) {
      setNewVideo({
        title: video.name,
        url: video.url,
        description: ''
      });
      setEditingVideoId(videoUrl);
      setIsAddingVideo(true);
    }
  };

  const handleUpdateVideo = async () => {
    if (!newVideo.title.trim() || !newVideo.url.trim()) {
      alert('Please fill in both title and URL');
      return;
    }

    if (!validateUrl(newVideo.url)) {
      alert('Please enter a valid URL');
      return;
    }

    // Validate YouTube URL
    if (!isYouTubeURL(newVideo.url)) {
      setVideoUrlError('Only YouTube links are allowed. Please provide a YouTube video URL (youtube.com or youtu.be) to ensure free, no-sign-up access for all users.');
      return;
    }

    setVideoUrlError(null);

    const updatedDocumentLinks = topic.documentLinks?.map(link => 
      link.url === editingVideoId 
        ? { name: newVideo.title.trim(), url: newVideo.url.trim() }
        : link
    ) || [];

    try {
      await updateTopic(topic.id, {
        name: topic.name,
        description: topic.description,
        documentLinks: updatedDocumentLinks,
        aiContent: topic.aiContent,
      });
      
      setNewVideo({ title: '', url: '', description: '' });
      setIsAddingVideo(false);
      setEditingVideoId(null);
    } catch (error) {
      console.error('Failed to update video:', error);
    }
  };

  const handleDeleteVideo = async (videoUrl: string) => {
    if (window.confirm('Are you sure you want to delete this video?')) {
      const updatedDocumentLinks = topic.documentLinks?.filter(link => link.url !== videoUrl) || [];
      
      try {
        await updateTopic(topic.id, {
          name: topic.name,
          description: topic.description,
          documentLinks: updatedDocumentLinks,
          aiContent: topic.aiContent,
        });
      } catch (error) {
        console.error('Failed to delete video:', error);
      }
    }
  };

  const handleDeleteAIVideo = async (videoId: string) => {
    if (window.confirm('Are you sure you want to delete this AI-recommended video?')) {
      const updatedAIVideos = topic.aiContent?.videos?.filter(video => video.id !== videoId) || [];
      const updatedAIContent = {
        ...topic.aiContent,
        videos: updatedAIVideos
      };
      
      try {
        await updateTopic(topic.id, {
          name: topic.name,
          description: topic.description,
          documentLinks: topic.documentLinks,
          aiContent: updatedAIContent,
        });
      } catch (error) {
        console.error('Failed to delete AI video:', error);
      }
    }
  };

  const handleCancelVideo = () => {
    setNewVideo({ title: '', url: '', description: '' });
    setIsAddingVideo(false);
    setEditingVideoId(null);
    setVideoUrlError(null);
  };

  // Export handlers
  const handleExportAssessmentPDF = async () => {
    if (!topic.aiContent?.assessmentQuestions && !assessmentQuestions) return;
    
    try {
      setExportingAssessment(true);
      const htmlContent = renderMarkdownToHtml(topic.aiContent?.assessmentQuestions || assessmentQuestions || '');
      const content = `<div class="ai-rendered">${htmlContent}</div>`;
      const filename = sanitizeFilename(topic.name, 'assessment');
      
      await exportToPDF({
        content,
        filename,
        title: `${topic.name} - Assessment Questions`
      });
    } catch (error) {
      console.error('Export to PDF failed:', error);
      alert('Failed to export to PDF. Please try again.');
    } finally {
      setExportingAssessment(false);
    }
  };

  const handleExportAssessmentWord = async () => {
    if (!topic.aiContent?.assessmentQuestions && !assessmentQuestions) return;
    
    try {
      setExportingAssessment(true);
      const htmlContent = renderMarkdownToHtml(topic.aiContent?.assessmentQuestions || assessmentQuestions || '');
      const content = `<div class="ai-rendered">${htmlContent}</div>`;
      const filename = sanitizeFilename(topic.name, 'assessment');
      
      await exportToWord({
        content,
        filename,
        title: `${topic.name} - Assessment Questions`
      });
    } catch (error) {
      console.error('Export to Word failed:', error);
      alert('Failed to export to Word. Please try again.');
    } finally {
      setExportingAssessment(false);
    }
  };

  const handleExportWorksheetsPDF = async () => {
    if (!topic.aiContent?.worksheets && !worksheets) return;
    
    try {
      setExportingWorksheets(true);
      const htmlContent = renderMarkdownToHtml(topic.aiContent?.worksheets || worksheets || '');
      const content = `<div class="ai-rendered">${htmlContent}</div>`;
      const filename = sanitizeFilename(topic.name, 'worksheets');
      
      await exportToPDF({
        content,
        filename,
        title: `${topic.name} - Worksheets`
      });
    } catch (error) {
      console.error('Export to PDF failed:', error);
      alert('Failed to export to PDF. Please try again.');
    } finally {
      setExportingWorksheets(false);
    }
  };

  const handleExportWorksheetsWord = async () => {
    if (!topic.aiContent?.worksheets && !worksheets) return;
    
    try {
      setExportingWorksheets(true);
      const htmlContent = renderMarkdownToHtml(topic.aiContent?.worksheets || worksheets || '');
      const content = `<div class="ai-rendered">${htmlContent}</div>`;
      const filename = sanitizeFilename(topic.name, 'worksheets');
      
      await exportToWord({
        content,
        filename,
        title: `${topic.name} - Worksheets`
      });
    } catch (error) {
      console.error('Export to Word failed:', error);
      alert('Failed to export to Word. Please try again.');
    } finally {
      setExportingWorksheets(false);
    }
  };

  const getVideoThumbnail = (url: string): string => {
    // For YouTube videos, try to extract thumbnail
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)?.[1];
      if (videoId) {
        return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
      }
    }
    return '';
  };

  // Check if all AI content has been generated
  const allAIContentExists = React.useMemo(() => {
    const existingContent = topic.aiContent || {};
    return !!(
      existingContent.lessonPlan &&
      existingContent.teachingGuide &&
      existingContent.groupDiscussion &&
      existingContent.assessmentQuestions &&
      existingContent.worksheets &&
      existingContent.videos &&
      existingContent.videos.length > 0
    );
  }, [topic.aiContent]);

  // Check if any AI content exists
  const anyAIContentExists = React.useMemo(() => {
    const existingContent = topic.aiContent || {};
    return !!(
      existingContent.lessonPlan ||
      existingContent.teachingGuide ||
      existingContent.groupDiscussion ||
      existingContent.assessmentQuestions ||
      existingContent.worksheets ||
      (existingContent.videos && existingContent.videos.length > 0)
    );
  }, [topic.aiContent]);

  // Debug logging for AI content
  React.useEffect(() => {
  }, [topic]);

  const tabs = React.useMemo(() => [
    { id: 'details', label: 'Topic Details', icon: FileText },
    // ALWAYS show tabs if content exists in topic.aiContent (persisted data)
    // Don't hide tabs based on local state - that can be cleared by errors
    { id: 'lesson-plan', label: 'Lesson Plan', icon: GraduationCap, disabled: false }, // Always clickable - will auto-generate if missing
    { id: 'teaching-guide', label: 'Teaching Guide', icon: User, disabled: false }, // Always clickable
    { id: 'group-discussion', label: 'Group Discussion', icon: Users, disabled: false }, // Always clickable
    { id: 'assessment', label: 'Assessment', icon: ClipboardList, disabled: false }, // Always clickable
    { id: 'worksheets', label: 'Worksheets', icon: BookOpen, disabled: false }, // Always clickable
    { id: 'videos', label: 'Videos', icon: Youtube, disabled: !topic.aiContent?.videos || topic.aiContent.videos.length === 0 },
  ], [topic.aiContent, teachingGuide, groupDiscussion, assessmentQuestions, worksheets]);

  const [topicCompletionStatus, setTopicCompletionStatus] = useState<{
    status: 'completed' | 'in_progress' | 'not_started';
    completedSections: string[];
  }>({ status: 'not_started', completedSections: [] });

useEffect(() => {
  const loadCompletionStatus = async () => {
    try {
      console.log('Loading completion status for topic:', topic.id);
      const records = await AcademicRecordsService.getRecordsByTopic(topic.id);
      console.log('Retrieved academic records:', records);
      
      const completedRecords = records.filter(record => record.status === 'completed');
      console.log('Completed records:', completedRecords);
      
      if (completedRecords.length === 0) {
        console.log('No completed records found, setting status to not_started');
        setTopicCompletionStatus({ status: 'not_started', completedSections: [] });
        return;
      }
      
      const completedSections = completedRecords.map(record => record.section);
      const allSections = ['A', 'B', 'C', 'D', 'E', 'F'];
      
      let status: 'completed' | 'in_progress' | 'not_started' = 'not_started';
      if (completedSections.length === allSections.length) {
        status = 'completed';
      } else if (completedSections.length > 0) {
        status = 'in_progress';
      }
      
      console.log('Setting completion status:', { status, completedSections });
      setTopicCompletionStatus({
        status,
        completedSections: Array.from(new Set(completedSections))
      });
    } catch (err) {
      console.error('Error loading completion status:', err);
      setTopicCompletionStatus({ status: 'not_started', completedSections: [] });
    }
  };
  
  loadCompletionStatus();
}, [topic.id]);

  return (
    <div className="topic-tabbed-view">
      <div className="topic-detail-header">
        <div className="topic-name-row">
          <FileText size={24} />
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="topic-name-input"
            placeholder="Topic name"
          />
        </div>
        <div className="topic-detail-actions">
          <button
            onClick={generateAllAIContent}
            disabled={generatingAI || loading || (allAIContentExists && user?.email !== 's.p@seedlinglabs.com')}
            className={`btn btn-sm ${allAIContentExists && user?.email !== 's.p@seedlinglabs.com' ? 'btn-success' : 'btn-primary'}`}
            title={allAIContentExists && user?.email !== 's.p@seedlinglabs.com' ? 'All AI content has been generated' : anyAIContentExists ? 'Generate missing AI content for this topic' : 'Generate AI content for this topic'}
          >
            <Sparkles size={16} />
            {generatingAI 
              ? (aiGenerationStatus || 'Generating AI Content...') 
              : allAIContentExists && user?.email !== 's.p@seedlinglabs.com'
                ? 'All AI Content Generated' 
                : anyAIContentExists
                  ? 'Generate Missing AI Content'
                  : 'Generate AI Content'
            }
          </button>
          <button
            onClick={handleMarkCompleteClick}
            className="btn btn-success btn-sm"
            disabled={loading}
            title="Mark this topic as complete for specific sections"
          >
            <CheckCircle size={16} />
            Mark Complete
          </button>
          <button onClick={handleSave} className="btn btn-secondary btn-sm" disabled={loading}>
            <Save size={16} />
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <span>{error}</span>
          <button onClick={clearError}>×</button>
        </div>
      )}

      {aiError && (
        <div className="error-message">
          <span>{aiError}</span>
          <button onClick={() => setAiError(null)}>×</button>
        </div>
      )}

      <div className="topic-tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''} ${tab.disabled ? 'disabled' : ''}`}
              disabled={tab.disabled}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="topic-tab-content">
        {activeTab === 'details' && (
          <div className="tab-panel">
            <div className="topic-detail-section">
              <h3>Textbook Content</h3>
              
              {!formData.description ? (
                <div className="pdf-upload-section">
                  <PDFUpload
                    onTextExtracted={handlePDFTextExtracted}
                    onError={handlePDFError}
                    disabled={false}
                  />
                  {pdfError && (
                    <div className="error-message">
                      <span>{pdfError}</span>
                      <button onClick={() => setPdfError(null)}>×</button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="textbook-content-display">
                  <div className="textbook-content-header">
                    <span className="content-label">Textbook Content (from PDF)</span>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setFormData(prev => ({ ...prev, description: '' }))}
                    >
                      Replace Content
                    </button>
                  </div>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Textbook content will appear here after uploading a PDF or can be entered manually"
                    rows={6}
                    className="textbook-content-textarea"
                  />
                  <p className="form-help-text">
                    This content is used by AI to generate lesson plans and teaching guides. 
                    Click "Replace Content" to upload a new PDF.
                  </p>
                </div>
              )}
            </div>

            <div className="topic-detail-section">
              <div className="document-section-header">
                <h3>Document Links</h3>
                <button
                  type="button"
                  onClick={() => setShowDiscoveryModal(true)}
                  className="btn btn-primary btn-sm"
                >
                  <Search size={14} />
                  Discover More Documents
                </button>
              </div>
              <div className="document-link-form">
                <input
                  type="url"
                  name="documentLinkInput"
                  value={formData.documentLinkInput}
                  onChange={handleChange}
                  placeholder="https://example.com/document.pdf"
                />
                <input
                  type="text"
                  name="documentLinkNameInput"
                  value={formData.documentLinkNameInput}
                  onChange={handleChange}
                  placeholder="Optional name"
                />
                <button type="button" className="btn btn-secondary" onClick={addDocumentLink}>
                  Add
                </button>
              </div>
              {formData.documentLinks.length > 0 ? (
                <div className="document-links-list">
                  {formData.documentLinks.map((link) => (
                    <div key={link.url} className="document-link-item">
                      <a href={link.url} target="_blank" rel="noreferrer">
                        <ExternalLink size={14} />
                        {link.name}
                      </a>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => removeDocumentLink(link.url)}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-links">No document links added yet.</p>
              )}
            </div>

            <div className="topic-detail-section">
              <h3>Details</h3>
              <div className="topic-metadata">
                <div className="metadata-item">
                  <Calendar size={16} />
                  <span>Created: {formatDate(topic.createdAt)}</span>
                </div>
                <div className="metadata-item">
                  <Calendar size={16} />
                  <span>Last Updated: {formatDate(topic.updatedAt)}</span>
                </div>
                {topic.aiContent?.generatedAt && (
                  <div className="metadata-item">
                    <Sparkles size={16} />
                    <span>AI Content Generated: {formatDate(topic.aiContent.generatedAt)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="topic-detail-section">
              <div className="delete-section">
                <h3>Danger Zone</h3>
                <p>Permanently delete this topic and all its content. This action cannot be undone.</p>
                <button onClick={handleDelete} className="btn btn-danger" disabled={loading}>
                  <Trash2 size={16} />
                  Delete Topic
                </button>
              </div>
            </div>
          </div>
        )}


        {activeTab === 'lesson-plan' && topic.aiContent?.lessonPlan && (
          <div className="tab-panel lesson-plan-panel">
            <div className="ai-tab-actions">
              {isEditingLessonPlan ? (
                <>
                  <button onClick={handleSaveLessonPlan} className="btn btn-primary btn-sm" disabled={savingContent === 'lesson-plan'}>
                    {savingContent === 'lesson-plan' ? 'Saving...' : 'Save'}
                  </button>
                  <button onClick={handleCancelEditingLessonPlan} className="btn btn-secondary btn-sm">Cancel</button>
                </>
              ) : (
                <button onClick={handleStartEditingLessonPlan} className="btn btn-secondary btn-sm">Edit</button>
              )}
            </div>
            {isEditingLessonPlan ? (
              <div className="editable-content">
                <div className="editing-help">
                  <p>💡 <strong>Keyboard shortcuts:</strong> Ctrl+S to save, Esc to cancel</p>
                </div>
                <textarea
                  value={editingLessonPlan}
                  onChange={(e) => setEditingLessonPlan(e.target.value)}
                  className="content-textarea"
                  rows={20}
                  placeholder="Enter your lesson plan content..."
                />
              </div>
            ) : (
              <div className="raw-ai-content">
                <MarkdownRenderer
                  className="ai-rendered"
                  content={topic.aiContent.lessonPlan}
                />
              </div>
            )}
          </div>
        )}

        {activeTab === 'teaching-guide' && (topic.aiContent?.teachingGuide || teachingGuide) && (
          <div className="tab-panel teaching-guide-panel">
            <div className="ai-tab-actions">
              {isEditingTeachingGuide ? (
                <>
                  <button onClick={handleSaveTeachingGuide} className="btn btn-primary btn-sm" disabled={savingContent === 'teaching-guide'}>
                    {savingContent === 'teaching-guide' ? 'Saving...' : 'Save'}
                  </button>
                  <button onClick={handleCancelEditingTeachingGuide} className="btn btn-secondary btn-sm">Cancel</button>
                </>
              ) : (
                <button onClick={handleStartEditingTeachingGuide} className="btn btn-secondary btn-sm">Edit</button>
              )}
            </div>
            {isEditingTeachingGuide ? (
              <div className="editable-content">
                <textarea
                  value={editingTeachingGuide}
                  onChange={(e) => setEditingTeachingGuide(e.target.value)}
                  className="content-textarea"
                  rows={20}
                  placeholder="Enter your teaching guide content..."
                />
              </div>
            ) : (
              <div className="raw-ai-content">
                <MarkdownRenderer
                  className="ai-rendered"
                  content={topic.aiContent?.teachingGuide || teachingGuide || ''}
                />
              </div>
            )}
          </div>
        )}

        {activeTab === 'group-discussion' && (topic.aiContent?.groupDiscussion || groupDiscussion) && (
          <div className="tab-panel group-discussion-panel">
            <div className="ai-tab-actions">
              {isEditingGroupDiscussion ? (
                <>
                  <button onClick={handleSaveGroupDiscussion} className="btn btn-primary btn-sm" disabled={savingContent === 'group-discussion'}>
                    {savingContent === 'group-discussion' ? 'Saving...' : 'Save'}
                  </button>
                  <button onClick={handleCancelEditingGroupDiscussion} className="btn btn-secondary btn-sm">Cancel</button>
                </>
              ) : (
                <button onClick={handleStartEditingGroupDiscussion} className="btn btn-secondary btn-sm">Edit</button>
              )}
            </div>
            {isEditingGroupDiscussion ? (
              <div className="editable-content">
                <textarea
                  value={editingGroupDiscussion}
                  onChange={(e) => setEditingGroupDiscussion(e.target.value)}
                  className="content-textarea"
                  rows={20}
                  placeholder="Enter your group discussion content..."
                />
              </div>
            ) : (
              <div className="raw-ai-content">
                <MarkdownRenderer
                  className="ai-rendered"
                  content={topic.aiContent?.groupDiscussion || groupDiscussion || ''}
                />
              </div>
            )}
          </div>
        )}

        {activeTab === 'assessment' && (topic.aiContent?.assessmentQuestions || assessmentQuestions) && (
          <div className="tab-panel assessment-panel">
            <div className="ai-tab-actions">
              {isEditingAssessmentQuestions ? (
                <>
                  <button onClick={handleSaveAssessmentQuestions} className="btn btn-primary btn-sm" disabled={savingContent === 'assessment-questions'}>
                    {savingContent === 'assessment-questions' ? 'Saving...' : 'Save'}
                  </button>
                  <button onClick={handleCancelEditingAssessmentQuestions} className="btn btn-secondary btn-sm">Cancel</button>
                </>
              ) : (
                <>
                  <button onClick={handleStartEditingAssessmentQuestions} className="btn btn-secondary btn-sm">Edit</button>
                  <div className="export-buttons">
                    <button 
                      onClick={handleExportAssessmentPDF} 
                      className="btn btn-outline btn-sm"
                      disabled={exportingAssessment}
                      title="Export as PDF"
                    >
                      <Download size={16} />
                      {exportingAssessment ? 'Exporting...' : 'PDF'}
                    </button>
                    <button 
                      onClick={handleExportAssessmentWord} 
                      className="btn btn-outline btn-sm"
                      disabled={exportingAssessment}
                      title="Export as Word"
                    >
                      <FileDown size={16} />
                      {exportingAssessment ? 'Exporting...' : 'Word'}
                    </button>
                  </div>
                </>
              )}
            </div>
            {isEditingAssessmentQuestions ? (
              <div className="editable-content">
                <div className="editing-help">
                  <p>💡 <strong>Keyboard shortcuts:</strong> Ctrl+S to save, Esc to cancel</p>
                </div>
                <textarea
                  value={editingAssessmentQuestions}
                  onChange={(e) => setEditingAssessmentQuestions(e.target.value)}
                  className="content-textarea"
                  rows={20}
                  placeholder="Enter your assessment questions content..."
                />
              </div>
            ) : (
              <div className="raw-ai-content">
                <MarkdownRenderer
                  className="ai-rendered"
                  content={topic.aiContent?.assessmentQuestions || assessmentQuestions || ''}
                />
              </div>
            )}
          </div>
        )}

        {activeTab === 'worksheets' && (
          <div className="tab-panel worksheets-panel">
            <div className="ai-tab-actions">
              {isEditingWorksheets ? (
                <>
                  <button onClick={handleSaveWorksheets} className="btn btn-primary btn-sm" disabled={savingContent === 'worksheets'}>
                    {savingContent === 'worksheets' ? 'Saving...' : 'Save'}
                  </button>
                  <button onClick={handleCancelEditingWorksheets} className="btn btn-secondary btn-sm">Cancel</button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleStartEditingWorksheets}
                    className="btn btn-secondary btn-sm"
                    disabled={!hasWorksheetContent}
                    title={hasWorksheetContent ? 'Edit worksheet content' : 'Generate worksheets before editing'}
                  >
                    Edit
                  </button>
                  <div className="export-buttons">
                    <button 
                      onClick={handleExportWorksheetsPDF} 
                      className="btn btn-outline btn-sm"
                      disabled={exportingWorksheets || !hasWorksheetContent}
                      title="Export as PDF"
                    >
                      <Download size={16} />
                      {exportingWorksheets ? 'Exporting...' : 'PDF'}
                    </button>
                    <button 
                      onClick={handleExportWorksheetsWord} 
                      className="btn btn-outline btn-sm"
                      disabled={exportingWorksheets || !hasWorksheetContent}
                      title="Export as Word"
                    >
                      <FileDown size={16} />
                      {exportingWorksheets ? 'Exporting...' : 'Word'}
                    </button>
                  </div>
                </>
              )}
            </div>
            <div className="worksheet-options-card">
              <h4>Worksheet Customization</h4>
              <div className="worksheet-options-grid">
                <div className="worksheet-option-group">
                  <label htmlFor="worksheet-count" className="option-label">
                    Number of Worksheets: <strong>{worksheetOptions.worksheetCount}</strong>
                  </label>
                  <div className="question-count-controls">
                    <input
                      id="worksheet-count"
                      type="range"
                      min={1}
                      max={8}
                      value={worksheetOptions.worksheetCount}
                      onChange={e => handleWorksheetCountChange(Number(e.target.value))}
                    />
                    <input
                      type="number"
                      min={1}
                      max={8}
                      value={worksheetOptions.worksheetCount}
                      onChange={e => handleWorksheetCountChange(Math.min(8, Math.max(1, Number(e.target.value) || 1)))}
                      className="form-input number-input"
                    />
                  </div>
                  <small className="form-help-text">
                    Choose how many separate worksheets should be generated. Content and question distribution will be balanced across them.
                  </small>
                </div>

                <div className="worksheet-option-group">
                  <label htmlFor="worksheet-question-count" className="option-label">
                    Number of Questions: <strong>{worksheetOptions.questionCount}</strong>
                  </label>
                  <div className="question-count-controls">
                    <input
                      id="worksheet-question-count"
                      type="range"
                      min={1}
                      max={60}
                      value={worksheetOptions.questionCount}
                      onChange={e => handleQuestionCountChange(Number(e.target.value))}
                    />
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={worksheetOptions.questionCount}
                      onChange={e => handleQuestionCountChange(Number(e.target.value) || 1)}
                      className="form-input number-input"
                    />
                  </div>
                </div>

                <div className="worksheet-option-group">
                  <span className="option-label">Question Types</span>
                  <div className="checkbox-grid">
                    {(Object.entries(QUESTION_TYPE_LABELS) as [WorksheetQuestionType, string][]).map(([type, label]) => {
                      const selected = worksheetOptions.questionTypes[type];
                      const disableUncheck = selected && questionTypeSelectedCount <= 1;
                      return (
                        <label key={type} className={`checkbox-option ${disableUncheck ? 'disabled' : ''}`}>
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => handleQuestionTypeToggle(type)}
                            disabled={disableUncheck}
                          />
                          <span>{label}</span>
                        </label>
                      );
                    })}
                    <small className="form-help-text">Select at least one type to include in the worksheet.</small>
                  </div>
                </div>

                <div className="worksheet-option-group">
                  <span className="option-label">Difficulty</span>
                  <div className="radio-group">
                    {(['easy', 'medium', 'hard'] as WorksheetDifficulty[]).map(level => (
                      <label key={level} className="radio-option">
                        <input
                          type="radio"
                          name="worksheet-difficulty"
                          value={level}
                          checked={worksheetOptions.difficulty === level}
                          onChange={() => handleDifficultyChange(level)}
                        />
                        <span className="capitalize">{level}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="worksheet-option-group">
                  <span className="option-label">Marking Scheme</span>
                  <div className="marking-grid">
                    <label className="marking-field">
                      <span>Points per Question</span>
                      <input
                        type="number"
                        min={0}
                        value={worksheetOptions.markingScheme.pointsPerQuestion}
                        onChange={e => handleMarkingSchemeChange('pointsPerQuestion', Math.max(0, Number(e.target.value)))}
                        className="form-input"
                      />
                    </label>
                    <label className="marking-field">
                      <span>Total Points</span>
                      <input
                        type="number"
                        min={0}
                        value={worksheetOptions.markingScheme.totalPoints}
                        onChange={e => handleMarkingSchemeChange('totalPoints', Math.max(0, Number(e.target.value)))}
                        className="form-input"
                      />
                    </label>
                  </div>
                  <small className="form-help-text">
                    Configure how the worksheet should be graded. These details will be included with the generated answer key.
                  </small>
                </div>

                <div className="worksheet-option-group">
                  <label className="toggle-option">
                    <input
                      type="checkbox"
                      checked={worksheetOptions.autoGenerateAnswerKeys}
                      onChange={e => handleAnswerKeyToggle(e.target.checked)}
                    />
                    <span>Auto-generate answer keys</span>
                  </label>
                  <small className="form-help-text">
                    When enabled, the worksheet will include a detailed answer key aligned with your marking scheme.
                  </small>
                </div>
              </div>
              <div className="worksheet-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleRequestWorksheetGeneration}
                  disabled={generatingAI || isGeneratingContent}
                >
                  {generatingAI || pendingWorksheetGeneration ? 'Generating...' : 'Generate Worksheets'}
                </button>
                <small className="form-help-text">
                  Worksheets will be regenerated using the settings above. Previous worksheet content will be replaced.
                </small>
              </div>
            </div>
            {isEditingWorksheets ? (
              <div className="editable-content">
                <div className="editing-help">
                  <p>💡 <strong>Keyboard shortcuts:</strong> Ctrl+S to save, Esc to cancel</p>
                </div>
                <textarea
                  value={editingWorksheets}
                  onChange={(e) => setEditingWorksheets(e.target.value)}
                  className="content-textarea"
                  rows={20}
                  placeholder="Enter your worksheets content..."
                />
              </div>
            ) : (
              <div className="raw-ai-content">
                {hasWorksheetContent ? (
                  <MarkdownRenderer
                    className="ai-rendered"
                    content={worksheetContent}
                  />
                ) : (
                  <div className="empty-ai-state">
                    <p>No worksheet has been generated yet. Adjust the customization settings above and click “Generate Missing AI Content” to create one.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'videos' && (
          <div className="tab-panel videos-panel">
            {/* Video Management Header */}
            <div className="video-management-header">
              <div className="video-header-content">
                <h4>Video Resources</h4>
                <p>Teacher videos and AI-recommended content</p>
              </div>
              <div className="video-header-actions">
                <button
                  onClick={() => setIsAddingVideo(true)}
                  className="btn btn-primary"
                >
                  <Plus size={16} />
                  Add Video Link
                </button>
              </div>
            </div>

            {/* Add Video Form */}
            {isAddingVideo && (
              <div className="add-video-form">
                <h5>{editingVideoId ? 'Edit Video' : 'Add New Video'}</h5>
                
                <div className="form-group">
                  <label htmlFor="video-title">Video Title *</label>
                  <input
                    id="video-title"
                    type="text"
                    value={newVideo.title}
                    onChange={(e) => setNewVideo(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter video title"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="video-url">Video URL * (YouTube only)</label>
                  <input
                    id="video-url"
                    type="url"
                    value={newVideo.url}
                    onChange={(e) => {
                      setNewVideo(prev => ({ ...prev, url: e.target.value }));
                      setVideoUrlError(null);
                    }}
                    placeholder="https://youtube.com/watch?v=... or https://youtu.be/..."
                    className={`form-input ${videoUrlError ? 'input-error' : ''}`}
                  />
                  {videoUrlError && (
                    <div className="form-error-message">
                      <AlertTriangle size={14} />
                      <span>{videoUrlError}</span>
                    </div>
                  )}
                  <small className="form-help-text">
                    ℹ️ Only YouTube links allowed to ensure free, no-sign-up access
                  </small>
                </div>

                <div className="form-actions">
                  <button
                    onClick={editingVideoId ? handleUpdateVideo : handleAddVideo}
                    className="btn btn-primary"
                  >
                    <Save size={16} />
                    {editingVideoId ? 'Update Video' : 'Add Video'}
                  </button>
                  <button
                    onClick={handleCancelVideo}
                    className="btn btn-secondary"
                  >
                    <X size={16} />
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Combined Videos Grid */}
            {(() => {
              // Filter teacher videos to only show YouTube links
              const youtubeTeacherVideos = (topic.documentLinks || []).filter(video => isYouTubeURL(video.url));
              const nonYoutubeTeacherVideos = (topic.documentLinks || []).filter(video => !isYouTubeURL(video.url));
              const aiVideos = topic.aiContent?.videos || [];
              
              const hasVideos = youtubeTeacherVideos.length > 0 || aiVideos.length > 0;
              
              return (
                <>
                  {nonYoutubeTeacherVideos.length > 0 && (
                    <div className="non-youtube-warning">
                      <AlertTriangle size={16} />
                      <span>
                        {nonYoutubeTeacherVideos.length} video{nonYoutubeTeacherVideos.length > 1 ? 's' : ''} hidden 
                        (requires sign-up). Only YouTube links are displayed. 
                        <button onClick={() => setIsAddingVideo(true)} className="btn-link">
                          Edit videos
                        </button>
                      </span>
                    </div>
                  )}
                  
                  {hasVideos && (
                    <div className="videos-section">
                      <div className="videos-grid">
                        {/* Teacher YouTube Videos with Embedded Player */}
                        {youtubeTeacherVideos.map((video, index) => {
                          const videoId = extractYouTubeID(video.url);
                          if (!videoId) return null;
                          
                          return (
                            <div key={`custom-${index}`} className="video-card custom-video-card">
                              <div 
                                className="video-player-preview"
                                onClick={() => setPlayingVideo({ id: videoId, title: video.name })}
                              >
                                <div className="video-thumbnail">
                                  <img 
                                    src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                                    alt={video.name}
                                    className="thumbnail-image"
                                  />
                                  <div className="play-overlay">
                                    <div className="play-button">
                                      <Youtube size={32} />
                                      <span>Play</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="video-info">
                                  <h4 className="video-title">{video.name}</h4>
                                  <p className="video-channel">
                                    <span className="badge badge-teacher">Teacher Added</span>
                                  </p>
                                  <div className="video-actions">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditVideo(video.url);
                                      }}
                                      className="btn btn-sm btn-outline"
                                      title="Edit video"
                                    >
                                      <Edit3 size={16} />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteVideo(video.url);
                                      }}
                                      className="btn btn-sm btn-danger"
                                      title="Delete video"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                    <a
                                      href={video.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="btn btn-sm btn-ghost"
                                      title="Open in YouTube"
                                    >
                                      <ExternalLink size={16} />
                                    </a>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {/* AI-Generated Videos with Embedded Player */}
                        {aiVideos.map((video) => (
                          <div key={video.id} className="video-card ai-video-card">
                            <div 
                              className="video-player-preview"
                              onClick={() => setPlayingVideo({ id: video.id, title: video.title })}
                            >
                              <div className="video-thumbnail">
                                <img 
                                  src={video.thumbnail} 
                                  alt={video.title}
                                  className="thumbnail-image"
                                />
                                <div className="play-overlay">
                                  <div className="play-button">
                                    <Youtube size={32} />
                                    <span>Play</span>
                                  </div>
                                </div>
                              </div>
                              <div className="video-info">
                                <h4 className="video-title">{video.title}</h4>
                                <p className="video-channel">
                                  <span className="badge badge-ai">AI Recommended</span>
                                  {video.channelTitle}
                                </p>
                                <p className="video-duration">{video.duration}</p>
                                <p className="video-description">
                                  {video.description.substring(0, 100)}...
                                </p>
                                <div className="video-actions">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteAIVideo(video.id);
                                    }}
                                    className="btn btn-sm btn-danger"
                                    title="Delete AI video"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                  <a
                                    href={video.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="btn btn-sm btn-ghost"
                                    title="Open in YouTube"
                                  >
                                    <ExternalLink size={16} />
                                  </a>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}

            {/* No videos message */}
            {(!topic.aiContent?.videos || topic.aiContent.videos.length === 0) && 
             (!topic.documentLinks || topic.documentLinks.length === 0) && !isAddingVideo && (
              <div className="no-videos-message">
                <Youtube size={48} />
                <h4>No videos available</h4>
                <p>Add your own video resources or generate AI-recommended videos</p>
              </div>
            )}
          </div>
        )}
      </div>

      {showDiscoveryModal && (
        <DocumentDiscoveryModal
          topicName={formData.name}
          description={formData.description}
          classLevel={currentPath.class?.name || 'Class 1'}
          existingDocuments={formData.documentLinks}
          onDocumentsSelected={handleDiscoveredDocuments}
          onClose={() => setShowDiscoveryModal(false)}
        />
      )}

      {/* Full-page loading overlay during AI content generation */}
      {generatingAI && (
        <div className="ai-generation-overlay">
          <div className="ai-generation-modal">
            <div className="ai-generation-content">
              <div className="ai-generation-icon">
                <Loader2 size={48} className="spinning-loader" />
              </div>
              <h2>Generating AI Content</h2>
              <p className="ai-generation-status">
                {aiGenerationStatus || 'Please wait while we generate comprehensive educational content...'}
              </p>
              <div className="ai-generation-progress">
                <div className="progress-steps">
                  {!topic.aiContent?.lessonPlan && (
                    <div className={`progress-step ${aiGenerationStatus.includes('lesson plan') ? 'active' : ''}`}>
                      <GraduationCap size={20} />
                      <span>Lesson Plan</span>
                    </div>
                  )}
                  {!topic.aiContent?.teachingGuide && (
                    <div className={`progress-step ${aiGenerationStatus.includes('teaching guide') ? 'active' : ''}`}>
                      <User size={20} />
                      <span>Teaching Guide</span>
                    </div>
                  )}
                  {!topic.aiContent?.groupDiscussion && (
                    <div className={`progress-step ${aiGenerationStatus.includes('group discussion') ? 'active' : ''}`}>
                      <Users size={20} />
                      <span>Group Discussion</span>
                    </div>
                  )}
                  {!topic.aiContent?.assessmentQuestions && (
                    <div className={`progress-step ${aiGenerationStatus.includes('assessment') ? 'active' : ''}`}>
                      <ClipboardList size={20} />
                      <span>Assessment</span>
                    </div>
                  )}
                  {!topic.aiContent?.worksheets && (
                    <div className={`progress-step ${aiGenerationStatus.includes('worksheets') ? 'active' : ''}`}>
                      <BookOpen size={20} />
                      <span>Worksheets</span>
                    </div>
                  )}
                  {(!topic.aiContent?.videos || topic.aiContent.videos.length === 0) && (
                    <div className={`progress-step ${aiGenerationStatus.includes('videos') ? 'active' : ''}`}>
                      <Youtube size={20} />
                      <span>Videos</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="ai-generation-note">
                <p>This may take a few minutes. Please don't close this page.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mark Complete Modal */}
      {showMarkCompleteModal && (
        <div className="modal-overlay" onClick={() => setShowMarkCompleteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>
                <CheckCircle size={24} style={{ color: 'var(--primary-color)' }} />
                Mark Topic Complete
              </h2>
              <button className="btn-icon" onClick={() => setShowMarkCompleteModal(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body" style={{ padding: '24px' }}>
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>Topic: {topic.name}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                  {currentPath.school?.name} - {currentPath.class?.name} - {currentPath.subject?.name}
                </p>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Academic Year
                </label>
                <input
                  type="text"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '12px', fontWeight: '500' }}>
                  Select Section(s)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  {availableSections.map((section) => (
                    <label
                      key={section}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px',
                        border: `2px solid ${selectedSections.includes(section) ? 'var(--primary-color)' : 'var(--border-color)'}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        backgroundColor: selectedSections.includes(section) ? 'var(--primary-color-light, rgba(76, 175, 80, 0.1))' : 'transparent',
                        transition: 'all 0.2s'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedSections.includes(section)}
                        onChange={() => handleSectionToggle(section)}
                        style={{ marginRight: '8px', cursor: 'pointer' }}
                      />
                      <span style={{ fontWeight: '500' }}>Section {section}</span>
                    </label>
                  ))}
                </div>
              </div>

              {markCompleteError && (
                <div style={{
                  marginTop: '16px',
                  padding: '12px',
                  backgroundColor: '#fee',
                  border: '1px solid #fcc',
                  borderRadius: '6px',
                  color: '#c33',
                  fontSize: '14px'
                }}>
                  {markCompleteError}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowMarkCompleteModal(false)}
                disabled={markingComplete}
              >
                Cancel
              </button>
              <button
                className="btn btn-success"
                onClick={handleMarkComplete}
                disabled={markingComplete || selectedSections.length === 0}
              >
                {markingComplete ? (
                  <>
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    Marking Complete...
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    Mark as Complete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* YouTube Player Modal */}
      {playingVideo && (
        <YouTubePlayer
          videoId={playingVideo.id}
          title={playingVideo.title}
          onClose={() => setPlayingVideo(null)}
        />
      )}
    </div>
  );
};

export default TopicTabbedView;
