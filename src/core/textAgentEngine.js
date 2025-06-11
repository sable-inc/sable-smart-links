/**
 * Text Agent Engine
 * Core functionality for managing and executing text agent guides
 */

import { waitForElement } from './elementSelector.js';
import { isBrowser, safeWindow, safeDocument } from '../utils/browserAPI.js';
import { showTooltip, hideTooltip } from '../ui/tooltip.js';
import { highlightElement, removeHighlight } from '../ui/highlight.js';
import { createTextAgentUI, removeTextAgentUI } from '../ui/textAgentGuide.js';
import { SimplePopupManager } from '../ui/SimplePopupManager.js';

export class TextAgentEngine {
  /**
   * Create a new TextAgentEngine
   * @param {Object} config - Configuration options
   */
  constructor(config) {
    // Default configuration
    this.config = {
      debug: false,
      defaultState: 'collapsed',
      position: 'right',
      enableChatInput: false,
      persistState: true,
      ...config
    };
    
    if (this.config.debug) {
      console.log('[SableTextAgent] Initializing with config:', this.config);
    }
    
    // State management
    this.steps = [];
    this.currentStepIndex = -1;
    this.isRunning = false;
    this.ui = null;
    this.state = {
      isExpanded: this.config.defaultState === 'expanded',
      chatHistory: []
    };
    
    // Bind methods
    this.next = this.next.bind(this);
    this.previous = this.previous.bind(this);
    this.end = this.end.bind(this);
    this.toggleExpand = this.toggleExpand.bind(this);
    this.sendMessage = this.sendMessage.bind(this);
  }
  
  /**
   * Register text agent steps
   * @param {string} id - Unique identifier for the text agent
   * @param {Array<TextAgentStep>} steps - Array of text agent steps
   */
  register(id, steps) {
    this.steps = steps.map(step => ({
      ...step,
      id: `${id}-${Math.random().toString(36).substr(2, 9)}`
    }));
    
    if (this.config.debug) {
      console.log(`[SableTextAgent] Registered ${this.steps.length} steps`);
    }
  }
  
  /**
   * Start the text agent
   * @param {string} [stepId] - Optional step ID to start from
   */
  start(stepId) {
    if (this.isRunning) {
      this.end();
    }
    
    this.isRunning = true;
    
    // Find step index if stepId is provided
    if (stepId) {
      const stepIndex = this.steps.findIndex(step => step.id === stepId);
      if (stepIndex !== -1) {
        this.currentStepIndex = stepIndex;
      }
    } else {
      this.currentStepIndex = 0;
    }
    
    this._renderCurrentStep();
  }
  
  /**
   * Move to the next step
   */
  next() {
    if (this.currentStepIndex < this.steps.length - 1) {
      this.currentStepIndex++;
      this._renderCurrentStep();
    } else {
      this.end();
    }
  }
  
  /**
   * Move to the previous step
   */
  previous() {
    if (this.currentStepIndex > 0) {
      this.currentStepIndex--;
      this._renderCurrentStep();
    }
  }
  
  /**
   * End the current text agent session
   */
  end() {
    if (this.ui) {
      removeTextAgentUI(this.ui);
      this.ui = null;
    }
    
    this.isRunning = false;
    this.currentStepIndex = -1;
    removeHighlight();
    
    if (this.config.debug) {
      console.log('[SableTextAgent] Session ended');
    }
  }
  
  /**
   * Toggle expanded/collapsed state
   */
  toggleExpand() {
    this.state.isExpanded = !this.state.isExpanded;
    this._updateUI();
  }
  
  /**
   * Send a message (when chat input is enabled)
   * @param {string} message - The message text
   */
  sendMessage(message) {
    if (!message.trim()) return;
    
    // Add user message to chat history
    this.state.chatHistory.push({ role: 'user', content: message });
    
    // Process the message (in a real implementation, this would call an API)
    this._processMessage(message);
    
    // Update UI
    this._updateUI();
  }
  
  /**
   * Process a message (placeholder for actual implementation)
   * @private
   */
  _processMessage(message) {
    // In a real implementation, this would call an API
    const response = `Received: ${message}`; // Placeholder
    this.state.chatHistory.push({ role: 'assistant', content: response });
  }
  
  /**
   * Render the current step
   * @private
   */
  _renderCurrentStep() {
    if (this.currentStepIndex < 0 || this.currentStepIndex >= this.steps.length) {
      return;
    }
    
    const step = this.steps[this.currentStepIndex];
    
    // Handle element highlighting if selector is provided
    if (step.selector) {
      const element = document.querySelector(step.selector);
      if (element) {
        highlightElement(element, step.highlightOptions);
      }
    }
    
    // Create or update the UI
    if (!this.ui) {
      this.ui = createTextAgentUI({
        step,
        config: this.config,
        state: this.state,
        onNext: this.next,
        onPrevious: this.previous,
        onEnd: this.end,
        onToggleExpand: this.toggleExpand,
        onSendMessage: this.config.enableChatInput ? this.sendMessage : null
      });
    } else {
      this._updateUI();
    }
    
    // Trigger any auto-actions
    this._triggerAutoActions(step);
  }
  
  /**
   * Update the UI with current state
   * @private
   */
  _updateUI() {
    if (!this.ui || this.currentStepIndex < 0) return;
    
    const step = this.steps[this.currentStepIndex];
    
    // Update the UI with current step and state
    if (this.ui.update) {
      this.ui.update({
        step,
        state: this.state,
        isFirstStep: this.currentStepIndex === 0,
        isLastStep: this.currentStepIndex === this.steps.length - 1
      });
    }
  }
  
  /**
   * Trigger any auto-actions for the current step
   * @private
   */
  _triggerAutoActions(step) {
    if (step.action?.autoTrigger && step.action.handler) {
      try {
        step.action.handler();
      } catch (error) {
        console.error('[SableTextAgent] Error in auto-action handler:', error);
      }
    }
  }
  
  /**
   * Save current state to localStorage
   * @private
   */
  _saveState() {
    if (!this.config.persistState || !isBrowser) return;
    
    try {
      const state = {
        isExpanded: this.state.isExpanded,
        chatHistory: this.state.chatHistory
      };
      safeWindow.localStorage.setItem('sableTextAgentState', JSON.stringify(state));
    } catch (error) {
      console.error('[SableTextAgent] Failed to save state:', error);
    }
  }
  
  /**
   * Load state from localStorage
   * @private
   */
  _loadState() {
    if (!this.config.persistState || !isBrowser) return;
    
    try {
      const savedState = safeWindow.localStorage.getItem('sableTextAgentState');
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        this.state = {
          ...this.state,
          isExpanded: parsedState.isExpanded ?? this.state.isExpanded,
          chatHistory: parsedState.chatHistory ?? this.state.chatHistory
        };
      }
    } catch (error) {
      console.error('[SableTextAgent] Failed to load state:', error);
    }
  }
  
  /**
   * Shows a simple popup with the given options
   * @param {Object} options - Popup options
   * @param {string} options.text - The text to display in the popup
   * @param {number} [options.boxWidth=300] - Width of the popup in pixels
   * @param {'arrow'|'yes-no'} [options.buttonType='arrow'] - Type of buttons to show
   * @param {Function} [options.onProceed] - Callback when proceed/continue is clicked
   * @param {Function} [options.onYesNo] - Callback for yes/no buttons (receives boolean)
   * @param {string} [options.primaryColor='#FFFFFF'] - Primary color for the popup
   * @param {HTMLElement} [options.parent=document.body] - Parent element to mount the popup to
   * @returns {Object} Popup manager instance with mount/unmount methods
   */
  showPopup(options) {
    if (!isBrowser) {
      console.warn('Popup can only be shown in a browser environment');
      return null;
    }

    const defaultOptions = {
      text: '',
      boxWidth: 300,
      buttonType: 'arrow',
      primaryColor: '#FFFFFF',
      parent: safeDocument?.body || document.body
    };

    const popupManager = new SimplePopupManager({ ...defaultOptions, ...options });
    popupManager.mount(options.parent || defaultOptions.parent);
    
    return {
      unmount: () => popupManager.unmount(),
      mount: (newParent) => popupManager.mount(newParent)
    };
  }
}
