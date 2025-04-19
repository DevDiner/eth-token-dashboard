// app/providers.tsx
"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

interface ThemeContextProps {
  darkMode: boolean;
  toggleDarkMode: () => void;
}

const ThemeContext = createContext<ThemeContextProps>({
  darkMode: false,
  toggleDarkMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [darkMode, setDarkMode] = useState(false);

  // Keep .dark class on <html> in sync with state
  useEffect(() => {
    document.documentElement.style.backgroundColor = darkMode ? '#1a1a1a' : '#ffffff';
    document.body.classList.toggle('dark', darkMode);
  }, [darkMode]);

  function toggleDarkMode() {
    setDarkMode(!darkMode);
  }

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Custom hook to use the theme
export function useTheme() {
  return useContext(ThemeContext);
}
