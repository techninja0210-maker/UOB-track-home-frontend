'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

export default function SignupPage() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('error');
  const [fieldValidation, setFieldValidation] = useState({
    username: false,
    email: false,
    password: false,
    confirmPassword: false
  });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Real-time validation
    validateField(name, value);
  };

  const validateField = (name: string, value: string) => {
    let isValid = false;
    
    switch (name) {
      case 'username':
        isValid = value.length >= 3;
        break;
      case 'email':
        isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        break;
      case 'password':
        isValid = value.length >= 6;
        break;
      case 'confirmPassword':
        isValid = value === formData.password && value.length > 0;
        break;
    }
    
    setFieldValidation(prev => ({
      ...prev,
      [name]: isValid
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    // Validation
    if (!termsAccepted) {
      setMessage('Please accept the terms and conditions');
      setMessageType('error');
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setMessage('Passwords do not match');
      setMessageType('error');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setMessage('Password must be at least 6 characters long');
      setMessageType('error');
      setLoading(false);
      return;
    }

    try {
      await api.post('/api/auth/signup', {
        fullName: formData.username,
        email: formData.email,
        password: formData.password
      });

      setMessage('Account created successfully! Please sign in.');
      setMessageType('success');
      
      // Redirect to login page
      setTimeout(() => {
        router.push('/login');
      }, 2000);

    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Signup failed. Please try again.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="crypto-auth-container">
      {/* Background Elements */}
      <div className="crypto-background">
        {/* Floating Bitcoin Icons */}
        <div className="floating-bitcoin bitcoin-1">₿</div>
        <div className="floating-bitcoin bitcoin-2">₿</div>
        <div className="floating-bitcoin bitcoin-3">₿</div>
        <div className="floating-bitcoin bitcoin-4">₿</div>
        
        {/* Circuit Board Patterns */}
        <div className="circuit-pattern pattern-1"></div>
        <div className="circuit-pattern pattern-2"></div>
        
        {/* Light Rays */}
        <div className="light-rays"></div>
      </div>

      {/* Main Title */}
      <div className="crypto-title">
        <span className="title-gold">UOB Security</span>
        <span className="title-white">House</span>
      </div>

      {/* Signup Form Container */}
      <div className="crypto-signup-form">
        {/* Bitcoin Icon at Top */}
        <div className="form-bitcoin-icon">₿</div>
        
        {/* Input Fields */}
        <div className="input-group">
          <div className="field-label">Username</div>
          <div className="input-container">
            <input 
              type="text" 
              name="username" 
              placeholder="#1F11127" 
              value={formData.username}
              onChange={handleChange}
              className="crypto-input"
              required
            />
            <div className={`validation-icon ${fieldValidation.username ? 'valid' : 'invalid'}`}>
              {fieldValidation.username ? '✓' : '!'}
            </div>
          </div>
        </div>
        
        <div className="input-group">
          <div className="field-label">Email</div>
          <div className="input-container">
            <input 
              type="email" 
              name="email" 
              placeholder="Email" 
              value={formData.email}
              onChange={handleChange}
              className="crypto-input"
              required
            />
            <div className={`validation-icon ${fieldValidation.email ? 'valid' : 'invalid'}`}>
              {fieldValidation.email ? '✓' : '!'}
            </div>
          </div>
        </div>
        
        <div className="input-group">
          <div className="field-label">Password</div>
          <div className="input-container">
            <input 
              type="password" 
              name="password" 
              placeholder="Password" 
              value={formData.password}
              onChange={handleChange}
              className="crypto-input"
              required
            />
            <div className={`validation-icon ${fieldValidation.password ? 'valid' : 'invalid'}`}>
              {fieldValidation.password ? '✓' : '!'}
            </div>
          </div>
        </div>
        
        <div className="input-group">
          <div className="field-label">Confirm Password</div>
          <div className="input-container">
            <input 
              type="password" 
              name="confirmPassword" 
              placeholder="Confirm Password" 
              value={formData.confirmPassword}
              onChange={handleChange}
              className="crypto-input"
              required
            />
            <div className={`validation-icon ${fieldValidation.confirmPassword ? 'valid' : 'invalid'}`}>
              {fieldValidation.confirmPassword ? '✓' : '!'}
            </div>
          </div>
        </div>
        
        {/* Sign Up Button */}
        <button 
          type="submit" 
          onClick={handleSubmit}
          className="crypto-signup-btn"
          disabled={loading}
        >
          {loading ? 'Creating account...' : 'Sign Up'}
        </button>
        
        {/* Back to Login Link */}
        <Link href="/login" className="crypto-back-link">Back to Login</Link>
        
        {/* Terms and Conditions */}
        <div className="terms-section">
          <div className="checkbox-container">
            <input 
              type="checkbox" 
              id="terms" 
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="terms-checkbox"
            />
            <label htmlFor="terms" className="terms-label">
              I agree to the terms and conditions
            </label>
          </div>
          <div className="terms-text">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
          </div>
        </div>
      </div>

      {/* Error/Success Messages */}
      {message && (
        <div className={`crypto-message ${messageType}`}>
          <span>{message}</span>
        </div>
      )}

      <style jsx>{`
        .crypto-auth-container {
          min-height: 100vh;
          background: #000000;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          font-family: 'Arial', sans-serif;
          padding: 2rem 1rem;
        }

        .crypto-background {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 1;
        }

        .floating-bitcoin {
          position: absolute;
          color: #FFD700;
          font-size: 2rem;
          font-weight: bold;
          opacity: 0.3;
          animation: float 6s ease-in-out infinite;
        }

        .bitcoin-1 { top: 10%; left: 5%; animation-delay: 0s; }
        .bitcoin-2 { top: 20%; right: 10%; animation-delay: 2s; }
        .bitcoin-3 { bottom: 30%; left: 8%; animation-delay: 4s; }
        .bitcoin-4 { bottom: 20%; right: 15%; animation-delay: 1s; }

        .circuit-pattern {
          position: absolute;
          width: 200px;
          height: 200px;
          opacity: 0.1;
        }

        .pattern-1 {
          bottom: 0;
          left: 0;
          background: linear-gradient(45deg, #FFD700, transparent);
          clip-path: polygon(0 100%, 100% 0, 100% 100%);
        }

        .pattern-2 {
          top: 0;
          right: 0;
          background: linear-gradient(45deg, #00CED1, transparent);
          clip-path: polygon(0 0, 100% 0, 0 100%);
        }

        .light-rays {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(45deg, transparent 30%, rgba(255, 215, 0, 0.05) 50%, transparent 70%);
          animation: lightSweep 8s ease-in-out infinite;
        }

        .crypto-title {
          position: relative;
          z-index: 10;
          margin-bottom: 2rem;
          text-align: center;
        }

        .title-gold {
          color: #FFD700;
          font-size: 2.5rem;
          font-weight: bold;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
          background: linear-gradient(45deg, #FFD700, #B8860B);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .title-white {
          color: #FFFFFF;
          font-size: 2.5rem;
          font-weight: bold;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
        }

        .crypto-signup-form {
          position: relative;
          z-index: 10;
          background: #2C2C2C;
          border: 2px solid #FFD700;
          border-radius: 15px;
          padding: 2.5rem 2rem;
          width: 450px;
          max-width: 90%;
          box-shadow: 0 0 30px rgba(255, 215, 0, 0.3);
        }

        .form-bitcoin-icon {
          position: absolute;
          top: -25px;
          left: 50%;
          transform: translateX(-50%);
          color: #FFD700;
          font-size: 3rem;
          font-weight: bold;
          background: #2C2C2C;
          padding: 0.5rem;
          border-radius: 50%;
          border: 2px solid #FFD700;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
        }

        .input-group {
          margin-bottom: 1.5rem;
        }

        .field-label {
          color: #FFFFFF;
          font-weight: bold;
          margin-bottom: 0.5rem;
          display: block;
        }

        .input-container {
          position: relative;
          display: flex;
          align-items: center;
        }

        .crypto-input {
          flex: 1;
          padding: 1rem;
          background: #3A3A3A;
          border: 1px solid #555;
          border-radius: 8px;
          color: #FFFFFF;
          font-size: 1rem;
          outline: none;
          transition: all 0.3s ease;
        }

        .crypto-input:focus {
          border-color: #FFD700;
          box-shadow: 0 0 10px rgba(255, 215, 0, 0.3);
        }

        .crypto-input::placeholder {
          color: #888;
        }

        .validation-icon {
          position: absolute;
          right: 15px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8rem;
          font-weight: bold;
          color: white;
        }

        .validation-icon.valid {
          background: #00C853;
        }

        .validation-icon.invalid {
          background: #FF0000;
        }

        .crypto-signup-btn {
          width: 100%;
          padding: 1rem;
          background: linear-gradient(180deg, #FFD700, #B8860B);
          border: none;
          border-radius: 8px;
          color: #FFFFFF;
          font-size: 1.1rem;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-bottom: 1.5rem;
        }

        .crypto-signup-btn:hover:not(:disabled) {
          background: linear-gradient(180deg, #FFE55C, #CD853F);
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(255, 215, 0, 0.4);
        }

        .crypto-signup-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .crypto-back-link {
          display: block;
          text-align: center;
          color: #00CED1;
          text-decoration: underline;
          font-weight: bold;
          font-size: 0.9rem;
          margin-bottom: 1.5rem;
          transition: color 0.3s ease;
        }

        .crypto-back-link:hover {
          color: #20E6E6;
        }

        .terms-section {
          margin-top: 1rem;
        }

        .checkbox-container {
          display: flex;
          align-items: center;
          margin-bottom: 1rem;
        }

        .terms-checkbox {
          margin-right: 0.5rem;
          width: 18px;
          height: 18px;
          accent-color: #FFD700;
        }

        .terms-label {
          color: #FFFFFF;
          font-weight: bold;
          cursor: pointer;
        }

        .terms-text {
          color: #888;
          font-size: 0.8rem;
          line-height: 1.4;
          max-height: 100px;
          overflow-y: auto;
        }

        .crypto-message {
          position: fixed;
          top: 20px;
          right: 20px;
          padding: 1rem 2rem;
          border-radius: 8px;
          font-weight: bold;
          z-index: 1000;
          max-width: 300px;
        }

        .crypto-message.success {
          background: #4CAF50;
          color: white;
        }

        .crypto-message.error {
          background: #f44336;
          color: white;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(10deg); }
        }

        @keyframes lightSweep {
          0%, 100% { opacity: 0.1; }
          50% { opacity: 0.3; }
        }

        @media (max-width: 480px) {
          .crypto-title .title-gold,
          .crypto-title .title-white {
            font-size: 2rem;
          }
          
          .crypto-signup-form {
            width: 95%;
            padding: 2rem 1.5rem;
          }
          
          .form-bitcoin-icon {
            font-size: 2.5rem;
            top: -20px;
          }
        }
      `}</style>
    </div>
  );
}

