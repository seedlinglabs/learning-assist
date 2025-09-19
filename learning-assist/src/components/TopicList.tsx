import React, { useState } from 'react';
import { FileText, ExternalLink, Plus, Edit, Trash2, Calendar, RefreshCw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Topic } from '../types';
import AddTopicModal from './AddTopicModal';
import EditTopicModal from './EditTopicModal';

const TopicList: React.FC = () => {
  const { currentPath, deleteTopic, refreshTopics, loading, error, clearError } = useApp();
  const { school, class: cls, subject } = currentPath;
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [deletingTopicId, setDeletingTopicId] = useState<string | null>(null);

  if (!school || !cls || !subject) return null;

  console.log('TopicList - Current subject:', subject.name, 'Topics:', subject.topics);

  const handleDeleteTopic = async (topicId: string) => {
    if (window.confirm('Are you sure you want to delete this topic?')) {
      try {
        setDeletingTopicId(topicId);
        await deleteTopic(topicId);
      } catch (error) {
        console.error('Failed to delete topic:', error);
      } finally {
        setDeletingTopicId(null);
      }
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(date));
  };

  return (
    <div className="content-container">
      <div className="content-header">
        <div>
          <h1>Topics in {subject.name}</h1>
          <p>Click on a topic to edit it, or click a document link to open it directly</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={refreshTopics}
            className="btn btn-secondary"
            disabled={loading}
            title="Refresh topics"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary"
            disabled={loading}
          >
            <Plus size={16} />
            Add Topic
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message" style={{ margin: '0 0 2rem 0', padding: '1rem', backgroundColor: '#fef2f2', color: '#dc2626', borderRadius: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <button onClick={clearError} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '1.25rem' }}>×</button>
        </div>
      )}

      {loading && (
        <div className="loading-message" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
          Loading topics...
        </div>
      )}

      <div className="topics-container">
        {subject.topics.map((topic) => (
          <div
            key={topic.id}
            className="topic-card"
            onClick={() => setEditingTopic(topic)}
            style={{ cursor: 'pointer', transition: 'all 0.2s ease-in-out' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div className="topic-main">
              <div className="topic-icon">
                <FileText size={24} />
              </div>
              <div className="topic-content">
                <h3 className="topic-title">{topic.name}</h3>
                {topic.description && (
                  <p className="topic-description">{topic.description}</p>
                )}
                <div className="topic-meta">
                  <div className="topic-date">
                    <Calendar size={14} />
                    <span>Updated {formatDate(topic.updatedAt)}</span>
                  </div>
                  {Array.isArray(topic.documentLinks) && topic.documentLinks.length > 0 && (
                    <div className="topic-link" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {topic.documentLinks.map((link) => (
                        <a
                          key={link.url}
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: '#2563eb', textDecoration: 'underline' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink size={14} /> {link.name}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="topic-actions">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingTopic(topic);
                }}
                className="btn btn-ghost btn-sm"
                title="Edit topic"
              >
                <Edit size={14} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteTopic(topic.id);
                }}
                className="btn btn-ghost btn-sm btn-danger"
                title="Delete topic"
                disabled={deletingTopicId === topic.id}
              >
                {deletingTopicId === topic.id ? '...' : <Trash2 size={14} />}
              </button>
            </div>
          </div>
        ))}
      </div>

      {subject.topics.length === 0 && (
        <div className="empty-state">
          <FileText size={64} />
          <h3>No Topics Available</h3>
          <p>There are no topics configured for {subject.name}.</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary"
          >
            <Plus size={16} />
            Add Your First Topic
          </button>
        </div>
      )}

      {showAddModal && (
        <AddTopicModal
          subjectId={subject.id}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {editingTopic && (
        <EditTopicModal
          topic={editingTopic}
          onClose={() => setEditingTopic(null)}
        />
      )}

    </div>
  );
};

export default TopicList;