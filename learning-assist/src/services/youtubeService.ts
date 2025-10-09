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

    // Use the query as provided (already optimized by caller)
    const searchQuery = query;

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
   * Extract key concepts from topic name for better search matching
   */
  private extractKeywords(topicName: string): string {
    // Remove common prefixes and patterns
    let keywords = topicName
      .replace(/^Chapter \d+:\s*/i, '')           // Remove "Chapter 5: "
      .replace(/\s*-\s*Part \d+:\s*/i, ' ')       // Remove " - Part 1: "
      .replace(/\s*-\s*Session \d+:\s*/i, ' ')    // Remove " - Session 1: "
      .replace(/Introduction to\s*/i, '')          // Remove "Introduction to"
      .replace(/Overview of\s*/i, '')              // Remove "Overview of"
      .replace(/\(.*?\)/g, '')                     // Remove parentheses content
      .trim();
    
    // Extract main concepts (first 3-4 significant words)
    const words = keywords.split(/\s+/).filter(word => 
      word.length > 3 && 
      !['Class', 'Grade', 'Level', 'students', 'learning'].includes(word)
    );
    
    return words.slice(0, 4).join(' ');
  }

  /**
   * Search for videos specifically for a topic and class level
   */
  async searchTopicVideos(topicName: string, classLevel: string, subject?: string): Promise<YouTubeSearchResult> {
    // Extract key concepts for better matching
    const keywords = this.extractKeywords(topicName);
    
    // Extract grade number from classLevel (e.g., "Class 6" → "6", "Grade 3" → "3")
    const gradeMatch = classLevel.match(/(\d+)/);
    const gradeNumber = gradeMatch ? gradeMatch[1] : '';
    
    // Build specific educational query with grade context
    let query = keywords;
    if (subject) {
      query += ` ${subject}`;
    }
    
    // Add grade-specific educational context
    if (gradeNumber) {
      query += ` grade ${gradeNumber}`;
    }
    
    // Add educational qualifier
    query += ' education';

    console.log(`[YouTube] Searching for: "${query}" (from topic: "${topicName}", grade: ${gradeNumber})`);

    // Determine appropriate duration based on class level
    let duration: 'short' | 'medium' | 'long' = 'medium';
    const grade = parseInt(gradeNumber) || 0;
    if (grade >= 1 && grade <= 3) {
      duration = 'short'; // 0-4 min videos for younger students
    } else if (grade >= 9 && grade <= 12) {
      duration = 'long'; // 10-20 min videos for older students
    }

    // Fetch more results then filter to best 2
    const results = await this.searchEducationalVideos({
      query,
      maxResults: 10, // Fetch 10 to get better pool
      order: 'relevance',
      duration
    });

    // Filter and rank results by quality
    const rankedVideos = this.rankVideosByQuality(results.videos, keywords, gradeNumber);
    
    return {
      videos: rankedVideos.slice(0, 2), // Return top 2
      totalResults: results.totalResults
    };
  }

  /**
   * Rank videos by quality indicators
   */
  private rankVideosByQuality(videos: YouTubeVideo[], keywords: string, gradeNumber?: string): YouTubeVideo[] {
    return videos
      .map(video => {
        let score = 0;
        const lowerTitle = video.title.toLowerCase();
        const lowerDesc = video.description.toLowerCase();
        const keywordList = keywords.toLowerCase().split(' ');
        
        // Score based on keyword matches in title (very high weight - exact match is key)
        keywordList.forEach(keyword => {
          if (keyword.length > 0 && lowerTitle.includes(keyword)) score += 15;
        });
        
        // Score based on keyword matches in description (medium weight)
        keywordList.forEach(keyword => {
          if (keyword.length > 0 && lowerDesc.includes(keyword)) score += 5;
        });
        
        // Prefer videos with grade level mentioned (high weight for grade-specific content)
        if (gradeNumber) {
          const gradePatterns = [
            `grade ${gradeNumber}`,
            `class ${gradeNumber}`,
            `${gradeNumber}th grade`,
            `level ${gradeNumber}`
          ];
          if (gradePatterns.some(pattern => lowerTitle.includes(pattern) || lowerDesc.includes(pattern))) {
            score += 20; // Strong preference for grade-specific content
          }
        }
        
        // Prefer trusted educational channels (very high weight)
        const trustedChannels = [
          'Crash Course', 'Khan Academy', 'TED-Ed', 'National Geographic',
          'SciShow', 'Peekaboo Kidz', 'Learning Junction', 'Smile and Learn',
          'Free School', 'Brain Pump', 'Bill Nye', 'Sesame Street',
          'Math Antics', 'Professor Dave', 'Bozeman Science'
        ];
        if (trustedChannels.some(channel => video.channelTitle.includes(channel))) {
          score += 25; // Increased from 15
        }
        
        // Prefer videos with educational keywords in title
        if (/(explained|tutorial|lesson|learn|introduction|education|teaching)/i.test(lowerTitle)) {
          score += 8;
        }
        
        // Bonus for "for kids" or "for students" (grade-appropriate)
        if (/(for kids|for students|for children)/i.test(lowerTitle)) {
          score += 10;
        }
        
        // Penalty for non-educational indicators
        if (/(funny|prank|challenge|reaction|vlog)/i.test(lowerTitle)) {
          score -= 50; // Strong penalty
        }
        
        console.log(`[YouTube] Video: "${video.title}" | Channel: ${video.channelTitle} | Score: ${score}`);
        
        return { video, score };
      })
      .sort((a, b) => b.score - a.score)
      .map(item => item.video);
  }

  /**
   * Search for videos from specific educational channels
   */
  async searchChannelVideos(channelName: string, topic: string, maxResults: number = 2): Promise<YouTubeSearchResult> {
    const channelMap: { [key: string]: string } = {
      'Crash Course Kids': 'UCrC8mOqJQpoB7NuIMbEO6kg',
      'National Geographic Kids': 'UCxHAlbYQ3UaDfWgO2L8Mk5g',
      'SciShow Kids': 'UCB1J7-sT5p8oJ6N1-Bdw-RQ',
      'Khan Academy': 'UC4a-Gbdw7vOaccHmFo40b9g',
      'TED-Ed': 'UCsooa4yRKGN_zEE8iknghZA',
      'Peekaboo Kidz': 'UC7xp-3LV7-6_BAeaEd4glMQ',
      'Learning Junction': 'UC-KqOKgEfWLEhiRdE8uLSgw',
      'Smile and Learn': 'UCX526UA0PrFKoQ1RvGFIqEA',
      'Free School': 'UC3VJ_wChKNnhKseru7xqM_Q',
      'Brain Pump': 'UCrC8mOqJQpoB7NuIMbEO6kg',
      'Bill Nye': 'UCrC8mOqJQpoB7NuIMbEO6kg',
      'Sesame Street': 'UCoookXUzPciGrEZEXmh4Jjg'
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
