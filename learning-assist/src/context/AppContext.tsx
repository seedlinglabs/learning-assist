import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { School, NavigationPath, Topic, Subject, Class, SearchResult } from '../types';
import { schools } from '../data';
import { topicsAPI, CreateTopicRequest, ApiError } from '../services/api';
import { GeminiService, DocumentDiscoveryRequest } from '../services/geminiService';
import { useAuth } from './AuthContext';

interface AppContextType {
  schools: School[];
  currentPath: NavigationPath;
  setCurrentPath: (path: NavigationPath) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: SearchResult[];
  addTopic: (subjectId: string, topic: Omit<Topic, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateTopic: (topicId: string, updates: Partial<Topic>) => Promise<void>;
  deleteTopic: (topicId: string) => Promise<void>;
  openNotebookLM: (url: string) => void;
  performSearch: (query: string) => SearchResult[];
  refreshTopics: () => Promise<void>;
  discoverDocuments: (request: DocumentDiscoveryRequest) => Promise<{ success: boolean; documents?: any[]; error?: string }>;
  loading: boolean;
  error: string | null;
  clearError: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const { user, canAccessClass, hasRole } = useAuth();
  const [schoolsData, setSchoolsData] = useState<School[]>(schools);
  const [currentPath, setCurrentPath] = useState<NavigationPath>({});
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filter schools and classes based on user access
  const getFilteredSchools = (): School[] => {
    if (!user) return [];
    
    // Teachers can see everything
    if (hasRole('teacher')) {
      return schoolsData;
    }
    
    // Parents can only see classes their children are in
    if (hasRole('parent')) {
      const accessibleClassIds = user.class_access;
      return schoolsData.map(school => ({
        ...school,
        classes: school.classes.filter(cls => accessibleClassIds.includes(cls.id))
      })).filter(school => school.classes.length > 0);
    }
    
    // Students can see their own classes
    if (hasRole('student')) {
      const accessibleClassIds = user.class_access;
      return schoolsData.map(school => ({
        ...school,
        classes: school.classes.filter(cls => accessibleClassIds.includes(cls.id))
      })).filter(school => school.classes.length > 0);
    }
    
    return [];
  };

  // Load topics for a subject from API
  const loadTopicsForSubject = async (subjectId: string): Promise<Topic[]> => {
    try {
      setLoading(true);
      setError(null);
      const topics = await topicsAPI.getBySubject(subjectId);
      return topics;
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to load topics';
      setError(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Load topics when navigating to a subject
  useEffect(() => {
    if (currentPath.subject) {
      console.log('Loading topics for subject:', currentPath.subject.id);
      loadTopicsForSubject(currentPath.subject.id)
        .then(topics => {
          console.log('Loaded topics:', topics);
          const nextSchools = schoolsData.map(school => ({
            ...school,
            classes: school.classes.map(cls => ({
              ...cls,
              subjects: cls.subjects.map(subject => {
                if (subject.id === currentPath.subject?.id) {
                  return { ...subject, topics };
                }
                return subject;
              })
            }))
          }));
          setSchoolsData(nextSchools);
          reseatCurrentPath(nextSchools);
        })
        .catch(error => {
          console.error('Error in useEffect loading topics:', error);
        });
    }
  }, [currentPath.subject?.id]);

  const addTopic = async (subjectId: string, topicData: Omit<Topic, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      setLoading(true);
      setError(null);

      // Find the school, class, and subject for the API call
      let schoolId = '';
      let classId = '';
      
      for (const school of schoolsData) {
        for (const cls of school.classes) {
          for (const subject of cls.subjects) {
            if (subject.id === subjectId) {
              schoolId = school.id;
              classId = cls.id;
              break;
            }
          }
        }
      }

        const createRequest: CreateTopicRequest = {
          name: topicData.name,
          description: topicData.description,
          documentLinks: topicData.documentLinks,
          aiContent: topicData.aiContent,
          subject_id: subjectId,
          school_id: schoolId,
          class_id: classId,
        };

      const newTopic = await topicsAPI.create(createRequest);

      // Refresh topics from API to ensure consistency
      await refreshTopics();
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to add topic';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateTopic = async (topicId: string, updates: Partial<Topic>) => {
    try {
      setLoading(true);
      setError(null);

      const updateRequest = {
        name: updates.name,
        description: updates.description,
        documentLinks: updates.documentLinks,
        aiContent: updates.aiContent,
      };

      console.log('DEBUG: Update request being sent:', updateRequest);
      console.log('DEBUG: AI Content in request:', updates.aiContent);

      const updatedTopic = await topicsAPI.update(topicId, updateRequest);

      // Refresh topics from API to ensure consistency
      await refreshTopics();
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to update topic';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteTopic = async (topicId: string) => {
    try {
      setLoading(true);
      setError(null);

      await topicsAPI.delete(topicId);

      // Refresh topics from API to ensure consistency
      await refreshTopics();
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to delete topic';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Removed NotebookLM opener; topics now support multiple document links
  const openNotebookLM = (_url: string) => {};

  const performSearch = (query: string): SearchResult[] => {
    if (!query.trim()) return [];

    const results: SearchResult[] = [];
    const searchTerm = query.toLowerCase();

    schoolsData.forEach(school => {
      // Search schools
      if (school.name.toLowerCase().includes(searchTerm) || 
          school.description?.toLowerCase().includes(searchTerm)) {
        results.push({
          type: 'school',
          item: school,
          path: { school }
        });
      }

      school.classes.forEach(cls => {
        // Search classes
        if (cls.name.toLowerCase().includes(searchTerm) || 
            cls.description?.toLowerCase().includes(searchTerm)) {
          results.push({
            type: 'class',
            item: cls,
            path: { school, class: cls }
          });
        }

        cls.subjects.forEach(subject => {
          // Search subjects
          if (subject.name.toLowerCase().includes(searchTerm) || 
              subject.description?.toLowerCase().includes(searchTerm)) {
            results.push({
              type: 'subject',
              item: subject,
              path: { school, class: cls, subject }
            });
          }

          subject.topics.forEach(topic => {
            // Search topics
            if (topic.name.toLowerCase().includes(searchTerm) || 
                topic.description?.toLowerCase().includes(searchTerm)) {
              results.push({
                type: 'topic',
                item: topic,
                path: { school, class: cls, subject, topic }
              });
            }
          });
        });
      });
    });

    setSearchResults(results);
    return results;
  };

  const clearError = () => setError(null);

  const discoverDocuments = async (request: DocumentDiscoveryRequest) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await GeminiService.discoverDocuments(request);
      
      if (result.success) {
        return {
          success: true,
          documents: result.suggestedDocuments
        };
      } else {
        return {
          success: false,
          error: result.error || 'Failed to discover documents'
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to discover documents';
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  };

  // Reseat currentPath references after immutable schoolsData updates
  const reseatCurrentPath = (nextSchools: School[]) => {
    if (!currentPath.school) return;
    const schoolId = currentPath.school.id;
    const classId = currentPath.class?.id;
    const subjectId = currentPath.subject?.id;

    const nextSchool = nextSchools.find(s => s.id === schoolId);
    if (!nextSchool) return;

    let nextClass: Class | undefined = undefined;
    let nextSubject: Subject | undefined = undefined;

    if (classId) {
      nextClass = nextSchool.classes.find(c => c.id === classId);
      if (nextClass && subjectId) {
        nextSubject = nextClass.subjects.find(sub => sub.id === subjectId);
      }
    }

    setCurrentPath({ school: nextSchool, class: nextClass, subject: nextSubject, topic: currentPath.topic });
  };

  // Refresh topics for current subject
  const refreshTopics = async (): Promise<void> => {
    if (currentPath.subject) {
      console.log('Refreshing topics for subject:', currentPath.subject.id);
      const topics = await loadTopicsForSubject(currentPath.subject.id);
      const nextSchools = schoolsData.map(school => ({
        ...school,
        classes: school.classes.map(cls => ({
          ...cls,
          subjects: cls.subjects.map(subject => {
            if (subject.id === currentPath.subject?.id) {
              return { ...subject, topics };
            }
            return subject;
          })
        }))
      }));
      setSchoolsData(nextSchools);
      reseatCurrentPath(nextSchools);
    }
  };

  const contextValue: AppContextType = {
    schools: getFilteredSchools(),
    currentPath,
    setCurrentPath,
    searchQuery,
    setSearchQuery,
    searchResults,
    addTopic,
    updateTopic,
    deleteTopic,
    openNotebookLM,
    performSearch,
    refreshTopics,
    discoverDocuments,
    loading,
    error,
    clearError,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};