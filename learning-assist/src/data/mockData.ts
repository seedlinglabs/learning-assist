import { School } from '../types';

const createSubjects = (classId: string) => {
  const topics = classId === 'class-6' ? [
    {
      id: 'topic-class6-science-matter',
      name: 'Matter',
      description: 'Understanding the properties and states of matter',
      notebookLMUrl: 'https://notebooklm.google.com/notebook/b066683b-a190-45a0-ade9-a2ae690618b3',
      createdAt: new Date('2024-09-17'),
      updatedAt: new Date('2024-09-17'),
    }
  ] : [];

  return [
    {
      id: `subject-${classId}-science`,
      name: 'Science',
      description: 'General Science curriculum',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-09-01'),
      topics: topics
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
};

const createClasses = () => {
  const classes = [];
  for (let i = 1; i <= 10; i++) {
    classes.push({
      id: `class-${i}`,
      name: `Class ${i}`,
      description: `Class ${i} curriculum`,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-09-01'),
      subjects: createSubjects(`class-${i}`)
    });
  }
  return classes;
};

export const mockSchools: School[] = [
  {
    id: 'school-1',
    name: 'Sri Vidyaniketan Educational Institutions',
    description: 'A premier educational institution committed to excellence in learning and character development',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-09-01'),
    classes: createClasses()
  }
];