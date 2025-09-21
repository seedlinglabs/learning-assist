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
    classAccess: [] as string[],
    schoolId: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleClassAccessChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const classIds = e.target.value.split(',').map(id => id.trim()).filter(id => id);
    setFormData(prev => ({
      ...prev,
      classAccess: classIds
    }));
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
          class_access: formData.userType === 'parent' ? formData.classAccess : undefined,
          school_id: formData.schoolId || undefined
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
      classAccess: [],
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
                <div className="form-group">
                  <label htmlFor="classAccess">Children's Classes</label>
                  <input
                    type="text"
                    id="classAccess"
                    name="classAccess"
                    value={formData.classAccess.join(', ')}
                    onChange={handleClassAccessChange}
                    placeholder="Enter class IDs separated by commas (e.g., class-1, class-2)"
                    required
                  />
                  <small className="form-help">
                    Enter the class IDs for all classes your children are enrolled in
                  </small>
                </div>
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
