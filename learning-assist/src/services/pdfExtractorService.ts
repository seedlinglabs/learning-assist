import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker to use local file
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

export interface PDFExtractionResult {
  success: boolean;
  text?: string;
  error?: string;
  pageCount?: number;
  fileName?: string;
}

export class PDFExtractorService {
  /**
   * Extract text from a PDF file
   * @param file - The PDF file to extract text from
   * @returns Promise with extraction result
   */
  static async extractTextFromPDF(file: File): Promise<PDFExtractionResult> {
    try {
      // Validate file type
      if (file.type !== 'application/pdf') {
        return {
          success: false,
          error: 'File must be a PDF document'
        };
      }

      // Validate file size (max 50MB)
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        return {
          success: false,
          error: 'File size must be less than 50MB'
        };
      }

      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      
      // Load PDF document
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const pageCount = pdf.numPages;
      
      let fullText = '';
      
      // Extract text from each page
      for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Combine text items from the page
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ')
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim();
        
        fullText += pageText + '\n\n';
      }

      // Clean up the extracted text
      const cleanedText = this.cleanExtractedText(fullText);

      return {
        success: true,
        text: cleanedText,
        pageCount,
        fileName: file.name
      };

    } catch (error) {
      console.error('PDF extraction error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to extract text from PDF'
      };
    }
  }

  /**
   * Clean and format extracted text
   * @param text - Raw extracted text
   * @returns Cleaned text
   */
  private static cleanExtractedText(text: string): string {
    return text
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Remove excessive line breaks
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/\n\s+/g, '\n') // Remove leading spaces from lines
      .replace(/\s+\n/g, '\n') // Remove trailing spaces from lines
      .trim();
  }

  /**
   * Validate PDF file before processing
   * @param file - File to validate
   * @returns Validation result
   */
  static validatePDFFile(file: File): { valid: boolean; error?: string } {
    // Check file type
    if (file.type !== 'application/pdf') {
      return {
        valid: false,
        error: 'Please select a PDF file'
      };
    }

    // Check file size (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'File size must be less than 50MB'
      };
    }

    // Check if file is empty
    if (file.size === 0) {
      return {
        valid: false,
        error: 'File appears to be empty'
      };
    }

    return { valid: true };
  }

  /**
   * Get file size in human readable format
   * @param bytes - File size in bytes
   * @returns Formatted file size string
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
