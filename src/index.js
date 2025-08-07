/**
 * Sable Smart Links
 * A library for creating guided product walkthroughs triggered by URL parameters
 */

import { WalkthroughEngine } from './core/walkthroughEngine.js';
import { TextAgentEngine } from './core/textAgentEngine.js';
import globalPopupManager from './ui/GlobalPopupManager.js';
import { MenuTriggerManager } from './ui/MenuTriggerManager.js';
import { addEvent, debounce } from './utils/events.js';
import { parseUrlParameters } from './utils/urlParser.js';
import { getCurrentSessionId, getCurrentUserId, resetSessionId, resetUserId } from './utils/analytics.js';

// Export analytics utilities
export * from './utils/analytics';

class SableSmartLinks {
  /**
   * Create a new SableSmartLinks instance
   * @param {SableSmartLinksConfig} config - Configuration options
   */
  constructor(config = {}) {
    if (config.debug) {
      console.log('[SableSmartLinks] Constructor called with config:', config);
    }

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
        persistState: true
      },

      analytics: {
        enabled: true,
        logEvents: true,
        sessionStorage: true,
        localStorage: true
      },
      menu: null, // Default: no menu
      ...config
    };

    // Deep merge for nested objects
    if (config.walkthrough) {
      this.config.walkthrough = { ...this.config.walkthrough, ...config.walkthrough };
    }
    if (config.textAgent) {
      this.config.textAgent = { ...this.config.textAgent, ...config.textAgent };
    }
    if (config.analytics) {
      this.config.analytics = { ...this.config.analytics, ...config.analytics };
    }

    if (this.config.debug) {
      console.log('[SableSmartLinks] Final config:', this.config);
    }

    // Initialize engines with their specific configs
    this.walkthroughEngine = new WalkthroughEngine({
      debug: this.config.debug,
      ...this.config.walkthrough
    });

    // Use singleton pattern for TextAgentEngine
    const existingInstance = TextAgentEngine.getInstance();
    if (existingInstance) {
      // Update configuration of existing instance
      existingInstance.updateConfig({
        debug: this.config.debug,
        ...this.config.textAgent
      });
      this.textAgentEngine = existingInstance;
    } else {
      // Create new singleton instance
      this.textAgentEngine = new TextAgentEngine({
        debug: this.config.debug,
        ...this.config.textAgent
      });
    }



    // Initialize menu if configured
    if (this.config.menu && this.config.menu.enabled) {
      if (this.config.debug) {
        console.log('[SableSmartLinks] Menu is configured and enabled, initializing...');
      }
      this.initializeMenu();
    } else {
      if (this.config.debug) {
        console.log('[SableSmartLinks] Menu is NOT configured or disabled');
      }
    }

    // Bind methods
    this.showPopup = this.showPopup.bind(this);
    this.registerTextAgent = this.registerTextAgent.bind(this);
    this.startTextAgent = this.startTextAgent.bind(this);
    this.nextTextAgentStep = this.nextTextAgentStep.bind(this);
    this.previousTextAgentStep = this.previousTextAgentStep.bind(this);
    this.endTextAgent = this.endTextAgent.bind(this);
    this.startTextAgent = this.startTextAgent.bind(this);

    this.getAnalyticsSessionId = this.getAnalyticsSessionId.bind(this);
    this.getAnalyticsUserId = this.getAnalyticsUserId.bind(this);
    this.resetAnalyticsSession = this.resetAnalyticsSession.bind(this);
    this.resetAnalyticsUser = this.resetAnalyticsUser.bind(this);

    // Auto-start walkthrough if enabled and in browser
    if (typeof window !== 'undefined' && this.config.walkthrough.autoStart) {
      this.init();
    }

    if (this.config.debug) {
      console.log('[SableSmartLinks] Constructor finished.');
    }
  }



  /**
   * Initialize menu manager
   * @private
   */
  initializeMenu() {
    if (this.config.debug) {
      console.log('[SableSmartLinks] initializeMenu called');
    }

    try {
      if (this.config.debug) {
        console.log('[SableSmartLinks] Initializing menu...');
      }

      // Create menu manager
      this.menuManager = new MenuTriggerManager(this.config.menu);

      // Initialize the manager (this will set up DOM listeners and popup state tracking)
      this.menuManager.init();

      if (this.config.debug) {
        console.log('[SableSmartLinks] Menu initialized successfully');
      }
      if (this.config.debug) {
        console.log('[SableSmartLinks] Menu initialization complete');
      }
    } catch (error) {
      console.error('[SableSmartLinks] Failed to initialize menu:', error);
    }
  }



  /**
   * Initialize the library and check for walkthrough parameters
   */
  init() {
    if (this.config.debug) {
      console.log('[SableSmartLinks] Initializing library...');
    }

    // Initialize the TextAgentEngine
    if (this.textAgentEngine) {
      this.textAgentEngine.init();
    }

    const params = parseUrlParameters();
    const walkthroughId = params[this.config.walkthrough.paramName];

    if (walkthroughId) {
      this.startWalkthrough(walkthroughId);
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

    // Handle triggerOnTyping
    if (options.triggerOnTyping) {
      const { selector, on = 'start', stopDelay = 1000 } = options.triggerOnTyping;
      const input = document.querySelector(selector);
      if (!input) {
        setTimeout(() => this.showPopup(options), 500);
        return null;
      }

      let hasStarted = false;
      let cleanup = null;

      const show = () => {
        if (cleanup) cleanup();
        // Use global popup manager directly to ensure proper state management
        globalPopupManager.showPopup(options);
      };

      if (on === 'start') {
        const handler = () => {
          if (!hasStarted && input.value.length > 0) {
            hasStarted = true;
            show();
          }
        };
        cleanup = addEvent(input, 'input', handler);
      } else if (on === 'stop') {
        const handler = debounce(() => {
          show();
        }, stopDelay);
        cleanup = addEvent(input, 'input', handler);
      } else if (on === 'change') {
        // Track the previous value to detect any change, not just user typing
        let previousValue = input.value;

        // Use MutationObserver to detect programmatic changes
        const observer = new MutationObserver((mutations) => {
          if (input.value !== previousValue) {
            previousValue = input.value;
            show();
          }
        });

        // Observe the input for attribute changes
        observer.observe(input, { attributes: true, attributeFilter: ['value'] });

        // Also listen for user input events
        const inputHandler = () => {
          if (input.value !== previousValue) {
            previousValue = input.value;
            show();
          }
        };

        const inputCleanup = addEvent(input, 'input', inputHandler);

        // Combined cleanup function
        cleanup = () => {
          observer.disconnect();
          inputCleanup();
        };
      }

      // Optionally store cleanup for later
      this._popupTypingCleanup = cleanup;
      return null;
    }

    // Use global popup manager to ensure only one popup is active
    return globalPopupManager.showPopup(options);
  }

  /**
   * Register a new text agent with the given ID and steps
   * @param {string} id - Unique identifier for the text agent
   * @param {Array<TextAgentStep>} steps - Array of text agent steps
   * @param {boolean} [autoStart=false] - Whether to start the text agent immediately
   * @param {boolean} [autoStartOnce=true] - Whether to only auto-start once
   * @param {Function} [beforeStart] - Optional async function to run before starting
   * @param {string} [requiredSelector] - Optional CSS selector that must be present for the agent to run
   * @param {boolean} [endWithoutSelector=false] - Whether to end the agent immediately when the required selector disappears
   * @returns {SableSmartLinks} - This instance for chaining
   */
  registerTextAgent(id, steps, autoStart = false, autoStartOnce = true, beforeStart, requiredSelector, endWithoutSelector = false) {
    if (!this.textAgentEngine) {
      console.error('[SableSmartLinks] TextAgentEngine not initialized');
      return this;
    }
    this.textAgentEngine.register(id, steps, {
      autoStart,
      autoStartOnce,
      beforeStart,
      requiredSelector,
      endWithoutSelector
    });
    return this;
  }

  /**
   * Start a text agent with the given ID
   * @param {string} [agentId] - Optional ID of the text agent to start
   * @param {string} [stepId] - Optional step ID to start the agent from
   * @param {boolean} [skipTrigger=false] - Optional flag to skip trigger checks and show the popup immediately
   * @returns {Promise<boolean>} - Success status
   */
  async startTextAgent(agentId, stepId = null, skipTrigger = false) {
    if (!this.textAgentEngine) {
      console.error('[SableSmartLinks] TextAgentEngine not initialized');
      return false;
    }
    return await this.textAgentEngine.start(agentId, stepId, skipTrigger);
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

  /**
   * Restart a text agent with the given ID and options (mirrors startAgent)
   * @param {string} agentId - The ID of the text agent to restart
   * @param {Object} options - Options for restarting the agent
   * @param {string} [options.stepId] - Optional step ID to start the agent from
   * @param {boolean} [options.skipTrigger=false] - Optional flag to skip trigger checks and show the popup immediately
   * @param {boolean} [options.useSessionStorage=false] - If true, use sessionStorage to trigger agent start
   * @returns {SableSmartLinks} - This instance for chaining
   */
  startTextAgent(agentId, options = {
    stepId: undefined,
    skipTrigger: false,
    useSessionStorage: false,
  }) {
    if (!this.textAgentEngine) {
      console.error('[SableSmartLinks] TextAgentEngine not initialized');
      return this;
    }

    // Dispatch the sable:textAgentStart event to trigger the restart (mirrors startAgent)
    if (options.useSessionStorage) {
      sessionStorage.setItem('sable_start_agent', JSON.stringify({
        agentId: agentId,
        stepId: options.stepId ?? undefined,
        skipTrigger: options.skipTrigger ?? false,
      }));
      return this;
    }
    const startEvent = new CustomEvent('sable:textAgentStart', {
      detail: {
        stepId: options.stepId || null,
        skipTrigger: options.skipTrigger || false,
        agentId: agentId
      }
    });

    // Dispatch the event on the window object
    if (typeof window !== 'undefined') {
      window.dispatchEvent(startEvent);
    } else {
      console.warn('[SableSmartLinks] Window object not available. Only localStorage key was removed.');
    }

    return this;
  }

  /**
   * Closes all active popups managed by the text agent engine.
   * Optionally, you can provide an array of popup IDs to keep open.
   * @param {Array<string>} [exceptIds=[]] - Array of popup IDs to exclude from closing.
   */
  closeAllPopups(exceptIds = []) {
    if (this.textAgentEngine && typeof this.textAgentEngine.closeAllPopups === 'function') {
      this.textAgentEngine.closeAllPopups(exceptIds);
    }
  }




  /**
   * Get current analytics session ID
   * @returns {string} Current session ID
   */
  getAnalyticsSessionId() {
    if (!this.config.analytics.enabled) {
      return null;
    }
    return getCurrentSessionId();
  }

  /**
   * Get current analytics user ID
   * @returns {string} Current user ID
   */
  getAnalyticsUserId() {
    if (!this.config.analytics.enabled) {
      return null;
    }
    return getCurrentUserId();
  }

  /**
   * Reset analytics session ID
   */
  resetAnalyticsSession() {
    if (this.config.analytics.enabled) {
      resetSessionId();
    }
  }

  /**
   * Reset analytics user ID
   */
  resetAnalyticsUser() {
    if (this.config.analytics.enabled) {
      resetUserId();
    }
  }

  /**
   * Cleanup and destroy the instance
   */
  destroy() {
    if (this.config.debug) {
      console.log('[SableSmartLinks] Destroy called');
    }



    // Clean up menu manager
    if (this.menuManager) {
      this.menuManager.destroy();
      this.menuManager = null;
    }

    // Clean up engines
    if (this.textAgentEngine) {
      this.textAgentEngine.destroy();
      this.textAgentEngine = null;
    }

    if (this.walkthroughEngine) {
      this.walkthroughEngine.end();
      this.walkthroughEngine = null;
    }

    // Close all popups
    if (this.config.debug) {
      console.log('[SableSmartLinks] Calling globalPopupManager.closeActivePopup() in destroy - this will affect hasActivePopup state');
    }
    globalPopupManager.closeActivePopup();
    if (this.config.debug) {
      console.log('[destroy] hasActivePopup changed');
    }

    if (this.config.debug) {
      console.log('[SableSmartLinks] Destroy complete');
    }
  }
}

// Export as both a class and a singleton instance
export { SableSmartLinks };

// Create and export a default instance
const instance = new SableSmartLinks();
export default instance;

// Export tavily helper functions
export * from './tavily';

