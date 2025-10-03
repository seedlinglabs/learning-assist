const AUTH_API_BASE_URL = 'https://xvq11x0421.execute-api.us-west-2.amazonaws.com/pre-prod';

export interface User {
  user_id: string;
  email: string;
  name: string;
  user_type: 'teacher' | 'student' | 'parent' | 'admin';
  class_access: string[]; // Array of class IDs (e.g., ["6A", "6B"] for grade 6 sections A and B)
  school_id: string;
  phone_number?: string;
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  user_type: 'teacher' | 'student' | 'parent' | 'admin';
  class_access?: string[]; // Required for parents (format: ["6A", "7B"] - grade + section)
  school_id?: string;
  phone_number?: string; // Required for parents
}

export interface AuthResponse {
  user: User;
  token: string;
  message: string;
}

export interface ApiError {
  error: string;
}

class AuthServiceClass {
  private token: string | null = null;
  private user: User | null = null;

  constructor() {
    // Load token from localStorage on initialization
    this.token = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('auth_user');
    if (storedUser) {
      try {
        this.user = JSON.parse(storedUser);
      } catch (e) {
        console.error('Error parsing stored user data:', e);
        this.clearAuth();
      }
    }
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${AUTH_API_BASE_URL}${endpoint}`;
    
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      defaultHeaders['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return data;
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    try {
      const response = await this.makeRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      });

      this.token = response.token;
      this.user = response.user;
      
      // Store in localStorage
      localStorage.setItem('auth_token', this.token!);
      localStorage.setItem('auth_user', JSON.stringify(this.user));

      return response;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      const response = await this.makeRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });

      this.token = response.token;
      this.user = response.user;
      
      // Store in localStorage
      localStorage.setItem('auth_token', this.token!);
      localStorage.setItem('auth_user', JSON.stringify(this.user));

      return response;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    this.clearAuth();
  }

  async verifyToken(): Promise<{ valid: boolean; user?: User; error?: string }> {
    if (!this.token) {
      return { valid: false, error: 'No token available' };
    }

    try {
      const response = await this.makeRequest('/auth/verify');
      
      if (response.valid) {
        this.user = response.user;
        localStorage.setItem('auth_user', JSON.stringify(this.user));
        return { valid: true, user: this.user! };
      } else {
        this.clearAuth();
        return { valid: false, error: response.error };
      }
    } catch (error) {
      console.error('Token verification error:', error);
      this.clearAuth();
      return { valid: false, error: error instanceof Error ? error.message : 'Token verification failed' };
    }
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    try {
      const response = await this.makeRequest(`/auth/user/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });

      // Update local user data if updating current user
      if (this.user && this.user.user_id === userId) {
        this.user = { ...this.user, ...response };
        localStorage.setItem('auth_user', JSON.stringify(this.user));
      }

      return response;
    } catch (error) {
      console.error('User update error:', error);
      throw error;
    }
  }

  getCurrentUser(): User | null {
    return this.user;
  }

  getToken(): string | null {
    return this.token;
  }

  isAuthenticated(): boolean {
    return !!this.token && !!this.user;
  }

  hasRole(role: User['user_type']): boolean {
    return this.user?.user_type === role;
  }

  canAccessClass(classId: string): boolean {
    if (!this.user) return false;
    
    // Admins have full access like teachers
    if (this.user.user_type === 'admin' || this.user.user_type === 'teacher') return true;
    
    // Parents can only access their children's classes
    if (this.user.user_type === 'parent') {
      return this.user.class_access.includes(classId);
    }
    
    // Students can access their own class (implementation depends on student-class relationship)
    if (this.user.user_type === 'student') {
      return this.user.class_access.includes(classId);
    }
    
    return false;
  }

  getAccessibleClasses(): string[] {
    if (!this.user) return [];
    
    // Admins and teachers can access all classes (return empty array to indicate full access)
    if (this.user.user_type === 'admin' || this.user.user_type === 'teacher') return [];
    
    // Parents and students have specific class access
    return this.user.class_access;
  }

  private clearAuth(): void {
    this.token = null;
    this.user = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  }
}

// Export singleton instance
export const AuthService = new AuthServiceClass();

// Types are already exported above
