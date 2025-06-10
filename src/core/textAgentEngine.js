/**
 * Text Agent Engine
 * Core functionality for managing and executing text agent guides
 */

import { waitForElement } from './elementSelector.js';
import { highlightElement, removeHighlight } from '../ui/highlight.js';
import { showTooltip, hideTooltip } from '../ui/tooltip.js';
import { createSpotlight, removeSpotlights } from '../ui/spotlight.js';
import { isBrowser, safeWindow, safeDocument } from '../utils/browserAPI.js';

export class TextAgentEngine {
  /**
   * Create a new TextAgentEngine
   * @param {Object} config - Configuration options
   */
  constructor(config) {
    // TODO: figure out default config settings
    this.config = {
      ...config
    };
    
    if (this.config.debug) {
      console.log('[SableSmartLinks] Initializing with config:', this.config);
    }
    
    // TODO: figure out state management
    // this.walkthroughs = {};
    // this.currentWalkthrough = null;
    // this.currentStep = 0;
    // this.isRunning = false;
    // this.activeElements = {
    //   highlighted: null,
    //   tooltip: null,
    //   overlay: null
    // };
    
    // Bind methods to ensure correct 'this' context
    this.next = this.next.bind(this);
    this.end = this.end.bind(this);
  }
}
