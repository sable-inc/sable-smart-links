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
    /** Default state of the text agent (default: 'collapsed') */
    defaultState?: 'expanded' | 'collapsed';
    /** Position of the text agent (default: 'right') */
    position?: 'top' | 'right' | 'bottom' | 'left';
    /** Whether to persist state across page reloads (default: true) */
    persistState?: boolean;
    /** Primary color for styling (default: '#FFFFFF') */
    primaryColor?: string;
    /** Default box width for popups (default: 300) */
    defaultBoxWidth?: number;
    /** Whether to enable chat input in text agent (default: false) */
    enableChatInput?: boolean;
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
        /** Optional step ID to restart the text agent from when an item in this section is selected
         * If provided, the text agent will restart from this step when any item in this section is selected
         * If null or undefined (default), no restart will occur
         * @property {boolean} skipTrigger - When true, any triggers (like triggerOnTyping) for the step will be ignored
         *                                  and the popup will be displayed immediately
         */
        restartFromStep?: string | null | { stepId: string | null; skipTrigger?: boolean };
        /** Items to display in this section */
        items: Array<{
          /** Display text for the item */
          text: string;
          /** Optional step ID to restart the text agent from when this specific item is selected
           * This overrides the section-level restartFromStep if provided
           * @property {boolean} skipTrigger - When true, any triggers (like triggerOnTyping) for the step will be ignored
           *                                  and the popup will be displayed immediately
           */
          restartFromStep?: string | null | { stepId: string | null; skipTrigger?: boolean };
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
      /** Whether to enable chat input (default: true) */
      enableChat?: boolean;
      /** 
       * Custom sections to display in the menu popup
       * Each section can have its own title, items, and behavior
       */
      sections?: Array<{
        /** Title of the section */
        title: string;
        /** Icon to display next to items (emoji or URL) */
        icon?: string;
        /** Optional step ID to restart the text agent from when an item in this section is selected
         * If provided, the text agent will restart from this step when any item in this section is selected
         * If null or undefined (default), no restart will occur
         * @property {boolean} skipTrigger - When true, any triggers (like triggerOnTyping) for the step will be ignored
         *                                  and the popup will be displayed immediately
         */
        restartFromStep?: string | null | { stepId: string | null; skipTrigger?: boolean };
        /** Items to display in this section */
        items: Array<{
          /** Display text for the item */
          text: string;
          /** Optional step ID to restart the text agent from when this specific item is selected
           * This overrides the section-level restartFromStep if provided
           * @property {boolean} skipTrigger - When true, any triggers (like triggerOnTyping) for the step will be ignored
           *                                  and the popup will be displayed immediately
           */
          restartFromStep?: string | null | { stepId: string | null; skipTrigger?: boolean };
          /** Additional data needed for the handler */
          data?: any;
        }>;
        /** Handler function to execute when an item in this section is selected */
        onSelect: (item: any) => void;
      }>;
    };
  };
  
    /* --------------------------------------------------------------------- */
    /* ----------------------  NEW  VOICE-AGENT BLOCK  --------------------- */
    /* --------------------------------------------------------------------- */
  
  voice?: {
    /** Turn the voice popup on (default: false) */
    enabled?: boolean;

    /** Low-level engine to use */
    engine?: 'nova' | 'openai' | 'custom';

    /** WebSocket endpoint, e.g. `ws://localhost:3001` */
    serverUrl?: string;

    /** System prompt sent at `promptStart` */
    systemPrompt?: string;

    /** Function calls/tools configuration */
    tools?: VoiceToolConfig[];

    /** Speaking speed multiplier (default: 1.1) */
    speakingSpeed?: number;

    /** Popup look-and-feel */
    ui?: {
      /** Screen corner for the widget (default: bottom-right) */
      position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

      buttonText?: {
        start?: string;   // text before session starts   (default: "Start Voice Chat")
        stop?: string;    // text while session is active (default: "End Chat")
      };

      theme?: {
        /** Primary colour for buttons / accents */
        primaryColor?: string;
        /** Background colour of the popup */
        backgroundColor?: string;
      };
    };
  };

  /** Per-agent text agent configuration */
  textAgents?: Record<string, TextAgentAgentConfig>;
}


/** Configuration for voice tools/function calls */
export interface VoiceToolConfig {
  /** Name of the tool */
  name: string;
  /** Description of what the tool does */
  description: string;
  /** JSON schema for the tool parameters */
  parameters: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
  /** Handler function that gets called when the tool is used */
  handler: (parameters: any) => Promise<any> | any;
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

  /* ------------- core ------------- */
  init(): void;

  /* ----- walkthrough API ---------- */
  restoreWalkthrough(): void;
  registerWalkthrough(id: string, steps: WalkthroughStep[]): void;
  startWalkthrough(walkthroughId: string): boolean;
  nextWalkthroughStep(): void;
  endWalkthrough(): void;

  /* ----- text-agent API ----------- */
  registerTextAgent(id: string, steps: TextAgentStep[], autoStart?: boolean, autoStartOnce?: boolean): void;
  startTextAgent(agentId?: string): void;
  nextTextAgentStep(): void;
  previousTextAgentStep(): void;
  toggleTextAgentExpand(): void;
  sendTextAgentMessage(message: string): void;
  endTextAgent(): void;

  /* ----- voice-agent (minimal) ------ */
  /** Start/stop voice chat */
  toggleVoiceChat(): Promise<void>;
  
  /** Check if voice is active */
  isVoiceChatActive(): boolean;

  /* ----- popup helpers ------------ */
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
    restartFromStep?: string | null | { stepId: string | null; skipTrigger?: boolean };
    items: Array<{
      text: string;
      restartFromStep?: string | null | { stepId: string | null; skipTrigger?: boolean };
      data?: any;
    }>;
    onSelect: (item: any) => void;
  }> | ((dataUtils?: {
    setStepData: (key: string, value: any) => void;
    getStepData: (key: string) => any;
    getAllStepData: () => Record<string, any>;
    clearStepData: () => void;
  }) => Array<{
    title: string;
    icon?: string;
    restartFromStep?: string | null | { stepId: string | null; skipTrigger?: boolean };
    items: Array<{
      text: string;
      restartFromStep?: string | null | { stepId: string | null; skipTrigger?: boolean };
      data?: any;
    }>;
    onSelect: (item: any) => void;
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
  
  /** Callback function for yes/no buttons (receives boolean indicating 'yes' selection) */
  onYesNo?: (isYes: boolean) => void;
  
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
  
  /** Whether to include a text input box in the popup (default: false) */
  includeTextBox?: boolean;

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
}

export interface TextAgentAgentConfig {
  steps: TextAgentStep[];
  autoStart?: boolean;
  autoStartOnce?: boolean;
}