import React, { createContext, useContext, useState, ReactNode } from 'react';
import { School, NavigationPath, Topic, Subject, Class, SearchResult } from '../types';
import { mockSchools } from '../data/mockData';

interface AppContextType {
  schools: School[];
  currentPath: NavigationPath;
  setCurrentPath: (path: NavigationPath) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: SearchResult[];
  addTopic: (subjectId: string, topic: Omit<Topic, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateTopic: (topicId: string, updates: Partial<Topic>) => void;
  deleteTopic: (topicId: string) => void;
  openNotebookLM: (url: string) => void;
  performSearch: (query: string) => SearchResult[];
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
  const [schools, setSchools] = useState<School[]>(mockSchools);
  const [currentPath, setCurrentPath] = useState<NavigationPath>({});
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  const generateId = () => `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const addTopic = (subjectId: string, topicData: Omit<Topic, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newTopic: Topic = {
      ...topicData,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setSchools(prevSchools =>
      prevSchools.map(school => ({
        ...school,
        classes: school.classes.map(cls => ({
          ...cls,
          subjects: cls.subjects.map(subject =>
            subject.id === subjectId
              ? { ...subject, topics: [...subject.topics, newTopic] }
              : subject
          )
        }))
      }))
    );
  };

  const updateTopic = (topicId: string, updates: Partial<Topic>) => {
    setSchools(prevSchools =>
      prevSchools.map(school => ({
        ...school,
        classes: school.classes.map(cls => ({
          ...cls,
          subjects: cls.subjects.map(subject => ({
            ...subject,
            topics: subject.topics.map(topic =>
              topic.id === topicId
                ? { ...topic, ...updates, updatedAt: new Date() }
                : topic
            )
          }))
        }))
      }))
    );
  };

  const deleteTopic = (topicId: string) => {
    setSchools(prevSchools =>
      prevSchools.map(school => ({
        ...school,
        classes: school.classes.map(cls => ({
          ...cls,
          subjects: cls.subjects.map(subject => ({
            ...subject,
            topics: subject.topics.filter(topic => topic.id !== topicId)
          }))
        }))
      }))
    );
  };

  const openNotebookLM = (url: string) => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const performSearch = (query: string): SearchResult[] => {
    if (!query.trim()) return [];

    const results: SearchResult[] = [];
    const searchTerm = query.toLowerCase();

    schools.forEach(school => {
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

  const contextValue: AppContextType = {
    schools,
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
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};