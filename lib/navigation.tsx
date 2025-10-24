'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface NavigationContextType {
  isLoading: boolean;
  navigateWithLoading: (path: string) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const navigateWithLoading = (path: string) => {
    setIsLoading(true);
    
    // Use Next.js router for navigation
    router.push(path);
    
    // Reset loading state after a short delay
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  return (
    <NavigationContext.Provider value={{ isLoading, navigateWithLoading }}>
      {children}
      {isLoading && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(26, 26, 26, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            backdropFilter: 'blur(4px)'
          }}
        >
          <div 
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem',
              background: '#2C2C2C',
              padding: '2rem',
              borderRadius: '12px',
              border: '1px solid #444',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
            }}
          >
            <div 
              style={{
                width: '40px',
                height: '40px',
                border: '4px solid #333',
                borderTop: '4px solid #FFD700',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}
            />
            <div 
              style={{
                color: '#FFD700',
                fontSize: '1.1rem',
                fontWeight: 600
              }}
            >
              Loading...
            </div>
          </div>
        </div>
      )}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}
