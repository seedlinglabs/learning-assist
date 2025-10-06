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
  private selectedModel: string = 'deepseek-chat';

  setModel(model: string) {
    this.selectedModel = model;
  }

  getModel(): string {
    return this.selectedModel;
  }

  getAvailableModels(): { id: string; name: string; provider: string }[] {
    return [
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'Google' },
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
      { id: 'deepseek-chat', name: 'DeepSeek Chat', provider: 'DeepSeek' },
      { id: 'deepseek-coder', name: 'DeepSeek Coder', provider: 'DeepSeek' }
    ];
  }

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

      // Add model to payload
      const payloadWithModel = {
        ...payload,
        model: this.selectedModel
      };

      const response = await fetch(`${GEMINI_PROXY_URL}/${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payloadWithModel),
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
        maxOutputTokens: 30000,
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
    
    try {
      // Step 1: Break down topic into main concepts
      const conceptsResult = await this.extractMainConcepts(topicName, description, classLevel, subject);
      if (!conceptsResult.success || !conceptsResult.concepts) {
        return { success: false, error: conceptsResult.error || 'Failed to extract main concepts' };
      }

      // Step 2: Generate teaching guidance for each concept
      const conceptGuidances: string[] = [];
      for (const concept of conceptsResult.concepts) {
        const guidanceResult = await this.generateConceptGuidance(
          concept, 
          topicName, 
          description, 
          classLevel, 
          subject
        );
        
        if (guidanceResult.success && guidanceResult.guidance) {
          conceptGuidances.push(guidanceResult.guidance);
        } else {
          // If ANY concept fails, fail the entire process
          return { 
            success: false, 
            error: `Failed to generate guidance for concept "${concept}": ${guidanceResult.error || 'Unknown error'}` 
          };
        }
      }

      // Ensure we have guidance for ALL concepts
      if (conceptGuidances.length !== conceptsResult.concepts.length) {
        return { 
          success: false, 
          error: `Incomplete guidance: expected ${conceptsResult.concepts.length} concepts, got ${conceptGuidances.length}` 
        };
      }

      // Step 3: Combine into complete teaching guide
      const completeGuide = this.combineConceptGuidances(
        topicName, 
        conceptsResult.concepts, 
        conceptGuidances, 
        classLevel, 
        subject
      );

      return { success: true, teachingGuide: completeGuide };
      
    } catch (error) {
      return { 
        success: false, 
        error: 'Failed to generate teaching guide: ' + (error instanceof Error ? error.message : 'Unknown error')
      };
    }
  }

  private async extractMainConcepts(
    topicName: string,
    description: string,
    classLevel: string,
    subject: string
  ): Promise<{ success: boolean; concepts?: string[]; error?: string }> {
    
    const prompt = `Break down "${topicName}" into 3-5 main concepts for ${classLevel} ${subject}.

Content: ${description}

Return numbered list only:
1. [concept]
2. [concept]
3. [concept]
4. [concept]
5. [concept]`;

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
        maxOutputTokens: 30000,
      }
    };

    const response = await this.makeSecureRequest('generate-content', payload);
    
    if (!response.success) {
      return { success: false, error: response.error };
    }

    try {
      const generatedText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!generatedText) {
        return { success: false, error: 'No concepts extracted' };
      }

      // Parse the numbered list to extract concepts
      const concepts = generatedText
        .split('\n')
        .filter((line: string) => line.trim().match(/^\d+\./))
        .map((line: string) => line.replace(/^\d+\.\s*/, '').trim())
        .filter((concept: string) => concept.length > 0);

      if (concepts.length === 0) {
        return { success: false, error: 'No valid concepts found in response' };
      }

      return { success: true, concepts };
      
    } catch (error) {
      return { 
        success: false, 
        error: 'Failed to parse concepts' 
      };
    }
  }

  private async generateConceptGuidance(
    concept: string,
    topicName: string,
    description: string,
    classLevel: string,
    subject: string
  ): Promise<{ success: boolean; guidance?: string; error?: string }> {
    
    const prompt = `You are an expert ${subject} teacher. Provide focused teaching guidance for this specific concept within the topic "${topicName}" for ${classLevel} students.

CONCEPT TO TEACH: ${concept}

CONTEXT: ${description}

Provide a concise teaching guide for this concept only. Include:

**Key Points to Explain:**
- [2-3 essential points about this concept]

**Teaching Approach:**
- [How to introduce this concept]
- [Simple explanation method]
- [Real-world connection or example]

**Student Activity:**
- [One specific activity for this concept]

**Check Understanding:**
- [1-2 quick questions to ask students]

**Common Mistakes:**
- [What students often get wrong about this concept]

Keep it focused and practical. This is just for the "${concept}" part of the lesson.`;

    const payload = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.9,
        maxOutputTokens: 30000,
      }
    };

    const response = await this.makeSecureRequest('generate-content', payload);
    
    if (!response.success) {
      return { success: false, error: response.error };
    }

    try {
      const generatedText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!generatedText) {
        return { success: false, error: 'No guidance generated for concept' };
      }
      return { success: true, guidance: generatedText };
      
    } catch (error) {
      return { 
        success: false, 
        error: 'Failed to parse concept guidance' 
      };
    }
  }

  private combineConceptGuidances(
    topicName: string,
    concepts: string[],
    guidances: string[],
    classLevel: string,
    subject: string
  ): string {
    
    const header = `# Teaching Guide: ${topicName}
**Class Level:** ${classLevel} ${subject}
**Main Concepts:** ${concepts.join(', ')}

---

## Overview
This teaching guide breaks down "${topicName}" into ${concepts.length} main concepts. Each concept includes focused teaching strategies, activities, and assessment methods.

---
`;

    const conceptSections = concepts.map((concept, index) => {
      const guidance = guidances[index] || 'Guidance not available for this concept.';
      return `## Concept ${index + 1}: ${concept}

${guidance}

---
`;
    }).join('\n');

    const footer = `
## Lesson Flow Summary
1. **Introduction (5 min):** Brief overview of all ${concepts.length} concepts
2. **Main Teaching (30 min):** Work through each concept using the guidance above
3. **Wrap-up (5 min):** Connect all concepts and assess understanding

## Additional Tips
- Adjust timing based on student understanding
- Use the "Check Understanding" questions throughout
- Be aware of the common mistakes listed for each concept
- Connect concepts to real-world applications when possible`;

    return header + conceptSections + footer;
  }

  async generateGroupDiscussion(
    topicName: string,
    description: string,
    documentUrls: string[],
    classLevel: string,
    subject: string
  ): Promise<{ success: boolean; groupDiscussion?: string; error?: string }> {
    
    const prompt = this.buildGroupDiscussionPrompt(topicName, description, documentUrls, classLevel, subject);
    
    const payload = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.9,
        maxOutputTokens: 30000,
      }
    };

    const response = await this.makeSecureRequest('generate-content', payload);
    
    if (!response.success) {
      return { success: false, error: response.error };
    }

    try {
      const generatedText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!generatedText) {
        return { success: false, error: 'No group discussion generated' };
      }
      return { success: true, groupDiscussion: generatedText };
      
    } catch (error) {
      return { 
        success: false, 
        error: 'Failed to parse generated group discussion' 
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
        maxOutputTokens: 30000,
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
          maxOutputTokens: 30000,
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
    const isPDFContent = description && description.length > 500;
    
    return `Create a simple 40-minute lesson plan for ${classLevel} ${subject}.

Topic: ${topicName}
${isPDFContent ? `Textbook Content: ${description}` : `Description: ${description || 'No description provided'}`}

FORMAT (Plain text only):

Learning Objectives:
- [3-4 clear learning goals]

Materials Needed:
- [Basic materials list]

40-Minute Class Structure:

Introduction (0-5 min):
- [What topic will be covered]

Segment 1 (5-15 min): [Sub-topic name]
- [Key concept to teach]
- [Simple activity]

Segment 2 (15-25 min): [Sub-topic name]  
- [Key concept to teach]
- [Simple activity]

Segment 3 (25-35 min): [Sub-topic name]
- [Key concept to teach] 
- [Simple activity]

Wrap-up (35-40 min):
- [Summary points]
- [Quick assessment]

REQUIREMENTS:
- Keep it simple and structured
- Focus on timing and key concepts only
- Age-appropriate for ${classLevel}${isPDFContent ? `
- Use content from the provided textbook material` : ''}`;
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

TEACHING GUIDE STRUCTURE (PRESCRIPTIVE PLAN, PLAIN TEXT – NO JSON/CODE BLOCKS):

**CLASSROOM SETUP (2 minutes)**
- Opening hook to grab attention (1–2 options)
- Quick prior knowledge probe

**LESSON DELIVERY (35 minutes)**
- Main topics to cover (3–5 bullets)
- Suggested videos (2–4 high-quality links with brief rationale)
- Group discussion prompts (2–3, with expected student angles)
- Engagement strategies (think-pair-share, cold/warm calls, mini-whiteboards, etc.)
- Teacher script cues (brief, for transitions and emphasis)
- When to check for understanding and what to ask
- How to use textbook/board/materials

**STUDENT INTERACTION (Throughout)**
- How to encourage participation and manage different learning styles
- Redirecting attention and handling disruptions (concise tips)

**CLOSING (3 minutes)**
- Summary of key points
- Optional homework/extension
- Preview of next lesson

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

  private buildGroupDiscussionPrompt(topicName: string, description: string, documentUrls: string[], classLevel: string, subject: string): string {
    // Check if description contains PDF content (longer than typical descriptions)
    const isPDFContent = description && description.length > 500;
    
    const basePrompt = `You are an expert teacher creating group discussion activities for a ${classLevel} ${subject} lesson on "${topicName}".

Topic: ${topicName}
Referenced Documents: ${documentUrls.length > 0 ? documentUrls.join(', ') : 'None provided'}`;

    const descriptionSection = isPDFContent 
      ? `TEXTBOOK CONTENT (Use this as your primary reference):
${description}

IMPORTANT: Base your discussion ideas on the specific content provided above. Reference specific sections, examples, and information from this textbook content.`
      : `Description: ${description || 'No description provided'}`;

    return `${basePrompt}
${descriptionSection}

GROUP DISCUSSION OBJECTIVES:
Create engaging group discussion activities that help students:
- Deepen their understanding of the topic
- Connect concepts to real-world applications
- Develop critical thinking skills
- Practice communication and collaboration
- Build confidence in expressing ideas

DISCUSSION ACTIVITY STRUCTURE:

**QUICK GROUP DISCUSSIONS (8-10 minutes total)**
- 3-4 students per group
- Focused, time-limited discussion questions
- Rapid sharing and synthesis
- Quick reflection and application

DISCUSSION ACTIVITY TYPES TO INCLUDE:

1. **Case Study Discussions**
   - Real-world scenarios related to the topic
   - Problem-solving situations
   - Ethical dilemmas or decision-making

2. **Concept Mapping**
   - Visual representation of relationships
   - Collaborative mind mapping
   - Connection to prior knowledge

3. **Debate and Perspective Taking**
   - Multiple viewpoints on the topic
   - Structured arguments with evidence
   - Respectful disagreement practice

4. **Application Scenarios**
   - How concepts apply in different contexts
   - Personal relevance and connections
   - Future implications and predictions

5. **Question Generation**
   - Students create their own questions
   - Peer-to-peer questioning
   - Deep thinking prompts

DISCUSSION FACILITATION GUIDELINES:

**For Teachers:**
- Provide clear instructions and expectations
- Monitor group dynamics and participation
- Ask probing questions to deepen thinking
- Ensure all voices are heard
- Connect discussions to learning objectives

**For Students:**
- Listen actively to peers
- Build on others' ideas
- Ask clarifying questions
- Support opinions with evidence
- Respect different perspectives

${isPDFContent ? `
TEXTBOOK INTEGRATION:
- Reference specific pages, sections, or examples from the provided textbook
- Use actual content, data, and examples from the textbook
- Connect discussion questions to textbook material
- Encourage students to cite textbook information in discussions` : ''}

AGE-APPROPRIATE CONSIDERATIONS FOR ${classLevel}:
- Quick, focused activities (8-10 minutes max)
- Clear, simple language and instructions
- Visual aids and concrete examples
- Structured formats to support rapid participation
- Positive reinforcement and encouragement
- Fast-paced to maintain engagement

Create 2-3 quick group discussion activities (8-10 minutes each) with:
- Clear, focused objectives
- Simple, time-efficient instructions
- 2-3 key discussion questions maximum
- Quick sharing and synthesis
- Brief reflection or application

Make these activities fast-paced, engaging, and suitable for ${classLevel} students learning about "${topicName}". Focus on quick thinking and rapid knowledge sharing.`;
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
    // Store raw plain text lesson plan as-is (no JSON transformation)
    return {
      lessonPlan: generatedText,
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

  /**
   * Generate assessment questions for a topic
   */
  async generateAssessmentQuestions(
    topicName: string,
    description: string,
    documentUrls: string[],
    classLevel: string,
    subject: string
  ): Promise<{ success: boolean; assessmentQuestions?: string; error?: string }> {
    try {
      const prompt = `Generate comprehensive assessment questions for the topic "${topicName}" for ${classLevel} students studying ${subject}.

Topic Description: ${description}

Please create a structured assessment with the following components:

1. **Multiple Choice Questions (MCQs)** - 5 questions with 4 options each
2. **Short Answer Questions** - 3 questions requiring 2-3 sentence answers
3. **Long Answer Questions** - 2 questions requiring detailed explanations
4. **Check for Understanding (CFU) Questions** - 5 questions that parents can use to engage their children at home

Format the response as structured JSON with clear sections. Make questions age-appropriate and aligned with the topic content.

${documentUrls.length > 0 ? `Reference these documents: ${documentUrls.join(', ')}` : ''}

Return only valid JSON in this format:
{
  "mcqs": [
    {
      "question": "Question text",
      "options": ["A", "B", "C", "D"],
      "correct": "A",
      "explanation": "Why this is correct"
    }
  ],
  "shortAnswers": [
    {
      "question": "Question text",
      "sampleAnswer": "Expected answer"
    }
  ],
  "longAnswers": [
    {
      "question": "Question text",
      "sampleAnswer": "Detailed expected answer"
    }
  ],
  "cfuQuestions": [
    {
      "question": "Question text",
      "parentGuidance": "How parents can help"
    }
  ]
}`;

      const payload = {
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.9,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 30000,
        }
      };

      const response = await this.makeSecureRequest('generate-content', payload);
      
      if (response.success && response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        const content = response.data.candidates[0].content.parts[0].text;
        
        // Try to extract JSON from the response (handle markdown code blocks)
        let jsonText = content;
        
        // Remove markdown code blocks if present
        if (content.includes('```json')) {
          const codeBlockMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
          if (codeBlockMatch) {
            jsonText = codeBlockMatch[1];
          }
        } else {
          // Try to find JSON object directly
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            jsonText = jsonMatch[0];
          }
        }
        
        if (jsonText) {
          try {
            const assessmentData = JSON.parse(jsonText);
            const formattedQuestions = this.formatAssessmentQuestions(assessmentData);
            
            return {
              success: true,
              assessmentQuestions: formattedQuestions
            };
          } catch (parseError) {
            console.error('Failed to parse assessment questions JSON:', parseError);
            console.error('JSON text:', jsonText);
            return {
              success: false,
              error: 'Failed to parse assessment questions response'
            };
          }
        }
      }
      
      return {
        success: false,
        error: 'Failed to generate assessment questions'
      };
    } catch (error) {
      console.error('Error generating assessment questions:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Generate worksheets for a topic using NCERT-style content
   */
  async generateWorksheets(
    topicName: string,
    description: string,
    documentUrls: string[],
    classLevel: string,
    subject: string
  ): Promise<{ success: boolean; worksheets?: string; error?: string }> {
    try {
      const prompt = `Generate creative and engaging worksheets for the topic "${topicName}" for ${classLevel} students studying ${subject}.

Topic Description: ${description}

Create innovative worksheets inspired by NCERT's approach (referencing [https://ncert.nic.in/cncl/worksheet.php](https://ncert.nic.in/cncl/worksheet.php)) with the following creative structure:

1. **Worksheet 1: Creative Foundation** - Fun, imaginative activities that build basic concepts through storytelling, games, and interactive elements
2. **Worksheet 2: Real-World Adventures** - Problem-solving scenarios, case studies, and hands-on applications that connect learning to everyday life
3. **Worksheet 3: Innovation Lab** - Creative challenges, design thinking activities, and open-ended projects that encourage critical thinking

Each worksheet should be CREATIVE and include:
- Engaging storylines, characters, or scenarios that make learning fun
- Interactive elements like puzzles, games, role-playing, or creative writing
- Real-world connections and practical applications
- Visual storytelling elements and creative formatting
- Varied question types (story-based problems, creative challenges, design tasks, etc.)
- Age-appropriate but imaginative activities that spark curiosity
- Creative answer keys with explanations and extension ideas
- Fun parent engagement activities that turn learning into play

BE CREATIVE: Use storytelling, gamification, real-world scenarios, and imaginative elements. Make students excited to learn!

Format the response as structured JSON. Make content highly engaging, creative, educational, and suitable for both classroom and homework use.

${documentUrls.length > 0 ? `Reference these documents: ${documentUrls.join(', ')}` : ''}

Return only valid JSON in this format:
{
  "worksheets": [
    {
      "title": "Worksheet 1: Creative Foundation",
      "instructions": "Engaging, story-based instructions that capture student interest",
      "activities": [
        {
          "type": "creative storytelling",
          "question": "Imaginative question with creative elements and real-world connections",
          "answer": "Expected answer with creative explanations"
        }
      ],
      "answerKey": "Creative answers with teaching tips and extension ideas",
      "parentTips": "Fun ways parents can engage with creative learning at home"
    }
  ]
}`;

      const payload = {
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.9,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 30000,
        }
      };

      const response = await this.makeSecureRequest('generate-content', payload);
      
      if (response.success && response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        const content = response.data.candidates[0].content.parts[0].text;
        
        // Try to extract JSON from the response (handle markdown code blocks)
        let jsonText = content;
        
        // Remove markdown code blocks if present
        if (content.includes('```json')) {
          const codeBlockMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
          if (codeBlockMatch) {
            jsonText = codeBlockMatch[1];
          }
        } else {
          // Try to find JSON object directly
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            jsonText = jsonMatch[0];
          }
        }
        
        if (jsonText) {
          try {
            const worksheetData = JSON.parse(jsonText);
            const formattedWorksheets = this.formatWorksheets(worksheetData);
            
            return {
              success: true,
              worksheets: formattedWorksheets
            };
          } catch (parseError) {
            console.error('Failed to parse worksheets JSON:', parseError);
            console.error('JSON text:', jsonText);
            return {
              success: false,
              error: 'Failed to parse worksheets response'
            };
          }
        }
      }
      
      return {
        success: false,
        error: 'Failed to generate worksheets'
      };
    } catch (error) {
      console.error('Error generating worksheets:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Format assessment questions into readable text
   */
  private formatAssessmentQuestions(data: any): string {
    let formatted = '# Assessment Questions\n\n';
    
    if (data.mcqs && data.mcqs.length > 0) {
      formatted += '## Multiple Choice Questions\n\n';
      data.mcqs.forEach((mcq: any, index: number) => {
        formatted += `**Q${index + 1}:** ${mcq.question}\n`;
        mcq.options.forEach((option: string, optIndex: number) => {
          formatted += `${String.fromCharCode(65 + optIndex)}. ${option}\n`;
        });
        formatted += `**Answer:** ${mcq.correct}\n`;
        formatted += `**Explanation:** ${mcq.explanation}\n\n`;
      });
    }
    
    if (data.shortAnswers && data.shortAnswers.length > 0) {
      formatted += '## Short Answer Questions\n\n';
      data.shortAnswers.forEach((q: any, index: number) => {
        formatted += `**Q${index + 1}:** ${q.question}\n`;
        formatted += `**Sample Answer:** ${q.sampleAnswer}\n\n`;
      });
    }
    
    if (data.longAnswers && data.longAnswers.length > 0) {
      formatted += '## Long Answer Questions\n\n';
      data.longAnswers.forEach((q: any, index: number) => {
        formatted += `**Q${index + 1}:** ${q.question}\n`;
        formatted += `**Sample Answer:** ${q.sampleAnswer}\n\n`;
      });
    }
    
    if (data.cfuQuestions && data.cfuQuestions.length > 0) {
      formatted += '## Check for Understanding (CFU) Questions\n';
      formatted += '*These questions can be shared with parents to engage their children at home*\n\n';
      data.cfuQuestions.forEach((q: any, index: number) => {
        formatted += `**Q${index + 1}:** ${q.question}\n`;
        formatted += `**Parent Guidance:** ${q.parentGuidance}\n\n`;
      });
    }
    
    return formatted;
  }

  /**
   * Format worksheets into readable text
   */
  private formatWorksheets(data: any): string {
    let formatted = '# Creative Worksheets\n\n';
    formatted += '*Innovative, engaging activities inspired by NCERT methodology*\n\n';
    
    if (data.worksheets && data.worksheets.length > 0) {
      data.worksheets.forEach((worksheet: any, index: number) => {
        formatted += `## ${worksheet.title}\n\n`;
        formatted += `**Instructions:** ${worksheet.instructions}\n\n`;
        
        if (worksheet.activities && worksheet.activities.length > 0) {
          formatted += '### Activities\n\n';
          worksheet.activities.forEach((activity: any, actIndex: number) => {
            formatted += `**Activity ${actIndex + 1}:** ${activity.type}\n`;
            formatted += `${activity.question}\n`;
            if (activity.answer) {
              formatted += `*Answer: ${activity.answer}*\n\n`;
            }
          });
        }
        
        if (worksheet.answerKey) {
          formatted += `### Answer Key\n${worksheet.answerKey}\n\n`;
        }
        
        if (worksheet.parentTips) {
          formatted += `### Parent Tips\n${worksheet.parentTips}\n\n`;
        }
        
        formatted += '---\n\n';
      });
    }
    
    return formatted;
  }
}

// Export singleton instance
export const secureGeminiService = new SecureGeminiService();
export default secureGeminiService;