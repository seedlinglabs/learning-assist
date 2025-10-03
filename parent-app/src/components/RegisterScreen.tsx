import React, { useState, useEffect } from 'react';
import { AuthService } from '../services/authService';
import { StaticDataService } from '../services/staticDataService';

interface RegisterScreenProps {
  onRegisterSuccess: (user: any) => void;
  onBackToLogin: () => void;
}

const RegisterScreen: React.FC<RegisterScreenProps> = ({ onRegisterSuccess, onBackToLogin }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phoneNumber: '',
    schoolId: '',
    selectedGrades: [] as string[],
    selectedSections: [] as string[]
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [schools, setSchools] = useState<Array<{ id: string; name: string }>>([]);

  const availableGrades = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  const availableSections = ['A', 'B', 'C', 'D', 'E', 'F'];

  useEffect(() => {
    // Load schools from static data
    const schoolsData = StaticDataService.getAllSchools();
    setSchools(schoolsData.map(school => ({ id: school.id, name: school.name })));
  }, []);

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

  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, '');
    
    if (digits.length <= 10) {
      if (digits.length <= 3) return digits;
      if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    }
    
    return `+${digits}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setFormData(prev => ({ ...prev, phoneNumber: formatted }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    if (!formData.schoolId) {
      setError('Please select a school');
      setLoading(false);
      return;
    }

    if (formData.selectedGrades.length === 0) {
      setError('Please select at least one grade');
      setLoading(false);
      return;
    }

    if (formData.selectedSections.length === 0) {
      setError('Please select at least one section');
      setLoading(false);
      return;
    }

    try {
      const classAccess = buildClassAccess();
      
      const registerData = {
        email: formData.email,
        password: formData.password,
        name: formData.name,
        user_type: 'parent' as const,
        phone_number: formData.phoneNumber,
        school_id: formData.schoolId,
        class_access: classAccess
      };

      const response = await AuthService.register(registerData);
      onRegisterSuccess(response.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const classAccessPreview = buildClassAccess();

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '16px',
      backgroundColor: '#f5f5f5'
    }}>
      <div className="card" style={{ 
        width: '100%', 
        maxWidth: '500px', 
        padding: '24px',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ 
            width: '60px', 
            height: '60px', 
            margin: '0 auto 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <img 
              src="/SeedlingLabsLogo.png" 
              alt="SeedlingLabs Logo" 
              style={{ width: '100%', height: '100%' }}
            />
          </div>
          <h1 style={{ color: '#4d2917', fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>
            Create Parent Account
          </h1>
          <p style={{ color: '#666', fontSize: '14px' }}>
            Register to access your child's learning progress
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Name */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ 
              display: 'block', 
              color: '#4d2917', 
              fontSize: '14px', 
              fontWeight: '600', 
              marginBottom: '6px' 
            }}>
              Full Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter your full name"
              className="input"
              required
              style={{ fontSize: '16px' }}
            />
          </div>

          {/* Email */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ 
              display: 'block', 
              color: '#4d2917', 
              fontSize: '14px', 
              fontWeight: '600', 
              marginBottom: '6px' 
            }}>
              Email Address *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="your.email@example.com"
              className="input"
              required
              style={{ fontSize: '16px' }}
            />
          </div>

          {/* Phone Number */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ 
              display: 'block', 
              color: '#4d2917', 
              fontSize: '14px', 
              fontWeight: '600', 
              marginBottom: '6px' 
            }}>
              Phone Number *
            </label>
            <input
              type="tel"
              value={formData.phoneNumber}
              onChange={handlePhoneChange}
              placeholder="(555) 123-4567"
              className="input"
              required
              maxLength={17}
              style={{ fontSize: '16px' }}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ 
              display: 'block', 
              color: '#4d2917', 
              fontSize: '14px', 
              fontWeight: '600', 
              marginBottom: '6px' 
            }}>
              Password *
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              placeholder="At least 6 characters"
              className="input"
              required
              minLength={6}
              style={{ fontSize: '16px' }}
            />
          </div>

          {/* Confirm Password */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ 
              display: 'block', 
              color: '#4d2917', 
              fontSize: '14px', 
              fontWeight: '600', 
              marginBottom: '6px' 
            }}>
              Confirm Password *
            </label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
              placeholder="Re-enter password"
              className="input"
              required
              style={{ fontSize: '16px' }}
            />
          </div>

          {/* School Selection */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ 
              display: 'block', 
              color: '#4d2917', 
              fontSize: '14px', 
              fontWeight: '600', 
              marginBottom: '6px' 
            }}>
              School *
            </label>
            <select
              value={formData.schoolId}
              onChange={(e) => setFormData(prev => ({ ...prev, schoolId: e.target.value }))}
              className="input"
              required
              style={{ fontSize: '16px' }}
            >
              <option value="">Select your child's school</option>
              {schools.map(school => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
          </div>

          {/* Grade Selection */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ 
              display: 'block', 
              color: '#4d2917', 
              fontSize: '14px', 
              fontWeight: '600', 
              marginBottom: '8px' 
            }}>
              Select Grade(s) *
            </label>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(6, 1fr)', 
              gap: '8px'
            }}>
              {availableGrades.map((grade) => (
                <button
                  key={grade}
                  type="button"
                  onClick={() => handleGradeToggle(grade)}
                  style={{
                    padding: '12px 8px',
                    border: `2px solid ${formData.selectedGrades.includes(grade) ? '#c4963d' : '#ddd'}`,
                    borderRadius: '8px',
                    backgroundColor: formData.selectedGrades.includes(grade) ? '#c4963d' : 'white',
                    color: formData.selectedGrades.includes(grade) ? 'white' : '#4d2917',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {grade}
                </button>
              ))}
            </div>
          </div>

          {/* Section Selection */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ 
              display: 'block', 
              color: '#4d2917', 
              fontSize: '14px', 
              fontWeight: '600', 
              marginBottom: '8px' 
            }}>
              Select Section(s) *
            </label>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(6, 1fr)', 
              gap: '8px'
            }}>
              {availableSections.map((section) => (
                <button
                  key={section}
                  type="button"
                  onClick={() => handleSectionToggle(section)}
                  style={{
                    padding: '12px 8px',
                    border: `2px solid ${formData.selectedSections.includes(section) ? '#c4963d' : '#ddd'}`,
                    borderRadius: '8px',
                    backgroundColor: formData.selectedSections.includes(section) ? '#c4963d' : 'white',
                    color: formData.selectedSections.includes(section) ? 'white' : '#4d2917',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {section}
                </button>
              ))}
            </div>
            {classAccessPreview.length > 0 && (
              <div style={{ 
                marginTop: '8px', 
                padding: '8px 12px', 
                backgroundColor: '#f9f5e8', 
                borderRadius: '6px',
                border: '1px solid #c4963d'
              }}>
                <p style={{ color: '#4d2917', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                  Selected Classes:
                </p>
                <p style={{ color: '#666', fontSize: '12px' }}>
                  {classAccessPreview.join(', ')}
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="error" style={{ marginBottom: '16px', fontSize: '14px' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', fontSize: '16px', padding: '14px' }}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button
            onClick={onBackToLogin}
            style={{
              background: 'none',
              border: 'none',
              color: '#c4963d',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            Already have an account? Sign In
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <p style={{ color: '#999', fontSize: '11px' }}>
            By creating an account, you agree to access your child's educational content
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterScreen;

