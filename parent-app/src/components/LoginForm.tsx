import React, { useState } from 'react';
import { Smartphone, User, ArrowRight, AlertCircle } from 'lucide-react';
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        <div className="card p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Smartphone className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Parent Dashboard</h1>
            <p className="text-gray-600">Enter your phone number to access your child's learning progress</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <div className="relative">
                <Smartphone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="phone"
                  type="tel"
                  value={phoneNumber}
                  onChange={handlePhoneChange}
                  placeholder="(555) 123-4567"
                  className="input pl-10"
                  required
                  maxLength={17}
                />
              </div>
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Your Name (Optional)
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="input pl-10"
                />
              </div>
            </div>

            {error && (
              <div className="error-message flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !phoneNumber}
              className="btn btn-primary w-full"
            >
              {loading ? (
                <>
                  <div className="loading-spinner" />
                  Signing In...
                </>
              ) : (
                <>
                  Access Dashboard
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              By signing in, you agree to access your child's educational content
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
