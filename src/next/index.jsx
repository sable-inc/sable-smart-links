/**
 * Next.js integration for Sable Smart Links
 */

import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

// Create a client-side only component that wraps the provider
const ClientSideSmartLinks = dynamic(
  () => import('sable-smart-links/react').then(mod => ({
    default: function ClientWrapper({ children, walkthroughs, config }) {
      const { SmartLinksProvider } = mod;
      return (
        <SmartLinksProvider walkthroughs={walkthroughs} config={config}>
          {children}
        </SmartLinksProvider>
      );
    },
    useSmartLinks: mod.useSmartLinks,
    useWalkthrough: mod.useWalkthrough
  })),
  { 
    ssr: false,
    loading: () => null,
  }
);

/**
 * SmartLinksProvider for Next.js
 * This component is safe to use in Next.js as it disables SSR for the library
 */
export function SmartLinksProvider({ children, walkthroughs = {}, config = {} }) {
  // This component is just a wrapper that renders the client-side only component
  return (
    <ClientSideSmartLinks walkthroughs={walkthroughs} config={config}>
      {children}
    </ClientSideSmartLinks>
  );
}

/**
 * Hook to access SmartLinks in Next.js components
 * This is a client-side only hook
 */
export function useSmartLinks() {
  const [smartLinks, setSmartLinks] = useState(null);
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Only import and use the hook on the client side
  useEffect(() => {
    if (isClient) {
      import('sable-smart-links/react').then(({ useSmartLinks }) => {
        const hook = useSmartLinks();
        setSmartLinks(hook);
      });
    }
  }, [isClient]);

  return smartLinks;
}

/**
 * Hook to manage walkthroughs in Next.js components
 * This is a client-side only hook
 */
export function useWalkthrough(id, steps) {
  const [walkthrough, setWalkthrough] = useState({
    start: () => {},
    next: () => {},
    end: () => {}
  });
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Only import and use the hook on the client side
  useEffect(() => {
    if (isClient && id && steps) {
      import('sable-smart-links/react').then(({ useWalkthrough: useWalkthroughHook }) => {
        const hook = useWalkthroughHook(id, steps);
        setWalkthrough(hook);
      });
    }
  }, [isClient, id, steps]);

  return walkthrough;
}
