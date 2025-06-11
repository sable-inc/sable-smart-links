/**
 * Type definitions for sable-smart-links
 */

export interface SableSmartLinksConfig {
  /** Enable debug logging (default: false) */
  debug?: boolean;
  
  /** Configuration for the walkthrough engine */
  walkthrough?: {
    /** URL parameter name to trigger walkthroughs (default: 'walkthrough') */
    paramName?: string;
    /** Automatically start walkthrough if parameter is found (default: true) */
    autoStart?: boolean;
    /** Delay between steps in milliseconds (default: 500) */
    stepDelay?: number;
  };

  /** Configuration for the text agent engine */
  textAgent?: {
    /** Default state of the text agent (default: 'collapsed') */
    defaultState?: 'expanded' | 'collapsed';
    /** Position of the text agent (default: 'right') */
    position?: 'top' | 'right' | 'bottom' | 'left';
    /** Whether to enable chat input (default: false) */
    enableChatInput?: boolean;
    /** Whether to persist state across page reloads (default: true) */
    persistState?: boolean;
  };
}

/**
 * Type definitions for Smart Link walkthroughs
 */

export interface WalkthroughStep {
  /** CSS selector for the target element */
  selector?: string;
  /** Whether to highlight the element */
  highlight?: boolean;
  /** Options for highlighting */
  highlightOptions?: Record<string, any>;
  /** Whether to create a spotlight effect */
  spotlight?: boolean;
  /** Tooltip content to display */
  tooltip?: string | {
    title?: string;
    content: string;
    position?: 'top' | 'right' | 'bottom' | 'left';
  };
  /** Options for tooltip display */
  tooltipOptions?: Record<string, any>;
  /** Action to perform on the element */
  action?: {
    /** Type of action to perform */
    type: 'click' | 'input' | 'focus' | 'hover' | 'custom';
    /** Value for input actions */
    value?: string;
    /** Whether to automatically advance to next step */
    autoAdvance?: boolean;
    /** Delay before action or before advancing (ms) */
    delay?: number;
    /** Whether to use typing effect for input */
    typeEffect?: boolean;
    /** Delay between characters for typing effect (ms) */
    typeDelay?: number;
    /** Custom handler function */
    handler?: (element: HTMLElement, engine: WalkthroughEngine) => void;
  };
  /** Whether to automatically advance to next step */
  autoAdvance?: boolean;
  /** Delay before auto-advancing (ms) */
  autoAdvanceDelay?: number;
  /** Timeout for waiting for element (ms) */
  timeout?: number;
  /** Whether to continue to next step on error */
  continueOnError?: boolean;
  /** Custom callback function */
  callback?: (element: HTMLElement | null, engine: WalkthroughEngine) => void;
}

interface WalkthroughState {
  walkthroughId: string;
  currentStep: number;
  isRunning: boolean;
  timestamp: number;
}

export class WalkthroughEngine {
  constructor(config: SableSmartLinksConfig);
  register(id: string, steps: WalkthroughStep[]): void;
  start(walkthroughId: string): boolean;
  next(): void;
  end(): void;
  
  // Internal methods for state persistence
  _saveState(): void;
  _loadState(): WalkthroughState | null;
  _clearState(): void;
  _setupNavigationHandling(): void;
  _restoreWalkthrough(): Promise<void>;
}

export class SableSmartLinks {
  constructor(config?: SableSmartLinksConfig);
  
  // Core methods
  init(): void;
  
  // Walkthrough methods
  restoreWalkthrough(): void;
  registerWalkthrough(id: string, steps: WalkthroughStep[]): void;
  startWalkthrough(walkthroughId: string): boolean;
  nextWalkthroughStep(): void;
  endWalkthrough(): void;
  
  // Text Agent methods
  registerTextAgent(id: string, steps: TextAgentStep[]): void;
  startTextAgent(agentId?: string): void;
  nextTextAgentStep(): void;
  previousTextAgentStep(): void;
  toggleTextAgentExpand(): void;
  sendTextAgentMessage(message: string): void;
  endTextAgent(): void;
  
  // Popup methods
  showPopup(options: PopupOptions): { unmount: () => void; mount: (parent: HTMLElement) => void } | null;
  showComplexPopup(options: PopupOptions): { unmount: () => void; mount: (parent: HTMLElement) => void } | null;
}

declare const instance: SableSmartLinks;
export default instance;

/**
 * Type definitions for the Sable text agent
 */

/**
 * Options for showing a popup
 */
export interface PopupOptions {
  /** The text to display in the popup */
  text: string;
  /** Width of the popup in pixels (default: 300) */
  boxWidth?: number;
  /** Type of buttons to show (default: 'arrow') */
  buttonType?: 'arrow' | 'yes-no';
  /** Callback when proceed/continue is clicked */
  onProceed?: () => void;
  /** Callback for yes/no buttons (receives boolean) */
  onYesNo?: (isYes: boolean) => void;
  /** Primary color for the popup (default: '#FFFFFF') */
  primaryColor?: string;
  /** Parent element to mount the popup to (default: document.body) */
  parent?: HTMLElement;
}

/**
 * Text Agent Step configuration
 */
export interface TextAgentStep {
  /** Whether the text agent step is draggable */
  draggable?: boolean;

  /** Configuration for chat input */
  chatInput?: {
    /** Whether chat input is enabled */
    enabled: boolean;
    /** Placeholder text for the chat input */
    placeholder?: string;
  };

  /** Chat state configuration */
  chatState?: {
    /** Current state of the chat */
    state: 'expanded' | 'collapsed';
    /** Handler function for state changes */
    onStateChange?: (newState: 'expanded' | 'collapsed') => void;
  };

  /** Proceed button configuration */
  proceedButton?: {
    /** Whether to show the proceed button */
    show: boolean;
    /** Position of the proceed button */
    position: 'after-text' | 'bottom' | 'right';
    /** Custom button text */
    text?: string;
    /** Handler function when proceed is clicked */
    onClick?: () => void;
  };

  /** Yes/No buttons configuration */
  yesNoButtons?: {
    /** Whether to show yes/no buttons */
    show: boolean;
    /** Position of the yes/no buttons */
    position: 'left' | 'right' | 'middle';
    /** Custom yes button text */
    yesText?: string;
    /** Custom no button text */
    noText?: string;
    /** Handler function when yes is clicked */
    onYes?: () => void;
    /** Handler function when no is clicked */
    onNo?: () => void;
  };

  /** Whether to show the minimize button */
  showMinimizeButton?: boolean;

  /** Main text content */
  text: string;

  /** Secondary text content (displayed in blue) */
  secondaryText?: string;

  /** Element selector configuration */
  selector?: {
    /** CSS selector for the target element */
    target: string;
    /** Position of the selector indicator */
    position: 'top' | 'right' | 'bottom' | 'left';
  };

  /** Action configuration */
  action?: {
    /** Handler function for the action */
    handler: () => void | Promise<void>;
    /** Whether the action should be triggered automatically */
    autoTrigger?: boolean;
  };

  /** Custom CSS class names */
  className?: {
    container?: string;
    text?: string;
    secondaryText?: string;
    buttons?: string;
  };
}