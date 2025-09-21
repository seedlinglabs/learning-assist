// YouTube Search Service
// This service searches for real YouTube videos using the YouTube Data API v3

export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: string;
  channelTitle: string;
  publishedAt: string;
  url: string;
}

export interface YouTubeSearchResult {
  videos: YouTubeVideo[];
  totalResults: number;
}

export interface YouTubeSearchParams {
  query: string;
  maxResults?: number;
  order?: 'relevance' | 'date' | 'rating' | 'viewCount';
  duration?: 'short' | 'medium' | 'long';
  channelId?: string;
}

class YouTubeService {
  private apiKey: string;
  private baseUrl = 'https://www.googleapis.com/youtube/v3';

  constructor() {
    // In production, this should come from environment variables
    this.apiKey = process.env.REACT_APP_YOUTUBE_API_KEY || '';
    
    if (!this.apiKey) {
      console.warn('YouTube API key not configured. YouTube search will not work.');
    }
  }

  /**
   * Search for YouTube videos based on educational criteria
   */
  async searchEducationalVideos(params: YouTubeSearchParams): Promise<YouTubeSearchResult> {
    if (!this.apiKey) {
      console.warn('YouTube API key not configured, returning empty results');
      return { videos: [], totalResults: 0 };
    }

    const {
      query,
      maxResults = 2,
      order = 'relevance',
      duration = 'medium',
      channelId
    } = params;

    // Build search query with educational filters
    let searchQuery = query;
    
    // Add educational channel filters
    const educationalChannels = [
      'UCrC8mOqJQpoB7NuIMbEO6kg', // Crash Course Kids
      'UCxHAlbYQ3UaDfWgO2L8Mk5g', // National Geographic Kids
      'UCB1J7-sT5p8oJ6N1-Bdw-RQ', // SciShow Kids
      'UCrC8mOqJQpoB7NuIMbEO6kg', // Khan Academy Kids
      'UCrC8mOqJQpoB7NuIMbEO6kg', // TED-Ed
      'UCrC8mOqJQpoB7NuIMbEO6kg', // Peekaboo Kidz
      'UCrC8mOqJQpoB7NuIMbEO6kg', // Learning Junction
      'UCrC8mOqJQpoB7NuIMbEO6kg', // Smile and Learn
    ];

    // If no specific channel, add educational keywords
    if (!channelId) {
      searchQuery += ' educational kids learning';
    }

    const searchParams = new URLSearchParams({
      part: 'snippet',
      q: searchQuery,
      type: 'video',
      maxResults: maxResults.toString(),
      order,
      videoDuration: duration,
      key: this.apiKey,
      ...(channelId && { channelId })
    });

    try {
      const response = await fetch(`${this.baseUrl}/search?${searchParams}`);
      
      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.items || data.items.length === 0) {
        return { videos: [], totalResults: 0 };
      }

      // Get video details including duration
      const videoIds = data.items.map((item: any) => item.id.videoId).join(',');
      const videoDetails = await this.getVideoDetails(videoIds);

      const videos: YouTubeVideo[] = data.items.map((item: any, index: number) => {
        const details = videoDetails.find(v => v.id === item.id.videoId);
        return {
          id: item.id.videoId,
          title: item.snippet.title,
          description: item.snippet.description,
          thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
          duration: details?.duration || 'Unknown',
          channelTitle: item.snippet.channelTitle,
          publishedAt: item.snippet.publishedAt,
          url: `https://www.youtube.com/watch?v=${item.id.videoId}`
        };
      });

      return {
        videos,
        totalResults: data.pageInfo?.totalResults || 0
      };
    } catch (error) {
      console.error('YouTube search error:', error);
      // Return empty results instead of throwing error
      return { videos: [], totalResults: 0 };
    }
  }

  /**
   * Get detailed information about specific videos
   */
  private async getVideoDetails(videoIds: string): Promise<Array<{id: string, duration: string}>> {
    const params = new URLSearchParams({
      part: 'contentDetails',
      id: videoIds,
      key: this.apiKey
    });

    try {
      const response = await fetch(`${this.baseUrl}/videos?${params}`);
      const data = await response.json();
      
      return data.items?.map((item: any) => ({
        id: item.id,
        duration: this.formatDuration(item.contentDetails.duration)
      })) || [];
    } catch (error) {
      console.error('Error fetching video details:', error);
      return [];
    }
  }

  /**
   * Format ISO 8601 duration to readable format
   */
  private formatDuration(isoDuration: string): string {
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 'Unknown';

    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  }

  /**
   * Search for videos specifically for a topic and class level
   */
  async searchTopicVideos(topicName: string, classLevel: string, subject?: string): Promise<YouTubeSearchResult> {
    // Build search query based on topic and class level
    let query = `${topicName} for ${classLevel} students`;
    
    if (subject) {
      query += ` ${subject}`;
    }

    // Determine appropriate duration based on class level
    let duration: 'short' | 'medium' | 'long' = 'medium';
    if (classLevel.includes('1') || classLevel.includes('2') || classLevel.includes('3')) {
      duration = 'short'; // Shorter videos for younger students
    } else if (classLevel.includes('9') || classLevel.includes('10') || classLevel.includes('11') || classLevel.includes('12')) {
      duration = 'long'; // Longer videos for older students
    }

    return this.searchEducationalVideos({
      query,
      maxResults: 2,
      order: 'relevance',
      duration
    });
  }

  /**
   * Search for videos from specific educational channels
   */
  async searchChannelVideos(channelName: string, topic: string, maxResults: number = 2): Promise<YouTubeSearchResult> {
    const channelMap: { [key: string]: string } = {
      'Crash Course Kids': 'UCrC8mOqJQpoB7NuIMbEO6kg',
      'National Geographic Kids': 'UCxHAlbYQ3UaDfWgO2L8Mk5g',
      'SciShow Kids': 'UCB1J7-sT5p8oJ6N1-Bdw-RQ',
      'Khan Academy Kids': 'UCrC8mOqJQpoB7NuIMbEO6kg',
      'TED-Ed': 'UCrC8mOqJQpoB7NuIMbEO6kg',
      'Peekaboo Kidz': 'UCrC8mOqJQpoB7NuIMbEO6kg',
      'Learning Junction': 'UCrC8mOqJQpoB7NuIMbEO6kg',
      'Smile and Learn': 'UCrC8mOqJQpoB7NuIMbEO6kg'
    };

    const channelId = channelMap[channelName];
    if (!channelId) {
      throw new Error(`Unknown channel: ${channelName}`);
    }

    return this.searchEducationalVideos({
      query: topic,
      maxResults,
      order: 'relevance',
      duration: 'medium',
      channelId
    });
  }
}

export const youtubeService = new YouTubeService();

// Test function to verify YouTube API is working
export const testYouTubeAPI = async (): Promise<boolean> => {
  try {
    const result = await youtubeService.searchEducationalVideos({
      query: 'water cycle for kids',
      maxResults: 1
    });
    console.log('YouTube API test result:', result);
    return result.videos.length > 0;
  } catch (error) {
    console.error('YouTube API test failed:', error);
    return false;
  }
};
