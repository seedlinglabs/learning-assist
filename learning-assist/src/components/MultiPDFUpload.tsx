/**
 * Multi-PDF Upload Component
 * Allows uploading multiple PDF files for chapter planning
 * Each file can be individually removed
 */

import React, { useState, useCallback, useRef } from 'react';
import { FileText, Upload, X, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { PDFExtractorService, PDFExtractionResult } from '../services/pdfExtractorService';

interface UploadedFile {
  id: string;
  file: File;
  extractedText: string;
  pageCount: number;
  status: 'processing' | 'success' | 'error';
  error?: string;
}

interface MultiPDFUploadProps {
  onFilesProcessed: (combinedText: string, files: UploadedFile[]) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  maxFiles?: number;
  allowManualInput?: boolean; // Allow manual text paste as fallback
}

export const MultiPDFUpload: React.FC<MultiPDFUploadProps> = ({
  onFilesProcessed,
  onError,
  disabled = false,
  maxFiles = 5
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const processFile = async (file: File): Promise<UploadedFile> => {
    const fileId = `${file.name}-${Date.now()}`;
    
    // Validate file
    const validation = PDFExtractorService.validatePDFFile(file);
    if (!validation.valid) {
      return {
        id: fileId,
        file,
        extractedText: '',
        pageCount: 0,
        status: 'error',
        error: validation.error || 'Invalid PDF file'
      };
    }

    try {
      // For large files, show immediate feedback
      const sizeInMB = file.size / (1024 * 1024);
      if (sizeInMB > 20) {
        console.log(`Processing large file (${sizeInMB.toFixed(1)}MB): ${file.name}`);
      }

      const result = await PDFExtractorService.extractTextFromPDF(file);
      
      console.log('📊 Extraction result:', {
        success: result.success,
        textLength: result.text?.length || 0,
        pageCount: result.pageCount,
        error: result.error
      });
      
      if (result.success && result.text) {
        return {
          id: fileId,
          file,
          extractedText: result.text,
          pageCount: result.pageCount || 0,
          status: 'success'
        };
      } else {
        return {
          id: fileId,
          file,
          extractedText: '',
          pageCount: 0,
          status: 'error',
          error: result.error || 'Failed to extract text'
        };
      }
    } catch (error) {
      return {
        id: fileId,
        file,
        extractedText: '',
        pageCount: 0,
        status: 'error',
        error: error instanceof Error ? error.message : 'Processing failed'
      };
    }
  };

  const handleFilesSelected = useCallback(async (files: File[]) => {
    if (disabled || isProcessing) return;
    
    const remainingSlots = maxFiles - uploadedFiles.length;
    if (files.length > remainingSlots) {
      onError?.(`Maximum ${maxFiles} files allowed. You can add ${remainingSlots} more file(s).`);
      return;
    }

    setIsProcessing(true);
    const newFiles: UploadedFile[] = [];

    // Process files sequentially to avoid memory issues
    for (const file of files) {
      const uploadedFile = await processFile(file);
      newFiles.push(uploadedFile);
      
      // Update UI after each file
      setUploadedFiles(prev => [...prev, uploadedFile]);
    }

    setIsProcessing(false);

    // Combine text from all successful files
    const allFiles = [...uploadedFiles, ...newFiles];
    const successfulFiles = allFiles.filter(f => f.status === 'success');
    const combinedText = successfulFiles.map(f => f.extractedText).join('\n\n---\n\n');
    
    onFilesProcessed(combinedText, allFiles);
    
    // Report any errors
    const failedFiles = newFiles.filter(f => f.status === 'error');
    if (failedFiles.length > 0) {
      const errorMsg = `Failed to process ${failedFiles.length} file(s): ${failedFiles.map(f => f.file.name).join(', ')}`;
      onError?.(errorMsg);
    }
  }, [disabled, isProcessing, uploadedFiles, maxFiles, onFilesProcessed, onError]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (disabled) return;
    
    const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
    if (files.length > 0) {
      handleFilesSelected(files);
    } else {
      onError?.('Please drop PDF files only');
    }
  }, [disabled, handleFilesSelected, onError]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) {
      handleFilesSelected(files);
    }
    // Reset input
    e.target.value = '';
  }, [handleFilesSelected]);

  const handleRemoveFile = useCallback((fileId: string) => {
    const updatedFiles = uploadedFiles.filter(f => f.id !== fileId);
    setUploadedFiles(updatedFiles);
    
    // Update combined text
    const successfulFiles = updatedFiles.filter(f => f.status === 'success');
    const combinedText = successfulFiles.map(f => f.extractedText).join('\n\n---\n\n');
    onFilesProcessed(combinedText, updatedFiles);
  }, [uploadedFiles, onFilesProcessed]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="multi-pdf-upload">
      {/* Upload Area */}
      <div
        className={`pdf-upload-area ${isDragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''}`}
        onDragOver={(e) => { e.preventDefault(); !disabled && setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          multiple
          onChange={handleFileInputChange}
          className="pdf-upload-input"
          disabled={disabled || uploadedFiles.length >= maxFiles}
        />
        
        <div className="pdf-upload-content">
          <Upload size={32} className="upload-icon" />
          <p className="upload-text">
            {isProcessing ? 'Processing files...' : 
             uploadedFiles.length >= maxFiles ? `Maximum ${maxFiles} files reached` :
             'Drop PDF files here or click to browse'}
          </p>
          <p className="upload-subtext">
            {uploadedFiles.length}/{maxFiles} files • Max 50MB per file • PDFs only
          </p>
        </div>
      </div>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="uploaded-files-list">
          <h4>Uploaded Files ({uploadedFiles.length})</h4>
          {uploadedFiles.map((uploadedFile) => (
            <div key={uploadedFile.id} className={`uploaded-file-item ${uploadedFile.status}`}>
              <div className="file-icon">
                {uploadedFile.status === 'processing' && <Loader2 size={20} className="spinning" />}
                {uploadedFile.status === 'success' && <CheckCircle size={20} className="success-icon" />}
                {uploadedFile.status === 'error' && <AlertCircle size={20} className="error-icon" />}
              </div>
              
              <div className="file-info">
                <div className="file-name">{uploadedFile.file.name}</div>
                <div className="file-details">
                  {uploadedFile.status === 'success' && (
                    <span className="file-success">
                      ✓ {uploadedFile.pageCount} pages • {formatFileSize(uploadedFile.file.size)}
                    </span>
                  )}
                  {uploadedFile.status === 'error' && (
                    <span className="file-error">✗ {uploadedFile.error}</span>
                  )}
                  {uploadedFile.status === 'processing' && (
                    <span className="file-processing">Processing...</span>
                  )}
                </div>
              </div>
              
              <button
                onClick={() => handleRemoveFile(uploadedFile.id)}
                className="remove-file-btn"
                disabled={uploadedFile.status === 'processing'}
                title="Remove file"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {uploadedFiles.length > 0 && (
        <div className="upload-summary">
          <span className="summary-item">
            <CheckCircle size={14} />
            {uploadedFiles.filter(f => f.status === 'success').length} successful
          </span>
          {uploadedFiles.some(f => f.status === 'error') && (
            <span className="summary-item error">
              <AlertCircle size={14} />
              {uploadedFiles.filter(f => f.status === 'error').length} failed
            </span>
          )}
        </div>
      )}
    </div>
  );
};

