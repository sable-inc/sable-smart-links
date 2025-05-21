import { ReactNode } from 'react';
import { SableSmartLinks, SmartLinksConfig, WalkthroughStep } from '../../index';

export interface SmartLinksProviderProps {
  children: ReactNode;
  walkthroughs?: Record<string, WalkthroughStep[]>;
  config?: SmartLinksConfig;
}

export function SmartLinksProvider(props: SmartLinksProviderProps): JSX.Element;

export function useSmartLinks(): SableSmartLinks | null;

export interface WalkthroughControls {
  start: () => boolean;
  next: () => void;
  end: () => void;
}

export function useWalkthrough(id: string, steps: WalkthroughStep[]): WalkthroughControls;
