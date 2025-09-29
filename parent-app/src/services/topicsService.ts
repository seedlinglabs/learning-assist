import { Topic } from '../types';

const API_BASE_URL = 'https://xvq11x0421.execute-api.us-west-2.amazonaws.com/pre-prod';

class TopicsServiceClass {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('parent_auth_token');
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      defaultHeaders['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async getTopicsByClass(classId: string): Promise<Topic[]> {
    try {
      const response = await this.makeRequest(`/topics?subject_id=${encodeURIComponent(classId)}`);
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error('Error fetching topics by class:', error);
      throw error;
    }
  }

  async getTopicById(topicId: string): Promise<Topic> {
    try {
      const response = await this.makeRequest(`/topics/${topicId}`);
      return response;
    } catch (error) {
      console.error('Error fetching topic by ID:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const TopicsService = new TopicsServiceClass();
