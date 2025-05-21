/**
 * Type definitions for sable-smart-links
 */

import { Auth } from '@aws-amplify/auth';

// Configuration interfaces
export interface AuthConfig {
  environment?: 'production' | 'staging' | 'development';
  region?: string;
  userPoolId?: string;
  clientId?: string;
  apiUrl?: string;
}

export interface SmartLinksConfig {
  paramName?: string;
  autoStart?: boolean;
  stepDelay?: number;
  authToken?: string;
}

// Walkthrough step interfaces
export interface TooltipOptions {
  title: string;
  content: string;
  nextButton?: string;
  prevButton?: string;
  skipButton?: string;
}

export interface ActionOptions {
  type: 'click' | 'input' | 'focus' | 'hover' | 'custom';
  autoAdvance?: boolean;
  delay?: number;
  value?: string;
  typeEffect?: boolean;
  typeSpeed?: number;
  handler?: (element: HTMLElement, instance: any) => void;
}

export interface WalkthroughStep {
  selector?: string;
  highlight?: boolean;
  spotlight?: boolean;
  spotlightPadding?: number;
  spotlightAnimate?: boolean;
  overlayOpacity?: number;
  tooltip?: TooltipOptions;
  position?: 'top' | 'right' | 'bottom' | 'left' | 'auto';
  action?: ActionOptions;
  autoAdvance?: boolean;
  autoAdvanceDelay?: number;
  timeout?: number;
  continueOnError?: boolean;
  callback?: (element: HTMLElement | null, instance: any) => void;
}

// Walkthrough engine interface
export interface WalkthroughEngine {
  register(id: string, steps: WalkthroughStep[]): void;
  start(walkthroughId: string): boolean;
  next(): void;
  end(): void;
}

// Main class
export class SableSmartLinks {
  constructor(config?: SmartLinksConfig);
  
  config: SmartLinksConfig;
  walkthroughEngine: WalkthroughEngine;
  apiUrl: string;
  
  init(): void;
  start(walkthroughId: string): boolean;
  registerWalkthrough(id: string, steps: WalkthroughStep[]): void;
  registerActiveWalkthroughs(
    orgId: string, 
    jwtToken?: string, 
    apiBaseUrl?: string
  ): Promise<string[]>;
  next(): void;
  end(): void;
  
  static initAuth(config: AuthConfig): void;
  static login(email: string, password: string): Promise<any>;
  static getAuthToken(): Promise<string | null>;
}

// Default export is an instance of SableSmartLinks
declare const instance: SableSmartLinks;
export default instance;
