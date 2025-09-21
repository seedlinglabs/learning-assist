import React, { useState } from 'react';
import { X, Search, Plus, Video, Volume2, Gamepad2, FileText, Atom, Presentation, BookOpen, Microscope, FileSpreadsheet, GraduationCap } from 'lucide-react';
import { DocumentLink } from '../types';
import { GeminiService, ContentType } from '../services/geminiService';

interface DocumentDiscoveryModalProps {
  topicName: string;
  description?: string;
  classLevel: string;
  existingDocuments: DocumentLink[];
  onDocumentsSelected: (documents: DocumentLink[]) => void;
  onClose: () => void;
}

const DocumentDiscoveryModal: React.FC<DocumentDiscoveryModalProps> = ({
  topicName,
  description,
  classLevel,
  existingDocuments,
  onDocumentsSelected,
  onClose
}) => {
  const [customPrompt, setCustomPrompt] = useState('');
  const [selectedContentTypes, setSelectedContentTypes] = useState<ContentType[]>([]);
  const [suggestedDocuments, setSuggestedDocuments] = useState<DocumentLink[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<DocumentLink[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contentTypeOptions = [
    { type: 'video' as ContentType, label: 'Videos', icon: Video, description: 'Educational videos and tutorials' },
    { type: 'audio' as ContentType, label: 'Audio', icon: Volume2, description: 'Podcasts and audio lessons' },
    { type: 'interactive' as ContentType, label: 'Interactive', icon: Atom, description: 'Interactive websites and tools' },
    { type: 'games' as ContentType, label: 'Games', icon: Gamepad2, description: 'Educational games and gamification' },
    { type: 'articles' as ContentType, label: 'Articles', icon: FileText, description: 'Articles and written content' },
    { type: 'simulations' as ContentType, label: 'Simulations', icon: Microscope, description: 'Virtual labs and simulations' },
    { type: 'worksheets' as ContentType, label: 'Worksheets', icon: FileSpreadsheet, description: 'Downloadable activities' },
    { type: 'presentations' as ContentType, label: 'Presentations', icon: Presentation, description: 'Slideshows and presentations' },
    { type: 'books' as ContentType, label: 'Books', icon: BookOpen, description: 'E-books and digital textbooks' },
    { type: 'research' as ContentType, label: 'Research', icon: GraduationCap, description: 'Academic and research content' }
  ];

  const handleContentTypeToggle = (contentType: ContentType) => {
    setSelectedContentTypes(prev => 
      prev.includes(contentType)
        ? prev.filter(type => type !== contentType)
        : [...prev, contentType]
    );
  };

  const handleDiscoverDocuments = async () => {
    setIsDiscovering(true);
    setError(null);
    setSuggestedDocuments([]);

    try {
      const result = await GeminiService.discoverDocuments({
        topicName,
        description,
        classLevel,
        existingDocuments,
        customPrompt: customPrompt.trim() || undefined,
        contentTypes: selectedContentTypes.length > 0 ? selectedContentTypes : undefined
      });

      if (result.success) {
        setSuggestedDocuments(result.suggestedDocuments);
      } else {
        setError(result.error || 'Failed to discover documents');
      }
    } catch (error) {
      setError('An error occurred while discovering documents');
      console.error('Document discovery error:', error);
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleDocumentToggle = (document: DocumentLink) => {
    setSelectedDocuments(prev => {
      const isSelected = prev.some(doc => doc.url === document.url);
      if (isSelected) {
        return prev.filter(doc => doc.url !== document.url);
      } else {
        return [...prev, document];
      }
    });
  };

  const handleAddSelected = () => {
    onDocumentsSelected(selectedDocuments);
    onClose();
  };

  const isDocumentAlreadyAdded = (document: DocumentLink) => {
    return existingDocuments.some(doc => doc.url === document.url);
  };

  const isDocumentSelected = (document: DocumentLink) => {
    return selectedDocuments.some(doc => doc.url === document.url);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content document-discovery-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🤖 Discover Documents with AI</h2>
          <button onClick={onClose} className="modal-close">
            <X size={20} />
          </button>
        </div>

        <div className="modal-form">
          <div className="discovery-info">
            <h3>Topic: {topicName}</h3>
            {description && <p className="topic-description">{description}</p>}
            <p className="class-level">Class Level: {classLevel}</p>
            {existingDocuments.length > 0 && (
              <p className="existing-docs">
                {existingDocuments.length} document(s) already added - AI will suggest complementary resources
              </p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="customPrompt">
              Custom Search Prompt <span className="optional">(Optional)</span>
            </label>
            <textarea
              id="customPrompt"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="e.g., 'Focus on hands-on experiments', 'Include multilingual resources', 'Find resources for visual learners'..."
              rows={3}
              className="custom-prompt-input"
            />
            <small className="form-help">
              Provide additional guidance to help AI find more specific types of resources
            </small>
          </div>

          <div className="form-group">
            <label>Content Type Preferences <span className="optional">(Optional)</span></label>
            <p className="form-help">Select the types of content you prefer. Leave empty for mixed content.</p>
            <div className="content-type-grid">
              {contentTypeOptions.map(option => {
                const Icon = option.icon;
                const isSelected = selectedContentTypes.includes(option.type);
                
                return (
                  <button
                    key={option.type}
                    type="button"
                    onClick={() => handleContentTypeToggle(option.type)}
                    className={`content-type-option ${isSelected ? 'selected' : ''}`}
                    title={option.description}
                  >
                    <Icon size={20} />
                    <span>{option.label}</span>
                  </button>
                );
              })}
            </div>
            {selectedContentTypes.length > 0 && (
              <div className="selected-types">
                <strong>Selected:</strong> {selectedContentTypes.join(', ')}
              </div>
            )}
          </div>

          <div className="discovery-actions">
            <button
              type="button"
              onClick={handleDiscoverDocuments}
              disabled={isDiscovering}
              className="btn btn-primary"
            >
              <Search size={16} />
              {isDiscovering ? 'Discovering Documents...' : 'Discover Documents'}
            </button>
          </div>

          {error && (
            <div className="error-message">
              <span>{error}</span>
              <button onClick={() => setError(null)}>×</button>
            </div>
          )}

          {suggestedDocuments.length > 0 && (
            <div className="suggested-documents-section">
              <h3>🎯 AI-Discovered Documents</h3>
              <p>Select the documents you want to add to your topic:</p>
              
              <div className="suggested-documents-list">
                {suggestedDocuments.map((document, index) => {
                  const alreadyAdded = isDocumentAlreadyAdded(document);
                  const selected = isDocumentSelected(document);
                  
                  return (
                    <div
                      key={`${document.url}-${index}`}
                      className={`suggested-document-item ${alreadyAdded ? 'already-added' : ''} ${selected ? 'selected' : ''}`}
                    >
                      <div className="document-info">
                        <div className="document-name">{document.name}</div>
                        <div className="document-url">
                          <a href={document.url} target="_blank" rel="noreferrer">
                            {document.url}
                          </a>
                        </div>
                      </div>
                      <div className="document-actions">
                        {alreadyAdded ? (
                          <span className="already-added-badge">Already Added</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleDocumentToggle(document)}
                            className={`btn btn-sm ${selected ? 'btn-primary' : 'btn-secondary'}`}
                          >
                            <Plus size={14} />
                            {selected ? 'Selected' : 'Select'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {selectedDocuments.length > 0 && (
            <div className="selected-documents-summary">
              <h4>Selected Documents ({selectedDocuments.length})</h4>
              <ul>
                {selectedDocuments.map((doc, index) => (
                  <li key={`selected-${doc.url}-${index}`}>{doc.name}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddSelected}
              disabled={selectedDocuments.length === 0}
              className="btn btn-primary"
            >
              Add {selectedDocuments.length} Document{selectedDocuments.length !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentDiscoveryModal;
