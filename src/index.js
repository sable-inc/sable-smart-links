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
    
    // Bind methods
    this.showPopup = this.showPopup.bind(this);
    this.registerTextAgent = this.registerTextAgent.bind(this);
    this.startTextAgent = this.startTextAgent.bind(this);
    this.nextTextAgentStep = this.nextTextAgentStep.bind(this);
    this.previousTextAgentStep = this.previousTextAgentStep.bind(this);
    this.endTextAgent = this.endTextAgent.bind(this);
    
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
   * Shows a popup with the given options
   * @param {Object} options - Popup configuration options
   * @param {string} options.text - The text to display in the popup
   * @param {number} [options.boxWidth=300] - Width of the popup in pixels
   * @param {'arrow'|'yes-no'} [options.buttonType='arrow'] - Type of buttons to show
   * @param {Function} [options.onProceed] - Callback when proceed/continue is clicked
   * @param {Function} [options.onYesNo] - Callback for yes/no buttons (receives boolean)
   * @param {string} [options.primaryColor='#FFFFFF'] - Primary color for the popup
   * @param {HTMLElement} [options.parent] - Parent element to mount the popup to
   * @returns {Object} Popup manager instance with mount/unmount methods
   */
  showPopup(options) {
    if (!this.textAgentEngine) {
      console.error('[SableSmartLinks] TextAgentEngine not initialized');
      return null;
    }
    return this.textAgentEngine.showPopup(options);
  }

  /**
   * Register a new text agent with the given ID and steps
   * @param {string} id - Unique identifier for the text agent
   * @param {Array<TextAgentStep>} steps - Array of text agent steps
   * @param {boolean} [autoStart=false] - Whether to start the text agent immediately
   * @returns {SableSmartLinks} - This instance for chaining
   */
  registerTextAgent(id, steps, autoStart = false) {
    if (!this.textAgentEngine) {
      console.error('[SableSmartLinks] TextAgentEngine not initialized');
      return this;
    }
    
    this.textAgentEngine.register(id, steps);
    
    if (autoStart) {
      this.startTextAgent(id);
    }
    
    return this;
  }

  /**
   * Start a text agent with the given ID
   * @param {string} [agentId] - Optional ID of the text agent to start
   * @returns {boolean} - Success status
   */
  startTextAgent(agentId) {
    if (!this.textAgentEngine) {
      console.error('[SableSmartLinks] TextAgentEngine not initialized');
      return false;
    }
    
    return this.textAgentEngine.start(agentId);
  }

  /**
   * Move to the next step in the current text agent
   * @returns {SableSmartLinks} - This instance for chaining
   */
  nextTextAgentStep() {
    if (!this.textAgentEngine) {
      console.error('[SableSmartLinks] TextAgentEngine not initialized');
      return this;
    }
    
    this.textAgentEngine.next();
    return this;
  }

  /**
   * Move to the previous step in the current text agent
   * @returns {SableSmartLinks} - This instance for chaining
   */
  previousTextAgentStep() {
    if (!this.textAgentEngine) {
      console.error('[SableSmartLinks] TextAgentEngine not initialized');
      return this;
    }
    
    this.textAgentEngine.previous();
    return this;
  }

  /**
   * End the current text agent session
   * @returns {SableSmartLinks} - This instance for chaining
   */
  endTextAgent() {
    if (!this.textAgentEngine) {
      console.error('[SableSmartLinks] TextAgentEngine not initialized');
      return this;
    }
    
    this.textAgentEngine.end();
    return this;
  }
}

// Export as both a class and a singleton instance
export { SableSmartLinks };

// Create and export a default instance
const instance = new SableSmartLinks();
export default instance;
