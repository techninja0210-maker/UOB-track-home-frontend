'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import Link from 'next/link';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setMessage({ type: 'error', text: 'Invalid reset link' });
      setVerifying(false);
      return;
    }

    // Verify token
    const verifyToken = async () => {
      try {
        const response = await api.get(`/api/password-reset/verify/${token}`);
        if (response.data.valid) {
          setTokenValid(true);
        } else {
          setMessage({ type: 'error', text: 'Invalid or expired reset link' });
        }
      } catch (error: any) {
        setMessage({
          type: 'error',
          text: error.response?.data?.message || 'Invalid or expired reset link',
        });
      } finally {
        setVerifying(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters long' });
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      setLoading(false);
      return;
    }

    try {
      const response = await api.post('/api/password-reset/reset', {
        token,
        newPassword,
      });
      setMessage({ type: 'success', text: response.data.message });
      setResetSuccess(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to reset password',
      });
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="reset-password-container">
        <div className="reset-password-card">
          <div className="loading">
            <div className="spinner"></div>
            <p>Verifying reset link...</p>
          </div>
        </div>
        <style jsx>{`
          .reset-password-container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #1A1A1A 0%, #2C2C2C 100%);
          }
          .reset-password-card {
            background: #2C2C2C;
            border-radius: 20px;
            padding: 3rem;
            max-width: 500px;
            width: 100%;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
            border: 1px solid #444;
          }
          .loading {
            text-align: center;
            color: #B0B0B0;
          }
          .spinner {
            width: 50px;
            height: 50px;
            border: 4px solid #444;
            border-top-color: #FFD700;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 1rem;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="reset-password-container">
        <div className="reset-password-card">
          <div className="error-section">
            <div className="error-icon">❌</div>
            <h1>Invalid Reset Link</h1>
            <p>{message?.text || 'This password reset link is invalid or has expired.'}</p>
            <Link href="/forgot-password" className="action-btn">
              Request New Link
            </Link>
            <Link href="/login" className="back-link">
              Back to Login
            </Link>
          </div>
        </div>
        <style jsx>{`
          .reset-password-container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #1A1A1A 0%, #2C2C2C 100%);
            padding: 2rem;
          }
          .reset-password-card {
            background: #2C2C2C;
            border-radius: 20px;
            padding: 3rem;
            max-width: 500px;
            width: 100%;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
            border: 1px solid #444;
          }
          .error-section {
            text-align: center;
          }
          .error-icon {
            font-size: 4rem;
            margin-bottom: 1rem;
          }
          h1 {
            color: #f44336;
            font-size: 1.8rem;
            margin-bottom: 1rem;
          }
          p {
            color: #B0B0B0;
            margin-bottom: 2rem;
          }
          .action-btn {
            display: inline-block;
            padding: 1rem 2rem;
            background: linear-gradient(135deg, #FFD700, #B8860B);
            color: #1A1A1A;
            text-decoration: none;
            border-radius: 10px;
            font-weight: bold;
            transition: all 0.3s ease;
            margin-bottom: 1rem;
          }
          .action-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 20px rgba(255, 215, 0, 0.4);
          }
          .back-link {
            display: block;
            color: #FFD700;
            text-decoration: none;
            margin-top: 1rem;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="reset-password-container">
      <div className="reset-password-card">
        <div className="logo-section">
          <div className="logo-icon">🔑</div>
          <h1>Reset Your Password</h1>
          <p>Enter your new password below.</p>
        </div>

        {!resetSuccess ? (
          <form onSubmit={handleSubmit} className="reset-password-form">
            <div className="form-group">
              <label htmlFor="newPassword">New Password</label>
              <input
                type="password"
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min. 6 characters)"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
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
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        ) : (
          <div className="success-section">
            <div className="success-icon">✅</div>
            <h2>Password Reset Successful!</h2>
            <p>Your password has been reset. Redirecting to login...</p>
          </div>
        )}
      </div>

      <style jsx>{`
        .reset-password-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #1A1A1A 0%, #2C2C2C 100%);
          padding: 2rem;
        }

        .reset-password-card {
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

        .reset-password-form {
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

        .success-section {
          text-align: center;
        }

        .success-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }

        .success-section h2 {
          color: #4CAF50;
          font-size: 1.5rem;
          margin-bottom: 1rem;
        }

        @media (max-width: 768px) {
          .reset-password-card {
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}


