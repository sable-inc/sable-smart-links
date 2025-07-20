/**
 * ElementInteractor - Utility class for common DOM element interactions
 * Used by sable-smart-links for walkthrough automation
 */

export interface ScrollIntoViewOptions {
  behavior?: ScrollBehavior;
  block?: ScrollLogicalPosition;
  inline?: ScrollLogicalPosition;
}

export class ElementInteractor {
  /**
   * Sets the value of an input or textarea element and triggers appropriate events
   * @param element - The input or textarea element to set value for
   * @param value - The value to set
   */
  static setInputValue(element: HTMLInputElement | HTMLTextAreaElement, value: string): void {
    // Focus the element first
    element.focus();
    
    // Use React's native setter for more reliable state updates
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      element instanceof HTMLTextAreaElement ? 
        window.HTMLTextAreaElement.prototype : 
        window.HTMLInputElement.prototype, 
      'value'
    )?.set;
    
    if (nativeInputValueSetter) {
      // Set value using React's native setter
      nativeInputValueSetter.call(element, value);
      
      // Dispatch input event to trigger React re-render
      element.dispatchEvent(new Event('input', { bubbles: true }));
      
      // Final change event
      element.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      // Fallback to regular method
      element.value = value;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  /**
   * Clicks an element with optional delay
   * @param element - The element to click
   * @param delay - Optional delay before clicking (in milliseconds)
   */
  static async clickElement(element: Element, delay: number = 0): Promise<void> {
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    if (element instanceof HTMLElement) {
      element.click();
    } else {
      // For non-HTML elements, dispatch a click event
      element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
  }

  /**
   * Scrolls an element into view with specified options
   * @param element - The element to scroll into view
   * @param options - Scroll options
   */
  static async scrollIntoView(element: Element, options: ScrollIntoViewOptions = {}): Promise<void> {
    const defaultOptions: ScrollIntoViewOptions = {
      behavior: 'smooth',
      block: 'center',
      inline: 'nearest',
      ...options
    };

    element.scrollIntoView(defaultOptions);
    
    // Wait a bit for the scroll to complete
    await new Promise(resolve => setTimeout(resolve, 400));
  }

  /**
   * Waits for an element to appear in the DOM
   * @param selector - CSS selector or XPath to find the element
   * @param timeout - Maximum time to wait (in milliseconds)
   * @returns Promise that resolves with the found element
   */
  static async waitForElement(selector: string, timeout: number = 5000): Promise<Element> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkElement = () => {
        let element: Element | null = null;
        
        // Check if it's an XPath selector
        if (selector.startsWith('//') || selector.startsWith('./')) {
          const result = document.evaluate(
            selector,
            document,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null
          );
          element = result.singleNodeValue as Element;
        } else {
          // CSS selector
          element = document.querySelector(selector);
        }
        
        if (element) {
          resolve(element);
          return;
        }
        
        // Check timeout
        if (Date.now() - startTime > timeout) {
          reject(new Error(`Element with selector "${selector}" not found within ${timeout}ms`));
          return;
        }
        
        // Continue checking
        requestAnimationFrame(checkElement);
      };
      
      checkElement();
    });
  }

  /**
   * Checks if an element is currently visible in the viewport
   * @param element - The element to check
   * @returns True if the element is in viewport, false otherwise
   */
  static isElementInViewport(element: Element): boolean {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }

  /**
   * Gets an element by selector with support for both CSS and XPath
   * @param selector - CSS selector or XPath
   * @returns The found element or null
   */
  static getElement(selector: string): Element | null {
    if (selector.startsWith('//') || selector.startsWith('./')) {
      // XPath selector
      const result = document.evaluate(
        selector,
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      );
      return result.singleNodeValue as Element;
    } else {
      // CSS selector
      return document.querySelector(selector);
    }
  }

  /**
   * Gets multiple elements by selector with support for both CSS and XPath
   * @param selector - CSS selector or XPath
   * @returns Array of found elements
   */
  static getElements(selector: string): Element[] {
    if (selector.startsWith('//') || selector.startsWith('./')) {
      // XPath selector
      const result = document.evaluate(
        selector,
        document,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null
      );
      
      const elements: Element[] = [];
      for (let i = 0; i < result.snapshotLength; i++) {
        const node = result.snapshotItem(i);
        if (node) {
          elements.push(node as Element);
        }
      }
      return elements;
    } else {
      // CSS selector
      return Array.from(document.querySelectorAll(selector));
    }
  }

  /**
   * Checks if an element exists in the DOM
   * @param selector - CSS selector or XPath
   * @returns True if element exists, false otherwise
   */
  static elementExists(selector: string): boolean {
    return this.getElement(selector) !== null;
  }

  /**
   * Gets the computed style of an element
   * @param element - The element to get styles for
   * @param property - The CSS property to get (optional, returns all if not specified)
   * @returns The computed style value or all computed styles
   */
  static getComputedStyle(element: Element, property?: string): string | CSSStyleDeclaration {
    const styles = window.getComputedStyle(element);
    return property ? styles.getPropertyValue(property) : styles;
  }

  /**
   * Checks if an element is visible (not hidden by CSS)
   * @param element - The element to check
   * @returns True if element is visible, false otherwise
   */
  static isElementVisible(element: Element): boolean {
    const styles = window.getComputedStyle(element);
    const htmlElement = element as HTMLElement;
    return styles.display !== 'none' && 
           styles.visibility !== 'hidden' && 
           styles.opacity !== '0' &&
           htmlElement.offsetWidth > 0 && 
           htmlElement.offsetHeight > 0;
  }

  /**
   * Highlights an element with prominent visual effects
   * @param element - The element to highlight
   * @returns Object containing original style and style tag for later restoration
   */
  static highlightElement(element: Element): { originalStyle: string, styleTag: HTMLStyleElement } {
    const originalStyle = element.getAttribute('style') || '';
    
    // Use a darker grey for the outline and box-shadow
    const highlightStyle = `
      ${originalStyle}; 
      outline: 2.5px solid #4A5568; 
      border-radius: 12px;
      box-shadow: 0 0 20px 4px rgba(74, 85, 104, 0.6); 
      transition: all 0.5s ease-in-out; 
      animation: pulse-border 1.2s infinite alternate;
    `;
    
    // Add a CSS animation for a more prominent pulsing effect
    const styleTag = document.createElement('style');
    styleTag.textContent = `
      @keyframes pulse-border {
        0% { box-shadow: 0 0 12px 2px rgba(74, 85, 104, 0.5); outline-color: #4A5568; }
        100% { box-shadow: 0 0 28px 6px rgba(74, 85, 104, 0.8); outline-color: #2D3748; }
      }
    `;
    document.head.appendChild(styleTag);
    
    // Apply the enhanced highlight style
    element.setAttribute('style', highlightStyle);
    
    // Store both the original style and the created style element for later removal
    return { originalStyle, styleTag };
  }

  /**
   * Restores original element style and cleans up highlight effects
   * @param element - The element to restore
   * @param styleInfo - Object containing original style and style tag from highlightElement
   */
  static restoreElementStyle(element: Element, styleInfo: { originalStyle: string, styleTag: HTMLStyleElement }): void {
    // Restore the original style
    element.setAttribute('style', styleInfo.originalStyle);

    // Remove the animation style tag if it exists
    if (styleInfo.styleTag && document.head.contains(styleInfo.styleTag)) {
      document.head.removeChild(styleInfo.styleTag);
    }
  }

  /**
   * Restarts an agent by removing its auto-started flag from localStorage and actively starting the agent
   * @param agentId - The ID of the agent to restart
   * @param stepId - Optional step ID to start the agent from
   * @param skipTrigger - Optional flag to skip trigger checks and show the popup immediately
   */
  static restartAgent(agentId: string, stepId?: string, skipTrigger: boolean = false): void {
    // Remove the localStorage key to reset the auto-started state
    const key = `SableTextAgentEngine_autoStartedOnce_${agentId}`;
    localStorage.removeItem(key);
    
    // Dispatch the sable:textAgentRestart event to trigger the restart
    const restartEvent = new CustomEvent('sable:textAgentRestart', {
      detail: { 
        stepId: stepId || null, 
        skipTrigger: skipTrigger,
        agentId: agentId // Include agentId in case it's needed
      }
    });
    
    // Dispatch the event on the window object
    if (typeof window !== 'undefined') {
      window.dispatchEvent(restartEvent);
    } else {
      console.warn('[ElementInteractor] Window object not available. Only localStorage key was removed.');
    }
  }
}

// Export individual functions for convenience
export const setInputValue = ElementInteractor.setInputValue.bind(ElementInteractor);
export const clickElement = ElementInteractor.clickElement.bind(ElementInteractor);
export const scrollIntoView = ElementInteractor.scrollIntoView.bind(ElementInteractor);
export const waitForElement = ElementInteractor.waitForElement.bind(ElementInteractor);
export const isElementInViewport = ElementInteractor.isElementInViewport.bind(ElementInteractor);
export const getElement = ElementInteractor.getElement.bind(ElementInteractor);
export const getElements = ElementInteractor.getElements.bind(ElementInteractor);
export const elementExists = ElementInteractor.elementExists.bind(ElementInteractor);
export const getComputedStyle = ElementInteractor.getComputedStyle.bind(ElementInteractor);
export const isElementVisible = ElementInteractor.isElementVisible.bind(ElementInteractor);
export const highlightElement = ElementInteractor.highlightElement.bind(ElementInteractor);
export const restoreElementStyle = ElementInteractor.restoreElementStyle.bind(ElementInteractor);
export const restartAgent = ElementInteractor.restartAgent.bind(ElementInteractor);

export default ElementInteractor; 