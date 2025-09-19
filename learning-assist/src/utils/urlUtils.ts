/**
 * Generates a human-readable name from a URL
 * @param url The URL to generate a name from
 * @returns A human-readable name
 */
export function generateNameFromUrl(url: string): string {
  if (!url) return 'Document';

  try {
    const urlObj = new URL(url);

    // Handle specific domains
    if (urlObj.hostname.includes('docs.google.com')) {
      return 'Google Doc';
    }
    if (urlObj.hostname.includes('drive.google.com')) {
      return 'Google Drive File';
    }
    if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
      return 'YouTube Video';
    }
    if (urlObj.hostname.includes('github.com')) {
      // Extract filename from GitHub URL
      const parts = urlObj.pathname.split('/');
      const filename = parts[parts.length - 1];
      if (filename) {
        // Remove file extension
        return filename.split('.')[0];
      }
    }

    // Extract name from path
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    if (pathParts.length > 0) {
      // Get last meaningful part of path
      let name = pathParts[pathParts.length - 1];
      
      // Remove file extension
      name = name.split('.')[0];
      
      // Convert separators to spaces
      name = name.replace(/[-_]/g, ' ');
      
      // Capitalize words
      name = name.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
      
      return name;
    }

    // Fallback to domain name
    return urlObj.hostname.split('.')[0].charAt(0).toUpperCase() + 
           urlObj.hostname.split('.')[0].slice(1) + ' Document';

  } catch (error) {
    // Return default name if URL is invalid
    return 'Document';
  }
}
