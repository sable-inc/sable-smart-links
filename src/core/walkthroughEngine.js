/**
 * Walkthrough Engine
 * Core functionality for managing and executing walkthroughs
 */

import { waitForElement } from './elementSelector.js';
import { highlightElement, removeHighlight } from '../ui/highlight.js';
import { showTooltip, hideTooltip } from '../ui/tooltip.js';
import { createSpotlight, removeSpotlights } from '../ui/spotlight.js';
import { isBrowser, safeWindow, safeDocument } from '../utils/browserAPI.js';

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
      console.log('[SableSmartLinks] Initializing with config:', this.config);
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
    
    // Bind methods to ensure correct 'this' context
    this.next = this.next.bind(this);
    this.end = this.end.bind(this);
    
    // Setup navigation handling
    if (isBrowser) {
      this._setupNavigationHandling();
    }
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
      
      // Log the loaded state (before any validation)
      if (this.config.debug) {
        console.log('[SableSmartLinks] Loaded state from localStorage:', state);
      }
      
      // Check for required fields
      if (!state.walkthroughId || state.currentStep === undefined) {
        if (this.config.debug) {
          console.log('[SableSmartLinks] Invalid state: missing required fields');
        }
        this._clearState();
        return null;
      }
      
      // Check for expiration (1 hour)
      const EXPIRATION_MS = 60 * 60 * 1000;
      if (state.timestamp && (Date.now() - state.timestamp > EXPIRATION_MS)) {
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
          age: state.timestamp ? `${((Date.now() - state.timestamp) / 1000).toFixed(1)}s ago` : 'unknown'
        });
      }
      
      return state;
    } catch (e) {
      console.error('[SableSmartLinks] Failed to load walkthrough state from localStorage:', e);
      return null;
    }
  }
  
  /**
   * Clear saved walkthrough state
   */
  _clearState() {
    if (!isBrowser) return;
    try {
      const hadState = !!localStorage.getItem('sableWalkthroughState');
      localStorage.removeItem('sableWalkthroughState');
      
      if (this.config.debug && hadState) {
        console.log('[SableSmartLinks] Cleared walkthrough state from localStorage');
      }
    } catch (e) {
      console.error('[SableSmartLinks] Failed to clear walkthrough state from localStorage:', e);
    }
  }
  
  /**
   * Set up navigation handling for page transitions
   */
  _setupNavigationHandling() {
    if (!isBrowser) return;
    
    // Handle beforeunload to save state
    const handleBeforeUnload = () => {
      if (this.isRunning) {
        if (this.config.debug) {
          console.log('[SableSmartLinks] Page unloading, saving state...');
        }
        this._saveState();
      }
    };
    
    // Handle popstate (back/forward navigation)
    const handlePopState = () => {
      if (this.isRunning) {
        if (this.config.debug) {
          console.log('[SableSmartLinks] Navigation detected (popstate), saving state...');
        }
        this._saveState();
        // Small delay to allow the page to start loading
        setTimeout(() => this._restoreWalkthrough(), 100);
      }
    };
    
    // Handle link clicks
    const handleLinkClick = (e) => {
      if (!this.isRunning) return;
      
      // Find the closest anchor tag
      let target = e.target;
      while (target && target.nodeName !== 'A') {
        if (target === safeDocument.documentElement) return;
        target = target.parentNode;
      }
      
      if (target && target.href) {
        if (this.config.debug) {
          console.log('[SableSmartLinks] Link click detected, saving state...');
        }
        this._saveState();
      }
    };
    
    // Store original history methods
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    // Override pushState
    history.pushState = function() {
      if (this.isRunning && this.config.debug) {
        console.log('[SableSmartLinks] pushState detected, saving state...');
      }
      const result = originalPushState.apply(history, arguments);
      if (this.isRunning) {
        this._saveState();
      }
      return result;
    }.bind(this);
    
    // Override replaceState
    history.replaceState = function() {
      if (this.isRunning && this.config.debug) {
        console.log('[SableSmartLinks] replaceState detected, saving state...');
      }
      const result = originalReplaceState.apply(history, arguments);
      if (this.isRunning) {
        this._saveState();
      }
      return result;
    }.bind(this);
    
    // Add event listeners
    safeWindow.addEventListener('beforeunload', handleBeforeUnload);
    safeWindow.addEventListener('popstate', handlePopState);
    safeDocument.addEventListener('click', handleLinkClick, true); // Use capture phase
    
    // Handle page load to restore state
    const handleLoad = async () => {
      if (this.config.debug) {
        console.log('[SableSmartLinks] Page loaded, attempting to restore state...');
      }
      // Wait for any pending state to be saved
      await new Promise(resolve => setTimeout(resolve, 50));
      await this._restoreWalkthrough();
    };
    
    // Use DOMContentLoaded instead of load for faster restoration
    if (safeDocument.readyState === 'complete' || safeDocument.readyState === 'interactive') {
      if (this.config.debug) {
        console.log('[SableSmartLinks] Document already loaded, restoring state immediately');
      }
      handleLoad();
    } else {
      if (this.config.debug) {
        console.log('[SableSmartLinks] Adding DOMContentLoaded listener for state restoration');
      }
      safeDocument.addEventListener('DOMContentLoaded', handleLoad);
      // Also listen for load as a fallback
      safeWindow.addEventListener('load', handleLoad);
    }
    
    // Store cleanup function
    this._cleanupFn = () => {
      if (this.config.debug) {
        console.log('[SableSmartLinks] Cleaning up navigation handlers');
      }
      safeWindow.removeEventListener('beforeunload', handleBeforeUnload);
      safeWindow.removeEventListener('popstate', handlePopState);
      safeDocument.removeEventListener('click', handleLinkClick, true);
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
      delete this._cleanupFn; // Clean up the cleanup function itself
    };
  }
  
  /**
   * Restore walkthrough from saved state
   */
  async _restoreWalkthrough() {
    if (this.config.debug) {
      console.log('[SableSmartLinks] Attempting to restore walkthrough state...');
    }
    
    const state = this._loadState();
    if (!state || !state.walkthroughId) {
      if (this.config.debug) {
        console.log('[SableSmartLinks] No valid walkthrough state to restore');
      }
      return false;
    }
    
    // Wait a small delay to ensure the page is fully rendered
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Restore the walkthrough state
    this.currentWalkthrough = state.walkthroughId;
    this.currentStep = state.currentStep || 0;
    this.isRunning = state.isRunning !== false; // Default to true if not set
    
    if (this.config.debug) {
      console.log(`[SableSmartLinks] Restored walkthrough state:`, {
        walkthroughId: this.currentWalkthrough,
        currentStep: this.currentStep,
        isRunning: this.isRunning
      });
    }
    
    // If we're not on the first step, advance to the saved step
    if (state.currentStep > 0) {
      this.currentStep = -1; // Reset to before first step
      for (let i = 0; i <= state.currentStep; i++) {
        this.next();
      }
    } else {
      // Otherwise just start normally
      this.executeStep();
    }
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
    
    // Clean up current step
    this.cleanupCurrentStep();
    
    // Move to next step
    this.currentStep++;
    
    // Check if we've reached the end of the walkthrough
    if (this.currentStep >= this.walkthroughs[this.currentWalkthrough].length) {
      this.end();
      return;
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
    
    // Wait for element to be available in the DOM
    if (step.selector) {
      waitForElement(step.selector, { 
        timeout: step.timeout || 10000 
      })
        .then(element => {
          this.processStep(step, element);
        })
        .catch(error => {
          console.error('Error executing walkthrough step:', error);
          
          // If configured to continue on error, go to next step
          if (step.continueOnError) {
            this.next();
          } else {
            // Otherwise end the walkthrough
            this.end();
          }
        });
    } else {
      // Handle steps without selectors (e.g., modal dialogs)
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
      highlightElement(element, step.highlightOptions);
    }

    // Create overlay with spotlight around the highlighted element
    if (step.spotlight) {
      // Use spotlight effect
      createSpotlight(element, {
        padding: step.spotlightPadding || 5,
        opacity: step.overlayOpacity || 0.5,
        animate: step.spotlightAnimate !== false
      });
    }
    
    // Handle tooltips
    if (step.tooltip) {
      const tooltipOptions = {
        position: step.position || 'bottom',
        onNext: this.next,
        onSkip: this.end,
        ...step.tooltipOptions
      };
      
      if (element) {
        showTooltip(element, step.tooltip, tooltipOptions);
      } else {
        // Show floating tooltip if no element
        showTooltip(null, step.tooltip, tooltipOptions);
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
    
    // Clean up current step
    this.cleanupCurrentStep();
    
    // Remove any spotlights
    removeSpotlights();
    
    // Clear the saved state
    this._clearState();
    
    // Reset state
    this.currentWalkthrough = null;
    this.currentStep = 0;
    this.isRunning = false;
    
    // Clean up navigation handling
    this._cleanupNavigationHandling();
    
    // Trigger onComplete callback if available
    const walkthrough = this.walkthroughs[this.currentWalkthrough];
    if (walkthrough && walkthrough.onComplete && typeof walkthrough.onComplete === 'function') {
      walkthrough.onComplete();
    }
  }
}
