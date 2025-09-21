/**
 * Secure Gemini Service - Uses backend proxy instead of direct API calls
 * This eliminates the need for REACT_APP_GEMINI_API_KEY in the frontend
 */

import { AIContent } from '../types';

// Use the same API base URL as other services
const API_BASE_URL = 'https://xvq11x0421.execute-api.us-west-2.amazonaws.com/pre-prod';
const GEMINI_PROXY_URL = `${API_BASE_URL}/gemini`;

export interface ContentType {
  text: string;
}

export interface DocumentDiscoveryRequest {
  prompt: string;
  documentUrls: string[];
  classLevel: string;
  subject: string;
  maxResults?: number;
}

export interface SectionEnhancementRequest {
  section: string;
  content: string;
  classLevel: string;
  enhancementType: 'expand' | 'simplify' | 'add_examples' | 'add_activities';
  topicName?: string;
  sectionType?: string;
  duration?: number;
}

export interface GeminiResponse {
  success: boolean;
  data?: any;
  error?: string;
  usage?: {
    daily_requests: number;
    limit: number;
  };
}

class SecureGeminiService {
  private async makeSecureRequest(endpoint: string, payload: any): Promise<GeminiResponse> {
    try {
      // Get auth token if available (for usage tracking)
      const authToken = localStorage.getItem('authToken');
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(`${GEMINI_PROXY_URL}/${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 429) {
          return {
            success: false,
            error: 'Daily rate limit exceeded. Please try again tomorrow.',
            usage: errorData.current_usage ? {
              daily_requests: errorData.current_usage,
              limit: 100
            } : undefined
          };
        }
        
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        data
      };

    } catch (error) {
      console.error(`Secure Gemini API error (${endpoint}):`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async generateTopicContent(
    topicName: string,
    description: string,
    documentUrls: string[],
    classLevel: string,
    subject: string
  ): Promise<{ success: boolean; aiContent?: AIContent; error?: string }> {
    
    const prompt = this.buildTopicPrompt(topicName, description, documentUrls, classLevel, subject);
    
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
        maxOutputTokens: 2048,
      }
    };

    const response = await this.makeSecureRequest('generate-content', payload);
    
    if (!response.success) {
      return { success: false, error: response.error };
    }

    try {
      const generatedText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!generatedText) {
        return { success: false, error: 'No content generated' };
      }

      const aiContent = this.parseGeneratedContent(generatedText, classLevel);
      return { success: true, aiContent };
      
    } catch (error) {
      return { 
        success: false, 
        error: 'Failed to parse generated content' 
      };
    }
  }

  async discoverDocuments(request: DocumentDiscoveryRequest): Promise<{
    success: boolean;
    suggestions?: Array<{ title: string; description: string; url: string; relevance: number }>;
    error?: string;
  }> {
    
    const prompt = this.buildDocumentDiscoveryPrompt(request);
    
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
        maxOutputTokens: 1024,
      }
    };

    const response = await this.makeSecureRequest('discover-documents', payload);
    
    if (!response.success) {
      return { success: false, error: response.error };
    }

    try {
      const generatedText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!generatedText) {
        return { success: false, error: 'No suggestions generated' };
      }

      const suggestions = this.parseDocumentSuggestions(generatedText);
      return { success: true, suggestions };
      
    } catch (error) {
      return { 
        success: false, 
        error: 'Failed to parse document suggestions' 
      };
    }
  }

  async enhanceSection(request: SectionEnhancementRequest): Promise<{
    success: boolean;
    enhancedContent?: string;
    error?: string;
  }> {
    
    const prompt = this.buildSectionEnhancementPrompt(request);
    
    const payload = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.6,
        topK: 30,
        topP: 0.9,
        maxOutputTokens: 1536,
      }
    };

    const response = await this.makeSecureRequest('enhance-section', payload);
    
    if (!response.success) {
      return { success: false, error: response.error };
    }

    try {
      const enhancedContent = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!enhancedContent) {
        return { success: false, error: 'No enhanced content generated' };
      }

      return { success: true, enhancedContent: enhancedContent.trim() };
      
    } catch (error) {
      return { 
        success: false, 
        error: 'Failed to parse enhanced content' 
      };
    }
  }

  // Private helper methods (same as original service)
  private buildTopicPrompt(topicName: string, description: string, documentUrls: string[], classLevel: string, subject: string): string {
    return `Create comprehensive educational content for a ${classLevel} ${subject} topic.

Topic: ${topicName}
Description: ${description}
Referenced Documents: ${documentUrls.length > 0 ? documentUrls.join(', ') : 'None provided'}

Please generate content in this exact JSON format:
{
  "summary": "A clear, engaging summary suitable for ${classLevel} students",
  "interactiveActivities": [
    {
      "title": "Activity name",
      "description": "What students will do",
      "instructions": "Step-by-step instructions",
      "materials": ["List of materials needed"],
      "duration": "Estimated time",
      "difficulty": "Easy/Medium/Hard"
    }
  ],
  "lessonPlan": {
    "objectives": ["Learning objective 1", "Learning objective 2"],
    "introduction": "How to introduce the topic",
    "mainContent": [
      {
        "section": "Section title",
        "content": "Detailed content for this section",
        "activities": ["Related activities"],
        "timeEstimate": "Duration"
      }
    ],
    "conclusion": "How to wrap up the lesson",
    "assessment": "How to assess student understanding",
    "homework": "Optional homework suggestions",
    "resources": ["Additional resources"]
  }
}

Make all content age-appropriate for ${classLevel} students and align with ${subject} curriculum standards.`;
  }

  private buildDocumentDiscoveryPrompt(request: DocumentDiscoveryRequest): string {
    return `Suggest educational documents and resources for ${request.classLevel} ${request.subject} students.

Topic/Query: ${request.prompt}
Current Documents: ${request.documentUrls.length > 0 ? request.documentUrls.join(', ') : 'None'}

Please suggest ${request.maxResults || 5} relevant educational resources in this JSON format:
[
  {
    "title": "Document title",
    "description": "Brief description of content and why it's useful",
    "url": "Suggested URL or resource type",
    "relevance": 0.95
  }
]

Focus on reputable educational sources, age-appropriate content, and curriculum alignment.`;
  }

  private buildSectionEnhancementPrompt(request: SectionEnhancementRequest): string {
    const durationText = request.duration ? ` (${request.duration} minutes)` : '';
    const topicContext = request.topicName ? `**Topic**: ${request.topicName}\n` : '';
    const sectionTypeContext = request.sectionType ? `**Section Type**: ${request.sectionType}\n` : '';
    
    return `Enhance the following lesson plan section with specific, ready-to-use teaching materials and activities:

**Section**: ${request.section}${durationText}
${topicContext}**Class Level**: ${request.classLevel}
${sectionTypeContext}
**Current Content**:
${request.content}

**CRITICAL INSTRUCTIONS**: 
- DO NOT provide general platform links or ask teachers to search
- DO NOT say "teachers will need to locate" or "find specific content"
- PROVIDE specific, actionable activities and materials
- Include ONLY content that is immediately usable in the classroom

**Enhancement Requirements**:

**1. YOUTUBE VIDEOS** (if appropriate - provide specific educational videos):
Find and include 1-2 specific YouTube videos that are:
- Directly related to ${request.topicName || 'the topic'} for ${request.classLevel}
- 3-10 minutes in length (appropriate for classroom use)
- From established educational channels like:
  * Crash Course Kids
  * National Geographic Kids
  * SciShow Kids
  * Khan Academy
  * TED-Ed
  * Bill Nye the Science Guy
  * Sesame Street (for younger students)
  * Brain Pump Videos
  * Free School

Format YouTube videos as: [Video Title](https://www.youtube.com/watch?v=VIDEO_ID)
Example: [Plants Need Water - Science for Kids](https://www.youtube.com/watch?v=dQw4w9WgXcQ)

**2. READY-TO-USE ACTIVITIES** (provide complete instructions):
- Specific activities with step-by-step teacher instructions
- Exact materials needed (all easily accessible)
- Clear timing for each activity
- Student worksheets or handouts (describe exactly what to create)

**3. CONCRETE TEACHING MATERIALS**:
- Physical manipulatives using common classroom items
- Printable resources (describe exactly what to print/create)
- Simple demonstration setups using available materials
- Visual aids that teachers can easily create or display

**4. CLASSROOM MANAGEMENT TIPS**:
- Specific questions to ask students
- How to organize students (pairs, groups, individual work)
- What to do if students finish early
- How to handle different learning paces

**5. ASSESSMENT METHODS**:
- Specific observation checklists
- Quick verbal assessment questions
- Simple exit ticket formats
- Peer assessment activities

**EXAMPLE OF GOOD ENHANCEMENT**:
Instead of: "Use Khan Academy videos about plants"
Provide: "Show students how to create a simple plant observation journal. Give each student a small potted plant or leaf. Have them draw the plant and write 3 observations using these sentence starters: 'I notice...', 'I wonder...', 'This reminds me of...'"

**FOCUS ON**:
- Activities using materials already in most classrooms
- Simple demonstrations teachers can set up in 2 minutes
- Student discussions and peer interactions
- Hands-on exploration using common objects
- Creative projects using basic art supplies

**OUTPUT REQUIREMENTS**:
- Be specific and detailed
- Provide complete activity instructions
- Use materials readily available in classrooms
- Make everything immediately actionable
- Age-appropriate for ${request.classLevel}
- Directly related to ${request.topicName || 'the lesson topic'}

Format with clear headings and bullet points for easy teacher reference.
Return only the enhanced content, not wrapped in JSON.`;
  }

  private parseGeneratedContent(generatedText: string, classLevel: string): AIContent {
    try {
      // Try to extract JSON from the response
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsedContent = JSON.parse(jsonMatch[0]);
        return {
          summary: parsedContent.summary || 'Summary not available',
          interactiveActivities: JSON.stringify(parsedContent.interactiveActivities || []),
          lessonPlan: JSON.stringify(parsedContent.lessonPlan || {}),
          generatedAt: new Date(),
          classLevel
        };
      }
    } catch (error) {
      console.warn('Failed to parse JSON from generated content:', error);
    }

    // Fallback: create basic structure from raw text
    return {
      summary: generatedText.substring(0, 500) + '...',
      interactiveActivities: JSON.stringify([]),
      lessonPlan: JSON.stringify({
        objectives: [],
        introduction: generatedText,
        mainContent: [],
        conclusion: '',
        assessment: '',
        homework: '',
        resources: []
      }),
      generatedAt: new Date(),
      classLevel
    };
  }

  private parseDocumentSuggestions(generatedText: string): Array<{ title: string; description: string; url: string; relevance: number }> {
    try {
      const jsonMatch = generatedText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.warn('Failed to parse document suggestions:', error);
    }

    return [];
  }
}

// Export singleton instance
export const secureGeminiService = new SecureGeminiService();
export default secureGeminiService;
