import { Parent, LoginRequest, AuthResponse } from '../types';

const AUTH_API_BASE_URL = 'https://xvq11x0421.execute-api.us-west-2.amazonaws.com/pre-prod';

class AuthServiceClass {
  private token: string | null = null;
  private user: Parent | null = null;

  constructor() {
    this.token = localStorage.getItem('parent_auth_token');
    const storedUser = localStorage.getItem('parent_auth_user');
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

  async loginWithPhone(phoneData: LoginRequest): Promise<AuthResponse> {
    try {
      console.log('Attempting login with phone data:', phoneData);
      const response = await this.makeRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify(phoneData),
      });

      console.log('Login response:', response);
      this.token = response.token;
      this.user = response.user;
      
      localStorage.setItem('parent_auth_token', this.token!);
      localStorage.setItem('parent_auth_user', JSON.stringify(this.user));

      console.log('Token stored:', this.token);
      console.log('User stored:', this.user);

      return response;
    } catch (error) {
      console.error('Phone login error:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    this.clearAuth();
  }

  async verifyToken(): Promise<{ valid: boolean; user?: Parent; error?: string }> {
    if (!this.token) {
      return { valid: false, error: 'No token available' };
    }

    try {
      const response = await this.makeRequest('/auth/verify');
      
      if (response.valid) {
        this.user = response.user;
        localStorage.setItem('parent_auth_user', JSON.stringify(this.user));
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

  getCurrentUser(): Parent | null {
    return this.user;
  }

  getToken(): string | null {
    return this.token;
  }

  isAuthenticated(): boolean {
    return !!this.token && !!this.user;
  }

  getAccessibleClasses(): string[] {
    if (!this.user) return [];
    return this.user.class_access;
  }

  private clearAuth(): void {
    this.token = null;
    this.user = null;
    localStorage.removeItem('parent_auth_token');
    localStorage.removeItem('parent_auth_user');
  }
}

export const AuthService = new AuthServiceClass();
