import React, { useState } from 'react';
import { X, Upload, Sparkles, CheckCircle, Clock, Target, BookOpen } from 'lucide-react';
import { PDFUpload } from './PDFUpload';
import { ChapterPlannerService } from '../services/chapterPlannerService';
import { Topic, Subject, Class, School } from '../types';
import './ChapterPlannerModal.css';

interface TopicSuggestion {
  name: string;
  content: string;
  estimatedMinutes: number;
  learningObjectives: string[];
  partNumber: number;
}

interface ChapterPlannerModalProps {
  subject: Subject;
  class: Class;
  school: School;
  onClose: () => void;
  onTopicsCreated: (topics: Topic[]) => void;
}

type Step = 'upload' | 'analysis' | 'review';

const ChapterPlannerModal: React.FC<ChapterPlannerModalProps> = ({
  subject,
  class: cls,
  school,
  onClose,
  onTopicsCreated
}) => {
  const [step, setStep] = useState<Step>('upload');
  const [textbookContent, setTextbookContent] = useState<string>('');
  const [chapterName, setChapterName] = useState<string>('');
  const [topicSuggestions, setTopicSuggestions] = useState<TopicSuggestion[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const handlePDFTextExtracted = (extractedText: string, fileName: string) => {
    setTextbookContent(extractedText);
    setPdfError(null);
    // Auto-generate chapter name from filename if not provided
    if (!chapterName) {
      const nameFromFile = fileName.replace('.pdf', '').replace(/[_-]/g, ' ');
      setChapterName(nameFromFile);
    }
  };

  const handlePDFError = (error: string) => {
    setPdfError(error);
  };

  const handleAnalyzeContent = async () => {
    if (!textbookContent.trim()) {
      setError('Please upload textbook content first');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      console.log('Starting chapter analysis...', {
        contentLength: textbookContent.length,
        subject: subject.name,
        class: cls.name,
        chapterName
      });

      const suggestions = await ChapterPlannerService.analyzeTextbookContent(
        textbookContent,
        subject.name,
        cls.name,
        chapterName
      );

      console.log('Analysis completed, suggestions:', suggestions);

      if (suggestions.length === 0) {
        setError('No topic suggestions were generated. Please try again with different content.');
        return;
      }

      setTopicSuggestions(suggestions);
      setStep('review');
    } catch (err) {
      console.error('Chapter analysis error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze content';
      setError(`Analysis failed: ${errorMessage}. Please try again or contact support if the issue persists.`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCreateTopics = async () => {
    if (topicSuggestions.length === 0) {
      setError('No topic suggestions to create');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const createdTopics = await ChapterPlannerService.createTopicsFromSuggestions(
        topicSuggestions,
        subject.id,
        cls.id,
        school.id
      );
      onTopicsCreated(createdTopics);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create topics');
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditTopic = (index: number, field: keyof TopicSuggestion, value: any) => {
    setTopicSuggestions(prev => prev.map((topic, i) => 
      i === index ? { ...topic, [field]: value } : topic
    ));
  };

  const handleRemoveTopic = (index: number) => {
    setTopicSuggestions(prev => prev.filter((_, i) => i !== index));
  };

  const renderUploadStep = () => (
    <div className="chapter-planner-step">
      <div className="step-header">
        <Upload size={24} />
        <h3>Upload Textbook Content</h3>
        <p>Upload a PDF containing the chapter content you want to split into topics</p>
      </div>

      <div className="form-group">
        <label htmlFor="chapterName">Chapter Name (Optional)</label>
        <input
          id="chapterName"
          type="text"
          value={chapterName}
          onChange={(e) => setChapterName(e.target.value)}
          placeholder="e.g., Photosynthesis, Linear Equations, World War II"
          className="form-input"
        />
        <small className="form-help">This will help AI generate better topic names</small>
      </div>

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

      {textbookContent && (
        <div className="content-preview">
          <h4>Content Preview</h4>
          <div className="content-preview-text">
            {textbookContent.substring(0, 500)}
            {textbookContent.length > 500 && '...'}
          </div>
          <p className="content-stats">
            Total characters: {textbookContent.length.toLocaleString()}
          </p>
        </div>
      )}

      <div className="step-actions">
        <button onClick={onClose} className="btn btn-secondary">
          Cancel
        </button>
        <button 
          onClick={handleAnalyzeContent}
          disabled={!textbookContent.trim() || isAnalyzing}
          className="btn btn-primary"
        >
          {isAnalyzing ? (
            <>
              <Sparkles className="spinning" size={16} />
              Analyzing Content...
            </>
          ) : (
            <>
              <Sparkles size={16} />
              Analyze & Split Content
            </>
          )}
        </button>
      </div>
    </div>
  );

  const renderReviewStep = () => (
    <div className="chapter-planner-step">
      <div className="step-header">
        <CheckCircle size={24} />
        <h3>Review Topic Suggestions</h3>
        <p>Review and customize the AI-generated topic splits. You can edit names, durations, and objectives.</p>
      </div>

      <div className="topic-suggestions">
        {topicSuggestions.map((topic, index) => (
          <div key={index} className="topic-suggestion">
            <div className="topic-suggestion-header">
              <div className="topic-info">
                <span className="part-number">Part {topic.partNumber}</span>
                <input
                  type="text"
                  value={topic.name}
                  onChange={(e) => handleEditTopic(index, 'name', e.target.value)}
                  className="topic-name-input"
                />
              </div>
              <div className="topic-actions">
                <div className="duration-input">
                  <Clock size={14} />
                  <input
                    type="number"
                    value={topic.estimatedMinutes}
                    onChange={(e) => handleEditTopic(index, 'estimatedMinutes', parseInt(e.target.value) || 0)}
                    min="10"
                    max="120"
                    className="duration-field"
                  />
                  <span>min</span>
                </div>
                <button
                  onClick={() => handleRemoveTopic(index)}
                  className="btn btn-ghost btn-sm"
                  title="Remove topic"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="topic-content">
              <div className="content-preview">
                {topic.content.substring(0, 200)}
                {topic.content.length > 200 && '...'}
              </div>
            </div>

            <div className="learning-objectives">
              <div className="objectives-header">
                <Target size={14} />
                <span>Learning Objectives</span>
              </div>
              <div className="objectives-list">
                {topic.learningObjectives.map((objective, objIndex) => (
                  <div key={objIndex} className="objective-item">
                    <input
                      type="text"
                      value={objective}
                      onChange={(e) => {
                        const newObjectives = [...topic.learningObjectives];
                        newObjectives[objIndex] = e.target.value;
                        handleEditTopic(index, 'learningObjectives', newObjectives);
                      }}
                      className="objective-input"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="step-actions">
        <button onClick={() => setStep('upload')} className="btn btn-secondary">
          Back to Upload
        </button>
        <button 
          onClick={handleCreateTopics}
          disabled={topicSuggestions.length === 0 || isCreating}
          className="btn btn-primary"
        >
          {isCreating ? (
            <>
              <Sparkles className="spinning" size={16} />
              Creating Topics...
            </>
          ) : (
            <>
              <BookOpen size={16} />
              Create {topicSuggestions.length} Topics
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="chapter-planner-modal-overlay">
      <div className="chapter-planner-modal">
        <div className="modal-header">
          <div className="modal-title">
            <BookOpen size={24} />
            <div>
              <h2>Chapter Planner</h2>
              <p>{subject.name} - {cls.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="modal-close">
            <X size={24} />
          </button>
        </div>

        <div className="modal-content">
          {error && (
            <div className="error-message">
              <span>{error}</span>
              <button onClick={() => setError(null)}>×</button>
            </div>
          )}

          {step === 'upload' && renderUploadStep()}
          {step === 'review' && renderReviewStep()}
        </div>
      </div>
    </div>
  );
};

export default ChapterPlannerModal;
