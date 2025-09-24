import React, { useState, useEffect } from 'react';
import { FileText, Calendar, ExternalLink, Trash2, Save, Sparkles, GraduationCap, Search, Youtube, User, Image } from 'lucide-react';
import { Topic, DocumentLink } from '../types';
import { useApp } from '../context/AppContext';
import { secureGeminiService } from '../services/secureGeminiService';
import { youtubeService } from '../services/youtubeService';
import { imageSearchService } from '../services/imageSearchService';
import DocumentDiscoveryModal from './DocumentDiscoveryModal';
import LessonPlanDisplay from './LessonPlanDisplay';
import TeachingGuideDisplay from './TeachingGuideDisplay';
import ImageDisplay from './ImageDisplay';
import '../styles/LessonPlanDisplay.css';

interface TopicTabbedViewProps {
  topic: Topic;
  onTopicDeleted: () => void;
}

type TabType = 'details' | 'lesson-plan' | 'teaching-guide' | 'images' | 'videos';

const TopicTabbedView: React.FC<TopicTabbedViewProps> = ({ topic, onTopicDeleted }) => {
  const { updateTopic, deleteTopic, loading, error, clearError, currentPath } = useApp();
  const [activeTab, setActiveTab] = useState<TabType>('details');
  const [generatingAI, setGeneratingAI] = useState(false);
  const [findingVideos, setFindingVideos] = useState(false);
  const [aiGenerationStatus, setAiGenerationStatus] = useState<string>('');
  const [aiError, setAiError] = useState<string | null>(null);
  const [enhancedLessonPlan, setEnhancedLessonPlan] = useState<string | null>(null);
  const [teachingGuide, setTeachingGuide] = useState<string | null>(null);
  const [images, setImages] = useState<Array<{ title: string; description: string; url: string; source: string }>>([]);
  const [showDiscoveryModal, setShowDiscoveryModal] = useState(false);
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
      documentLinks: topic.documentLinks ? [...topic.documentLinks] : [],
    });
    
    // Load saved AI content
    if (topic.aiContent?.teachingGuide) {
      setTeachingGuide(topic.aiContent.teachingGuide);
    }
    
    if (topic.aiContent?.images) {
      setImages(topic.aiContent.images);
    }
  }, [topic]);

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

  const generateAllAIContent = async () => {
    if (!formData.documentLinks || formData.documentLinks.length === 0) {
      setAiError('Please add at least one document link before generating AI content.');
      return;
    }

    if (!formData.name.trim()) {
      setAiError('Please enter a topic name before generating AI content.');
      return;
    }

    const classLevel = currentPath.class?.name || 'Class 1';
    const documentUrls = formData.documentLinks.map(link => link.url);
    const subject = currentPath.subject?.name || 'General';

    setGeneratingAI(true);
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
          documentLinks: formData.documentLinks,
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
          documentLinks: formData.documentLinks,
          aiContent: accumulatedAiContent,
        };
        await updateTopic(topic.id, teachingGuideUpdate);
      } else {
        console.error('Failed to generate teaching guide:', teachingGuideResult.error);
        console.error('Teaching guide result details:', teachingGuideResult);
      }

      // Step 3: Find Educational Images
      setAiGenerationStatus('Finding educational images...');
      try {
        // Add timeout to image search
        const imageSearchPromise = imageSearchService.searchTopicImages(
          formData.name,
          classLevel,
          subject
        );
        
        const imageTimeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Image search timeout after 15 seconds')), 15000)
        );
        
        const imageResult = await Promise.race([imageSearchPromise, imageTimeoutPromise]) as any;
        
        
        if (imageResult.success && imageResult.images) {
          // Convert ImageSearchResult to the format expected by ImageDisplay
          const formattedImages = imageResult.images.map((img: any) => ({
            title: img.title,
            description: img.description,
            url: img.url,
            source: img.source
          }));
          setImages(formattedImages);
          
          // Accumulate the images content
          accumulatedAiContent = {
            ...accumulatedAiContent,
            images: formattedImages
          };
          
          // Update topic with images
          const imagesUpdate = {
            name: formData.name.trim(),
            description: formData.description.trim() || undefined,
            documentLinks: formData.documentLinks,
            aiContent: accumulatedAiContent,
          };
          await updateTopic(topic.id, imagesUpdate);
        } else {
          console.error('Failed to find images:', imageResult.error);
          console.error('Image result details:', imageResult);
        }
      } catch (error) {
        console.error('Error finding images:', error);
      }

      // Step 4: Find Videos
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
          documentLinks: formData.documentLinks,
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
        documentLinks: formData.documentLinks,
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
    { id: 'images', label: 'Images', icon: Image, disabled: (!topic.aiContent?.images || topic.aiContent.images.length === 0) && (!images || images.length === 0) },
    { id: 'videos', label: 'Videos', icon: Youtube, disabled: !topic.aiContent?.videos || topic.aiContent.videos.length === 0 },
  ];

  return (
    <div className="topic-tabbed-view">
      <div className="topic-detail-header">
        <div className="topic-detail-title">
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
            disabled={generatingAI || loading || formData.documentLinks.length === 0}
            className="btn btn-primary btn-sm"
            title={formData.documentLinks.length === 0 ? 'Add document links first' : 'Generate AI content for this topic'}
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
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Textbook content will appear here after uploading a PDF or can be entered manually"
                rows={6}
                readOnly={!!formData.description}
              />
              {formData.description && (
                <p className="form-help-text">
                  This content is used by AI to generate lesson plans and teaching guides. 
                  Upload a PDF to automatically extract textbook content.
                </p>
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
            {topic.aiContent.generatedAt && (
              <div className="ai-content-info">
                <span className="generated-timestamp">
                  Generated on {new Date(topic.aiContent.generatedAt).toLocaleDateString()} at {new Date(topic.aiContent.generatedAt).toLocaleTimeString()}
                </span>
              </div>
            )}
            <LessonPlanDisplay
              lessonPlan={topic.aiContent.lessonPlan}
              classLevel={topic.aiContent.classLevel || 'Class 1'}
              topicName={topic.name}
              subject={currentPath.subject?.name}
              onSectionUpdate={handleSectionUpdate}
              onLessonPlanUpdate={handleLessonPlanUpdate}
            />
          </div>
        )}

        {activeTab === 'teaching-guide' && (topic.aiContent?.teachingGuide || teachingGuide) && (
          <div className="tab-panel teaching-guide-panel">
            <TeachingGuideDisplay
              teachingGuide={topic.aiContent?.teachingGuide || teachingGuide || ''}
              topicName={topic.name}
              classLevel={currentPath.class?.name || 'Class 1'}
              subject={currentPath.subject?.name}
            />
          </div>
        )}

        {activeTab === 'images' && ((topic.aiContent?.images && topic.aiContent.images.length > 0) || (images && images.length > 0)) && (
          <div className="tab-panel images-panel">
            <ImageDisplay
              images={topic.aiContent?.images || images || []}
              topicName={topic.name}
              classLevel={currentPath.class?.name || 'Class 1'}
              subject={currentPath.subject?.name}
            />
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
