'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [verified, setVerified] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passwordReset, setPasswordReset] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const requestData: any = { email };
      
      // Include 2FA code if required
      if (requiresTwoFactor && twoFactorCode) {
        requestData.twoFactorCode = twoFactorCode;
      }

      const response = await api.post('/api/password-reset/request', requestData);
      
      // Check if 2FA is required
      if (response.data.requiresTwoFactor) {
        setRequiresTwoFactor(true);
        setMessage({ 
          type: 'success', 
          text: response.data.message || 'Two-factor authentication is enabled. Please enter the 6-digit code from your authenticator app.' 
        });
        setLoading(false);
        return;
      }

      // Check if 2FA is verified and ready for password reset
      if (response.data.verified) {
        setVerified(true);
        setRequiresTwoFactor(false);
        setMessage({ 
          type: 'success', 
          text: response.data.message || 'Verification successful. You can now reset your password.' 
        });
        setLoading(false);
        return;
      }

      // If no 2FA required, show generic message (user doesn't have 2FA enabled)
      setMessage({ 
        type: 'error', 
        text: 'Password reset via email is not available. Please enable 2FA to reset your password directly.' 
      });
    } catch (error: any) {
      // Check if error is due to 2FA requirement
      if (error.response?.data?.requiresTwoFactor) {
        setRequiresTwoFactor(true);
        // If status is 401, it means the 2FA code was invalid
        if (error.response?.status === 401) {
          setMessage({ 
            type: 'error', 
            text: error.response.data.message || 'Invalid verification code. Please try again.' 
          });
        } else {
          // Otherwise, it's just a requirement to enter 2FA code
          setMessage({ 
            type: 'success', 
            text: error.response.data.message || 'Two-factor authentication is enabled. Please enter the 6-digit code from your authenticator app.' 
          });
        }
      } else {
        setMessage({
          type: 'error',
          text: error.response?.data?.message || 'Failed to send reset email. Please try again.',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetting(true);
    setMessage(null);

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setMessage({
        type: 'error',
        text: 'Passwords do not match. Please try again.',
      });
      setResetting(false);
      return;
    }

    // Validate password length
    if (newPassword.length < 6) {
      setMessage({
        type: 'error',
        text: 'Password must be at least 6 characters long.',
      });
      setResetting(false);
      return;
    }

    try {
      const response = await api.post('/api/password-reset/reset-direct', {
        email,
        twoFactorCode,
        newPassword,
      });

      // Success - password reset
      setMessage({ type: 'success', text: response.data.message });
      setPasswordReset(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (error: any) {
      // Check if error is due to 2FA requirement
      if (error.response?.data?.requiresTwoFactor) {
        setVerified(false);
        setRequiresTwoFactor(true);
        setMessage({ 
          type: 'error', 
          text: error.response.data.message || 'Verification code expired. Please verify again.' 
        });
      } else {
        setMessage({
          type: 'error',
          text: error.response?.data?.message || 'Failed to reset password. Please try again.',
        });
      }
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col lg:flex-row">
      {/* Left Side - Logo and Welcome */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-50 to-indigo-100 flex-col justify-center items-center px-8 xl:px-12">
        <div className="text-center w-full max-w-md">
          {/* Logo */}
          <div className="mb-8 flex justify-center items-center">
            <img
              src="/UOB_logo.png"
              alt="UOB Security House"
              width={192}
              height={192}
              className="w-48 h-48 object-contain"
              onLoad={() => {}}
            />
          </div>
          
          {/* Welcome Text */}
          <h1 className="text-3xl xl:text-4xl font-bold text-gray-800 mb-4">
            Forgot Your Password?
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            No worries! We'll help you reset it quickly and securely.
          </p>
          
          {/* Security Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-4 sm:px-6 lg:px-8 xl:px-12 py-12">
        <div className="w-full max-w-md mx-auto">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8 text-center">
            <img
              src="/UOB_logo.png"
              alt="UOB Security House"
              width={120}
              height={120}
              className="w-24 h-24 sm:w-32 sm:h-32 mx-auto object-contain"
            />
          </div>

          {!passwordReset ? (
            <>
              {/* Header */}
              <div className="mb-8">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                  Reset Password
                </h2>
                <p className="text-sm sm:text-base text-gray-600">
                  {verified
                    ? 'Enter your new password below.'
                    : requiresTwoFactor 
                    ? 'Two-factor authentication is enabled. Please enter your email and 2FA code to reset your password.'
                    : "Enter your email address. If 2FA is enabled, you'll be able to reset your password directly."}
                </p>
              </div>

              {/* Password Reset Form (after 2FA verification) */}
              {verified ? (
                <form onSubmit={handlePasswordReset} className="space-y-6">
                  {/* New Password Input */}
                  <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <input
                        type="password"
                        id="newPassword"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter your new password"
                        required
                        minLength={6}
                        disabled={resetting}
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all duration-200 text-sm sm:text-base disabled:bg-gray-50 disabled:cursor-not-allowed"
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Password must be at least 6 characters long.
                    </p>
                  </div>

                  {/* Confirm Password Input */}
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                      <input
                        type="password"
                        id="confirmPassword"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm your new password"
                        required
                        minLength={6}
                        disabled={resetting}
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all duration-200 text-sm sm:text-base disabled:bg-gray-50 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* Error Message */}
                  {message && message.type === 'error' && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-red-800">{message.text}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Success Message */}
                  {message && message.type === 'success' && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-green-800">{message.text}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={resetting || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                    className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm sm:text-base font-medium text-white bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {resetting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Resetting Password...
                      </>
                    ) : (
                      'Reset Password'
                    )}
                  </button>

                  {/* Back to Login */}
                  <div className="text-center">
                    <Link 
                      href="/login" 
                      className="text-sm sm:text-base text-yellow-600 hover:text-yellow-700 font-medium inline-flex items-center transition-colors duration-200"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                      </svg>
                      Back to Login
                    </Link>
                  </div>
                </form>
              ) : (
                /* Email and 2FA Form */
                <form onSubmit={handleSubmit} className="space-y-6">
                {/* Email Input */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                      </svg>
                    </div>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        // Reset 2FA requirement if email changes
                        if (requiresTwoFactor) {
                          setRequiresTwoFactor(false);
                          setTwoFactorCode('');
                          setMessage(null);
                        }
                      }}
                      placeholder="Enter your email address"
                      required
                      disabled={loading}
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all duration-200 text-sm sm:text-base disabled:bg-gray-50 disabled:cursor-not-allowed"
                    />
                  </div>
                  {requiresTwoFactor && (
                    <p className="mt-1 text-xs text-gray-500">
                      You can change the email address if needed. The 2FA requirement will reset.
                    </p>
                  )}
                </div>

                {/* 2FA Code Input */}
                {requiresTwoFactor && (
                  <div>
                    <label htmlFor="twoFactorCode" className="block text-sm font-medium text-gray-700 mb-2">
                      Verification Code (2FA)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        id="twoFactorCode"
                        value={twoFactorCode}
                        onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        maxLength={6}
                        required={requiresTwoFactor}
                        disabled={loading}
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all duration-200 text-sm sm:text-base text-center text-lg font-mono tracking-widest disabled:bg-gray-50 disabled:cursor-not-allowed"
                      />
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      Enter the 6-digit code from your authenticator app (Google Authenticator, Microsoft Authenticator, etc.)
                    </p>
                  </div>
                )}

                {/* Success/Info Message */}
                {message && message.type === 'success' && requiresTwoFactor && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-blue-800">{message.text}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {message && message.type === 'error' && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-red-800">{message.text}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading || !email || (requiresTwoFactor && twoFactorCode.length !== 6)}
                  className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm sm:text-base font-medium text-white bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {requiresTwoFactor ? 'Verifying...' : 'Sending Reset Link...'}
                    </>
                  ) : (
                    requiresTwoFactor ? 'Verify & Send Reset Link' : 'Send Reset Link'
                  )}
                </button>

                {/* Back to Login */}
                <div className="text-center">
                  <Link 
                    href="/login" 
                    className="text-sm sm:text-base text-yellow-600 hover:text-yellow-700 font-medium inline-flex items-center transition-colors duration-200"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to Login
                  </Link>
                </div>
              </form>
              )}
            </>
          ) : (
            /* Password Reset Success Message */
            <div className="text-center">
              <div className="mb-6 flex justify-center">
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10 sm:w-12 sm:h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
                Password Reset Successful!
              </h2>
              
              <p className="text-sm sm:text-base text-gray-600 mb-6">
                Your password has been reset successfully. Redirecting to login...
              </p>

              <Link
                href="/login"
                className="inline-flex items-center justify-center w-full sm:w-auto px-6 py-3 border border-transparent rounded-lg shadow-sm text-sm sm:text-base font-medium text-white bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
              >
                Go to Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
