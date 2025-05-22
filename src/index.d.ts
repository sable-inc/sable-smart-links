/**
 * Type definitions for sable-smart-links
 */

export interface SableSmartLinksConfig {
  /** URL parameter name to trigger walkthroughs (default: 'walkthrough') */
  paramName?: string;
  /** Automatically start walkthrough if parameter is found (default: true) */
  autoStart?: boolean;
  /** Delay between steps in milliseconds (default: 500) */
  stepDelay?: number;
}

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

export class WalkthroughEngine {
  constructor(config: SableSmartLinksConfig);
  register(id: string, steps: WalkthroughStep[]): void;
  start(walkthroughId: string): boolean;
  next(): void;
  end(): void;
}

export class SableSmartLinks {
  constructor(config?: SableSmartLinksConfig);
  init(): void;
  start(walkthroughId: string): boolean;
  registerWalkthrough(id: string, steps: WalkthroughStep[]): void;
  next(): void;
  end(): void;
}

declare const instance: SableSmartLinks;
export default instance;
