import { Topic, DocumentLink, AIContent } from '../types';

const API_BASE_URL = 'https://xvq11x0421.execute-api.us-west-2.amazonaws.com/pre-prod';

export interface CreateTopicRequest {
  name: string;
  description?: string;
  documentLinks?: DocumentLink[];
  aiContent?: AIContent;
  subject_id: string;
  school_id: string;
  class_id: string;
}

export interface UpdateTopicRequest {
  name?: string;
  description?: string;
  documentLinks?: DocumentLink[];
  aiContent?: AIContent;
}

export interface ApiTopic {
  id: string;
  name: string;
  description: string;
  document_links?: { name?: string; url: string }[];
  subject_id: string;
  school_id: string;
  class_id: string;
  created_at: string;
  updated_at: string;
}

// Transform API response to frontend Topic format
const transformApiTopicToTopic = (apiTopic: any): Topic => {
  console.log('DEBUG API Transform - Raw API topic:', apiTopic);
  console.log('DEBUG API Transform - Raw ai_content:', apiTopic.ai_content);
  
  const transformed = {
    id: apiTopic.id,
    name: apiTopic.name,
    description: apiTopic.description || undefined,
    documentLinks: Array.isArray(apiTopic.document_links)
      ? apiTopic.document_links.map((l: any) => ({ name: l.name || generateNameFromUrl(l.url), url: l.url }))
      : undefined,
    aiContent: apiTopic.ai_content ? {
      lessonPlan: apiTopic.ai_content.lessonPlan,
      generatedAt: apiTopic.ai_content.generatedAt ? new Date(apiTopic.ai_content.generatedAt) : undefined,
      classLevel: apiTopic.ai_content.classLevel,
      videos: apiTopic.ai_content.videos || undefined,
    } : undefined,
    createdAt: new Date(apiTopic.created_at),
    updatedAt: new Date(apiTopic.updated_at)
  };
  
  console.log('DEBUG API Transform - Transformed topic:', transformed);
  console.log('DEBUG API Transform - Transformed aiContent:', transformed.aiContent);
  
  return transformed;
};

// Transform frontend Topic to API format
const transformTopicToApiTopic = (topic: CreateTopicRequest): any => ({
  name: topic.name,
  description: topic.description,
  document_links: Array.isArray(topic.documentLinks)
    ? topic.documentLinks.map(l => ({ name: l.name, url: l.url }))
    : undefined,
  aiContent: topic.aiContent,
  subject_id: topic.subject_id,
  school_id: topic.school_id,
  class_id: topic.class_id
});

// Heuristic to generate a human-readable name from a URL
export function generateNameFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const pathname = u.pathname; // /path/to/file-name_v2.pdf
    let lastSegment = pathname.split('/').filter(Boolean).pop() || u.hostname;
    // Strip query/hash
    lastSegment = lastSegment.split('?')[0].split('#')[0];
    // Remove extension
    lastSegment = lastSegment.replace(/\.[a-zA-Z0-9]{1,6}$/i, '');
    // Replace separators with spaces
    lastSegment = lastSegment.replace(/[-_]+/g, ' ');
    // Title case simple words
    lastSegment = lastSegment
      .split(' ')
      .map(w => (w.length <= 3 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
      .join(' ');
    // Fallback to hostname if too short
    if (lastSegment.trim().length < 2) return u.hostname;
    return lastSegment.trim();
  } catch {
    // Fallback: trim and return raw url tail
    const tail = url.split('/').filter(Boolean).pop() || url;
    return tail.slice(0, 60);
  }
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new ApiError(response.status, errorData.error || `HTTP ${response.status}`);
  }
  
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  
  return response.text();
};

export const topicsAPI = {
  // Get all topics
  async getAll(): Promise<Topic[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/topics`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await handleResponse(response);
      return Array.isArray(data) ? data.map(transformApiTopicToTopic) : [];
    } catch (error) {
      console.error('Error fetching all topics:', error);
      throw error;
    }
  },

  // Get topics by subject ID
  async getBySubject(subjectId: string): Promise<Topic[]> {
    const url = `${API_BASE_URL}/topics?subject_id=${encodeURIComponent(subjectId)}`;
    let lastError: unknown = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        const data = await handleResponse(response);
        const topics = Array.isArray(data) ? data.map(transformApiTopicToTopic) : [];
        // If empty on first attempts, brief backoff to mitigate eventual consistency
        if (topics.length === 0 && attempt < 2) {
          await new Promise(res => setTimeout(res, 100 * (attempt + 1)));
          continue;
        }
        return topics;
      } catch (error) {
        lastError = error;
        await new Promise(res => setTimeout(res, 100 * (attempt + 1)));
      }
    }
    console.error('Error fetching topics by subject after retries:', lastError);
    throw lastError instanceof Error ? lastError : new Error('Failed to fetch topics');
  },

  // Get single topic by ID
  async getById(topicId: string): Promise<Topic> {
    try {
      const response = await fetch(`${API_BASE_URL}/topics/${topicId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await handleResponse(response);
      return transformApiTopicToTopic(data);
    } catch (error) {
      console.error('Error fetching topic by ID:', error);
      throw error;
    }
  },

  // Create new topic
  async create(topic: CreateTopicRequest): Promise<Topic> {
    try {
      const response = await fetch(`${API_BASE_URL}/topics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transformTopicToApiTopic(topic)),
      });
      
      const data = await handleResponse(response);
      return transformApiTopicToTopic(data);
    } catch (error) {
      console.error('Error creating topic:', error);
      throw error;
    }
  },

  // Update existing topic
  async update(topicId: string, updates: UpdateTopicRequest): Promise<Topic> {
    try {
      console.log('DEBUG API: Raw updates object:', updates);
      console.log('DEBUG API: JSON stringified body:', JSON.stringify(updates));
      console.log('DEBUG API: Teaching Guide in updates:', updates.aiContent?.teachingGuide ? 'PRESENT' : 'MISSING');
      console.log('DEBUG API: Images in updates:', updates.aiContent?.images ? `PRESENT (${updates.aiContent.images.length} items)` : 'MISSING');
      
      const response = await fetch(`${API_BASE_URL}/topics/${topicId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      
      const data = await handleResponse(response);
      return transformApiTopicToTopic(data);
    } catch (error) {
      console.error('Error updating topic:', error);
      throw error;
    }
  },

  // Delete topic
  async delete(topicId: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/topics/${topicId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      await handleResponse(response);
    } catch (error) {
      console.error('Error deleting topic:', error);
      throw error;
    }
  },
};

export { ApiError };