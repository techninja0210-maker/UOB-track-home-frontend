'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import api from '@/lib/api';

export default function SignupPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    referralCode: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('error');
  const [geoRestrictionError, setGeoRestrictionError] = useState<any>(null);
  const [locationWarning, setLocationWarning] = useState<any>(null);
  const [checkingLocation, setCheckingLocation] = useState(false);
  const [fieldValidation, setFieldValidation] = useState({
    fullName: false,
    email: false,
    password: false,
    confirmPassword: false
  });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [userIP, setUserIP] = useState<string>('');
  const router = useRouter();

  // Get user's IP address and check for referral code on component mount
  useEffect(() => {
    const getUserIP = async () => {
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        setUserIP(data.ip);
      } catch (error) {
        console.log('Could not get user IP:', error);
        setUserIP(''); // Fallback to empty string
      }
    };
    
    // Check for referral code in URL
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    if (refCode) {
      setFormData(prev => ({ ...prev, referralCode: refCode.trim() }));
    }
    
    getUserIP();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Update form data
    const updatedFormData = {
      ...formData,
      [name]: value
    };
    
    setFormData(updatedFormData);

    // Real-time validation with updated form data
    validateField(name, value, updatedFormData);
  };

  const validateField = (name: string, value: string, currentFormData?: typeof formData) => {
    let isValid = false;
    const data = currentFormData || formData;
    
    switch (name) {
      case 'fullName':
        isValid = value.length >= 2;
        break;
      case 'email':
        isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        break;
      case 'password':
        isValid = value.length >= 6;
        // Re-validate confirmPassword if password changes
        if (data.confirmPassword) {
          setTimeout(() => {
            validateField('confirmPassword', data.confirmPassword, data);
          }, 0);
        }
        break;
      case 'confirmPassword':
        isValid = value === data.password && value.length > 0;
        break;
      default:
        isValid = false;
    }
    
    setFieldValidation(prev => ({
      ...prev,
      [name]: isValid
    }));
  };

  const checkUserLocation = async () => {
    try {
      setCheckingLocation(true);
      const response = await api.post('/api/auth/check-location', { ip: userIP });

      if (response.data && !response.data.success && response.data.warning) {
        setLocationWarning(response.data.warning);
        return false; // Location check failed
      }
      
      setLocationWarning(null);
      return true; // Location check passed
    } catch (error) {
      console.error('Location check failed:', error);
      return true; // Allow submission if location check fails
    } finally {
      setCheckingLocation(false);
    }
  };

  // Synchronous validation function for submission
  const validateFormSync = () => {
    const validation = {
      fullName: formData.fullName.length >= 2,
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email),
      password: formData.password.length >= 6,
      confirmPassword: formData.confirmPassword === formData.password && formData.confirmPassword.length > 0
    };

    // Update validation state
    setFieldValidation(validation);

    return validation;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setLocationWarning(null);

    // Synchronously validate all fields
    const validation = validateFormSync();

    // Check which fields are invalid
    const invalidFields = [];
    if (!validation.fullName) invalidFields.push('Full Name');
    if (!validation.email) invalidFields.push('Email');
    if (!validation.password) invalidFields.push('Password');
    if (!validation.confirmPassword) invalidFields.push('Confirm Password');

    // Check if form is valid
    const isFormValid = Object.values(validation).every(Boolean) && termsAccepted;

    if (!isFormValid) {
      let errorMsg = 'Please fill in all fields correctly and accept the terms.';
      if (invalidFields.length > 0) {
        errorMsg = `Please fix the following: ${invalidFields.join(', ')}${!termsAccepted ? ', and accept the terms' : ''}.`;
      } else if (!termsAccepted) {
        errorMsg = 'Please accept the terms and conditions.';
      }
      setMessage(errorMsg);
      setMessageType('error');
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setMessage('Passwords do not match.');
      setMessageType('error');
      setLoading(false);
      return;
    }

    // Check user location before submission
    const locationAllowed = await checkUserLocation();
    if (!locationAllowed) {
      setLoading(false);
      return; // Stop submission if location is not allowed
    }

    try {
      const response = await api.post('/api/auth/signup', {
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
        referralCode: formData.referralCode || undefined
      });

      setMessage('Account created successfully! Redirecting to login...');
      setMessageType('success');
      
      setTimeout(() => {
        router.push('/login');
      }, 2000);

    } catch (error: any) {
      // Handle geographic restriction and VPN detection errors
      if (error.response?.data?.error === 'GEOGRAPHIC_RESTRICTION' || error.response?.data?.error === 'VPN_DETECTED') {
        setGeoRestrictionError(error.response.data);
        setMessage('');
      } else {
        setMessage(error.response?.data?.message || 'Registration failed. Please try again.');
      setMessageType('error');
        setGeoRestrictionError(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 6) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const passwordStrength = getPasswordStrength(formData.password);

  return (
    <div className="min-h-screen bg-white flex flex-col lg:flex-row">
      {/* Left Side - Logo and Welcome */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-50 to-indigo-100 flex-col justify-center items-center px-8 xl:px-12">
        <div className="text-center w-full max-w-md">
          {/* Logo */}
          <div className="mb-8">
            <Image
              src="/UOB_logo.png"
              alt="UOB Security House"
              width={200}
              height={200}
              className="h-32 w-32 sm:h-40 sm:w-40 lg:h-48 lg:w-48 object-contain mx-auto"
              priority
            />
          </div>

          {/* Welcome Text */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Join UOB Security House
          </h1>
          <p className="text-base sm:text-lg text-gray-600 max-w-md mx-auto">
            Start your journey in secure cryptocurrency and gold trading. 
            Create your account and unlock the future of digital assets.
          </p>
        </div>
      </div>

      {/* Right Side - Signup Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 py-8 sm:py-12 lg:py-0">
        <div className="max-w-md mx-auto w-full">
          {/* Mobile Logo (visible on small screens) */}
          <div className="lg:hidden text-center mb-6 sm:mb-8">
            <Image
              src="/UOB_logo.png"
              alt="UOB Security House"
              width={120}
              height={120}
              className="h-20 w-20 sm:h-24 sm:w-24 object-contain mx-auto"
              priority
            />
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-3 sm:mt-4">
              UOB Security House
            </h1>
          </div>

          <div className="bg-white py-6 sm:py-8 px-5 sm:px-6 md:px-8 shadow-lg rounded-xl border border-gray-200">
            <form className="space-y-5 sm:space-y-6" onSubmit={handleSubmit}>
              {/* Full Name Field */}
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Full Name
                </label>
                <div className="mt-1">
                  <input 
                    id="fullName"
                    name="fullName"
                    type="text" 
                    autoComplete="name"
                    required
                    value={formData.fullName}
                    onChange={handleChange}
                    className={`appearance-none block w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 text-sm sm:text-base ${
                      fieldValidation.fullName ? 'border-green-300' : formData.fullName ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter your full name"
                  />
                  {formData.fullName && !fieldValidation.fullName && (
                    <p className="mt-1 text-xs text-red-600">Name must be at least 2 characters</p>
                  )}
                </div>
              </div>
        
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
                    value={formData.email}
                    onChange={handleChange}
                    className={`appearance-none block w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 text-sm sm:text-base ${
                      fieldValidation.email ? 'border-green-300' : formData.email ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter your email"
                  />
                  {formData.email && !fieldValidation.email && (
                    <p className="mt-1 text-xs text-red-600">Please enter a valid email address</p>
                  )}
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
                    autoComplete="new-password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className={`appearance-none block w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 text-sm sm:text-base ${
                      fieldValidation.password ? 'border-green-300' : formData.password ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Create a password"
                  />
                  
                  {/* Password Strength Indicator */}
                  {formData.password && (
                    <div className="mt-2">
                      <div className="flex space-x-1">
                        {[1, 2, 3, 4].map((level) => (
                          <div
                            key={level}
                            className={`h-1 flex-1 rounded-full ${
                              passwordStrength >= level
                                ? passwordStrength <= 2
                                  ? 'bg-red-400'
                                  : passwordStrength === 3
                                  ? 'bg-yellow-400'
                                  : 'bg-green-400'
                                : 'bg-gray-200'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="mt-1 text-xs text-gray-600">
                        Password strength: {
                          passwordStrength <= 2 ? 'Weak' :
                          passwordStrength === 3 ? 'Medium' : 'Strong'
                        }
                      </p>
                    </div>
                  )}
                </div>
              </div>
        
              {/* Confirm Password Field */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Confirm Password
                </label>
                <div className="mt-1">
                  <input 
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password" 
                    autoComplete="new-password"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={`appearance-none block w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 text-sm sm:text-base ${
                      fieldValidation.confirmPassword ? 'border-green-300' : formData.confirmPassword ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Confirm your password"
                  />
                  {formData.confirmPassword && !fieldValidation.confirmPassword && (
                    <p className="mt-1 text-xs text-red-600">Passwords do not match</p>
                  )}
                </div>
              </div>

              {/* Referral Code Field */}
              <div>
                <label htmlFor="referralCode" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Referral Code (Optional)
                </label>
                <div className="mt-1">
                  <input 
                    id="referralCode"
                    name="referralCode"
                    type="text" 
                    value={formData.referralCode}
                    onChange={handleChange}
                    placeholder="Enter referral code if you have one"
                    className="appearance-none block w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Get a referral code from a friend to earn bonuses
                  </p>
                </div>
              </div>
        
              {/* Terms and Conditions */}
              <div className="flex items-start">
                <input 
                  id="terms"
                  name="terms"
                  type="checkbox" 
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-0.5"
                />
                <label htmlFor="terms" className="ml-2 block text-sm text-gray-700">
                  I agree to the{' '}
                  <Link href="/terms" className="text-blue-600 hover:text-blue-500">
                    Terms and Conditions
                  </Link>
                  {' '}and{' '}
                  <Link href="/privacy" className="text-blue-600 hover:text-blue-500">
                    Privacy Policy
                  </Link>
                </label>
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

            {/* Location Warning (shown before submission) */}
            {locationWarning && (
              <div className="rounded-lg p-6 bg-yellow-50 border border-yellow-200">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-lg font-medium text-yellow-800">
                      {locationWarning.title}
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p className="mb-2">{locationWarning.message}</p>
                      <p className="mb-3">{locationWarning.details}</p>
                      
                      <div className="flex items-center space-x-4">
                        <a 
                          href={`mailto:${locationWarning.supportEmail}?subject=Registration Access Request&body=Hello, I would like to request access to register on your platform.`}
                          className="inline-flex items-center px-4 py-2 border border-yellow-300 rounded-md text-sm font-medium text-yellow-700 bg-white hover:bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          Contact Support
                        </a>
                        
                        <button
                          onClick={() => setLocationWarning(null)}
                          className="text-sm text-yellow-600 hover:text-yellow-500 underline"
                        >
                          Continue Anyway
                        </button>
                      </div>
          </div>
        </div>
      </div>
        </div>
      )}

            {/* Geographic Restriction Error (shown after submission attempt) */}
            {geoRestrictionError && (
              <div className="rounded-lg p-6 bg-red-50 border border-red-200">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-lg font-medium text-red-800">
                      {geoRestrictionError.title}
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p className="mb-2">{geoRestrictionError.message}</p>
                      <p className="mb-3">{geoRestrictionError.details}</p>
                      
                      {geoRestrictionError.location && (
                        <div className="bg-red-100 rounded-md p-3 mb-3">
                          <p className="text-sm font-medium text-red-800">Detected Location:</p>
                          <p className="text-sm text-red-700">
                            {geoRestrictionError.location.city}, {geoRestrictionError.location.country}
                          </p>
                        </div>
                      )}

                      {geoRestrictionError.vpnInfo && (
                        <div className="bg-orange-100 rounded-md p-3 mb-3">
                          <p className="text-sm font-medium text-orange-800">VPN/Proxy Detection:</p>
                          <p className="text-sm text-orange-700">
                            {geoRestrictionError.vpnInfo.provider && `Provider: ${geoRestrictionError.vpnInfo.provider}`}
                            {geoRestrictionError.vpnInfo.confidence && ` (Confidence: ${geoRestrictionError.vpnInfo.confidence}%)`}
                            {geoRestrictionError.vpnInfo.isUSVPN && ' - US VPN Detected'}
                          </p>
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-4">
                        <a 
                          href={`mailto:${geoRestrictionError.supportEmail}?subject=Registration Access Request&body=Hello, I would like to request access to register on your platform. My location: ${geoRestrictionError.location?.city}, ${geoRestrictionError.location?.country}`}
                          className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          Contact Support
                        </a>
                        
                        <button
                          onClick={() => setGeoRestrictionError(null)}
                          className="text-sm text-red-600 hover:text-red-500 underline"
                        >
                          Try Again
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

              {/* Submit Button */}
              <div>
                <button
                  type="submit"
                  disabled={loading || checkingLocation || !termsAccepted}
                  className="group relative w-full flex justify-center py-2.5 sm:py-3 px-4 border border-transparent text-sm sm:text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {checkingLocation ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-2 border-white border-t-transparent mr-2"></div>
                      Checking location...
                    </div>
                  ) : loading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-2 border-white border-t-transparent mr-2"></div>
                      Creating account...
                    </div>
                  ) : (
                    'Create account'
                  )}
                </button>
              </div>
            </form>

            {/* Sign In Link */}
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 sm:px-4 bg-white text-gray-500">Already have an account?</span>
                </div>
              </div>

              <div className="mt-5 sm:mt-6">
                <Link
                  href="/login"
                  className="w-full flex justify-center py-2.5 sm:py-3 px-4 border border-gray-300 rounded-lg text-sm sm:text-base font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
                >
                  Sign in to your account
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}