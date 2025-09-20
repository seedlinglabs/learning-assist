import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FileText, Calendar, ExternalLink, Trash2, X, Sparkles, Check, AlertCircle } from 'lucide-react';
import { Topic } from '../types';
import { useApp } from '../context/AppContext';
import { GeminiService } from '../services/geminiService';

interface TopicDetailPanelProps {
  topic: Topic;
  onTopicDeleted: () => void;
}

const TopicDetailPanel: React.FC<TopicDetailPanelProps> = ({ topic, onTopicDeleted }) => {
  const { updateTopic, deleteTopic, loading, error, clearError } = useApp();
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [generatingInteractive, setGeneratingInteractive] = useState(false);
  const [interactiveError, setInteractiveError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | 'idle'>('saved');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedDataRef = useRef<string>('');
  const [formData, setFormData] = useState({
    name: topic.name,
    description: topic.description || '',
    summary: topic.summary || '',
    interactiveContent: topic.interactiveContent || '',
    documentLinkInput: '',
    documentLinkNameInput: '',
    documentLinks: topic.documentLinks ? [...topic.documentLinks] : [] as { name: string; url: string }[],
  });

  // Update form data when topic changes
  useEffect(() => {
    const newFormData = {
      name: topic.name,
      description: topic.description || '',
      summary: topic.summary || '',
      interactiveContent: topic.interactiveContent || '',
      documentLinkInput: '',
      documentLinkNameInput: '',
      documentLinks: topic.documentLinks ? [...topic.documentLinks] : [],
    };
    setFormData(newFormData);
    
    // Update the last saved data reference
    lastSavedDataRef.current = JSON.stringify({
      name: newFormData.name,
      description: newFormData.description,
      summary: newFormData.summary,
      interactiveContent: newFormData.interactiveContent,
      documentLinks: newFormData.documentLinks,
    });
    
    setSaveStatus('saved');
    setHasUnsavedChanges(false);
  }, [topic]);

  // Autosave function with debouncing
  const performAutoSave = useCallback(async (data: typeof formData) => {
    if (!data.name.trim()) {
      return; // Don't save if name is empty
    }

    try {
      setSaveStatus('saving');
      await updateTopic(topic.id, {
        name: data.name.trim(),
        description: data.description.trim() || undefined,
        documentLinks: data.documentLinks,
        summary: data.summary.trim() || undefined,
        interactiveContent: data.interactiveContent.trim() || undefined,
      });
      
      // Update the last saved data reference
      lastSavedDataRef.current = JSON.stringify({
        name: data.name,
        description: data.description,
        summary: data.summary,
        interactiveContent: data.interactiveContent,
        documentLinks: data.documentLinks,
      });
      
      setSaveStatus('saved');
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Autosave failed:', error);
      setSaveStatus('error');
    }
  }, [updateTopic, topic.id]);

  // Debounced autosave effect
  useEffect(() => {
    const currentDataString = JSON.stringify({
      name: formData.name,
      description: formData.description,
      summary: formData.summary,
      interactiveContent: formData.interactiveContent,
      documentLinks: formData.documentLinks,
    });

    // Check if data has actually changed
    if (currentDataString !== lastSavedDataRef.current) {
      setHasUnsavedChanges(true);
      setSaveStatus('idle');

      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Set new timeout for autosave (2 seconds after user stops typing)
      saveTimeoutRef.current = setTimeout(() => {
        performAutoSave(formData);
      }, 2000);
    }

    // Cleanup timeout on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [formData, performAutoSave]);

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

  const generateSummary = async () => {
    if (!formData.documentLinks || formData.documentLinks.length === 0) {
      setSummaryError('Please add at least one document link before generating a summary.');
      return;
    }

    setGeneratingSummary(true);
    setSummaryError(null);

    try {
      const result = await GeminiService.generateSummary({
        documentLinks: formData.documentLinks,
        topicName: formData.name
      });

      if (result.success) {
        setFormData(prev => ({
          ...prev,
          summary: result.summary
        }));
      } else {
        setSummaryError(result.error || 'Failed to generate summary');
      }
    } catch (error) {
      setSummaryError('An error occurred while generating the summary');
      console.error('Summary generation error:', error);
    } finally {
      setGeneratingSummary(false);
    }
  };

  const generateInteractiveContent = async () => {
    if (!formData.summary && (!formData.documentLinks || formData.documentLinks.length === 0)) {
      setInteractiveError('Please generate a summary first or add document links before creating interactive content.');
      return;
    }

    setGeneratingInteractive(true);
    setInteractiveError(null);

    try {
      const result = await GeminiService.generateInteractiveContent({
        topicName: formData.name,
        summary: formData.summary,
        documentLinks: formData.documentLinks,
        description: formData.description
      });

      if (result.success) {
        setFormData(prev => ({
          ...prev,
          interactiveContent: result.interactiveContent
        }));
      } else {
        setInteractiveError(result.error || 'Failed to generate interactive content');
      }
    } catch (error) {
      setInteractiveError('An error occurred while generating interactive content');
      console.error('Interactive content generation error:', error);
    } finally {
      setGeneratingInteractive(false);
    }
  };


  const handleReset = () => {
    setFormData({
      name: topic.name,
      description: topic.description || '',
      summary: topic.summary || '',
      interactiveContent: topic.interactiveContent || '',
      documentLinkInput: '',
      documentLinkNameInput: '',
      documentLinks: topic.documentLinks ? [...topic.documentLinks] : [],
    });
    setSummaryError(null);
    setInteractiveError(null);
    clearError();
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

  return (
    <div className="topic-detail-panel">
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
          <div className="save-status">
            {saveStatus === 'saving' && (
              <span className="save-indicator saving">
                <div className="spinner" />
                Saving...
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="save-indicator saved">
                <Check size={16} />
                Saved
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="save-indicator error">
                <AlertCircle size={16} />
                Save failed
              </span>
            )}
            {saveStatus === 'idle' && hasUnsavedChanges && (
              <span className="save-indicator unsaved">
                Unsaved changes
              </span>
            )}
          </div>
          <button onClick={handleReset} className="btn btn-secondary btn-sm" disabled={loading}>
            <X size={16} />
            Reset
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <span>{error}</span>
          <button onClick={clearError}>×</button>
        </div>
      )}

      <div className="topic-detail-content">
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
          <h3>Document Links</h3>
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
          <div className="summary-header">
            <h3>AI Summary</h3>
            <button
              type="button"
              onClick={generateSummary}
              disabled={generatingSummary || loading || formData.documentLinks.length === 0}
              className="btn btn-secondary btn-sm"
            >
              <Sparkles size={14} />
              {generatingSummary ? 'Generating...' : 'Generate Summary'}
            </button>
          </div>
          {summaryError && (
            <div className="summary-error">
              {summaryError}
            </div>
          )}
          <textarea
            name="summary"
            value={formData.summary}
            onChange={handleChange}
            placeholder="AI-generated summary will appear here, or you can write your own..."
            rows={8}
            disabled={generatingSummary}
          />
        </div>

        <div className="topic-detail-section">
          <div className="summary-header">
            <h3>Interactive Activities</h3>
            <button
              type="button"
              onClick={generateInteractiveContent}
              disabled={generatingInteractive || loading || (!formData.summary && formData.documentLinks.length === 0)}
              className="btn btn-secondary btn-sm"
            >
              <Sparkles size={14} />
              {generatingInteractive ? 'Generating...' : 'Generate Activities'}
            </button>
          </div>
          {interactiveError && (
            <div className="summary-error">
              {interactiveError}
            </div>
          )}
          <textarea
            name="interactiveContent"
            value={formData.interactiveContent}
            onChange={handleChange}
            placeholder="AI-generated interactive activities will appear here, or you can write your own..."
            rows={12}
            disabled={generatingInteractive}
          />
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
    </div>
  );
};

export default TopicDetailPanel;
