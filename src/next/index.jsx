/**
 * Next.js integration for Sable Smart Links
 */
import React, { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';

// Import base components with dynamic import to avoid SSR issues
const ReactComponents = dynamic(
  () => import('../react/SmartLinksProvider'),
  { ssr: false }
);

/**
 * SmartLinksProvider for Next.js
 * This component is safe to use in Next.js as it disables SSR for the library
 */
export function SmartLinksProvider({ children, walkthroughs = {}, config = {} }) {
  const pathname = usePathname();
  const Provider = useRef(null);

  useEffect(() => {
    // Set the provider reference once the dynamic import resolves
    if (ReactComponents) {
      Provider.current = ReactComponents.SmartLinksProvider;
    }
  }, [ReactComponents]);

  // Only render the provider on the client side
  if (typeof window === 'undefined' || !Provider.current) {
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
  const [smartLinks, setSmartLinks] = React.useState(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Import the hook dynamically
    import('../react/SmartLinksProvider').then((mod) => {
      const useSmartLinksHook = mod.useSmartLinks;
      try {
        const instance = useSmartLinksHook();
        setSmartLinks(instance);
      } catch (error) {
        console.error('Error using SmartLinks hook:', error);
      }
    });
  }, []);

  return smartLinks;
}

/**
 * Hook to manage walkthroughs in Next.js components
 * This is a client-side only hook
 */
export function useWalkthrough(id, steps) {
  const [controls, setControls] = React.useState({
    start: () => false,
    next: () => {},
    end: () => {}
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Import the hook dynamically
    import('../react/SmartLinksProvider').then((mod) => {
      const useWalkthroughHook = mod.useWalkthrough;
      try {
        const walkthroughControls = useWalkthroughHook(id, steps);
        setControls(walkthroughControls);
      } catch (error) {
        console.error('Error using walkthrough hook:', error);
      }
    });
  }, [id, steps]);

  return controls;
}
