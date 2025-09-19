import React, { useState } from 'react';
import { FileText, Save, X, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { GeminiService } from '../services/geminiService';

interface NewTopicPanelProps {
  subjectId: string;
  subjectName: string;
  onCancel: () => void;
  onTopicCreated: () => void;
}

const NewTopicPanel: React.FC<NewTopicPanelProps> = ({ 
  subjectId, 
  subjectName, 
  onCancel, 
  onTopicCreated 
}) => {
  const { addTopic, loading, error, clearError } = useApp();
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    summary: '',
    documentLinkInput: '',
    documentLinkNameInput: '',
    documentLinks: [] as { name: string; url: string }[],
  });

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

    if (!formData.name.trim()) {
      setSummaryError('Please enter a topic name before generating a summary.');
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

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('Please enter a topic name');
      return;
    }

    try {
      await addTopic(subjectId, {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        documentLinks: formData.documentLinks.length > 0 ? formData.documentLinks : undefined,
        summary: formData.summary.trim() || undefined,
      });
      onTopicCreated();
    } catch (error) {
      console.error('Failed to create topic:', error);
    }
  };

  const handleCancel = () => {
    setSummaryError(null);
    clearError();
    onCancel();
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
            placeholder="Enter topic name..."
            autoFocus
          />
        </div>
        <div className="topic-detail-actions">
          <button onClick={handleSave} className="btn btn-primary btn-sm" disabled={loading}>
            <Save size={16} />
            {loading ? 'Creating...' : 'Create Topic'}
          </button>
          <button onClick={handleCancel} className="btn btn-secondary btn-sm">
            <X size={16} />
            Cancel
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
        <div className="new-topic-info">
          <h4>Creating new topic in {subjectName}</h4>
          <p>Fill in the details below to create a new topic. You can add document links and generate an AI summary.</p>
        </div>

        <div className="topic-detail-section">
          <h3>Description</h3>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Enter a brief description of this topic (optional)"
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
          {formData.documentLinks.length > 0 && (
            <div className="document-links-list">
              {formData.documentLinks.map((link) => (
                <div key={link.url} className="document-link-item">
                  <a href={link.url} target="_blank" rel="noreferrer">
                    <span>🔗</span>
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
        </div>

        <div className="topic-detail-section">
          <div className="summary-header">
            <h3>AI Summary</h3>
            <button
              type="button"
              onClick={generateSummary}
              disabled={generatingSummary || loading || formData.documentLinks.length === 0 || !formData.name.trim()}
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
          <div className="summary-help">
            <p><strong>Tip:</strong> Add document links and a topic name, then click "Generate Summary" to create an AI-powered summary of your documents.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewTopicPanel;
