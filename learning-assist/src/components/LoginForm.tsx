import React, { useState } from 'react';
import { Mail, Lock, LogIn, UserPlus, User, Phone, School as SchoolIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LoginRequest, RegisterRequest } from '../services/authService';
import { Input, Button, Select } from './common';

interface LoginFormProps {
  onSuccess?: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const { login, register, isLoading, error, clearError } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    userType: 'teacher' as 'teacher' | 'student' | 'parent',
    phoneNumber: '',
    selectedGrades: [] as string[],
    selectedSections: [] as string[],
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
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-8 animate-scale-in">
          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              {isRegistering ? 'Create Account' : 'Welcome Back'}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {isRegistering ? 'Join Sprout AI Learning Assistant' : 'Sign in to your account'}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-error-50 dark:bg-error-900/30 border border-error-200 dark:border-error-800 rounded-lg flex items-start gap-3 animate-slide-in">
              <span className="flex-1 text-sm text-error-800 dark:text-error-300">{error}</span>
              <button 
                onClick={clearError}
                className="text-error-600 dark:text-error-400 hover:text-error-800 dark:hover:text-error-200 transition-colors"
              >
                ×
              </button>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name Field - Registration Only */}
            {isRegistering && (
              <Input
                label="Full Name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                leftIcon={<User size={18} />}
                placeholder="Enter your full name"
                required
                floating
              />
            )}

            {/* Email Field */}
            <Input
              label="Email Address"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              leftIcon={<Mail size={18} />}
              placeholder="Enter your email"
              required
              floating
            />

            {/* Password Field */}
            <Input
              label="Password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              leftIcon={<Lock size={18} />}
              placeholder="Enter your password"
              required
              minLength={6}
              helperText={isRegistering ? "Minimum 6 characters" : undefined}
              floating
            />

            {/* Registration Additional Fields */}
            {isRegistering && (
              <>
                {/* User Type */}
                <Select
                  label="Account Type"
                  name="userType"
                  value={formData.userType}
                  onChange={handleInputChange}
                  options={[
                    { value: 'teacher', label: 'Teacher' },
                    { value: 'parent', label: 'Parent' },
                    { value: 'student', label: 'Student' }
                  ]}
                  fullWidth
                  required
                />

                {/* Parent-Specific Fields */}
                {formData.userType === 'parent' && (
                  <>
                    <Input
                      label="Phone Number"
                      type="tel"
                      name="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setFormData({...formData, phoneNumber: digits});
                      }}
                      leftIcon={<Phone size={18} />}
                      placeholder="10-digit phone number"
                      required
                      maxLength={10}
                      minLength={10}
                      pattern="[0-9]{10}"
                      helperText="Required for parent accounts"
                      floating
                    />

                    {/* Grade Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Select Grade(s) *
                      </label>
                      <div className="grid grid-cols-6 gap-2">
                        {availableGrades.map((grade) => (
                          <button
                            key={grade}
                            type="button"
                            onClick={() => handleGradeToggle(grade)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                              formData.selectedGrades.includes(grade)
                                ? 'bg-primary-600 text-white shadow-md'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                          >
                            {grade}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Section Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Select Section(s) *
                      </label>
                      <div className="grid grid-cols-6 gap-2">
                        {availableSections.map((section) => (
                          <button
                            key={section}
                            type="button"
                            onClick={() => handleSectionToggle(section)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                              formData.selectedSections.includes(section)
                                ? 'bg-primary-600 text-white shadow-md'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                          >
                            {section}
                          </button>
                        ))}
                      </div>
                      {formData.selectedGrades.length > 0 && formData.selectedSections.length > 0 && (
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                          Selected: {buildClassAccess().join(', ')}
                        </p>
                      )}
                    </div>
                  </>
                )}

                {/* School ID - Optional */}
                <Input
                  label="School ID (Optional)"
                  name="schoolId"
                  value={formData.schoolId}
                  onChange={handleInputChange}
                  leftIcon={<SchoolIcon size={18} />}
                  placeholder="Enter school ID"
                  floating
                />
              </>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isLoading}
              leftIcon={isLoading ? undefined : (isRegistering ? <UserPlus size={20} /> : <LogIn size={20} />)}
            >
              {isRegistering ? 'Create Account' : 'Sign In'}
            </Button>
          </form>

          {/* Toggle Mode */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {isRegistering ? 'Already have an account?' : "Don't have an account?"}
              {' '}
              <button
                type="button"
                onClick={toggleMode}
                className="font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
              >
                {isRegistering ? 'Sign In' : 'Create Account'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;

