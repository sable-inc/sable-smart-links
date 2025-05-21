import React, { useEffect, useRef, createContext, useContext } from 'react';
import SableSmartLinks from '../index';

/**
 * Context for sharing the SableSmartLinks instance
 */
const SmartLinksContext = createContext(null);

/**
 * Provider component for SableSmartLinks
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @param {Object} props.walkthroughs - Map of walkthrough IDs to step arrays
 * @param {Object} props.config - Configuration for SableSmartLinks
 */
export function SmartLinksProvider({ children, walkthroughs = {}, config = {} }) {
  const smartLinksRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Initialize SableSmartLinks
    smartLinksRef.current = new SableSmartLinks(config);

    // Register all provided walkthroughs
    Object.entries(walkthroughs).forEach(([id, steps]) => {
      if (smartLinksRef.current) {
        smartLinksRef.current.registerWalkthrough(id, steps);
      }
    });

    // Cleanup on unmount
    return () => {
      if (smartLinksRef.current) {
        smartLinksRef.current.end();
        smartLinksRef.current = null;
      }
    };
  }, []);

  return (
    <SmartLinksContext.Provider value={smartLinksRef.current}>
      {children}
    </SmartLinksContext.Provider>
  );
}

/**
 * Hook to access the SableSmartLinks instance
 * @returns {Object} The SableSmartLinks instance
 */
export function useSmartLinks() {
  const context = useContext(SmartLinksContext);
  
  if (context === undefined) {
    throw new Error('useSmartLinks must be used within a SmartLinksProvider');
  }
  
  return context;
}

/**
 * Hook to register and manage walkthroughs
 * @param {string} id - Walkthrough ID
 * @param {Array} steps - Walkthrough steps
 * @returns {Object} Methods to control the walkthrough
 */
export function useWalkthrough(id, steps) {
  const smartLinks = useSmartLinks();
  
  useEffect(() => {
    if (!smartLinks || !id || !steps || !steps.length) return;
    
    // Register the walkthrough
    smartLinks.registerWalkthrough(id, steps);
  }, [id, steps]);
  
  return {
    start: () => smartLinks?.start(id),
    next: () => smartLinks?.next(),
    end: () => smartLinks?.end()
  };
}
