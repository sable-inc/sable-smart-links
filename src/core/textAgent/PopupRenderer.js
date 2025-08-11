/**
 * Popup Renderer
 * Handles popup creation, positioning, and rendering
 */

import { safeDocument } from '../../utils/browserAPI.js';
import { waitForElement } from '../../utils/elementSelector.js';
import globalPopupManager from '../../ui/GlobalPopupManager.js';

export class PopupRenderer {
  constructor(config = {}) {
    this.config = config;
  }

  /**
   * Render popup for a step
   */
  async renderStep(agentId, step, agentInfo) {

    // Check conditional rendering
    if (typeof step.showIf === 'function' && !step.showIf()) {
      return { shouldAdvance: true };
    }

    // Handle target element
    const targetElement = await this._handleTargetElement(step);

    // Create popup
    const popupManager = this._createPopupForStep(agentId, step, targetElement, agentInfo);

    // Handle auto-actions
    setTimeout(() => {
      this._performStepActions(step, targetElement, agentId);
    }, this.config.stepDelay || 500);

    return {
      shouldAdvance: false,
      popupManager,
      targetElement
    };
  }

  /**
   * Handle target element selection
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
      return null;
    }
  }

  /**
   * Create popup for step
   */
  _createPopupForStep(agentId, step, targetElement, agentInfo) {
    // Get text content
    const text = typeof step.text === 'function' ? step.text() : step.text;
    const secondaryText = typeof step.secondaryText === 'function' ? step.secondaryText() : step.secondaryText;
    const sections = typeof step.sections === 'function' ? step.sections() : step.sections;

    // Create popup options
    const popupOptions = {
      text,
      secondaryText,
      boxWidth: step.boxWidth || this.config.defaultBoxWidth || 300,
      buttonType: step.buttonType || 'arrow',
      primaryColor: step.primaryColor || this.config.primaryColor || '#FFFFFF',
      sections,
      fontSize: step.fontSize || '15px',
      parent: safeDocument?.body || document.body,
      agentInfo,
      pulse: step.pulse || false
    };

    // Set up callbacks
    if (step.buttonType === 'yes-no') {
      popupOptions.onYesNo = async (isYes) => {
        if (typeof step.onYesNo === 'function') {
          await step.onYesNo(isYes);
        }
        if (step.autoAdvance) {
          setTimeout(() => this._onStepComplete(agentId), step.autoAdvanceDelay || 1000);
        }
      };
    } else {
      popupOptions.onProceed = async (textInput) => {
        if (typeof step.onProceed === 'function') {
          await step.onProceed(textInput);
        }
        if (step.autoAdvance) {
          setTimeout(() => this._onStepComplete(agentId), step.autoAdvanceDelay || 1000);
        }
      };
    }

    // Add onClose callback to end the agent
    popupOptions.onClose = () => {
      if (this.onAgentEnd) {
        this.onAgentEnd(agentId);
      }
    };

    // Create and mount popup through GlobalPopupManager
    const popupManager = globalPopupManager.showPopup(popupOptions);

    if (popupManager) {
      // Position popup if target element specified
      if (targetElement && step.targetElement?.position) {
        this._positionPopup(popupManager, targetElement, step.targetElement.position);
      }
    }

    // Execute callback if provided
    if (typeof step.callback === 'function') {
      step.callback(targetElement);
    }

    return popupManager;
  }

  /**
   * Position popup relative to target element
   */
  _positionPopup(popupManager, targetElement, position) {
    if (!popupManager.container) {
      return;
    }

    const elementRect = targetElement.getBoundingClientRect();
    const popupRect = popupManager.container.getBoundingClientRect();
    const margin = 10;

    let newPosition = {};

    switch (position) {
      case 'top':
        newPosition = {
          top: elementRect.top - popupRect.height - margin,
          left: elementRect.left + (elementRect.width / 2) - (popupRect.width / 2)
        };
        break;
      case 'right':
        newPosition = {
          top: elementRect.top + (elementRect.height / 2) - (popupRect.height / 2),
          left: elementRect.right + margin
        };
        break;
      case 'bottom':
        newPosition = {
          top: elementRect.bottom + margin,
          left: elementRect.left + (elementRect.width / 2) - (popupRect.width / 2)
        };
        break;
      case 'left':
        newPosition = {
          top: elementRect.top + (elementRect.height / 2) - (popupRect.height / 2),
          left: elementRect.left - popupRect.width - margin
        };
        break;
      default:
        newPosition = {
          top: elementRect.top + (elementRect.height / 2) - (popupRect.height / 2),
          left: elementRect.left + (elementRect.width / 2) - (popupRect.width / 2)
        };
    }

    popupManager.updatePosition(newPosition);
  }

  /**
   * Perform step actions
   */
  _performStepActions(step, element, agentId) {
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
            this._typeText(element, value, typeDelay, autoAdvance, agentId);
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
            step.action.handler(element);
          }
          break;
      }

      if (autoAdvance && type !== 'input') {
        setTimeout(() => this._onStepComplete(agentId), delay || 1000);
      }
    };

    setTimeout(executeAction, delay);
  }

  /**
   * Type text character by character
   */
  _typeText(element, text, charDelay, autoAdvance, agentId) {
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
        setTimeout(() => this._onStepComplete(agentId), 1000);
      }
    };

    typeNextChar();
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
   * Callback for step completion
   */
  _onStepComplete(agentId) {
    // This will be overridden by the main engine
    if (this.onStepComplete) {
      this.onStepComplete(agentId);
    }
  }
}
