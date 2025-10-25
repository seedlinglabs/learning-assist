import React, { useState } from 'react';
import { X, Upload, Sparkles, CheckCircle, Clock, Target } from 'lucide-react';
import { MultiPDFUpload } from './MultiPDFUpload';
import { ChapterPlannerService } from '../services/chapterPlannerService';
import { Topic, Subject, Class, School } from '../types';
import './ChapterPlannerModal.css';
import '../styles/MultiPDFUpload.css';

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
  const [numberOfSplits, setNumberOfSplits] = useState<number>(4);
  const [splitInputValue, setSplitInputValue] = useState<string>('');
  const [topicSuggestions, setTopicSuggestions] = useState<TopicSuggestion[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [showLecturePopup, setShowLecturePopup] = useState(false);
  const [uploadedFileCount, setUploadedFileCount] = useState<number>(0);

  const handleFilesProcessed = (combinedText: string, files: any[]) => {
    setTextbookContent(combinedText);
    setUploadedFileCount(files.filter(f => f.status === 'success').length);
    setPdfError(null);
    
    // Auto-generate chapter name from first successful file if not provided
    if (!chapterName && files.length > 0) {
      const firstSuccessfulFile = files.find(f => f.status === 'success');
      if (firstSuccessfulFile) {
        const nameFromFile = firstSuccessfulFile.file.name
          .replace('.pdf', '')
          .replace(/[_-]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        setChapterName(nameFromFile);
      }
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

    // Check if user hasn't specified number of lectures
    if (!splitInputValue.trim()) {
      setShowLecturePopup(true);
      return;
    }

    await performAnalysis();
  };

  const performAnalysis = async () => {
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
        chapterName,
        numberOfSplits
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

  const handleContinueWithAI = () => {
    setShowLecturePopup(false);
    // Let AI decide the optimal number of lectures
    setNumberOfSplits(0); // Special value to indicate AI should decide
    performAnalysis();
  };

  const handleChangeLectures = () => {
    setShowLecturePopup(false);
    // Focus on the input field
    const input = document.getElementById('numberOfSplits');
    if (input) {
      input.focus();
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

      <div className="form-row">
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

        <div className="form-group">
          <label htmlFor="numberOfSplits">Number of Lectures</label>
          <div className="split-number-container">
            <input
              id="numberOfSplits"
              type="text"
              value={splitInputValue}
              onChange={(e) => {
                const inputValue = e.target.value;
                setSplitInputValue(inputValue);
                
                // Update numberOfSplits with any positive number
                const numValue = parseInt(inputValue);
                if (!isNaN(numValue) && numValue > 0) {
                  setNumberOfSplits(numValue);
                } else if (inputValue === '') {
                  // If empty, use default
                  setNumberOfSplits(4);
                }
              }}
              placeholder="Enter number of lectures"
              className="form-input split-number-input"
            />
          </div>
          <small className="form-help">How many parts should the chapter be split into</small>
        </div>
      </div>

      <div className="pdf-upload-section">
        <MultiPDFUpload
          onFilesProcessed={handleFilesProcessed}
          onError={handlePDFError}
          disabled={false}
          maxFiles={5}
        />
        {pdfError && (
          <div className="error-message">
            <span>{pdfError}</span>
            <button onClick={() => setPdfError(null)}>×</button>
          </div>
        )}
      </div>

      {/* Manual text input fallback */}
      <div className="manual-input-section">
        <h4>Or Paste Text Manually</h4>
        <p className="form-help-text">
          If PDF extraction fails (scanned images, corrupted files), you can paste the chapter text directly:
        </p>
        <textarea
          value={textbookContent}
          onChange={(e) => setTextbookContent(e.target.value)}
          placeholder="Paste textbook chapter content here..."
          rows={8}
          className="manual-text-input"
        />
      </div>

      {textbookContent && (
        <div className="content-preview">
          <h4>Content Preview {uploadedFileCount > 0 && `(${uploadedFileCount} file${uploadedFileCount > 1 ? 's' : ''})`}</h4>
          <div className="content-preview-text">
            {textbookContent.substring(0, 500)}
            {textbookContent.length > 500 && '...'}
          </div>
          <p className="content-stats">
            Total characters: {textbookContent.length.toLocaleString()}
            {uploadedFileCount > 1 && ` from ${uploadedFileCount} PDFs`}
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

      {/* Lecture Number Popup */}
      {showLecturePopup && (
        <div className="lecture-popup-overlay">
          <div className="lecture-popup">
            <div className="lecture-popup-header">
              <h3>Number of Lectures Not Specified</h3>
            </div>
            <div className="lecture-popup-content">
              <p>You haven't specified the number of lectures. AI will automatically choose the optimal number of lectures based on the content.</p>
            </div>
            <div className="lecture-popup-actions">
              <button 
                onClick={handleChangeLectures}
                className="btn btn-secondary"
              >
                Change Number of Lectures
              </button>
              <button 
                onClick={handleContinueWithAI}
                className="btn btn-primary"
              >
                Continue with AI Selection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChapterPlannerModal;
