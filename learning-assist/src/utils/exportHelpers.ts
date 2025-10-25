/**
 * Export Helpers for PDF and Word document generation
 * Converts HTML content (from formatSimpleMarkdown) to downloadable formats
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';

export interface ExportOptions {
  content: string; // HTML content to export
  filename: string; // Base filename (without extension)
  title: string; // Document title
}

/**
 * Export HTML content as PDF
 * Uses html2canvas to render HTML, then adds to jsPDF
 */
export async function exportToPDF(options: ExportOptions): Promise<void> {
  const { content, filename, title } = options;

  try {
    // Create temporary container for rendering
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '800px';
    container.style.padding = '40px';
    container.style.backgroundColor = 'white';
    container.style.fontFamily = 'Arial, sans-serif';
    container.style.fontSize = '14px';
    container.style.lineHeight = '1.6';
    
    // Add title and content
    const titleElement = document.createElement('h1');
    titleElement.textContent = title;
    titleElement.style.marginBottom = '20px';
    titleElement.style.fontSize = '24px';
    titleElement.style.fontWeight = 'bold';
    
    const contentElement = document.createElement('div');
    contentElement.innerHTML = content;
    
    // Apply styles to ensure proper rendering
    contentElement.style.color = '#000';
    contentElement.querySelectorAll('h1').forEach((el: Element) => {
      (el as HTMLElement).style.fontSize = '20px';
      (el as HTMLElement).style.marginTop = '20px';
      (el as HTMLElement).style.marginBottom = '10px';
    });
    contentElement.querySelectorAll('h2').forEach((el: Element) => {
      (el as HTMLElement).style.fontSize = '18px';
      (el as HTMLElement).style.marginTop = '16px';
      (el as HTMLElement).style.marginBottom = '8px';
    });
    contentElement.querySelectorAll('h3').forEach((el: Element) => {
      (el as HTMLElement).style.fontSize = '16px';
      (el as HTMLElement).style.marginTop = '12px';
      (el as HTMLElement).style.marginBottom = '6px';
    });
    contentElement.querySelectorAll('table').forEach((el: Element) => {
      (el as HTMLElement).style.borderCollapse = 'collapse';
      (el as HTMLElement).style.width = '100%';
      (el as HTMLElement).style.marginTop = '10px';
      (el as HTMLElement).style.marginBottom = '10px';
    });
    contentElement.querySelectorAll('th, td').forEach((el: Element) => {
      (el as HTMLElement).style.border = '1px solid #ddd';
      (el as HTMLElement).style.padding = '8px';
    });
    
    container.appendChild(titleElement);
    container.appendChild(contentElement);
    document.body.appendChild(container);

    // Render to canvas
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    // Remove temporary container
    document.body.removeChild(container);

    // Create PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    // Add image to PDF
    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // Add new pages if content is longer than one page
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    // Save the PDF
    pdf.save(`${filename}.pdf`);
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    throw new Error('Failed to export to PDF. Please try again.');
  }
}

/**
 * Export HTML content as Word document (.docx)
 * Converts HTML to DOCX using the docx library
 */
export async function exportToWord(options: ExportOptions): Promise<void> {
  const { content, filename, title } = options;

  try {
    // Parse HTML content and convert to docx paragraphs
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    
    const children: Array<Paragraph> = [];
    
    // Add title
    children.push(
      new Paragraph({
        text: title,
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 200 }
      })
    );

    // Parse HTML nodes
    const parseNode = (node: ChildNode): void => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.trim();
        if (text) {
          children.push(new Paragraph({ text }));
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        const tagName = element.tagName.toLowerCase();
        
        if (tagName === 'h1') {
          children.push(new Paragraph({
            text: element.textContent || '',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 200, after: 100 }
          }));
        } else if (tagName === 'h2') {
          children.push(new Paragraph({
            text: element.textContent || '',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 160, after: 80 }
          }));
        } else if (tagName === 'h3') {
          children.push(new Paragraph({
            text: element.textContent || '',
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 120, after: 60 }
          }));
        } else if (tagName === 'p' || tagName === 'div') {
          const text = element.textContent?.trim();
          if (text) {
            children.push(new Paragraph({ text, spacing: { after: 120 } }));
          }
        } else if (tagName === 'li') {
          const text = element.textContent?.trim();
          if (text) {
            children.push(new Paragraph({
              text: `• ${text}`,
              spacing: { after: 80 }
            }));
          }
        } else if (tagName === 'strong' || tagName === 'b') {
          const text = element.textContent?.trim();
          if (text) {
            children.push(new Paragraph({
              children: [new TextRun({ text, bold: true })],
              spacing: { after: 80 }
            }));
          }
        } else {
          // Recursively parse child nodes
          element.childNodes.forEach(parseNode);
        }
      }
    };

    tempDiv.childNodes.forEach(parseNode);

    // Create document
    const doc = new Document({
      sections: [{
        properties: {},
        children
      }]
    });

    // Generate and save
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${filename}.docx`);
  } catch (error) {
    console.error('Error exporting to Word:', error);
    throw new Error('Failed to export to Word. Please try again.');
  }
}

/**
 * Validate if a URL is a YouTube link
 */
export function isYouTubeURL(url: string): boolean {
  const youtubePatterns = [
    /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/i,
    /^https?:\/\/(www\.)?youtu\.be\/[\w-]+/i,
    /^https?:\/\/(www\.)?youtube\.com\/embed\/[\w-]+/i,
    /^https?:\/\/(www\.)?youtube\.com\/v\/[\w-]+/i
  ];
  
  return youtubePatterns.some(pattern => pattern.test(url.trim()));
}

/**
 * Extract YouTube video ID from various URL formats
 */
export function extractYouTubeID(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/i
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

/**
 * Create a sanitized filename from topic name
 */
export function sanitizeFilename(topicName: string, suffix: string): string {
  return topicName
    .replace(/[^a-z0-9]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .substring(0, 50) + `-${suffix}`;
}

