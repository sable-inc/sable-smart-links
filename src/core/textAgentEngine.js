/**
 * Text Agent Engine
 * Core functionality for managing and executing text agent guides
 */

import { waitForElement } from '../utils/elementSelector.js';
import { isBrowser, safeWindow, safeDocument } from '../utils/browserAPI.js';
import { SimplePopupManager } from '../ui/SimplePopupManager.js';
import globalPopupManager from '../ui/GlobalPopupManager.js';
import { PopupStateManager } from '../ui/PopupStateManager.js';
import { addEvent, debounce } from '../utils/events.js';

// Singleton instance
let _instance = null;

export class TextAgentEngine {
  constructor(config = {}) {
    // Singleton check
    if (_instance) {
      console.warn('[SableTextAgent] TextAgentEngine instance already exists. Returning existing instance.');
      return _instance;
    }
    
    // Configuration
    this.config = {
      debug: false,
      stepDelay: 500,
      primaryColor: '#FFFFFF',
      defaultBoxWidth: 300,
      finalPopupConfig: {
        enableChat: true,
        sections: []
      },
      ...config
    };
    
    // State management
    this.agents = new Map(); // agentId -> { steps, config, state }
    this.activeAgentId = null; // Currently active agent
    this.observer = null; // MutationObserver for triggers
    
    // Store singleton instance
    _instance = this;
    
    // Set up event listeners immediately
    this._setupEventListeners();
  }
  
  static getInstance() {
    return _instance;
  }
  
  static resetInstance() {
    if (_instance) {
      _instance.destroy();
      _instance = null;
    }
  }
  
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }
  
  init() {
    if (this.config.debug) {
      console.log('[SableTextAgent] Initializing');
    }
    
    this._startObserver();
    this._setupEventListeners();
    return this;
  }
  
  /**
   * Register an agent
   * @param {string} agentId - Unique identifier
   * @param {Array} steps - Agent steps
   * @param {Object} config - Agent-specific config
   */
  register(agentId, steps, config = {}) {
    if (this.config.debug) {
      console.log(`[SableTextAgent] Registering agent "${agentId}" with ${steps.length} steps`);
    }
    
    // Create immutable steps with IDs
    const stepsWithIds = steps.map((step, index) => ({
      ...step,
      id: step.id || `${agentId}-step-${index}`
    }));
    
    this.agents.set(agentId, {
      steps: stepsWithIds,
      config: {
        autoStart: config.autoStart !== undefined ? config.autoStart : true,
        autoStartOnce: config.autoStartOnce !== undefined ? config.autoStartOnce : true,
        beforeStart: config.beforeStart,
        requiredSelector: config.requiredSelector,
        finalPopupConfig: config.finalPopupConfig ?? null,
        endWithoutSelector: config.endWithoutSelector !== undefined ? config.endWithoutSelector : false
      },
      state: {
        isRunning: false,
        currentStepIndex: -1,
        hasRenderedOnce: false,
        activePopupManager: null
      }
    });
    
    this._startObserver();
  }
  
  /**
   * Set up event listeners for agent control
   * @private
   */
  _setupEventListeners() {
    if (typeof window === 'undefined') {
      return;
    }
    
    // Listen for sable:textAgentStart events
    this._textAgentStartHandler = (event) => {
      const { agentId, stepId, skipTrigger } = event.detail || {};
      
      console.log('[SableTextAgent] DEBUG: Received sable:textAgentStart event:', { agentId, stepId, skipTrigger });
      console.log('[SableTextAgent] DEBUG: Event stack trace:', new Error().stack);
      
      if (this.config.debug) {
        console.log('[SableTextAgent] Received sable:textAgentStart event:', { agentId, stepId, skipTrigger });
      }
      
      if (agentId && this.agents.has(agentId)) {
        this.start(agentId, stepId, skipTrigger);
      } else if (agentId) {
        console.warn(`[SableTextAgent] Agent "${agentId}" not found when handling sable:textAgentStart event`);
      }
    };
    
    window.addEventListener('sable:textAgentStart', this._textAgentStartHandler);
  }

  /**
   * Start the global observer for all agents
   * @private
   */
  _startObserver() {
    if (this.observer) {
      return; // Already running
    }
    
    if (typeof document === 'undefined') {
      return;
    }
    
    this.observer = new MutationObserver(() => {
      this._checkAgentTriggers();
    });
    
    this.observer.observe(document.body, { 
      childList: true, 
      subtree: true 
    });
    
    // Initial check
    this._checkAgentTriggers();
  }
  
  /**
   * Check if any agents should be started or ended based on their required selectors
   * @private
   */
  _checkAgentTriggers() {
    for (const [agentId, agent] of this.agents.entries()) {
      const { config, state } = agent;
      
      // Check if required selector is present
      let requiredSelectorPresent = false;
      if (!config.requiredSelector) {
        requiredSelectorPresent = true; // No required selector means always present
      } else {
        const element = this._findElement(config.requiredSelector);
        requiredSelectorPresent = !!element; // Convert to boolean
      }
      
      if (state.isRunning) {
        // Agent is running - check if it should be ended
        if (!requiredSelectorPresent && (!state.hasRenderedOnce || config.endWithoutSelector)) {
          // Agent is running but required selector is gone and either:
          // - no steps have rendered yet, OR
          // - endWithoutSelector is true (end immediately when selector disappears)
          if (this.config.debug) {
            console.log(`[SableTextAgent] Ending agent "${agentId}" - required selector no longer present${config.endWithoutSelector ? ' (endWithoutSelector enabled)' : ' and no steps rendered'}`);
          }
          this._endAgent(agentId);
        }
        continue;
      }
      
      // Agent is not running - check if it should be started
      if (!requiredSelectorPresent || !config.autoStart) {
        continue; // Don't start
      }
      
      // Check autoStartOnce with localStorage
      if (config.autoStartOnce) {
        const localStorageKey = `SableTextAgent_autoStartedOnce_${agentId}`;
        try {
          if (window.localStorage.getItem(localStorageKey)) {
            continue; // Already auto-started once, skip
          }
        } catch (e) {
          // localStorage not available, assume already started
          if (this.config.debug) {
            console.log(`[SableTextAgent] localStorage not available for agent "${agentId}", assuming autoStartOnce has already happened`);
          }
          continue;
        }
      }
      
      // Start the agent
      if (this.config.debug) {
        console.log(`[SableTextAgent] Starting agent "${agentId}" (auto-start)`);
      }
      this.start(agentId, null, false, true); // isAutoStart = true
    }
  }
  
  /**
   * Find element by selector (supports CSS and XPath)
   * @private
   */
  _findElement(selector) {
    if (selector.startsWith('//')) {
      return document.evaluate(
        selector,
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      ).singleNodeValue;
    }
    return document.querySelector(selector);
  }
  
  /**
   * Start a specific agent
   * @param {string} agentId - Agent to start
   * @param {string} stepId - Optional step to start from
   * @param {boolean} skipTrigger - Skip trigger checks
   * @param {boolean} isAutoStart - Whether this is an auto-start (affects beforeStart and localStorage)
   */
  async start(agentId, stepId = null, skipTrigger = false, isAutoStart = false) {
    if (!this.agents.has(agentId)) {
      console.warn(`[SableTextAgent] Agent "${agentId}" not registered`);
      return false;
    }
    
    const agent = this.agents.get(agentId);
    const { config, state } = agent;
    
    if (this.config.debug) {
      console.log(`[SableTextAgent] Starting agent "${agentId}"${isAutoStart ? ' (auto-start)' : ''}`);
    }
    
    // Run beforeStart if provided and not auto-starting
    if (!isAutoStart && typeof config.beforeStart === 'function') {
      await config.beforeStart();
    }
    
    // Update state
    state.isRunning = true;
    state.currentStepIndex = stepId ? 
      agent.steps.findIndex(step => step.id === stepId) : 0;
    
    if (state.currentStepIndex === -1) {
      state.currentStepIndex = 0;
    }
    
    this.activeAgentId = agentId;
    
    // Render first step
    if (skipTrigger) {
      this._renderCurrentStep(agentId, isAutoStart);
    } else {
      this._setupStepTrigger(agentId, isAutoStart);
    }
    
    return true;
  }
  
  /**
   * Set up trigger for current step
   * @private
   */
  _setupStepTrigger(agentId, isAutoStart = false) {
    const agent = this.agents.get(agentId);
    const step = agent.steps[agent.state.currentStepIndex];
    
    if (!step) {
      this._endAgent(agentId);
      return;
    }
    
    if (step.triggerOnTyping) {
      this._setupTypingTrigger(agentId, step, isAutoStart);
    } else if (step.triggerOnButtonPress) {
      this._setupButtonTrigger(agentId, step, isAutoStart);
    } else {
      // No trigger, show immediately
      setTimeout(() => this._renderCurrentStep(agentId, isAutoStart), 100);
    }
  }
  
  /**
   * Set up typing trigger
   * @private
   */
  _setupTypingTrigger(agentId, step, isAutoStart = false) {
    const { selector, on = 'start', stopDelay = 1000 } = step.triggerOnTyping;
    
    const checkAndSetup = () => {
      const input = this._findElement(selector);
      if (!input) {
        setTimeout(checkAndSetup, 500);
        return;
      }
      
      let hasStarted = false;
      let cleanup = null;
      
      const showStep = () => {
        if (cleanup) cleanup();
        this._renderCurrentStep(agentId, isAutoStart);
      };
      
      if (on === 'start') {
        const handler = () => {
          if (!hasStarted && input.value.length > 0) {
            hasStarted = true;
            showStep();
          }
        };
        cleanup = addEvent(input, 'input', handler);
      } else if (on === 'stop') {
        const handler = debounce(showStep, stopDelay);
        cleanup = addEvent(input, 'input', handler);
      }
      
      // Store cleanup function
      const agent = this.agents.get(agentId);
      agent.state.triggerCleanup = cleanup;
    };
    
    checkAndSetup();
  }
  
  /**
   * Set up button trigger
   * @private
   */
  _setupButtonTrigger(agentId, step, isAutoStart = false) {
    const { selector, event = 'click', delay = 0 } = step.triggerOnButtonPress;
    
    const checkAndSetup = () => {
      const elements = document.querySelectorAll(selector);
      if (elements.length === 0) {
        setTimeout(checkAndSetup, 500);
        return;
      }
      
      const showStep = () => {
        // Remove event listeners
        elements.forEach(el => el.removeEventListener(event, handler));
        
        if (delay > 0) {
          setTimeout(() => this._renderCurrentStep(agentId, isAutoStart), delay);
        } else {
          this._renderCurrentStep(agentId, isAutoStart);
        }
      };
      
      const handler = showStep;
      
      // Add event listeners
      elements.forEach(el => el.addEventListener(event, handler));
      
      // Store cleanup function
      const agent = this.agents.get(agentId);
      agent.state.triggerCleanup = () => {
        elements.forEach(el => el.removeEventListener(event, handler));
      };
    };
    
    checkAndSetup();
  }
  
  /**
   * Render the current step
   * @private
   */
  _renderCurrentStep(agentId, isAutoStart = false) {
    const agent = this.agents.get(agentId);
    const { steps, state, config } = agent;
    
    if (state.currentStepIndex < 0 || state.currentStepIndex >= steps.length) {
      this._endAgent(agentId);
      return;
    }
    
    const step = steps[state.currentStepIndex];
    
    if (this.config.debug) {
      console.log(`[SableTextAgent] Rendering step ${step.id} for agent "${agentId}"${isAutoStart ? ' (auto-start)' : ''}`);
    }
    
    // Check conditional rendering
    if (typeof step.showIf === 'function' && !step.showIf()) {
      this.next(agentId);
      return;
    }
    
    // Handle target element
    this._handleTargetElement(step).then(targetElement => {
      this._createPopupForStep(agentId, step, targetElement);
      // Set autoStartOnce localStorage key when first step is rendered (only for auto-starts)
      if (isAutoStart && config.autoStart && config.autoStartOnce) {
        const localStorageKey = `SableTextAgent_autoStartedOnce_${agentId}`;
        try {
          window.localStorage.setItem(localStorageKey, 'true');
          if (this.config.debug) {
            console.log(`[SableTextAgent] Set autoStartOnce localStorage key for agent "${agentId}": ${localStorageKey}`);
          }
        } catch (e) {
          if (this.config.debug) {
            console.log(`[SableTextAgent] localStorage not available, cannot set autoStartOnce key for agent "${agentId}"`);
          }
        }
      }
      
      // Handle auto-actions
      setTimeout(() => {
        this._performStepActions(step, targetElement);
      }, this.config.stepDelay);
    });
  }
  
  /**
   * Handle target element selection
   * @private
   */
  async _handleTargetElement(step) {
    if (!step.targetElement?.selector) {
      return null;
    }
    
    try {
      if (step.targetElement.waitForElement) {
        return await waitForElement(step.targetElement.selector, {
          timeout: step.targetElement.waitTimeout || 5000
        });
      } else {
        return this._findElement(step.targetElement.selector);
      }
    } catch (error) {
      console.error('[SableTextAgent] Error handling target element:', error);
      return null;
    }
  }
  
  /**
   * Create popup for current step
   * @private
   */
  _createPopupForStep(agentId, step, targetElement) {
    const agent = this.agents.get(agentId);
    
    // Get text content
    const text = typeof step.text === 'function' ? step.text() : step.text;
    const secondaryText = typeof step.secondaryText === 'function' ? step.secondaryText() : step.secondaryText;
    const sections = typeof step.sections === 'function' ? step.sections() : step.sections;
    
    // Create popup options
    const popupOptions = {
      text,
      secondaryText,
      boxWidth: step.boxWidth || this.config.defaultBoxWidth,
      buttonType: step.buttonType || 'arrow',
      primaryColor: step.primaryColor || this.config.primaryColor,
      sections: this._wrapSectionCallbacks(sections, agentId),
      includeTextBox: step.includeTextBox || false,
      fontSize: step.fontSize || '15px',
      parent: safeDocument?.body || document.body
    };
    
    // Set up callbacks
    if (step.buttonType === 'yes-no') {
      popupOptions.onYesNo = (isYes) => {
        if (typeof step.onYesNo === 'function') {
          step.onYesNo(isYes);
        }
        if (step.autoAdvance) {
          setTimeout(() => this.next(agentId), step.autoAdvanceDelay || 1000);
        }
      };
    } else {
      popupOptions.onProceed = async (textInput) => {
        if (typeof step.onProceed === 'function') {
          await step.onProceed(textInput);
        }
        setTimeout(() => this.next(agentId), step.autoAdvanceDelay || 1000);
      };
    }
    
    // Create and mount popup
    const popupManager = globalPopupManager.showPopup(popupOptions);
    if (popupManager) {
      agent.state.activePopupManager = popupManager;
      agent.state.hasRenderedOnce = true; // Mark that at least one step has been rendered
      
      // Position popup if target element specified
      if (targetElement && step.targetElement?.position) {
        this._positionPopup(popupManager, targetElement, step.targetElement.position);
      }
    }
    
    // Execute callback if provided
    if (typeof step.callback === 'function') {
      step.callback(targetElement, this);
    }
  }
  
  /**
   * Wrap section callbacks to handle restart logic
   * @private
   */
  _wrapSectionCallbacks(sections, agentId) {
    if (!Array.isArray(sections)) {
      return sections;
    }
    
    return sections.map(section => {
      if (!section || typeof section.onSelect !== 'function') {
        return section;
      }
      
      const originalOnSelect = section.onSelect;
      return {
        ...section,
        onSelect: (item) => {
          // Handle restart logic
          if (item && item._restartRequested) {
            const restartConfig = item.restartFromStep !== undefined ? 
              item.restartFromStep : section.restartFromStep;
            
            let stepId = null;
            let skipTrigger = false;
            
            if (restartConfig === null || typeof restartConfig === 'string') {
              stepId = restartConfig;
            } else if (typeof restartConfig === 'object') {
              stepId = restartConfig.stepId;
              skipTrigger = !!restartConfig.skipTrigger;
            }
            
            // Emit restart event
            window.dispatchEvent(new CustomEvent('sable:textAgentStart', {
              detail: { stepId, skipTrigger, agentId }
            }));
          }
          
          // Call original handler
          originalOnSelect(item);
        }
      };
    });
  }
  
  /**
   * Position popup relative to target element
   * @private
   */
  _positionPopup(popupManager, targetElement, position) {
    if (!popupManager.container) {
      return;
    }
    
    const elementRect = targetElement.getBoundingClientRect();
    const popupRect = popupManager.container.getBoundingClientRect();
    const margin = 10;
    
    let newPosition = {};
    let transform = '';
    
    switch (position) {
      case 'top':
        newPosition = {
          top: elementRect.top - popupRect.height - margin,
          left: elementRect.left + (elementRect.width / 2)
        };
        transform = 'translateX(-50%)';
        break;
      case 'right':
        newPosition = {
          top: elementRect.top + (elementRect.height / 2),
          left: elementRect.right + margin
        };
        transform = 'translateY(-50%)';
        break;
      case 'bottom':
        newPosition = {
          top: elementRect.bottom + margin,
          left: elementRect.left + (elementRect.width / 2)
        };
        transform = 'translateX(-50%)';
        break;
      case 'left':
        newPosition = {
          top: elementRect.top + (elementRect.height / 2),
          left: elementRect.left - margin
        };
        transform = 'translate(-100%, -50%)';
        break;
      default:
        newPosition = {
          top: elementRect.top + (elementRect.height / 2),
          left: elementRect.left + (elementRect.width / 2)
        };
        transform = 'translate(-50%, -50%)';
    }
    
    popupManager.container.style.transform = transform;
    popupManager.updatePosition(newPosition);
  }
  
  /**
   * Perform step actions
   * @private
   */
  _performStepActions(step, element) {
    if (!step.action || !element) {
      return;
    }
    
    const { type, value, delay = 0, autoAdvance, typeEffect, typeDelay = 50 } = step.action;
    
    const executeAction = () => {
      switch (type) {
        case 'click':
          element.click();
          break;
        case 'input':
          if (typeEffect) {
            this._typeText(element, value, typeDelay, autoAdvance);
          } else {
            element.value = value;
            element.dispatchEvent(new Event('input', { bubbles: true }));
          }
          break;
        case 'focus':
          element.focus();
          break;
        case 'hover':
          element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
          break;
        case 'custom':
          if (typeof step.action.handler === 'function') {
            step.action.handler(element, this);
          }
          break;
      }
      
      if (autoAdvance && type !== 'input') {
        setTimeout(() => this.next(this.activeAgentId), delay || 1000);
      }
    };
    
    setTimeout(executeAction, delay);
  }
  
  /**
   * Type text character by character
   * @private
   */
  _typeText(element, text, charDelay, autoAdvance) {
    element.value = '';
    element.dispatchEvent(new Event('input', { bubbles: true }));
    
    let i = 0;
    const typeNextChar = () => {
      if (i < text.length) {
        element.value += text.charAt(i);
        element.dispatchEvent(new Event('input', { bubbles: true }));
        i++;
        setTimeout(typeNextChar, charDelay);
      } else if (autoAdvance) {
        setTimeout(() => this.next(this.activeAgentId), 1000);
      }
    };
    
    typeNextChar();
  }
  
  /**
   * Move to next step
   */
  next(agentId = this.activeAgentId) {
    if (!agentId || !this.agents.has(agentId)) {
      return;
    }
    
    const agent = this.agents.get(agentId);
    const { steps, state } = agent;
    
    // Clean up current step
    this._cleanupCurrentStep(agentId);
    
    if (state.currentStepIndex < steps.length - 1) {
      state.currentStepIndex++;
      this._renderCurrentStep(agentId, false); // Not auto-start for navigation
    } else {
      // End of steps - show final popup or end
      // Determine finalPopupConfig: agent config > global config
      if (agent.config.finalPopupConfig != null) {
        if (!state.finalPopupShown) {
          if (this.config.debug) {
            console.log(`[SableTextAgent][DEBUG] Showing final popup for agent '${agentId}'`);
          }
          this._showFinalPopup(agentId, agent.config.finalPopupConfig);
          state.finalPopupShown = true;
        } else {
          if (this.config.debug) {
            console.log(`[SableTextAgent][DEBUG] Final popup already shown for agent '${agentId}', ending agent.`);
          }
          this._endAgent(agentId);
        }
      } else {
        if (this.config.debug) {
          console.log(`[SableTextAgent][DEBUG] No finalPopupConfig found for agent '${agentId}', ending agent.`);
        }
        // No finalPopupConfig: just end the agent (close popup)
        this._endAgent(agentId);
      }
    }
  }
  
  /**
   * Move to previous step
   */
  previous(agentId = this.activeAgentId) {
    if (!agentId || !this.agents.has(agentId)) {
      return;
    }
    
    const agent = this.agents.get(agentId);
    const { state } = agent;
    
    this._cleanupCurrentStep(agentId);
    
    if (state.currentStepIndex > 0) {
      state.currentStepIndex--;
      this._renderCurrentStep(agentId, false); // Not auto-start for navigation
    }
  }
  
  /**
   * Clean up current step
   * @private
   */
  _cleanupCurrentStep(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent) return;
    
    const { state } = agent;
    
    // Clean up trigger
    if (state.triggerCleanup) {
      state.triggerCleanup();
      state.triggerCleanup = null;
    }
    
    // Clean up popup
    if (state.activePopupManager && globalPopupManager.activePopup === state.activePopupManager) {
      state.activePopupManager.unmount();
      state.activePopupManager = null;
    }
  }
  
  /**
   * Show final popup
   * @private
   */
  _showFinalPopup(agentId, finalPopupConfig) {
    const agent = this.agents.get(agentId);
    // Use the provided config, or fallback to global config
    const config = finalPopupConfig || this.config.finalPopupConfig || {};
    const sections = config.sections || [];

    agent.state.finalPopupManager = globalPopupManager.showStatefulPopup(
      (opts) => new PopupStateManager(opts),
      {
        platform: 'Sable',
        primaryColor: config.primaryColor || this.config.primaryColor,
        width: 380,
        sections,
        enableChat: config.enableChat,
        onClose: () => {
          agent.state.finalPopupManager = null;
        }
      }
    );
  }
  
  /**
   * End an agent
   * @private
   */
  _endAgent(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent) return;
    
    this._cleanupCurrentStep(agentId);
    
    // Clean up final popup
    if (agent.state.activePopupManager) {
      agent.state.activePopupManager.unmount();
      agent.state.activePopupManager = null;
    }
    
    // Clean up final popup
    if (agent.state.finalPopupManager) {
      agent.state.finalPopupManager.unmount();
      agent.state.finalPopupManager = null;
    }
    
    // Reset state
    agent.state.isRunning = false;
    agent.state.currentStepIndex = -1;
    agent.state.activePopupManager = null;
    agent.state.finalPopupShown = false;
    agent.state.hasRenderedOnce = false;
    
    if (this.activeAgentId === agentId) {
      this.activeAgentId = null;
    }
    
    if (this.config.debug) {
      console.log(`[SableTextAgent] Agent "${agentId}" ended`);
    }
  }
  
  /**
   * End current agent
   */
  end(agentId = this.activeAgentId) {
    if (agentId) {
      this._endAgent(agentId);
    }
  }
  
  /**
   * Restart an agent
   */
  async restart(agentId, stepId = null, skipTrigger = false) {
    if (!agentId || !this.agents.has(agentId)) {
      console.warn(`[SableTextAgent] Agent "${agentId}" not found`);
      return;
    }
    
    const agent = this.agents.get(agentId);
    
    // End if currently running
    if (agent.state.isRunning) {
      this._endAgent(agentId);
    }
    
    // Reset state
    agent.state.hasRenderedOnce = false;
    agent.state.finalPopupShown = false;
    
    // Start again
    await this.start(agentId, stepId, skipTrigger);
  }
  
  /**
   * Show a simple popup
   */
  showPopup(options) {
    if (!isBrowser) {
      console.warn('[SableTextAgent] Popup can only be shown in browser environment');
      return null;
    }
    
    const defaultOptions = {
      text: '',
      boxWidth: this.config.defaultBoxWidth,
      buttonType: 'arrow',
      primaryColor: this.config.primaryColor,
      parent: safeDocument?.body || document.body,
      fontSize: '15px',
      sections: []
    };
    
    return globalPopupManager.showPopup({ ...defaultOptions, ...options });
  }
  
  /**
   * Destroy the engine
   */
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    
    // Remove event listeners
    if (this._textAgentStartHandler && typeof window !== 'undefined') {
      window.removeEventListener('sable:textAgentStart', this._textAgentStartHandler);
      this._textAgentStartHandler = null;
    }
    
    // End all running agents
    for (const [agentId, agent] of this.agents.entries()) {
      if (agent.state.isRunning) {
        this._endAgent(agentId);
      }
    }
    
    this.agents.clear();
    this.activeAgentId = null;
    _instance = null;
  }
}
