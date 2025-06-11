import React, { useEffect, useRef, createContext, useContext } from 'react';
import { SableSmartLinks, SableSmartLinksConfig, WalkthroughStep, TextAgentStep } from '../index';
import { isBrowser } from '../utils/browserAPI';

interface SableSmartLinksContextType {
  // Walkthrough methods
  registerWalkthrough: (id: string, steps: WalkthroughStep[]) => void;
  restoreWalkthrough: () => void;
  startWalkthrough: (walkthroughId: string) => boolean;
  nextWalkthroughStep: () => void;
  endWalkthrough: () => void;
  
  // Text Agent methods
  registerTextAgent: (id: string, steps: TextAgentStep[]) => void;
  startTextAgent: (agentId?: string) => void;
  nextTextAgentStep: () => void;
  previousTextAgentStep: () => void;
  toggleTextAgentExpand: () => void;
  sendTextAgentMessage: (message: string) => void;
  endTextAgent: () => void;
}

const SableSmartLinksContext = createContext<SableSmartLinksContextType | null>(null);

export interface SableSmartLinksProviderProps {
  config?: SableSmartLinksConfig;
  children: React.ReactNode;
  autoInit?: boolean;
  walkthroughs?: Record<string, WalkthroughStep[]>;
  textAgents?: Record<string, TextAgentStep[]>;
}

/**
 * Provider component for SableSmartLinks
 * Initializes the library and provides methods through context
 */
export const SableSmartLinksProvider: React.FC<SableSmartLinksProviderProps> = ({
  config = {},
  children,
  autoInit = true,
  walkthroughs = {},
  textAgents = {}
}) => {
  const sableInstance = useRef<SableSmartLinks | null>(null);
  const isMounted = useRef(false);

  useEffect(() => {
    // Only run on client-side
    if (!isBrowser) return;
    
    isMounted.current = true;
    
    // Create a new instance with the provided config
    sableInstance.current = new SableSmartLinks(config);
    
    // Register any walkthroughs provided via props
    Object.entries(walkthroughs).forEach(([id, steps]) => {
      sableInstance.current?.registerWalkthrough(id, steps);
    });
    
    // Register any text agents provided via props
    Object.entries(textAgents).forEach(([id, steps]) => {
      sableInstance.current?.registerTextAgent(id, steps);
    });
    
    // Initialize if autoInit is true
    if (autoInit) {
      sableInstance.current.init();
    }
    
    // Cleanup on unmount
    return () => {
      isMounted.current = false;
      if (sableInstance.current) {
        sableInstance.current.endWalkthrough();
      }
    };
  }, [config, autoInit, walkthroughs, textAgents]);
  
  const contextValue = {
    // Walkthrough methods
    registerWalkthrough: (id: string, steps: WalkthroughStep[]) => {
      if (sableInstance.current) {
        sableInstance.current.registerWalkthrough(id, steps);
      }
    },
    restoreWalkthrough: () => {
      if (sableInstance.current) {
        sableInstance.current.restoreWalkthrough();
      }
    },
    startWalkthrough: (walkthroughId: string) => {
      if (sableInstance.current) {
        return sableInstance.current.startWalkthrough(walkthroughId);
      }
      return false;
    },
    nextWalkthroughStep: () => {
      if (sableInstance.current) {
        sableInstance.current.nextWalkthroughStep();
      }
    },
    endWalkthrough: () => {
      if (sableInstance.current) {
        sableInstance.current.endWalkthrough();
      }
    },
    
    // Text Agent methods
    registerTextAgent: (id: string, steps: TextAgentStep[]) => {
      if (sableInstance.current) {
        sableInstance.current.registerTextAgent(id, steps);
      }
    },
    startTextAgent: (agentId?: string) => {
      if (sableInstance.current) {
        if (agentId) {
          sableInstance.current.startTextAgent(agentId);
        } else {
          sableInstance.current.startTextAgent();
        }
      }
    },
    nextTextAgentStep: () => {
      if (sableInstance.current) {
        sableInstance.current.nextTextAgentStep();
      }
    },
    previousTextAgentStep: () => {
      if (sableInstance.current) {
        sableInstance.current.previousTextAgentStep();
      }
    },
    toggleTextAgentExpand: () => {
      if (sableInstance.current) {
        sableInstance.current.toggleTextAgentExpand();
      }
    },
    sendTextAgentMessage: (message: string) => {
      if (sableInstance.current) {
        sableInstance.current.sendTextAgentMessage(message);
      }
    },
    endTextAgent: () => {
      if (sableInstance.current) {
        sableInstance.current.endTextAgent();
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

export default SableSmartLinksProvider;
