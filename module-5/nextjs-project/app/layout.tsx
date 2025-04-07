// app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';
import React from 'react';
import ClientBody from '../components/ClientBody';
import { ThemeProvider } from '../context/ThemeContext';

export const metadata: Metadata = {
  title: 'Blockchain Analytics Dashboard',
  description: 'Real-time insights into Ethereum’s blockchain metrics',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-white text-black" suppressHydrationWarning>
        <ThemeProvider>
          <ClientBody>
            <div className="flex justify-center min-h-screen px-4 py-6 bg-gray-50 dark:bg-[#0a0a0f] transition-colors duration-300">
              <div className="w-full max-w-4xl">{children}</div>
            </div>
          </ClientBody>
        </ThemeProvider>
      </body>
    </html>
  );
}

