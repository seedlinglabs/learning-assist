import { DocumentLink, AIContent } from '../types';

// You'll need to set your Gemini API key as an environment variable
const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

export interface AIContentRequest {
  documentLinks: DocumentLink[];
  topicName: string;
  description?: string;
  classLevel: string; // e.g., "Class 6", "Grade 10"
}

export interface AIContentResponse {
  aiContent: AIContent;
  success: boolean;
  error?: string;
}

// Legacy interfaces for backward compatibility - DEPRECATED
export interface SummaryRequest {
  documentLinks: DocumentLink[];
  topicName: string;
}

export interface SummaryResponse {
  summary: string;
  success: boolean;
  error?: string;
}

export interface InteractiveContentRequest {
  topicName: string;
  summary: string;
  documentLinks?: DocumentLink[];
  description?: string;
}

export interface InteractiveContentResponse {
  interactiveContent: string;
  success: boolean;
  error?: string;
}

export type ContentType = 'video' | 'audio' | 'interactive' | 'games' | 'articles' | 'simulations' | 'worksheets' | 'presentations' | 'books' | 'research';

export interface SectionEnhancementRequest {
  sectionTitle: string;
  sectionContent: string;
  sectionType: string; // e.g., 'introduction', 'activities', 'assessment'
  topicName: string;
  classLevel: string;
  duration?: number;
}

export interface SectionEnhancementResponse {
  enhancedContent: string;
  success: boolean;
  error?: string;
}

export interface DocumentDiscoveryRequest {
  topicName: string;
  description?: string;
  classLevel: string;
  existingDocuments?: DocumentLink[]; // Context from already added documents
  customPrompt?: string; // Optional custom search prompt
  contentTypes?: ContentType[]; // Preferred content types
}

export interface DocumentDiscoveryResponse {
  suggestedDocuments: DocumentLink[];
  success: boolean;
  error?: string;
}

export class GeminiService {
  static async discoverDocuments(request: DocumentDiscoveryRequest): Promise<DocumentDiscoveryResponse> {
    if (!GEMINI_API_KEY) {
      return {
        suggestedDocuments: [],
        success: false,
        error: 'Gemini API key not configured. Please set REACT_APP_GEMINI_API_KEY environment variable.'
      };
    }

    try {
      let context = `Topic: ${request.topicName}\n`;
      context += `Class Level: ${request.classLevel}\n`;
      
      if (request.description) {
        context += `Description: ${request.description}\n`;
      }
      
      if (request.existingDocuments && request.existingDocuments.length > 0) {
        context += `\nExisting documents already selected:\n`;
        request.existingDocuments.forEach((doc, index) => {
          context += `${index + 1}. ${doc.name}: ${doc.url}\n`;
        });
        context += '\nPlease suggest similar or complementary educational resources.\n';
      }

      // Build content type preferences
      let contentTypeText = '';
      if (request.contentTypes && request.contentTypes.length > 0) {
        const contentTypeMap = {
          'video': 'educational videos and video tutorials',
          'audio': 'podcasts, audio lessons, and audio content',
          'interactive': 'interactive websites and tools',
          'games': 'educational games and gamified learning',
          'articles': 'articles, blog posts, and written content',
          'simulations': 'virtual labs and simulations',
          'worksheets': 'downloadable worksheets and activities',
          'presentations': 'slideshows and presentation materials',
          'books': 'e-books and digital textbooks',
          'research': 'research papers and academic content'
        };
        
        const preferredTypes = request.contentTypes.map(type => contentTypeMap[type]).join(', ');
        contentTypeText = `\n\nPREFERRED CONTENT TYPES: Focus on finding ${preferredTypes}. Prioritize these types of educational resources.`;
      }

      // Add custom prompt if provided
      let customPromptText = '';
      if (request.customPrompt && request.customPrompt.trim()) {
        customPromptText = `\n\nADDITIONAL SEARCH GUIDANCE: ${request.customPrompt.trim()}`;
      }

      const prompt = `Based on the following educational topic, suggest 3 specific, well-known educational resources from established platforms:

${context}${contentTypeText}${customPromptText}

**PROVIDE PRACTICAL CLASSROOM RESOURCES:**

Instead of generic platform links, suggest specific activities and materials that teachers can implement immediately using common classroom resources.

**Requirements:**
1. Focus on activities using materials already available in most classrooms
2. Provide step-by-step instructions for hands-on activities
3. Include simple demonstration ideas using everyday objects
4. Suggest printable resources teachers can create easily
5. Make everything age-appropriate for ${request.classLevel}
6. Directly related to ${request.topicName}

**If suggesting digital resources, use these well-known educational sites:**
- Khan Academy Kids (free app with offline content)
- YouTube educational channels with specific video titles
- PBS Kids educational games
- Starfall (reading and phonics)
- ABCmouse (if available in school)

Format your response EXACTLY like this:
DOCUMENT 1
Name: [Specific Activity or Resource Name]
URL: [Specific URL if digital, or "Classroom Activity" if hands-on]
Reason: [Why this is perfect for ${request.classLevel} learning about ${request.topicName}]

DOCUMENT 2
Name: [Specific Hands-on Activity]
URL: Classroom Activity
Reason: [How this engages students and reinforces learning]

DOCUMENT 3
Name: [Specific Digital Resource with exact title]
URL: [Actual working URL to specific content]
Reason: [Educational value and age-appropriateness]

**FOCUS ON**: Ready-to-implement activities, not platform browsing.`;

      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.8,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
            candidateCount: 1,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
          ]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Gemini API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.candidates || data.candidates.length === 0) {
        throw new Error('No document suggestions generated by Gemini');
      }

      const fullResponse = data.candidates[0].content.parts[0].text.trim();
      
      // Parse the response to extract documents
      const suggestedDocuments: DocumentLink[] = [];
      const documentBlocks = fullResponse.split(/DOCUMENT \d+/);
      
      for (let i = 1; i < documentBlocks.length; i++) {
        const block = documentBlocks[i].trim();
        const nameMatch = block.match(/Name:\s*(.+)/);
        const urlMatch = block.match(/URL:\s*(.+)/);
        
        if (nameMatch && urlMatch) {
          const name = nameMatch[1].trim();
          const url = urlMatch[1].trim();
          
          // Basic URL validation
          try {
            new URL(url);
            suggestedDocuments.push({ name, url });
          } catch (e) {
            console.warn('Invalid URL suggested by AI:', url);
          }
        }
      }

      // Fallback parsing if the structured format fails
      if (suggestedDocuments.length === 0) {
        // Try to extract any URLs and create basic names
        const urlMatches = fullResponse.match(/https?:\/\/[^\s]+/g);
        if (urlMatches) {
          urlMatches.slice(0, 3).forEach((url: string, index: number) => {
            try {
              new URL(url);
              suggestedDocuments.push({
                name: `Educational Resource ${index + 1}`,
                url: url
              });
            } catch (e) {
              // Skip invalid URLs
            }
          });
        }
      }

      return {
        suggestedDocuments,
        success: true
      };

    } catch (error) {
      console.error('Error discovering documents:', error);
      return {
        suggestedDocuments: [],
        success: false,
        error: error instanceof Error ? error.message : 'Failed to discover documents'
      };
    }
  }
  static async generateAllAIContent(request: AIContentRequest): Promise<AIContentResponse> {
    if (!GEMINI_API_KEY) {
      return {
        aiContent: {},
        success: false,
        error: 'Gemini API key not configured. Please set REACT_APP_GEMINI_API_KEY environment variable.'
      };
    }

    if (!request.documentLinks || request.documentLinks.length === 0) {
      return {
        aiContent: {},
        success: false,
        error: 'No document links provided for AI content generation.'
      };
    }

    try {
      // Create context from available information
      let context = `Topic: ${request.topicName}\n`;
      context += `Class Level: ${request.classLevel}\n\n`;
      
      if (request.description) {
        context += `Description: ${request.description}\n\n`;
      }
      
      context += `Source Documents:\n`;
      request.documentLinks.forEach((link, index) => {
        context += `${index + 1}. ${link.name}: ${link.url}\n`;
      });
      context += '\n';

      const prompt = `Based on the following educational topic information, create a comprehensive lesson plan for teachers:

${context}

**LESSON PLAN**
Create a detailed 40-minute lesson plan for ${request.classLevel} including:
- Learning Objectives (3-4 specific goals)
- Materials Needed
- Lesson Structure:
  * Introduction (5 minutes)
  * Main Content (25 minutes)
  * Activities (8 minutes)
  * Wrap-up (2 minutes)
- Assessment Methods
- Homework/Follow-up Activities
- Educational Resources with SPECIFIC LINKS:
  * Include 2-3 educational videos with actual YouTube or educational platform URLs
  * Include 1-2 interactive games or simulations with real website links
  * Include any relevant online tools or resources with working URLs
  * Format links as: [Link Title](https://actual-url.com)

Requirements:
- Age-appropriate for ${request.classLevel}
- Clear instructions for teachers
- Include timing for each lesson segment
- Provide answer keys where applicable
- Use engaging, interactive teaching methods

Please format the lesson plan clearly with headings and organize the content for easy teacher use.`;

      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 4096,
            candidateCount: 1,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
          ]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Gemini API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.candidates || data.candidates.length === 0) {
        throw new Error('No AI content generated by Gemini');
      }

      const fullContent = data.candidates[0].content.parts[0].text.trim();
      
      console.log('DEBUG: Full AI response:', fullContent);
      console.log('DEBUG: Full AI response length:', fullContent.length);
      
      // Log sections for debugging
      const sections = fullContent.split(/\*\*\d+\.\s*|\*\*/).filter((s: string) => s.trim());
      console.log('DEBUG: Detected sections:', sections.map((s: string) => s.substring(0, 50) + '...'));
      
      // Parse the response to extract lesson plan
      const aiContent: AIContent = {
        generatedAt: new Date(),
        classLevel: request.classLevel
      };

      // Extract lesson plan - try multiple patterns with extensive logging
      console.log('DEBUG: Attempting to extract lesson plan...');
      
      const lessonPlanPatterns = [
        /\*\*LESSON PLAN\*\*([\s\S]*?)$/i,
        /##?\s*LESSON PLAN([\s\S]*?)$/i,
        /LESSON PLAN:([\s\S]*?)$/i,
        /lesson\s*plan([\s\S]*?)$/i
      ];
      
      let lessonPlanMatch = null;
      let matchedPattern = '';
      
      for (let i = 0; i < lessonPlanPatterns.length; i++) {
        lessonPlanMatch = fullContent.match(lessonPlanPatterns[i]);
        if (lessonPlanMatch) {
          matchedPattern = lessonPlanPatterns[i].toString();
          console.log(`DEBUG: Lesson plan matched with pattern ${i}: ${matchedPattern}`);
          break;
        }
      }
      
      if (lessonPlanMatch) {
        aiContent.lessonPlan = lessonPlanMatch[1].trim();
        console.log('DEBUG: Extracted lesson plan length:', aiContent.lessonPlan?.length || 0);
        console.log('DEBUG: Extracted lesson plan preview:', aiContent.lessonPlan?.substring(0, 200) + '...' || 'empty');
      } else {
        console.log('DEBUG: No lesson plan match found with any pattern');
        console.log('DEBUG: Searching for any occurrence of "lesson" in content...');
        const lessonIndex = fullContent.toLowerCase().indexOf('lesson');
        if (lessonIndex !== -1) {
          console.log('DEBUG: Found "lesson" at index:', lessonIndex);
          console.log('DEBUG: Context around "lesson":', fullContent.substring(Math.max(0, lessonIndex - 50), lessonIndex + 200));
        }
      }

      console.log('DEBUG: Final aiContent object:', aiContent);

      // Fallback: if parsing fails, put everything in lesson plan
      if (!aiContent.lessonPlan) {
        aiContent.lessonPlan = fullContent;
        console.log('DEBUG: Using fallback - putting everything in lesson plan');
      }

      return {
        aiContent,
        success: true
      };

    } catch (error) {
      console.error('Error generating AI content:', error);
      return {
        aiContent: {},
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate AI content'
      };
    }
  }
  /**
   * @deprecated This method is deprecated. Use generateAllAIContent instead.
   */
  static async generateSummary(request: SummaryRequest): Promise<SummaryResponse> {
    console.warn('generateSummary is deprecated. Use generateAllAIContent instead.');
    return {
      summary: '',
      success: false,
      error: 'Summary generation is deprecated. Please use generateAllAIContent to generate lesson plans.'
    };
  }

  /**
   * @deprecated This method is deprecated. Use generateAllAIContent instead.
   */
  static async generateInteractiveContent(request: InteractiveContentRequest): Promise<InteractiveContentResponse> {
    console.warn('generateInteractiveContent is deprecated. Use generateAllAIContent instead.');
    return {
      interactiveContent: '',
      success: false,
      error: 'Interactive content generation is deprecated. Please use generateAllAIContent to generate lesson plans.'
    };
  }

  static async enhanceSection(request: SectionEnhancementRequest): Promise<SectionEnhancementResponse> {
    if (!GEMINI_API_KEY) {
      return {
        enhancedContent: '',
        success: false,
        error: 'Gemini API key not configured. Please set REACT_APP_GEMINI_API_KEY environment variable.'
      };
    }

    try {
      const durationText = request.duration ? ` (${request.duration} minutes)` : '';
      
      const prompt = `You are an expert educational content curator. Enhance this lesson plan section with SPECIFIC, FREELY AVAILABLE teaching resources, focusing heavily on YouTube videos.

**Section**: ${request.sectionTitle}${durationText}
**Topic**: ${request.topicName}
**Class Level**: ${request.classLevel}
**Section Type**: ${request.sectionType}

**Current Content**:
${request.sectionContent}

**PRIMARY FOCUS: FIND SPECIFIC YOUTUBE VIDEOS**

**1. YOUTUBE VIDEO RESEARCH (MANDATORY - Find maximum 2 specific videos):**
Search for and provide EXACT YouTube videos that are:
- Directly related to "${request.topicName}" for ${request.classLevel} students
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

      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.8,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
            candidateCount: 1,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
          ]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Gemini API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.candidates || data.candidates.length === 0) {
        throw new Error('No enhanced content generated by Gemini');
      }

      const enhancedContent = data.candidates[0].content.parts[0].text.trim();

      // Only add video section to existing content, don't replace
      const videoSection = `\n\n**🎥 RECOMMENDED VIDEOS:**\n\nSearch YouTube for "${request.topicName}" educational videos for ${request.classLevel} students\n\n**Suggested search terms:**\n- "${request.topicName} for kids"\n- "${request.topicName} ${request.classLevel} lesson"\n- "${request.topicName} educational video"`;
      
      return {
        enhancedContent: request.sectionContent + videoSection,
        success: true
      };

    } catch (error) {
      console.error('Error enhancing section:', error);
      return {
        enhancedContent: '',
        success: false,
        error: error instanceof Error ? error.message : 'Failed to enhance section'
      };
    }
  }
}
