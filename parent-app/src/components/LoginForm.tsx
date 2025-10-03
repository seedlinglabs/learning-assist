import React, { useState } from 'react';
import { AuthService } from '../services/authService';
import { LoginRequest } from '../types';

interface LoginFormProps {
  onLoginSuccess: (user: any) => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess }) => {
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
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // Format as +1 (XXX) XXX-XXXX for US numbers
    if (digits.length <= 10) {
      if (digits.length <= 3) return digits;
      if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    }
    
    // For longer numbers, just add + prefix
    return `+${digits}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
  };

  return (
    <div>
      <div>
        <div>
          <div>
            <h1>SeedlingLabs</h1>
            <h2>Parent Dashboard</h2>
            <p>Enter your phone number to access your child's learning progress</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div>
              <label htmlFor="phone">
                Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                value={phoneNumber}
                onChange={handlePhoneChange}
                placeholder="(555) 123-4567"
                required
                maxLength={17}
              />
            </div>

            <div>
              <label htmlFor="name">
                Your Name (Optional)
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
              />
            </div>

            {error && (
              <div>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !phoneNumber}
            >
              {loading ? 'Signing In...' : 'Access Dashboard'}
            </button>
          </form>

          <div>
            <p>
              By signing in, you agree to access your child's educational content
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
