/**
 * Next.js integration for Sable Smart Links
 */

import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

// Use package-relative import that will work in the built package
const ReactComponents = dynamic(
  () => import('sable-smart-links/react'),
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
  
  // Use dynamic import for the hook to ensure it only runs on the client
  const { useSmartLinks: useReactSmartLinks } = 
    typeof window !== 'undefined' ? require('sable-smart-links/react') : {};
  
  // Only use the hook on the client side
  const links = useReactSmartLinks?.();

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
  // Use dynamic import for the hook to ensure it only runs on the client
  const { useWalkthrough: useReactWalkthrough } = 
    typeof window !== 'undefined' ? require('sable-smart-links/react') : {};
  
  // Only use the hook on the client side
  const walkthrough = useReactWalkthrough?.(id, steps);
  
  // Return a no-op implementation on the server
  if (typeof window === 'undefined' || !walkthrough) {
    return {
      start: () => {},
      next: () => {},
      end: () => {}
    };
  }

  return walkthrough;
}
