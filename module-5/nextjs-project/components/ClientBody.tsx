// component/ClientBody.tsx
"use client";
import { useEffect } from 'react';

export default function ClientBody({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Add the class only on the client after hydration
    document.body.classList.add('vsc-initialized');
  }, []);
  return <>{children}</>;
}
