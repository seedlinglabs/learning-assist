import React, { useState } from 'react';
import { ExternalLink, Download, Image as ImageIcon, AlertCircle } from 'lucide-react';
import './ImageDisplay.css';

interface ImageItem {
  title: string;
  description: string;
  url: string;
  source: string;
}

interface ImageDisplayProps {
  images: ImageItem[];
  topicName: string;
  classLevel: string;
  subject?: string;
}

const ImageDisplay: React.FC<ImageDisplayProps> = ({
  images,
  topicName,
  classLevel,
  subject
}) => {
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());

  const handleImageError = (index: number) => {
    setImageErrors(prev => new Set([...Array.from(prev), index]));
  };

  const handleViewImage = (url: string) => {
    window.open(url, '_blank');
  };

  if (!images || images.length === 0) {
    return (
      <div className="image-display-empty">
        <ImageIcon size={48} className="empty-icon" />
        <h3>No Images Available</h3>
        <p>Images will appear here after generating AI content for this topic.</p>
      </div>
    );
  }

  return (
    <div className="images-section">
      <div className="images-grid">
        {images.map((image, index) => {
          const hasError = imageErrors.has(index);

          return (
            <div key={index} className="image-card">
              <a
                href={image.url}
                target="_blank"
                rel="noopener noreferrer"
                className="image-link"
              >
                <div className="image-thumbnail">
                  {hasError ? (
                    <div className="image-error">
                      <AlertCircle size={32} />
                      <p>Image unavailable</p>
                    </div>
                  ) : (
                    <img 
                      src={image.url} 
                      alt={image.title}
                      onError={() => handleImageError(index)}
                      className="thumbnail-image"
                      loading="lazy"
                    />
                  )}
                  <div className="image-overlay">
                    <ImageIcon size={24} />
                  </div>
                </div>
                <div className="image-info">
                  <h4 className="image-title">{image.title}</h4>
                  <p className="image-source">{image.source}</p>
                  <p className="image-description">
                    {image.description.substring(0, 100)}...
                  </p>
                </div>
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ImageDisplay;
