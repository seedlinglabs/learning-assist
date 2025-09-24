export interface DocumentLink {
  name: string;
  url: string;
}

export interface AIContent {
  lessonPlan?: string;
  teachingGuide?: string;
  groupDiscussion?: string;
  images?: EducationalImage[];
  videos?: YouTubeVideo[];
  generatedAt?: Date;
  classLevel?: string;
}

export interface EducationalImage {
  title: string;
  description: string;
  url: string;
  source: string;
}

export interface YouTubeVideo {
  id: string;
  title: string;
  url: string;
  channelTitle: string;
  duration: string;
  description: string;
  thumbnail: string;
  publishedAt: string;
}

export interface Topic {
  id: string;
  name: string;
  description?: string;
  documentLinks?: DocumentLink[]; // List of source document links
  aiContent?: AIContent; // Consolidated AI-generated content
  createdAt: Date;
  updatedAt: Date;
}

export interface Subject {
  id: string;
  name: string;
  description?: string;
  topics: Topic[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Class {
  id: string;
  name: string;
  description?: string;
  subjects: Subject[];
  createdAt: Date;
  updatedAt: Date;
}

export interface School {
  id: string;
  name: string;
  description?: string;
  classes: Class[];
  createdAt: Date;
  updatedAt: Date;
}

export interface NavigationPath {
  school?: School;
  class?: Class;
  subject?: Subject;
  topic?: Topic;
}

export interface SearchResult {
  type: 'topic' | 'subject' | 'class' | 'school';
  item: Topic | Subject | Class | School;
  path: NavigationPath;
}