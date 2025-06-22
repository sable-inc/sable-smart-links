/**
 * Tooltip functionality for displaying messages
 */

import { isBrowser, safeWindow, safeDocument } from '../utils/browserApi.js';
import { getElementPosition, createPositionObserver, removePositionObserver, applyPositionWithDelay } from '../utils/positioning.js';

const TOOLTIP_CLASS = 'sable-tooltip';
const TOOLTIP_CONTAINER_ID = 'sable-tooltip-container';

// Keep track of active tooltips, observers and delayed positioning tasks
let activeTooltip = null;
let activeTooltipObserverId = null;
let activeTooltipDelayedTaskId = null;

/**
 * Create and inject the necessary CSS for tooltips
 */
function injectTooltipStyles() {
  // Only run in browser environment
  if (!isBrowser) return;
  
  // Check if styles are already injected
  if (safeDocument.getElementById('sable-tooltip-styles')) {
    return;
  }
  
  const styleElement = safeDocument.createElement('style');
  styleElement.id = 'sable-tooltip-styles';
  styleElement.textContent = `
    .${TOOLTIP_CLASS} {
      position: absolute;
      background: radial-gradient(
        circle at center,
        rgba(60, 60, 60, 0.5) 0%,
        rgba(60, 60, 60, 0.65) 100%
      );
      color: #FFFFFF;
      border-radius: 16px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(8px);
      padding: 16px;
      width: 300px;
      max-width: 90vw;
      z-index: 99999;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      font-size: 14px;
      line-height: 1.5;
      animation: sable-tooltip-fade-in 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      user-select: none;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .${TOOLTIP_CLASS} * {
      box-sizing: border-box;
    }
    
    .${TOOLTIP_CLASS}-title {
      font-weight: 600;
      font-size: 16px;
      margin: 0 0 8px 0;
      color: #FFFFFF;
    }
    
    .${TOOLTIP_CLASS}-content {
      margin: 0 0 16px 0;
    }
    
    .${TOOLTIP_CLASS}-buttons {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    
    .${TOOLTIP_CLASS}-button {
      padding: 8px 16px;
      border-radius: 4px;
      font-weight: 500;
      cursor: pointer;
      border: none;
      font-size: 14px;
      transition: background-color 0.2s;
    }
    
    .${TOOLTIP_CLASS}-button-primary {
      background-color: rgba(255, 255, 255, 1);
      color: #333333;
    }
    
    .${TOOLTIP_CLASS}-button-primary:hover {
      background-color: rgba(255, 255, 255, 0.8);
    }
    
    .${TOOLTIP_CLASS}-button-secondary {
      background-color: rgba(241, 241, 241, 0.8);
      color: #FFFFFF;
    }
    
    .${TOOLTIP_CLASS}-button-secondary:hover {
      background-color: rgba(225, 225, 225, 0.6);
    }
    
    .${TOOLTIP_CLASS}-floating {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }
    
    @keyframes sable-tooltip-fade-in {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `;
  safeDocument.appendChild(safeDocument.head, styleElement);
}

/**
 * Get or create the tooltip container
 * @returns {HTMLElement} The tooltip container element
 */
function getTooltipContainer() {
  // Only run in browser environment
  if (!isBrowser) return null;
  
  let container = safeDocument.getElementById(TOOLTIP_CONTAINER_ID);
  
  if (!container) {
    container = safeDocument.createElement('div');
    container.id = TOOLTIP_CONTAINER_ID;
    container.style.position = 'absolute';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100%';
    container.style.height = '0';
    container.style.overflow = 'visible';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '99999';
    safeDocument.appendChild(safeDocument.body, container);
  }
  
  return container;
}

/**
 * Calculate the position for a tooltip relative to a target element
 * @param {Element} targetElement - The element to position the tooltip relative to
 * @param {Element} tooltipElement - The tooltip element
 * @param {string} position - Preferred position (top, right, bottom, left)
 * @param {Object} options - Additional positioning options
 * @param {number} options.offsetX - Horizontal offset in pixels
 * @param {number} options.offsetY - Vertical offset in pixels
 * @returns {Object} Position information
 */
function calculateTooltipPosition(targetElement, tooltipElement, position = 'bottom', options = {}) {
  if (!targetElement) {
    return {
      tooltipClass: `${TOOLTIP_CLASS}-floating`,
      tooltipStyle: {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      }
    };
  }
  
  // Get target and tooltip dimensions
  const targetRect = targetElement.getBoundingClientRect();
  const tooltipRect = tooltipElement.getBoundingClientRect();
  const { left: scrollLeft, top: scrollTop } = safeWindow.getScrollPosition();
  
  // Get manual offsets
  const offsetX = options.offsetX || 0;
  const offsetY = options.offsetY || 0;
  
  // Spacing between target and tooltip
  const spacing = 12;
  
  // Default to bottom if no position specified
  const preferredPosition = position || 'bottom';
  
  // Get viewport dimensions safely
  const { width: viewportWidth, height: viewportHeight } = safeWindow.getViewportDimensions();
  
  // Calculate positions for each direction
  const positions = {
    top: {
      top: targetRect.top + scrollTop - tooltipRect.height - 10 + offsetY,
      left: targetRect.left + scrollLeft + (targetRect.width / 2) - (tooltipRect.width / 2) + offsetX
    },
    right: {
      top: targetRect.top + scrollTop + (targetRect.height / 2) - (tooltipRect.height / 2) + offsetY,
      left: targetRect.right + scrollLeft + 10 + offsetX
    },
    bottom: {
      top: targetRect.bottom + scrollTop + 10 + offsetY,
      left: targetRect.left + scrollLeft + (targetRect.width / 2) - (tooltipRect.width / 2) + offsetX
    },
    left: {
      top: targetRect.top + scrollTop + (targetRect.height / 2) - (tooltipRect.height / 2) + offsetY,
      left: targetRect.left + scrollLeft - tooltipRect.width - 10 + offsetX
    }
  };
  
  // Check if the preferred position fits in the viewport
  let chosenPosition = preferredPosition;
  
  // Check if the tooltip would be outside the viewport in the preferred position
  const preferred = positions[preferredPosition];
  const isOutsideViewport = {
    top: preferred.top < 0,
    right: preferred.left + tooltipRect.width > viewportWidth,
    bottom: preferred.top + tooltipRect.height > viewportHeight,
    left: preferred.left < 0
  };
  
  // If the preferred position doesn't fit, try alternatives
  if (isOutsideViewport[preferredPosition]) {
    // Try positions in this order
    const alternatives = ['bottom', 'right', 'top', 'left'];
    
    for (const alt of alternatives) {
      if (alt !== preferredPosition && !isOutsideViewport[alt]) {
        chosenPosition = alt;
        break;
      }
    }
  }
  
  // Use the chosen position
  const chosen = positions[chosenPosition];
  
  // Adjust horizontal position if needed to keep tooltip in viewport
  if (chosen.left < 0) {
    chosen.left = 10;
  } else if (chosen.left + tooltipRect.width > viewportWidth) {
    chosen.left = viewportWidth - tooltipRect.width - 10;
  }
  
  return {
    tooltipClass: `${TOOLTIP_CLASS}-${chosenPosition}`,
    tooltipStyle: {
      top: `${Math.max(0, chosen.top)}px`,
      left: `${Math.max(0, chosen.left)}px`
    },
    chosenPosition
  };
}

/**
 * Show a tooltip
 * @param {Element|null} targetElement - The element to attach the tooltip to (null for centered)
 * @param {Object|string} content - Tooltip content
 * @param {string} [content.title] - Tooltip title
 * @param {string} content.content - Tooltip content text
 * @param {string} [content.nextButton='Next'] - Text for the next button
 * @param {string} [content.skipButton] - Text for the skip button (if provided)
 * @param {Object} options - Additional options
 * @param {string} [options.position='bottom'] - Preferred tooltip position
 * @param {Function} [options.onNext] - Callback when next button is clicked
 * @param {Function} [options.onSkip] - Callback when skip button is clicked
 * @returns {HTMLElement} The created tooltip element
 */
export function showTooltip(targetElement, content, options = {}) {
  // Hide any existing tooltip
  hideTooltip();
  
  // Inject styles if not already done
  injectTooltipStyles();
  
  // Get container
  const container = getTooltipContainer();
  
  // Create tooltip element
  // Only run in browser environment
  if (!isBrowser) return null;
  
  const tooltipEl = safeDocument.createElement('div');
  tooltipEl.className = TOOLTIP_CLASS;
  tooltipEl.style.pointerEvents = 'auto';
  
  // Parse content
  const tooltipContent = typeof content === 'string' 
    ? { content } 
    : content;
  
  // Create tooltip HTML
  let tooltipHTML = '';
  
  if (tooltipContent.title) {
    tooltipHTML += `<div class="${TOOLTIP_CLASS}-title">${tooltipContent.title}</div>`;
  }
  
  tooltipHTML += `<div class="${TOOLTIP_CLASS}-content">${tooltipContent.content}</div>`;
  
  tooltipHTML += `<div class="${TOOLTIP_CLASS}-buttons">`;
  
  if (tooltipContent.skipButton) {
    tooltipHTML += `
      <button class="${TOOLTIP_CLASS}-button ${TOOLTIP_CLASS}-button-secondary ${TOOLTIP_CLASS}-skip-button">
        ${tooltipContent.skipButton}
      </button>
    `;
  }
  
  tooltipHTML += `
    <button class="${TOOLTIP_CLASS}-button ${TOOLTIP_CLASS}-button-primary ${TOOLTIP_CLASS}-next-button">
      ${tooltipContent.nextButton || 'Next'}
    </button>
  </div>`;
  
  // Set content
  tooltipEl.innerHTML += tooltipHTML;
  
  // Add to DOM
  container.appendChild(tooltipEl);
  
  // Create a position observer to keep the tooltip aligned with the element
  const updateTooltipPosition = (targetElement, tooltipElement) => {
    const { tooltipClass, tooltipStyle, chosenPosition } = calculateTooltipPosition(
      targetElement, 
      tooltipElement, 
      options.position, 
      {
        offsetX: tooltipContent.offsetX || 0,
        offsetY: tooltipContent.offsetY || 0
      }
    );
    tooltipElement.className = TOOLTIP_CLASS; // Reset classes
    tooltipElement.classList.add(tooltipClass);
    Object.assign(tooltipElement.style, tooltipStyle);
  };
  
  // Clean up any existing observer and delayed task
  if (activeTooltipObserverId) {
    removePositionObserver(activeTooltipObserverId);
  }
  
  // Apply delayed positioning for better accuracy
  if (activeTooltipDelayedTaskId) {
    clearTimeout(activeTooltipDelayedTaskId);
  }
  activeTooltipDelayedTaskId = applyPositionWithDelay(targetElement, tooltipEl, updateTooltipPosition, 100);
  
  // Create new observer for continuous tracking
  activeTooltipObserverId = createPositionObserver(targetElement, tooltipEl, updateTooltipPosition);
  
  // Add event listeners
  const nextButton = tooltipEl.querySelector(`.${TOOLTIP_CLASS}-next-button`);
  if (nextButton) {
    nextButton.addEventListener('click', () => {
      if (options.onNext) {
        options.onNext();
      }
    });
  }
  
  const skipButton = tooltipEl.querySelector(`.${TOOLTIP_CLASS}-skip-button`);
  if (skipButton) {
    skipButton.addEventListener('click', () => {
      if (options.onSkip) {
        options.onSkip();
      } else {
        hideTooltip();
      }
    });
  }
  
  // Store reference to active tooltip
  activeTooltip = tooltipEl;
  
  return tooltipEl;
}

/**
 * Hide the currently active tooltip
 */
export function hideTooltip() {
  if (activeTooltip && activeTooltip.parentNode) {
    activeTooltip.parentNode.removeChild(activeTooltip);
    activeTooltip = null;
    
    // Clean up any active position observer
    if (activeTooltipObserverId) {
      removePositionObserver(activeTooltipObserverId);
      activeTooltipObserverId = null;
    }
    
    // Clear any delayed positioning task
    if (activeTooltipDelayedTaskId) {
      clearTimeout(activeTooltipDelayedTaskId);
      activeTooltipDelayedTaskId = null;
    }
  }
}
