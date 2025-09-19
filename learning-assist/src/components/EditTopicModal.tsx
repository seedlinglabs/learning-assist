import React, { useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Topic } from '../types';
import { GeminiService } from '../services/geminiService';

interface EditTopicModalProps {
  topic: Topic;
  onClose: () => void;
}

const EditTopicModal: React.FC<EditTopicModalProps> = ({ topic, onClose }) => {
  const { updateTopic, loading, error, clearError } = useApp();
  const [formData, setFormData] = useState({
    name: topic.name,
    description: topic.description || '',
    summary: topic.summary || '',
    documentLinkInput: '',
    documentLinkNameInput: '',
    documentLinks: topic.documentLinks ? [...topic.documentLinks] : [] as { name: string; url: string }[],
  });
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
      });
      onClose();
    } catch (error) {
      // Error is handled by the context, just stay on the modal
      console.error('Failed to update topic:', error);
    }
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
    try { new URL(url); } catch { alert('Please enter a valid URL'); return; }
    if (formData.documentLinks.some(l => l.url === url)) return;
    const name = formData.documentLinkNameInput.trim() || url;
    setFormData(prev => ({ ...prev, documentLinks: [...prev.documentLinks, { name, url }], documentLinkInput: '', documentLinkNameInput: '' }));
  };

  const removeDocumentLink = (url: string) => {
    setFormData(prev => ({ ...prev, documentLinks: prev.documentLinks.filter(l => l.url !== url) }));
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

  const handleClose = () => {
    clearError();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Topic</h2>
          <button onClick={handleClose} className="modal-close" disabled={loading}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="error-message" style={{ margin: '1rem 1.5rem 0', padding: '0.75rem', backgroundColor: '#fef2f2', color: '#dc2626', borderRadius: '0.5rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="name">Topic Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter topic name"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Enter topic description (optional)"
              rows={3}
            />
          </div>

          <div className="form-group">
            <label>Document Links</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <input
                type="url"
                id="documentLinkInput"
                name="documentLinkInput"
                value={formData.documentLinkInput}
                onChange={handleChange}
                placeholder="https://example.com/doc.pdf"
              />
              <input
                type="text"
                id="documentLinkNameInput"
                name="documentLinkNameInput"
                value={formData.documentLinkNameInput}
                onChange={handleChange}
                placeholder="Optional name"
              />
              <button type="button" className="btn btn-secondary" onClick={addDocumentLink} disabled={loading}>Add</button>
            </div>
            {formData.documentLinks.length > 0 && (
              <ul style={{ marginTop: '0.75rem', paddingLeft: '1rem' }}>
                {formData.documentLinks.map((link) => (
                  <li key={link.url} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <a href={link.url} target="_blank" rel="noreferrer" style={{ color: '#2563eb', wordBreak: 'break-all' }}>{link.name}</a>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeDocumentLink(link.url)}>Remove</button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label htmlFor="summary">AI Summary</label>
              <button
                type="button"
                onClick={generateSummary}
                disabled={generatingSummary || loading || formData.documentLinks.length === 0}
                className="btn btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              >
                <Sparkles size={14} />
                {generatingSummary ? 'Generating...' : 'Generate Summary'}
              </button>
            </div>
            {summaryError && (
              <div style={{ color: '#dc2626', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                {summaryError}
              </div>
            )}
            <textarea
              id="summary"
              name="summary"
              value={formData.summary}
              onChange={handleChange}
              placeholder="AI-generated summary will appear here, or you can write your own..."
              rows={6}
              disabled={generatingSummary}
            />
          </div>

          <div className="modal-actions">
            <button type="button" onClick={handleClose} className="btn btn-secondary" disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Updating...' : 'Update Topic'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTopicModal;