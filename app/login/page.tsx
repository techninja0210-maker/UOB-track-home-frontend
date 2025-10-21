'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import api from '@/lib/api';
import Cookies from 'js-cookie';

function LoginPage() {
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
    <div className="min-h-screen bg-white flex">
      {/* Left Side - Logo and Welcome */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-50 to-primary-100 flex-col justify-center items-center px-12">
        <div className="text-center">
          {/* Logo */}
          <div className="mb-8">
            <Image
              src="/UOB_logo.png"
              alt="UOB Security House"
              width={200}
              height={200}
              className="h-48 w-48 object-contain mx-auto"
              priority
            />
          </div>
          
          {/* Welcome Text */}
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to UOB Security House
          </h1>
          <p className="text-lg text-gray-600 max-w-md">
            Your trusted partner for secure cryptocurrency and gold trading. 
            Experience the future of digital asset management.
          </p>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-12 lg:px-16">
        <div className="max-w-md mx-auto w-full">
          {/* Mobile Logo (visible on small screens) */}
          <div className="lg:hidden text-center mb-8">
            <Image
              src="/UOB_logo.png"
              alt="UOB Security House"
              width={120}
              height={120}
              className="h-24 w-24 object-contain mx-auto"
              priority
            />
            <h1 className="text-2xl font-bold text-gray-900 mt-4">
              UOB Security House
            </h1>
          </div>

          <div className="bg-white py-8 px-6 shadow-soft rounded-xl border border-gray-200">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1">
          <input 
                  id="email"
                  name="email"
            type="email" 
                  autoComplete="email"
                  required
            value={formData.email}
            onChange={handleChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
                  placeholder="Enter your email"
          />
              </div>
        </div>
        
            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
          <input 
                  id="password"
                  name="password"
            type="password" 
                  autoComplete="current-password"
                  required
            value={formData.password}
            onChange={handleChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
                  placeholder="Enter your password"
          />
        </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <Link href="/forgot-password" className="font-medium text-primary-600 hover:text-primary-500">
                  Forgot your password?
                </Link>
              </div>
            </div>

            {/* Message Display */}
            {message && (
              <div className={`rounded-lg p-3 text-sm ${
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
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
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
                <span className="px-2 bg-white text-gray-500">Don't have an account?</span>
              </div>
            </div>

            <div className="mt-6">
              <Link
                href="/signup"
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
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