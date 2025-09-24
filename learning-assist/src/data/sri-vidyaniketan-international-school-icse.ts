import { School } from '../types';

const createSubjects = (classId: string) => [
  {
    id: `subject-${classId}-science`,
    name: 'Science',
    description: 'ICSE Science curriculum covering Physics, Chemistry, and Biology with emphasis on practical applications',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-09-01'),
    topics: []
  },
  {
    id: `subject-${classId}-mathematics`,
    name: 'Mathematics',
    description: 'ICSE Mathematics curriculum with comprehensive problem-solving and analytical thinking skills',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-09-01'),
    topics: []
  },
  {
    id: `subject-${classId}-social-studies`,
    name: 'Social Studies',
    description: 'ICSE Social Studies curriculum covering History, Geography, and Civics with global perspective',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-09-01'),
    topics: []
  }
];

const createClasses = () => {
  const classes = [];
  for (let i = 1; i <= 10; i++) {
    classes.push({
      id: `class-${i}`,
      name: `Grade ${i}`,
      description: `Grade ${i} ICSE curriculum`,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-09-01'),
      subjects: createSubjects(`class-${i}`)
    });
  }
  return classes;
};

export const sriVidyaniketanInternationalSchoolICSE: School = {
  id: 'sri-vidyaniketan-international-school-icse',
  name: 'Sri Vidyaniketan International School (ICSE)',
  description: 'An ICSE-affiliated international school providing comprehensive education with focus on Science, Mathematics, and Social Studies',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-09-01'),
  classes: createClasses()
};
