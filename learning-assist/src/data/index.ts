import { School } from '../types';
import { sriVidyaniketanEducationalInstitutions } from './sri-vidyaniketan-educational-institutions';
import { seedlingTestSchool } from './seedling-test-school';

// Import all school data files
export const schools: School[] = [
  sriVidyaniketanEducationalInstitutions,
  seedlingTestSchool,
  // Add more schools here as needed
  // import { anotherSchool } from './another-school';
  // anotherSchool,
];

// Export individual schools for direct access if needed
export { sriVidyaniketanEducationalInstitutions, seedlingTestSchool };