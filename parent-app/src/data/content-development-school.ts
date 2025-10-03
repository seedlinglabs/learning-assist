import { School, Class } from '../types/static';

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

  // Grade 9
  classes.push({
    id: 'content-dev-grade-9',
    name: 'Grade 9',
    description: 'Grade 9 - Content Development',
    createdAt: new Date('2024-09-23'),
    updatedAt: new Date('2024-09-23'),
    subjects: [
      {
        id: 'content-dev-grade-9-science',
        name: 'Science',
        description: 'Grade 9 Science - Content Development',
        topics: [],
        createdAt: new Date('2024-09-23'),
        updatedAt: new Date('2024-09-23')
      },
      {
        id: 'content-dev-grade-9-mathematics',
        name: 'Mathematics',
        description: 'Grade 9 Mathematics - Content Development',
        topics: [],
        createdAt: new Date('2024-09-23'),
        updatedAt: new Date('2024-09-23')
      },
      {
        id: 'content-dev-grade-9-english',
        name: 'English',
        description: 'Grade 9 English - Content Development',
        topics: [],
        createdAt: new Date('2024-09-23'),
        updatedAt: new Date('2024-09-23')
      },
      {
        id: 'content-dev-grade-9-social-studies',
        name: 'Social Studies',
        description: 'Grade 9 Social Studies - Content Development',
        topics: [],
        createdAt: new Date('2024-09-23'),
        updatedAt: new Date('2024-09-23')
      },
      {
        id: 'content-dev-grade-9-computers',
        name: 'Computers',
        description: 'Grade 9 Computers - Content Development',
        topics: [],
        createdAt: new Date('2024-09-23'),
        updatedAt: new Date('2024-09-23')
      }
    ]
  });

  // Grade 10
  classes.push({
    id: 'content-dev-grade-10',
    name: 'Grade 10',
    description: 'Grade 10 - Content Development',
    createdAt: new Date('2024-09-23'),
    updatedAt: new Date('2024-09-23'),
    subjects: [
      {
        id: 'content-dev-grade-10-science',
        name: 'Science',
        description: 'Grade 10 Science - Content Development',
        topics: [],
        createdAt: new Date('2024-09-23'),
        updatedAt: new Date('2024-09-23')
      },
      {
        id: 'content-dev-grade-10-mathematics',
        name: 'Mathematics',
        description: 'Grade 10 Mathematics - Content Development',
        topics: [],
        createdAt: new Date('2024-09-23'),
        updatedAt: new Date('2024-09-23')
      },
      {
        id: 'content-dev-grade-10-english',
        name: 'English',
        description: 'Grade 10 English - Content Development',
        topics: [],
        createdAt: new Date('2024-09-23'),
        updatedAt: new Date('2024-09-23')
      },
      {
        id: 'content-dev-grade-10-social-studies',
        name: 'Social Studies',
        description: 'Grade 10 Social Studies - Content Development',
        topics: [],
        createdAt: new Date('2024-09-23'),
        updatedAt: new Date('2024-09-23')
      },
      {
        id: 'content-dev-grade-10-computers',
        name: 'Computers',
        description: 'Grade 10 Computers - Content Development',
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
  description: 'Content Development School - Focused on creating educational content for Grades 6-10',
  createdAt: new Date('2024-09-23'),
  updatedAt: new Date('2024-09-23'),
  classes: createClasses()
};
