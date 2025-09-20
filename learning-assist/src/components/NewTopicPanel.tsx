import React, { useState } from 'react';
import { FileText, Save, X, Search, Plus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { GeminiService } from '../services/geminiService';
import { DocumentLink } from '../types';

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
  const { addTopic, loading, error, clearError, currentPath } = useApp();
  const [discoveringDocuments, setDiscoveringDocuments] = useState(false);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);
  const [suggestedDocuments, setSuggestedDocuments] = useState<DocumentLink[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
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

  const discoverDocuments = async () => {
    if (!formData.name.trim()) {
      setDiscoveryError('Please enter a topic name before discovering documents.');
      return;
    }

    const classLevel = currentPath.class?.name || 'Class 1';

    setDiscoveringDocuments(true);
    setDiscoveryError(null);
    setSuggestedDocuments([]);

    try {
      const result = await GeminiService.discoverDocuments({
        topicName: formData.name,
        description: formData.description,
        classLevel: classLevel,
        existingDocuments: formData.documentLinks.length > 0 ? formData.documentLinks : undefined
      });

      if (result.success) {
        setSuggestedDocuments(result.suggestedDocuments);
      } else {
        setDiscoveryError(result.error || 'Failed to discover documents');
      }
    } catch (error) {
      setDiscoveryError('An error occurred while discovering documents');
      console.error('Document discovery error:', error);
    } finally {
      setDiscoveringDocuments(false);
    }
  };

  const addSuggestedDocument = (document: DocumentLink) => {
    if (formData.documentLinks.some(l => l.url === document.url)) {
      return; // Already added
    }
    setFormData(prev => ({
      ...prev,
      documentLinks: [...prev.documentLinks, document]
    }));
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
      });
      onTopicCreated();
    } catch (error) {
      console.error('Failed to create topic:', error);
    }
  };

  const handleCancel = () => {
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
          <div className="document-section-header">
            <h3>Document Links</h3>
            <button
              type="button"
              onClick={discoverDocuments}
              disabled={discoveringDocuments || loading || !formData.name.trim()}
              className="btn btn-primary btn-sm"
            >
              <Search size={14} />
              {discoveringDocuments ? 'Finding Documents...' : 'Find Documents with AI'}
            </button>
          </div>

          {discoveryError && (
            <div className="error-message" style={{ margin: '1rem 0' }}>
              <span>{discoveryError}</span>
              <button onClick={() => setDiscoveryError(null)}>×</button>
            </div>
          )}

          {suggestedDocuments.length > 0 && (
            <div className="suggested-documents">
              <h4>🤖 AI-Suggested Documents</h4>
              <p>Click to add relevant educational resources for your topic:</p>
              <div className="suggested-documents-list">
                {suggestedDocuments.map((doc, index) => (
                  <div key={doc.url} className="suggested-document-item">
                    <div className="suggested-document-info">
                      <strong>{doc.name}</strong>
                      <a href={doc.url} target="_blank" rel="noreferrer" className="suggested-document-url">
                        {doc.url}
                      </a>
                    </div>
                    <button
                      type="button"
                      onClick={() => addSuggestedDocument(doc)}
                      disabled={formData.documentLinks.some(l => l.url === doc.url)}
                      className="btn btn-secondary btn-sm"
                    >
                      <Plus size={14} />
                      {formData.documentLinks.some(l => l.url === doc.url) ? 'Added' : 'Add'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="manual-document-section">
            <h4>Add Document Manually</h4>
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
          </div>

          {formData.documentLinks.length > 0 && (
            <div className="current-documents">
              <h4>Selected Documents ({formData.documentLinks.length})</h4>
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
            </div>
          )}
        </div>

        <div className="topic-detail-section">
          <div className="ai-generation-info">
            <h3>🤖 AI Content Generation</h3>
            <p>After creating this topic, you can generate comprehensive AI content including:</p>
            <ul>
              <li><strong>Summary</strong> - Concise overview for students</li>
              <li><strong>Interactive Activities</strong> - Quizzes, discussions, and hands-on exercises</li>
              <li><strong>40-Minute Lesson Plan</strong> - Complete lesson structure with timing</li>
            </ul>
            <p>Simply add your document links now, and use the "Generate AI Content" button after creating the topic.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewTopicPanel;
