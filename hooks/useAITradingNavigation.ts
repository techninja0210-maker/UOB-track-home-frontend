'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function useAITradingNavigation() {
  const [showComingSoon, setShowComingSoon] = useState(false);
  const router = useRouter();

  const handleAITradingClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowComingSoon(true);
  };

  const closeComingSoon = () => {
    setShowComingSoon(false);
  };

  return {
    showComingSoon,
    handleAITradingClick,
    closeComingSoon
  };
}
