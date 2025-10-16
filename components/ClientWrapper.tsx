'use client';

import { NavigationProvider } from '@/lib/navigation';

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  return (
    <NavigationProvider>
      {children}
    </NavigationProvider>
  );
}
