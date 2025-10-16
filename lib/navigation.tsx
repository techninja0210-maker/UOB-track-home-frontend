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
        <div className="global-loading-overlay">
          <div className="loading-content">
            <div className="loading-spinner"></div>
            <div className="loading-text">Loading...</div>
          </div>
          
          <style jsx>{`
            .global-loading-overlay {
              position: fixed;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background: rgba(26, 26, 26, 0.9);
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 9999;
              backdrop-filter: blur(4px);
            }

            .loading-content {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 1rem;
              background: #2C2C2C;
              padding: 2rem;
              border-radius: 12px;
              border: 1px solid #444;
              box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            }

            .loading-spinner {
              width: 40px;
              height: 40px;
              border: 4px solid #333;
              border-top: 4px solid #FFD700;
              border-radius: 50%;
              animation: spin 1s linear infinite;
            }

            .loading-text {
              color: #FFD700;
              font-size: 1.1rem;
              font-weight: 600;
            }

            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
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
