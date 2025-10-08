import { Topic } from '../types';
import { topicsAPI } from './api';
import { secureGeminiService } from './secureGeminiService';

export interface TopicSuggestion {
  name: string;
  content: string;
  estimatedMinutes: number;
  learningObjectives: string[];
  partNumber: number;
}

export interface ChapterAnalysisRequest {
  textbookContent: string;
  subject: string;
  classLevel: string;
  chapterName?: string;
}

export interface ChapterAnalysisResponse {
  suggestions: TopicSuggestion[];
  totalEstimatedHours: number;
  analysis: {
    breakpoints: string[];
    conceptHierarchy: string[];
    difficultyProgression: string[];
  };
}

class ChapterPlannerService {
  private static readonly GEMINI_PROXY_URL = process.env.REACT_APP_GEMINI_PROXY_URL || 'https://xvq11x0421.execute-api.us-west-2.amazonaws.com/pre-prod/gemini';

  /**
   * Analyze textbook content and generate topic suggestions with actual content splits
   */
  static async analyzeTextbookContent(
    content: string,
    subject: string,
    classLevel: string,
    chapterName?: string,
    numberOfSplits: number = 4
  ): Promise<TopicSuggestion[]> {
    try {
      // Truncate content if it's too large
      const maxContentLength = 100000;
      const truncatedContent = content.length > maxContentLength 
        ? content.substring(0, maxContentLength) + '\n\n[Content truncated for processing...]'
        : content;
      
      console.log(`Content length: ${content.length}, Using: ${truncatedContent.length}`);
      
      const prompt = this.buildOptimizedPrompt(truncatedContent, subject, classLevel, chapterName, numberOfSplits);
      
      const payload = {
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          topK: 20,
          topP: 0.8,
          maxOutputTokens: 8000,
        }
      };

      console.log('Sending optimized prompt to Gemini...');
      const response = await secureGeminiService.makeSecureRequest('analyze-chapter', payload);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to analyze chapter content');
      }

      const generatedText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!generatedText) {
        throw new Error('No analysis generated');
      }

      console.log('Generated response received, parsing with content extraction...');
      return this.parseSuggestionsWithContent(generatedText, truncatedContent, chapterName);
      
    } catch (error) {
      console.error('Chapter analysis error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to analyze chapter content');
    }
  }

  /**
   * OPTIMIZED PROMPT for content splitting
   */
  private static buildOptimizedPrompt(
    content: string,
    subject: string,
    classLevel: string,
    chapterName?: string,
    numberOfSplits: number = 4
  ): string {
    const chapterContext = chapterName ? `Chapter: ${chapterName}\n` : '';
    
    return `You are an expert educational planner. Analyze this ${subject} content for ${classLevel} and split it into exactly ${numberOfSplits} logical teaching sessions.

${chapterContext}
CONTENT TO SPLIT:
${content}

INSTRUCTIONS:
- Split the content into exactly ${numberOfSplits} sequential parts
- Each session should be 35-45 minutes
- Identify natural breakpoints in the content
- Each session should have clear learning objectives
- Maintain logical flow between sessions

OUTPUT FORMAT - Return ONLY valid JSON array:
[
  {
    "name": "Session 1: [Specific Topic Name]",
    "startPosition": 0,
    "endPosition": 1500,
    "estimatedMinutes": 40,
    "learningObjectives": ["Objective 1", "Objective 2", "Objective 3"],
    "partNumber": 1
  }
]

GUIDELINES:
- startPosition: character position where this session's content begins
- endPosition: character position where this session's content ends
- Sessions should cover the entire content (first startPosition: 0, last endPosition: ${content.length})
- Positions should be sequential and non-overlapping
- Choose natural breakpoints at paragraph boundaries where possible
- Return ONLY JSON, no additional text`;
  }

  /**
   * Parse suggestions and extract actual content from original text
   */
  private static parseSuggestionsWithContent(response: string, originalContent: string, chapterName?: string): TopicSuggestion[] {
    try {
      // Extract JSON from response
      let jsonString = response.trim();
      jsonString = jsonString.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      
      let jsonMatch = jsonString.match(/\[[\s\S]*?\]/);
      if (!jsonMatch) {
        const firstBracket = jsonString.indexOf('[');
        const lastBracket = jsonString.lastIndexOf(']');
        if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
          jsonString = jsonString.substring(firstBracket, lastBracket + 1);
        } else {
          throw new Error('No valid JSON array found in response');
        }
      } else {
        jsonString = jsonMatch[0];
      }
      
      jsonString = this.fixCommonJsonIssues(jsonString);
      const parsed = JSON.parse(jsonString);
      
      if (!Array.isArray(parsed)) {
        throw new Error('Response is not an array');
      }

      console.log(`[ChapterPlanner] Parsed ${parsed.length} session outlines`);

      // Validate positions and extract actual content
      const suggestions = this.extractContentFromPositions(parsed, originalContent, chapterName);
      
      console.log(`[ChapterPlanner] Successfully extracted content for ${suggestions.length} sessions`);
      return suggestions;

    } catch (error) {
      console.error('[ChapterPlanner] Failed to parse suggestions with content:', error);
      console.error('[ChapterPlanner] Raw response:', response);
      
      // Fallback: create equal splits manually
      return this.createManualSplits(originalContent, 4, chapterName);
    }
  }

  /**
   * Extract actual content based on position markers
   */
  private static extractContentFromPositions(parsedData: any[], originalContent: string, chapterName?: string): TopicSuggestion[] {
    const suggestions: TopicSuggestion[] = [];
    let lastEndPosition = 0;

    for (let i = 0; i < parsedData.length; i++) {
      const item = parsedData[i];
      
      // Use different possible property names for positions
      const startPos = item.startPosition || item.startChar || item.start || lastEndPosition;
      let endPos = item.endPosition || item.endChar || item.end;
      
      // Validate and adjust positions
      const validatedStart = Math.max(0, Math.min(startPos, originalContent.length));
      
      // If no end position provided or invalid, calculate based on content
      if (!endPos || endPos <= validatedStart || endPos > originalContent.length) {
        if (i === parsedData.length - 1) {
          // Last session should go to the end
          endPos = originalContent.length;
        } else {
          // Calculate approximate split
          const remainingContent = originalContent.length - validatedStart;
          const sessionsLeft = parsedData.length - i;
          endPos = Math.min(originalContent.length, validatedStart + Math.ceil(remainingContent / sessionsLeft));
        }
      }

      const validatedEnd = Math.min(originalContent.length, Math.max(endPos, validatedStart + 100)); // Ensure minimum content length
      
      // Extract content from original text
      let extractedContent = originalContent.substring(validatedStart, validatedEnd).trim();
      
      // If content is too short, try to extend to next paragraph
      if (extractedContent.length < 200 && validatedEnd < originalContent.length) {
        const extendedEnd = this.findNextParagraphBreak(originalContent, validatedEnd);
        extractedContent = originalContent.substring(validatedStart, extendedEnd).trim();
      }

      // Ensure we have meaningful content
      if (!extractedContent || extractedContent.length < 50) {
        extractedContent = this.createFallbackContent(item.name || `Session ${i + 1}`, originalContent);
      }

      // Add chapter name prefix if provided
      const chapterPrefix = chapterName ? `${chapterName} - ` : '';
      const topicName = item.name || `Session ${i + 1}: Content Part ${i + 1}`;
      const fullName = `${chapterPrefix}${topicName}`;

      suggestions.push({
        name: fullName,
        content: extractedContent,
        estimatedMinutes: Math.min(60, Math.max(30, item.estimatedMinutes || 40)),
        learningObjectives: Array.isArray(item.learningObjectives) && item.learningObjectives.length > 0
          ? item.learningObjectives.slice(0, 3)
          : [
              'Understand key concepts presented',
              'Apply knowledge to examples', 
              'Demonstrate comprehension through activities'
            ],
        partNumber: item.partNumber || i + 1
      });

      lastEndPosition = validatedEnd;
    }

    return suggestions;
  }

  /**
   * Find the next reasonable paragraph break
   */
  private static findNextParagraphBreak(content: string, startPosition: number): number {
    const nextDoubleNewline = content.indexOf('\n\n', startPosition);
    const nextSingleNewline = content.indexOf('\n', startPosition);
    
    if (nextDoubleNewline !== -1) {
      return nextDoubleNewline + 2;
    } else if (nextSingleNewline !== -1) {
      return nextSingleNewline + 1;
    } else {
      return Math.min(content.length, startPosition + 2000); // Max extension
    }
  }

  /**
   * Create fallback content when extraction fails
   */
  private static createFallbackContent(sessionName: string, originalContent: string): string {
    // Take a sample from the original content
    const sampleLength = Math.min(500, originalContent.length);
    const sampleStart = Math.floor(Math.random() * Math.max(0, originalContent.length - sampleLength));
    const sampleContent = originalContent.substring(sampleStart, sampleStart + sampleLength);
    
    return `Content for ${sessionName}:\n\n${sampleContent}...`;
  }

  /**
   * Manual fallback splitting if AI parsing fails
   */
  private static createManualSplits(content: string, numberOfSplits: number, chapterName?: string): TopicSuggestion[] {
    const suggestions: TopicSuggestion[] = [];
    const splitSize = Math.ceil(content.length / numberOfSplits);
    
    for (let i = 0; i < numberOfSplits; i++) {
      const start = i * splitSize;
      let end = (i + 1) * splitSize;
      
      // Adjust end to paragraph boundary if possible
      if (i < numberOfSplits - 1) {
        const paragraphBreak = content.indexOf('\n\n', end);
        if (paragraphBreak !== -1 && paragraphBreak < end + splitSize / 2) {
          end = paragraphBreak + 2;
        }
      } else {
        end = content.length;
      }
      
      const sessionContent = content.substring(start, end).trim();
      
      // Add chapter name prefix if provided
      const chapterPrefix = chapterName ? `${chapterName} - ` : '';
      const sessionName = `${chapterPrefix}Session ${i + 1}: Part ${i + 1}`;
      
      suggestions.push({
        name: sessionName,
        content: sessionContent || `Content section ${i + 1} of the chapter`,
        estimatedMinutes: 40,
        learningObjectives: [
          'Understand the key concepts in this section',
          'Apply learning to practical examples',
          'Demonstrate comprehension through activities'
        ],
        partNumber: i + 1
      });
    }
    
    return suggestions;
  }

  /**
   * Create topics from suggestions
   */
  static async createTopicsFromSuggestions(
    suggestions: TopicSuggestion[],
    subjectId: string,
    classId: string,
    schoolId: string
  ): Promise<Topic[]> {
    const createdTopics: Topic[] = [];

    for (const suggestion of suggestions) {
      try {
        const topicData = {
          name: suggestion.name,
          description: suggestion.content, // This now contains the actual split content
          subject_id: subjectId,
          class_id: classId,
          school_id: schoolId,
          document_links: [],
          ai_content: {
            learningObjectives: suggestion.learningObjectives,
            estimatedMinutes: suggestion.estimatedMinutes,
            partNumber: suggestion.partNumber,
            generatedAt: new Date()
          }
        };

        const createdTopic = await topicsAPI.create(topicData);
        createdTopics.push(createdTopic);
      } catch (error) {
        console.error(`Failed to create topic: ${suggestion.name}`, error);
      }
    }

    return createdTopics;
  }

  /**
   * Fix common JSON issues in AI responses
   */
  private static fixCommonJsonIssues(jsonString: string): string {
    // Remove trailing commas before closing brackets/braces
    jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1');
    
    // Fix unescaped quotes in strings
    jsonString = jsonString.replace(/"([^"]*)"([^"]*)"([^"]*)"/g, (match, p1, p2, p3) => {
      return `"${p1}\\"${p2}\\"${p3}"`;
    });
    
    // Fix missing quotes around property names
    jsonString = jsonString.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
    
    // Fix single quotes to double quotes
    jsonString = jsonString.replace(/'/g, '"');

    // Remove any residual markdown
    jsonString = jsonString.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    // Remove any non-JSON content
    const firstBracket = jsonString.indexOf('[');
    if (firstBracket > 0) {
      jsonString = jsonString.substring(firstBracket);
    }
    
    const lastBracket = jsonString.lastIndexOf(']');
    if (lastBracket > 0 && lastBracket < jsonString.length - 1) {
      jsonString = jsonString.substring(0, lastBracket + 1);
    }
    
    return jsonString.trim();
  }
}

export { ChapterPlannerService };