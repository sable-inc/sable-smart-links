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
    /** Only auto-start the walkthrough once per walkthrough id (default: false). If true, stores a key in localStorage after the first auto-start and will not auto-start again for that id. */
    autoStartOnce?: boolean;
    /** Delay between steps in milliseconds (default: 500) */
    stepDelay?: number;
  };

  /** Configuration for the text agent engine */
  textAgent?: {
    /** Automatically start text agent if parameter is found (default: true) */
    autoStart?: boolean;
    /** Position of the text agent (default: 'right') */
    position?: 'top' | 'right' | 'bottom' | 'left';
    /** Whether to persist state across page reloads (default: true) */
    persistState?: boolean;
    /** Primary color for styling (default: '#FFFFFF') */
    primaryColor?: string;
    /** Default box width for popups (default: 300) */
    defaultBoxWidth?: number;
    /** Configuration for the trigger button */
    triggerButton?: {
      /** Enable the trigger button (default: false) */
      enabled?: boolean;
      /** Text displayed on the button (default: 'Start Guide') */
      text?: string;
      /** Position of the button when not attached to a specific element */
      position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
      /** Element to attach the button to */
      targetElement?: {
        /** CSS selector for the target element */
        selector: string;
        /** Whether to wait for the element to appear in DOM */
        waitForElement?: boolean;
        /** Maximum time to wait for element in milliseconds */
        waitTimeout?: number;
        /** Position to render the button relative to target element */
        position?: 'top' | 'right' | 'bottom' | 'left';
      };
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

  /** Configuration for menu */
  menu?: {
    /** Enable the menu trigger button (default: false) */
    enabled?: boolean;
    /** Text displayed on the button (default: 'Open Menu') */
    text?: string;
    /** Position of the button when not attached to a specific element */
    position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
    /** Element to attach the button to */
    targetElement?: {
      /** CSS selector for the target element */
      selector: string;
      /** Whether to wait for the element to appear in DOM */
      waitForElement?: boolean;
      /** Maximum time to wait for element in milliseconds */
      waitTimeout?: number;
      /** Position to render the button relative to target element */
      position?: 'top' | 'right' | 'bottom' | 'left';
    };
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
    /** Configuration for the menu popup that appears when trigger elements are clicked */
    popupConfig: {
      /** 
       * Custom sections to display in the menu popup
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
        onSelect: (item: any, dataUtils?: {
          setStepData: (key: string, value: any) => void;
          getStepData: (key: string) => any;
          getAllStepData: () => Record<string, any>;
          clearStepData: () => void;
        }) => void;
      }>;
    };
  };

  /** Configuration for analytics */
  analytics?: {
    /** Enable analytics (default: true) */
    enabled?: boolean;
    /** Log events to console (default: true) */
    logEvents?: boolean;
    /** Use session storage for session tracking (default: true) */
    sessionStorage?: boolean;
    /** Use local storage for user tracking (default: true) */
    localStorage?: boolean;
  };

  /** Per-agent text agent configuration */
  textAgents?: Record<string, TextAgentAgentConfig>;
}

/**
 * Type definitions for Smart Link walkthroughs
 */

export interface WalkthroughStep {
  /** Unique identifier for the step (required for analytics tracking) */
  stepId: string;
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
  destroy(): void;

  // Internal methods for state persistence
  _saveState(): void;
  _loadState(): WalkthroughState | null;
  _clearState(): void;
  _setupNavigationHandling(): void;
  _restoreWalkthrough(): Promise<void>;
}

export class SableSmartLinks {
  constructor(config?: SableSmartLinksConfig);

  /* ------------- core ------------- */
  init(): void;

  /* ----- walkthrough API ---------- */
  restoreWalkthrough(): void;
  registerWalkthrough(id: string, steps: WalkthroughStep[]): void;
  startWalkthrough(walkthroughId: string): boolean;
  nextWalkthroughStep(): void;
  endWalkthrough(): void;

  /* ----- text-agent API ----------- */
  registerTextAgent(id: string, steps: TextAgentStep[], autoStart?: boolean, autoStartOnce?: boolean, beforeStart?: () => void | Promise<void>, requiredSelector?: string): SableSmartLinks;
  /**
   * Start a text agent with the given ID
   * @param agentId Optional ID of the text agent to start
   * @param stepId Optional step ID to start the agent from
   * @param skipTrigger Optional flag to skip trigger checks and show the popup immediately
   * @returns Promise<boolean> - Success status
   */
  startTextAgent(agentId?: string, stepId?: string | null, skipTrigger?: boolean): Promise<boolean>;
  nextTextAgentStep(): SableSmartLinks;
  previousTextAgentStep(): SableSmartLinks;
  endTextAgent(): SableSmartLinks;
  /**
   * Restart the text agent from a specific step or with options.
   * @param agentId The ID of the text agent to restart
   * @param options Options for restarting the text agent
   * @param options.stepId Optional step ID to restart from
   * @param options.skipTrigger Whether to skip trigger checks
   * @param options.useSessionStorage If true, use sessionStorage to trigger agent start
   */
  startTextAgent(agentId: string, options?: { stepId?: string | null; skipTrigger?: boolean; useSessionStorage?: boolean }): SableSmartLinks;

  /* ----- popup helpers ------------ */
  showPopup(options: PopupOptions): { unmount: () => void; mount: (parent: HTMLElement) => void } | null;
  closeAllPopups(exceptIds?: string[]): void;

  /* ----- analytics API ------------ */
  getAnalyticsSessionId(): string | null;
  getAnalyticsUserId(): string | null;
  resetAnalyticsSession(): void;
  resetAnalyticsUser(): void;

  /* ----- cleanup ------------- */
  destroy(): void;
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
  /** Secondary text content (displayed in a different style) */
  secondaryText?: string;
  /** Custom sections to display in the popup */
  sections?: Array<{
    title: string;
    icon?: string;
    items: Array<{
      text: string;
      data?: any;
    }>;
    onSelect: (item: any, dataUtils?: {
      setStepData: (key: string, value: any) => void;
      getStepData: (key: string) => any;
      getAllStepData: () => Record<string, any>;
      clearStepData: () => void;
    }) => void;
  }>;
  /** Agent information for the popup */
  agentInfo?: any;
  /** Trigger configuration for typing events */
  triggerOnTyping?: {
    /** CSS selector for the input element */
    selector: string;
    /** When to trigger the popup: 'start' (when typing begins), 'stop' (when typing stops), or 'change' (on any value change) */
    on?: 'start' | 'stop' | 'change';
    /** Delay in ms before showing popup when on='stop' (default: 1000) */
    stopDelay?: number;
  };
}

/**
 * Text Agent Step configuration
 */
export interface TextAgentStep {
  /** XPath or CSS selector that must exist for this step to be registered */
  requiredSelector?: string;

  /** Unique identifier for the step (will be auto-generated if not provided) */
  id?: string;

  /** Font size for the popup text (default: '15px') */
  fontSize?: string;

  /** Main text content to display in the popup */
  text: string | ((dataUtils?: {
    setStepData: (key: string, value: any) => void;
    getStepData: (key: string) => any;
    getAllStepData: () => Record<string, any>;
    clearStepData: () => void;
  }) => string);

  sections?: Array<{
    title: string;
    icon?: string;
    items: Array<{
      text: string;
      data?: any;
    }>;
    onSelect: (item: any, dataUtils?: {
      setStepData: (key: string, value: any) => void;
      getStepData: (key: string) => any;
      getAllStepData: () => Record<string, any>;
      clearStepData: () => void;
    }) => void;
  }> | ((dataUtils?: {
    setStepData: (key: string, value: any) => void;
    getStepData: (key: string) => any;
    getAllStepData: () => Record<string, any>;
    clearStepData: () => void;
  }) => Array<{
    title: string;
    icon?: string;
    items: Array<{
      text: string;
      data?: any;
    }>;
    onSelect: (item: any, dataUtils?: {
      setStepData: (key: string, value: any) => void;
      getStepData: (key: string) => any;
      getAllStepData: () => Record<string, any>;
      clearStepData: () => void;
    }) => void;
  }>);

  /** Secondary text content (displayed in a different style) */
  secondaryText?: string | (() => string);

  /** Width of the popup box in pixels */
  boxWidth?: number;

  /** Type of button to show in the popup */
  buttonType?: 'arrow' | 'yes-no';

  /** Callback function when proceed/continue button is clicked */
  onProceed?: ((textInput?: string, dataUtils?: {
    setStepData: (key: string, value: any) => void;
    getStepData: (key: string) => any;
    getAllStepData: () => Record<string, any>;
    clearStepData: () => void;
  }) => void | Promise<void>);

  /** Callback function for yes/no buttons (receives boolean indicating 'yes' selection and dataUtils for step data access) */
  onYesNo?: ((isYes: boolean, dataUtils?: {
    setStepData: (key: string, value: any) => void;
    getStepData: (key: string) => any;
    getAllStepData: () => Record<string, any>;
    clearStepData: () => void;
  }) => void | Promise<void>);

  /** Primary color for styling the popup */
  primaryColor?: string;

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

  /** Trigger the step when typing occurs in an input field */
  triggerOnTyping?: {
    /** CSS selector for the input element */
    selector: string;
    /** When to trigger the popup: 'start' (when typing begins), 'stop' (when typing stops), or 'change' (on any value change) */
    on?: 'start' | 'stop' | 'change';
    /** Delay in ms before showing popup when on='stop' (default: 1000) */
    stopDelay?: number;
  };

  /** Trigger the step when a button is pressed */
  triggerOnButtonPress?: {
    /** CSS selector for the button element */
    selector: string;
    /** Event to listen for, defaults to 'click' */
    event?: 'click' | 'mousedown' | 'mouseup' | 'focus' | 'blur';
    /** Delay in ms before showing popup after the event (default: 0) */
    delay?: number;
  };

  /** Conditional function to determine if step should be shown */
  showIf?: () => boolean;
}

export interface TextAgentAgentConfig {
  steps: TextAgentStep[];
  autoStart?: boolean;
  autoStartOnce?: boolean;
  beforeStart?: (dataUtils?: {
    setStepData: (key: string, value: any) => void;
    getStepData: (key: string) => any;
    getAllStepData: () => Record<string, any>;
    clearStepData: () => void;
  }) => void | Promise<void>;
  requiredSelector?: string;
}

/**
 * Element Interactor - Utility class for common DOM element interactions
 */
export interface ScrollIntoViewOptions {
  behavior?: ScrollBehavior;
  block?: ScrollLogicalPosition;
  inline?: ScrollLogicalPosition;
}

export class ElementInteractor {
  /**
   * Sets the value of an input or textarea element and triggers appropriate events
   */
  static setInputValue(element: HTMLInputElement | HTMLTextAreaElement, value: string): void;

  /**
   * Clicks an element with optional delay
   */
  static async clickElement(element: Element, delay?: number): Promise<void>;

  /**
   * Scrolls an element into view with specified options
   */
  static async scrollIntoView(element: Element, options?: ScrollIntoViewOptions): Promise<void>;

  /**
   * Waits for an element to appear in the DOM
   */
  static async waitForElement(selector: string, timeout?: number): Promise<Element>;

  /**
   * Checks if an element is currently visible in the viewport
   */
  static isElementInViewport(element: Element): boolean;

  /**
   * Gets an element by selector with support for both CSS and XPath
   */
  static getElement(selector: string): Element | null;

  /**
   * Gets multiple elements by selector with support for both CSS and XPath
   */
  static getElements(selector: string): Element[];

  /**
   * Checks if an element exists in the DOM
   */
  static elementExists(selector: string): boolean;

  /**
   * Gets the computed style of an element
   */
  static getComputedStyle(element: Element, property?: string): string | CSSStyleDeclaration;

  /**
   * Checks if an element is visible (not hidden by CSS)
   */
  static isElementVisible(element: Element): boolean;

  /**
   * Highlights an element with prominent visual effects
   */
  static highlightElement(element: Element): { originalStyle: string, styleTag: HTMLStyleElement };

  /**
   * Restores original element style and cleans up highlight effects
   */
  static restoreElementStyle(element: Element, styleInfo: { originalStyle: string, styleTag: HTMLStyleElement }): void;

  /**
   * Starts an agent by dispatching the 'sable:textAgentStart' event or setting sessionStorage
   */
  static startAgent(agentId: string, options?: {
    stepId?: string;
    skipTrigger?: boolean;
    useSessionStorage?: boolean;
  }): void;

  /**
   * Ends an agent by dispatching the 'sable:textAgentEnd' event
   */
  static endAgent(agentId: string): void;
}

// Export individual functions for convenience
export const setInputValue: typeof ElementInteractor.setInputValue;
export const clickElement: typeof ElementInteractor.clickElement;
export const scrollIntoView: typeof ElementInteractor.scrollIntoView;
export const waitForElement: typeof ElementInteractor.waitForElement;
export const isElementInViewport: typeof ElementInteractor.isElementInViewport;
export const getElement: typeof ElementInteractor.getElement;
export const getElements: typeof ElementInteractor.getElements;
export const elementExists: typeof ElementInteractor.elementExists;
export const getComputedStyle: typeof ElementInteractor.getComputedStyle;
export const isElementVisible: typeof ElementInteractor.isElementVisible;
export const highlightElement: typeof ElementInteractor.highlightElement;
export const restoreElementStyle: typeof ElementInteractor.restoreElementStyle;
export const startAgent: typeof ElementInteractor.startAgent;
export const endAgent: typeof ElementInteractor.endAgent;

/**
 * Analytics utilities
 */
export declare function logTextAgentEvent(eventData: {
  event: string;
  agentId: string;
  stepId: string;
  instanceId?: string | null;
  stepDuration?: number | null;
  agentDuration?: number | null;
  metadata?: Record<string, any>;
}): Promise<string | null>;

export declare function updateTextAgentEventDuration(analyticsId: string, stepDuration: number): Promise<void>;

export declare function logTextAgentStart(agentId: string, stepId: string, instanceId?: string | null, metadata?: Record<string, any>, agentDuration?: number | null): Promise<string | null>;
export declare function logTextAgentNext(agentId: string, stepId: string, instanceId?: string | null, metadata?: Record<string, any>, agentDuration?: number | null): Promise<string | null>;
export declare function logTextAgentPrevious(agentId: string, stepId: string, instanceId?: string | null, metadata?: Record<string, any>, agentDuration?: number | null): Promise<string | null>;
export declare function logTextAgentEnd(agentId: string, stepId: string, instanceId?: string | null, metadata?: Record<string, any>, agentDuration?: number | null): Promise<string | null>;
export declare function logTextAgentRestart(agentId: string, stepId: string, instanceId?: string | null, metadata?: Record<string, any>, agentDuration?: number | null): Promise<string | null>;
export declare function logTextAgentStepRendered(agentId: string, stepId: string, instanceId?: string | null, metadata?: Record<string, any>, agentDuration?: number | null): Promise<string | null>;

export declare function logWalkthroughEvent(eventData: {
  event: string;
  walkthroughId: string;
  stepIndex: number;
  stepId: string;
  stepSelector?: string | null;
  instanceId?: string | null;
  stepDuration?: number | null;
  agentDuration?: number | null;
  metadata?: Record<string, any>;
}): Promise<string | null>;

export declare function updateWalkthroughEventDuration(analyticsId: string, stepDuration: number): Promise<void>;

export declare function logWalkthroughStart(walkthroughId: string, stepIndex: number, stepId: string, instanceId?: string | null, metadata?: Record<string, any>, agentDuration?: number | null): Promise<string | null>;
export declare function logWalkthroughNext(walkthroughId: string, stepIndex: number, stepId: string, instanceId?: string | null, metadata?: Record<string, any>, agentDuration?: number | null): Promise<string | null>;
export declare function logWalkthroughEnd(walkthroughId: string, stepIndex: number, stepId: string, instanceId?: string | null, metadata?: Record<string, any>, agentDuration?: number | null): Promise<string | null>;
export declare function logWalkthroughStepExecuted(walkthroughId: string, stepIndex: number, stepId: string, stepSelector: string, instanceId?: string | null, metadata?: Record<string, any>, agentDuration?: number | null): Promise<string | null>;
export declare function logWalkthroughStepError(walkthroughId: string, stepIndex: number, stepId: string, stepSelector: string, instanceId?: string | null, metadata?: Record<string, any>, agentDuration?: number | null): Promise<string | null>;

export declare function getCurrentSessionId(): string;
export declare function getCurrentUserId(): string;
export declare function resetSessionId(): void;
export declare function resetUserId(): void;

export declare function logCrawlBedrockQuery(eventData: {
  url: string;
  instructions: string;
  output?: any;
  duration: number;
  error?: string | null;
}): Promise<string | null>;

export declare function logSearchBedrockQuery(eventData: {
  query: string;
  output?: any;
  duration: number;
  error?: string | null;
}): Promise<string | null>;

/**
 * Tavily helper functions and types
 */
export interface CrawlParameters {
  extractDepth: "basic" | "advanced";
  categories: ("Documentation" | "Blogs" | "Community" | "About" | "Contact" | "Pricing" | "Enterprise" | "Careers" | "E-Commerce" | "Media" | "People")[];
  explanation: string;
  otherCrawls: string[];
}

export interface SearchParameters {
  searchTopic: "general" | "news" | "finance";
  searchDepth: "basic" | "advanced";
  timeRange: "none" | "day" | "week" | "month" | "year";
  includeAnswer: "none" | "basic" | "advanced";
  explanation: string;
  otherQueries: string[];
}

export interface CrawlBedrockEventData {
  url: string;
  instructions: string;
  output: CrawlParameters | null;
  duration: number;
  error: string | null;
}

export interface SearchBedrockEventData {
  query: string;
  output: SearchParameters | null;
  duration: number;
  error: string | null;
}

export declare function getOptimalCrawlParameters(url: string, instructions: string): Promise<CrawlParameters>;
export declare function getOptimalSearchParameters(query: string): Promise<SearchParameters>;
export declare function getOptimalCrawlParametersServer(url: string, instructions: string): Promise<CrawlParameters>;
export declare function getOptimalSearchParametersServer(query: string): Promise<SearchParameters>;
export declare function createSableTavilyHandler(): any;

/**
 * React components and hooks
 */
export interface SableSmartLinksContextType {
  // Walkthrough methods
  registerWalkthrough: (id: string, steps: WalkthroughStep[]) => void;
  restoreWalkthrough: () => void;
  startWalkthrough: (walkthroughId: string) => boolean;
  nextWalkthroughStep: () => void;
  endWalkthrough: () => void;

  // Text Agent methods
  registerTextAgent: (id: string, steps: TextAgentStep[], autoStart?: boolean, autoStartOnce?: boolean, beforeStart?: (dataUtils?: {
    setStepData: (key: string, value: any) => void;
    getStepData: (key: string) => any;
    getAllStepData: () => Record<string, any>;
    clearStepData: () => void;
  }) => void | Promise<void>, requiredSelector?: string) => SableSmartLinksContextType;
  startTextAgent: (agentId?: string, stepId?: string | null, skipTrigger?: boolean) => Promise<boolean>;
  nextTextAgentStep: () => SableSmartLinksContextType;
  previousTextAgentStep: () => SableSmartLinksContextType;
  endTextAgent: () => SableSmartLinksContextType;
  restartTextAgent: (agentId?: string, options?: { stepId?: string | null; skipTrigger?: boolean; beforeRestartCallback?: (() => void) | null }) => SableSmartLinksContextType;

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

  // Popup state
  hasActivePopup: boolean;

  // Shared data methods for passing data between steps
  setStepData: (key: string, value: any) => void;
  getStepData: (key: string) => any;
  getAllStepData: () => Record<string, any>;
  clearStepData: () => void;
}

export interface SableSmartLinksProviderProps {
  config?: SableSmartLinksConfig;
  children: React.ReactNode;
  autoInit?: boolean;
  walkthroughs?: Record<string, WalkthroughStep[]>;
  textAgents?: Record<string, TextAgentAgentConfig>;
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
      sections?: Array<{
        title: string;
        icon?: string;
        items: Array<{
          text: string;
          data?: any;
        }>;
        onSelect: (item: any, dataUtils?: {
          setStepData: (key: string, value: any) => void;
          getStepData: (key: string) => any;
          getAllStepData: () => Record<string, any>;
          clearStepData: () => void;
        }) => void;
      }>;
    };
  };
  initialStepData?: Record<string, any>;
}

export declare const SableSmartLinksProvider: React.FC<SableSmartLinksProviderProps>;
export declare const useSableSmartLinks: () => SableSmartLinksContextType;