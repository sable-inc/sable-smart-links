/**
 * Walkthrough Engine
 * Core functionality for managing and executing walkthroughs
 */

import { waitForElement } from '../utils/elementSelector.js';
import { highlightElement, removeHighlight } from '../ui/highlight.js';
import { showTooltip, hideTooltip } from '../ui/tooltip.js';
import { createSpotlight, removeSpotlights } from '../ui/spotlight.js';
import { isBrowser, safeWindow, safeDocument } from '../utils/browserAPI.js';
import { EndTourButton } from '../ui/components/EndTourButton.js';
import { 
  logWalkthroughStart, 
  logWalkthroughNext, 
  logWalkthroughEnd, 
  logWalkthroughStepExecuted,
  logWalkthroughStepError,
  updateWalkthroughEventDuration
} from '../utils/analytics.js';

export class WalkthroughEngine {
  /**
   * Create a new WalkthroughEngine
   * @param {Object} config - Configuration options
   */
  constructor(config) {
    // Set default config
    this.config = {
      debug: false,
      autoStart: true,
      stepDelay: 500,
      ...config
    };
    
    if (this.config.debug) {
      console.log('[SableSmartLinks]: Initializing with config:', this.config);
    }
    
    this.walkthroughs = {};
    this.currentWalkthrough = null;
    this.currentStep = 0;
    this.isRunning = false;
    this.activeElements = {
      highlighted: null,
      tooltip: null,
      overlay: null
    };
    
    // Instance tracking
    this.currentInstanceId = null; // Current walkthrough instance ID
    this.currentInstanceStartTime = null; // Timestamp when current walkthrough instance started
    
    // Step duration tracking
    this.currentStepAnalyticsId = null; // MongoDB ID of current step's analytics record
    this.currentStepStartTime = null; // Timestamp when current step started
    this.lastExecutedStepIndex = null; // Track last executed step to prevent duplicates
    
    // Initialize end tour button
    this.endTourButton = null;
    if (isBrowser) {
      this.endTourButton = new EndTourButton(() => this.end());
    }
    
    // Bind methods to ensure correct 'this' context
    this.next = this.next.bind(this);
    this.end = this.end.bind(this);
  }
  
  /**
   * Calculate walkthrough duration from instance start time
   * @private
   */
  _calculateWalkthroughDuration() {
    if (this.config.debug) {
      console.log(`[SableWalkthrough] DEBUG: _calculateWalkthroughDuration called`);
      console.log(`[SableWalkthrough] DEBUG: currentInstanceStartTime: ${this.currentInstanceStartTime}`);
      console.log(`[SableWalkthrough] DEBUG: currentInstanceId: ${this.currentInstanceId}`);
    }
    
    if (!this.currentInstanceStartTime) {
      if (this.config.debug) {
        console.log(`[SableWalkthrough] DEBUG: currentInstanceStartTime is null, returning null for walkthroughDuration`);
      }
      return null;
    }
    
    const duration = Date.now() - this.currentInstanceStartTime;
    if (this.config.debug) {
      console.log(`[SableWalkthrough] DEBUG: Calculated walkthroughDuration: ${duration}ms`);
    }
    return duration;
  }
  
  /**
   * Generate a unique instance ID for a walkthrough
   * @private
   */
  _generateInstanceId() {
    return `instance_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
  }
  
  /**
   * Update previous step duration and reset tracking
   * @private
   */
  _updatePreviousStepDuration() {
    if (this.config.debug) {
      console.log(`[SableWalkthrough] DEBUG: _updatePreviousStepDuration called`);
      console.log(`[SableWalkthrough] DEBUG: currentStepAnalyticsId: ${this.currentStepAnalyticsId}`);
      console.log(`[SableWalkthrough] DEBUG: currentStepStartTime: ${this.currentStepStartTime}`);
    }
    
    if (this.currentStepAnalyticsId && this.currentStepStartTime) {
      const stepDuration = Date.now() - this.currentStepStartTime;
      if (this.config.debug) {
        console.log(`[SableWalkthrough] DEBUG: Calculating step duration: ${Date.now()} - ${this.currentStepStartTime} = ${stepDuration}ms`);
      }
      updateWalkthroughEventDuration(this.currentStepAnalyticsId, stepDuration);
      
      if (this.config.debug) {
        console.log(`[SableWalkthrough] Updated step duration: ${stepDuration}ms for analytics ID: ${this.currentStepAnalyticsId}`);
      }
    } else {
      if (this.config.debug) {
        console.log(`[SableWalkthrough] DEBUG: No tracking info available for step duration update`);
      }
    }
    
    // Reset tracking
    this.currentStepAnalyticsId = null;
    this.currentStepStartTime = null;
    this.lastExecutedStepIndex = null;
  }
  
  /**
   * Save current walkthrough state to localStorage
   */
  _saveState() {
    if (!isBrowser) return;
    
    const state = {
      walkthroughId: this.currentWalkthrough,
      currentStep: this.currentStep,
      isRunning: this.isRunning,
      timestamp: Date.now()
    };
    
    try {
      const stateString = JSON.stringify(state);
      localStorage.setItem('sableWalkthroughState', stateString);
      if (this.config.debug) {
        console.log('[SableSmartLinks] State saved to localStorage:', state);
      }
      return true;
    } catch (e) {
      console.error('[SableSmartLinks] Failed to save walkthrough state to localStorage:', e);
      return false;
    }
  }
  
  /**
   * Load walkthrough state from localStorage
   * @returns {Object|null} The saved state or null if none exists or is expired
   */
  _loadState() {
    if (!isBrowser) {
      if (this.config.debug) {
        console.log('[SableSmartLinks] Not in browser environment, cannot load state');
      }
      return null;
    }
    
    try {
      const savedState = localStorage.getItem('sableWalkthroughState');
      if (!savedState) {
        if (this.config.debug) {
          console.log('[SableSmartLinks] No saved state found in localStorage');
        }
        return null;
      }
      
      const state = JSON.parse(savedState);
      
      if (this.config.debug) {
        console.log('[SableSmartLinks] Loaded state from localStorage:', state);
      }
      
      // Validate state structure
      if (!state.walkthroughId || typeof state.currentStep !== 'number' || typeof state.isRunning !== 'boolean') {
        if (this.config.debug) {
          console.log('[SableSmartLinks] Invalid state: missing required fields');
        }
        return null;
      }
      
      // Check if state is expired (24 hours)
      const now = Date.now();
      const stateAge = now - state.timestamp;
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      
      if (stateAge > maxAge) {
        if (this.config.debug) {
          console.log('[SableSmartLinks] State expired, clearing...');
        }
        this._clearState();
        return null;
      }
      
      if (this.config.debug) {
        console.log(`[SableSmartLinks] State is valid:`, {
          walkthroughId: state.walkthroughId,
          currentStep: state.currentStep,
          isRunning: state.isRunning,
          age: Math.round(stateAge / 1000 / 60) + ' minutes'
        });
      }
      
      return state;
    } catch (e) {
      console.error('[SableSmartLinks] Failed to load walkthrough state from localStorage:', e);
      return null;
    }
  }
  
  /**
   * Clear walkthrough state from localStorage
   */
  _clearState() {
    if (!isBrowser) return;
    
    try {
      localStorage.removeItem('sableWalkthroughState');
      if (this.config.debug) {
        console.log('[SableSmartLinks] Cleared walkthrough state from localStorage');
      }
    } catch (e) {
      console.error('[SableSmartLinks] Failed to clear walkthrough state from localStorage:', e);
    }
  }
  
  /**
   * Restore walkthrough from saved state
   */
  _restoreWalkthrough() {
    if (this.config.debug) {
      console.log('[SableSmartLinks] Attempting to restore walkthrough state...');
    }
    
    const state = this._loadState();
    if (!state || !state.isRunning) {
      if (this.config.debug) {
        console.log('[SableSmartLinks] No valid walkthrough state to restore');
      }
      return false;
    }
    
    // Check if walkthrough exists
    if (!this.walkthroughs[state.walkthroughId]) {
      if (this.config.debug) {
        console.log('[SableSmartLinks] Saved walkthrough not found:', state.walkthroughId);
      }
      this._clearState();
      return false;
    }
    
    // Restore walkthrough
    this.currentWalkthrough = state.walkthroughId;
    this.currentStep = state.currentStep;
    this.isRunning = true;
    
    // Generate new instance ID for restored walkthrough
    this.currentInstanceId = this._generateInstanceId();
    
    if (this.config.debug) {
      console.log(`[SableSmartLinks] Restored walkthrough state:`, {
        walkthroughId: this.currentWalkthrough,
        currentStep: this.currentStep,
        isRunning: this.isRunning,
        instanceId: this.currentInstanceId
      });
    }
    
    // Log analytics for walkthrough restored
    const currentStep = steps[this.currentStep];
    logWalkthroughStart(
      this.currentWalkthrough,
      this.currentStep,
      currentStep.stepId,
      this.currentInstanceId,
      {
        totalSteps: steps.length,
        walkthroughType: 'tutorial',
        restored: true,
        previousSession: true
      },
      null // walkthroughDuration is null for restored event since instance hasn't started yet
    );
    
    // Execute current step
    this.executeStep();
    
    return true;
  }
  
  /**
   * Register a new walkthrough
   * @param {string} id - Unique identifier for the walkthrough
   * @param {Array} steps - Array of step objects defining the walkthrough
   */
  register(id, steps) {
    if (!Array.isArray(steps) || steps.length === 0) {
      console.error(`Walkthrough "${id}" must have at least one step`);
      return;
    }
    
    // Validate that all steps have stepId
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (!step.stepId) {
        console.error(`Walkthrough "${id}" step ${i} is missing required stepId field`);
        return;
      }
    }
    
    this.walkthroughs[id] = steps;
  }
  
  /**
   * Start a walkthrough by ID
   * @param {string} walkthroughId - ID of the walkthrough to start
   * @returns {boolean} - Success status
   */
  start(walkthroughId) {
    if (!this.walkthroughs[walkthroughId]) {
      console.error(`Walkthrough "${walkthroughId}" not found`);
      return false;
    }
    
    // End any currently running walkthrough
    if (this.isRunning) {
      this.end();
    }
    
    this.currentWalkthrough = walkthroughId;
    this.currentStep = 0;
    this.isRunning = true;
    
    // Generate a new instance ID for the walkthrough
    this.currentInstanceId = this._generateInstanceId();
    this.currentInstanceStartTime = Date.now();
    
    // Log analytics for walkthrough start
    const steps = this.walkthroughs[walkthroughId];
    const currentStep = steps[this.currentStep];
    logWalkthroughStart(
      walkthroughId,
      this.currentStep,
      currentStep.stepId,
      this.currentInstanceId,
      {
        totalSteps: steps.length,
        walkthroughType: 'tutorial'
      },
      null // walkthroughDuration is null for start event since instance hasn't started yet
    );
    
    // Show end tour button
    if (this.endTourButton) {
      this.endTourButton.show();
    }
    
    // Save the new state
    this._saveState();
    
    // Execute the first step
    this.executeStep();
    
    return true;
  }
  
  /**
   * Go to the next step in the current walkthrough
   */
  next() {
    if (!this.isRunning) return;
    
    // Get current step info before cleanup for analytics
    const steps = this.walkthroughs[this.currentWalkthrough];
    const currentStep = steps[this.currentStep];
    
    // Update previous step duration before cleanup
    this._updatePreviousStepDuration();
    
    // Clean up current step
    this.cleanupCurrentStep();
    
    // Move to next step
    this.currentStep++;
    
    // Check if we've reached the end of the walkthrough
    if (this.currentStep >= steps.length) {
      // Log analytics for walkthrough end (completed all steps)
      const lastStep = steps[this.currentStep - 1];
      logWalkthroughEnd(
        this.currentWalkthrough,
        this.currentStep - 1, // Use the last completed step index
        lastStep.stepId,
        this.currentInstanceId,
        {
          totalSteps: steps.length,
          stepsCompleted: steps.length,
          completionReason: 'completed'
        },
        this._calculateWalkthroughDuration()
      );
      this.end();
      return;
    }
    
    // Log analytics for next step
    const nextStep = steps[this.currentStep];
    if (nextStep) {
      logWalkthroughNext(
        this.currentWalkthrough,
        this.currentStep,
        nextStep.stepId,
        this.currentInstanceId,
        {
          previousStepIndex: this.currentStep - 1,
          totalSteps: steps.length,
          isLastStep: this.currentStep === steps.length - 1
        },
        this._calculateWalkthroughDuration()
      );
    }
    
    // Save the updated state
    this._saveState();
    
    // Execute the next step
    setTimeout(() => {
      this.executeStep();
    }, this.config.stepDelay || 500);
  }
  
  /**
   * Execute the current step in the walkthrough
   */
  executeStep() {
    if (!this.isRunning) return;
    
    const steps = this.walkthroughs[this.currentWalkthrough];
    const step = steps[this.currentStep];
    
    // Check if we're already executing this step to prevent duplicates
    if (this.lastExecutedStepIndex === this.currentStep && this.currentWalkthrough) {
      if (this.config.debug) {
        console.log(`[SableWalkthrough] DEBUG: Step ${this.currentStep} is already being executed, skipping duplicate`);
      }
      return;
    }
    
    // Update last executed step tracking
    this.lastExecutedStepIndex = this.currentStep;
    
    // Set instance start time on first step execution if not already set
    if (!this.currentInstanceStartTime) {
      this.currentInstanceStartTime = Date.now();
      if (this.config.debug) {
        console.log(`[SableWalkthrough] DEBUG: Set currentInstanceStartTime to ${this.currentInstanceStartTime} for first step execution`);
      }
    }
    
    // Wait for element to be available in the DOM
    if (step.selector) {
      waitForElement(step.selector, { 
        timeout: step.timeout || 10000 
      })
        .then(async element => {
          // Log analytics for step executed and store tracking info (non-blocking)
          logWalkthroughStepExecuted(
            this.currentWalkthrough,
            this.currentStep,
            step.stepId,
            step.selector,
            this.currentInstanceId,
            {
              stepType: this._getStepType(step),
              hasElement: !!element,
              totalSteps: steps.length
            },
            this._calculateWalkthroughDuration()
          ).then(analyticsId => {
            // Store tracking info for step duration
            if (analyticsId) {
              this.currentStepAnalyticsId = analyticsId;
              this.currentStepStartTime = Date.now();
              
              if (this.config.debug) {
                console.log(`[SableWalkthrough] Started tracking step duration for analytics ID: ${analyticsId}`);
              }
            }
          }).catch(error => {
            if (this.config.debug) {
              console.warn(`[SableWalkthrough] Failed to log analytics for step ${this.currentStep}:`, error);
            }
          });
          
          // Process step immediately without waiting for analytics
          this.processStep(step, element);
        })
        .catch(error => {
          console.error('Error executing walkthrough step:', error);
          
          // Log analytics for step error
          logWalkthroughStepError(
            this.currentWalkthrough,
            this.currentStep,
            step.stepId,
            step.selector,
            this.currentInstanceId,
            {
              errorType: 'element_not_found',
              errorMessage: error.message,
              stepType: this._getStepType(step),
              timeout: step.timeout || 10000,
              continueOnError: step.continueOnError
            },
            this._calculateWalkthroughDuration()
          );
          
          // If configured to continue on error, go to next step
          if (step.continueOnError) {
            this.next();
          } else {
            // Otherwise end the walkthrough
            // Log analytics for walkthrough end due to error
            logWalkthroughEnd(
              this.currentWalkthrough,
              this.currentStep,
              step.stepId,
              this.currentInstanceId,
              {
                totalSteps: steps.length,
                stepsCompleted: this.currentStep,
                completionReason: 'error',
                errorType: 'element_not_found',
                errorMessage: error.message
              },
              this._calculateWalkthroughDuration()
            );
            this.end();
          }
        });
    } else {
      // Handle steps without selectors (e.g., modal dialogs)
      // Log analytics for step executed (no selector) (non-blocking)
      logWalkthroughStepExecuted(
        this.currentWalkthrough,
        this.currentStep,
        step.stepId,
        null,
        this.currentInstanceId,
        {
          stepType: this._getStepType(step),
          hasElement: false,
          totalSteps: steps.length
        },
        this._calculateWalkthroughDuration()
      ).then(analyticsId => {
        // Store tracking info for step duration
        if (analyticsId) {
          this.currentStepAnalyticsId = analyticsId;
          this.currentStepStartTime = Date.now();
          
          if (this.config.debug) {
            console.log(`[SableWalkthrough] Started tracking step duration for analytics ID: ${analyticsId}`);
          }
        }
      }).catch(error => {
        if (this.config.debug) {
          console.warn(`[SableWalkthrough] Failed to log analytics for step ${this.currentStep}:`, error);
        }
      });
      
      // Process step immediately without waiting for analytics
      this.processStep(step, null);
    }
  }
  
  /**
   * Process a walkthrough step
   * @param {Object} step - The step configuration
   * @param {Element} element - The target DOM element (if any)
   */
  processStep(step, element) {
    // Handle highlighting
    if (element && step.highlight) {
      this.activeElements.highlighted = element;
      // Pass the highlight options directly
      highlightElement(element, typeof step.highlight === 'object' ? step.highlight : {});
    }

    // Create overlay with spotlight around the highlighted element
    if (step.spotlight) {
      // Use spotlight effect with options directly from the spotlight object
      const spotlightOptions = typeof step.spotlight === 'object' ? step.spotlight : {};
      createSpotlight(element, {
        padding: spotlightOptions.padding || 5,
        opacity: spotlightOptions.opacity || 0.5,
        color: spotlightOptions.color || 'rgba(0, 0, 0, 0.5)',
        animationDuration: spotlightOptions.animationDuration || 300,
        offsetX: spotlightOptions.offsetX || 0,
        offsetY: spotlightOptions.offsetY || 0
      });
    }
    
    // Handle tooltips
    if (step.tooltip) {
      // Extract options directly from the tooltip object if it's an object
      const tooltipContent = typeof step.tooltip === 'object' ? step.tooltip : { content: step.tooltip };
      const tooltipOptions = {
        position: tooltipContent.position || 'bottom',
        onNext: this.next,
        onSkip: this.end,
        className: tooltipContent.className,
        showNavigation: tooltipContent.showNavigation,
        nextButtonText: tooltipContent.nextButtonText,
        prevButtonText: tooltipContent.prevButtonText
      };
      
      if (element) {
        showTooltip(element, tooltipContent, tooltipOptions);
      } else {
        // Show floating tooltip if no element
        showTooltip(null, tooltipContent, tooltipOptions);
      }
    }
    
    // Handle actions (clicks, inputs, etc.)
    if (element && step.action) {
      this.performAction(element, step.action);
    }
    
    // Handle automatic advancement
    if (step.autoAdvance) {
      setTimeout(() => {
        this.next();
      }, step.autoAdvanceDelay || 3000);
    }
    
    // Handle custom callback
    if (typeof step.callback === 'function') {
      step.callback(element, this);
    }
  }
  
  /**
   * Perform an action on an element
   * @param {Element} element - The DOM element to act on
   * @param {Object} action - The action configuration
   */
  performAction(element, action) {
    // Log analytics for action performed (non-blocking)
    const steps = this.walkthroughs[this.currentWalkthrough];
    const currentStep = steps[this.currentStep];
    logWalkthroughStepExecuted(
      this.currentWalkthrough,
      this.currentStep,
      currentStep.stepId,
      action.selector || null,
      this.currentInstanceId,
      {
        stepType: 'action',
        actionType: action.type,
        actionValue: action.value,
        actionDelay: action.delay,
        actionAutoAdvance: action.autoAdvance,
        actionTypeEffect: action.typeEffect,
        totalSteps: this.walkthroughs[this.currentWalkthrough].length
      },
      this._calculateWalkthroughDuration()
    ).catch(error => {
      if (this.config.debug) {
        console.warn(`[SableWalkthrough] Failed to log action analytics:`, error);
      }
    });
    
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
   * Clean up the current step (remove highlights, tooltips, etc.)
   */
  cleanupCurrentStep() {
    // Remove highlight
    if (this.activeElements.highlighted) {
      removeHighlight(this.activeElements.highlighted);
      this.activeElements.highlighted = null;
    }
    
    // Hide tooltip
    hideTooltip();
    
    // Remove any spotlights
    removeSpotlights();
  }
  
  /**
   * Get the type of step for analytics
   * @param {Object} step - The step configuration
   * @returns {string} The step type
   * @private
   */
  _getStepType(step) {
    if (step.highlight && step.tooltip) return 'highlight_tooltip';
    if (step.highlight) return 'highlight';
    if (step.tooltip) return 'tooltip';
    if (step.spotlight) return 'spotlight';
    if (step.action) return 'action';
    return 'custom';
  }
  
  /**
   * Clean up navigation event listeners
   */
  _cleanupNavigationHandling() {
    if (typeof this._cleanupFn === 'function') {
      this._cleanupFn();
    }
  }
  
  /**
   * End the current walkthrough
   */
  end() {
    if (!this.isRunning) return;
    
    if (this.config.debug) {
      console.log('[SableSmartLinks] Ending walkthrough');
    }
    
    // Get current step info before cleanup for analytics
    const steps = this.walkthroughs[this.currentWalkthrough];
    const currentStep = steps[this.currentStep];
    
    // Update step duration before ending
    this._updatePreviousStepDuration();
    
    // Log analytics for walkthrough end
    if (currentStep) {
      logWalkthroughEnd(
        this.currentWalkthrough,
        this.currentStep,
        currentStep.stepId,
        this.currentInstanceId,
        {
          totalSteps: steps.length,
          stepsCompleted: this.currentStep + 1,
          completionReason: 'user_finished'
        },
        this._calculateWalkthroughDuration()
      );
    }
    
    // Clean up current step
    this.cleanupCurrentStep();
    
    // Remove any spotlights
    removeSpotlights();
    
    // Hide end tour button
    if (this.endTourButton) {
      this.endTourButton.hide();
    }
    
    // Clear the saved state
    this._clearState();
    
    // Reset state
    this.currentWalkthrough = null;
    this.currentStep = 0;
    this.isRunning = false;
    
    // Reset instance tracking
    this.currentInstanceId = null;
    this.currentInstanceStartTime = null;
    
    // Clean up navigation handling
    this._cleanupNavigationHandling();
    
    // Trigger onComplete callback if available
    const walkthrough = this.walkthroughs[this.currentWalkthrough];
    if (walkthrough && walkthrough.onComplete && typeof walkthrough.onComplete === 'function') {
      walkthrough.onComplete();
    }
  }
  
  /**
   * Destroy the walkthrough engine and clean up resources
   */
  destroy() {
    // End any running walkthrough
    if (this.isRunning) {
      this.end();
    }
    
    // Destroy end tour button
    if (this.endTourButton) {
      this.endTourButton.destroy();
      this.endTourButton = null;
    }
    
    // Clear walkthroughs
    this.walkthroughs = {};
    
    // Reset step duration tracking
    this.currentStepAnalyticsId = null;
    this.currentStepStartTime = null;
    this.lastExecutedStepIndex = null;
    this.currentInstanceId = null;
    this.currentInstanceStartTime = null;
    
    // Clean up navigation handling
    this._cleanupNavigationHandling();
  }
}
