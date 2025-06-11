/**
 * Sable Smart Links
 * A library for creating guided product walkthroughs triggered by URL parameters
 */

import { parseUrlParameters } from './core/urlParser.js';
import { WalkthroughEngine } from './core/walkthroughEngine.js';
import { TextAgentEngine } from './core/textAgentEngine.js';
import { isBrowser, safeDocument } from './utils/browserAPI.js';

// Import Tavily features
export * from './config';
export * from './features/tavily';

class SableSmartLinks {
  /**
   * Create a new SableSmartLinks instance
   * @param {SableSmartLinksConfig} config - Configuration options
   */
  constructor(config = {}) {
    // Set default configuration
    this.config = {
      debug: false,
      walkthrough: {
        paramName: 'walkthrough',
        autoStart: true,
        stepDelay: 500
      },
      textAgent: {
        defaultState: 'collapsed',
        position: 'right',
        enableChatInput: false,
        persistState: true
      },
      ...config,
      // Deep merge for nested objects
      walkthrough: {
        ...(config.walkthrough || {})
      },
      textAgent: {
        ...(config.textAgent || {})
      }
    };
    
    // Initialize engines with their specific configs
    this.walkthroughEngine = new WalkthroughEngine({
      debug: this.config.debug,
      ...this.config.walkthrough
    });
    
    this.textAgentEngine = new TextAgentEngine({
      debug: this.config.debug,
      ...this.config.textAgent
    });
    
    // Auto-start walkthrough if enabled and in browser
    const shouldAutoStart = this.config.walkthrough?.autoStart !== false;
    if (shouldAutoStart && isBrowser) {
      // Wait for DOM to be fully loaded
      if (safeDocument.readyState === 'loading') {
        safeDocument.addEventListener('DOMContentLoaded', () => this.init());
      } else {
        this.init();
      }
    }
  }
  
  /**
   * Initialize the library and check for walkthrough parameters
   */
  init() {
    const params = parseUrlParameters();
    const walkthroughId = params[this.config.walkthrough.paramName];
    
    if (walkthroughId) {
      this.start(walkthroughId);
    }
  }

  /**
   * Restore walkthrough from saved state
   */
  restoreWalkthrough() {
    this.walkthroughEngine._restoreWalkthrough();
  }
  
  /**
   * Start a walkthrough by ID
   * @param {string} walkthroughId - ID of the walkthrough to start
   * @returns {boolean} - Success status
   */
  startWalkthrough(walkthroughId) {
    return this.walkthroughEngine.start(walkthroughId);
  }
  
  /**
   * Register a new walkthrough
   * @param {string} id - Unique identifier for the walkthrough
   * @param {Array} steps - Array of step objects defining the walkthrough
   */
  registerWalkthrough(id, steps) {
    this.walkthroughEngine.register(id, steps);
  }
  
  /**
   * Go to the next step in the current walkthrough
   */
  nextWalkthroughStep() {
    this.walkthroughEngine.next();
  }
  
  /**
   * End the current walkthrough
   */
  endWalkthrough() {
    this.walkthroughEngine.end();
  }

  /**
   * Register a new text agent with the given ID and steps
   * @param {string} id - Unique identifier for the text agent
   * @param {Array<Object>} steps - Array of text agent steps
   */
  registerTextAgent(id, steps) {
    // TODO: Implement text agent registration
    console.log(`[SableSmartLinks] Registering text agent: ${id}`);
  }

  /**
   * Start a text agent with the given ID
   * @param {string} [agentId] - Optional ID of the text agent to start
   */
  startTextAgent(agentId) {
    // TODO: Implement text agent start logic
    console.log(`[SableSmartLinks] Starting text agent: ${agentId || 'default'}`);
  }

  /**
   * Move to the next step in the current text agent
   */
  nextTextAgentStep() {
    // TODO: Implement next step logic
    console.log('[SableSmartLinks] Moving to next text agent step');
  }

  /**
   * Move to the previous step in the current text agent
   */
  previousTextAgentStep() {
    // TODO: Implement previous step logic
    console.log('[SableSmartLinks] Moving to previous text agent step');
  }

  /**
   * Toggle the expanded/collapsed state of the text agent
   */
  toggleTextAgentExpand() {
    // TODO: Implement expand/collapse toggle
    console.log('[SableSmartLinks] Toggling text agent expand state');
  }

  /**
   * Send a message to the current text agent
   * @param {string} message - The message to send
   */
  sendTextAgentMessage(message) {
    // TODO: Implement message sending logic
    console.log(`[SableSmartLinks] Sending message to text agent: ${message}`);
  }

  /**
   * End the current text agent session
   */
  endTextAgent() {
    // TODO: Implement cleanup for text agent
    console.log('[SableSmartLinks] Ending text agent session');
  }
}

// Export as both a class and a singleton instance
export { SableSmartLinks };

// Create and export a default instance
const instance = new SableSmartLinks();
export default instance;
