import { Topic } from '../types';
import { topicsAPI } from './api';

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
   * Analyze textbook content and generate topic suggestions
   */
  static async analyzeTextbookContent(
    content: string,
    subject: string,
    classLevel: string,
    chapterName?: string,
    numberOfSplits: number = 4
  ): Promise<TopicSuggestion[]> {
    try {
      // Truncate content if it's too large (limit to ~30,000 characters to leave room for prompt)
      const maxContentLength = 100000;
      const truncatedContent = content.length > maxContentLength 
        ? content.substring(0, maxContentLength) + '\n\n[Content truncated for processing...]'
        : content;
      
      console.log(`Content length: ${content.length}, Using: ${truncatedContent.length}`);
      
      const prompt = this.buildChapterAnalysisPrompt(truncatedContent, subject, classLevel, chapterName, numberOfSplits);
      
      const payload = {
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.4,
          topK: 20,
          topP: 0.85,
          maxOutputTokens: 8000,
        }
      };

      const response = await this.makeSecureRequest('analyze-chapter', payload);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to analyze chapter content');
      }

      const generatedText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!generatedText) {
        throw new Error('No analysis generated');
      }

      console.log('Generated text:', generatedText);
      return this.parseTopicSuggestions(generatedText);
      
    } catch (error) {
      console.error('Chapter analysis error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to analyze chapter content');
    }
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
          description: suggestion.content,
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
        // Continue with other topics even if one fails
      }
    }

    return createdTopics;
  }

  /**
   * Build the prompt for chapter analysis
   */
  private static buildChapterAnalysisPrompt(
    content: string,
    subject: string,
    classLevel: string,
    chapterName?: string,
    numberOfSplits: number = 4
  ): string {
    const chapterTitle = chapterName || 'Chapter';
    
    return `Split this ${subject} textbook content for ${classLevel} into exactly ${numberOfSplits} teaching sessions (30-45 min each).

${chapterTitle}

CONTENT:
${content}

Return ONLY a JSON array with exactly ${numberOfSplits} objects:
[
  {
    "name": "${chapterTitle} - Part 1: [Topic Name]",
    "content": "[Extract relevant portion of textbook content]",
    "estimatedMinutes": 40,
    "learningObjectives": ["Objective 1", "Objective 2", "Objective 3"],
    "partNumber": 1
  }
]

Requirements:
- EXACTLY ${numberOfSplits} topics (no more, no less)
- Sequential part numbers: 1 to ${numberOfSplits}
- Split at natural conceptual boundaries
- Each topic: 200-500 words from the content
- 3 specific learning objectives per topic
- Distribute content evenly across all ${numberOfSplits} topics
- Return ONLY valid JSON, no markdown, no explanations`;
  }

  /**
   * Parse topic suggestions from AI response
   */
  private static parseTopicSuggestions(response: string): TopicSuggestion[] {
    try {
      // Clean the response to extract JSON
      let jsonString = response.trim();
      
      // Remove any markdown code blocks (```json ... ```)
      jsonString = jsonString.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      
      // Prefer a non-greedy JSON array match to avoid trailing artifacts
      let jsonMatch = jsonString.match(/\[[\s\S]*?\]/);
      
      // If non-greedy fails, fallback to first-to-last bracket slice
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
      
      // Try to fix common JSON issues
      jsonString = this.fixCommonJsonIssues(jsonString);
      
      const suggestions = JSON.parse(jsonString);
      
      // Validate the structure
      if (!Array.isArray(suggestions)) {
        throw new Error('Response is not an array');
      }

      return suggestions.map((suggestion, index) => ({
        name: suggestion.name || `Topic ${index + 1}`,
        content: suggestion.content || '',
        estimatedMinutes: suggestion.estimatedMinutes || 35,
        learningObjectives: Array.isArray(suggestion.learningObjectives) 
          ? suggestion.learningObjectives 
          : ['Students will learn the key concepts of this topic'],
        partNumber: suggestion.partNumber || index + 1
      }));

    } catch (error) {
      console.error('Failed to parse topic suggestions:', error);
      console.error('Raw response:', response);
      
      // Try alternative parsing methods
      const fallbackSuggestions = this.tryAlternativeParsing(response);
      if (fallbackSuggestions.length > 0) {
        return fallbackSuggestions;
      }
      
      // Final fallback: create a single topic with the full content
      return [{
        name: 'Chapter Content - Complete Topic',
        content: 'Full chapter content (parsing failed)',
        estimatedMinutes: 45,
        learningObjectives: ['Students will learn the key concepts of this chapter'],
        partNumber: 1
      }];
    }
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

    // Remove any residual markdown fences
    jsonString = jsonString.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    // Remove any non-JSON content before the first [
    const firstBracket = jsonString.indexOf('[');
    if (firstBracket > 0) {
      jsonString = jsonString.substring(firstBracket);
    }
    
    // Remove any non-JSON content after the last ]
    const lastBracket = jsonString.lastIndexOf(']');
    if (lastBracket > 0 && lastBracket < jsonString.length - 1) {
      jsonString = jsonString.substring(0, lastBracket + 1);
    }
    
    return jsonString.trim();
  }

  /**
   * Try alternative parsing methods for malformed JSON
   */
  private static tryAlternativeParsing(response: string): TopicSuggestion[] {
    try {
      // Try to extract topic information using regex patterns
      const topicPattern = /"name"\s*:\s*"([^"]+)"[\s\S]*?"content"\s*:\s*"([^"]+)"[\s\S]*?"estimatedMinutes"\s*:\s*(\d+)/g;
      const suggestions: TopicSuggestion[] = [];
      let match;
      let partNumber = 1;

      while ((match = topicPattern.exec(response)) !== null) {
        const name = match[1];
        const content = match[2];
        const estimatedMinutes = parseInt(match[3]) || 35;

        suggestions.push({
          name: name || `Topic ${partNumber}`,
          content: content || '',
          estimatedMinutes,
          learningObjectives: ['Students will learn the key concepts of this topic'],
          partNumber
        });
        partNumber++;
      }

      if (suggestions.length > 0) {
        console.log('Successfully parsed using alternative method:', suggestions.length, 'topics');
        return suggestions;
      }
    } catch (error) {
      console.error('Alternative parsing also failed:', error);
    }

    return [];
  }

  /**
   * Make secure request to Gemini API
   */
  private static async makeSecureRequest(endpoint: string, payload: any): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const authToken = localStorage.getItem('authToken');
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(`${this.GEMINI_PROXY_URL}/${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        data
      };

    } catch (error) {
      console.error(`Chapter Planner API error (${endpoint}):`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}

export { ChapterPlannerService };