import { School, Class } from '../types';

// Helper function to create classes for Content Development school
const createClasses = (): Class[] => {
  const classes: Class[] = [];
  
  // Grade 6
  classes.push({
    id: 'content-dev-grade-6',
    name: 'Grade 6',
    description: 'Grade 6 - Content Development',
    createdAt: new Date('2024-09-23'),
    updatedAt: new Date('2024-09-23'),
    subjects: [
      {
        id: 'content-dev-grade-6-science',
        name: 'Science',
        description: 'Grade 6 Science - Content Development',
        topics: [], // Topics will be loaded dynamically from backend
        createdAt: new Date('2024-09-23'),
        updatedAt: new Date('2024-09-23')
      },
      {
        id: 'content-dev-grade-6-mathematics',
        name: 'Mathematics',
        description: 'Grade 6 Mathematics - Content Development',
        topics: [],
        createdAt: new Date('2024-09-23'),
        updatedAt: new Date('2024-09-23')
      },
      {
        id: 'content-dev-grade-6-english',
        name: 'English',
        description: 'Grade 6 English - Content Development',
        topics: [],
        createdAt: new Date('2024-09-23'),
        updatedAt: new Date('2024-09-23')
      },
      {
        id: 'content-dev-grade-6-social-studies',
        name: 'Social Studies',
        description: 'Grade 6 Social Studies - Content Development',
        topics: [],
        createdAt: new Date('2024-09-23'),
        updatedAt: new Date('2024-09-23')
      },
      {
        id: 'content-dev-grade-6-computers',
        name: 'Computers',
        description: 'Grade 6 Computers - Content Development',
        topics: [],
        createdAt: new Date('2024-09-23'),
        updatedAt: new Date('2024-09-23')
      }
    ]
  });

  // Grade 7
  classes.push({
    id: 'content-dev-grade-7',
    name: 'Grade 7',
    description: 'Grade 7 - Content Development',
    createdAt: new Date('2024-09-23'),
    updatedAt: new Date('2024-09-23'),
    subjects: [
      {
        id: 'content-dev-grade-7-science',
        name: 'Science',
        description: 'Grade 7 Science - Content Development',
        topics: [],
        createdAt: new Date('2024-09-23'),
        updatedAt: new Date('2024-09-23')
      },
      {
        id: 'content-dev-grade-7-mathematics',
        name: 'Mathematics',
        description: 'Grade 7 Mathematics - Content Development',
        topics: [],
        createdAt: new Date('2024-09-23'),
        updatedAt: new Date('2024-09-23')
      },
      {
        id: 'content-dev-grade-7-english',
        name: 'English',
        description: 'Grade 7 English - Content Development',
        topics: [],
        createdAt: new Date('2024-09-23'),
        updatedAt: new Date('2024-09-23')
      },
      {
        id: 'content-dev-grade-7-social-studies',
        name: 'Social Studies',
        description: 'Grade 7 Social Studies - Content Development',
        topics: [],
        createdAt: new Date('2024-09-23'),
        updatedAt: new Date('2024-09-23')
      },
      {
        id: 'content-dev-grade-7-computers',
        name: 'Computers',
        description: 'Grade 7 Computers - Content Development',
        topics: [],
        createdAt: new Date('2024-09-23'),
        updatedAt: new Date('2024-09-23')
      }
    ]
  });

  // Grade 8
  classes.push({
    id: 'content-dev-grade-8',
    name: 'Grade 8',
    description: 'Grade 8 - Content Development',
    createdAt: new Date('2024-09-23'),
    updatedAt: new Date('2024-09-23'),
    subjects: [
      {
        id: 'content-dev-grade-8-science',
        name: 'Science',
        description: 'Grade 8 Science - Content Development',
        topics: [],
        createdAt: new Date('2024-09-23'),
        updatedAt: new Date('2024-09-23')
      },
      {
        id: 'content-dev-grade-8-mathematics',
        name: 'Mathematics',
        description: 'Grade 8 Mathematics - Content Development',
        topics: [],
        createdAt: new Date('2024-09-23'),
        updatedAt: new Date('2024-09-23')
      },
      {
        id: 'content-dev-grade-8-english',
        name: 'English',
        description: 'Grade 8 English - Content Development',
        topics: [],
        createdAt: new Date('2024-09-23'),
        updatedAt: new Date('2024-09-23')
      },
      {
        id: 'content-dev-grade-8-social-studies',
        name: 'Social Studies',
        description: 'Grade 8 Social Studies - Content Development',
        topics: [],
        createdAt: new Date('2024-09-23'),
        updatedAt: new Date('2024-09-23')
      },
      {
        id: 'content-dev-grade-8-computers',
        name: 'Computers',
        description: 'Grade 8 Computers - Content Development',
        topics: [],
        createdAt: new Date('2024-09-23'),
        updatedAt: new Date('2024-09-23')
      }
    ]
  });

  return classes;
};

export const contentDevelopmentSchool: School = {
  id: 'content-development-school',
  name: 'Content Development',
  description: 'Content Development School - Focused on creating educational content for Grades 6-8',
  createdAt: new Date('2024-09-23'),
  updatedAt: new Date('2024-09-23'),
  classes: createClasses()
};
