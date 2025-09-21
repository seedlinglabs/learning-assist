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

// Legacy interfaces for backward compatibility
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

      const prompt = `Based on the following educational topic information, create comprehensive AI-generated content for teachers:

${context}

Generate the following content types in a structured format:

**1. SUMMARY**
Create a concise 2-paragraph summary (5-6 lines each) covering the key concepts and main points. Make it educational and suitable for ${request.classLevel} students.

**2. INTERACTIVE ACTIVITIES**
Create engaging classroom activities including:
- Discussion Questions (3-4 thought-provoking questions)
- Quick Quiz (5 multiple choice questions with answers)
- Hands-on Activities (2-3 practical exercises)
- Real-world Applications (daily life connections)
- Creative Projects (student project ideas)

**3. LESSON PLAN**
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

Please format each section clearly with headings and organize the content for easy teacher use.`;

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
      
      // Parse the response to extract different sections
      const aiContent: AIContent = {
        generatedAt: new Date(),
        classLevel: request.classLevel
      };

      // Try multiple regex patterns to match different AI response formats
      
      // Extract summary - try multiple patterns
      let summaryMatch = fullContent.match(/\*\*1\.\s*SUMMARY\*\*([\s\S]*?)(?=\*\*2\.|$)/i);
      if (!summaryMatch) summaryMatch = fullContent.match(/\*\*SUMMARY\*\*([\s\S]*?)(?=\*\*INTERACTIVE|$)/i);
      if (!summaryMatch) summaryMatch = fullContent.match(/##?\s*SUMMARY([\s\S]*?)(?=##?\s*INTERACTIVE|$)/i);
      if (!summaryMatch) summaryMatch = fullContent.match(/SUMMARY:([\s\S]*?)(?=INTERACTIVE|$)/i);
      
      if (summaryMatch) {
        aiContent.summary = summaryMatch[1].trim();
        console.log('DEBUG: Extracted summary:', aiContent.summary ? aiContent.summary.substring(0, 100) + '...' : 'empty');
      } else {
        console.log('DEBUG: No summary match found with any pattern');
      }

      // Extract interactive activities - try multiple patterns
      let activitiesMatch = fullContent.match(/\*\*2\.\s*INTERACTIVE ACTIVITIES\*\*([\s\S]*?)(?=\*\*3\.|$)/i);
      if (!activitiesMatch) activitiesMatch = fullContent.match(/\*\*INTERACTIVE ACTIVITIES\*\*([\s\S]*?)(?=\*\*LESSON|$)/i);
      if (!activitiesMatch) activitiesMatch = fullContent.match(/##?\s*INTERACTIVE ACTIVITIES([\s\S]*?)(?=##?\s*LESSON|$)/i);
      if (!activitiesMatch) activitiesMatch = fullContent.match(/INTERACTIVE ACTIVITIES:([\s\S]*?)(?=LESSON|$)/i);
      
      if (activitiesMatch) {
        aiContent.interactiveActivities = activitiesMatch[1].trim();
        console.log('DEBUG: Extracted activities:', aiContent.interactiveActivities ? aiContent.interactiveActivities.substring(0, 100) + '...' : 'empty');
      } else {
        console.log('DEBUG: No activities match found with any pattern');
      }

      // Extract lesson plan - try multiple patterns with extensive logging
      console.log('DEBUG: Attempting to extract lesson plan...');
      
      const lessonPlanPatterns = [
        /\*\*3\.\s*LESSON PLAN\*\*([\s\S]*?)$/i,
        /\*\*LESSON PLAN\*\*([\s\S]*?)$/i,
        /##?\s*LESSON PLAN([\s\S]*?)$/i,
        /LESSON PLAN:([\s\S]*?)$/i,
        /3\.\s*LESSON PLAN([\s\S]*?)$/i,
        /lesson\s*plan([\s\S]*?)$/i,
        /\*\*3\*\*([\s\S]*?)$/i // Sometimes the number and title get separated
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

      // Fallback: if parsing fails, put everything in summary
      if (!aiContent.summary && !aiContent.interactiveActivities && !aiContent.lessonPlan) {
        aiContent.summary = fullContent;
        console.log('DEBUG: Using fallback - putting everything in summary');
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
  static async generateSummary(request: SummaryRequest): Promise<SummaryResponse> {
    if (!GEMINI_API_KEY) {
      return {
        summary: '',
        success: false,
        error: 'Gemini API key not configured. Please set REACT_APP_GEMINI_API_KEY environment variable.'
      };
    }

    if (!request.documentLinks || request.documentLinks.length === 0) {
      return {
        summary: '',
        success: false,
        error: 'No document links provided for summarization.'
      };
    }

    try {
      // Create a prompt for Gemini
      const documentList = request.documentLinks
        .map((link, index) => `${index + 1}. ${link.name}: ${link.url}`)
        .join('\n');

      const prompt = `Please analyze the following documents related to the topic "${request.topicName}" and create a concise summary:

Documents:
${documentList}

Requirements:
- Create a summary with exactly 2 paragraphs
- Each paragraph should be 5-6 lines long
- Focus on the key concepts and main points
- Make it educational and suitable for students
- Do not include URLs in the summary
- Keep the language clear and accessible

Please provide only the summary text without any additional formatting or explanations.`;

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
        throw new Error('No summary generated by Gemini');
      }

      const summary = data.candidates[0].content.parts[0].text.trim();

      return {
        summary,
        success: true
      };

    } catch (error) {
      console.error('Error generating summary:', error);
      return {
        summary: '',
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate summary'
      };
    }
  }

  static async generateInteractiveContent(request: InteractiveContentRequest): Promise<InteractiveContentResponse> {
    if (!GEMINI_API_KEY) {
      return {
        interactiveContent: '',
        success: false,
        error: 'Gemini API key not configured. Please set REACT_APP_GEMINI_API_KEY environment variable.'
      };
    }

    if (!request.summary && (!request.documentLinks || request.documentLinks.length === 0)) {
      return {
        interactiveContent: '',
        success: false,
        error: 'Either a summary or document links are required to generate interactive content.'
      };
    }

    try {
      // Create context from available information
      let context = `Topic: ${request.topicName}\n\n`;
      
      if (request.description) {
        context += `Description: ${request.description}\n\n`;
      }
      
      if (request.summary) {
        context += `Summary: ${request.summary}\n\n`;
      }
      
      if (request.documentLinks && request.documentLinks.length > 0) {
        context += `Source Documents:\n`;
        request.documentLinks.forEach((link, index) => {
          context += `${index + 1}. ${link.name}: ${link.url}\n`;
        });
        context += '\n';
      }

      const prompt = `Based on the following topic information, create engaging and interactive learning activities for students:

${context}

Create interactive content that includes:
1. **Discussion Questions** (3-4 thought-provoking questions)
2. **Quick Quiz** (5 multiple choice questions with answers)
3. **Hands-on Activities** (2-3 practical exercises or experiments)
4. **Real-world Applications** (How this topic applies to daily life)
5. **Creative Projects** (Ideas for student projects or presentations)

Requirements:
- Make it age-appropriate and engaging for students
- Include clear instructions for teachers
- Provide answer keys where applicable
- Make activities interactive and participatory
- Use simple, clear language
- Include both individual and group activities

Format the response with clear headings and bullet points for easy reading by teachers.`;

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
        throw new Error('No interactive content generated by Gemini');
      }

      const interactiveContent = data.candidates[0].content.parts[0].text.trim();

      return {
        interactiveContent,
        success: true
      };

    } catch (error) {
      console.error('Error generating interactive content:', error);
      return {
        interactiveContent: '',
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate interactive content'
      };
    }
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
      
      const prompt = `Enhance the following lesson plan section with specific, ready-to-use teaching materials and activities:

**Section**: ${request.sectionTitle}${durationText}
**Topic**: ${request.topicName}
**Class Level**: ${request.classLevel}
**Section Type**: ${request.sectionType}

**Current Content**:
${request.sectionContent}

**CRITICAL INSTRUCTIONS**: 
- DO NOT provide general platform links or ask teachers to search
- DO NOT say "teachers will need to locate" or "find specific content"
- PROVIDE specific, actionable activities and materials
- Include ONLY content that is immediately usable in the classroom

**Enhancement Requirements**:

**1. YOUTUBE VIDEOS** (MANDATORY - provide specific educational videos):
Find and include 1-2 specific YouTube videos that are:
- Directly related to ${request.topicName} for ${request.classLevel}
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
- Directly related to ${request.topicName}

Format with clear headings and bullet points for easy teacher reference.`;

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

      return {
        enhancedContent,
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
