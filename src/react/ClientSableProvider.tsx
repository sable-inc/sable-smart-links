'use client'; // For Next.js App Router (13+)

import React, { useState, useEffect } from 'react';
import { SableSmartLinksProvider, SableSmartLinksProviderProps } from './SableSmartLinksProvider';
import { isBrowser } from '../utils/browserAPI';

/**
 * Client-side only wrapper for SableSmartLinksProvider
 * Ensures the provider only renders on the client side to avoid SSR issues
 */
export function ClientSableProvider({ 
  children, 
  ...props 
}: SableSmartLinksProviderProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // During SSR and initial hydration, render children without the provider
  if (!mounted) {
    return <>{children}</>;
  }

  // Once mounted on client, render with the provider
  return (
    <SableSmartLinksProvider {...props}>
      {children}
    </SableSmartLinksProvider>
  );
}

/**
 * Alternative implementation using dynamic import pattern
 * This can be used in _app.tsx with the Pages Router
 * 
 * Example usage:
 * ```
 * // In _app.tsx
 * import { withClientSideOnly } from '../src/react/ClientSableProvider';
 * import { SableSmartLinksProvider } from 'sable-smart-links/react';
 * 
 * const ClientSableProvider = withClientSideOnly(SableSmartLinksProvider);
 * 
 * function MyApp({ Component, pageProps }) {
 *   return (
 *     <ClientSableProvider config={{ paramName: 'walkthrough' }}>
 *       <Component {...pageProps} />
 *     </ClientSableProvider>
 *   );
 * }
 * ```
 */
export function withClientSideOnly<T extends React.ComponentType<any>>(
  Component: T
): React.FC<React.ComponentProps<T>> {
  const WithClientSideOnly = (props: React.ComponentProps<T>) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
      setMounted(true);
    }, []);

    if (!mounted) {
      return props.children ? <>{props.children}</> : null;
    }

    return <Component {...props} />;
  };

  return WithClientSideOnly;
}
