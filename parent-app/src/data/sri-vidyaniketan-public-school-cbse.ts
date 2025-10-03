import { School } from '../types/static';

const createSubjects = (classId: string) => [
  {
    id: `subject-${classId}-science`,
    name: 'Science',
    description: 'CBSE Science curriculum covering Physics, Chemistry, and Biology concepts',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-09-01'),
    topics: []
  },
  {
    id: `subject-${classId}-mathematics`,
    name: 'Mathematics',
    description: 'CBSE Mathematics curriculum with problem-solving and analytical thinking',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-09-01'),
    topics: []
  },
  {
    id: `subject-${classId}-english`,
    name: 'English',
    description: 'CBSE English curriculum focusing on language skills, literature, and communication',
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
      description: `Grade ${i} CBSE curriculum`,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-09-01'),
      subjects: createSubjects(`class-${i}`)
    });
  }
  return classes;
};

export const sriVidyaniketanPublicSchoolCBSE: School = {
  id: 'sri-vidyaniketan-public-school-cbse',
  name: 'Sri Vidyaniketan Public School (CBSE)',
  description: 'A CBSE-affiliated public school committed to providing quality education with focus on Science, Mathematics, and English',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-09-01'),
  classes: createClasses()
};
