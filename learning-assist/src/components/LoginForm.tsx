import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LoginRequest, RegisterRequest } from '../services/authService';

interface LoginFormProps {
  onSuccess?: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const { login, register, isLoading, error, clearError } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    userType: 'teacher' as 'teacher' | 'student' | 'parent',
    phoneNumber: '',
    selectedGrades: [] as string[], // For building class_access
    selectedSections: [] as string[], // For building class_access
    schoolId: ''
  });
  
  const availableGrades = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  const availableSections = ['A', 'B', 'C', 'D', 'E', 'F'];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleGradeToggle = (grade: string) => {
    setFormData(prev => ({
      ...prev,
      selectedGrades: prev.selectedGrades.includes(grade)
        ? prev.selectedGrades.filter(g => g !== grade)
        : [...prev.selectedGrades, grade]
    }));
  };

  const handleSectionToggle = (section: string) => {
    setFormData(prev => ({
      ...prev,
      selectedSections: prev.selectedSections.includes(section)
        ? prev.selectedSections.filter(s => s !== section)
        : [...prev.selectedSections, section]
    }));
  };

  // Build class_access array in format "6A", "7B", etc.
  const buildClassAccess = (): string[] => {
    const classAccess: string[] = [];
    for (const grade of formData.selectedGrades) {
      for (const section of formData.selectedSections) {
        classAccess.push(`${grade}${section}`);
      }
    }
    return classAccess;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    try {
      if (isRegistering) {
        const registerData: RegisterRequest = {
          email: formData.email,
          password: formData.password,
          name: formData.name,
          user_type: formData.userType,
          class_access: formData.userType === 'parent' ? buildClassAccess() : undefined,
          school_id: formData.schoolId || undefined,
          phone_number: formData.userType === 'parent' ? formData.phoneNumber : undefined
        };
        await register(registerData);
      } else {
        const loginData: LoginRequest = {
          email: formData.email,
          password: formData.password
        };
        await login(loginData);
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      // Error is handled by the auth context
      console.error('Auth error:', error);
    }
  };

  const toggleMode = () => {
    setIsRegistering(!isRegistering);
    clearError();
    setFormData({
      email: '',
      password: '',
      name: '',
      userType: 'teacher',
      phoneNumber: '',
      selectedGrades: [],
      selectedSections: [],
      schoolId: ''
    });
  };

  return (
    <div className="auth-container">
      <div className="auth-form">
        <div className="auth-header">
          <h2>{isRegistering ? 'Create Account' : 'Welcome Back'}</h2>
          <p>{isRegistering ? 'Join the Learning Assistant platform' : 'Sign in to your account'}</p>
        </div>

        {error && (
          <div className="error-message">
            <span>{error}</span>
            <button onClick={clearError}>×</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form-content">
          {isRegistering && (
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter your full name"
                required
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <div className="input-with-icon">
              <Mail size={20} className="input-icon" />
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter your email"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-with-icon">
              <Lock size={20} className="input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter your password"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="password-toggle"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {isRegistering && (
            <>
              <div className="form-group">
                <label htmlFor="userType">Account Type</label>
                <select
                  id="userType"
                  name="userType"
                  value={formData.userType}
                  onChange={handleInputChange}
                  required
                >
                  <option value="teacher">Teacher</option>
                  <option value="parent">Parent</option>
                  <option value="student">Student</option>
                </select>
              </div>

              {formData.userType === 'parent' && (
                <>
                  <div className="form-group">
                    <label htmlFor="phoneNumber">Phone Number * (10 digits)</label>
                    <input
                      type="tel"
                      id="phoneNumber"
                      name="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setFormData({...formData, phoneNumber: digits});
                      }}
                      placeholder="9876543210"
                      required
                      maxLength={10}
                      minLength={10}
                      pattern="[0-9]{10}"
                    />
                  </div>

                  <div className="form-group">
                    <label>Select Grade(s) *</label>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(6, 1fr)', 
                      gap: '8px', 
                      marginTop: '8px' 
                    }}>
                      {availableGrades.map((grade) => (
                        <label
                          key={grade}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '8px',
                            border: `2px solid ${formData.selectedGrades.includes(grade) ? 'var(--primary-color)' : 'var(--border-color)'}`,
                            borderRadius: '6px',
                            cursor: 'pointer',
                            backgroundColor: formData.selectedGrades.includes(grade) ? 'var(--primary-color-light, rgba(76, 175, 80, 0.1))' : 'transparent',
                            transition: 'all 0.2s',
                            fontSize: '14px',
                            fontWeight: '500'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={formData.selectedGrades.includes(grade)}
                            onChange={() => handleGradeToggle(grade)}
                            style={{ display: 'none' }}
                          />
                          {grade}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Select Section(s) *</label>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(6, 1fr)', 
                      gap: '8px', 
                      marginTop: '8px' 
                    }}>
                      {availableSections.map((section) => (
                        <label
                          key={section}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '8px',
                            border: `2px solid ${formData.selectedSections.includes(section) ? 'var(--primary-color)' : 'var(--border-color)'}`,
                            borderRadius: '6px',
                            cursor: 'pointer',
                            backgroundColor: formData.selectedSections.includes(section) ? 'var(--primary-color-light, rgba(76, 175, 80, 0.1))' : 'transparent',
                            transition: 'all 0.2s',
                            fontSize: '14px',
                            fontWeight: '500'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={formData.selectedSections.includes(section)}
                            onChange={() => handleSectionToggle(section)}
                            style={{ display: 'none' }}
                          />
                          {section}
                        </label>
                      ))}
                    </div>
                    {formData.selectedGrades.length > 0 && formData.selectedSections.length > 0 && (
                      <small className="form-help" style={{ marginTop: '8px', display: 'block' }}>
                        Selected: {buildClassAccess().join(', ')}
                      </small>
                    )}
                  </div>
                </>
              )}

              <div className="form-group">
                <label htmlFor="schoolId">School ID (Optional)</label>
                <input
                  type="text"
                  id="schoolId"
                  name="schoolId"
                  value={formData.schoolId}
                  onChange={handleInputChange}
                  placeholder="Enter school ID (optional)"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={isLoading}
          >
            {isLoading ? (
              <span>Processing...</span>
            ) : (
              <>
                {isRegistering ? <UserPlus size={20} /> : <LogIn size={20} />}
                <span>{isRegistering ? 'Create Account' : 'Sign In'}</span>
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            {isRegistering ? 'Already have an account?' : "Don't have an account?"}
            <button onClick={toggleMode} className="auth-toggle-btn">
              {isRegistering ? 'Sign In' : 'Create Account'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
