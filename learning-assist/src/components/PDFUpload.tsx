import React, { useState, useRef, useCallback } from 'react';
import { FileText, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { PDFExtractorService, PDFExtractionResult } from '../services/pdfExtractorService';
import './PDFUpload.css';

interface PDFUploadProps {
  onTextExtracted: (text: string, fileName: string) => void;
  onError: (error: string) => void;
  disabled?: boolean;
  className?: string;
}

interface UploadState {
  isDragging: boolean;
  isProcessing: boolean;
  file: File | null;
  result: PDFExtractionResult | null;
}

export const PDFUpload: React.FC<PDFUploadProps> = ({
  onTextExtracted,
  onError,
  disabled = false,
  className = ''
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<UploadState>({
    isDragging: false,
    isProcessing: false,
    file: null,
    result: null
  });

  const handleFileSelect = useCallback(async (file: File) => {
    // Prevent multiple simultaneous file processing
    if (state.isProcessing) {
      return;
    }

    // Validate file
    const validation = PDFExtractorService.validatePDFFile(file);
    if (!validation.valid) {
      onError(validation.error || 'Invalid file');
      return;
    }

    setState(prev => ({
      ...prev,
      file,
      isProcessing: true,
      result: null
    }));

    try {
      const result = await PDFExtractorService.extractTextFromPDF(file);
      
      setState(prev => ({
        ...prev,
        result,
        isProcessing: false
      }));

      if (result.success && result.text) {
        onTextExtracted(result.text, result.fileName || file.name);
      } else {
        onError(result.error || 'Failed to extract text from PDF');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process PDF';
      setState(prev => ({
        ...prev,
        isProcessing: false,
        result: { success: false, error: errorMessage }
      }));
      onError(errorMessage);
    }
  }, [onTextExtracted, onError, state.isProcessing]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setState(prev => ({ ...prev, isDragging: true }));
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setState(prev => ({ ...prev, isDragging: false }));
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setState(prev => ({ ...prev, isDragging: false }));

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    const pdfFile = files.find(file => file.type === 'application/pdf');
    
    if (pdfFile) {
      handleFileSelect(pdfFile);
    } else {
      onError('Please drop a PDF file');
    }
  }, [disabled, handleFileSelect, onError]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
      // Reset the input value to allow selecting the same file again
      e.target.value = '';
    }
  }, [handleFileSelect]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  const handleClear = useCallback(() => {
    setState({
      isDragging: false,
      isProcessing: false,
      file: null,
      result: null
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const getStatusIcon = () => {
    if (state.isProcessing) {
      return <Loader2 className="pdf-upload-icon processing" />;
    }
    if (state.result?.success) {
      return <CheckCircle className="pdf-upload-icon success" />;
    }
    if (state.result?.error) {
      return <AlertCircle className="pdf-upload-icon error" />;
    }
    return <FileText className="pdf-upload-icon" />;
  };

  const getStatusText = () => {
    if (state.isProcessing) {
      return 'Extracting text from PDF...';
    }
    if (state.result?.success) {
      return `Successfully extracted text from ${state.result.fileName} (${state.result.pageCount} pages)`;
    }
    if (state.result?.error) {
      return state.result.error;
    }
    return 'Click to upload or drag and drop a PDF file';
  };

  return (
    <div className={`pdf-upload-container ${className}`}>
      <div
        className={`pdf-upload-area ${state.isDragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileInputChange}
          className="pdf-upload-input"
          disabled={disabled}
        />
        
        <div className="pdf-upload-content">
          {getStatusIcon()}
          <p className="pdf-upload-text">{getStatusText()}</p>
          {state.file && (
            <div className="pdf-upload-file-info">
              <p className="pdf-upload-filename">{state.file.name}</p>
              <p className="pdf-upload-filesize">
                {PDFExtractorService.formatFileSize(state.file.size)}
              </p>
            </div>
          )}
        </div>
      </div>

      {state.file && (
        <div className="pdf-upload-actions">
          <button
            type="button"
            onClick={handleClear}
            className="pdf-upload-clear-btn"
            disabled={disabled || state.isProcessing}
          >
            <X size={16} />
            Clear
          </button>
        </div>
      )}

      {state.result?.success && state.result.text && (
        <div className="pdf-upload-preview">
          <h4>Extracted Text Preview:</h4>
          <div className="pdf-upload-text-preview">
            {state.result.text.substring(0, 500)}
            {state.result.text.length > 500 && '...'}
          </div>
          <p className="pdf-upload-text-length">
            Total characters: {state.result.text.length.toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
};
