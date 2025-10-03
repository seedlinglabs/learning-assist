/**
 * Academic Records Service for Parent App
 * Fetches completed topics and academic progress data
 */

export interface AcademicRecord {
  record_id: string;
  topic_id: string;
  school_id: string;
  academic_year: string;
  grade: string;
  section: string;
  subject_id: string;
  subject_name: string;
  topic_name: string;
  teacher_id?: string;
  teacher_name?: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';
  notes?: string;
  created_at: string;
  updated_at: string;
}

const API_BASE_URL = 'https://a34mmmc1te.execute-api.us-west-2.amazonaws.com/pre-prod';

class AcademicRecordsServiceClass {
  /**
   * Get academic records by school, academic year, grade, and section
   */
  async getRecordsByClass(
    schoolId: string,
    academicYear: string,
    grade: string,
    section: string
  ): Promise<AcademicRecord[]> {
    try {
      const url = `${API_BASE_URL}/academic-records?school_id=${encodeURIComponent(schoolId)}&academic_year=${encodeURIComponent(academicYear)}&grade=${encodeURIComponent(grade)}&section=${encodeURIComponent(section)}`;
      
      console.log('Fetching academic records:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch academic records: ${response.status}`);
      }

      const data = await response.json();
      console.log('Academic records received:', data);
      
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error fetching academic records:', error);
      return [];
    }
  }

  /**
   * Get completed topics for a specific class
   */
  async getCompletedTopics(
    schoolId: string,
    academicYear: string,
    grade: string,
    section: string
  ): Promise<string[]> {
    const records = await this.getRecordsByClass(schoolId, academicYear, grade, section);
    return records
      .filter(record => record.status === 'completed')
      .map(record => record.topic_id);
  }

  /**
   * Get all academic records for parent's registered classes
   */
  async getRecordsForParent(
    schoolId: string,
    academicYear: string,
    classAccess: string[]
  ): Promise<AcademicRecord[]> {
    const allRecords: AcademicRecord[] = [];
    
    for (const classCode of classAccess) {
      // Parse "6A" -> grade "6", section "A"
      const gradeMatch = classCode.match(/^(\d+)([A-Z])$/);
      if (gradeMatch) {
        const grade = gradeMatch[1];
        const section = gradeMatch[2];
        
        const records = await this.getRecordsByClass(schoolId, academicYear, grade, section);
        allRecords.push(...records);
      }
    }
    
    return allRecords;
  }

  /**
   * Get completion status for multiple classes
   */
  async getCompletionStatusForParent(
    schoolId: string,
    academicYear: string,
    classAccess: string[]
  ): Promise<Map<string, { completed: number; total: number }>> {
    const statusMap = new Map<string, { completed: number; total: number }>();
    
    for (const classCode of classAccess) {
      const gradeMatch = classCode.match(/^(\d+)([A-Z])$/);
      if (gradeMatch) {
        const grade = gradeMatch[1];
        const section = gradeMatch[2];
        
        const records = await this.getRecordsByClass(schoolId, academicYear, grade, section);
        const completed = records.filter(r => r.status === 'completed').length;
        const total = records.length;
        
        statusMap.set(classCode, { completed, total });
      }
    }
    
    return statusMap;
  }
}

export const AcademicRecordsService = new AcademicRecordsServiceClass();

