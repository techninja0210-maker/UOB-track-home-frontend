'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';

export default function SignupPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
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

    // Validation
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
      await axios.post('/api/auth/signup', {
        fullName: formData.fullName,
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
          <h1>Sign up</h1>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {/* Full Name */}
          <div className="form-group">
            <label htmlFor="fullName" className="form-label">Full Name</label>
            <input 
              type="text" 
              className="form-control" 
              id="fullName" 
              name="fullName" 
              value={formData.fullName}
              onChange={handleChange}
              required 
            />
          </div>

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

          {/* Confirm Password */}
          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
            <input 
              type="password" 
              className="form-control" 
              id="confirmPassword" 
              name="confirmPassword" 
              value={formData.confirmPassword}
              onChange={handleChange}
              required 
            />
          </div>

          {/* Sign Up Button */}
          <button type="submit" className="btn btn-primary btn-signin" disabled={loading}>
            {loading ? 'Creating account...' : 'Sign up'}
          </button>

          {/* Action Links */}
          <div className="auth-links">
            <Link href="/login" className="auth-link">
              Already have an account? <span className="highlight">Sign in</span>
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

