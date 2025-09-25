import React, { useState, useEffect } from 'react';
import { FileText, Calendar, ExternalLink, Trash2, Save, Sparkles, GraduationCap, Search, Youtube, User, Users, ClipboardList, BookOpen } from 'lucide-react';
import { Topic, DocumentLink } from '../types';
import { useApp } from '../context/AppContext';
import { secureGeminiService } from '../services/secureGeminiService';
import { youtubeService } from '../services/youtubeService';
import DocumentDiscoveryModal from './DocumentDiscoveryModal';
import { PDFUpload } from './PDFUpload';
 

interface TopicTabbedViewProps {
  topic: Topic;
  onTopicDeleted: () => void;
}

type TabType = 'details' | 'lesson-plan' | 'teaching-guide' | 'group-discussion' | 'videos' | 'assessment' | 'worksheets';

const TopicTabbedView: React.FC<TopicTabbedViewProps> = ({ topic, onTopicDeleted }) => {
  const { updateTopic, deleteTopic, loading, error, clearError, currentPath } = useApp();
  const [activeTab, setActiveTab] = useState<TabType>('details');
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
    
    // Initialize editing states with current content or clear if not available
    if (topic.aiContent?.lessonPlan) {
      setEditingLessonPlan(topic.aiContent.lessonPlan);
    } else {
      setEditingLessonPlan('');
    }
    
    if (topic.aiContent?.teachingGuide) {
      setEditingTeachingGuide(topic.aiContent.teachingGuide);
    } else {
      setEditingTeachingGuide('');
    }
    
    if (topic.aiContent?.groupDiscussion) {
      setEditingGroupDiscussion(topic.aiContent.groupDiscussion);
    } else {
      setEditingGroupDiscussion('');
    }
    
    if (topic.aiContent?.assessmentQuestions) {
      setEditingAssessmentQuestions(topic.aiContent.assessmentQuestions);
    } else {
      setEditingAssessmentQuestions('');
    }
    
    if (topic.aiContent?.worksheets) {
      setEditingWorksheets(topic.aiContent.worksheets);
    } else {
      setEditingWorksheets('');
    }
    
  }, [topic, isGeneratingContent]);

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

    try {
      // Step 1: Generate Lesson Plan
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
        
        // Update the topic with the lesson plan
        await updateTopic(topic.id, {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          documentLinks: formData.documentLinks || [],
          aiContent: accumulatedAiContent,
        });
      } else {
        throw new Error(lessonPlanResult.error || 'Failed to generate lesson plan');
      }

      // Step 2: Generate Teaching Guide
      setAiGenerationStatus('Generating teaching guide...');
      
      // Add timeout to teaching guide generation
      const teachingGuidePromise = secureGeminiService.generateTeachingGuide(
        formData.name,
        formData.description || '',
        documentUrls,
        classLevel,
        subject
      );
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Teaching guide generation timeout after 30 seconds')), 30000)
      );
      
      const teachingGuideResult = await Promise.race([teachingGuidePromise, timeoutPromise]) as any;


      if (teachingGuideResult.success && teachingGuideResult.teachingGuide) {
        setTeachingGuide(teachingGuideResult.teachingGuide);
        
        // Accumulate the teaching guide content
        accumulatedAiContent = {
          ...accumulatedAiContent,
          teachingGuide: teachingGuideResult.teachingGuide
        };
        
        // Update topic with teaching guide
        const teachingGuideUpdate = {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          documentLinks: formData.documentLinks || [],
          aiContent: accumulatedAiContent,
        };
        await updateTopic(topic.id, teachingGuideUpdate);
      } else {
        console.error('Failed to generate teaching guide:', teachingGuideResult.error);
        console.error('Teaching guide result details:', teachingGuideResult);
      }

      // Step 3: Generate Group Discussion
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
        setTimeout(() => reject(new Error('Group discussion generation timeout after 30 seconds')), 30000)
      );
      
      const groupDiscussionResult = await Promise.race([groupDiscussionPromise, groupDiscussionTimeoutPromise]) as any;

      if (groupDiscussionResult.success && groupDiscussionResult.groupDiscussion) {
        setGroupDiscussion(groupDiscussionResult.groupDiscussion);
        
        // Accumulate the group discussion content
        accumulatedAiContent = {
          ...accumulatedAiContent,
          groupDiscussion: groupDiscussionResult.groupDiscussion
        };
        
        // Update topic with group discussion
        const groupDiscussionUpdate = {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          documentLinks: formData.documentLinks || [],
          aiContent: accumulatedAiContent,
        };
        await updateTopic(topic.id, groupDiscussionUpdate);
      } else {
        console.error('Failed to generate group discussion:', groupDiscussionResult.error);
        console.error('Group discussion result details:', groupDiscussionResult);
      }

      // Step 4: Generate Assessment Questions
      setAiGenerationStatus('Generating assessment questions...');
      
      const assessmentPromise = secureGeminiService.generateAssessmentQuestions(
        formData.name,
        formData.description || '',
        documentUrls,
        classLevel,
        subject
      );
      
      const assessmentTimeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Assessment generation timeout after 30 seconds')), 30000)
      );
      
      const assessmentResult = await Promise.race([assessmentPromise, assessmentTimeoutPromise]) as any;

      if (assessmentResult.success && assessmentResult.assessmentQuestions) {
        setAssessmentQuestions(assessmentResult.assessmentQuestions);
        
        // Accumulate the assessment questions content
        accumulatedAiContent = {
          ...accumulatedAiContent,
          assessmentQuestions: assessmentResult.assessmentQuestions
        };
        
        // Update topic with assessment questions
        const assessmentUpdate = {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          documentLinks: formData.documentLinks || [],
          aiContent: accumulatedAiContent,
        };
        await updateTopic(topic.id, assessmentUpdate);
      } else {
        console.error('Failed to generate assessment questions:', assessmentResult.error);
      }

      // Step 5: Generate Worksheets
      setAiGenerationStatus('Generating worksheets...');
      
      const worksheetsPromise = secureGeminiService.generateWorksheets(
        formData.name,
        formData.description || '',
        documentUrls,
        classLevel,
        subject
      );
      
      const worksheetsTimeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Worksheets generation timeout after 30 seconds')), 30000)
      );
      
      const worksheetsResult = await Promise.race([worksheetsPromise, worksheetsTimeoutPromise]) as any;

      if (worksheetsResult.success && worksheetsResult.worksheets) {
        setWorksheets(worksheetsResult.worksheets);
        
        // Accumulate the worksheets content
        accumulatedAiContent = {
          ...accumulatedAiContent,
          worksheets: worksheetsResult.worksheets
        };
        
        // Update topic with worksheets
        const worksheetsUpdate = {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          documentLinks: formData.documentLinks || [],
          aiContent: accumulatedAiContent,
        };
        await updateTopic(topic.id, worksheetsUpdate);
      } else {
        console.error('Failed to generate worksheets:', worksheetsResult.error);
      }

      // Step 6: Find Videos
      setAiGenerationStatus('Searching for educational videos...');
      await findVideosForTopic(accumulatedAiContent);

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
        const updatedAIContent = {
          ...accumulatedAiContent,
          videos: videoResults.videos
        };

        // Update the topic immediately for display
        topic.aiContent = updatedAIContent;
        
        // Save the updated topic with videos
        await updateTopic(topic.id, {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          documentLinks: formData.documentLinks || [],
          aiContent: updatedAIContent,
        });
        
        console.log('Found and saved videos:', videoResults.videos);
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
      });
      
      // Clear the enhanced lesson plan after saving
      setEnhancedLessonPlan(null);
    } catch (error) {
      console.error('Failed to update topic:', error);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this topic?')) {
      try {
        await deleteTopic(topic.id);
        onTopicDeleted();
      } catch (error) {
        console.error('Failed to delete topic:', error);
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

  // Debug logging for AI content
  React.useEffect(() => {
  }, [topic]);

  const tabs = [
    { id: 'details', label: 'Topic Details', icon: FileText },
    { id: 'lesson-plan', label: 'Lesson Plan', icon: GraduationCap, disabled: !topic.aiContent?.lessonPlan },
    { id: 'teaching-guide', label: 'Teaching Guide', icon: User, disabled: !topic.aiContent?.teachingGuide && !teachingGuide },
    { id: 'group-discussion', label: 'Group Discussion', icon: Users, disabled: !topic.aiContent?.groupDiscussion && !groupDiscussion },
    { id: 'assessment', label: 'Assessment', icon: ClipboardList, disabled: !topic.aiContent?.assessmentQuestions && !assessmentQuestions },
    { id: 'worksheets', label: 'Worksheets', icon: BookOpen, disabled: !topic.aiContent?.worksheets && !worksheets },
    { id: 'videos', label: 'Videos', icon: Youtube, disabled: !topic.aiContent?.videos || topic.aiContent.videos.length === 0 },
  ];

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
            disabled={generatingAI || loading}
            className="btn btn-primary btn-sm"
            title="Generate AI content for this topic"
          >
            <Sparkles size={16} />
            {generatingAI ? (aiGenerationStatus || 'Generating AI Content...') : 'Generate AI Content'}
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
                <div
                  className="ai-rendered"
                  dangerouslySetInnerHTML={{ __html: formatSimpleMarkdown(topic.aiContent.lessonPlan) }}
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
                <div
                  className="ai-rendered"
                  dangerouslySetInnerHTML={{ __html: formatSimpleMarkdown(topic.aiContent?.teachingGuide || teachingGuide || '') }}
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
                <div
                  className="ai-rendered"
                  dangerouslySetInnerHTML={{ __html: formatSimpleMarkdown(topic.aiContent?.groupDiscussion || groupDiscussion || '') }}
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
                <button onClick={handleStartEditingAssessmentQuestions} className="btn btn-secondary btn-sm">Edit</button>
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
                <div
                  className="ai-rendered"
                  dangerouslySetInnerHTML={{ __html: formatSimpleMarkdown(topic.aiContent?.assessmentQuestions || assessmentQuestions || '') }}
                />
              </div>
            )}
          </div>
        )}

        {activeTab === 'worksheets' && (topic.aiContent?.worksheets || worksheets) && (
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
                <button onClick={handleStartEditingWorksheets} className="btn btn-secondary btn-sm">Edit</button>
              )}
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
                <div
                  className="ai-rendered"
                  dangerouslySetInnerHTML={{ __html: formatSimpleMarkdown(topic.aiContent?.worksheets || worksheets || '') }}
                />
              </div>
            )}
          </div>
        )}

        {activeTab === 'videos' && topic.aiContent?.videos && topic.aiContent.videos.length > 0 && (
          <div className="tab-panel videos-panel">
            <div className="videos-section">
              <div className="videos-grid">
                {topic.aiContent.videos.map((video, index) => (
                  <div key={video.id} className="video-card">
                    <a
                      href={video.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="video-link"
                    >
                      <div className="video-thumbnail">
                        <img 
                          src={video.thumbnail} 
                          alt={video.title}
                          className="thumbnail-image"
                        />
                        <div className="play-overlay">
                          <Youtube size={24} />
                        </div>
                      </div>
                      <div className="video-info">
                        <h4 className="video-title">{video.title}</h4>
                        <p className="video-channel">{video.channelTitle}</p>
                        <p className="video-duration">{video.duration}</p>
                        <p className="video-description">
                          {video.description.substring(0, 100)}...
                        </p>
                      </div>
                    </a>
                  </div>
                ))}
              </div>
            </div>
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
    </div>
  );
};

export default TopicTabbedView;
