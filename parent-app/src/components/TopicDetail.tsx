import React, { useState, useEffect } from 'react';
import { ArrowLeft, Play, FileText, ExternalLink, Clock } from 'lucide-react';
import { Topic } from '../types';
import { TopicsService } from '../services/topicsService';

interface TopicDetailProps {
  topic: Topic;
  onBack: () => void;
}

const TopicDetail: React.FC<TopicDetailProps> = ({ topic, onBack }) => {
  const [fullTopic, setFullTopic] = useState<Topic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadFullTopic();
  }, [topic.id]);

  const loadFullTopic = async () => {
    try {
      setLoading(true);
      setError('');
      const detailedTopic = await TopicsService.getTopicById(topic.id);
      setFullTopic(detailedTopic);
    } catch (err) {
      setError('Failed to load topic details. Please try again.');
      console.error('Error loading topic details:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (duration?: string) => {
    if (!duration) return '';
    // Handle various duration formats
    if (duration.includes(':')) return duration;
    if (duration.includes('min')) return duration;
    return `${duration} min`;
  };

  const openVideo = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const renderAssessmentQuestions = () => {
    if (!fullTopic?.aiContent?.assessmentQuestions) return null;

    const content = fullTopic.aiContent.assessmentQuestions;
    
    return (
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <FileText className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Assessment Questions</h3>
            <p className="text-sm text-gray-600">Practice questions for your child</p>
          </div>
        </div>
        
        <div className="prose prose-sm max-w-none">
          <div 
            className="text-gray-700 whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ 
              __html: content.replace(/\n/g, '<br>') 
            }}
          />
        </div>
      </div>
    );
  };

  const renderVideos = () => {
    if (!fullTopic?.aiContent?.videos || fullTopic.aiContent.videos.length === 0) {
      return null;
    }

    return (
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <Play className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Educational Videos</h3>
            <p className="text-sm text-gray-600">
              {fullTopic.aiContent.videos.length} video{fullTopic.aiContent.videos.length !== 1 ? 's' : ''} available
            </p>
          </div>
        </div>
        
        <div className="grid gap-4">
          {fullTopic.aiContent.videos.map((video, index) => (
            <div
              key={index}
              className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              onClick={() => openVideo(video.url)}
            >
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Play className="w-6 h-6 text-white" />
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-900 mb-1 line-clamp-2">
                  {video.title}
                </h4>
                {video.duration && (
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Clock className="w-4 h-4" />
                    <span>{formatDuration(video.duration)}</span>
                  </div>
                )}
              </div>
              
              <ExternalLink className="w-5 h-5 text-gray-400 flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4" />
          <p className="text-gray-600">Loading topic details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="error-message max-w-md">
            {error}
          </div>
          <button onClick={onBack} className="btn btn-primary mt-4">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="btn btn-outline"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {fullTopic?.name || topic.name}
              </h1>
              <p className="text-sm text-gray-600">
                Learning materials and assessments
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Topic Description */}
          {fullTopic?.description && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">About This Topic</h2>
              <p className="text-gray-700 leading-relaxed">
                {fullTopic.description}
              </p>
            </div>
          )}

          {/* Videos Section */}
          {renderVideos()}

          {/* Assessment Questions Section */}
          {renderAssessmentQuestions()}

          {/* No Content Message */}
          {(!fullTopic?.aiContent?.videos || fullTopic.aiContent.videos.length === 0) && 
           !fullTopic?.aiContent?.assessmentQuestions && (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Content Available</h3>
              <p className="text-gray-600">
                Videos and assessment questions for this topic are not available yet.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default TopicDetail;
