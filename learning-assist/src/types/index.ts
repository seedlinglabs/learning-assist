export interface DocumentLink {
  name: string;
  url: string;
}

export interface Topic {
  id: string;
  name: string;
  description?: string;
  documentLinks?: DocumentLink[]; // List of source document links
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