/**
 * Walkthrough Engine
 * Core functionality for managing and executing walkthroughs
 */

import { waitForElement } from './elementSelector.js';
import { highlightElement, removeHighlight } from '../ui/highlight.js';
import { showTooltip, hideTooltip } from '../ui/tooltip.js';
import { createSpotlight, removeSpotlights } from '../ui/spotlight.js';

export class WalkthroughEngine {
  /**
   * Create a new WalkthroughEngine
   * @param {Object} config - Configuration options
   */
  constructor(config) {
    this.config = config;
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
    
    // Listen for navigation events to potentially end walkthroughs
    window.addEventListener('popstate', () => {
      if (this.isRunning) {
        this.end();
      }
    });
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
   * End the current walkthrough
   */
  end() {
    if (!this.isRunning) return;
    
    // Clean up current step
    this.cleanupCurrentStep();
    
    // Remove overlay
    removeOverlay();
    
    // Remove any spotlights
    removeSpotlights();
    
    // Reset state
    this.currentWalkthrough = null;
    this.currentStep = 0;
    this.isRunning = false;
    
    // Trigger onComplete callback if available
    const walkthrough = this.walkthroughs[this.currentWalkthrough];
    if (walkthrough && walkthrough.onComplete && typeof walkthrough.onComplete === 'function') {
      walkthrough.onComplete();
    }
  }
}
