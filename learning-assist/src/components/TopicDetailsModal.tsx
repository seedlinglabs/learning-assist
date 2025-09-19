import React from 'react';
import { X, FileText, Calendar, ExternalLink } from 'lucide-react';
import { Topic } from '../types';

interface TopicDetailsModalProps {
  topic: Topic;
  onClose: () => void;
}

const TopicDetailsModal: React.FC<TopicDetailsModalProps> = ({ topic, onClose }) => {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    }).format(new Date(date));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <FileText size={24} />
            <h2>{topic.name}</h2>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {topic.description && (
            <div className="topic-description">
              <h3>Description</h3>
              <p>{topic.description}</p>
            </div>
          )}

          {Array.isArray(topic.documentLinks) && topic.documentLinks.length > 0 && (
            <div className="topic-documents">
              <h3>Documents</h3>
              <div className="document-list">
                {topic.documentLinks.map((link) => (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="document-link"
                  >
                    <ExternalLink size={16} />
                    <span>{link.name}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="topic-dates">
            <div className="date-item">
              <Calendar size={14} />
              <span>Created: {formatDate(topic.createdAt)}</span>
            </div>
            <div className="date-item">
              <Calendar size={14} />
              <span>Last Updated: {formatDate(topic.updatedAt)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopicDetailsModal;
