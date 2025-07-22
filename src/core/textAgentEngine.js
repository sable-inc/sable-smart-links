/**
 * Text Agent Engine
 * Core functionality for managing and executing text agent guides using SimplePopupManager
 */

import { waitForElement } from '../utils/elementSelector.js';
import { isBrowser, safeWindow, safeDocument } from '../utils/browserAPI.js';
// import { highlightElement, removeHighlight } from '../ui/highlight.js';
import { SimplePopupManager } from '../ui/SimplePopupManager.js';
import globalPopupManager from '../ui/GlobalPopupManager.js';
import { PopupStateManager } from '../ui/PopupStateManager.js';
import { addEvent, debounce } from '../utils/events.js';

export class TextAgentEngine {
  /**
   * Create a new TextAgentEngine
   * @param {Object} config - Configuration options
   */
  constructor(config) {
    // Default configuration
    this.config = {
      debug: false,
      stepDelay: 500,
      autoStart: true,
      primaryColor: '#FFFFFF',
      defaultBoxWidth: 300,
      finalPopupConfig: {
        enableChat: true,
        sections: []
      },
      triggerButton: {
        enabled: false,
        text: 'Start Guide',
        position: 'bottom-right', // 'bottom-right', 'bottom-left', 'top-right', 'top-left'
        targetElement: null, // Element to attach the button to
        urlPaths: [], // Array of URL paths where the button should be shown
        style: {
          backgroundColor: '#4A90E2',
          color: '#FFFFFF',
          borderRadius: '20px',
          padding: '8px 16px',
          fontSize: '14px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
        }
      },
      autoStartOnce: true,
      ...config
    };
    
    if (this.config.debug) {
      console.log('[SableTextAgent] Initializing with config:', this.config);
    }
    
    // State management
    this.steps = [];
    this.currentStepIndex = -1;
    this.isRunning = false;
    this.activePopupManager = null;
    this._finalPopupAdded = false;
    this.activeSteps = new Set(); // Track which steps are currently active
    this.registeredAgents = new Map(); // Store registered agents
    this.lastActiveAgentId = null; // Track the ID of the last active agent
    this.triggerButtonElement = null; // Reference to the trigger button element
    
    // Only set up observer if we're in a browser environment
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      this.observer = new MutationObserver(() => this.checkVisibleElements());
      this.observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true
      });
    }
    
    // Bind methods
    this.next = this.next.bind(this);
    this.previous = this.previous.bind(this);
    this.end = this.end.bind(this);

    // Add these lines after other state management variables
    this.activeSteps = new Set(); // Track which steps are currently active
    this.registeredAgents = new Map(); // Store registered agents
  }
  
  /**
   * Initialize the engine
   * @returns {TextAgentEngine} - The engine instance
   */
  init() {
    if (this.config.debug) {
      console.log('[SableTextAgent] Initializing');
    }
    
    // Create trigger button if enabled
    console.log('[SableTextAgent] Trigger button enabled:', this.config.triggerButton.enabled);
    if (this.config.triggerButton.enabled) {
      this._createTriggerButton();
    }
    
    // Add event listener for section item restart events
    if (typeof window !== 'undefined') {
      window.addEventListener('sable:textAgentStart', (event) => {
        const { stepId, skipTrigger, agentId } = event.detail;
        if (this.config.debug) {
          console.log(`[SableTextAgent] Received start event for step: ${stepId}, skipTrigger: ${skipTrigger}, agentId: ${agentId}`);
        }
        // Set the lastActiveAgentId if provided
        if (agentId) {
          this.lastActiveAgentId = agentId;
        }
        this.restart({ stepId, skipTrigger });
      });
    }
    
    return this;
  }
  
  /**
   * Register text agent steps
   * @param {string} id - Unique identifier for the text agent
   * @param {Array<TextAgentStep>} steps - Array of text agent steps
   */
  register(id, steps) {
    console.log(`[SableTextAgent] Registering agent "${id}" with ${steps.length} steps`);
    
    // Store the original registration
    this.registeredAgents.set(id, steps.map(step => ({
      ...step,
      id: step.id || `${id}-${Math.random().toString(36).substr(2, 9)}`
    })));

    // Initial check for visible elements
    this.checkVisibleElements();
  }
  
  /**
   * Check which elements are currently visible and update active steps
   * @private
   */
  checkVisibleElements() {
    // Skip if not in browser environment
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }
    
    const previouslyActive = new Set(this.activeSteps);
    this.activeSteps.clear();

    // Check each registered agent's steps
    for (const [id, steps] of this.registeredAgents.entries()) {
      const visibleSteps = steps.filter(step => {
        if (!step.requiredSelector) return true;

        let element;
        if (step.requiredSelector.startsWith('//')) {
          element = document.evaluate(
            step.requiredSelector,
            document,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null
          ).singleNodeValue;
        } else {
          element = document.querySelector(step.requiredSelector);
        }

        const isVisible = !!element;
        if (isVisible) {
          this.activeSteps.add(step.id);
        }
        return isVisible;
      });

      // Update current steps if they've changed
      const hasChanges = 
        visibleSteps.length > 0 && 
        (!this.steps.length || 
         !this.steps.every(s => visibleSteps.some(vs => vs.id === s.id)));

      if (hasChanges) {
        console.log(`[SableTextAgent] Updating active steps for "${id}"`, visibleSteps);
        this.steps = visibleSteps;
        
        // Only auto-start if this is a new activation
        const isNewActivation = visibleSteps.some(step => 
          !previouslyActive.has(step.id)
        );
        
        let shouldAutoStart = false;
        if (this.config.autoStartOnce && this.config.autoStart) {
          const localStorageKey = `SableTextAgentEngine_autoStartedOnce_${id}`;
          try {
            if (!window.localStorage.getItem(localStorageKey)) {
              shouldAutoStart = true;
            }
          } catch (e) {
            // Fallback: if localStorage is not available, just autoStart once per session per agent
            if (!this._autoStartedOnceFallback) {
              this._autoStartedOnceFallback = {};
            }
            if (!this._autoStartedOnceFallback[id]) {
              shouldAutoStart = true;
              // Do NOT set fallback here, only set when actually triggered
            }
          }
        } else if (this.config.autoStart) {
          shouldAutoStart = true;
        }
        if (isNewActivation && shouldAutoStart) {
          console.log(`[SableTextAgent] Auto-starting agent "${id}"`);
          this.start();
        }
      } else if (this.steps.length && visibleSteps.length === 0) {
        // All elements disappeared, clear steps
        console.log(`[SableTextAgent] All elements gone for "${id}", clearing steps`);
        this.steps = [];
        this.end(); // End the current session if elements disappear
      }
    }
  }
  
  /**
   * Start the text agent
   * @param {string} [stepId] - Optional step ID to start from
   * @param {boolean} [skipTrigger=false] - Whether to skip trigger checks and show the popup immediately
   */
  start(stepId, skipTrigger = false) {
    if (this.isRunning) {
      console.warn('[SableTextAgent] Already running');
      return;
    }
    
    if (this.config.debug) {
      console.log(`[SableTextAgent] Starting with skipTrigger: ${skipTrigger}`);
    }
    
    this.isRunning = true;
    
    // If a specific step ID is provided, find and set it as the current step
    if (stepId) {
      const stepIndex = this.steps.findIndex(step => step.id === stepId);
      if (stepIndex !== -1) {
        this.currentStepIndex = stepIndex;
      }
    } else if (this.currentStepIndex === -1) {
      // If no current step is set, start from the beginning
      this.currentStepIndex = 0;
    }

    // --- Set lastActiveAgentId based on current steps ---
    for (const [id, agentSteps] of this.registeredAgents.entries()) {
      // Compare by step IDs for robustness
      const agentStepIds = agentSteps.map(s => s.id);
      const currentStepIds = this.steps.map(s => s.id);
      if (
        agentStepIds.length === currentStepIds.length &&
        agentStepIds.every((id, idx) => id === currentStepIds[idx])
      ) {
        this.lastActiveAgentId = id;
        if (this.config.debug) {
          console.log(`[SableTextAgent][start] Set lastActiveAgentId to: ${id}`);
        }
        break;
      }
    }
    
    // Store the skipTrigger flag on the instance for use in _renderCurrentStep
    this._skipTrigger = skipTrigger;
    
    // Get the current step
    const step = this.steps[this.currentStepIndex];
    
    // If skipTrigger is true, immediately render the step
    if (skipTrigger) {
      this._renderCurrentStep();
      return;
    }
    
    // Otherwise check for triggers
    if (step) {
      if (step.triggerOnTyping) {
        this._setupTypingTrigger(step);
      } else if (step.triggerOnButtonPress) {
        this._setupButtonPressTrigger(step);
      } else {
        // No triggers, render immediately with a small delay
        setTimeout(() => this._renderCurrentStep(), 100);
      }
    } else {
      console.warn('[SableTextAgent] No step found at index:', this.currentStepIndex);
    }
    
    return this; // For chaining
  }
  
  /**
   * Set up button press trigger for a step
   * @param {TextAgentStep} step - The step to set up trigger for
   * @private
   */
  _setupButtonPressTrigger(step) {
    if (!step.triggerOnButtonPress || !step.triggerOnButtonPress.selector) {
      console.warn('[SableTextAgent] Invalid triggerOnButtonPress configuration');
      this._renderCurrentStep(); // Fall back to immediate rendering
      return;
    }
    
    const { selector, event = 'click', delay = 0 } = step.triggerOnButtonPress;
    
    // Function to show the step after button press
    const showStep = () => {
      if (this.config.debug) {
        console.log(`[SableTextAgent] Button press detected for step ${step.id}`);
      }
      
      // Remove the event listener to prevent multiple triggers
      document.querySelectorAll(selector).forEach(el => {
        el.removeEventListener(event, handler);
      });
      
      // Show the step after the specified delay
      if (delay > 0) {
        setTimeout(() => this._renderCurrentStep(), delay);
      } else {
        this._renderCurrentStep();
      }
    };
    
    // Event handler
    const handler = () => {
      showStep();
    };
    
    // Wait for the element to be available in the DOM
    waitForElement(selector).then(() => {
      if (this.config.debug) {
        console.log(`[SableTextAgent] Setting up button press trigger on ${selector} for event ${event}`);
      }
      
      // Add event listener to all matching elements
      document.querySelectorAll(selector).forEach(el => {
        el.addEventListener(event, handler);
      });
    }).catch(error => {
      console.error(`[SableTextAgent] Error setting up button press trigger: ${error}`);
      this._renderCurrentStep(); // Fall back to immediate rendering
    });
  }
  
  /**
   * Set up typing trigger for a step
   * @private
   */
  _setupTypingTrigger(step) {
    const { selector, on = 'start', stopDelay = 1000 } = step.triggerOnTyping;
    const input = document.querySelector(selector);
    if (!input) {
      setTimeout(() => this._setupTypingTrigger(step), 500);
      return;
    }

    let hasStarted = false;
    let cleanup = null;
    const agentId = this.lastActiveAgentId || Array.from(this.registeredAgents.keys())[0];
    const showStep = () => {
      if (cleanup) cleanup();
      // Set localStorage key when actually triggered
      if (this.config.autoStart && this.config.autoStartOnce && agentId) {
        const localStorageKey = `SableTextAgentEngine_autoStartedOnce_${agentId}`;
        try {
          window.localStorage.setItem(localStorageKey, 'true');
        } catch (e) {
          if (!this._autoStartedOnceFallback) this._autoStartedOnceFallback = {};
          this._autoStartedOnceFallback[agentId] = true;
        }
      }
      this._renderCurrentStep();
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
      const handler = debounce(() => {
        showStep();
      }, stopDelay);
      cleanup = addEvent(input, 'input', handler);
    }

    this._typingCleanup = cleanup;
  }
  
  /**
   * Move to the next step
   */
  next() {
    if (this.config.debug) {
      console.log('[SableTextAgent][next] Advancing to next step. Current index:', this.currentStepIndex, 'Active agent:', this.lastActiveAgentId, 'Steps:', this.steps.map(s => s.id));
    }
    // Clean up current step if any
    this._cleanupCurrentStep();
    
    if (this.currentStepIndex < this.steps.length - 1) {
      this.currentStepIndex++;
      if (this.config.debug) {
        const step = this.steps[this.currentStepIndex];
        console.log('[SableTextAgent][next] Now at step index:', this.currentStepIndex, 'Step ID:', step && step.id, 'Active agent:', this.lastActiveAgentId);
      }
      this._renderCurrentStep();
    } else {
      if (this.config.debug) {
        console.log('[SableTextAgent][next] Reached end of steps. Final popup added?', this._finalPopupAdded);
      }
      // We've reached the end of the steps
      // Check if we need to show the final popup
      if (!this._finalPopupAdded) {
        this._addFinalPopupStep();
        this._finalPopupAdded = true;
        // The walkthrough is technically done, but we keep it in "running" state
        // so the popup can remain visible until explicitly closed
      } else {
        this.end();
      }
    }
    
    return this; // For chaining
  }
  
  /**
   * Move to the previous step
   */
  previous() {
    // Clean up current step if any
    this._cleanupCurrentStep();
    
    if (this.currentStepIndex > 0) {
      this.currentStepIndex--;
      this._renderCurrentStep();
    }
    
    return this; // For chaining
  }
  
  /**
   * End the current text agent session
   */
  async end() {
    // Clean up current step
    this._cleanupCurrentStep();
    
    // Clean up final popup if it exists
    if (this._finalPopupManager) {
      this._finalPopupManager.unmount();
      this._finalPopupManager = null;
    }
    
    this.isRunning = false;
    this.currentStepIndex = -1;
    this._finalPopupAdded = false;
    
    if (this.config.debug) {
      console.log('[SableTextAgent] Session ended');
    }
    
    return this; // For chaining
  }
  
  /**
   * Clean up the current step
   * @private
   */
  _cleanupCurrentStep() {
    // Only unmount if this is the active popup in the global manager
    if (this.activePopupManager && globalPopupManager.activePopup === this.activePopupManager) {
      this.activePopupManager.unmount();
      this.activePopupManager = null;
    }
    // // Remove any highlights
    // removeHighlight();
  }
  
  /**
   * Render the current step
   * @private
   */
  _renderCurrentStep() {
    if (this.currentStepIndex < 0 || this.currentStepIndex >= this.steps.length) {
      if (this.config.debug) {
        console.log('[SableTextAgent][_renderCurrentStep] Invalid step index:', this.currentStepIndex, 'Steps length:', this.steps.length, 'Active agent:', this.lastActiveAgentId);
      }
      return;
    }
    const step = this.steps[this.currentStepIndex];
    if (this.config.debug) {
      console.log('[SableTextAgent][_renderCurrentStep] Rendering step index:', this.currentStepIndex, 'Step ID:', step && step.id, 'Active agent:', this.lastActiveAgentId, 'Step:', step);
      console.log('[SableTextAgent][_renderCurrentStep] Step.sections:', step && step.sections);
    }
    
    // --- CONDITIONAL POPUP LOGIC ---
    let shouldShow = true;
    if (typeof step.showIf === "function") {
      shouldShow = step.showIf();
    } else if (typeof step.showIf === "string" && this.config.functionRegistry) {
      const fn = this.config.functionRegistry[step.showIf];
      if (typeof fn === "function") {
        shouldShow = fn();
      }
    }
    if (!shouldShow) {
      if (this.config.debug) {
        console.log('[SableTextAgent][_renderCurrentStep] Step', step && step.id, 'shouldShow=false, skipping to next');
      }
      // Skip this step and go to the next one
      this.next();
      return;
    }
    // --- END CONDITIONAL POPUP LOGIC ---
    
    // First handle any target element that needs to be highlighted or waited for
    this._handleTargetElement(step).then(targetElement => {
      // Create popup based on step configuration
      this._createPopupForStep(step, targetElement);
      
      // Handle any auto-actions after a brief delay
      setTimeout(() => {
        this._performStepActions(step, targetElement);
      }, this.config.stepDelay);
    });
  }
  
  /**
   * Handle target element selection and highlighting
   * @param {TextAgentStep} step - The current step
   * @returns {Promise<HTMLElement|null>} - Promise resolving to the target element or null
   * @private
   */
  async _handleTargetElement(step) {
    if (!step.targetElement?.selector) {
      return null;
    }
    
    try {
      let element = null;
      
      // Wait for element if configured
      if (step.targetElement.waitForElement) {
        element = await waitForElement(step.targetElement.selector, {
          timeout: step.targetElement.waitTimeout || 5000
        });
      } else {
        // Just try to select it immediately
        element = document.querySelector(step.targetElement.selector);
      }
      
      // // Highlight the element if found
      // if (element) {
      //   console.log('Target element found:', element);
      //   highlightElement(element);
      // }
      
      return element;
    } catch (error) {
      console.error('[SableTextAgent] Error handling target element:', error);
      return null;
    }
  }
  
  /**
   * Create a popup for the current step
   * @param {TextAgentStep} step - The current step
   * @param {HTMLElement|null} targetElement - The target element if any
   * @private
   */
  _createPopupForStep(step, targetElement) {
    if (this.config.debug) {
      console.log('[SableTextAgent][_createPopupForStep] Creating popup for step index:', this.currentStepIndex, 'Step ID:', step && step.id, 'Active agent:', this.lastActiveAgentId, 'Step:', step);
      console.log('[SableTextAgent][_createPopupForStep] Step.sections:', step && step.sections);
    }
    
    // Get the text content, handling both string and function types
    const stepText = typeof step.text === 'function' ? step.text() : step.text;
    const secondaryText = typeof step.secondaryText === 'function' ? step.secondaryText() : step.secondaryText;
    let stepSections = typeof step.sections === 'function' ? step.sections() : step.sections;

    // --- WRAP onSelect for restartFromStep logic (fix) ---
    if (Array.isArray(stepSections)) {
      stepSections = stepSections.map(section => {
        if (!section || typeof section.onSelect !== 'function') return section;
        const originalOnSelect = section.onSelect;
        const wrappedOnSelect = (item) => {
          // Check if restart is requested (either at item or section level)
          if (item && item._restartRequested && (item.restartFromStep !== undefined || section.restartFromStep !== undefined)) {
            // Item-level restartFromStep takes precedence over section-level
            const restartConfig = item.restartFromStep !== undefined ? item.restartFromStep : section.restartFromStep;
            let stepId = null;
            let skipTrigger = false;
            if (restartConfig === null || typeof restartConfig === 'string') {
              stepId = restartConfig;
            } else if (typeof restartConfig === 'object') {
              stepId = restartConfig.stepId;
              skipTrigger = !!restartConfig.skipTrigger;
            }
            // Emit a custom event that TextAgentEngine can listen for
            const startEvent = new CustomEvent('sable:textAgentStart', {
              detail: { stepId, skipTrigger, agentId: this.lastActiveAgentId }
            });
            window.dispatchEvent(startEvent);
          }
          // Always call the original handler
          originalOnSelect(item);
        };
        return { ...section, onSelect: wrappedOnSelect };
      });
    }
    // --- END WRAP ---

    // Create popup options
    const popupOptions = {
      text: stepText,
      secondaryText: secondaryText,
      boxWidth: step.boxWidth || this.config.defaultBoxWidth,
      buttonType: step.buttonType || 'arrow',
      primaryColor: step.primaryColor || this.config.primaryColor,
      sections: stepSections,
      includeTextBox: step.includeTextBox || false,
      fontSize: step.fontSize || '15px',
      parent: safeDocument?.body || document.body
    };
    
    // Set up callbacks
    if (step.buttonType === 'yes-no') {
      popupOptions.onYesNo = (isYes) => {
        if (this.config.debug) {
          console.log('[SableTextAgent][onYesNo] Button pressed. isYes:', isYes, 'Step ID:', step && step.id, 'Active agent:', this.lastActiveAgentId);
        }
        if (isYes && typeof step.onYesNo === 'function') {
          step.onYesNo(true);
        } else if (!isYes && typeof step.onYesNo === 'function') {
          step.onYesNo(false);
        }
        // Auto-advance if configured
        if (step.autoAdvance) {
          if (this.config.debug) {
            console.log('[SableTextAgent][onYesNo] Auto-advancing after yes-no. Step ID:', step && step.id, 'Active agent:', this.lastActiveAgentId);
          }
          setTimeout(() => this.next(), step.autoAdvanceDelay || 1000);
        }
      };
    } else {
      if (step.includeTextBox) {
        popupOptions.onProceed = (textInput) => {
          if (this.config.debug) {
            console.log('[SableTextAgent][onProceed] Proceed pressed (textbox). Step ID:', step && step.id, 'Active agent:', this.lastActiveAgentId, 'Scheduling next in', step.autoAdvanceDelay || 1000);
          }
          const delay = step.autoAdvanceDelay || 1000;
          setTimeout(async () => {
            if (this.config.debug) {
              console.log('[SableTextAgent][onProceed] Delayed-next fired (textbox). Step ID:', step && step.id, 'Active agent:', this.lastActiveAgentId);
            }
            if (typeof step.onProceed === 'function') {
              await step.onProceed(textInput);
            }
            this.next();
          }, delay); 
        };
      } else {
          // Default arrow button
          popupOptions.onProceed = () => {
            if (this.config.debug) {
              console.log('[SableTextAgent][onProceed] Proceed pressed (arrow). Step ID:', step && step.id, 'Active agent:', this.lastActiveAgentId, 'Scheduling next in', step.autoAdvanceDelay || 1000);
            }
            const delay = step.autoAdvanceDelay || 1000;
            setTimeout(async () => {
                if (this.config.debug) {
                    console.log('[SableTextAgent][onProceed] Delayed-next fired (arrow). Step ID:', step && step.id, 'Active agent:', this.lastActiveAgentId);
                }
                if (typeof step.onProceed === 'function') {
                    await step.onProceed(); 
                }
                this.next();
            }, delay);
          };
      }
    }
    // Create and mount the popup using global popup manager
    const popupResult = globalPopupManager.showPopup(popupOptions);
    if (popupResult) {
        this.activePopupManager = popupResult;
    } else {
        console.error('[TextAgentEngine] Failed to create popup');
        return;
    }
    
    // Position the popup relative to target element if specified
    if (targetElement && step.targetElement && step.targetElement.position) {
      const position = step.targetElement.position;
      const elementRect = targetElement.getBoundingClientRect();
      let newPosition = {};
      
      // First, get the popup dimensions to position it correctly
      // We need to ensure the popup is rendered before measuring it
      if (!this.activePopupManager || !this.activePopupManager.container) {
        console.warn('[TextAgentEngine] Popup manager or container not available for positioning');
        return;
      }
      
      const popupRect = this.activePopupManager.container.getBoundingClientRect();
      const popupWidth = popupRect.width || 200; // Fallback width if not yet rendered
      const popupHeight = popupRect.height || 100; // Fallback height if not yet rendered
      const margin = 10; // Space between popup and target element
      
      // Calculate position based on the specified direction
      switch (position) {
        case 'top':
          // Position popup so its bottom edge is above the target element
          newPosition = {
            top: elementRect.top - popupHeight - margin,
            left: elementRect.left + (elementRect.width / 2)
          };
          // Center horizontally
          this.activePopupManager.container.style.transform = 'translateX(-50%)';
          break;
        case 'right':
          // Position popup so its left edge is to the right of the target element
          newPosition = {
            top: elementRect.top + (elementRect.height / 2),
            left: elementRect.right + margin
          };
          // Center vertically
          this.activePopupManager.container.style.transform = 'translateY(-50%)';
          break;
        case 'bottom':
          // Position popup so its top edge is below the target element
          newPosition = {
            top: elementRect.bottom + margin,
            left: elementRect.left + (elementRect.width / 2)
          };
          // Center horizontally
          this.activePopupManager.container.style.transform = 'translateX(-50%)';
          break;
        case 'left':
          // Position popup so its right edge is to the left of the target element
          newPosition = {
            top: elementRect.top + (elementRect.height / 2),
            left: elementRect.left - margin
          };
          // Center vertically and position to the left
          this.activePopupManager.container.style.transform = 'translate(-100%, -50%)';
          break;
        default:
          // Default to centered on the element
          newPosition = {
            top: elementRect.top + (elementRect.height / 2),
            left: elementRect.left + (elementRect.width / 2)
          };
          this.activePopupManager.container.style.transform = 'translate(-50%, -50%)';
      }
      
      // Update the position using the new method
      this.activePopupManager.updatePosition(newPosition);
    }
    
    // Execute callback if provided
    if (typeof step.callback === 'function') {
      step.callback(targetElement, this);
    }
  }
  
  /**
   * Perform actions for the current step
   * @param {TextAgentStep} step - The current step
   * @param {HTMLElement|null} element - The target element if any
   * @private
   */
  _performStepActions(step, element) {
    if (!step.action || !element) return;
    
    const action = step.action;
    
    switch (action.type) {
      case 'click':
        setTimeout(() => {
          element.click();
          
          // Auto advance after click if specified
          if (action.autoAdvance) {
            setTimeout(() => this.next(), action.delay || 1000);
          }
        }, action.delay || 0);
        break;
        
      case 'input':
        // Check if we should use character-by-character typing
        if (action.typeEffect) {
          // Start with empty string
          element.value = '';
          element.dispatchEvent(new Event('input', { bubbles: true }));
          
          const text = action.value || '';
          const charDelay = action.typeDelay || 50; // ms between characters
          
          // Type each character with a delay
          let i = 0;
          const typeNextChar = () => {
            if (i < text.length) {
              // Add the next character
              element.value += text.charAt(i);
              element.dispatchEvent(new Event('input', { bubbles: true }));
              i++;
              
              // Schedule the next character
              setTimeout(typeNextChar, charDelay);
            } else {
              // Typing complete, auto advance if specified
              if (action.autoAdvance) {
                setTimeout(() => this.next(), action.delay || 1000);
              }
            }
          };
          
          // Start typing after initial delay
          setTimeout(typeNextChar, action.delay || 0);
        } else {
          // Original behavior - set value immediately
          element.value = action.value;
          element.dispatchEvent(new Event('input', { bubbles: true }));
          
          // Auto advance after input if specified
          if (action.autoAdvance) {
            setTimeout(() => this.next(), action.delay || 1000);
          }
        }
        break;
        
      case 'focus':
        element.focus();
        break;
        
      case 'hover':
        element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
        break;
        
      case 'custom':
        if (typeof action.handler === 'function') {
          action.handler(element, this);
        }
        break;
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
   * @param {string} [options.fontSize='15px'] - Font size of the popup text in pixels
   * @param {HTMLElement} [options.parent=document.body] - Parent element to mount the popup to
   * @returns {Object} Popup manager instance with mount/unmount methods
   */
  showPopup(options) {
    if (!isBrowser) {
      console.warn('[SableTextAgent] Popup can only be shown in a browser environment');
      return null;
    }

    // Always close any active popup before showing a new one (safe after previous fix)
    globalPopupManager.closeActivePopup();

    const defaultOptions = {
      text: '',
      boxWidth: this.config.defaultBoxWidth || 300,
      buttonType: 'arrow',
      primaryColor: this.config.primaryColor || '#FFFFFF',
      parent: safeDocument?.body || document.body,
      fontSize: this.config.fontSize || '15px',
      sections: [],
    };

    // Note: Global popup manager handles closing existing popups
    // No need to call this._cleanupCurrentStep() here

    // --- New: Find target element if specified ---
    let targetElement = null;
    if (options.targetElement && options.targetElement.selector) {
      targetElement = document.evaluate
        ? document.evaluate(
            options.targetElement.selector,
            document,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null
          ).singleNodeValue
        : document.querySelector(options.targetElement.selector);
    }

    // Create and mount the popup using global popup manager
    const popupResult = globalPopupManager.showPopup({ ...defaultOptions, ...options });
    if (popupResult) {
        console.log('[TextAgentEngine] Setting activePopupManager in showPopup - this will affect hasActivePopup state');
        this.activePopupManager = popupResult;
        console.log('[showPopup] hasActivePopup changed');
    } else {
        console.error('[TextAgentEngine] Failed to create popup');
        return null;
    }

    // --- New: Position the popup relative to target element if specified ---
    if (targetElement && options.targetElement.position) {
      const position = options.targetElement.position;
      const elementRect = targetElement.getBoundingClientRect();
      
      // Safety check for popup manager and container
      if (!this.activePopupManager || !this.activePopupManager.container) {
        console.warn('[TextAgentEngine] Popup manager or container not available for positioning');
        return popupResult;
      }
      
      const popupRect = this.activePopupManager.container.getBoundingClientRect();
      const popupWidth = popupRect.width || 200;
      const popupHeight = popupRect.height || 100;
      const margin = 10;
      let newPosition = {};

      switch (position) {
        case 'top':
          // Position popup so its bottom edge is above the target element
          newPosition = {
            top: elementRect.top - popupHeight - margin,
            left: elementRect.left + (elementRect.width / 2)
          };
          // Center horizontally
          this.activePopupManager.container.style.transform = 'translateX(-50%)';
          break;
        case 'right':
          // Position popup so its left edge is to the right of the target element
          newPosition = {
            top: elementRect.top + (elementRect.height / 2),
            left: elementRect.right + margin
          };
          // Center vertically
          this.activePopupManager.container.style.transform = 'translateY(-50%)';
          break;
        case 'bottom':
          // Position popup so its top edge is below the target element
          newPosition = {
            top: elementRect.bottom + margin,
            left: elementRect.left + (elementRect.width / 2)
          };
          // Center horizontally
          this.activePopupManager.container.style.transform = 'translateX(-50%)';
          break;
        case 'left':
          // Position popup so its right edge is to the left of the target element
          newPosition = {
            top: elementRect.top + (elementRect.height / 2),
            left: elementRect.left - margin
          };
          // Center vertically and position to the left
          this.activePopupManager.container.style.transform = 'translate(-100%, -50%)';
          break;
        default:
          // Default to centered on the element
          newPosition = {
            top: elementRect.top + (elementRect.height / 2),
            left: elementRect.left + (elementRect.width / 2)
          };
          this.activePopupManager.container.style.transform = 'translate(-50%, -50%)';
      }
      this.activePopupManager.updatePosition(newPosition);
    }

    // Return the popup result directly - let the global popup manager handle state
    return popupResult;
  }
  
  /**
   * Create and position the trigger button
   * @private
   */
  _createTriggerButton() {
    // Check if we should show the button based on current URL path
    console.log('[SableTextAgent] Checking trigger button visibility', this._shouldShowTriggerButton());
    if (!this._shouldShowTriggerButton()) {
      return;
    }
    
    // Create button element
    const button = document.createElement('button');
    button.textContent = this.config.triggerButton.text;
    button.className = 'sable-text-agent-trigger';
    
    // Apply styles
    Object.assign(button.style, {
      position: 'fixed',
      zIndex: '9999',
      cursor: 'pointer',
      border: 'none',
      outline: 'none',
      transition: 'all 0.3s ease',
      ...this.config.triggerButton.style
    });
    
    // Position the button if no target selector is provided
    if (!this.config.triggerButton.targetElement) {
      this._positionTriggerButton(button);
    }
    
    // Add click event listener
    button.addEventListener('click', () => {
      // Set localStorage key when actually triggered
      const agentId = this.lastActiveAgentId || Array.from(this.registeredAgents.keys())[0];
      if (this.config.autoStart && this.config.autoStartOnce && agentId) {
        const localStorageKey = `SableTextAgentEngine_autoStartedOnce_${agentId}`;
        try {
          window.localStorage.setItem(localStorageKey, 'true');
        } catch (e) {
          if (!this._autoStartedOnceFallback) this._autoStartedOnceFallback = {};
          this._autoStartedOnceFallback[agentId] = true;
        }
      }
      if (this.lastActiveAgentId) {
        this.start(this.lastActiveAgentId);
      } else {
        // Start the first registered agent if no specific agent was last used
        const firstAgentId = Array.from(this.registeredAgents.keys())[0];
        if (firstAgentId) {
          this.start(firstAgentId);
        } else {
          console.warn('[SableTextAgent] No agents registered to start');
        }
      }
    });
    
    // Add hover effect
    button.addEventListener('mouseenter', () => {
      button.style.transform = 'scale(1.05)';
    });
    
    button.addEventListener('mouseleave', () => {
      button.style.transform = 'scale(1)';
    });
    
    // Store reference to the button
    this.triggerButtonElement = button;
    
    // If there's a target selector, wait for the element and append the button
    if (this.config.triggerButton.targetElement) {
      this._attachButtonToTarget();
    } else {
      // Otherwise, append to body
      document.body.appendChild(button);
    }
    
    // Add URL change listener to show/hide the trigger button
    this._addUrlChangeListener();
  }
  
  /**
   * Check if the trigger button should be shown based on current URL path
   * @private
   * @returns {boolean} - Whether the button should be shown
   */
  _shouldShowTriggerButton() {
    // If no URL paths are specified, show on all paths
    if (!this.config.triggerButton.urlPaths || this.config.triggerButton.urlPaths.length === 0) {
      return true;
    }
    
    const currentPath = safeWindow.location.pathname;
    console.log('[TextAgent] Current path:', currentPath);
    
    // Check if current path matches any of the specified paths
    return this.config.triggerButton.urlPaths.some(path => {
      // Support exact match
      if (path === currentPath) {
        return true;
      }
      
      // Support wildcard match (e.g., '/products/*')
      if (path.endsWith('*')) {
        const basePath = path.slice(0, -1);
        return currentPath.startsWith(basePath);
      }
      
      return false;
    });
  }
  
  /**
   * Position the trigger button based on the position config
   * @private
   * @param {HTMLElement} button - The button element
   */
  _positionTriggerButton(button) {
    const position = this.config.triggerButton.position || 'bottom-right';
    
    switch (position) {
      case 'bottom-right':
        Object.assign(button.style, {
          bottom: '20px',
          right: '20px'
        });
        break;
      case 'bottom-left':
        Object.assign(button.style, {
          bottom: '20px',
          left: '20px'
        });
        break;
      case 'top-right':
        Object.assign(button.style, {
          top: '20px',
          right: '20px'
        });
        break;
      case 'top-left':
        Object.assign(button.style, {
          top: '20px',
          left: '20px'
        });
        break;
      default:
        // Default to bottom-right
        Object.assign(button.style, {
          bottom: '20px',
          right: '20px'
        });
    }
  }
  
  /**
   * Attach the trigger button to a target element
   * @private
   */
  async _attachButtonToTarget() {
    if (!this.config.triggerButton.targetElement || !this.triggerButtonElement) {
      return;
    }
    
    try {
      let targetElement = null;
      const targetConfig = this.config.triggerButton.targetElement;
      
      // Wait for element if configured
      if (targetConfig.waitForElement) {
        targetElement = await waitForElement(targetConfig.selector, {
          timeout: targetConfig.waitTimeout || 5000
        });
      } else {
        // Just try to select it immediately
        targetElement = document.querySelector(targetConfig.selector);
      }
      
      if (targetElement) {
        // Reset position styles when attaching to a target
        Object.assign(this.triggerButtonElement.style, {
          position: 'relative',
          top: 'auto',
          right: 'auto',
          bottom: 'auto',
          left: 'auto'
        });
        
        // If position is specified, use it to position the button relative to the target
        if (targetConfig.position) {
          const position = targetConfig.position;
          
          switch (position) {
            case 'top':
              targetElement.insertAdjacentElement('beforebegin', this.triggerButtonElement);
              break;
            case 'right':
              targetElement.insertAdjacentElement('afterend', this.triggerButtonElement);
              break;
            case 'bottom':
              targetElement.insertAdjacentElement('afterend', this.triggerButtonElement);
              break;
            case 'left':
              targetElement.insertAdjacentElement('beforebegin', this.triggerButtonElement);
              break;
            default:
              // Default behavior - append inside the target
              targetElement.appendChild(this.triggerButtonElement);
          }
        } else {
          // Default behavior - append inside the target
          targetElement.appendChild(this.triggerButtonElement);
        }
        
        if (this.config.debug) {
          console.log(`[SableTextAgent] Attached trigger button to element: ${targetConfig.selector}`);
        }
      }
    } catch (error) {
      console.error(`[SableTextAgent] Failed to attach trigger button to target: ${error.message}`);
    }
  }
  
  /**
   * Add listener for URL changes to show/hide the trigger button
   * @private
   */
  _addUrlChangeListener() {
    if (!this.triggerButtonElement) return;
    
    // Function to update button visibility
    const updateButtonVisibility = () => { 
      if (this._shouldShowTriggerButton()) {
        this.triggerButtonElement.style.display = '';
      } else {
        this.triggerButtonElement.style.display = 'none';
      }
    };
    
    // Listen for popstate events (browser back/forward)
    window.addEventListener('popstate', updateButtonVisibility);
    
    // Use a MutationObserver to detect URL changes from client-side routing
    const observer = new MutationObserver(debounce(() => {
      updateButtonVisibility();
    }, 100));
    
    // Observe the document title as it often changes with client-side routing
    observer.observe(document.querySelector('title'), { subtree: true, characterData: true, childList: true });
  }
  
  /**
   * Add a final popup step with the chat interface
   * @private
   */
  _addFinalPopupStep() {
    // Save the current agent ID before showing the final popup
    if (this.steps.length > 0) {
      // Find which agent these steps belong to
      for (const [id, agentSteps] of this.registeredAgents.entries()) {
        // Check if the current steps match this agent's steps
        const matchingSteps = this.steps.filter(step => 
          agentSteps.some(agentStep => agentStep.id === step.id)
        );
        
        if (matchingSteps.length > 0) {
          this.lastActiveAgentId = id;
          if (this.config.debug) {
            console.log(`[SableTextAgent] Saved last active agent ID: ${id}`);
          }
          break;
        }
      }
    }
    
    // Get sections from configuration
    const sections = Array.isArray(this.config.finalPopupConfig?.sections) ? this.config.finalPopupConfig.sections : [];
    if (!Array.isArray(this.config.finalPopupConfig?.sections) && this.config.finalPopupConfig?.sections !== undefined) {
      console.warn('[SableTextAgent][_addFinalPopupStep] finalPopupConfig.sections is not an array:', this.config.finalPopupConfig.sections);
    }
    if (this.config.debug) {
      console.log('[SableTextAgent][_addFinalPopupStep] Using sections for final popup:', sections);
    }
    
    // Use globalPopupManager to enforce singleton
    this._finalPopupManager = globalPopupManager.showStatefulPopup(
      (opts) => new PopupStateManager(opts),
      {
        platform: 'Sable',
        primaryColor: this.config.primaryColor || '#FFFFFF',
        width: 380,
        sections: sections,
        enableChat: this.config.finalPopupConfig.enableChat,
        onClose: () => {
          this._finalPopupManager = null;
        }
      }
    );
  }

  /**
   * Clean up when destroying the engine
   */
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
    
    // Remove trigger button if it exists
    if (this.triggerButtonElement && this.triggerButtonElement.parentNode) {
      this.triggerButtonElement.parentNode.removeChild(this.triggerButtonElement);
      this.triggerButtonElement = null;
    }
  }
  
  /**
   * Restart the text agent from a specific step
   * @param {string|null|Object} stepIdOrConfig - ID of the step to restart from, or null to restart from beginning,
   *                                           or an object with stepId and skipTrigger properties
   * @param {Function|null} beforeRestartCallback - Optional callback to execute before restarting
   * @public
   */
  restart(stepIdOrConfig = null, beforeRestartCallback = null) {
    // Parse the stepIdOrConfig parameter
    let stepId = null;
    let skipTrigger = false;
    
    if (stepIdOrConfig === null || typeof stepIdOrConfig === 'string') {
      stepId = stepIdOrConfig;
    } else if (typeof stepIdOrConfig === 'object') {
      // Handle both the event detail format and the direct config object format
      if ('stepId' in stepIdOrConfig) {
        stepId = stepIdOrConfig.stepId;
        skipTrigger = !!stepIdOrConfig.skipTrigger;
      } else if ('detail' in stepIdOrConfig) {
        // This is an event object
        stepId = stepIdOrConfig.detail.stepId;
        skipTrigger = !!stepIdOrConfig.detail.skipTrigger;
      }
    }
    
    if (this.config.debug) {
      console.log(`[SableTextAgent] Restarting with stepId: ${stepId}, skipTrigger: ${skipTrigger}`);
    }
    
    // Execute callback if provided
    if (typeof beforeRestartCallback === 'function') {
      beforeRestartCallback();
    }
    
    // End the current session (including removing the final popup)
    this.end();
    
    // Reset state
    this._finalPopupAdded = false;
    
    if (!this.lastActiveAgentId) {
      console.warn('[SableTextAgent] No last active agent to restart');
      return;
    }
    
    // Get the steps for the last active agent
    const steps = this.registeredAgents.get(this.lastActiveAgentId);
    if (!steps || steps.length === 0) {
      console.warn(`[SableTextAgent] No steps found for agent: ${this.lastActiveAgentId}`);
      return;
    }
    
    // Set the steps
    this.steps = steps;
    
    if (!stepId) {
      // No specific step ID, restart from the beginning
      this.currentStepIndex = 0;
      if (this.config.debug) {
        console.log(`[SableTextAgent] Restarting agent from beginning: ${this.lastActiveAgentId}`);
      }
      this.start(null, skipTrigger);
      return;
    }
    
    // Find the step with the matching ID
    const stepIndex = this.steps.findIndex(step => step.id === stepId);
    if (stepIndex !== -1) {
      // Set the current step index to the found step
      this.currentStepIndex = stepIndex;
      if (this.config.debug) {
        console.log(`[SableTextAgent] Restarting agent from step ${stepId}: ${this.lastActiveAgentId}`);
      }
      // Start the agent from the specified step
      this.start(null, skipTrigger);
    } else {
      console.warn(`[SableTextAgent] Step with ID "${stepId}" not found, restarting from beginning`);
      this.currentStepIndex = 0;
      this.start(null, skipTrigger);
    }
  }
  
  /**
   * Restart the last active text agent from the beginning
   * @private
   */
  _restartLastAgent() {
    // Use the new restart method with no specific step ID
    this.restart();
  }
}
