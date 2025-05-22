/**
 * Next.js integration for Sable Smart Links
 */

import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

// Import base components with dynamic import to avoid SSR issues
const ReactComponents = dynamic(
  () => import('../react/SmartLinksProvider'),
  { 
    ssr: false,
    loading: () => null
  }
);

/**
 * SmartLinksProvider for Next.js
 * This component is safe to use in Next.js as it disables SSR for the library
 */
export function SmartLinksProvider({ children, walkthroughs = {}, config = {} }) {
  const [isClient, setIsClient] = useState(false);
  const Provider = useRef(null);

  useEffect(() => {
    // This effect only runs on the client
    setIsClient(true);
    // Set the provider reference once the dynamic import resolves
    if (ReactComponents) {
      Provider.current = ReactComponents.SmartLinksProvider;
    }
  }, [ReactComponents]);

  // Only render the provider on the client side
  if (!isClient || !Provider.current) {
    return <>{children}</>;
  }

  const ProviderComponent = Provider.current;

  return (
    <ProviderComponent
      walkthroughs={walkthroughs}
      config={config}
    >
      {children}
    </ProviderComponent>
  );
}

/**
 * Hook to access SmartLinks in Next.js components
 * This is a client-side only hook
 */
export function useSmartLinks() {
  const [smartLinks, setSmartLinks] = useState(null);
  const { useSmartLinks: useReactSmartLinks } = require('../react/SmartLinksProvider');
  
  // Only use the hook on the client side
  const links = typeof window !== 'undefined' ? useReactSmartLinks?.() : null;

  useEffect(() => {
    if (links) {
      setSmartLinks(links);
    }
  }, [links]);

  return smartLinks;
}

/**
 * Hook to manage walkthroughs in Next.js components
 * This is a client-side only hook
 */
export function useWalkthrough(id, steps) {
  const { useWalkthrough: useReactWalkthrough } = require('../react/SmartLinksProvider');
  
  // Only use the hook on the client side
  const walkthrough = typeof window !== 'undefined' ? useReactWalkthrough?.(id, steps) : null;
  
  // Return a no-op implementation on the server
  if (!walkthrough) {
    return {
      start: () => {},
      next: () => {},
      end: () => {}
    };
  }

  return walkthrough;
}
