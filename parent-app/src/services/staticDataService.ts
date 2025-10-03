import { School, Class } from '../types/static';
import { Subject } from '../types';
import { schools } from '../data';

class StaticDataServiceClass {
  private schools: School[] = schools;

  getSchools(): School[] {
    return this.schools;
  }

  getAllSchools(): Array<{ id: string; name: string }> {
    return this.schools.map(school => ({
      id: school.id,
      name: school.name
    }));
  }

  getSchoolById(schoolId: string): School | null {
    return this.schools.find(school => school.id === schoolId) || null;
  }

  getClassesBySchool(schoolId: string): Class[] {
    const school = this.getSchoolById(schoolId);
    return school ? school.classes : [];
  }

  getClassById(schoolId: string, classId: string): Class | null {
    const school = this.getSchoolById(schoolId);
    if (!school) return null;
    return school.classes.find(cls => cls.id === classId) || null;
  }

  getSubjectsByClass(schoolId: string, classId: string): Subject[] {
    // Handle numeric class IDs (e.g., "6" -> "content-dev-grade-6")
    let actualClassId = classId;
    if (schoolId === 'content-development-school' && /^\d+$/.test(classId)) {
      actualClassId = `content-dev-grade-${classId}`;
    }
    
    const classData = this.getClassById(schoolId, actualClassId);
    if (!classData) {
      console.log(`Class not found: schoolId=${schoolId}, classId=${classId}, actualClassId=${actualClassId}`);
      return [];
    }
    
    const school = this.getSchoolById(schoolId);
    if (!school) return [];
    
    return classData.subjects.map(subject => ({
      id: subject.id,
      name: subject.name,
      description: subject.description,
      class_id: classData.id,
      school_id: school.id,
      school_name: school.name,
      class_name: classData.name,
      created_at: subject.createdAt.toISOString(),
      updated_at: subject.updatedAt.toISOString()
    }));
  }

  getSubjectById(schoolId: string, classId: string, subjectId: string): Subject | null {
    const subjects = this.getSubjectsByClass(schoolId, classId);
    return subjects.find(subject => subject.id === subjectId) || null;
  }

  // Helper method to get all subjects for a list of class IDs (for parent's class access)
  getSubjectsForClasses(classIds: string[]): Subject[] {
    const allSubjects: Subject[] = [];
    
    for (const school of this.schools) {
      for (const classData of school.classes) {
        if (classIds.includes(classData.id)) {
          // Add school and class info to each subject
          const subjectsWithContext = classData.subjects.map(subject => ({
            id: subject.id,
            name: subject.name,
            description: subject.description,
            class_id: classData.id,
            school_id: school.id,
            school_name: school.name,
            class_name: classData.name,
            created_at: subject.createdAt.toISOString(),
            updated_at: subject.updatedAt.toISOString()
          }));
          allSubjects.push(...subjectsWithContext);
        }
      }
    }
    
    return allSubjects;
  }

  // Get all subjects for a specific class ID (without needing school ID)
  getSubjectsByClassId(classId: string): Subject[] {
    for (const school of this.schools) {
      for (const classData of school.classes) {
        if (classData.id === classId) {
          return classData.subjects.map(subject => ({
            id: subject.id,
            name: subject.name,
            description: subject.description,
            class_id: classData.id,
            school_id: school.id,
            school_name: school.name,
            class_name: classData.name,
            created_at: subject.createdAt.toISOString(),
            updated_at: subject.updatedAt.toISOString()
          }));
        }
      }
    }
    return [];
  }
}

export const StaticDataService = new StaticDataServiceClass();
