import { ReactNode } from 'react';
import { SmartLinksConfig, WalkthroughStep } from '../../index';
import { WalkthroughControls } from '../react';

export interface SmartLinksProviderProps {
  children: ReactNode;
  walkthroughs?: Record<string, WalkthroughStep[]>;
  config?: SmartLinksConfig;
}

export function SmartLinksProvider(props: SmartLinksProviderProps): JSX.Element;

export function useSmartLinks(): any | null;

export function useWalkthrough(id: string, steps: WalkthroughStep[]): WalkthroughControls;
