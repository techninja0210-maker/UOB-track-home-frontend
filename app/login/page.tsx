'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import Cookies from 'js-cookie';

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('error');
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await api.post('/api/auth/login', formData);
      
      // Store token in both session storage and cookies
      sessionStorage.setItem('authToken', response.data.token);
      document.cookie = `authToken=${response.data.token}; path=/; max-age=86400`; // 24 hours

      setMessage('Login successful! Redirecting...');
      setMessageType('success');
      
      // Redirect based on user role
      const redirectPath = response.data.user.role === 'admin' ? '/admin' : '/';
      setTimeout(() => {
        router.push(redirectPath);
      }, 1000);

    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Login failed. Please try again.');
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
        
        {/* Hexadecimal Codes */}
        <div className="hex-code hex-1">#1D4F37</div>
        <div className="hex-code hex-2">2D4F747</div>
        <div className="hex-code hex-3">712</div>
        <div className="hex-code hex-4">@121F12</div>
        
        {/* Teal Icons */}
        <div className="teal-icon icon-1">B</div>
        <div className="teal-icon icon-2">B</div>
        
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

      {/* Login Form Container */}
      <div className="crypto-login-form">
        {/* Bitcoin Icon at Top */}
        <div className="form-bitcoin-icon">₿</div>
        
        {/* Input Fields */}
        <div className="input-group">
          <div className="input-icon">👤</div>
          <input 
            type="email" 
            name="email" 
            placeholder="Userin-email" 
            value={formData.email}
            onChange={handleChange}
            className="crypto-input"
            required
          />
        </div>
        
        <div className="input-group">
          <div className="input-icon">🔒</div>
          <input 
            type="password" 
            name="password" 
            placeholder="Password" 
            value={formData.password}
            onChange={handleChange}
            className="crypto-input"
            required
          />
        </div>
        
        {/* Login Button */}
        <button 
          type="submit" 
          onClick={handleSubmit}
          className="crypto-login-btn"
          disabled={loading}
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
        
        {/* Action Links */}
        <div className="crypto-links">
          <Link href="/forgot-password" className="crypto-link forgot-link">Forgot Password?</Link>
          <Link href="/signup" className="crypto-link signup-link">Sign Up</Link>
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

        .hex-code {
          position: absolute;
          color: #888;
          font-size: 0.8rem;
          font-family: 'Courier New', monospace;
          opacity: 0.6;
        }

        .hex-1 { top: 15%; left: 8%; }
        .hex-2 { top: 45%; left: 5%; }
        .hex-3 { top: 60%; right: 20%; }
        .hex-4 { top: 25%; right: 10%; }

        .teal-icon {
          position: absolute;
          color: #00CED1;
          font-size: 1.5rem;
          font-weight: bold;
          opacity: 0.4;
        }

        .icon-1 { top: 40%; left: 8%; }
        .icon-2 { top: 55%; right: 25%; }

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

        .crypto-login-form {
          position: relative;
          z-index: 10;
          background: #2C2C2C;
          border: 2px solid #FFD700;
          border-radius: 15px;
          padding: 2rem;
          width: 400px;
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
          position: relative;
          margin-bottom: 1.5rem;
        }

        .input-icon {
          position: absolute;
          left: 15px;
          top: 50%;
          transform: translateY(-50%);
          color: #888;
          font-size: 1.2rem;
          z-index: 2;
        }

        .crypto-input {
          width: 100%;
          padding: 1rem 1rem 1rem 3rem;
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

        .crypto-login-btn {
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

        .crypto-login-btn:hover:not(:disabled) {
          background: linear-gradient(180deg, #FFE55C, #CD853F);
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(255, 215, 0, 0.4);
        }

        .crypto-login-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .crypto-links {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .crypto-link {
          color: #00CED1;
          text-decoration: underline;
          font-weight: bold;
          font-size: 0.9rem;
          transition: color 0.3s ease;
        }

        .crypto-link:hover {
          color: #20E6E6;
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
          
          .crypto-login-form {
            width: 95%;
            padding: 1.5rem;
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

