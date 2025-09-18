import { School } from '../types';

const createSubjects = (classId: string) => [
  {
    id: `subject-${classId}-science`,
    name: 'Science',
    description: 'General Science curriculum',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-09-01'),
    topics: []
  },
  {
    id: `subject-${classId}-social`,
    name: 'Social Studies',
    description: 'Social Studies and History curriculum',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-09-01'),
    topics: []
  },
  {
    id: `subject-${classId}-math`,
    name: 'Mathematics',
    description: 'Mathematics curriculum',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-09-01'),
    topics: []
  },
  {
    id: `subject-${classId}-kannada`,
    name: 'Kannada',
    description: 'Kannada language curriculum',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-09-01'),
    topics: []
  },
  {
    id: `subject-${classId}-english`,
    name: 'English',
    description: 'English language curriculum',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-09-01'),
    topics: []
  },
  {
    id: `subject-${classId}-computers`,
    name: 'Computers',
    description: 'Computer Science and Digital Literacy',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-09-01'),
    topics: []
  }
];

const createClasses = () => {
  const classes = [];
  // Only classes 1-3 for testing school
  for (let i = 1; i <= 3; i++) {
    classes.push({
      id: `test-class-${i}`,
      name: `Class ${i}`,
      description: `Class ${i} curriculum - Test Environment`,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-09-01'),
      subjects: createSubjects(`test-class-${i}`)
    });
  }
  return classes;
};

export const seedlingTestSchool: School = {
  id: 'school-test',
  name: 'Seedling Test School',
  description: 'A dedicated test school environment for development and testing purposes',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-09-01'),
  classes: createClasses()
};