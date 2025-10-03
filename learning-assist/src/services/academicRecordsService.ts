/**
 * Academic Records Service
 * Handles API calls to the academic records management Lambda function
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

export interface CreateAcademicRecordRequest {
  school_id: string;
  academic_year: string;
  grade: string;
  section: string;
  subject_id: string;
  subject_name: string;
  topic_id: string;
  topic_name: string;
  teacher_id?: string;
  teacher_name?: string;
  status?: string;
  notes?: string;
}

export interface UpdateAcademicRecordRequest {
  status?: string;
  teacher_id?: string;
  teacher_name?: string;
  subject_name?: string;
  topic_name?: string;
  notes?: string;
}

const API_BASE_URL = process.env.REACT_APP_ACADEMIC_RECORDS_API_URL || 
                     'https://a34mmmc1te.execute-api.us-west-2.amazonaws.com/pre-prod';

class AcademicRecordsServiceClass {
  private getHeaders(): HeadersInit {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  /**
   * Create a new academic record
   */
  async createRecord(data: CreateAcademicRecordRequest): Promise<AcademicRecord> {
    return this.makeRequest<AcademicRecord>('/academic-records', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * Get a specific academic record
   */
  async getRecord(recordId: string, topicId: string): Promise<AcademicRecord> {
    return this.makeRequest<AcademicRecord>(
      `/academic-records/${encodeURIComponent(recordId)}/${encodeURIComponent(topicId)}`
    );
  }

  /**
   * Update an academic record
   */
  async updateRecord(
    recordId: string,
    topicId: string,
    updates: UpdateAcademicRecordRequest
  ): Promise<AcademicRecord> {
    return this.makeRequest<AcademicRecord>(
      `/academic-records/${encodeURIComponent(recordId)}/${encodeURIComponent(topicId)}`,
      {
        method: 'PUT',
        body: JSON.stringify(updates)
      }
    );
  }

  /**
   * Delete an academic record
   */
  async deleteRecord(recordId: string, topicId: string): Promise<{ message: string }> {
    return this.makeRequest<{ message: string }>(
      `/academic-records/${encodeURIComponent(recordId)}/${encodeURIComponent(topicId)}`,
      {
        method: 'DELETE'
      }
    );
  }

  // Parent phone query removed - parent fields no longer used

  /**
   * Query records by teacher ID
   */
  async getRecordsByTeacherId(teacherId: string): Promise<AcademicRecord[]> {
    return this.makeRequest<AcademicRecord[]>(
      `/academic-records?teacher_id=${encodeURIComponent(teacherId)}`
    );
  }

  /**
   * Query records by school ID
   */
  async getRecordsBySchoolId(schoolId: string): Promise<AcademicRecord[]> {
    return this.makeRequest<AcademicRecord[]>(
      `/academic-records?school_id=${encodeURIComponent(schoolId)}`
    );
  }

  /**
   * Query records by class
   */
  async getRecordsByClass(
    schoolId: string,
    academicYear: string,
    grade: string,
    section: string
  ): Promise<AcademicRecord[]> {
    const params = new URLSearchParams({
      school_id: schoolId,
      academic_year: academicYear,
      grade,
      section
    });
    return this.makeRequest<AcademicRecord[]>(`/academic-records?${params.toString()}`);
  }

  /**
   * Generate record ID (client-side utility)
   */
  generateRecordId(
    schoolId: string,
    academicYear: string,
    grade: string,
    section: string,
    subjectId: string
  ): string {
    return `${schoolId}#${academicYear}#${grade}#${section}#${subjectId}`;
  }
}

export const AcademicRecordsService = new AcademicRecordsServiceClass();

