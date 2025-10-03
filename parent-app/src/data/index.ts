import { School } from '../types/static';
import { contentDevelopmentSchool } from './content-development-school';
import { sriVidyaniketanPublicSchoolCBSE } from './sri-vidyaniketan-public-school-cbse';
import { sriVidyaniketanInternationalSchoolICSE } from './sri-vidyaniketan-international-school-icse';

// Import all school data files
export const schools: School[] = [
  contentDevelopmentSchool,
  sriVidyaniketanPublicSchoolCBSE,
  sriVidyaniketanInternationalSchoolICSE,
  // Add more schools here as needed
  // import { anotherSchool } from './another-school';
  // anotherSchool,
];

// Export individual schools for direct access if needed
export { contentDevelopmentSchool, sriVidyaniketanPublicSchoolCBSE, sriVidyaniketanInternationalSchoolICSE };