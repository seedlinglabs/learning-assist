import { Topic, Subject } from '../types';
import { StaticDataService } from './staticDataService';

const API_BASE_URL = 'https://xvq11x0421.execute-api.us-west-2.amazonaws.com/pre-prod';

class TopicsServiceClass {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('parent_auth_token');
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    // Get fresh token from localStorage
    const currentToken = localStorage.getItem('parent_auth_token');
    
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (currentToken) {
      defaultHeaders['Authorization'] = `Bearer ${currentToken}`;
    }

    console.log('Making request to:', url);
    console.log('Headers:', defaultHeaders);

    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('API Error:', errorData);
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Get subjects from static data by school and class
  async getSubjectsBySchoolAndClass(schoolId: string, classId: string): Promise<Subject[]> {
    try {
      console.log('Getting subjects for school:', schoolId, 'class:', classId);
      const subjects = StaticDataService.getSubjectsByClass(schoolId, classId);
      console.log('Found subjects:', subjects);
      return subjects;
    } catch (error) {
      console.error('Error fetching subjects by school and class:', error);
      throw error;
    }
  }

  // Get subjects from static data (legacy method for backward compatibility)
  async getSubjectsByClass(classId: string): Promise<Subject[]> {
    try {
      console.log('Getting subjects for class:', classId);
      const subjects = StaticDataService.getSubjectsByClassId(classId);
      console.log('Found subjects:', subjects);
      return subjects;
    } catch (error) {
      console.error('Error fetching subjects by class:', error);
      throw error;
    }
  }

  // Get topics from backend API
  async getTopicsBySubject(subjectId: string): Promise<Topic[]> {
    try {
      console.log('Getting topics for subject:', subjectId);
      const response = await this.makeRequest(`/topics?subject_id=${encodeURIComponent(subjectId)}`);
      const topics = Array.isArray(response) ? response : [];
      
      // Transform snake_case ai_content to camelCase aiContent
      const transformedTopics = topics.map((topic: any) => {
        if (topic.ai_content && !topic.aiContent) {
          return {
            ...topic,
            aiContent: topic.ai_content
          };
        }
        return topic;
      });
      
      console.log('✅ Transformed topics. First topic has aiContent?', !!transformedTopics[0]?.aiContent);
      if (transformedTopics[0]?.aiContent) {
        console.log('✅ Videos in aiContent:', transformedTopics[0].aiContent.videos?.length || 0);
      }
      
      return transformedTopics;
    } catch (error) {
      console.error('Error fetching topics by subject:', error);
      throw error;
    }
  }

  // Get single topic from backend API
  async getTopicById(topicId: string): Promise<Topic> {
    try {
      console.log('Getting topic by ID:', topicId);
      const response = await this.makeRequest(`/topics/${topicId}`);
      return response;
    } catch (error) {
      console.error('Error fetching topic by ID:', error);
      throw error;
    }
  }
}

export const TopicsService = new TopicsServiceClass();
