/**
 * Spotlight functionality for highlighting elements during walkthroughs
 * This module creates a spotlight effect that darkens everything except the highlighted element
 */

import { getElementPosition, isElementInViewport, createPositionObserver, removePositionObserver, applyPositionWithDelay } from '../utils/positioning.js';

const SPOTLIGHT_CLASS = 'sable-spotlight';
const SPOTLIGHT_CONTAINER_ID = 'sable-spotlight-container';

// Keep track of active spotlights, observers and delayed positioning tasks
let activeSpotlights = [];
let activeObserverIds = [];
let activeDelayedTasks = [];

/**
 * Create and inject the necessary CSS for the spotlight
 */
function injectSpotlightStyles() {
  // Check if styles are already injected
  if (document.getElementById('sable-spotlight-styles')) {
    return;
  }

  const styleElement = document.createElement('style');
  styleElement.id = 'sable-spotlight-styles';
  styleElement.textContent = `
    .${SPOTLIGHT_CLASS} {
      position: absolute;
      box-sizing: border-box;
      border-radius: 4px;
      box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
      z-index: 99997;
      pointer-events: none;
      transition: all 0.3s ease;
    }
  `;
  document.head.appendChild(styleElement);
}

/**
 * Get or create the spotlight container
 * @returns {HTMLElement} The spotlight container element
 */
function getSpotlightContainer() {
  let container = document.getElementById(SPOTLIGHT_CONTAINER_ID);

  if (!container) {
    container = document.createElement('div');
    container.id = SPOTLIGHT_CONTAINER_ID;
    container.style.position = 'absolute';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100%';
    container.style.height = '0';
    container.style.overflow = 'visible';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '99997';
    document.body.appendChild(container);
  }

  return container;
}

/**
 * Create a spotlight effect around an element
 * @param {Element} element - Element to spotlight
 * @param {Object} options - Spotlight options
 * @param {number} options.padding - Padding around element in pixels
 * @param {number} options.opacity - Opacity of the overlay
 * @param {string} options.color - Color of the overlay
 * @param {number} options.offsetX - Horizontal offset in pixels
 * @param {number} options.offsetY - Vertical offset in pixels
 * @param {boolean} [options.animate=true] - Whether to animate the spotlight
 * @param {boolean} [options.closeOnClick=false] - Whether clicking outside the spotlight should remove it
 * @param {Function} [options.onClose] - Callback when spotlight is closed by clicking outside
 * @returns {HTMLElement} The created spotlight element
 */
export function createSpotlight(element, options = {}) {
  // Ensure we have a valid element
  if (!element) return null;

  // Remove any existing spotlights
  removeSpotlights();

  // Inject styles if not already done
  injectSpotlightStyles();

  // Default options
  const {
    animate = true,
    padding = 5,
    opacity = 0.5,
    closeOnClick = false,
    onClose = null
  } = options;

  // Get element position and dimensions using unified positioning utility
  const position = getElementPosition(element, padding);

  // Create the spotlight element
  const spotlightEl = document.createElement('div');
  spotlightEl.className = SPOTLIGHT_CLASS;
  if (animate) {
    spotlightEl.classList.add(`${SPOTLIGHT_CLASS}-animation`);
  }

  // Position and size the spotlight
  spotlightEl.style.left = `${position.left}px`;
  spotlightEl.style.top = `${position.top}px`;
  spotlightEl.style.width = `${position.width}px`;
  spotlightEl.style.height = `${position.height}px`;

  // Add to DOM using the container
  const container = getSpotlightContainer();
  container.appendChild(spotlightEl);

  // Track this spotlight
  activeSpotlights.push(spotlightEl);

  // Create a position observer to keep the spotlight aligned with the element
  const updateSpotlightPosition = (targetElement, uiElement) => {
    const newPosition = getElementPosition(targetElement, padding, {
      offsetX: options.offsetX || 0,
      offsetY: options.offsetY || 0
    });
    uiElement.style.left = `${newPosition.left}px`;
    uiElement.style.top = `${newPosition.top}px`;
    uiElement.style.width = `${newPosition.width}px`;
    uiElement.style.height = `${newPosition.height}px`;
  };

  // Apply delayed positioning for better accuracy
  const delayedTaskId = applyPositionWithDelay(element, spotlightEl, updateSpotlightPosition, 100);
  if (delayedTaskId) {
    activeDelayedTasks.push(delayedTaskId);
  }

  // Create position observer for continuous tracking
  const observerId = createPositionObserver(element, spotlightEl, updateSpotlightPosition);
  if (observerId) {
    activeObserverIds.push(observerId);
  }

  // Add click handler to the document if needed
  if (closeOnClick) {
    const clickHandler = (e) => {
      // Only close if click is outside the spotlight area
      if (!element.contains(e.target) && e.target !== element) {
        document.removeEventListener('click', clickHandler);
        removeSpotlights();
        if (onClose && typeof onClose === 'function') {
          onClose();
        }
      }
    };

    // Add with a delay to avoid immediate triggering
    setTimeout(() => {
      document.addEventListener('click', clickHandler);
    }, 100);
  }

  // Scroll element into view if needed
  if (!isElementInViewport(element)) {
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });
  }

  return spotlightEl;
}

/**
 * Remove all active spotlights
 */
export function removeSpotlights() {
  // Remove all active spotlights
  activeSpotlights.forEach(spotlight => {
    if (spotlight.parentNode) {
      spotlight.parentNode.removeChild(spotlight);
    }
  });

  // Remove all position observers
  activeObserverIds.forEach(id => {
    removePositionObserver(id);
  });

  // Clear the arrays
  activeSpotlights.length = 0;
  activeObserverIds.length = 0;
}

// Using the unified isElementInViewport from positioningUtils.js
