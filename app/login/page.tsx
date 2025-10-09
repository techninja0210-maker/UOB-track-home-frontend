'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import Cookies from 'js-cookie';

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    keepSignedIn: false
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('error');
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await axios.post('/api/auth/login', formData);
      
      // Store token based on keepSignedIn preference
      if (formData.keepSignedIn) {
        Cookies.set('authToken', response.data.token, { expires: 30 });
      } else {
        sessionStorage.setItem('authToken', response.data.token);
      }

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
    <div className="auth-container">
      {/* Background Logo */}
      <div className="background-logo">
        <div className="logo-container">
          <div className="logo-icon">
            <div className="icon-shape shape-1"></div>
            <div className="icon-shape shape-2"></div>
          </div>
          <span className="logo-text">UOB Security House</span>
        </div>
      </div>

      {/* Auth Card */}
      <div className="auth-card">
        <div className="auth-header">
          <h1>Sign in</h1>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {/* Email Address */}
          <div className="form-group">
            <label htmlFor="email" className="form-label">Email Address</label>
            <input 
              type="email" 
              className="form-control" 
              id="email" 
              name="email" 
              value={formData.email}
              onChange={handleChange}
              required 
            />
          </div>

          {/* Password */}
          <div className="form-group">
            <label htmlFor="password" className="form-label">Password</label>
            <input 
              type="password" 
              className="form-control" 
              id="password" 
              name="password" 
              value={formData.password}
              onChange={handleChange}
              required 
            />
          </div>

          {/* Keep me signed in */}
          <div className="form-group checkbox-group">
            <input 
              type="checkbox" 
              className="form-check-input" 
              id="keepSignedIn" 
              name="keepSignedIn"
              checked={formData.keepSignedIn}
              onChange={handleChange}
            />
            <label htmlFor="keepSignedIn" className="form-check-label">Keep me signed in</label>
          </div>

          {/* Sign In Button */}
          <button type="submit" className="btn btn-primary btn-signin" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>

          {/* Action Links */}
          <div className="auth-links">
            <a href="#" className="auth-link" id="forgotPassword">Forgot your password?</a>
            <Link href="/signup" className="auth-link">
              Don't have an account? <span className="highlight">Sign up</span>
            </Link>
            <a href="#" className="auth-link privacy-link">
              Privacy policy 
              <i className="fas fa-external-link-alt"></i>
            </a>
          </div>
        </form>
      </div>

      {/* Error/Success Messages */}
      {message && (
        <div className={`auth-message ${messageType}`}>
          <span>{message}</span>
        </div>
      )}
    </div>
  );
}

