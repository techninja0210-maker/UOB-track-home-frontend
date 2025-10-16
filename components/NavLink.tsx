'use client';

import Link from 'next/link';
import { useNavigation } from '@/lib/navigation';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export default function NavLink({ href, children, className = '' }: NavLinkProps) {
  const { navigateWithLoading } = useNavigation();
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);

  const isActive = pathname === href;

  const handleClick = (e: React.MouseEvent) => {
    // Only prevent default for same-page navigation to avoid issues
    if (href === pathname) {
      e.preventDefault();
      return;
    }
    setIsNavigating(true);
    navigateWithLoading(href);
  };

  return (
    <Link 
      href={href} 
      className={`nav-item ${isActive ? 'active' : ''} ${className} ${isNavigating ? 'navigating' : ''}`}
      onClick={handleClick}
    >
      {children}
      {isNavigating && (
        <div className="nav-loading">
          <div className="nav-spinner"></div>
        </div>
      )}
      
      <style jsx>{`
        .nav-item {
          position: relative;
        }

        .nav-item.navigating {
          opacity: 0.7;
        }

        .nav-loading {
          position: absolute;
          right: 1rem;
          top: 50%;
          transform: translateY(-50%);
        }

        .nav-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid #333;
          border-top: 2px solid #FFD700;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </Link>
  );
}
