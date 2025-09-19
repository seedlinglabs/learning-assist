import React, { useState } from 'react';
import { FileText, Calendar, ExternalLink, Edit, Trash2, Save, X, Sparkles } from 'lucide-react';
import { Topic } from '../types';
import { useApp } from '../context/AppContext';
import { GeminiService } from '../services/geminiService';

interface TopicDetailPanelProps {
  topic: Topic;
  onTopicDeleted: () => void;
}

const TopicDetailPanel: React.FC<TopicDetailPanelProps> = ({ topic, onTopicDeleted }) => {
  const { updateTopic, deleteTopic, loading, error, clearError } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [generatingInteractive, setGeneratingInteractive] = useState(false);
  const [interactiveError, setInteractiveError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: topic.name,
    description: topic.description || '',
    summary: topic.summary || '',
    interactiveContent: topic.interactiveContent || '',
    documentLinkInput: '',
    documentLinkNameInput: '',
    documentLinks: topic.documentLinks ? [...topic.documentLinks] : [] as { name: string; url: string }[],
  });

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
        summary: formData.summary.trim() || undefined,
        interactiveContent: formData.interactiveContent.trim() || undefined,
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update topic:', error);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: topic.name,
      description: topic.description || '',
      summary: topic.summary || '',
      interactiveContent: topic.interactiveContent || '',
      documentLinkInput: '',
      documentLinkNameInput: '',
      documentLinks: topic.documentLinks ? [...topic.documentLinks] : [],
    });
    setIsEditing(false);
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
          {isEditing ? (
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="topic-name-input"
              placeholder="Topic name"
            />
          ) : (
            <h2>{topic.name}</h2>
          )}
        </div>
        <div className="topic-detail-actions">
          {isEditing ? (
            <>
              <button onClick={handleSave} className="btn btn-primary btn-sm" disabled={loading}>
                <Save size={16} />
                {loading ? 'Saving...' : 'Save'}
              </button>
              <button onClick={handleCancel} className="btn btn-secondary btn-sm">
                <X size={16} />
                Cancel
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setIsEditing(true)} className="btn btn-secondary btn-sm">
                <Edit size={16} />
                Edit
              </button>
              <button onClick={handleDelete} className="btn btn-danger btn-sm" disabled={loading}>
                <Trash2 size={16} />
                Delete
              </button>
            </>
          )}
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
          {isEditing ? (
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Enter topic description (optional)"
              rows={3}
            />
          ) : (
            <p className="topic-description">
              {topic.description || 'No description provided.'}
            </p>
          )}
        </div>

        <div className="topic-detail-section">
          <h3>Document Links</h3>
          {isEditing ? (
            <>
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
              {formData.documentLinks.length > 0 && (
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
              )}
            </>
          ) : (
            <div className="document-links-display">
              {topic.documentLinks && topic.documentLinks.length > 0 ? (
                topic.documentLinks.map((link) => (
                  <a key={link.url} href={link.url} target="_blank" rel="noreferrer" className="document-link">
                    <ExternalLink size={16} />
                    <span>{link.name}</span>
                  </a>
                ))
              ) : (
                <p className="no-links">No document links added.</p>
              )}
            </div>
          )}
        </div>

        <div className="topic-detail-section">
          <div className="summary-header">
            <h3>AI Summary</h3>
            {isEditing && (
              <button
                type="button"
                onClick={generateSummary}
                disabled={generatingSummary || loading || formData.documentLinks.length === 0}
                className="btn btn-secondary btn-sm"
              >
                <Sparkles size={14} />
                {generatingSummary ? 'Generating...' : 'Generate Summary'}
              </button>
            )}
          </div>
          {summaryError && (
            <div className="summary-error">
              {summaryError}
            </div>
          )}
          {isEditing ? (
            <textarea
              name="summary"
              value={formData.summary}
              onChange={handleChange}
              placeholder="AI-generated summary will appear here, or you can write your own..."
              rows={8}
              disabled={generatingSummary}
            />
          ) : (
            <div className="summary-display">
              {topic.summary ? (
                <div className="summary-content">
                  <div className="summary-badge">✨ AI Generated</div>
                  <p>{topic.summary}</p>
                </div>
              ) : (
                <p className="no-summary">No summary available. Add document links and generate a summary.</p>
              )}
            </div>
          )}
        </div>

        <div className="topic-detail-section">
          <div className="summary-header">
            <h3>Interactive Activities</h3>
            {isEditing && (
              <button
                type="button"
                onClick={generateInteractiveContent}
                disabled={generatingInteractive || loading || (!formData.summary && formData.documentLinks.length === 0)}
                className="btn btn-secondary btn-sm"
              >
                <Sparkles size={14} />
                {generatingInteractive ? 'Generating...' : 'Generate Activities'}
              </button>
            )}
          </div>
          {interactiveError && (
            <div className="summary-error">
              {interactiveError}
            </div>
          )}
          {isEditing ? (
            <textarea
              name="interactiveContent"
              value={formData.interactiveContent}
              onChange={handleChange}
              placeholder="AI-generated interactive activities will appear here, or you can write your own..."
              rows={12}
              disabled={generatingInteractive}
            />
          ) : (
            <div className="summary-display">
              {topic.interactiveContent ? (
                <div className="summary-content">
                  <div className="summary-badge">🎯 Interactive Activities</div>
                  <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                    {topic.interactiveContent}
                  </div>
                </div>
              ) : (
                <p className="no-summary">No interactive activities available. Generate a summary first, then create interactive content.</p>
              )}
            </div>
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopicDetailPanel;
