/**
 * DOM manipulation utilities
 */

/**
 * Create an HTML element with attributes and content
 * @param {string} tagName - The HTML tag name
 * @param {Object} attributes - Element attributes
 * @param {string|HTMLElement|Array} content - Element content
 * @returns {HTMLElement} The created element
 */
export function createElement(tagName, attributes = {}, content = '') {
  const element = document.createElement(tagName);
  
  // Set attributes
  Object.entries(attributes).forEach(([key, value]) => {
    if (key === 'className') {
      element.className = value;
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign(element.style, value);
    } else {
      element.setAttribute(key, value);
    }
  });
  
  // Set content
  if (content) {
    if (typeof content === 'string') {
      element.innerHTML = content;
    } else if (content instanceof HTMLElement) {
      element.appendChild(content);
    } else if (Array.isArray(content)) {
      content.forEach(item => {
        if (typeof item === 'string') {
          element.innerHTML += item;
        } else if (item instanceof HTMLElement) {
          element.appendChild(item);
        }
      });
    }
  }
  
  return element;
}

/**
 * Get computed style value for an element
 * @param {HTMLElement} element - The element to get style for
 * @param {string} property - The CSS property name
 * @returns {string} The computed style value
 */
export function getStyle(element, property) {
  return window.getComputedStyle(element).getPropertyValue(property);
}

/**
 * Check if an element has a specific class
 * @param {HTMLElement} element - The element to check
 * @param {string} className - The class name to check for
 * @returns {boolean} Whether the element has the class
 */
export function hasClass(element, className) {
  return element.classList.contains(className);
}

/**
 * Add a class to an element
 * @param {HTMLElement} element - The element to modify
 * @param {string} className - The class name to add
 */
export function addClass(element, className) {
  element.classList.add(className);
}

/**
 * Remove a class from an element
 * @param {HTMLElement} element - The element to modify
 * @param {string} className - The class name to remove
 */
export function removeClass(element, className) {
  element.classList.remove(className);
}

/**
 * Toggle a class on an element
 * @param {HTMLElement} element - The element to modify
 * @param {string} className - The class name to toggle
 * @param {boolean} [force] - Force add or remove
 */
export function toggleClass(element, className, force) {
  element.classList.toggle(className, force);
}

/**
 * Get the closest parent element matching a selector
 * @param {HTMLElement} element - The starting element
 * @param {string} selector - The CSS selector to match
 * @returns {HTMLElement|null} The matching parent or null
 */
export function closest(element, selector) {
  // Use native closest if available
  if (element.closest) {
    return element.closest(selector);
  }
  
  // Fallback implementation
  let current = element;
  while (current && current !== document) {
    if (current.matches(selector)) {
      return current;
    }
    current = current.parentElement;
  }
  
  return null;
}
