/**
 * Text Agent Engine
 * Core functionality for managing and executing text agent guides using SimplePopupManager
 */

import { waitForElement } from './elementSelector.js';
import { isBrowser, safeWindow, safeDocument } from '../utils/browserAPI.js';
import { highlightElement, removeHighlight } from '../ui/highlight.js';
import { SimplePopupManager } from '../ui/SimplePopupManager.js';
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
        
        if (isNewActivation && this.config.autoStart) {
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
    
    // Check for triggerOnTyping property
    const step = this.steps[this.currentStepIndex];
    if (step && step.triggerOnTyping) {
      this._setupTypingTrigger(step);
    } else {
      setTimeout(() => this._renderCurrentStep(), 1200);
    }
    
    return this; // For chaining
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

    const showStep = () => {
      if (cleanup) cleanup();
      this._renderCurrentStep();
    };

    // The exact string you want to match
    const exactMatch = "Compare the performance of Tesla and Ford in the EV market";

    // Show immediately if the value already matches
    if (input.value === exactMatch) {
      showStep();
      return;
    }

    if (on === 'start') {
      const handler = () => {
        if (!hasStarted && input.value.length > 0) {
          hasStarted = true;
          showStep();
        }
        // Also show if the value matches exactly
        if (input.value === exactMatch) {
          showStep();
        }
      };
      cleanup = addEvent(input, 'input', handler);
    } else if (on === 'stop') {
      const handler = debounce(() => {
        // Show if the value matches exactly
        if (input.value === exactMatch) {
          showStep();
        } else {
          showStep();
        }
      }, stopDelay);
      cleanup = addEvent(input, 'input', handler);
    }

    this._typingCleanup = cleanup;
  }
  
  /**
   * Move to the next step
   */
  next() {
    // Clean up current step if any
    this._cleanupCurrentStep();
    
    if (this.currentStepIndex < this.steps.length - 1) {
      this.currentStepIndex++;
      this._renderCurrentStep();
    } else {
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
    // Remove any active popup
    if (this.activePopupManager) {
      this.activePopupManager.unmount();
      this.activePopupManager = null;
    }
    
    // Remove any highlights
    removeHighlight();
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
      // Skip this step and go to the next one
      this.next();
      return;
    }
    // --- END CONDITIONAL POPUP LOGIC ---
    
    if (this.config.debug) {
      console.log(`[SableTextAgent] Rendering step ${this.currentStepIndex + 1}/${this.steps.length}`, step);
    }
    
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
      
      // Highlight the element if found
      if (element) {
        console.log('Target element found:', element);
        highlightElement(element);
      }
      
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
    // Clean up any existing popup
    this._cleanupCurrentStep();
    
    // Configure popup options based on step
    const popupOptions = {
      text: step.text,
      boxWidth: step.boxWidth || this.config.defaultBoxWidth,
      buttonType: step.buttonType || 'arrow',
      primaryColor: step.primaryColor || this.config.primaryColor,
      parent: safeDocument?.body || document.body,
      includeTextBox: step.includeTextBox || false,
    };
    
    // Set up callbacks
    if (step.buttonType === 'yes-no') {
      popupOptions.onYesNo = (isYes) => {
        if (isYes && typeof step.onYesNo === 'function') {
          step.onYesNo(true);
        } else if (!isYes && typeof step.onYesNo === 'function') {
          step.onYesNo(false);
        }
        
        // Auto-advance if configured
        if (step.autoAdvance) {
          setTimeout(() => this.next(), step.autoAdvanceDelay || 1000);
        }
      };
    } else {
      if (step.includeTextBox) {
        popupOptions.onProceed = (textInput) => {
          console.log('[TextAgent] onProceed hooked – scheduling next in', step.autoAdvanceDelay || 1000);
          const delay = step.autoAdvanceDelay || 1000;
          setTimeout(async () => {
            console.log('[TextAgent] delayed-next fired');
            if (typeof step.onProceed === 'function') {
              await step.onProceed(textInput);
            }
            this.next();
          }, delay); 
        };
      } else {
          // Default arrow button
          popupOptions.onProceed = () => {
            console.log('[TextAgent] onProceed hooked – scheduling next in', step.autoAdvanceDelay || 1000);
            const delay = step.autoAdvanceDelay || 1000;
            setTimeout(async () => {
                console.log('[TextAgent] delayed-next fired');
                if (typeof step.onProceed === 'function') {
                    await step.onProceed(); 
                }
                this.next();
            }, delay);
          };
      }
    }
    // Create and mount the popup
    this.activePopupManager = new SimplePopupManager(popupOptions);
    this.activePopupManager.mount(popupOptions.parent);
    
    // Position the popup relative to target element if specified
    if (targetElement && step.targetElement && step.targetElement.position) {
      const position = step.targetElement.position;
      const elementRect = targetElement.getBoundingClientRect();
      let newPosition = {};
      
      // First, get the popup dimensions to position it correctly
      // We need to ensure the popup is rendered before measuring it
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
            left: elementRect.left - popupWidth + (elementRect.width / 2)
          };
          // Center horizontally
          this.activePopupManager.container.style.transform = 'translateX(-50%)';
          break;
        case 'right':
          // Position popup so its left edge is to the right of the target element
          newPosition = {
            top: elementRect.top - popupHeight / 2 + (elementRect.height / 2),
            left: elementRect.right + margin
          };
          // Center vertically
          this.activePopupManager.container.style.transform = 'translateY(-50%)';
          break;
        case 'bottom':
          // Position popup so its top edge is below the target element
          newPosition = {
            top: elementRect.bottom + margin,
            left: elementRect.left - popupWidth + (elementRect.width / 2)
          };
          // // Center horizontally
          // this.activePopupManager.container.style.transform = 'translateX(-50%)';
          break;
        case 'left':
          // Position popup so its right edge is to the left of the target element
          newPosition = {
            top: elementRect.top - popupHeight / 2 + (elementRect.height / 2),
            left: elementRect.left - (2 * popupWidth) - margin
          };
          // Center vertically
          this.activePopupManager.container.style.transform = 'translateY(-50%)';
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

    const defaultOptions = {
      text: '',
      boxWidth: this.config.defaultBoxWidth || 300,
      buttonType: 'arrow',
      primaryColor: this.config.primaryColor || '#FFFFFF',
      parent: safeDocument?.body || document.body,
      fontSize: this.config.fontSize || '15px'
    };

    // Clean up any existing popup
    this._cleanupCurrentStep();

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

    // Create and mount the popup
    const popupManager = new SimplePopupManager({ ...defaultOptions, ...options });
    this.activePopupManager = popupManager;
    popupManager.mount(options.parent || defaultOptions.parent);

    // --- New: Position the popup relative to target element if specified ---
    if (targetElement && options.targetElement.position) {
      const position = options.targetElement.position;
      const elementRect = targetElement.getBoundingClientRect();
      const popupRect = popupManager.container.getBoundingClientRect();
      const popupWidth = popupRect.width || 200;
      const popupHeight = popupRect.height || 100;
      const margin = 10;
      let newPosition = {};

      switch (position) {
        case 'top':
          newPosition = {
            top: elementRect.top - popupHeight - margin,
            left: elementRect.left - popupWidth + elementRect.width / 2
          };
          popupManager.container.style.transform = 'translateX(-50%)';
          break;
        case 'right':
          newPosition = {
            top: elementRect.top - popupHeight / 2 + elementRect.height / 2,
            left: elementRect.right + margin
          };
          popupManager.container.style.transform = 'translateY(-50%)';
          break;
        case 'bottom':
          newPosition = {
            top: elementRect.bottom + margin,
            left: elementRect.left - popupWidth + elementRect.width / 2
          };
          // popupManager.container.style.transform = 'translateX(-50%)';
          break;
        case 'left':
          newPosition = {
            top: elementRect.top - popupHeight / 2 + elementRect.height / 2,
            left: elementRect.left - 2 * popupWidth - margin
          };
          popupManager.container.style.transform = 'translateY(-50%)';
          break;
        default:
          newPosition = {
            top: elementRect.top + elementRect.height / 2,
            left: elementRect.left + elementRect.width / 2
          };
          popupManager.container.style.transform = 'translate(-50%, -50%)';
      }
      popupManager.updatePosition(newPosition);
    }

    // Register this popup
    this.activePopups.push({
      id: options.id || options.text || `popup-${Date.now()}`,
      unmount: () => {
        popupManager.unmount();
        if (this.activePopupManager === popupManager) {
          this.activePopupManager = null;
        }
      }
    });

    return {
      unmount: () => {
        popupManager.unmount();
        if (this.activePopupManager === popupManager) {
          this.activePopupManager = null;
        }
        this.activePopups = this.activePopups.filter(p => p.unmount !== popupManager.unmount);
      },
      mount: (newParent) => popupManager.mount(newParent)
    };
  }
  
  /**
   * Add a final popup step with the chat interface
   * @private
   */
  _addFinalPopupStep() {
    // Initialize PopupStateManager for the final step
    const popupManager = new PopupStateManager({
      platform: 'Tavily',
      primaryColor: this.config.primaryColor || '#FFFFFF',
      width: 380,
      onChatSubmit: async (message) => {
        // Handle chat submission - can be customized based on your needs
        console.log('Chat message received:', message);
        return 'Thank you for your message. How else can I help you?';
      }
    });
    
    // Mount to document body
    popupManager.mount(document.body);
    
    // Store reference for cleanup
    this._finalPopupManager = popupManager;
  }

  /**
   * Clean up when destroying the engine
   */
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}
