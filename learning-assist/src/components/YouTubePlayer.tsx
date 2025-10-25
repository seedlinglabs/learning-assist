/**
 * YouTube Player Component
 * Embeds YouTube videos using youtube-nocookie.com for enhanced privacy and reduced ads
 */

import React from 'react';
import { X, ExternalLink } from 'lucide-react';
import { extractYouTubeID } from '../utils/exportHelpers';
import '../styles/YouTubePlayer.css';

interface YouTubePlayerProps {
  videoId: string; // Can be just the ID or a full YouTube URL
  title: string;
  onClose: () => void;
}

const YouTubePlayer: React.FC<YouTubePlayerProps> = ({ videoId, title, onClose }) => {
  // Extract video ID if a full URL was passed
  const cleanVideoId = extractYouTubeID(videoId) || videoId;

  // YouTube embed URL with privacy-enhanced domain and safe parameters
  const embedUrl = 
    `https://www.youtube-nocookie.com/embed/${cleanVideoId}?` +
    'rel=0' +              // Disable related videos from other channels
    '&modestbranding=1' +  // Minimal YouTube branding
    '&iv_load_policy=3' +  // Disable video annotations
    '&enablejsapi=1' +     // Enable JavaScript API for control
    '&playsinline=1' +     // Play inline on mobile
    '&fs=1' +              // Allow fullscreen
    `&origin=${window.location.origin}`; // Security - restrict to current domain

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="youtube-player-overlay" onClick={handleOverlayClick}>
      <div className="youtube-player-modal" onClick={(e) => e.stopPropagation()}>
        <div className="youtube-player-header">
          <h3>{title}</h3>
          <div className="youtube-player-actions">
            <a
              href={`https://www.youtube.com/watch?v=${cleanVideoId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm btn-outline"
              title="Open in YouTube"
            >
              <ExternalLink size={16} />
              <span>Open in YouTube</span>
            </a>
            <button onClick={onClose} className="btn btn-sm btn-ghost">
              <X size={20} />
            </button>
          </div>
        </div>
        
        <div className="youtube-player-container">
          <iframe
            src={embedUrl}
            title={title}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="youtube-player-iframe"
          />
        </div>
        
        <div className="youtube-player-footer">
          <div className="youtube-player-note">
            <span className="note-icon">ℹ️</span>
            <p>
              <strong>Child-Safe Mode:</strong> This video uses YouTube's privacy-enhanced mode 
              which reduces tracking and limits unrelated content. For best ad-blocking, ensure 
              your school network has content filters enabled.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default YouTubePlayer;

