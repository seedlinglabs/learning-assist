/**
 * Secure Gemini Service - Uses backend proxy instead of direct API calls
 * This eliminates the need for REACT_APP_GEMINI_API_KEY in the frontend
 */

import { AIContent } from '../types';
import { youtubeService, YouTubeVideo } from './youtubeService';

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
  subject?: string;
  sectionType?: string;
  duration?: number;
}

export interface GeminiResponse {
  success: boolean;
  data?: any;
  error?: string;
  details?: string;
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
        
        // Handle API key errors specifically
        if (response.status === 400 && errorData.error?.message?.includes('API key not valid')) {
          return {
            success: false,
            error: 'AI service is temporarily unavailable. Please contact support or try again later.',
            details: 'The AI service requires configuration. This is a development environment issue.'
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
      console.error(`DEBUG makeSecureRequest: Error details:`, error);
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

  async generateTeachingGuide(
    topicName: string,
    description: string,
    documentUrls: string[],
    classLevel: string,
    subject: string
  ): Promise<{ success: boolean; teachingGuide?: string; error?: string }> {
    
    
    const prompt = this.buildTeachingGuidePrompt(topicName, description, documentUrls, classLevel, subject);
    
    const payload = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.8,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 4096,
      }
    };

    const response = await this.makeSecureRequest('generate-content', payload);
    
    if (!response.success) {
      return { success: false, error: response.error };
    }

    try {
      const generatedText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!generatedText) {
        return { success: false, error: 'No teaching guide generated' };
      }
      return { success: true, teachingGuide: generatedText };
      
    } catch (error) {
      return { 
        success: false, 
        error: 'Failed to parse generated teaching guide' 
      };
    }
  }

  // Image generation is now handled by imageSearchService
  // This method is kept for backward compatibility but not used

  private extractSourceFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      
      if (hostname.includes('unsplash.com')) return 'Unsplash';
      if (hostname.includes('pexels.com')) return 'Pexels';
      if (hostname.includes('pixabay.com')) return 'Pixabay';
      if (hostname.includes('freepik.com')) return 'Freepik';
      if (hostname.includes('shutterstock.com')) return 'Shutterstock';
      if (hostname.includes('gettyimages.com')) return 'Getty Images';
      if (hostname.includes('wikipedia.org')) return 'Wikipedia';
      if (hostname.includes('commons.wikimedia.org')) return 'Wikimedia Commons';
      
      return hostname.replace('www.', '');
    } catch {
      return 'Unknown Source';
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
    try {
      // First, search for real YouTube videos
      const videoResults = await youtubeService.searchTopicVideos(
        request.topicName || 'this topic',
        request.classLevel,
        request.subject
      );

      // Build enhanced content with real videos
      const enhancedContent = this.buildEnhancedContentWithVideos(request, videoResults.videos);
      
      return { success: true, enhancedContent };
    } catch (error) {
      console.error('Error enhancing section with YouTube search:', error);
      // Fallback to Gemini if YouTube search fails
      return this.fallbackEnhancement(request);
    }
  }

  private buildEnhancedContentWithVideos(request: SectionEnhancementRequest, videos: YouTubeVideo[]): string {
    // Only add additional resources and teaching activities, not videos
    // since video buttons are shown at the top of the section
    let additionalContent = `\n\n**📚 ADDITIONAL RESOURCES:**\n\n`;
    
    if (videos.length > 0) {
      additionalContent += `**Educational Videos Available:**\n`;
      videos.forEach((video, index) => {
        additionalContent += `- ${video.title} (${video.duration}) - ${video.channelTitle}\n`;
      });
      additionalContent += `\n`;
    } else {
      additionalContent += `**Search YouTube for:** "${request.topicName}" educational videos for ${request.classLevel} students\n`;
      additionalContent += `**Suggested search terms:**\n`;
      additionalContent += `- "${request.topicName} for kids"\n`;
      additionalContent += `- "${request.topicName} ${request.classLevel} lesson"\n`;
      additionalContent += `- "${request.topicName} educational video"\n\n`;
    }

    // Add teaching activities section
    additionalContent += `**🎯 TEACHING ACTIVITIES:**\n\n`;
    additionalContent += `- Use the video buttons above to access educational content\n`;
    additionalContent += `- Pause videos at key moments for discussion\n`;
    additionalContent += `- Have students take notes on important concepts\n`;
    additionalContent += `- Follow up with hands-on activities related to the videos\n\n`;

    // Append additional content to existing content
    return request.content + additionalContent;
  }

  private async fallbackEnhancement(request: SectionEnhancementRequest): Promise<{
    success: boolean;
    enhancedContent?: string;
    error?: string;
  }> {
    try {
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

      const enhancedContent = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!enhancedContent) {
        return { success: false, error: 'No enhanced content generated' };
      }

      // Only add additional resources and teaching activities, not videos
      // since video buttons are shown at the top of the section
      const additionalContent = `\n\n**📚 ADDITIONAL RESOURCES:**\n\nSearch YouTube for "${request.topicName}" educational videos for ${request.classLevel} students\n\n**Suggested search terms:**\n- "${request.topicName} for kids"\n- "${request.topicName} ${request.classLevel} lesson"\n- "${request.topicName} educational video"\n\n**🎯 TEACHING ACTIVITIES:**\n\n- Use the video buttons above to access educational content\n- Pause videos at key moments for discussion\n- Have students take notes on important concepts\n- Follow up with hands-on activities related to the videos\n\n`;
      
      return { success: true, enhancedContent: request.content + additionalContent };
      
    } catch (error) {
      return { 
        success: false, 
        error: 'Failed to parse enhanced content' 
      };
    }
  }

  // Private helper methods (same as original service)
  private buildTopicPrompt(topicName: string, description: string, documentUrls: string[], classLevel: string, subject: string): string {
    // Check if description contains PDF content (longer than typical descriptions)
    const isPDFContent = description && description.length > 500;
    
    const basePrompt = `Create a comprehensive lesson plan for a ${classLevel} ${subject} topic.

Topic: ${topicName}
Referenced Documents: ${documentUrls.length > 0 ? documentUrls.join(', ') : 'None provided'}`;

    const descriptionSection = isPDFContent 
      ? `TEXTBOOK CONTENT (Use this as your primary reference):
${description}

IMPORTANT: Base your entire lesson plan on the specific content provided above. Reference specific sections, examples, and information from this textbook content. Use the actual content, data, and examples from the textbook in your lesson plan.`
      : `Description: ${description || 'No description provided'}`;

    return `${basePrompt}
${descriptionSection}

Please generate a detailed 40-minute lesson plan in this exact JSON format:
{
  "lessonPlan": {
    "objectives": ["Learning objective 1", "Learning objective 2"],
    "materials": ["List of materials needed"],
    "introduction": "How to introduce the topic (5 minutes)",
    "mainContent": [
      {
        "section": "Section title",
        "content": "Detailed content for this section",
        "activities": ["Related activities"],
        "timeEstimate": "Duration"
      }
    ],
    "wrapUp": "How to wrap up the lesson (2 minutes)",
    "assessment": "How to assess student understanding",
    "homework": "Optional homework suggestions",
    "resources": ["Additional resources with specific URLs"]
  }
}

Requirements:
- Age-appropriate for ${classLevel} students
- Clear instructions for teachers
- Include timing for each lesson segment
- Include specific educational resource URLs where applicable
- Align with ${subject} curriculum standards${isPDFContent ? `
- Use specific content, examples, and data from the provided textbook material
- Reference specific sections or pages when applicable
- Base all activities and explanations on the textbook content
- Show students exactly where to find information in their textbook` : ''}

Make all content immediately usable in the classroom.`;
  }

  private buildTeachingGuidePrompt(topicName: string, description: string, documentUrls: string[], classLevel: string, subject: string): string {
    // Check if description contains PDF content (longer than typical descriptions)
    const isPDFContent = description && description.length > 500;
    
    const basePrompt = `You are an expert teacher delivering a ${classLevel} ${subject} lesson on "${topicName}".

Topic: ${topicName}
Referenced Documents: ${documentUrls.length > 0 ? documentUrls.join(', ') : 'None provided'}`;

    const descriptionSection = isPDFContent 
      ? `TEXTBOOK CONTENT (Use this as your primary reference):
${description}

IMPORTANT: Base your entire teaching approach on the specific content provided above. Reference specific sections, examples, and information from this textbook content. Use the actual content, data, and examples from the textbook in your teaching.`
      : `Description: ${description || 'No description provided'}`;

    return `${basePrompt}
${descriptionSection}

TEACHING SCENARIO:
Imagine you are the actual teacher in the classroom right now. The students are sitting in front of you, and you need to teach this topic in a 40-minute class period. You must:

1. **BE THE TEACHER** - Act as if you are personally delivering this lesson
2. **ENGAGE STUDENTS** - Use your voice, gestures, and teaching presence
3. **TEACH CONVERSATIONALLY** - Write as if you are speaking directly to students
4. **USE CLASSROOM MANAGEMENT** - Handle questions, maintain attention, manage time
5. **ADAPT IN REAL-TIME** - Respond to student reactions and adjust your teaching

TEACHING GUIDE STRUCTURE:

**CLASSROOM SETUP (2 minutes)**
- How you greet students and set the tone
- What you write on the board
- How you organize materials
- Your opening attention-grabbing statement

**LESSON DELIVERY (35 minutes)**
- Your exact words and explanations
- When you pause for questions
- How you use the textbook/whiteboard
- Specific examples you give
- Questions you ask students
- How you handle student responses
- When you check for understanding
- How you manage time and transitions

**STUDENT INTERACTION (Throughout)**
- How you encourage participation
- How you handle different learning styles
- How you manage disruptive behavior
- How you keep everyone engaged

**CLOSING (3 minutes)**
- How you summarize key points
- How you assign homework
- How you preview the next lesson
- Your closing statement

TEACHING STYLE REQUIREMENTS:
- Use "I" statements (e.g., "I'm going to show you...", "Let me explain...")
- Include specific dialogue and conversations
- Show your teaching personality and enthusiasm
- Demonstrate classroom management techniques
- Use age-appropriate language for ${classLevel} students
- Include specific examples and demonstrations
- Show how you adapt to different student needs

${isPDFContent ? `
TEXTBOOK INTEGRATION:
- Reference specific pages, sections, or examples from the provided textbook
- Use actual content, data, and examples from the textbook
- Show students exactly where to find information
- Base all explanations on the textbook material
- Use textbook diagrams, charts, or illustrations in your teaching` : ''}

Write this as a complete teaching script that shows exactly how you would deliver this lesson if you were the teacher in the classroom right now.`;
  }

  // Image discovery prompt removed - now using imageSearchService

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
    
    return `You are an expert educational content curator. Enhance this lesson plan section with SPECIFIC, FREELY AVAILABLE teaching resources, focusing heavily on YouTube videos.

**Section**: ${request.section}${durationText}
${topicContext}**Class Level**: ${request.classLevel}
${sectionTypeContext}
**Current Content**:
${request.content}

**PRIMARY FOCUS: FIND SPECIFIC YOUTUBE VIDEOS**

**1. YOUTUBE VIDEO RESEARCH (MANDATORY - Find maximum 2 specific videos):**
Search for and provide EXACT YouTube videos that are:
- Directly related to "${request.topicName || 'this topic'}" for ${request.classLevel} students
- 3-15 minutes long (perfect for classroom use)
- From these trusted educational channels:
  * Crash Course Kids (science, social studies)
  * National Geographic Kids (nature, animals, geography)
  * SciShow Kids (science experiments, nature)
  * Khan Academy (math, science, history)
  * TED-Ed (educational animations)
  * Bill Nye the Science Guy (science demonstrations)
  * Sesame Street (for younger students)
  * Brain Pump Videos (science, math)
  * Free School (history, science, literature)
  * Peekaboo Kidz (science, geography)
  * Happy Learning (science, history)
  * Smile and Learn (educational content)
  * Learning Junction (science, social studies)

**VIDEO FORMAT REQUIREMENTS:**
- Format: [Exact Video Title](https://www.youtube.com/watch?v=ACTUAL_VIDEO_ID)
- Include video duration in title: [Video Title (5:30)](https://www.youtube.com/watch?v=VIDEO_ID)
- Example: [Water Cycle for Kids (4:15)](https://www.youtube.com/watch?v=9_e7q-5Qw04)

**2. ADDITIONAL FREE RESOURCES:**
- Interactive websites (PBS Kids, NASA Kids, etc.)
- Free printable worksheets (describe exactly what to create)
- Simple hands-on activities using common classroom materials
- Free educational games or simulations

**3. SPECIFIC TEACHING AIDS:**
- Exact materials needed (all easily accessible)
- Step-by-step activity instructions
- Classroom management tips for this specific content
- Assessment questions related to the videos

**CRITICAL REQUIREMENTS:**
- PROVIDE ACTUAL WORKING YOUTUBE LINKS - do not make them up
- Focus on videos that directly support the learning objectives
- Include videos that show experiments, demonstrations, or real-world examples
- Make sure videos are age-appropriate for ${request.classLevel}
- Provide specific timestamps for key moments in longer videos

**OUTPUT FORMAT:**
Start with "**🎥 RECOMMENDED VIDEOS:**" followed by the video links
Then add "**📚 ADDITIONAL RESOURCES:**" with other materials
Then "**🎯 TEACHING ACTIVITIES:**" with specific classroom activities

**EXAMPLE OF GOOD OUTPUT:**
**🎥 RECOMMENDED VIDEOS:**
- [The Water Cycle for Kids (3:45)](https://www.youtube.com/watch?v=9_e7q-5Qw04) - Perfect introduction to water cycle concepts
- [Water Cycle Experiment (6:20)](https://www.youtube.com/watch?v=ZVBEBreXH4w) - Shows hands-on demonstration students can replicate

**IMPORTANT: Provide exactly 2 videos maximum per section. Choose the most relevant and highest quality videos.**

**📚 ADDITIONAL RESOURCES:**
- NASA Climate Kids Water Cycle Game (free online)
- Printable water cycle diagram worksheet

**🎯 TEACHING ACTIVITIES:**
- Watch first video, pause at 1:30 to discuss evaporation
- Have students create their own water cycle diagrams
- Set up simple evaporation experiment using cups and water

Return only the enhanced content with specific, working links.`;
  }

  private parseGeneratedContent(generatedText: string, classLevel: string): AIContent {
    try {
      // Try to extract JSON from the response
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsedContent = JSON.parse(jsonMatch[0]);
        return {
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
      lessonPlan: JSON.stringify({
        objectives: [],
        materials: [],
        introduction: generatedText,
        mainContent: [],
        wrapUp: '',
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
