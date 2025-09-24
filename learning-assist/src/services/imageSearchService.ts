/**
 * Image Search Service - Finds educational images using Unsplash API
 * Similar to YouTube service but for images
 */

export interface ImageSearchResult {
  id: string;
  title: string;
  description: string;
  url: string;
  thumbnail: string;
  source: string;
  photographer: string;
  photographerUrl: string;
  downloadUrl: string;
  width: number;
  height: number;
}

export interface ImageSearchResponse {
  success: boolean;
  images: ImageSearchResult[];
  error?: string;
  totalResults?: number;
}

class ImageSearchService {
  private readonly UNSPLASH_ACCESS_KEY = process.env.REACT_APP_UNSPLASH_ACCESS_KEY || 'demo';
  private readonly UNSPLASH_API_URL = 'https://api.unsplash.com';
  private readonly PEXELS_API_KEY = process.env.REACT_APP_PEXELS_API_KEY || 'demo';
  private readonly PEXELS_API_URL = 'https://api.pexels.com/v1';

  /**
   * Search for educational images related to a topic
   */
  async searchTopicImages(
    topicName: string,
    classLevel: string,
    subject?: string
  ): Promise<ImageSearchResponse> {
    try {
      // Create search queries based on topic and subject
      const searchQueries = this.buildSearchQueries(topicName, classLevel, subject);
      
      // Try multiple search strategies
      const searchPromises = searchQueries.map(query => 
        this.searchUnsplash(query, 3) // Get 3 images per query
      );

      const results = await Promise.allSettled(searchPromises);
      
      // Combine all successful results
      const allImages: ImageSearchResult[] = [];
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.success) {
          allImages.push(...result.value.images);
        }
      });

      // Remove duplicates and limit to 12 images
      const uniqueImages = this.removeDuplicates(allImages).slice(0, 12);

      return {
        success: true,
        images: uniqueImages,
        totalResults: uniqueImages.length
      };

    } catch (error) {
      console.error('Image search error:', error);
      return {
        success: false,
        images: [],
        error: 'Failed to search for images'
      };
    }
  }

  /**
   * Build search queries based on topic and subject
   */
  private buildSearchQueries(topicName: string, classLevel: string, subject?: string): string[] {
    const queries: string[] = [];
    
    // Base topic query
    queries.push(topicName);
    
    // Subject-specific queries
    if (subject) {
      queries.push(`${topicName} ${subject}`);
      queries.push(`${subject} education`);
    }
    
    // Class level specific queries
    const gradeLevel = this.getGradeLevel(classLevel);
    if (gradeLevel) {
      queries.push(`${topicName} ${gradeLevel}`);
      queries.push(`${topicName} kids`);
      queries.push(`${topicName} children`);
    }
    
    // Educational context queries
    queries.push(`${topicName} school`);
    queries.push(`${topicName} learning`);
    queries.push(`${topicName} classroom`);
    
    return queries;
  }

  /**
   * Search Unsplash for images
   */
  private async searchUnsplash(query: string, perPage: number = 12): Promise<ImageSearchResponse> {
    try {
      // If no API key, return demo data
      if (this.UNSPLASH_ACCESS_KEY === 'demo') {
        return this.getDemoImages(query);
      }

      const response = await fetch(
        `${this.UNSPLASH_API_URL}/search/photos?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape&content_filter=high`,
        {
          headers: {
            'Authorization': `Client-ID ${this.UNSPLASH_ACCESS_KEY}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Unsplash API error: ${response.status}`);
      }

      const data = await response.json();
      
      const images: ImageSearchResult[] = data.results.map((photo: any) => ({
        id: photo.id,
        title: photo.alt_description || photo.description || query,
        description: photo.description || `Educational image related to ${query}`,
        url: photo.urls.regular,
        thumbnail: photo.urls.thumb,
        source: 'Unsplash',
        photographer: photo.user.name,
        photographerUrl: photo.user.links.html,
        downloadUrl: photo.links.download,
        width: photo.width,
        height: photo.height
      }));

      return {
        success: true,
        images,
        totalResults: data.total
      };

    } catch (error) {
      console.error('Unsplash search error:', error);
      return {
        success: false,
        images: [],
        error: 'Failed to search Unsplash'
      };
    }
  }

  /**
   * Search Pexels for images (backup option)
   */
  private async searchPexels(query: string, perPage: number = 12): Promise<ImageSearchResponse> {
    try {
      if (this.PEXELS_API_KEY === 'demo') {
        return this.getDemoImages(query);
      }

      const response = await fetch(
        `${this.PEXELS_API_URL}/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape`,
        {
          headers: {
            'Authorization': this.PEXELS_API_KEY
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Pexels API error: ${response.status}`);
      }

      const data = await response.json();
      
      const images: ImageSearchResult[] = data.photos.map((photo: any) => ({
        id: photo.id.toString(),
        title: photo.alt || query,
        description: `Educational image related to ${query}`,
        url: photo.src.medium,
        thumbnail: photo.src.tiny,
        source: 'Pexels',
        photographer: photo.photographer,
        photographerUrl: photo.photographer_url,
        downloadUrl: photo.src.original,
        width: photo.width,
        height: photo.height
      }));

      return {
        success: true,
        images,
        totalResults: data.total_results
      };

    } catch (error) {
      console.error('Pexels search error:', error);
      return {
        success: false,
        images: [],
        error: 'Failed to search Pexels'
      };
    }
  }

  /**
   * Get demo images when no API key is available
   */
  private getDemoImages(query: string): ImageSearchResponse {
    const demoImages: ImageSearchResult[] = [
      {
        id: 'demo-1',
        title: `${query} - Educational Concept`,
        description: `Visual representation of ${query} for educational purposes`,
        url: `https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&h=600&fit=crop&crop=center`,
        thumbnail: `https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=300&h=200&fit=crop&crop=center`,
        source: 'Unsplash (Demo)',
        photographer: 'Demo Photographer',
        photographerUrl: 'https://unsplash.com',
        downloadUrl: `https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&h=600&fit=crop&crop=center`,
        width: 800,
        height: 600
      },
      {
        id: 'demo-2',
        title: `${query} - Learning Activity`,
        description: `Hands-on learning activity related to ${query}`,
        url: `https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&h=600&fit=crop&crop=center`,
        thumbnail: `https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=300&h=200&fit=crop&crop=center`,
        source: 'Unsplash (Demo)',
        photographer: 'Demo Photographer',
        photographerUrl: 'https://unsplash.com',
        downloadUrl: `https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&h=600&fit=crop&crop=center`,
        width: 800,
        height: 600
      },
      {
        id: 'demo-3',
        title: `${query} - Classroom Setting`,
        description: `Classroom environment showing ${query} concepts`,
        url: `https://images.unsplash.com/photo-1497486751825-1233686d5d80?w=800&h=600&fit=crop&crop=center`,
        thumbnail: `https://images.unsplash.com/photo-1497486751825-1233686d5d80?w=300&h=200&fit=crop&crop=center`,
        source: 'Unsplash (Demo)',
        photographer: 'Demo Photographer',
        photographerUrl: 'https://unsplash.com',
        downloadUrl: `https://images.unsplash.com/photo-1497486751825-1233686d5d80?w=800&h=600&fit=crop&crop=center`,
        width: 800,
        height: 600
      }
    ];

    return {
      success: true,
      images: demoImages,
      totalResults: demoImages.length
    };
  }

  /**
   * Remove duplicate images based on URL
   */
  private removeDuplicates(images: ImageSearchResult[]): ImageSearchResult[] {
    const seen = new Set<string>();
    return images.filter(image => {
      if (seen.has(image.url)) {
        return false;
      }
      seen.add(image.url);
      return true;
    });
  }

  /**
   * Get grade level from class level string
   */
  private getGradeLevel(classLevel: string): string | null {
    const match = classLevel.match(/(\d+)/);
    return match ? match[1] : null;
  }

  /**
   * Get educational image categories for a subject
   */
  getEducationalCategories(subject: string): string[] {
    const categories: { [key: string]: string[] } = {
      'Science': ['experiment', 'laboratory', 'nature', 'animals', 'plants', 'space', 'chemistry', 'physics'],
      'Mathematics': ['numbers', 'geometry', 'calculus', 'algebra', 'shapes', 'graphs', 'charts', 'equations'],
      'English': ['books', 'reading', 'writing', 'literature', 'poetry', 'grammar', 'vocabulary', 'storytelling'],
      'Social Studies': ['history', 'geography', 'culture', 'government', 'economics', 'society', 'world', 'community'],
      'Computers': ['technology', 'coding', 'programming', 'computer', 'digital', 'software', 'hardware', 'internet']
    };

    return categories[subject] || ['education', 'learning', 'school', 'classroom'];
  }
}

export const imageSearchService = new ImageSearchService();
