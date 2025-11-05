'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import Cookies from 'js-cookie';

function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    twoFactorCode: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('error');
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(false);
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
      const loginData: any = {
        email: formData.email,
        password: formData.password
      };

      // Include 2FA code if provided
      if (requiresTwoFactor && formData.twoFactorCode) {
        loginData.twoFactorCode = formData.twoFactorCode;
      }

      const response = await api.post('/api/auth/login', loginData);
      
      // Check if 2FA is required
      if (response.data.requiresTwoFactor) {
        setRequiresTwoFactor(true);
        setMessage('Verification code sent to your email. Please check your inbox and enter the code below.');
        setMessageType('success');
        setLoading(false);
        return;
      }

      // Store token in both session storage and cookies (client-side only)
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('authToken', response.data.token);
        document.cookie = `authToken=${response.data.token}; path=/; max-age=86400`; // 24 hours
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
              className="w-32 h-32 sm:w-40 sm:h-40 lg:w-48 lg:h-48 object-contain"
              style={{ display: 'block' }}
              onError={(e) => {
                console.error('❌ Logo failed to load from /UOB_logo.png');
                console.error('Please verify the file exists at: frontend/public/UOB_logo.png');
                e.currentTarget.style.border = '2px solid red';
                e.currentTarget.alt = 'Logo not found - Check console';
              }}
              onLoad={() => {
                console.log('✅ Logo loaded successfully');
                setLogoLoaded(true);
              }}
            />
          </div>

          {/* Welcome Text */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Welcome to UOB Security House
          </h1>
          <p className="text-base sm:text-lg text-gray-600 max-w-md mx-auto">
            Your trusted partner for secure cryptocurrency and gold trading. 
            Experience the future of digital asset management.
          </p>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 py-8 sm:py-12 lg:py-0">
        <div className="max-w-md mx-auto w-full">
          {/* Mobile Logo (visible on small screens) */}
          <div className="lg:hidden text-center mb-6 sm:mb-8">
            <div className="flex justify-center items-center mb-3 sm:mb-4">
              <img
                src="/UOB_logo.png"
                alt="UOB Security House"
                width={96}
                height={96}
                className="w-20 h-20 sm:w-24 sm:h-24 object-contain"
                style={{ display: 'block' }}
                onError={(e) => {
                  console.error('❌ Logo failed to load from /UOB_logo.png');
                  console.error('Please verify the file exists at: frontend/public/UOB_logo.png');
                  e.currentTarget.style.border = '2px solid red';
                  e.currentTarget.alt = 'Logo not found - Check console';
                }}
                onLoad={() => {
                  console.log('✅ Logo loaded successfully');
                  setLogoLoaded(true);
                }}
              />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              UOB Security House
            </h1>
          </div>

          <div className="bg-white py-6 sm:py-8 px-5 sm:px-6 md:px-8 shadow-lg rounded-xl border border-gray-200">
            <form className="space-y-5 sm:space-y-6" onSubmit={handleSubmit}>
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email address
                </label>
                <div className="mt-1">
                  <input 
                    id="email"
                    name="email"
                    type="email" 
                    autoComplete="email"
                    required
                    disabled={requiresTwoFactor}
                    value={formData.email}
                    onChange={handleChange}
                    className="appearance-none block w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 text-sm sm:text-base disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="Enter your email"
                  />
                </div>
              </div>
        
              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Password
                </label>
                <div className="mt-1">
                  <input 
                    id="password"
                    name="password"
                    type="password" 
                    autoComplete="current-password"
                    required={!requiresTwoFactor}
                    disabled={requiresTwoFactor}
                    value={formData.password}
                    onChange={handleChange}
                    className="appearance-none block w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 text-sm sm:text-base disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="Enter your password"
                  />
                </div>
              </div>

              {/* 2FA Code Field */}
              {requiresTwoFactor && (
                <div>
                  <label htmlFor="twoFactorCode" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Verification Code
                  </label>
                  <div className="mt-1">
                    <input 
                      id="twoFactorCode"
                      name="twoFactorCode"
                      type="text" 
                      autoComplete="one-time-code"
                      required
                      maxLength={6}
                      value={formData.twoFactorCode}
                      onChange={handleChange}
                      className="appearance-none block w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 text-sm sm:text-base text-center text-lg font-mono tracking-widest"
                      placeholder="000000"
                    />
                    <p className="mt-2 text-xs text-gray-500">
                      Enter the 6-digit code sent to your email address
                    </p>
                  </div>
                </div>
              )}

              {/* Remember Me & Forgot Password */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                    Remember me
                  </label>
                </div>

                <div className="text-sm">
                  <Link href="/forgot-password" className="font-medium text-blue-600 hover:text-blue-500 transition-colors">
                    Forgot your password?
                  </Link>
                </div>
              </div>

              {/* Message Display */}
              {message && (
                <div className={`rounded-lg p-3 sm:p-4 text-sm ${
                  messageType === 'success' 
                    ? 'bg-green-50 text-green-700 border border-green-200' 
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {message}
                </div>
              )}

              {/* Submit Button */}
              <div>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="group relative w-full flex justify-center py-2.5 sm:py-3 px-4 border border-transparent text-sm sm:text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-2 border-white border-t-transparent mr-2"></div>
                      Signing in...
                    </div>
                  ) : (
                    'Sign in'
                  )}
                </button>
              </div>
            </form>

            {/* Sign Up Link */}
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 sm:px-4 bg-white text-gray-500">Don't have an account?</span>
                </div>
              </div>

              <div className="mt-5 sm:mt-6">
                <Link
                  href="/signup"
                  className="w-full flex justify-center py-2.5 sm:py-3 px-4 border border-gray-300 rounded-lg text-sm sm:text-base font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
                >
                  Create new account
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;