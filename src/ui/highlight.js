/**
 * Element highlighting functionality
 */

import { isBrowser } from '../utils/browserAPI.js';
import { getElementPosition, isElementInViewport, createPositionObserver, removePositionObserver, applyPositionWithDelay } from '../utils/positioning.js';

const HIGHLIGHT_CLASS = 'sable-highlight';
const HIGHLIGHT_ANIMATION_CLASS = 'sable-highlight-animation';

// Track active highlight, observer and delayed positioning task
let activeHighlight = null;
let activeHighlightObserverId = null;
let activeHighlightDelayedTaskId = null;

/**
 * Create and inject the necessary CSS for highlighting
 */
function injectHighlightStyles() {
  // Check if styles are already injected
  if (document.getElementById('sable-highlight-styles')) {
    return;
  }
  
  const styleElement = document.createElement('style');
  styleElement.id = 'sable-highlight-styles';
  styleElement.textContent = `
    .${HIGHLIGHT_CLASS} {
      position: absolute;
      box-sizing: border-box;
      border: 2px solid #3498db;
      border-radius: 4px;
      background-color: rgba(52, 152, 219, 0.1);
      z-index: 2147483647;
      pointer-events: none;
    }
    .${HIGHLIGHT_ANIMATION_CLASS} {
      animation: sable-highlight-pulse 1.5s infinite;
    }
    @keyframes sable-highlight-pulse {
      0% {
        box-shadow: 0 0 0 0 rgba(52, 152, 219, 0.4);
      }
      70% {
        box-shadow: 0 0 0 10px rgba(52, 152, 219, 0);
      }
      100% {
        box-shadow: 0 0 0 0 rgba(52, 152, 219, 0);
      }
    }
  `;
  document.head.appendChild(styleElement);
}



/**
 * Highlight an element on the page
 * @param {Element} element - Element to highlight
 * @param {Object} options - Highlight options
 * @param {string} options.color - Highlight color
 * @param {number} options.padding - Padding around element in pixels
 * @param {boolean} options.animate - Whether to animate the highlight
 * @param {number} options.offsetX - Horizontal offset in pixels
 * @param {number} options.offsetY - Vertical offset in pixels
 * @returns {Element} The created highlight element
 */
export function highlightElement(element, options = {}) {
  if (!element) return null;
  
  // Inject styles if not already done
  injectHighlightStyles();
  
  // Default options
  const {
    animate = true,
    padding = 5,
    color = '#3498db'
  } = options;
  
  // Remove any existing highlight
  removeHighlight();
  
  // Get element position and dimensions using unified positioning utility
  const position = getElementPosition(element, padding);
  
  // Create highlight element
  const highlightEl = document.createElement('div');
  highlightEl.className = HIGHLIGHT_CLASS;
  if (animate) {
    highlightEl.classList.add(HIGHLIGHT_ANIMATION_CLASS);
  }
  
  // Position and size the highlight
  highlightEl.style.left = `${position.left}px`;
  highlightEl.style.top = `${position.top}px`;
  highlightEl.style.width = `${position.width}px`;
  highlightEl.style.height = `${position.height}px`;
  
  // Apply custom color if provided
  if (color !== '#3498db') {
    highlightEl.style.borderColor = color;
    highlightEl.style.backgroundColor = `${color}19`; // 10% opacity
  }
  
  // Add to DOM
  document.body.appendChild(highlightEl);
  
  // Store reference to active highlight
  activeHighlight = highlightEl;
  
  // Create a position observer to keep the highlight aligned with the element
  const updateHighlightPosition = (targetElement, uiElement) => {
    const newPosition = getElementPosition(targetElement, padding, {
      offsetX: options.offsetX || 0,
      offsetY: options.offsetY || 0
    });
    uiElement.style.left = `${newPosition.left}px`;
    uiElement.style.top = `${newPosition.top}px`;
    uiElement.style.width = `${newPosition.width}px`;
    uiElement.style.height = `${newPosition.height}px`;
  };
  
  // Clean up any existing observer and delayed task
  if (activeHighlightObserverId) {
    removePositionObserver(activeHighlightObserverId);
  }
  
  // Apply delayed positioning for better accuracy
  if (activeHighlightDelayedTaskId) {
    clearTimeout(activeHighlightDelayedTaskId);
  }
  activeHighlightDelayedTaskId = applyPositionWithDelay(element, highlightEl, updateHighlightPosition, 100);
  
  // Create new observer for continuous tracking
  activeHighlightObserverId = createPositionObserver(element, highlightEl, updateHighlightPosition);
  
  // Scroll element into view if needed
  if (!isElementInViewport(element)) {
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });
  }
  
  return highlightEl;
}

/**
 * Remove the active highlight
 */
export function removeHighlight() {
  if (activeHighlight && activeHighlight.parentNode) {
    activeHighlight.parentNode.removeChild(activeHighlight);
    activeHighlight = null;
    
    // Clean up any active position observer
    if (activeHighlightObserverId) {
      removePositionObserver(activeHighlightObserverId);
      activeHighlightObserverId = null;
    }
    
    // Clear any delayed positioning task
    if (activeHighlightDelayedTaskId) {
      clearTimeout(activeHighlightDelayedTaskId);
      activeHighlightDelayedTaskId = null;
    }
  }
}

// Using the unified positioning utilities from positioningUtils.js
