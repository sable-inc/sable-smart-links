import React, { useEffect, useRef, createContext, useContext, useState } from 'react';
import { SableSmartLinks, SableSmartLinksConfig, WalkthroughStep, TextAgentStep, VoiceToolConfig } from '../index';
import { isBrowser } from '../utils/browserAPI';
import globalPopupManager from '../ui/GlobalPopupManager.js';

interface SableSmartLinksContextType {
  // Walkthrough methods
  registerWalkthrough: (id: string, steps: WalkthroughStep[]) => void;
  restoreWalkthrough: () => void;
  startWalkthrough: (walkthroughId: string) => boolean;
  nextWalkthroughStep: () => void;
  endWalkthrough: () => void;
  
  // Text Agent methods
  registerTextAgent: (id: string, steps: TextAgentStep[]) => SableSmartLinksContextType;
  startTextAgent: (agentId?: string) => boolean | void;
  nextTextAgentStep: () => SableSmartLinksContextType;
  previousTextAgentStep: () => SableSmartLinksContextType;
  endTextAgent: () => SableSmartLinksContextType;
  restartTextAgent: (stepId?: string | null, beforeRestartCallback?: (() => void) | null) => SableSmartLinksContextType;
  
  // Popup methods
  showPopup: (options: {
    text: string;
    boxWidth?: number;
    buttonType?: 'arrow' | 'yes-no';
    onProceed?: () => void;
    onYesNo?: (isYes: boolean) => void;
    primaryColor?: string;
    parent?: HTMLElement;
  }) => { unmount: () => void; mount: (newParent: HTMLElement) => void; } | null;
  closeAllPopups: () => void;
  
  // Voice Agent methods
  toggleVoiceChat: () => Promise<void>;
  isVoiceChatActive: () => boolean;

  // Popup state
  hasActivePopup: boolean;

  // Shared data methods for passing data between steps
  setStepData: (key: string, value: any) => void;
  getStepData: (key: string) => any;
  getAllStepData: () => Record<string, any>;
  clearStepData: () => void;
}

const SableSmartLinksContext = createContext<SableSmartLinksContextType | null>(null);

export interface SableSmartLinksProviderProps {
  config?: SableSmartLinksConfig;
  children: React.ReactNode;
  autoInit?: boolean;
  walkthroughs?: Record<string, WalkthroughStep[]>;
  textAgents?: Record<string, TextAgentStep[]>;
  voice?: {
    enabled?: boolean;
    engine?: 'nova';
    serverUrl?: string;
    systemPrompt?: string;
    tools?: VoiceToolConfig[];
    ui?: {
      position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
      buttonText?: {
        start?: string;
        stop?: string;
      };
      theme?: {
        primaryColor?: string;
        backgroundColor?: string;
      };
    };
  };
  menu?: {
    enabled?: boolean;
    text?: string;
    position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
    targetElement?: {
      selector: string;
      waitForElement?: boolean;
      waitTimeout?: number;
      position?: 'top' | 'right' | 'bottom' | 'left';
    };
    urlPaths?: string[];
    style?: {
      backgroundColor?: string;
      color?: string;
      borderRadius?: string;
      padding?: string;
      fontSize?: string;
      boxShadow?: string;
      [key: string]: string | undefined;
    };
    popupConfig: {
      enableChat?: boolean;
      sections?: Array<{
        title: string;
        icon?: string;
        restartFromStep?: string | null | { stepId: string | null; skipTrigger?: boolean };
        items: Array<{
          text: string;
          restartFromStep?: string | null | { stepId: string | null; skipTrigger?: boolean };
          data?: any;
        }>;
        onSelect: (item: any) => void;
      }>;
    };
  };
  initialStepData?: Record<string, any>;
}

/**
 * Provider component for SableSmartLinks
 * Initializes the library and provides methods through context
 */
export const SableSmartLinksProvider: React.FC<SableSmartLinksProviderProps> = ({
  config = {},
  voice = {},
  menu,
  children,
  autoInit = true,
  walkthroughs = {},
  textAgents = {},
  initialStepData = {}
}) => {
  const sableInstance = useRef<SableSmartLinks | null>(null);
  const isMounted = useRef(false);
  const [stepData, setStepDataState] = useState<Record<string, any>>(initialStepData);
  // Use a ref to track the latest step data for immediate access
  const stepDataRef = useRef<Record<string, any>>(initialStepData);
  // Track registered text agents and their step hashes
  const registeredTextAgents = useRef<Record<string, string>>({});
  // Track registered walkthroughs and their step hashes
  const registeredWalkthroughs = useRef<Record<string, string>>({});

  // Popup state
  const [hasActivePopup, setHasActivePopup] = useState(false);

  // Keep the ref in sync with state
  useEffect(() => {
    stepDataRef.current = stepData;
  }, [stepData]);

  // Listen for popup state changes from global popup manager
  useEffect(() => {
    const handlePopupStateChange = (state: { hasActivePopup: boolean }) => {
      setHasActivePopup(state.hasActivePopup);
    };
    // Get initial state
    const initialState = globalPopupManager.getState() as { hasActivePopup: boolean };
    setHasActivePopup(initialState.hasActivePopup);
    // Add listener for state changes
    globalPopupManager.addListener(handlePopupStateChange);
    // Cleanup listener on unmount
    return () => {
      globalPopupManager.removeListener(handlePopupStateChange);
    };
  }, []);

  // Process text agent steps to inject data access
  const processTextAgentSteps = (id: string, steps: TextAgentStep[]): TextAgentStep[] => {
    return steps.map(step => {
      // Create a new step object with the same properties
      const processedStep = { ...step };
      
      // Handle text property
      if (typeof processedStep.text === 'string') {
        // If text is a string, convert it to a function that can access step data
        const originalText = processedStep.text;
        processedStep.text = () => {
          try {
            // Try to interpolate any {{variable}} in the text using the ref for latest data
            return originalText.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
              const trimmedKey = key.trim();
              const value = stepDataRef.current[trimmedKey];
              return value !== undefined ? String(value) : match;
            });
          } catch (e) {
            console.error('Error processing text template:', e);
            return originalText;
          }
        };
      } else if (typeof processedStep.text === 'function') {
        // If text is already a function, wrap it to provide access to fresh data utilities
        const originalTextFn = processedStep.text;
        processedStep.text = () => {
          // Create fresh dataUtils with current ref data each time the function is called
          const freshDataUtils = {
            setStepData,
            getStepData: (key: string) => {
              const value = stepDataRef.current[key];
              return value;
            },
            getAllStepData: () => stepDataRef.current,
            clearStepData
          };
          return originalTextFn(freshDataUtils);
        };
      }
      
      // Wrap onProceed to provide access to step data
      if (processedStep.onProceed) {
        const originalOnProceed = processedStep.onProceed;
        processedStep.onProceed = async (textInput?: string) => {
          // Create fresh dataUtils with current ref data each time the function is called
          const freshDataUtils = {
            setStepData,
            getStepData: (key: string) => {
              const value = stepDataRef.current[key];
              return value;
            },
            getAllStepData: () => {
              return stepDataRef.current;
            },
            clearStepData
          };
          
          // Provide the fresh step data methods to the original onProceed
          return originalOnProceed(textInput, freshDataUtils);
        };
      }
      
      return processedStep;
    });
  };

  // Helper to hash steps for change detection
  function hashSteps(steps: any[]): string {
    try {
      return JSON.stringify(steps, (key, value) => {
        if (typeof value === 'function') return value.toString();
        return value;
      });
    } catch {
      return Math.random().toString(); // fallback
    }
  }

  // Only instantiate SableSmartLinks once
  useEffect(() => {
    if (!isBrowser) return;
    if (!sableInstance.current) {
      const mergedConfig = {
        ...config,
        voice: {
          ...config.voice,
          ...voice
        },
        menu: menu || config.menu
      };
      console.log('[SableSmartLinksProvider] Merged config:', mergedConfig);
      sableInstance.current = new SableSmartLinks(mergedConfig);
      isMounted.current = true;
      // Register walkthroughs on mount
      Object.entries(walkthroughs).forEach(([id, steps]) => {
        sableInstance.current?.registerWalkthrough(id, steps);
      });
    }
    return () => {
      isMounted.current = false;
      if (sableInstance.current) {
        sableInstance.current.endWalkthrough();
        sableInstance.current.endTextAgent();
      }
    };
    // Only run on mount/unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Register text agents only if new/changed
  useEffect(() => {
    if (!isBrowser || !sableInstance.current) return;
    Object.entries(textAgents).forEach(([id, steps]) => {
      const processedSteps = processTextAgentSteps(id, steps);
      const stepHash = hashSteps(processedSteps);
      if (registeredTextAgents.current[id] !== stepHash) {
        sableInstance.current?.registerTextAgent(id, processedSteps);
        registeredTextAgents.current[id] = stepHash;
      }
    });
  }, [textAgents, processTextAgentSteps]);

  // Register walkthroughs only if new/changed
  useEffect(() => {
    if (!isBrowser || !sableInstance.current) return;
    let didRegister = false;
    Object.entries(walkthroughs).forEach(([id, steps]) => {
      const stepHash = hashSteps(steps);
      if (registeredWalkthroughs.current[id] !== stepHash) {
        sableInstance.current?.registerWalkthrough(id, steps);
        registeredWalkthroughs.current[id] = stepHash;
        didRegister = true;
      }
    });
    // After registering, check for auto-start param
    if (didRegister) {
      try {
        const paramName = (config?.walkthrough?.paramName) || 'walkthrough';
        const urlParams = new URLSearchParams(window.location.search);
        const walkthroughId = urlParams.get(paramName);
        if (walkthroughId && sableInstance.current) {
          // Only start if not already running
          const engine = (sableInstance.current as any).walkthroughEngine;
          if (engine && (!engine.isRunning || engine.currentWalkthrough !== walkthroughId)) {
            sableInstance.current.startWalkthrough(walkthroughId);
          }
        }
      } catch (e) {
        // Ignore errors
      }
    }
  }, [walkthroughs, config]);

  // Function to update step data
  const setStepData = (key: string, value: any) => {
    // Update both the state and the ref immediately
    stepDataRef.current = {
      ...stepDataRef.current,
      [key]: value
    };
    
    setStepDataState(prevData => {
      const newData = {
        ...prevData,
        [key]: value
      };
      return newData;
    });
  };

  // Function to get step data - always use the ref for most current value
  const getStepData = (key: string) => {
    // Always use the ref for immediate access to latest data
    const value = stepDataRef.current[key];
    return value;
  };

  // Function to get all step data
  const getAllStepData = () => {
    return stepData;
  };

  // Function to clear all step data
  const clearStepData = () => {
    setStepDataState({});
  };

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
        const processedSteps = processTextAgentSteps(id, steps);
        sableInstance.current.registerTextAgent(id, processedSteps);
      }
      return contextValue;
    },
    startTextAgent: (agentId?: string) => {
      if (sableInstance.current) {
        return sableInstance.current.startTextAgent(agentId);
      }
      return false;
    },
    nextTextAgentStep: () => {
      if (sableInstance.current) {
        sableInstance.current.nextTextAgentStep();
      }
      return contextValue;
    },
    previousTextAgentStep: () => {
      if (sableInstance.current) {
        sableInstance.current.previousTextAgentStep();
      }
      return contextValue;
    },
    endTextAgent: () => {
      if (sableInstance.current) {
        sableInstance.current.endTextAgent();
      }
      return contextValue;
    },
    
    restartTextAgent: (stepId?: string | null, beforeRestartCallback?: (() => void) | null) => {
      if (sableInstance.current) {
        // Using type assertion to access textAgentEngine which exists in the JS implementation
        const instance = sableInstance.current as any;
        if (instance.textAgentEngine) {
          instance.textAgentEngine.restart(stepId, beforeRestartCallback);
        }
      }
      return contextValue;
    },
    
    // Popup methods
    showPopup: (options: {
      text: string;
      boxWidth?: number;
      buttonType?: 'arrow' | 'yes-no';
      onProceed?: () => void;
      onYesNo?: (isYes: boolean) => void;
      primaryColor?: string;
      parent?: HTMLElement;
    }) => {
      if (sableInstance.current) {
        return sableInstance.current.showPopup(options);
      }
      return null;
    },
    
    closeAllPopups: () => {
      console.log('[SableSmartLinksProvider] Calling globalPopupManager.closeActivePopup() in closeAllPopups - this will affect hasActivePopup state');
      globalPopupManager.closeActivePopup();
      console.log('[closeAllPopups] hasActivePopup changed');
    },
    
    // Voice methods
    toggleVoiceChat: async () => {
      if (sableInstance.current) {
        await sableInstance.current.toggleVoiceChat();
      }
    },
    
    isVoiceChatActive: () => {
      if (sableInstance.current) {
        return sableInstance.current.isVoiceChatActive();
      }
      return false;
    },

    // Step data methods
    setStepData,
    getStepData,
    getAllStepData,
    clearStepData,

    // Popup state
    hasActivePopup
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
