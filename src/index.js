/**
 * Sable Smart Links
 * A library for creating guided product walkthroughs triggered by URL parameters
 */

import { parseUrlParameters } from './core/urlParser.js';
import { WalkthroughEngine } from './core/walkthroughEngine.js';
import { isBrowser, safeDocument } from './utils/browserAPI.js';

class SableSmartLinks {
  /**
   * Create a new SableSmartLinks instance
   * @param {Object} config - Configuration options
   * @param {string} [config.paramName='walkthrough'] - URL parameter name to trigger walkthroughs
   * @param {boolean} [config.autoStart=true] - Automatically start walkthrough if parameter is found
   * @param {number} [config.stepDelay=500] - Delay between steps in milliseconds
   */
  constructor(config = {}) {
    this.config = {
      paramName: 'walkthrough',  // Default URL parameter to look for
      autoStart: true,           // Start walkthrough automatically if param found
      stepDelay: 500,            // Delay between steps in milliseconds
      ...config
    };
    
    this.walkthroughEngine = new WalkthroughEngine(this.config);
    
    if (this.config.autoStart && isBrowser) {
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
    const walkthroughId = params[this.config.paramName];
    
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
  start(walkthroughId) {
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
  next() {
    this.walkthroughEngine.next();
  }
  
  /**
   * End the current walkthrough
   */
  end() {
    this.walkthroughEngine.end();
  }
}

// Export as both a class and a singleton instance
export { SableSmartLinks };

// Create and export a default instance
const instance = new SableSmartLinks();
export default instance;
