/**
 * Event handling utilities
 */

/**
 * Add an event listener with automatic cleanup
 * @param {HTMLElement|Window|Document} target - The element to attach the listener to
 * @param {string} eventType - The event type to listen for
 * @param {Function} handler - The event handler function
 * @param {Object} [options] - Event listener options
 * @returns {Function} A function to remove the event listener
 */
export function addEvent(target, eventType, handler, options = {}) {
  if (!target || !eventType || typeof handler !== 'function') {
    return () => { };
  }

  target.addEventListener(eventType, handler, options);

  return () => {
    target.removeEventListener(eventType, handler, options);
  };
}

/**
 * Add multiple event listeners with a single handler
 * @param {HTMLElement|Window|Document} target - The element to attach listeners to
 * @param {string[]} eventTypes - Array of event types to listen for
 * @param {Function} handler - The event handler function
 * @param {Object} [options] - Event listener options
 * @returns {Function} A function to remove all event listeners
 */
export function addEvents(target, eventTypes, handler, options = {}) {
  if (!target || !Array.isArray(eventTypes) || typeof handler !== 'function') {
    return () => { };
  }

  const removers = eventTypes.map(type => addEvent(target, type, handler, options));

  return () => {
    removers.forEach(remove => remove());
  };
}

/**
 * Create a debounced version of a function
 * @param {Function} func - The function to debounce
 * @param {number} wait - The debounce wait time in milliseconds
 * @returns {Function} The debounced function
 */
export function debounce(func, wait = 100) {
  let timeout;

  return function (...args) {
    const context = this;

    clearTimeout(timeout);

    timeout = setTimeout(() => {
      func.apply(context, args);
    }, wait);
  };
}

/**
 * Create a throttled version of a function
 * @param {Function} func - The function to throttle
 * @param {number} limit - The throttle limit in milliseconds
 * @returns {Function} The throttled function
 */
export function throttle(func, limit = 100) {
  let inThrottle;

  return function (...args) {
    const context = this;

    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;

      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Trigger a custom event on an element
 * @param {HTMLElement} target - The element to trigger the event on
 * @param {string} eventName - The name of the event
 * @param {Object} [detail] - Additional data to pass with the event
 * @returns {boolean} Whether the event was cancelled
 */
export function triggerEvent(target, eventName, detail = {}) {
  if (!target || !eventName) {
    return false;
  }

  const event = new CustomEvent(eventName, {
    bubbles: true,
    cancelable: true,
    detail
  });

  return target.dispatchEvent(event);
}
