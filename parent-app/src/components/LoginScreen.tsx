import React, { useState } from 'react';
import { AuthService } from '../services/authService';
import { LoginRequest } from '../types';

interface LoginScreenProps {
  onLoginSuccess: (user: any) => void;
  onRegisterClick: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, onRegisterClick }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const loginData: LoginRequest = {
        phone_number: phoneNumber,
        name: name || 'Parent'
      };

      const response = await AuthService.loginWithPhone(loginData);
      onLoginSuccess(response.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
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
    setPhoneNumber(formatted);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '32px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ 
            width: '80px', 
            height: '80px', 
            margin: '0 auto 24px',
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
          <h1 style={{ color: '#4d2917', fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>
            SeedlingLabs
          </h1>
          <h2 style={{ color: '#4d2917', fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
            Parent Portal
          </h2>
          <p style={{ color: '#666', fontSize: '16px' }}>
            Access your child's learning progress
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              color: '#4d2917', 
              fontSize: '14px', 
              fontWeight: '600', 
              marginBottom: '8px' 
            }}>
              Phone Number
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={handlePhoneChange}
              placeholder="(555) 123-4567"
              className="input"
              required
              maxLength={17}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ 
              display: 'block', 
              color: '#4d2917', 
              fontSize: '14px', 
              fontWeight: '600', 
              marginBottom: '8px' 
            }}>
              Your Name (Optional)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="input"
            />
          </div>

          {error && (
            <div className="error" style={{ marginBottom: '20px' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !phoneNumber}
            className="btn btn-primary"
          >
            {loading ? 'Signing In...' : 'Access Dashboard'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button
            type="button"
            onClick={onRegisterClick}
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
            Don't have an account? Register Here
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <p style={{ color: '#666', fontSize: '12px' }}>
            By signing in, you agree to access your child's educational content
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
