import React, { useState, useEffect } from 'react';
import { FileText, Calendar, ExternalLink, Trash2, Save, Sparkles, GraduationCap, Search, Youtube, User, Users, ClipboardList, BookOpen, Plus, Edit3, X, Loader2, CheckCircle, Download, FileDown, AlertTriangle } from 'lucide-react';
import { Topic, DocumentLink } from '../types';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { secureGeminiService } from '../services/secureGeminiService';
import { youtubeService } from '../services/youtubeService';
import DocumentDiscoveryModal from './DocumentDiscoveryModal';
import { PDFUpload } from './PDFUpload';
import { AcademicRecordsService } from '../services/academicRecordsService';
import YouTubePlayer from './YouTubePlayer';
import { exportToPDF, exportToWord, isYouTubeURL, sanitizeFilename, extractYouTubeID } from '../utils/exportHelpers';
 

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
  const [formData, setFormData] = useState({
    name: topic.name,
    description: topic.description || '',
    documentLinkInput: '',
    documentLinkNameInput: '',
    documentLinks: topic.documentLinks ? [...topic.documentLinks] : [] as { name: string; url: string }[],
  });

  // Update form data when topic changes
  useEffect(() => {
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
    
  }, [topic, isGeneratingContent]);

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
          needsGeneration = !existingContent.worksheets || existingContent.worksheets.length === 0;
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
              subject
            );
            if (result.success && result.worksheets) {
              setEditingWorksheets(result.worksheets);
              await updateTopic(topic.id, {
                ...topic,
                aiContent: { ...existingContent, worksheets: result.worksheets }
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
      }
    };

    generateTabContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, topic.id]); // Re-run when tab changes or topic changes

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
      const content = formatSimpleMarkdown(topic.aiContent?.assessmentQuestions || assessmentQuestions || '');
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
      const content = formatSimpleMarkdown(topic.aiContent?.assessmentQuestions || assessmentQuestions || '');
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
      const content = formatSimpleMarkdown(topic.aiContent?.worksheets || worksheets || '');
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
      const content = formatSimpleMarkdown(topic.aiContent?.worksheets || worksheets || '');
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

  // Simple, safe view-only formatting for headings, bold, and bullets
  const formatSimpleMarkdown = (text: string): string => {
    const escapeHtml = (s: string) =>
      (s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    const lines = escapeHtml(text).split('\n');
    const html: string[] = [];
    let inList = false;

    const isTableSeparator = (s: string) => /^(\s*\|)?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+(\|\s*)?$/.test(s);
    const splitCells = (s: string) => {
      const parts = s.split('|').map(c => c.trim());
      if (parts.length && parts[0] === '') parts.shift();
      if (parts.length && parts[parts.length - 1] === '') parts.pop();
      return parts;
    };

    const flushList = () => {
      if (inList) {
        html.push('</ul>');
        inList = false;
      }
    };

    for (let idx = 0; idx < lines.length; idx++) {
      const rawLine = lines[idx];
      const line = rawLine.trimEnd();

      if (line.trim() === '') {
        flushList();
        html.push('<br/>');
        continue;
      }

      // Markdown table detection: header | header, followed by --- | --- line
      if (line.includes('|') && idx + 1 < lines.length && isTableSeparator(lines[idx + 1].trim())) {
        flushList();
        const headerCells = splitCells(line).map(c => c.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'));
        let j = idx + 2;
        const rows: string[][] = [];
        while (j < lines.length) {
          const rowLine = lines[j].trimEnd();
          if (!rowLine || !rowLine.includes('|')) break;
          rows.push(splitCells(rowLine).map(c => c.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')));
          j++;
        }
        // Build table HTML
        const thead = `<thead><tr>${headerCells.map(c => `<th>${c}</th>`).join('')}</tr></thead>`;
        const tbody = rows.length
          ? `<tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>`
          : '';
        html.push(`<table class="ai-table">${thead}${tbody}</table>`);
        idx = j - 1; // advance outer loop
        continue;
      }

      // Segment headings with time: e.g., "Segment 1 (5–15 min): What is Science?" or "Introduction (0–5 min):"
      const seg = line.match(/^(.*?)(?:\s*\((\d+\s*[–-]\s*\d+\s*min)\)):\s*(.*)$/i);
      if (seg) {
        flushList();
        const segTitle = (seg[1] || '').trim();
        const time = (seg[2] || '').trim();
        const trailing = (seg[3] || '').trim();
        const titleHtml = trailing ? `${segTitle}: <small>${trailing}</small>` : segTitle;
        html.push(`<h3>${titleHtml} <span class="time-badge">${time}</span></h3>`);
        continue;
      }

      // Simple section headings ending with ':' (not bullets)
      if (/^[^|].*:\s*$/.test(line) && !/^[-*]\s+/.test(line)) {
        flushList();
        const label = line.replace(/:\s*$/, '').trim();
        if (/^(learning objectives|materials needed|40[-\u2013-]?minute lesson plan|homework\/extension|educational resources)$/i.test(label)) {
          html.push(`<h2>${label}</h2>`);
        } else {
          html.push(`<h3>${label}</h3>`);
        }
        continue;
      }

      const m3 = line.match(/^###\s+(.*)$/);
      const m2 = m3 ? null : line.match(/^##\s+(.*)$/);
      const m1 = (m3 || m2) ? null : line.match(/^#\s+(.*)$/);
      if (m3 || m2 || m1) {
        flushList();
        const content = (m3?.[1] || m2?.[1] || m1?.[1] || '').trim();
        if (m3) html.push(`<h3>${content}</h3>`);
        else if (m2) html.push(`<h2>${content}</h2>`);
        else html.push(`<h1>${content}</h1>`);
        continue;
      }

      const bullet = line.match(/^[-*]\s+(.*)$/);
      if (bullet) {
        if (!inList) {
          html.push('<ul>');
          inList = true;
        }
        let item = bullet[1];
        item = item.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html.push(`<li>${item}</li>`);
        continue;
      }

      flushList();
      const paragraph = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      html.push(`<p>${paragraph}</p>`);
    }

    flushList();
    return html.join('\n');
  };

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
    <div className="flex flex-col h-full overflow-hidden">
      {/* Modern Topic Header */}
      <div className="px-8 py-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center gap-4 mb-5">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg border border-primary-200 bg-primary-50 text-primary-600 shadow-sm">
            <FileText size={20} />
          </div>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="flex-1 text-2xl font-bold text-gray-900 dark:text-gray-100 bg-transparent border-0 border-b-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-primary-500 dark:focus:border-primary-400 focus:outline-none transition-colors px-2 py-1"
            placeholder="Topic name"
          />
        </div>
        
        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={generateAllAIContent}
            disabled={generatingAI || loading || (allAIContentExists && user?.email !== 's.p@seedlinglabs.com')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed ${
              allAIContentExists && user?.email !== 's.p@seedlinglabs.com'
                ? 'bg-success-500 text-white hover:bg-success-600 focus:ring-success-400'
                : 'bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-400'
            }`}
            title={allAIContentExists && user?.email !== 's.p@seedlinglabs.com' ? 'All AI content has been generated' : anyAIContentExists ? 'Generate missing AI content for this topic' : 'Generate AI content for this topic'}
          >
            <Sparkles size={16} />
            <span className="hidden sm:inline">
              {generatingAI 
                ? (aiGenerationStatus || 'Generating...') 
                : allAIContentExists && user?.email !== 's.p@seedlinglabs.com'
                  ? 'All AI Content Generated' 
                  : anyAIContentExists
                    ? 'Generate Missing Content'
                    : 'Generate AI Content'
              }
            </span>
            <span className="sm:hidden">
              {generatingAI ? 'Generating...' : 'AI Content'}
            </span>
          </button>
          
          <button
            onClick={handleMarkCompleteClick}
            className="inline-flex items-center gap-2 px-4 py-2 bg-success-500 text-white rounded-lg font-medium text-sm hover:bg-success-600 transition-all shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-success-400 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
            title="Mark this topic as complete for specific sections"
          >
            <CheckCircle size={16} />
            <span className="hidden sm:inline">Mark Complete</span>
          </button>
          
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-2 border-gray-300 dark:border-gray-600 rounded-lg font-medium text-sm hover:border-primary-500 hover:text-primary-600 dark:hover:text-primary-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            <Save size={16} />
            <span className="hidden sm:inline">{loading ? 'Saving...' : 'Save Changes'}</span>
            <span className="sm:hidden">Save</span>
          </button>
        </div>
      </div>

      {/* Error Messages */}
      {error && (
        <div className="mx-8 mt-6 p-4 bg-error-50 dark:bg-error-900/30 border border-error-200 dark:border-error-800 rounded-lg flex items-start gap-3 animate-slide-in">
          <span className="flex-1 text-sm text-error-800 dark:text-error-300">{error}</span>
          <button 
            onClick={clearError}
            className="text-error-600 dark:text-error-400 hover:text-error-800 dark:hover:text-error-200 transition-colors text-xl"
          >
            ×
          </button>
        </div>
      )}

      {aiError && (
        <div className="mx-8 mt-6 p-4 bg-error-50 dark:bg-error-900/30 border border-error-200 dark:border-error-800 rounded-lg flex items-start gap-3 animate-slide-in">
          <span className="flex-1 text-sm text-error-800 dark:text-error-300">{aiError}</span>
          <button 
            onClick={() => setAiError(null)}
            className="text-error-600 dark:text-error-400 hover:text-error-800 dark:hover:text-error-200 transition-colors text-xl"
          >
            ×
          </button>
        </div>
      )}

      {/* Modern Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 overflow-x-auto scrollbar-thin">
        <div className="flex gap-2 px-8 min-w-max">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => !tab.disabled && setActiveTab(tab.id as TabType)}
                className={`relative inline-flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 ${
                  activeTab === tab.id
                    ? 'text-primary-600 dark:text-primary-400 border-primary-600 dark:border-primary-400 bg-white dark:bg-gray-900'
                    : tab.disabled
                    ? 'text-gray-400 dark:text-gray-600 border-transparent cursor-not-allowed'
                    : 'text-gray-600 dark:text-gray-400 border-transparent hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                disabled={tab.disabled}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-900 scrollbar-thin">
        {activeTab === 'details' && (
          <div className="p-8 space-y-6 w-full">
            {/* Textbook Content Section - Card Style */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-md">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg border border-primary-200 bg-primary-50 text-primary-600">
                  <FileText size={18} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Textbook Content</h3>
              </div>
              
              {!formData.description ? (
                <div>
                  <PDFUpload
                    onTextExtracted={handlePDFTextExtracted}
                    onError={handlePDFError}
                    disabled={false}
                  />
                  {pdfError && (
                    <div className="mt-4 p-4 bg-error-50 dark:bg-error-900/30 border border-error-200 dark:border-error-800 rounded-lg flex items-start gap-3">
                      <span className="flex-1 text-sm text-error-800 dark:text-error-300">{pdfError}</span>
                      <button 
                        onClick={() => setPdfError(null)}
                        className="text-error-600 dark:text-error-400 hover:text-error-800 dark:hover:text-error-200 transition-colors text-xl"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Extracted from PDF</span>
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 px-3 py-1.5 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors text-sm font-medium"
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
                    rows={8}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all resize-y"
                  />
                  <p className="mt-2 text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                    💡 This content is used by AI to generate lesson plans and teaching guides. Click "Replace Content" to upload a new PDF.
                  </p>
                </div>
              )}
            </div>

            {/* Document Links Section - Card Style */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-md">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg border border-success-200 bg-success-50 text-success-600">
                    <ExternalLink size={18} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Document Links</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDiscoveryModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg font-medium text-sm hover:bg-primary-600 transition-all shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary-400"
                >
                  <Search size={14} />
                  <span className="hidden sm:inline">Discover Documents</span>
                  <span className="sm:hidden">Discover</span>
                </button>
              </div>
              
              {/* Add Document Form */}
              <div className="flex gap-3 mb-4 flex-wrap sm:flex-nowrap">
                <input
                  type="url"
                  name="documentLinkInput"
                  value={formData.documentLinkInput}
                  onChange={handleChange}
                  placeholder="https://example.com/document.pdf"
                  className="flex-1 min-w-[200px] px-4 py-2.5 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                />
                <input
                  type="text"
                  name="documentLinkNameInput"
                  value={formData.documentLinkNameInput}
                  onChange={handleChange}
                  placeholder="Optional name"
                  className="w-full sm:w-48 px-4 py-2.5 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                />
                <button 
                  type="button" 
                  onClick={addDocumentLink}
                  className="px-4 py-2.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-2 border-gray-300 dark:border-gray-600 rounded-lg font-medium text-sm hover:border-success-500 hover:text-success-600 dark:hover:text-success-400 transition-all"
                >
                  Add
                </button>
              </div>
              {/* Document Links List */}
              {formData.documentLinks.length > 0 ? (
                <div className="space-y-2">
                  {formData.documentLinks.map((link, index) => (
                    <div key={link.url} className="group flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-primary-300 dark:hover:border-primary-600 hover:shadow-sm transition-all">
                      <a 
                        href={link.url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center gap-2.5 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors flex-1 min-w-0"
                      >
                        <ExternalLink size={16} className="flex-shrink-0" />
                        <span className="text-sm font-medium truncate">{link.name}</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => removeDocumentLink(link.url)}
                        className="p-2 text-gray-400 dark:text-gray-500 hover:text-error-600 dark:hover:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        title="Remove link"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <ExternalLink size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No document links added yet</p>
                </div>
              )}
            </div>

            {/* Details Section - Card Style */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-md">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                  <Calendar size={18} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Details</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                    <Calendar size={16} className="text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Created</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{formatDate(topic.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div className="p-2 bg-success-100 dark:bg-success-900/30 rounded-lg">
                    <Calendar size={16} className="text-success-600 dark:text-success-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Last Updated</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{formatDate(topic.updatedAt)}</p>
                  </div>
                </div>
                {topic.aiContent?.generatedAt && (
                  <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                      <Sparkles size={16} className="text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">AI Content Generated</p>
                      <p className="text-sm font-semibold text-purple-900 dark:text-purple-100">{formatDate(topic.aiContent.generatedAt)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Danger Zone - Card Style */}
            <div className="bg-gradient-to-br from-error-50 to-error-100 dark:from-error-900/20 dark:to-error-900/40 rounded-xl border-2 border-error-200 dark:border-error-800 p-6 shadow-md">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-error-600 rounded-lg">
                  <AlertTriangle size={18} className="text-white" />
                </div>
                <h3 className="text-lg font-bold text-error-900 dark:text-error-100">Danger Zone</h3>
              </div>
              <p className="text-sm text-error-800 dark:text-error-200 mb-4 leading-relaxed">
                ⚠️ Permanently delete this topic and all its content. This action cannot be undone.
              </p>
              <button 
                onClick={handleDelete} 
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-error-600 text-white rounded-lg font-medium text-sm hover:bg-error-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 size={16} />
                Delete Topic
              </button>
            </div>
          </div>
        )}


        {activeTab === 'lesson-plan' && topic.aiContent?.lessonPlan && (
          <div className="p-8">
            {/* Action Bar */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg border border-primary-200 bg-primary-50 text-primary-600 shadow-sm">
                  <GraduationCap size={20} />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Lesson Plan</h2>
              </div>
              <div className="flex items-center gap-2">
                {isEditingLessonPlan ? (
                  <>
                    <button 
                      onClick={handleSaveLessonPlan} 
                      disabled={savingContent === 'lesson-plan'}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg font-medium text-sm hover:bg-primary-600 transition-all shadow-sm hover:shadow-md disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary-400"
                    >
                      <Save size={14} />
                      {savingContent === 'lesson-plan' ? 'Saving...' : 'Save'}
                    </button>
                    <button 
                      onClick={handleCancelEditingLessonPlan}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-2 border-gray-300 dark:border-gray-600 rounded-lg font-medium text-sm hover:border-gray-400 transition-all"
                    >
                      <X size={14} />
                      Cancel
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={handleStartEditingLessonPlan}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-2 border-gray-300 dark:border-gray-600 rounded-lg font-medium text-sm hover:border-primary-500 hover:text-primary-600 dark:hover:text-primary-400 transition-all"
                  >
                    <Edit3 size={14} />
                    Edit
                  </button>
                )}
              </div>
            </div>
            
            {/* Content */}
            {isEditingLessonPlan ? (
              <div>
                <div className="mb-4 p-3 bg-primary-50 dark:bg-primary-900/20 border-l-4 border-primary-500 dark:border-primary-400 rounded-lg">
                  <p className="text-sm text-primary-800 dark:text-primary-300">
                    💡 <strong>Keyboard shortcuts:</strong> Ctrl+S to save, Esc to cancel
                  </p>
                </div>
                <textarea
                  value={editingLessonPlan}
                  onChange={(e) => setEditingLessonPlan(e.target.value)}
                  rows={20}
                  placeholder="Enter your lesson plan content..."
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all resize-y font-mono"
                />
              </div>
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none bg-gray-50 dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <div
                  dangerouslySetInnerHTML={{ __html: formatSimpleMarkdown(topic.aiContent.lessonPlan) }}
                />
              </div>
            )}
          </div>
        )}

        {activeTab === 'teaching-guide' && (topic.aiContent?.teachingGuide || teachingGuide) && (
          <div className="p-8">
            {/* Action Bar */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg border border-success-200 bg-success-50 text-success-600 shadow-sm">
                  <User size={20} />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Teaching Guide</h2>
              </div>
              <div className="flex items-center gap-2">
                {isEditingTeachingGuide ? (
                  <>
                    <button 
                      onClick={handleSaveTeachingGuide} 
                      disabled={savingContent === 'teaching-guide'}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg font-medium text-sm hover:bg-primary-600 transition-all shadow-sm hover:shadow-md disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary-400"
                    >
                      <Save size={14} />
                      {savingContent === 'teaching-guide' ? 'Saving...' : 'Save'}
                    </button>
                    <button 
                      onClick={handleCancelEditingTeachingGuide}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-2 border-gray-300 dark:border-gray-600 rounded-lg font-medium text-sm hover:border-gray-400 transition-all"
                    >
                      <X size={14} />
                      Cancel
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={handleStartEditingTeachingGuide}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-2 border-gray-300 dark:border-gray-600 rounded-lg font-medium text-sm hover:border-primary-500 hover:text-primary-600 dark:hover:text-primary-400 transition-all"
                  >
                    <Edit3 size={14} />
                    Edit
                  </button>
                )}
              </div>
            </div>
            
            {/* Content */}
            {isEditingTeachingGuide ? (
              <textarea
                value={editingTeachingGuide}
                onChange={(e) => setEditingTeachingGuide(e.target.value)}
                rows={20}
                placeholder="Enter your teaching guide content..."
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all resize-y font-mono"
              />
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none bg-gray-50 dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <div
                  dangerouslySetInnerHTML={{ __html: formatSimpleMarkdown(topic.aiContent?.teachingGuide || teachingGuide || '') }}
                />
              </div>
            )}
          </div>
        )}

        {activeTab === 'group-discussion' && (topic.aiContent?.groupDiscussion || groupDiscussion) && (
          <div className="p-8">
            {/* Action Bar */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg border border-purple-200 bg-purple-50 text-purple-600 shadow-sm">
                  <Users size={20} />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Group Discussion</h2>
              </div>
              <div className="flex items-center gap-2">
                {isEditingGroupDiscussion ? (
                  <>
                    <button 
                      onClick={handleSaveGroupDiscussion} 
                      disabled={savingContent === 'group-discussion'}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg font-medium text-sm hover:bg-primary-600 transition-all shadow-sm hover:shadow-md disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary-400"
                    >
                      <Save size={14} />
                      {savingContent === 'group-discussion' ? 'Saving...' : 'Save'}
                    </button>
                    <button 
                      onClick={handleCancelEditingGroupDiscussion}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-2 border-gray-300 dark:border-gray-600 rounded-lg font-medium text-sm hover:border-gray-400 transition-all"
                    >
                      <X size={14} />
                      Cancel
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={handleStartEditingGroupDiscussion}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-2 border-gray-300 dark:border-gray-600 rounded-lg font-medium text-sm hover:border-primary-500 hover:text-primary-600 dark:hover:text-primary-400 transition-all"
                  >
                    <Edit3 size={14} />
                    Edit
                  </button>
                )}
              </div>
            </div>
            
            {/* Content */}
            {isEditingGroupDiscussion ? (
              <textarea
                value={editingGroupDiscussion}
                onChange={(e) => setEditingGroupDiscussion(e.target.value)}
                rows={20}
                placeholder="Enter your group discussion content..."
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all resize-y font-mono"
              />
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none bg-gray-50 dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <div
                  dangerouslySetInnerHTML={{ __html: formatSimpleMarkdown(topic.aiContent?.groupDiscussion || groupDiscussion || '') }}
                />
              </div>
            )}
          </div>
        )}

        {activeTab === 'assessment' && (topic.aiContent?.assessmentQuestions || assessmentQuestions) && (
          <div className="p-8">
            {/* Action Bar */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg border border-warning-200 bg-warning-50 text-warning-700 shadow-sm">
                  <ClipboardList size={20} />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Assessment Questions</h2>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {isEditingAssessmentQuestions ? (
                  <>
                    <button 
                      onClick={handleSaveAssessmentQuestions} 
                      disabled={savingContent === 'assessment-questions'}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg font-medium text-sm hover:bg-primary-600 transition-all shadow-sm hover:shadow-md disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary-400"
                    >
                      <Save size={14} />
                      {savingContent === 'assessment-questions' ? 'Saving...' : 'Save'}
                    </button>
                    <button 
                      onClick={handleCancelEditingAssessmentQuestions}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-2 border-gray-300 dark:border-gray-600 rounded-lg font-medium text-sm hover:border-gray-400 transition-all"
                    >
                      <X size={14} />
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      onClick={handleStartEditingAssessmentQuestions}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-2 border-gray-300 dark:border-gray-600 rounded-lg font-medium text-sm hover:border-primary-500 hover:text-primary-600 dark:hover:text-primary-400 transition-all"
                    >
                      <Edit3 size={14} />
                      Edit
                    </button>
                    <button 
                      onClick={handleExportAssessmentPDF} 
                      disabled={exportingAssessment}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-2 border-gray-300 dark:border-gray-600 rounded-lg font-medium text-sm hover:border-error-500 hover:text-error-600 dark:hover:text-error-400 transition-all disabled:opacity-50"
                      title="Export as PDF"
                    >
                      <Download size={14} />
                      PDF
                    </button>
                    <button 
                      onClick={handleExportAssessmentWord} 
                      disabled={exportingAssessment}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-2 border-gray-300 dark:border-gray-600 rounded-lg font-medium text-sm hover:border-primary-500 hover:text-primary-600 dark:hover:text-primary-400 transition-all disabled:opacity-50"
                      title="Export as Word"
                    >
                      <FileDown size={14} />
                      Word
                    </button>
                  </>
                )}
              </div>
            </div>
            {/* Content */}
            {isEditingAssessmentQuestions ? (
              <div>
                <div className="mb-4 p-3 bg-primary-50 dark:bg-primary-900/20 border-l-4 border-primary-500 dark:border-primary-400 rounded-lg">
                  <p className="text-sm text-primary-800 dark:text-primary-300">
                    💡 <strong>Keyboard shortcuts:</strong> Ctrl+S to save, Esc to cancel
                  </p>
                </div>
                <textarea
                  value={editingAssessmentQuestions}
                  onChange={(e) => setEditingAssessmentQuestions(e.target.value)}
                  rows={20}
                  placeholder="Enter your assessment questions content..."
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all resize-y font-mono"
                />
              </div>
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none bg-gray-50 dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <div
                  dangerouslySetInnerHTML={{ __html: formatSimpleMarkdown(topic.aiContent?.assessmentQuestions || assessmentQuestions || '') }}
                />
              </div>
            )}
          </div>
        )}

        {activeTab === 'worksheets' && (topic.aiContent?.worksheets || worksheets) && (
          <div className="p-8">
            {/* Action Bar */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg border border-primary-200 bg-primary-50 text-primary-600 shadow-sm">
                  <BookOpen size={20} />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Worksheets</h2>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {isEditingWorksheets ? (
                  <>
                    <button 
                      onClick={handleSaveWorksheets} 
                      disabled={savingContent === 'worksheets'}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg font-medium text-sm hover:bg-primary-600 transition-all shadow-sm hover:shadow-md disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary-400"
                    >
                      <Save size={14} />
                      {savingContent === 'worksheets' ? 'Saving...' : 'Save'}
                    </button>
                    <button 
                      onClick={handleCancelEditingWorksheets}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-2 border-gray-300 dark:border-gray-600 rounded-lg font-medium text-sm hover:border-gray-400 transition-all"
                    >
                      <X size={14} />
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      onClick={handleStartEditingWorksheets}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-2 border-gray-300 dark:border-gray-600 rounded-lg font-medium text-sm hover:border-primary-500 hover:text-primary-600 dark:hover:text-primary-400 transition-all"
                    >
                      <Edit3 size={14} />
                      Edit
                    </button>
                    <button 
                      onClick={handleExportWorksheetsPDF} 
                      disabled={exportingWorksheets}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-2 border-gray-300 dark:border-gray-600 rounded-lg font-medium text-sm hover:border-error-500 hover:text-error-600 dark:hover:text-error-400 transition-all disabled:opacity-50"
                      title="Export as PDF"
                    >
                      <Download size={14} />
                      PDF
                    </button>
                    <button 
                      onClick={handleExportWorksheetsWord} 
                      disabled={exportingWorksheets}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-2 border-gray-300 dark:border-gray-600 rounded-lg font-medium text-sm hover:border-primary-500 hover:text-primary-600 dark:hover:text-primary-400 transition-all disabled:opacity-50"
                      title="Export as Word"
                    >
                      <FileDown size={14} />
                      Word
                    </button>
                  </>
                )}
              </div>
            </div>
            
            {/* Content */}
            {isEditingWorksheets ? (
              <div>
                <div className="mb-4 p-3 bg-primary-50 dark:bg-primary-900/20 border-l-4 border-primary-500 dark:border-primary-400 rounded-lg">
                  <p className="text-sm text-primary-800 dark:text-primary-300">
                    💡 <strong>Keyboard shortcuts:</strong> Ctrl+S to save, Esc to cancel
                  </p>
                </div>
                <textarea
                  value={editingWorksheets}
                  onChange={(e) => setEditingWorksheets(e.target.value)}
                  rows={20}
                  placeholder="Enter your worksheets content..."
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all resize-y font-mono"
                />
              </div>
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none bg-gray-50 dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <div
                  dangerouslySetInnerHTML={{ __html: formatSimpleMarkdown(topic.aiContent?.worksheets || worksheets || '') }}
                />
              </div>
            )}
          </div>
        )}

        {activeTab === 'videos' && (
          <div className="p-8">
            {/* Video Management Header */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg border border-error-200 bg-error-50 text-error-600 shadow-sm">
                  <Youtube size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Video Resources</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Teacher videos and AI-recommended content</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddingVideo(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg font-medium text-sm hover:bg-primary-600 transition-all shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary-400"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">Add Video Link</span>
                <span className="sm:hidden">Add</span>
              </button>
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
                    <div className="mt-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Teacher YouTube Videos with Embedded Player */}
                        {youtubeTeacherVideos.map((video, index) => {
                          const videoId = extractYouTubeID(video.url);
                          if (!videoId) return null;
                          
                          return (
                            <div key={`custom-${index}`} className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
                              <div 
                                className="cursor-pointer relative"
                                onClick={() => setPlayingVideo({ id: videoId, title: video.name })}
                              >
                                <div className="relative w-full aspect-video bg-gray-900">
                                  <img 
                                    src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                                    alt={video.name}
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <div className="text-white flex flex-col items-center gap-2">
                                      <Youtube size={40} />
                                      <span className="text-sm font-semibold">Play Video</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="p-3">
                                  <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-2 line-clamp-2 leading-tight">{video.name}</h4>
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="inline-flex items-center px-2 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded text-xs font-medium">
                                      <User size={10} className="mr-1" />
                                      Teacher Added
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditVideo(video.url);
                                      }}
                                      className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors"
                                      title="Edit video"
                                    >
                                      <Edit3 size={14} />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteVideo(video.url);
                                      }}
                                      className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-error-600 dark:hover:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/20 rounded transition-colors"
                                      title="Delete video"
                                    >
                                      <Trash2 size={14} />
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
                          <div key={video.id} className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-all duration-200 hover:-translate-y-1 relative">
                            <div className="absolute top-2 left-2 z-10">
                              <span className="inline-flex items-center px-2 py-1 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded text-xs font-bold shadow-md">
                                <Sparkles size={10} className="mr-1" />
                                AI
                              </span>
                            </div>
                            <div 
                              className="cursor-pointer relative"
                              onClick={() => setPlayingVideo({ id: video.id, title: video.title })}
                            >
                              <div className="relative w-full aspect-video bg-gray-900">
                                <img 
                                  src={video.thumbnail} 
                                  alt={video.title}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <div className="text-white flex flex-col items-center gap-2">
                                    <Youtube size={40} />
                                    <span className="text-sm font-semibold">Play Video</span>
                                  </div>
                                </div>
                              </div>
                              <div className="p-3">
                                <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-1 line-clamp-2 leading-tight">{video.title}</h4>
                                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{video.channelTitle}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-500 mb-2">{video.duration}</p>
                                {video.description && (
                                  <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed mb-2">
                                    {video.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteAIVideo(video.id);
                                    }}
                                    className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-error-600 dark:hover:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/20 rounded transition-colors"
                                    title="Delete AI video"
                                  >
                                    <Trash2 size={14} />
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

      {/* Full-page loading overlay during AI content generation - MODERN DESIGN */}
      {generatingAI && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-8 max-w-2xl w-[90%] animate-scale-in">
            <div className="text-center">
              {/* Spinner */}
              <div className="mb-6">
                <Loader2 size={56} className="mx-auto text-primary-600 dark:text-primary-400 animate-spin" />
              </div>
              
              {/* Title */}
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                Generating AI Content
              </h2>
              
              {/* Current Status */}
              <p className="text-base text-gray-600 dark:text-gray-400 mb-8">
                {aiGenerationStatus || 'Please wait while we generate comprehensive educational content...'}
              </p>
              
              {/* Progress Steps - Grid Layout */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                {!topic.aiContent?.lessonPlan && (
                  <div className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-300 ${
                    aiGenerationStatus.toLowerCase().includes('lesson plan')
                      ? 'bg-primary-100 dark:bg-primary-900/40 border-primary-500 dark:border-primary-400 shadow-lg scale-105'
                      : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 opacity-60'
                  }`}>
                    <GraduationCap size={28} className={
                      aiGenerationStatus.toLowerCase().includes('lesson plan')
                        ? 'text-primary-600 dark:text-primary-400 mb-2'
                        : 'text-gray-400 dark:text-gray-500 mb-2'
                    } />
                    <span className={`text-sm font-semibold text-center ${
                      aiGenerationStatus.toLowerCase().includes('lesson plan')
                        ? 'text-primary-700 dark:text-primary-300'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      Lesson Plan
                    </span>
                    {aiGenerationStatus.toLowerCase().includes('lesson plan') && (
                      <div className="mt-2 flex gap-1">
                        <div className="w-1.5 h-1.5 bg-primary-600 dark:bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-1.5 h-1.5 bg-primary-600 dark:bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-1.5 h-1.5 bg-primary-600 dark:bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    )}
                  </div>
                )}
                
                {!topic.aiContent?.teachingGuide && (
                  <div className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-300 ${
                    aiGenerationStatus.toLowerCase().includes('teaching guide')
                      ? 'bg-primary-100 dark:bg-primary-900/40 border-primary-500 dark:border-primary-400 shadow-lg scale-105'
                      : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 opacity-60'
                  }`}>
                    <User size={28} className={
                      aiGenerationStatus.toLowerCase().includes('teaching guide')
                        ? 'text-primary-600 dark:text-primary-400 mb-2'
                        : 'text-gray-400 dark:text-gray-500 mb-2'
                    } />
                    <span className={`text-sm font-semibold text-center ${
                      aiGenerationStatus.toLowerCase().includes('teaching guide')
                        ? 'text-primary-700 dark:text-primary-300'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      Teaching Guide
                    </span>
                    {aiGenerationStatus.toLowerCase().includes('teaching guide') && (
                      <div className="mt-2 flex gap-1">
                        <div className="w-1.5 h-1.5 bg-primary-600 dark:bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-1.5 h-1.5 bg-primary-600 dark:bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-1.5 h-1.5 bg-primary-600 dark:bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    )}
                  </div>
                )}
                
                {!topic.aiContent?.groupDiscussion && (
                  <div className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-300 ${
                    aiGenerationStatus.toLowerCase().includes('group discussion')
                      ? 'bg-primary-100 dark:bg-primary-900/40 border-primary-500 dark:border-primary-400 shadow-lg scale-105'
                      : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 opacity-60'
                  }`}>
                    <Users size={28} className={
                      aiGenerationStatus.toLowerCase().includes('group discussion')
                        ? 'text-primary-600 dark:text-primary-400 mb-2'
                        : 'text-gray-400 dark:text-gray-500 mb-2'
                    } />
                    <span className={`text-sm font-semibold text-center ${
                      aiGenerationStatus.toLowerCase().includes('group discussion')
                        ? 'text-primary-700 dark:text-primary-300'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      Group Discussion
                    </span>
                    {aiGenerationStatus.toLowerCase().includes('group discussion') && (
                      <div className="mt-2 flex gap-1">
                        <div className="w-1.5 h-1.5 bg-primary-600 dark:bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-1.5 h-1.5 bg-primary-600 dark:bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-1.5 h-1.5 bg-primary-600 dark:bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    )}
                  </div>
                )}
                
                {!topic.aiContent?.assessmentQuestions && (
                  <div className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-300 ${
                    aiGenerationStatus.toLowerCase().includes('assessment')
                      ? 'bg-primary-100 dark:bg-primary-900/40 border-primary-500 dark:border-primary-400 shadow-lg scale-105'
                      : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 opacity-60'
                  }`}>
                    <ClipboardList size={28} className={
                      aiGenerationStatus.toLowerCase().includes('assessment')
                        ? 'text-primary-600 dark:text-primary-400 mb-2'
                        : 'text-gray-400 dark:text-gray-500 mb-2'
                    } />
                    <span className={`text-sm font-semibold text-center ${
                      aiGenerationStatus.toLowerCase().includes('assessment')
                        ? 'text-primary-700 dark:text-primary-300'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      Assessment
                    </span>
                    {aiGenerationStatus.toLowerCase().includes('assessment') && (
                      <div className="mt-2 flex gap-1">
                        <div className="w-1.5 h-1.5 bg-primary-600 dark:bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-1.5 h-1.5 bg-primary-600 dark:bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-1.5 h-1.5 bg-primary-600 dark:bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    )}
                  </div>
                )}
                
                {!topic.aiContent?.worksheets && (
                  <div className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-300 ${
                    aiGenerationStatus.toLowerCase().includes('worksheets')
                      ? 'bg-primary-100 dark:bg-primary-900/40 border-primary-500 dark:border-primary-400 shadow-lg scale-105'
                      : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 opacity-60'
                  }`}>
                    <BookOpen size={28} className={
                      aiGenerationStatus.toLowerCase().includes('worksheets')
                        ? 'text-primary-600 dark:text-primary-400 mb-2'
                        : 'text-gray-400 dark:text-gray-500 mb-2'
                    } />
                    <span className={`text-sm font-semibold text-center ${
                      aiGenerationStatus.toLowerCase().includes('worksheets')
                        ? 'text-primary-700 dark:text-primary-300'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      Worksheets
                    </span>
                    {aiGenerationStatus.toLowerCase().includes('worksheets') && (
                      <div className="mt-2 flex gap-1">
                        <div className="w-1.5 h-1.5 bg-primary-600 dark:bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-1.5 h-1.5 bg-primary-600 dark:bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-1.5 h-1.5 bg-primary-600 dark:bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    )}
                  </div>
                )}
                
                {(!topic.aiContent?.videos || topic.aiContent.videos.length === 0) && (
                  <div className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-300 ${
                    aiGenerationStatus.toLowerCase().includes('videos')
                      ? 'bg-primary-100 dark:bg-primary-900/40 border-primary-500 dark:border-primary-400 shadow-lg scale-105'
                      : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 opacity-60'
                  }`}>
                    <Youtube size={28} className={
                      aiGenerationStatus.toLowerCase().includes('videos')
                        ? 'text-primary-600 dark:text-primary-400 mb-2'
                        : 'text-gray-400 dark:text-gray-500 mb-2'
                    } />
                    <span className={`text-sm font-semibold text-center ${
                      aiGenerationStatus.toLowerCase().includes('videos')
                        ? 'text-primary-700 dark:text-primary-300'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      Videos
                    </span>
                    {aiGenerationStatus.toLowerCase().includes('videos') && (
                      <div className="mt-2 flex gap-1">
                        <div className="w-1.5 h-1.5 bg-primary-600 dark:bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-1.5 h-1.5 bg-primary-600 dark:bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-1.5 h-1.5 bg-primary-600 dark:bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Help Note */}
              <div className="mt-6 p-4 bg-primary-50 dark:bg-primary-900/20 border-l-4 border-primary-500 dark:border-primary-400 rounded-lg">
                <p className="text-sm text-primary-800 dark:text-primary-300 font-medium">
                  ⏱️ This may take a few minutes. Please don't close this page.
                </p>
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

