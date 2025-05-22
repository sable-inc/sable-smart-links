/**
 * Element selection utilities
 */

import { isBrowser, safeDocument } from '../utils/browserAPI.js';

/**
 * Find an element in the DOM using various selector types
 * @param {string|Object} selector - CSS selector, XPath, or element object
 * @returns {Element|null} The found element or null if not found
 */
export function findElement(selector) {
  // If selector is already an element, return it
  if (selector instanceof Element) {
    return selector;
  }
  
  // If not in browser environment, return null
  if (!isBrowser) {
    return null;
  }
  
  // If selector is a string, try different selection methods
  if (typeof selector === 'string') {
    // Try as CSS selector first
    try {
      const element = safeDocument.querySelector(selector);
      if (element) {
        return element;
      }
    } catch (e) {
      // Invalid CSS selector, continue to other methods
    }
    
    // Try as XPath if it starts with //
    if (selector.startsWith('//') || selector.startsWith('(//')) {
      try {
        const result = document.evaluate(
          selector,
          safeDocument.documentElement,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        );
        if (result.singleNodeValue) {
          return result.singleNodeValue;
        }
      } catch (e) {
        // Invalid XPath, continue to other methods
      }
    }
    
    // Try as ID (without the # prefix)
    if (!selector.includes(' ') && !selector.startsWith('#')) {
      const element = safeDocument.getElementById(selector);
      if (element) {
        return element;
      }
    }
  }
  
  // If selector is an object with a custom finder function
  if (typeof selector === 'object' && typeof selector.find === 'function') {
    return selector.find();
  }
  
  // Element not found
  return null;
}

/**
 * Wait for an element to appear in the DOM
 * @param {string|Object} selector - CSS selector, XPath, or element object
 * @param {Object} options - Options for waiting
 * @param {number} [options.timeout=10000] - Maximum time to wait in milliseconds
 * @param {number} [options.interval=100] - Check interval in milliseconds
 * @returns {Promise<Element>} Promise resolving to the found element
 */
export function waitForElement(selector, options = {}) {
  const { timeout = 10000, interval = 100 } = options;
  
  return new Promise((resolve, reject) => {
    // First try to find the element immediately
    const element = findElement(selector);
    if (element) {
      resolve(element);
      return;
    }
    
    const startTime = Date.now();
    
    // Set up an interval to check for the element
    const checkInterval = setInterval(() => {
      const element = findElement(selector);
      
      if (element) {
        clearInterval(checkInterval);
        resolve(element);
      } else if (Date.now() - startTime > timeout) {
        clearInterval(checkInterval);
        reject(new Error(`Element "${selector}" not found after ${timeout}ms`));
      }
    }, interval);
  });
}

/**
 * Find multiple elements in the DOM
 * @param {string} selector - CSS selector
 * @returns {Array<Element>} Array of found elements
 */
export function findElements(selector) {
  try {
    if (!isBrowser) return [];
    return Array.from(safeDocument.querySelectorAll(selector));
  } catch (e) {
    return [];
  }
}
