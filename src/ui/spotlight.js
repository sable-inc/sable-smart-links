/**
 * Spotlight functionality for highlighting elements during walkthroughs
 * This module creates a spotlight effect that darkens everything except the highlighted element
 */

const SPOTLIGHT_CLASS = 'sable-spotlight';
const SPOTLIGHT_CONTAINER_ID = 'sable-spotlight-container';

// Keep track of active spotlights
let activeSpotlights = [];

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
    
    .${SPOTLIGHT_CLASS}-animation {
      animation: sable-spotlight-pulse 2s infinite;
    }
    
    @keyframes sable-spotlight-pulse {
      0% {
        box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
      }
      50% {
        box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.6);
      }
      100% {
        box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
      }
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
 * @param {Element} element - The DOM element to spotlight
 * @param {Object} options - Spotlight options
 * @param {boolean} [options.animate=true] - Whether to animate the spotlight
 * @param {number} [options.padding=5] - Padding around the element in pixels
 * @param {number} [options.opacity=0.5] - Opacity of the darkened area (0-1)
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
  
  // Get element position and dimensions
  const rect = element.getBoundingClientRect();
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  
  // Create the spotlight element
  const spotlightEl = document.createElement('div');
  spotlightEl.className = SPOTLIGHT_CLASS;
  if (animate) {
    spotlightEl.classList.add(`${SPOTLIGHT_CLASS}-animation`);
  }
  
  // Position and size the spotlight
  spotlightEl.style.left = `${rect.left + scrollLeft - padding}px`;
  spotlightEl.style.top = `${rect.top + scrollTop - padding}px`;
  spotlightEl.style.width = `${rect.width + (padding * 2)}px`;
  spotlightEl.style.height = `${rect.height + (padding * 2)}px`;
  
  // Add to DOM using the container
  const container = getSpotlightContainer();
  container.appendChild(spotlightEl);
  
  // Track this spotlight
  activeSpotlights.push(spotlightEl);
  
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

// This function is no longer needed as its functionality has been merged into createSpotlight

/**
 * Remove all active spotlights
 */
export function removeSpotlights() {
  // Remove all spotlight elements from the container
  const container = getSpotlightContainer();
  
  // Fade out and remove each spotlight
  activeSpotlights.forEach(spotlight => {
    if (spotlight) {
      // Apply fade out effect
      spotlight.style.opacity = '0';
      
      // Remove after animation completes
      setTimeout(() => {
        if (spotlight.parentNode) {
          spotlight.parentNode.removeChild(spotlight);
        }
      }, 300);
    }
  });
  
  // Clear the tracking array
  activeSpotlights = [];
}

/**
 * Check if an element is currently visible in the viewport
 * @param {Element} element - The element to check
 * @returns {boolean} Whether the element is in the viewport
 */
function isElementInViewport(element) {
  const rect = element.getBoundingClientRect();
  
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}
