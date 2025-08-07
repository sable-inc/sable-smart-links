/**
 * Trigger Manager
 * Handles step triggers (typing, button presses, etc.)
 */

import { addEvent, debounce } from '../../utils/events.js';

export class TriggerManager {
  constructor(config = {}) {
    this.config = config;
  }

  /**
   * Set up trigger for a step
   */
  setupTrigger(agentId, step, onTrigger, isAutoStart = false) {
    if (step.triggerOnTyping) {
      return this._setupTypingTrigger(agentId, step, onTrigger, isAutoStart);
    } else if (step.triggerOnButtonPress) {
      return this._setupButtonTrigger(agentId, step, onTrigger, isAutoStart);
    } else {
      // No trigger, show immediately
      setTimeout(() => onTrigger(), 100);
      return null;
    }
  }

  /**
   * Set up typing trigger
   */
  _setupTypingTrigger(agentId, step, onTrigger, isAutoStart = false) {
    const { selector, on = 'start', stopDelay = 1000 } = step.triggerOnTyping;

    const checkAndSetup = () => {
      const input = this._findElement(selector);
      if (!input) {
        setTimeout(checkAndSetup, 500);
        return;
      }

      let hasStarted = false;
      let cleanup = null;

      const showStep = async () => {
        if (cleanup) cleanup();
        await onTrigger();
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

      return cleanup;
    };

    return checkAndSetup();
  }

  /**
   * Set up button trigger
   */
  _setupButtonTrigger(agentId, step, onTrigger, isAutoStart = false) {
    const { selector, event = 'click', delay = 0 } = step.triggerOnButtonPress;

    const checkAndSetup = () => {
      const elements = document.querySelectorAll(selector);
      if (elements.length === 0) {
        setTimeout(checkAndSetup, 500);
        return;
      }

      const showStep = async () => {
        // Remove event listeners
        elements.forEach(el => el.removeEventListener(event, handler));

        if (delay > 0) {
          setTimeout(async () => await onTrigger(), delay);
        } else {
          await onTrigger();
        }
      };

      const handler = showStep;

      // Add event listeners
      elements.forEach(el => el.addEventListener(event, handler));

      // Return cleanup function
      return () => {
        elements.forEach(el => el.removeEventListener(event, handler));
      };
    };

    return checkAndSetup();
  }

  /**
   * Find element by selector (supports CSS and XPath)
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
   * Clean up trigger
   */
  cleanupTrigger(cleanup) {
    if (cleanup && typeof cleanup === 'function') {
      cleanup();
    }
  }
}
