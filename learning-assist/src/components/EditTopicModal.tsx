import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Topic } from '../types';

interface EditTopicModalProps {
  topic: Topic;
  onClose: () => void;
}

const EditTopicModal: React.FC<EditTopicModalProps> = ({ topic, onClose }) => {
  const { updateTopic, loading, error, clearError } = useApp();
  const [formData, setFormData] = useState({
    name: topic.name,
    description: topic.description || '',
    notebookLMUrl: topic.notebookLMUrl || ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('Please enter a topic name');
      return;
    }

    try {
      await updateTopic(topic.id, {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        notebookLMUrl: formData.notebookLMUrl.trim() || undefined
      });
      onClose();
    } catch (error) {
      // Error is handled by the context, just stay on the modal
      console.error('Failed to update topic:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleClose = () => {
    clearError();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Topic</h2>
          <button onClick={handleClose} className="modal-close" disabled={loading}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="error-message" style={{ margin: '1rem 1.5rem 0', padding: '0.75rem', backgroundColor: '#fef2f2', color: '#dc2626', borderRadius: '0.5rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="name">Topic Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter topic name"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Enter topic description (optional)"
              rows={3}
            />
          </div>

          <div className="form-group">
            <label htmlFor="notebookLMUrl">NotebookLM URL</label>
            <input
              type="url"
              id="notebookLMUrl"
              name="notebookLMUrl"
              value={formData.notebookLMUrl}
              onChange={handleChange}
              placeholder="https://notebooklm.google.com/notebook/..."
            />
          </div>

          <div className="modal-actions">
            <button type="button" onClick={handleClose} className="btn btn-secondary" disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Updating...' : 'Update Topic'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTopicModal;