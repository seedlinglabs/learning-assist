export interface Parent {
  user_id: string;
  email: string;
  name: string;
  user_type: 'parent';
  class_access: string[];
  school_id: string;
  phone_number?: string;
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

export interface Subject {
  id: string;
  name: string;
  description?: string;
  class_id: string;
  school_id: string;
  school_name?: string;
  class_name?: string;
  created_at: string | Date;
  updated_at: string | Date;
}

export interface Topic {
  id: string;
  name: string;
  description?: string;
  subject_id: string;
  school_id: string;
  class_id: string;
  created_at: string;
  updated_at: string;
  aiContent?: {
    lessonPlan?: string;
    teachingGuide?: string;
    groupDiscussion?: string;
    assessmentQuestions?: string;
    worksheets?: string;
    videos?: Array<{
      title: string;
      url: string;
      duration?: string;
    }>;
    generatedAt?: string;
    classLevel?: string;
  };
}

export interface LoginRequest {
  phone_number: string;
  password: string;
  name?: string;
  class_access?: string[];
  school_id?: string;
}

export interface AuthResponse {
  user: Parent;
  token: string;
  message: string;
}

export interface ApiError {
  error: string;
}
