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

- **Content Development**
  - Classes: Grade 6, Grade 7, Grade 8, Grade 9, Grade 10
  - Subjects per class: Science, Mathematics, English, Social Studies, Computers
  - Topics: Loaded dynamically from backend API
  - Purpose: Content development and educational material creation
  - Source: [Google Drive Folder](https://drive.google.com/drive/folders/1G4Gk7Kq6RfIyQ_hCpmNdfLd58xMA3uD0?usp=drive_link)

- **Sri Vidyaniketan Public School (CBSE)**
  - Classes: Grade 1-10
  - Subjects per class: Science, Mathematics, English
  - Topics: Loaded dynamically from backend API
  - Purpose: CBSE curriculum focused on core subjects
  - Board: Central Board of Secondary Education (CBSE)

- **Sri Vidyaniketan International School (ICSE)**
  - Classes: Grade 1-10
  - Subjects per class: Science, Mathematics, Social Studies
  - Topics: Loaded dynamically from backend API
  - Purpose: ICSE curriculum with international perspective
  - Board: Indian Certificate of Secondary Education (ICSE)