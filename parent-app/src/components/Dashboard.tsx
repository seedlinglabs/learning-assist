import React, { useState, useEffect } from 'react';
import { BookOpen, LogOut, User, ChevronRight, Play, FileText } from 'lucide-react';
import { Parent, Topic } from '../types';
import { AuthService } from '../services/authService';
import { TopicsService } from '../services/topicsService';

interface DashboardProps {
  user: Parent;
  onLogout: () => void;
  onTopicSelect: (topic: Topic) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onLogout, onTopicSelect }) => {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTopics();
  }, [user.class_access]);

  const loadTopics = async () => {
    if (!user.class_access || user.class_access.length === 0) {
      setError('No class access found. Please contact your school administrator.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // Load topics for all accessible classes
      const allTopics: Topic[] = [];
      for (const classId of user.class_access) {
        try {
          const classTopics = await TopicsService.getTopicsByClass(classId);
          allTopics.push(...classTopics);
        } catch (err) {
          console.error(`Error loading topics for class ${classId}:`, err);
        }
      }
      
      // Sort topics by updated date (newest first)
      allTopics.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      
      setTopics(allTopics);
    } catch (err) {
      setError('Failed to load topics. Please try again.');
      console.error('Error loading topics:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getTopicPreview = (topic: Topic) => {
    if (topic.aiContent?.videos && topic.aiContent.videos.length > 0) {
      return `${topic.aiContent.videos.length} video${topic.aiContent.videos.length !== 1 ? 's' : ''} available`;
    }
    if (topic.aiContent?.assessmentQuestions) {
      return 'Assessment questions available';
    }
    return 'Learning materials available';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Parent Dashboard</h1>
                <p className="text-sm text-gray-600">Welcome back, {user.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <User className="w-4 h-4" />
                <span>Class Access: {user.class_access.length}</span>
              </div>
              <button
                onClick={onLogout}
                className="btn btn-outline"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Learning Topics</h2>
          <p className="text-gray-600">
            Track your child's progress through these educational topics
          </p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="loading-spinner" />
            <span className="ml-3 text-gray-600">Loading topics...</span>
          </div>
        )}

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {!loading && !error && topics.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Topics Available</h3>
            <p className="text-gray-600">
              No learning topics have been assigned to your child's class yet.
            </p>
          </div>
        )}

        {!loading && !error && topics.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {topics.map((topic) => (
              <div
                key={topic.id}
                className="card p-6 cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => onTopicSelect(topic)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                      {topic.name}
                    </h3>
                    {topic.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {topic.description}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 ml-2" />
                </div>

                <div className="space-y-2 mb-4">
                  {topic.aiContent?.videos && topic.aiContent.videos.length > 0 && (
                    <div className="flex items-center gap-2 text-sm text-blue-600">
                      <Play className="w-4 h-4" />
                      <span>{topic.aiContent.videos.length} video{topic.aiContent.videos.length !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                  
                  {topic.aiContent?.assessmentQuestions && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <FileText className="w-4 h-4" />
                      <span>Assessment questions</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Updated {formatDate(topic.updated_at)}</span>
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    {topic.class_id}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
