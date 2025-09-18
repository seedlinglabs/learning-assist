# School Data Structure

This folder contains the structural data for schools, classes, and subjects. Each school has its own dedicated file.

## File Naming Convention

Each school file should be named using kebab-case based on the school's name:
- `sri-vidyaniketan-educational-institutions.ts`
- `another-school-name.ts`

## File Structure

Each school file should export a single School object with the following structure:

```typescript
export const schoolName: School = {
  id: 'unique-school-id',
  name: 'Full School Name',
  description: 'School description',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-09-01'),
  classes: createClasses()
};
```

## Adding a New School

1. Create a new file: `src/data/new-school-name.ts`
2. Follow the existing pattern in `sri-vidyaniketan-educational-institutions.ts`
3. Import the new school in `src/data/index.ts`
4. Add it to the schools array

Example:
```typescript
// src/data/index.ts
import { newSchool } from './new-school-name';

export const schools: School[] = [
  sriVidyaniketanEducationalInstitutions,
  newSchool, // Add here
];
```

## Data Sources

- **Schools, Classes, Subjects**: Static data files (this folder)
- **Topics**: Dynamic data from backend API (DynamoDB)

## Current Schools

- **Sri Vidyaniketan Educational Institutions**
  - Classes: 1-10
  - Subjects per class: Science, Social Studies, Mathematics, Kannada, English, Computers
  - Topics: Loaded dynamically from backend API

- **Seedling Test School**
  - Classes: 1-3 (for testing purposes)
  - Subjects per class: Science, Social Studies, Mathematics, Kannada, English, Computers
  - Topics: Loaded dynamically from backend API
  - Purpose: Development and testing environment