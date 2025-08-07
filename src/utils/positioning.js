/**
 * Unified positioning utilities for UI elements
 * This ensures consistent positioning calculations across different UI components
 */

import { isBrowser, safeWindow, safeDocument } from './browserAPI.js';

// Track delayed positioning tasks
const delayedPositioningTasks = new Map();

// Store references to active mutation observers
const activeObservers = new Map();

/**
 * Get element position and dimensions with scroll offset and optional manual offsets
 * @param {Element} element - DOM element to get position for
 * @param {number} padding - Optional padding to add around the element
 * @param {Object} options - Additional positioning options
 * @param {number} options.offsetX - Horizontal offset in pixels (positive = right, negative = left)
 * @param {number} options.offsetY - Vertical offset in pixels (positive = down, negative = up)
 * @returns {Object} Position and dimension information
 */
export function getElementPosition(element, padding = 0, options = {}) {
  if (!element || !isBrowser) return null;

  const rect = element.getBoundingClientRect();
  const { left: scrollLeft, top: scrollTop } = safeWindow.getScrollPosition();
  const offsetX = options.offsetX || 0;
  const offsetY = options.offsetY || 0;

  return {
    left: rect.left + scrollLeft - padding + offsetX,
    top: rect.top + scrollTop - padding + offsetY,
    width: rect.width + (padding * 2),
    height: rect.height + (padding * 2),
    right: rect.right + scrollLeft + padding + offsetX,
    bottom: rect.bottom + scrollTop + padding + offsetY,
    centerX: rect.left + scrollLeft + rect.width / 2 + offsetX,
    centerY: rect.top + scrollTop + rect.height / 2 + offsetY
  };
}

/**
 * Check if an element is in the viewport
 * @param {Element} element - DOM element to check
 * @returns {boolean} Whether the element is in the viewport
 */
export function isElementInViewport(element) {
  if (!element || !isBrowser) return false;

  const rect = element.getBoundingClientRect();
  const { width: viewportWidth, height: viewportHeight } = safeWindow.getViewportDimensions();

  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= viewportHeight &&
    rect.right <= viewportWidth
  );
}

/**
 * Create a mutation observer to watch for layout changes and update UI element positions
 * @param {Element} targetElement - Element to observe for position changes
 * @param {Element} uiElement - UI element to reposition
 * @param {Function} updatePositionFn - Function to update the position
 * @returns {string} Observer ID for later removal
 */
/**
 * Apply positioning with a small delay to ensure the page has fully rendered
 * @param {Element} targetElement - Element to position relative to
 * @param {Element} uiElement - UI element to position
 * @param {Function} updatePositionFn - Function to update the position
 * @param {number} delay - Delay in milliseconds before applying position
 * @returns {string} Task ID for cancellation
 */
export function applyPositionWithDelay(targetElement, uiElement, updatePositionFn, delay = 50) {
  if (!targetElement || !uiElement || !isBrowser) {
    return null;
  }

  // Generate a unique ID for this task
  const taskId = `task_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

  // Apply initial positioning immediately
  if (typeof updatePositionFn === 'function') {
    updatePositionFn(targetElement, uiElement);
  }

  // Schedule a delayed positioning to ensure accuracy after rendering
  const timeoutId = setTimeout(() => {
    if (typeof updatePositionFn === 'function') {
      updatePositionFn(targetElement, uiElement);

      // Remove from tracking map once executed
      delayedPositioningTasks.delete(taskId);
    }
  }, delay);

  // Store the timeout ID for potential cancellation
  delayedPositioningTasks.set(taskId, timeoutId);

  return taskId;
}

export function createPositionObserver(targetElement, uiElement, updatePositionFn) {
  if (!targetElement || !uiElement || !isBrowser || !window.MutationObserver) {
    return null;
  }

  // Generate a unique ID for this observer
  const observerId = `obs_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

  // Create a mutation observer to watch for layout changes
  const observer = new MutationObserver((mutations) => {
    // Check if we need to update position
    let needsUpdate = false;

    for (const mutation of mutations) {
      // If attributes changed or DOM structure changed, we might need to update
      if (
        mutation.type === 'attributes' ||
        mutation.type === 'childList' ||
        mutation.target === targetElement ||
        targetElement.contains(mutation.target)
      ) {
        needsUpdate = true;
        break;
      }
    }

    if (needsUpdate && typeof updatePositionFn === 'function') {
      // Use requestAnimationFrame to ensure we update in the next paint cycle
      window.requestAnimationFrame(() => {
        updatePositionFn(targetElement, uiElement);
      });
    }
  });

  // Start observing the document body for DOM changes
  observer.observe(safeDocument.body, {
    attributes: true,
    childList: true,
    subtree: true,
    characterData: true
  });

  // Also observe the target element specifically
  if (targetElement.parentNode) {
    observer.observe(targetElement.parentNode, {
      attributes: true,
      childList: true
    });
  }

  // Apply delayed positioning to ensure accuracy after rendering
  applyPositionWithDelay(targetElement, uiElement, updatePositionFn, 50);

  // Store the observer for later cleanup
  activeObservers.set(observerId, observer);

  // Add resize and scroll listeners for responsive repositioning
  const handleViewportChange = () => {
    if (typeof updatePositionFn === 'function') {
      updatePositionFn(targetElement, uiElement);
    }
  };

  safeWindow.addEventListener('resize', handleViewportChange);
  safeWindow.addEventListener('scroll', handleViewportChange);

  // Store event listeners for cleanup
  activeObservers.set(`${observerId}_events`, {
    resize: handleViewportChange,
    scroll: handleViewportChange
  });

  return observerId;
}

/**
 * Remove a position observer
 * @param {string} observerId - ID of the observer to remove
 */
export function removePositionObserver(observerId) {
  if (!observerId || !isBrowser) return;

  // Disconnect the mutation observer
  const observer = activeObservers.get(observerId);
  if (observer) {
    observer.disconnect();
    activeObservers.delete(observerId);
  }

  // Remove event listeners
  const events = activeObservers.get(`${observerId}_events`);
  if (events) {
    safeWindow.removeEventListener('resize', events.resize);
    safeWindow.removeEventListener('scroll', events.scroll);
    activeObservers.delete(`${observerId}_events`);
  }
}

/**
 * Clean up all active position observers
 */
export function cleanupAllPositionObservers() {
  if (!isBrowser) return;

  activeObservers.forEach((value, key) => {
    if (key.includes('_events')) {
      // Handle event listeners
      safeWindow.removeEventListener('resize', value.resize);
      safeWindow.removeEventListener('scroll', value.scroll);
    } else if (value.disconnect) {
      // Handle mutation observers
      value.disconnect();
    }
  });

  activeObservers.clear();

  // Clear any delayed positioning tasks
  delayedPositioningTasks.forEach((taskId) => {
    clearTimeout(taskId);
  });
  delayedPositioningTasks.clear();
}
