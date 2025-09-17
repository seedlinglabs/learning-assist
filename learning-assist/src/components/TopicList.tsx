import React, { useState } from 'react';
import { FileText, ExternalLink, Plus, Edit, Trash2, Calendar } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Topic } from '../types';
import AddTopicModal from './AddTopicModal';
import EditTopicModal from './EditTopicModal';

const TopicList: React.FC = () => {
  const { currentPath, openNotebookLM, deleteTopic } = useApp();
  const { school, class: cls, subject } = currentPath;
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);

  if (!school || !cls || !subject) return null;

  const handleOpenNotebook = (topic: any) => {
    if (topic.notebookLMUrl) {
      openNotebookLM(topic.notebookLMUrl);
    }
  };

  const handleDeleteTopic = (topicId: string) => {
    if (window.confirm('Are you sure you want to delete this topic?')) {
      deleteTopic(topicId);
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
          <p>Click on a topic to open it in NotebookLM</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary"
        >
          <Plus size={16} />
          Add Topic
        </button>
      </div>

      <div className="topics-container">
        {subject.topics.map((topic) => (
          <div key={topic.id} className="topic-card">
            <div className="topic-main" onClick={() => handleOpenNotebook(topic)}>
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
                  {topic.notebookLMUrl && (
                    <div className="topic-link">
                      <ExternalLink size={14} />
                      <span>NotebookLM</span>
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
              >
                <Trash2 size={14} />
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