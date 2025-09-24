import { School } from '../types';
import { sriVidyaniketanEducationalInstitutions } from './sri-vidyaniketan-educational-institutions';
import { contentDevelopmentSchool } from './content-development-school';

// Import all school data files
export const schools: School[] = [
  sriVidyaniketanEducationalInstitutions,
  contentDevelopmentSchool,
  // Add more schools here as needed
  // import { anotherSchool } from './another-school';
  // anotherSchool,
];

// Export individual schools for direct access if needed
export { sriVidyaniketanEducationalInstitutions, contentDevelopmentSchool };