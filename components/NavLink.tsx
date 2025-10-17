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
      className={`
        flex items-center space-x-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200
        ${isActive 
          ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600' 
          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
        }
        ${isNavigating ? 'opacity-70' : ''}
        ${className}
      `}
      onClick={handleClick}
    >
      {children}
      {isNavigating && (
        <div className="ml-auto">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-primary-600"></div>
        </div>
      )}
    </Link>
  );
}