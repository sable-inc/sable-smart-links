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
    /** Whether to persist state across page reloads (default: true) */
    persistState?: boolean;
    /** Configuration for the final popup shown at the end of a text agent session */
    finalPopupConfig?: {
      /** Whether to enable chat input (default: true) */
      enableChat?: boolean;
      /** 
       * Custom sections to display in the final popup
       * Each section can have its own title, items, and behavior
       */
      sections?: Array<{
        /** Title of the section */
        title: string;
        /** Icon to display next to items (emoji or URL) */
        icon?: string;
        /** Items to display in this section */
        items: Array<{
          /** Display text for the item */
          text: string;
          /** Additional data needed for the handler */
          data?: any;
        }>;
        /** Handler function to execute when an item in this section is selected */
        onSelect: (item: any) => void;
      }>;
    };
    /** Configuration for the trigger button */
    triggerButton?: {
      /** Enable the trigger button (default: false) */
      enabled?: boolean;
      /** Text displayed on the button (default: 'Start Guide') */
      text?: string;
      /** Position of the button when not attached to a specific element */
      position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
      /** CSS selector for the element to attach the button to */
      targetSelector?: string | null;
      /** URL paths where the button should be shown (empty array means all paths) */
      urlPaths?: string[];
      /** Custom styles for the button */
      style?: {
        /** Background color of the button */
        backgroundColor?: string;
        /** Text color of the button */
        color?: string;
        /** Border radius of the button */
        borderRadius?: string;
        /** Padding of the button */
        padding?: string;
        /** Font size of the button text */
        fontSize?: string;
        /** Box shadow of the button */
        boxShadow?: string;
        /** Any other CSS properties */
        [key: string]: string | undefined;
      };
    };
  };
}

/**
 * Type definitions for Smart Link walkthroughs
 */

export interface WalkthroughStep {
  /** CSS selector for the target element */
  selector?: string;
  /** Highlight configuration for the element */
  highlight?: {
    /** Color of the highlight */
    color?: string;
    /** Padding around the element in pixels */
    padding?: number;
    /** Whether to animate the highlight */
    animate?: boolean;
    /** Custom CSS classes to add */
    className?: string;
    /** Horizontal offset in pixels (positive = right, negative = left) */
    offsetX?: number;
    /** Vertical offset in pixels (positive = down, negative = up) */
    offsetY?: number;
  };
  /** Spotlight configuration for the element */
  spotlight?: {
    /** Padding around the element in pixels */
    padding?: number;
    /** Opacity of the overlay */
    opacity?: number;
    /** Color of the overlay */
    color?: string;
    /** Animation duration in milliseconds */
    animationDuration?: number;
    /** Horizontal offset in pixels (positive = right, negative = left) */
    offsetX?: number;
    /** Vertical offset in pixels (positive = down, negative = up) */
    offsetY?: number;
  };
  /** Tooltip content to display */
  tooltip?: string | {
    title?: string;
    content: string;
    position?: 'top' | 'right' | 'bottom' | 'left';
    /** Custom CSS classes to add */
    className?: string;
    /** Whether to show next/previous buttons */
    showNavigation?: boolean;
    /** Custom button text */
    nextButtonText?: string;
    /** Custom button text */
    prevButtonText?: string;
    /** Horizontal offset in pixels (positive = right, negative = left) */
    offsetX?: number;
    /** Vertical offset in pixels (positive = down, negative = up) */
    offsetY?: number;
  };
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
  closeAllPopups(): void;
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
  /** XPath or CSS selector that must exist for this popup to be shown */
  requiredSelector?: string;
  
  id?: string; 
  /** The text to display in the popup */
  text: string;
  /** Width of the popup in pixels (default: 300) */
  boxWidth?: number;
  /** Font size of the popup text in pixels (default: '15px') */
  fontSize?: string;
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
  /** XPath or CSS selector that must exist for this step to be registered */
  requiredSelector?: string;

  /** Unique identifier for the step (will be auto-generated if not provided) */
  id?: string;

  fontSize?: string;
  
  /** Main text content to display in the popup */
  text: string;
  
  /** Secondary text content (displayed in a different style) */
  secondaryText?: string;
  
  /** Width of the popup box in pixels */
  boxWidth?: number;
  
  /** Type of button to show in the popup */
  buttonType?: 'arrow' | 'yes-no';
  
  /** Callback function when proceed/continue button is clicked */
  onProceed?: ((textInput?: string) => void | Promise<void>);
  
  /** Callback function for yes/no buttons (receives boolean indicating 'yes' selection) */
  onYesNo?: (isYes: boolean) => void;
  
  /** Primary color for styling the popup */
  primaryColor?: string;
  
  /** Whether the popup should be minimizable */
  minimizable?: boolean;
  
  /** Whether the popup starts in minimized state */
  startMinimized?: boolean;
  
  /** Callback when minimized state changes */
  onMinimizeStateChange?: (isMinimized: boolean) => void;
  
  /** Element to highlight or focus during this step */
  targetElement?: {
    /** CSS selector for the target element */
    selector: string;
    /** Whether to wait for the element to appear in DOM */
    waitForElement?: boolean;
    /** Maximum time to wait for element in milliseconds */
    waitTimeout?: number;
    /** Position to render the popup relative to target element */
    position?: 'top' | 'right' | 'bottom' | 'left';
  };
  
  /** Whether to automatically advance to next step */
  autoAdvance?: boolean;
  
  /** Delay in milliseconds before auto-advancing */
  autoAdvanceDelay?: number;
  
  /** Action to perform during this step */
  action?: {
    /** Type of action to perform */
    type?: 'click' | 'input' | 'focus' | 'hover' | 'custom';
    /** Value for input actions */
    value?: string;
    /** Whether to use typing effect for input */
    typeEffect?: boolean;
    /** Delay between characters when using type effect (ms) */
    typeDelay?: number;
    /** Delay before performing the action (ms) */
    delay?: number;
    /** Whether to auto-advance after action completes */
    autoAdvance?: boolean;
    /** Custom handler function for 'custom' action type */
    handler?: (element: HTMLElement, engine: any) => void;
  };
  
  /** Custom callback function called when step is executed */
  callback?: (element: HTMLElement | null, engine: any) => void;
  
  includeTextBox?: boolean;

  triggerOnTyping?: {
    /** CSS selector for the input element */
    selector: string;
    /** When to trigger the popup: 'start' (when typing begins), 'stop' (when typing stops), or 'change' (on any value change) */
    on?: 'start' | 'stop' | 'change';
    /** Delay in ms before showing popup when on='stop' (default: 1000) */
    stopDelay?: number;
  };
  
  // /** Position of the popup relative to the viewport or target element */
  // position?: {
  //   top?: string | number;
  //   left?: string | number;
  //   right?: string | number;
  //   bottom?: string | number;
  // };
  
  // /** Custom CSS class names */
  // className?: {
  //   container?: string;
  //   text?: string;
  //   secondaryText?: string;
  //   buttons?: string;
  // };
}