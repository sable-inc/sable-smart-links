import React, { useEffect, useRef, createContext, useContext } from 'react';
import { SableSmartLinks, SableSmartLinksConfig, WalkthroughStep } from '../index';
import { isBrowser } from '../utils/browserAPI';

interface SableSmartLinksContextType {
  registerWalkthrough: (id: string, steps: WalkthroughStep[]) => void;
  start: (walkthroughId: string) => boolean;
  next: () => void;
  end: () => void;
}

const SableSmartLinksContext = createContext<SableSmartLinksContextType | null>(null);

export interface SableSmartLinksProviderProps {
  config?: SableSmartLinksConfig;
  children: React.ReactNode;
  autoInit?: boolean;
}

/**
 * Provider component for SableSmartLinks
 * Initializes the library and provides methods through context
 */
export const SableSmartLinksProvider: React.FC<SableSmartLinksProviderProps> = ({
  config,
  children,
  autoInit = true
}) => {
  const sableInstance = useRef<SableSmartLinks | null>(null);

  useEffect(() => {
    // Initialize SableSmartLinks on the client side only
    if (isBrowser) {
      // Create a new instance with the provided config
      sableInstance.current = new SableSmartLinks(config);
      
      // Initialize if autoInit is true
      if (autoInit) {
        sableInstance.current.init();
      }
    }
    
    // Cleanup on unmount
    return () => {
      if (sableInstance.current) {
        sableInstance.current.end();
      }
    };
  }, [config, autoInit]);
  
  const contextValue = {
    registerWalkthrough: (id: string, steps: WalkthroughStep[]) => {
      if (sableInstance.current) {
        sableInstance.current.registerWalkthrough(id, steps);
      }
    },
    start: (walkthroughId: string) => {
      if (sableInstance.current) {
        return sableInstance.current.start(walkthroughId);
      }
      return false;
    },
    next: () => {
      if (sableInstance.current) {
        sableInstance.current.next();
      }
    },
    end: () => {
      if (sableInstance.current) {
        sableInstance.current.end();
      }
    }
  };
  
  return (
    <SableSmartLinksContext.Provider value={contextValue}>
      {children}
    </SableSmartLinksContext.Provider>
  );
};

/**
 * Hook to access SableSmartLinks functionality
 * Must be used within a SableSmartLinksProvider
 */
export const useSableSmartLinks = (): SableSmartLinksContextType => {
  const context = useContext(SableSmartLinksContext);
  
  if (!context) {
    throw new Error('useSableSmartLinks must be used within a SableSmartLinksProvider');
  }
  
  return context;
};
