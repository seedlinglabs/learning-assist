import React, { useState } from 'react';
import { FileText, Save, X, Search } from 'lucide-react';
import { useApp } from '../context/AppContext';
// Secure Gemini service available for future enhancements
// import { secureGeminiService, ContentType } from '../services/secureGeminiService';
import { DocumentLink } from '../types';
import DocumentDiscoveryModal from './DocumentDiscoveryModal';
import { PDFUpload } from './PDFUpload';

interface NewTopicPanelProps {
  subjectId: string;
  subjectName: string;
  onCancel: () => void;
  onTopicCreated: (newTopic: any) => void;
}

const NewTopicPanel: React.FC<NewTopicPanelProps> = ({ 
  subjectId, 
  subjectName, 
  onCancel, 
  onTopicCreated 
}) => {
  const { addTopic, loading, error, clearError, currentPath } = useApp();
  const [showDiscoveryModal, setShowDiscoveryModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    documentLinkInput: '',
    documentLinkNameInput: '',
    documentLinks: [] as { name: string; url: string }[],
  });
  const [pdfError, setPdfError] = useState<string>('');

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

  const handleDiscoveredDocuments = (discoveredDocs: DocumentLink[]) => {
    // Add discovered documents to the current document list
    const newDocuments = [...formData.documentLinks, ...discoveredDocs];
    setFormData(prev => ({
      ...prev,
      documentLinks: newDocuments
    }));
  };


  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('Please enter a topic name');
      return;
    }

    try {
      const newTopic = await addTopic(subjectId, {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        documentLinks: formData.documentLinks.length > 0 ? formData.documentLinks : undefined,
      });
      onTopicCreated(newTopic);
    } catch (error) {
      console.error('Failed to create topic:', error);
    }
  };

  const handleCancel = () => {
    clearError();
    setPdfError('');
    onCancel();
  };

  const handlePDFTextExtracted = (text: string, fileName: string) => {
    setFormData(prev => ({
      ...prev,
      description: text
    }));
    setPdfError('');
  };

  const handlePDFError = (error: string) => {
    setPdfError(error);
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
          <p>Fill in the details below to create a new topic. You can add document links and generate an AI lesson plan.</p>
        </div>

        <div className="topic-detail-section">
          <h3>Textbook Content</h3>
          <p className="form-help-text">
            Upload a PDF file to extract textbook content for this topic. This content will be used for AI-generated lesson plans and teaching guides.
          </p>
          <PDFUpload
            onTextExtracted={handlePDFTextExtracted}
            onError={handlePDFError}
            disabled={loading}
          />
          {pdfError && (
            <div className="error-message" style={{ marginTop: '0.5rem', padding: '0.5rem', backgroundColor: '#fef2f2', color: '#dc2626', borderRadius: '0.375rem', fontSize: '0.875rem' }}>
              {pdfError}
            </div>
          )}
        </div>


        <div className="topic-detail-section">
          <div className="document-section-header">
            <h3>Document Links</h3>
            <button
              type="button"
              onClick={() => setShowDiscoveryModal(true)}
              disabled={loading || !formData.name.trim()}
              className="btn btn-primary btn-sm"
            >
              <Search size={14} />
              Find Documents with AI
            </button>
          </div>


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

export default NewTopicPanel;
