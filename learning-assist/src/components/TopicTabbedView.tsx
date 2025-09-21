import React, { useState, useEffect } from 'react';
import { FileText, Calendar, ExternalLink, Trash2, Save, Sparkles, BookOpen, Users, GraduationCap, Search } from 'lucide-react';
import { Topic, DocumentLink } from '../types';
import { useApp } from '../context/AppContext';
import { GeminiService } from '../services/geminiService';
import DocumentDiscoveryModal from './DocumentDiscoveryModal';
import LessonPlanDisplay from './LessonPlanDisplay';
import '../styles/LessonPlanDisplay.css';

interface TopicTabbedViewProps {
  topic: Topic;
  onTopicDeleted: () => void;
}

type TabType = 'details' | 'summary' | 'activities' | 'lesson-plan';

const TopicTabbedView: React.FC<TopicTabbedViewProps> = ({ topic, onTopicDeleted }) => {
  const { updateTopic, deleteTopic, loading, error, clearError, currentPath } = useApp();
  const [activeTab, setActiveTab] = useState<TabType>('details');
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
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

    setGeneratingAI(true);
    setAiError(null);

    try {
      const result = await GeminiService.generateAllAIContent({
        documentLinks: formData.documentLinks,
        topicName: formData.name,
        description: formData.description,
        classLevel: classLevel
      });

      if (result.success) {
        console.log('DEBUG: Generated AI content:', result.aiContent);
        
        // Update the topic with the new AI content
        await updateTopic(topic.id, {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          documentLinks: formData.documentLinks,
          aiContent: result.aiContent,
        });
        
        console.log('DEBUG: Topic update sent with aiContent:', result.aiContent);
      } else {
        setAiError(result.error || 'Failed to generate AI content');
      }
    } catch (error) {
      setAiError('An error occurred while generating AI content');
      console.error('AI content generation error:', error);
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('Please enter a topic name');
      return;
    }

    try {
      await updateTopic(topic.id, {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        documentLinks: formData.documentLinks,
      });
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
    console.log('DEBUG TopicTabbedView - Full topic object:', topic);
    console.log('DEBUG TopicTabbedView - AI Content:', topic.aiContent);
    if (topic.aiContent) {
      console.log('DEBUG TopicTabbedView - Has summary:', !!topic.aiContent.summary);
      console.log('DEBUG TopicTabbedView - Has interactiveActivities:', !!topic.aiContent.interactiveActivities);
      console.log('DEBUG TopicTabbedView - Has lessonPlan:', !!topic.aiContent.lessonPlan);
      console.log('DEBUG TopicTabbedView - LessonPlan value:', topic.aiContent.lessonPlan);
    }
  }, [topic]);

  const tabs = [
    { id: 'details', label: 'Topic Details', icon: FileText },
    { id: 'summary', label: 'Summary', icon: BookOpen, disabled: !topic.aiContent?.summary },
    { id: 'activities', label: 'Activities', icon: Users, disabled: !topic.aiContent?.interactiveActivities },
    { id: 'lesson-plan', label: 'Lesson Plan', icon: GraduationCap, disabled: !topic.aiContent?.lessonPlan },
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
          >
            <Sparkles size={16} />
            {generatingAI ? 'Generating AI Content...' : 'Generate AI Content'}
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
              <h3>Description</h3>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Enter topic description (optional)"
                rows={3}
              />
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

        {activeTab === 'summary' && topic.aiContent?.summary && (
          <div className="tab-panel">
            <div className="ai-content-header">
              <h3>AI-Generated Summary</h3>
              <span className="ai-badge">Generated for {topic.aiContent.classLevel}</span>
            </div>
            <div className="ai-content-display">
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.7' }}>
                {topic.aiContent.summary}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'activities' && topic.aiContent?.interactiveActivities && (
          <div className="tab-panel">
            <div className="ai-content-header">
              <h3>Interactive Activities</h3>
              <span className="ai-badge">Generated for {topic.aiContent.classLevel}</span>
            </div>
            <div className="ai-content-display">
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.7' }}>
                {topic.aiContent.interactiveActivities}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'lesson-plan' && topic.aiContent?.lessonPlan && (
          <div className="tab-panel lesson-plan-panel">
            <LessonPlanDisplay
              lessonPlan={topic.aiContent.lessonPlan}
              classLevel={topic.aiContent.classLevel || 'Class 1'}
              topicName={topic.name}
            />
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
