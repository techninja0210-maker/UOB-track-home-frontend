'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await api.post('/api/password-reset/request', { email });
      setMessage({ type: 'success', text: response.data.message });
      setEmailSent(true);
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to send reset email',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-container">
      <div className="forgot-password-card">
        <div className="logo-section">
          <div className="logo-icon">🔒</div>
          <h1>Forgot Password?</h1>
          <p>No worries! Enter your email and we'll send you reset instructions.</p>
        </div>

        {!emailSent ? (
          <form onSubmit={handleSubmit} className="forgot-password-form">
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                disabled={loading}
              />
            </div>

            {message && (
              <div className={`message ${message.type}`}>
                {message.text}
              </div>
            )}

            <button
              type="submit"
              className="submit-btn"
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>

            <div className="back-to-login">
              <Link href="/login">← Back to Login</Link>
            </div>
          </form>
        ) : (
          <div className="success-message">
            <div className="success-icon">✅</div>
            <h2>Check Your Email!</h2>
            <p>
              If an account exists with <strong>{email}</strong>, you will receive a password reset link shortly.
            </p>
            <p className="note">
              Didn't receive the email? Check your spam folder or{' '}
              <button onClick={() => setEmailSent(false)} className="retry-link">
                try again
              </button>
              .
            </p>
            <Link href="/login" className="back-btn">
              Back to Login
            </Link>
          </div>
        )}
      </div>

      <style jsx>{`
        .forgot-password-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #1A1A1A 0%, #2C2C2C 100%);
          padding: 2rem;
        }

        .forgot-password-card {
          background: #2C2C2C;
          border-radius: 20px;
          padding: 3rem;
          max-width: 500px;
          width: 100%;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
          border: 1px solid #444;
        }

        .logo-section {
          text-align: center;
          margin-bottom: 2rem;
        }

        .logo-icon {
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #FFD700, #B8860B);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 3rem;
          margin: 0 auto 1rem;
        }

        h1 {
          color: #FFD700;
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }

        p {
          color: #B0B0B0;
          font-size: 1rem;
        }

        .forgot-password-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        label {
          color: #E0E0E0;
          font-weight: 500;
          font-size: 0.9rem;
        }

        input {
          padding: 1rem;
          border: 1px solid #444;
          border-radius: 10px;
          background: #1A1A1A;
          color: white;
          font-size: 1rem;
          transition: all 0.3s ease;
        }

        input:focus {
          outline: none;
          border-color: #FFD700;
          box-shadow: 0 0 0 3px rgba(255, 215, 0, 0.1);
        }

        input:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .message {
          padding: 1rem;
          border-radius: 8px;
          text-align: center;
          font-size: 0.9rem;
        }

        .message.success {
          background: rgba(76, 175, 80, 0.1);
          border: 1px solid #4CAF50;
          color: #4CAF50;
        }

        .message.error {
          background: rgba(244, 67, 54, 0.1);
          border: 1px solid #f44336;
          color: #f44336;
        }

        .submit-btn {
          padding: 1rem;
          background: linear-gradient(135deg, #FFD700, #B8860B);
          color: #1A1A1A;
          border: none;
          border-radius: 10px;
          font-size: 1rem;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 5px 20px rgba(255, 215, 0, 0.4);
        }

        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .back-to-login {
          text-align: center;
        }

        .back-to-login a {
          color: #FFD700;
          text-decoration: none;
          font-size: 0.9rem;
          transition: color 0.3s ease;
        }

        .back-to-login a:hover {
          color: #FFF;
        }

        .success-message {
          text-align: center;
        }

        .success-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }

        .success-message h2 {
          color: #4CAF50;
          font-size: 1.5rem;
          margin-bottom: 1rem;
        }

        .success-message p {
          margin-bottom: 1rem;
        }

        .success-message strong {
          color: #FFD700;
        }

        .note {
          font-size: 0.85rem;
          color: #888;
        }

        .retry-link {
          background: none;
          border: none;
          color: #FFD700;
          text-decoration: underline;
          cursor: pointer;
          font-size: 0.85rem;
        }

        .back-btn {
          display: inline-block;
          margin-top: 1.5rem;
          padding: 1rem 2rem;
          background: linear-gradient(135deg, #FFD700, #B8860B);
          color: #1A1A1A;
          text-decoration: none;
          border-radius: 10px;
          font-weight: bold;
          transition: all 0.3s ease;
        }

        .back-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 20px rgba(255, 215, 0, 0.4);
        }

        @media (max-width: 768px) {
          .forgot-password-card {
            padding: 2rem;
          }

          h1 {
            font-size: 1.5rem;
          }

          .logo-icon {
            width: 60px;
            height: 60px;
            font-size: 2rem;
          }
        }
      `}</style>
    </div>
  );
}


