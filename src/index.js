/**
 * Sable Smart Links
 * A library for creating guided product walkthroughs triggered by URL parameters
 */

import { WalkthroughEngine } from './core/walkthroughEngine.js';
import { TextAgentEngine } from './core/textAgentEngine.js';
import { NovaVoiceEngine } from './core/novaVoiceEngine.js';
import globalPopupManager from './ui/GlobalPopupManager.js';
import { VoicePopup } from './ui/components/VoicePopup.js';
import { MenuTriggerManager } from './ui/MenuTriggerManager.js';
import { isBrowser, safeDocument } from './utils/browserAPI.js';
import { addEvent, debounce } from './utils/events.js';
import { debugLog } from './config.js';
import { parseUrlParameters } from './utils/urlParser.js';

// Import Tavily features
export * from './config';
export * from './features/tavily';

class SableSmartLinks {
  /**
   * Create a new SableSmartLinks instance
   * @param {SableSmartLinksConfig} config - Configuration options
   */
  constructor(config = {}) {
    console.log('[SableSmartLinks] Constructor called with config:', config);
    
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
      voice: {
        enabled: false,
        engine: 'nova',
        serverUrl: 'ws://localhost:3001',
        systemPrompt: "You are a friend. The user and you will engage in a spoken dialog exchanging the transcripts of a natural real-time conversation. Keep your responses short, generally two or three sentences for chatty scenarios.",
        tools: [], // Default: no tools
        ui: {
          position: 'bottom-right',
          buttonText: {
            start: 'Start Voice Chat',
            stop: 'End Chat'
          },
          theme: {
            primaryColor: '#FFFFFF',
            backgroundColor: 'rgba(60, 60, 60, 0.9)'
          }
        }
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
    if (config.voice) {
      this.config.voice = { ...this.config.voice, ...config.voice };
      if (config.voice.ui) {
        this.config.voice.ui = { ...this.config.voice.ui, ...config.voice.ui };
      }
      if (config.voice.tools) {
        this.config.voice.tools = config.voice.tools; // Replace entirely for tools
      }
    }

    console.log('[SableSmartLinks] Final config:', this.config);
    console.log('[SableSmartLinks] Voice enabled:', this.config.voice.enabled);
    
    // Initialize engines with their specific configs
    this.walkthroughEngine = new WalkthroughEngine({
      debug: this.config.debug,
      ...this.config.walkthrough
    });
    
    this.textAgentEngine = new TextAgentEngine({
      debug: this.config.debug,
      ...this.config.textAgent
    });

    // Initialize voice engine if enabled
    if (this.config.voice.enabled) {
      console.log('[SableSmartLinks] Voice is enabled, initializing...');
      this.initializeVoiceEngine();
    } else {
      console.log('[SableSmartLinks] Voice is NOT enabled');
    }

    // Initialize menu if configured
    if (this.config.menu && this.config.menu.enabled) {
      console.log('[SableSmartLinks] Menu is configured and enabled, initializing...');
      this.initializeMenu();
    } else {
      console.log('[SableSmartLinks] Menu is NOT configured or disabled');
    }
    
    // Bind methods
    this.showPopup = this.showPopup.bind(this);
    this.registerTextAgent = this.registerTextAgent.bind(this);
    this.startTextAgent = this.startTextAgent.bind(this);
    this.nextTextAgentStep = this.nextTextAgentStep.bind(this);
    this.previousTextAgentStep = this.previousTextAgentStep.bind(this);
    this.endTextAgent = this.endTextAgent.bind(this);
    this.startTextAgent = this.startTextAgent.bind(this);
    this.toggleVoiceChat = this.toggleVoiceChat.bind(this);
    
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
    
    console.log('[SableSmartLinks] Constructor finished. Voice engine:', !!this.voiceEngine);
  }

  /**
   * Initialize voice engine and UI
   * @private
   */
  initializeVoiceEngine() {
    console.log('[SableSmartLinks] initializeVoiceEngine called');

    try {
      debugLog('info', 'Initializing voice engine...');
      
      // Create voice engine based on config
      if (this.config.voice.engine === 'nova') {
        console.log('[SableSmartLinks] Creating NovaVoiceEngine with config:', this.config.voice);
        this.voiceEngine = new NovaVoiceEngine(this.config.voice);
      } else {
        debugLog('warn', 'Unknown voice engine:', this.config.voice.engine);
        return;
      }

      // Set up voice engine callbacks
      this.voiceEngine.setCallbacks({
        onTextOutput: (text) => {
          debugLog('info', 'Voice text output:', text);
          if (this.voicePopup) {
            this.voicePopup.addMessage(text, false);
          }
        },
        onError: (error) => {
          debugLog('error', 'Voice engine error:', error);
          if (this.voicePopup) {
            this.voicePopup.setStatus('Error: ' + error.message);
            this.voicePopup.setActive(false);
          }
        },
        onStatusChange: (status) => {
          debugLog('info', 'Voice status:', status);
          if (this.voicePopup) {
            this.voicePopup.setStatus(status);
          }
        }
      });

      // Create voice popup
      console.log('[SableSmartLinks] Creating VoicePopup with UI config:', this.config.voice.ui);
      // Use globalPopupManager to enforce singleton
      this.voicePopupManager = globalPopupManager.showStatefulPopup(
        (opts) => new VoicePopup(opts),
        {
          ...this.config.voice.ui,
          onToggle: () => this.toggleVoiceChat(),
          onClose: () => {
            // Handle close if needed
          }
        }
      );
      this.voicePopup = this.voicePopupManager && this.voicePopupManager.popup;
      console.log('[SableSmartLinks] VoicePopup created:', !!this.voicePopup);

      // Mount voice popup to DOM
      // Mounting is handled by globalPopupManager

      debugLog('info', 'Voice engine initialized successfully');
      console.log('[SableSmartLinks] Voice engine initialization complete');
    } catch (error) {
      console.error('[SableSmartLinks] Failed to initialize voice engine:', error);
      debugLog('error', 'Failed to initialize voice engine:', error);
    }
  }

  /**
   * Initialize menu manager
   * @private
   */
  initializeMenu() {
    console.log('[SableSmartLinks] initializeMenu called');

    try {
      debugLog('info', 'Initializing menu...');
      
      // Create menu manager
      this.menuManager = new MenuTriggerManager(this.config.menu);
      
      // Initialize the manager (this will set up DOM listeners and popup state tracking)
      this.menuManager.init();

      debugLog('info', 'Menu initialized successfully');
      console.log('[SableSmartLinks] Menu initialization complete');
    } catch (error) {
      console.error('[SableSmartLinks] Failed to initialize menu:', error);
      debugLog('error', 'Failed to initialize menu:', error);
    }
  }

  /**
   * Toggle voice chat on/off
   */
  async toggleVoiceChat() {
    console.log('[SableSmartLinks] toggleVoiceChat called');
    console.log('[SableSmartLinks] this.voiceEngine exists:', !!this.voiceEngine);
    console.log('[SableSmartLinks] this.config:', this.config);
    
    debugLog('info', 'Toggle voice chat called');
    
    if (!this.voiceEngine) {
      console.error('[SableSmartLinks] Voice engine not initialized - attempting to initialize now');
      
      // Try to initialize it now if it wasn't initialized before
      if (this.config.voice.enabled) {
        this.initializeVoiceEngine();
        // Wait a moment for initialization
        await new Promise(resolve => setTimeout(resolve, 100));
      } else {
        console.error('[SableSmartLinks] Voice is not enabled in config');
        return;
      }
      
      // Check again after initialization
      if (!this.voiceEngine) {
        console.error('[SableSmartLinks] Failed to initialize voice engine');
        debugLog('error', 'Voice engine not initialized');
        if (this.voicePopup) {
          this.voicePopup.setStatus('Voice not available');
        }
        return;
      }
    }

    try {
      if (this.voiceEngine.isRunning()) {
        // Stop voice chat
        console.log('[SableSmartLinks] Stopping voice chat...');
        await this.voiceEngine.stop();
        
        if (this.voicePopup) {
          this.voicePopup.setActive(false);
          this.voicePopup.setStatus('Stopped');
        }
      } else {
        // Start voice chat
        console.log('[SableSmartLinks] Starting voice chat...');
        await this.voiceEngine.start();
        
        if (this.voicePopup) {
          this.voicePopup.setActive(true);
          this.voicePopup.setStatus('Starting...');
        }
      }
    } catch (error) {
      console.error('[SableSmartLinks] Error in toggleVoiceChat:', error);
      
      if (this.voicePopup) {
        this.voicePopup.setStatus('Error: ' + error.message);
        this.voicePopup.setActive(false);
      }
    }
  }

  /**
   * Check if voice chat is currently active
   * @returns {boolean} - Whether voice chat is active
   */
  isVoiceChatActive() {
    return this.voiceEngine && this.voiceEngine.isRunning();
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
   * @returns {SableSmartLinks} - This instance for chaining
   */
  registerTextAgent(id, steps, autoStart = false, autoStartOnce = true, beforeStart) {
    if (!this.textAgentEngine) {
      console.error('[SableSmartLinks] TextAgentEngine not initialized');
      return this;
    }
    this.textAgentEngine.register(id, steps, autoStart, autoStartOnce, beforeStart);
    if (autoStart) {
      this.startTextAgent(id);
    }
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

    // Remove the localStorage key to reset the auto-started state
    const key = `SableTextAgentEngine_autoStartedOnce_${agentId}`;
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn('[SableSmartLinks] Failed to remove localStorage key:', e);
    }

    // Dispatch the sable:textAgentStart event to trigger the restart (mirrors startAgent)
    if (options.useSessionStorage) {
      sessionStorage.setItem('sable_start_agent', JSON.stringify({
        agentId: agentId,
        stepId: options.stepId ?? 'welcome',
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
   * Enable voice chat
   * @param {VoiceConfig} voiceConfig - Voice configuration
   */
  enableVoiceChat(voiceConfig = {}) {
    this.config.voice = {
      ...this.config.voice,
      enabled: true,
      ...voiceConfig
    };
    
    if (!this.voiceEngine) {
      this.initializeVoiceEngine();
    }
  }

  /**
   * Disable voice chat
   */
  async disableVoiceChat() {
    if (this.voiceEngine && this.voiceEngine.isRunning()) {
      await this.voiceEngine.stop();
    }
    
    if (this.voicePopup) {
      this.voicePopup.destroy();
      this.voicePopup = null;
    }
    
    this.voiceEngine = null;
    this.config.voice.enabled = false;
  }

  /**
   * Cleanup and destroy the instance
   */
  destroy() {
    console.log('[SableSmartLinks] Destroy called');
    
    // Clean up voice engine
    if (this.voiceEngine) {
      this.disableVoiceChat();
    }
    
    // Clean up voice popup
    if (this.voicePopup) {
      this.voicePopup.destroy();
      this.voicePopup = null;
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
    console.log('[SableSmartLinks] Calling globalPopupManager.closeActivePopup() in destroy - this will affect hasActivePopup state');
    globalPopupManager.closeActivePopup();
    console.log('[destroy] hasActivePopup changed');
    
    console.log('[SableSmartLinks] Destroy complete');
  }
}

// Export as both a class and a singleton instance
export { SableSmartLinks };

// Create and export a default instance
const instance = new SableSmartLinks();
export default instance;
