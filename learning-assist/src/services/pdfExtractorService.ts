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

      // Validate file size (max 100MB for chapter planner)
      const maxSize = 100 * 1024 * 1024; // 100MB
      if (file.size > maxSize) {
        return {
          success: false,
          error: 'File size must be less than 100MB'
        };
      }

      // Warn for large files
      const sizeInMB = file.size / (1024 * 1024);
      if (sizeInMB > 30) {
        console.warn(`Processing large PDF (${sizeInMB.toFixed(1)}MB): ${file.name}. This may take a while...`);
      }

      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      
      console.log(`🔍 Loading PDF: ${file.name} (${sizeInMB.toFixed(2)}MB)`);
      
      // Load PDF document with options to handle large files
      const pdf = await pdfjsLib.getDocument({ 
        data: arrayBuffer,
        useSystemFonts: true,
        disableFontFace: true, // Reduce memory usage
        verbosity: 0 // Reduce console logging
      }).promise;
      const pageCount = pdf.numPages;
      
      console.log(`📖 PDF loaded successfully. Pages: ${pageCount}`);
      
      let fullText = '';
      
      // Extract text from each page with progress logging for large files
      for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
        try {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          
          // Debug first page
          if (pageNum === 1) {
            console.log(`📄 First page has ${textContent.items.length} text items`);
            if (textContent.items.length > 0) {
              console.log(`📝 Sample text items:`, textContent.items.slice(0, 3).map((item: any) => item.str));
            }
          }
          
          // Combine text items from the page - try multiple approaches
          let pageText = '';
          
          // Approach 1: Standard extraction
          if (textContent.items && textContent.items.length > 0) {
            pageText = textContent.items
              .map((item: any) => {
                // Handle different text item structures
                if (typeof item === 'string') return item;
                if (item.str) return String(item.str);
                if (item.text) return String(item.text);
                return '';
              })
              .filter(str => str.length > 0)
              .join(' ')
              .trim();
          }
          
          // Approach 2: If no text, try getting it differently
          if (!pageText && textContent.items) {
            console.log('⚠️ Trying alternative extraction method for page', pageNum);
            pageText = JSON.stringify(textContent.items)
              .replace(/[{}"[\]]/g, ' ')
              .replace(/str:|text:/g, '')
              .replace(/\s+/g, ' ')
              .trim();
          }
          
          if (pageText) {
            fullText += pageText + '\n\n';
          } else if (pageNum <= 3) {
            console.warn(`⚠️ Page ${pageNum} has ${textContent.items.length} items but no extractable text`);
          }
          
          // Log progress for large files
          if (pageCount > 50 && pageNum % 10 === 0) {
            console.log(`Extracted ${pageNum}/${pageCount} pages...`);
          }
          
          // Cleanup page to free memory
          await page.cleanup();
        } catch (pageError) {
          console.warn(`⚠️ Error extracting page ${pageNum}, skipping:`, pageError);
          // Continue with other pages even if one fails
        }
      }
      
      // Cleanup PDF document
      await pdf.cleanup();

      console.log(`📊 Raw extracted text length: ${fullText.length} characters`);

      // Clean up the extracted text
      const cleanedText = this.cleanExtractedText(fullText);
      
      console.log(`✅ Cleaned text length: ${cleanedText.length} characters`);
      
      // Check if we actually got text
      if (!cleanedText || cleanedText.trim().length === 0) {
        console.error('❌ No text extracted!');
        console.error('PDF Info:', {
          fileName: file.name,
          fileSize: file.size,
          pages: pageCount,
          rawTextLength: fullText.length,
          cleanedTextLength: cleanedText.length
        });
        console.error('This could mean:');
        console.error('1. PDF is scanned images (no text layer)');
        console.error('2. PDF uses special encoding PDF.js cannot read');
        console.error('3. Text cleaning removed all content (bug)');
        
        return {
          success: false,
          error: `⚠️ Could not extract text from PDF (${pageCount} pages). The PDF may use special encoding or be scanned images. Please use the manual text input to paste the content.`
        };
      }
      
      console.log(`🎉 SUCCESS! Extracted ${cleanedText.length} characters from ${pageCount} pages`);

      return {
        success: true,
        text: cleanedText,
        pageCount,
        fileName: file.name
      };

    } catch (error) {
      console.error('PDF extraction error:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to extract text from PDF';
      if (error instanceof Error) {
        if (error.message.includes('Invalid PDF structure')) {
          errorMessage = 'PDF file is corrupted or has an invalid structure. Try re-saving the PDF.';
        } else if (error.message.includes('password')) {
          errorMessage = 'PDF is password-protected. Please remove the password and try again.';
        } else if (error.message.includes('memory') || error.message.includes('out of memory')) {
          errorMessage = 'PDF is too complex or large. Try splitting it into smaller files.';
        } else {
          errorMessage = `PDF extraction failed: ${error.message}. The PDF may be scanned images (not searchable text), corrupted, or in an unsupported format.`;
        }
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Clean and format extracted text
   * @param text - Raw extracted text
   * @returns Cleaned text
   */
  private static cleanExtractedText(text: string): string {
    if (!text) return '';
    
    // More conservative cleaning - preserve line structure
    const cleaned = text
      .replace(/\n\s*\n\s*\n+/g, '\n\n') // Remove excessive line breaks (3+ → 2)
      .replace(/[ \t]+/g, ' ') // Normalize horizontal whitespace only
      .replace(/\n /g, '\n') // Remove leading spaces from lines
      .replace(/ \n/g, '\n') // Remove trailing spaces from lines
      .trim();
    
    console.log(`🧹 cleanExtractedText: ${text.length} → ${cleaned.length} chars`);
    
    return cleaned;
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
