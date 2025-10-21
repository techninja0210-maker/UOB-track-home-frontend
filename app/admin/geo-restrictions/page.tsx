'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import Image from 'next/image';

interface GeoRestrictions {
  restrictedCountries: string[];
  restrictedRegions: Array<{
    country: string;
    states: string[];
  }>;
}

export default function GeoRestrictionsPage() {
  const [restrictions, setRestrictions] = useState<GeoRestrictions>({
    restrictedCountries: [],
    restrictedRegions: []
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [newCountry, setNewCountry] = useState('');
  const [newRegion, setNewRegion] = useState({ country: '', states: '' });
  const router = useRouter();

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    const token = Cookies.get('authToken');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        Cookies.remove('authToken');
        router.push('/login');
        return;
      }

      const userData = await response.json();
      if (userData.user.role !== 'admin') {
        router.push('/');
        return;
      }

      loadRestrictions();
    } catch (error) {
      console.error('Authentication check failed:', error);
      Cookies.remove('authToken');
      router.push('/login');
    }
  };

  const loadRestrictions = async () => {
    try {
      setLoading(true);
      const token = Cookies.get('authToken');
      
      const response = await fetch('http://localhost:5000/api/auth/admin/geo-restrictions', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load restrictions');
      }

      const data = await response.json();
      setRestrictions(data.data);
    } catch (error) {
      console.error('Error loading restrictions:', error);
      setMessage('Failed to load geographic restrictions');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const saveRestrictions = async () => {
    try {
      setSaving(true);
      const token = Cookies.get('authToken');
      
      const response = await fetch('http://localhost:5000/api/auth/admin/geo-restrictions', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(restrictions)
      });

      if (!response.ok) {
        throw new Error('Failed to save restrictions');
      }

      setMessage('Geographic restrictions updated successfully');
      setMessageType('success');
    } catch (error) {
      console.error('Error saving restrictions:', error);
      setMessage('Failed to save geographic restrictions');
      setMessageType('error');
    } finally {
      setSaving(false);
    }
  };

  const addCountry = () => {
    if (newCountry && !restrictions.restrictedCountries.includes(newCountry.toUpperCase())) {
      setRestrictions(prev => ({
        ...prev,
        restrictedCountries: [...prev.restrictedCountries, newCountry.toUpperCase()]
      }));
      setNewCountry('');
    }
  };

  const removeCountry = (country: string) => {
    setRestrictions(prev => ({
      ...prev,
      restrictedCountries: prev.restrictedCountries.filter(c => c !== country)
    }));
  };

  const addRegion = () => {
    if (newRegion.country && newRegion.states) {
      const states = newRegion.states.split(',').map(s => s.trim().toUpperCase());
      setRestrictions(prev => ({
        ...prev,
        restrictedRegions: [...prev.restrictedRegions, {
          country: newRegion.country.toUpperCase(),
          states: states
        }]
      }));
      setNewRegion({ country: '', states: '' });
    }
  };

  const removeRegion = (index: number) => {
    setRestrictions(prev => ({
      ...prev,
      restrictedRegions: prev.restrictedRegions.filter((_, i) => i !== index)
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading geographic restrictions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Image
                src="/UOB_logo.png"
                alt="UOB Security House"
                width={48}
                height={48}
                className="h-12 w-12 rounded-lg shadow-sm"
              />
              <div className="ml-4">
                <h1 className="text-2xl font-bold text-gray-900">Geographic Restrictions</h1>
                <p className="text-gray-600">Manage country and region-based access restrictions</p>
              </div>
            </div>
            <button
              onClick={() => router.back()}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors duration-200"
            >
              ← Back
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {message && (
          <div className={`mb-6 rounded-lg p-4 ${
            messageType === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-700' 
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Restricted Countries */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Restricted Countries</h3>
              <p className="text-sm text-gray-500">Countries where registration is completely blocked</p>
            </div>
            
            <div className="p-6">
              {/* Add Country */}
              <div className="mb-6">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Country Code (e.g., US, CA)"
                    value={newCountry}
                    onChange={(e) => setNewCountry(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    maxLength={2}
                  />
                  <button
                    onClick={addCountry}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    Add
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">Use ISO 3166-1 alpha-2 country codes</p>
              </div>

              {/* Country List */}
              <div className="space-y-2">
                {restrictions.restrictedCountries.map((country, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-md">
                    <span className="font-medium text-red-800">{country}</span>
                    <button
                      onClick={() => removeCountry(country)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
                
                {restrictions.restrictedCountries.length === 0 && (
                  <p className="text-gray-500 text-center py-4">No countries restricted</p>
                )}
              </div>
            </div>
          </div>

          {/* Restricted Regions */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Restricted Regions</h3>
              <p className="text-sm text-gray-500">Specific states/regions within countries</p>
            </div>
            
            <div className="p-6">
              {/* Add Region */}
              <div className="mb-6">
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Country Code (e.g., US)"
                    value={newRegion.country}
                    onChange={(e) => setNewRegion(prev => ({ ...prev, country: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    maxLength={2}
                  />
                  <input
                    type="text"
                    placeholder="States/Regions (comma-separated, e.g., NY, CA, TX)"
                    value={newRegion.states}
                    onChange={(e) => setNewRegion(prev => ({ ...prev, states: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <button
                    onClick={addRegion}
                    className="w-full px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    Add Region
                  </button>
                </div>
              </div>

              {/* Region List */}
              <div className="space-y-3">
                {restrictions.restrictedRegions.map((region, index) => (
                  <div key={index} className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-yellow-800">{region.country}</span>
                        <span className="ml-2 text-sm text-yellow-700">
                          ({region.states.join(', ')})
                        </span>
                      </div>
                      <button
                        onClick={() => removeRegion(index)}
                        className="text-yellow-600 hover:text-yellow-800"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
                
                {restrictions.restrictedRegions.length === 0 && (
                  <p className="text-gray-500 text-center py-4">No regions restricted</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={saveRestrictions}
            disabled={saving}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Restrictions'}
          </button>
        </div>

        {/* Information Panel */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">How Geographic Restrictions Work</h3>
              <div className="mt-2 text-sm text-blue-700">
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>Restricted Countries:</strong> Users from these countries cannot register at all</li>
                  <li><strong>Restricted Regions:</strong> Users from specific states/regions within a country are blocked</li>
                  <li><strong>VPN/Proxy Detection:</strong> Automatically detects and blocks VPN, proxy, and datacenter connections</li>
                  <li><strong>US VPN Blocking:</strong> Specifically blocks US-based VPN connections with high confidence</li>
                  <li><strong>IP Detection:</strong> User location is determined by their IP address using geolocation services</li>
                  <li><strong>Local Development:</strong> Local/private IPs are always allowed for testing</li>
                  <li><strong>Fallback:</strong> If location cannot be determined, registration is blocked for security</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
