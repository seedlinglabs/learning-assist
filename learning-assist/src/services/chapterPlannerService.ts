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
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 30000,
        }
      };

      const response = await secureGeminiService.makeSecureRequest('analyze-chapter', payload);
      
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
   * Build optimized prompt for chapter analysis (QUICK WIN VERSION)
   * Uses position-based content references instead of copying content
   */
  private static buildOptimizedPrompt(
    content: string,
    subject: string,
    classLevel: string,
    chapterName?: string,
    numberOfSplits: number = 4
  ): string {
    const chapterContext = chapterName ? `Chapter: ${chapterName}\n` : '';
    
    if (numberOfSplits === 0) {
      return `Analyze this ${subject} textbook content for ${classLevel} and determine the optimal number of teaching topics (3-8 topics, each 30-45 minutes).

${chapterContext}CONTENT (${content.length} characters):
${content}

Return ONLY JSON array with optimal number of topic objects (3-8):
[{
  "name": "Part 1: [Specific Focus Area]",
  "startChar": 0,
  "endChar": 5000,
  "estimatedMinutes": 35,
  "learningObjectives": ["Objective 1", "Objective 2", "Objective 3"],
  "partNumber": 1
}]

Requirements:
- Choose 3-8 topics based on content complexity and length
- Use startChar/endChar positions to reference content sections (don't copy content)
- Sequential part numbers (1, 2, 3...)
- 30-45 minutes per topic
- 3-5 specific learning objectives per topic
- Natural conceptual boundaries between topics
- Ensure full content coverage (last endChar should be ${content.length})`;
    }

    return `Split this ${subject} textbook content for ${classLevel} into exactly ${numberOfSplits} teaching topics.

${chapterContext}CONTENT (${content.length} characters):
${content}

Return ONLY JSON array with exactly ${numberOfSplits} topic objects:
[{
  "name": "Part 1: [Specific Focus Area]",
  "startChar": 0,
  "endChar": 5000,
  "estimatedMinutes": 35,
  "learningObjectives": ["Objective 1", "Objective 2", "Objective 3"],
  "partNumber": 1
}]

Requirements:
- Exactly ${numberOfSplits} topics
- Use startChar/endChar positions to reference content sections (don't copy content)
- Sequential part numbers (1-${numberOfSplits})
- 30-45 minutes per topic
- 3-5 specific learning objectives per topic
- Distribute content evenly across all topics
- Natural conceptual boundaries
- Ensure full content coverage (last endChar should be ${content.length})`;
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
    const chapterContext = chapterName ? `Chapter: ${chapterName}` : 'Chapter content';
    
    // Handle AI auto-selection when numberOfSplits is 0
    if (numberOfSplits === 0) {
      return `You are an expert curriculum designer and educational content specialist. Analyze the following textbook content and determine the optimal number of logical, teachable topics that can be delivered in 30-45 minutes each. Choose the number of topics that best fits the content complexity and length.

${chapterContext}
Subject: ${subject}
Class Level: ${classLevel}

TEXTBOOK CONTENT:
${content}

ANALYSIS REQUIREMENTS:
1. Determine the optimal number of topics based on content length and complexity
2. Each topic should be deliverable in 30-45 minutes
3. Maintain logical flow and learning progression
4. Include clear, measurable learning objectives
5. Name topics descriptively with part numbers
6. Estimate realistic time requirements
7. Ensure content flows naturally from one topic to the next
8. Consider age-appropriate attention spans and complexity
9. Distribute content evenly across all topics
10. Choose 3-8 topics based on content complexity (shorter content = fewer topics, longer content = more topics)

TOPIC SPLITTING GUIDELINES:
- Split at natural conceptual boundaries
- Group related concepts together
- Ensure each topic has a clear focus
- Maintain prerequisite relationships
- Include hands-on activities where appropriate
- Balance theory with practical application

RESPONSE FORMAT:
Return ONLY a valid JSON array with the optimal number of topic objects, no additional text, markdown, or explanations. The JSON must be properly formatted with correct syntax:

[
  {
    "name": "Chapter X: [Descriptive Topic Name] - Part 1: [Specific Focus]",
    "content": "[Relevant portion of textbook content for this topic]",
    "estimatedMinutes": 35,
    "learningObjectives": [
      "Students will be able to [specific objective]",
      "Students will understand [concept]",
      "Students will demonstrate [skill]"
    ],
    "partNumber": 1
  }
]

CRITICAL JSON REQUIREMENTS:
- Return ONLY the JSON array with the optimal number of topic objects, no markdown code blocks, no explanations
- Use double quotes for all strings and property names
- Escape any quotes within string values with backslashes
- No trailing commas after the last item in arrays or objects
- Ensure all brackets and braces are properly closed
- Each string value must be on a single line (no line breaks within strings)
- Property names must be exactly: "name", "content", "estimatedMinutes", "learningObjectives", "partNumber"

CONTENT REQUIREMENTS:
- Choose 3-8 topics based on content complexity and length
- Each topic's content should be substantial but focused (200-500 words)
- Learning objectives should be specific and measurable
- Time estimates should be realistic for the class level (30-45 minutes)
- Part numbers should be sequential starting from 1
- Content should be extracted directly from the provided textbook material
- Topic names should be descriptive and indicate the chapter and part number
- Distribute the textbook content evenly across all topics`;
    }
    
    // Regular prompt for specified number of splits
    return `You are an expert curriculum designer and educational content specialist. Analyze the following textbook content and split it into exactly ${numberOfSplits} logical, teachable topics that can be delivered in 30-45 minutes each.

${chapterContext}
Subject: ${subject}
Class Level: ${classLevel}

TEXTBOOK CONTENT:
${content}

ANALYSIS REQUIREMENTS:
1. Split the content into EXACTLY ${numberOfSplits} topics
2. Each topic should be deliverable in 30-45 minutes
3. Maintain logical flow and learning progression
4. Include clear, measurable learning objectives
5. Name topics descriptively with part numbers
6. Estimate realistic time requirements
7. Ensure content flows naturally from one topic to the next
8. Consider age-appropriate attention spans and complexity
9. Distribute content evenly across all ${numberOfSplits} topics
10. Adapt topic duration based on the number of splits (more splits = shorter individual topics)

TOPIC SPLITTING GUIDELINES:
- Split at natural conceptual boundaries
- Group related concepts together
- Ensure each topic has a clear focus
- Maintain prerequisite relationships
- Include hands-on activities where appropriate
- Balance theory with practical application

RESPONSE FORMAT:
Return ONLY a valid JSON array with exactly ${numberOfSplits} objects, no additional text, markdown, or explanations. The JSON must be properly formatted with correct syntax:

[
  {
    "name": "Chapter X: [Descriptive Topic Name] - Part 1: [Specific Focus]",
    "content": "[Relevant portion of textbook content for this topic]",
    "estimatedMinutes": 35,
    "learningObjectives": [
      "Students will be able to [specific objective]",
      "Students will understand [concept]",
      "Students will demonstrate [skill]"
    ],
    "partNumber": 1
  }
]

CRITICAL JSON REQUIREMENTS:
- Return ONLY the JSON array with exactly ${numberOfSplits} objects, no markdown code blocks, no explanations
- Use double quotes for all strings and property names
- Escape any quotes within string values with backslashes
- No trailing commas after the last item in arrays or objects
- Ensure all brackets and braces are properly closed
- Each string value must be on a single line (no line breaks within strings)
- Property names must be exactly: "name", "content", "estimatedMinutes", "learningObjectives", "partNumber"

CONTENT REQUIREMENTS:
- Generate exactly ${numberOfSplits} topics, no more, no less
- Each topic's content should be substantial but focused (200-500 words)
- Learning objectives should be specific and measurable
- Time estimates should be realistic for the class level (30-45 minutes)
- Part numbers should be sequential starting from 1 to ${numberOfSplits}
- Content should be extracted directly from the provided textbook material
- Topic names should be descriptive and indicate the chapter and part number
- Distribute the textbook content evenly across all ${numberOfSplits} topics`;
  }

  /**
   * Parse optimized topic suggestions with position-based content references
   */
  private static parseOptimizedSuggestions(response: string, originalContent: string): TopicSuggestion[] {
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

      console.log(`[ChapterPlanner] Parsed ${parsed.length} topics with position references`);
      
      // Convert position-based references to actual content
      return parsed.map((item: any, index: number) => {
        const startChar = item.startChar || 0;
        const endChar = item.endChar || originalContent.length;
        const extractedContent = originalContent.substring(startChar, endChar);
        
        return {
          name: item.name || `Topic ${index + 1}`,
          content: extractedContent,
          estimatedMinutes: item.estimatedMinutes || 35,
          learningObjectives: Array.isArray(item.learningObjectives) 
            ? item.learningObjectives 
            : ['Students will learn the key concepts of this topic'],
          partNumber: item.partNumber || index + 1
        };
      });

    } catch (error) {
      console.error('[ChapterPlanner] Failed to parse optimized suggestions:', error);
      console.error('[ChapterPlanner] Raw response:', response);
      
      // Fallback to legacy parser
      console.log('[ChapterPlanner] Attempting fallback to legacy parser...');
      return this.parseTopicSuggestions(response);
    }
  }

  /**
   * Parse topic suggestions from AI response (LEGACY PARSER)
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

}

export { ChapterPlannerService };
