/**
 * Element highlighting functionality
 */

const HIGHLIGHT_CLASS = 'sable-highlight';
const HIGHLIGHT_ANIMATION_CLASS = 'sable-highlight-animation';

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
      z-index: 99998;
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
 * @param {Element} element - The DOM element to highlight
 * @param {Object} options - Highlighting options
 * @param {boolean} [options.animate=true] - Whether to animate the highlight
 * @param {number} [options.padding=5] - Padding around the element in pixels
 * @param {string} [options.color='#3498db'] - Highlight color
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
  
  // Get element position and dimensions
  const rect = element.getBoundingClientRect();
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  
  // Create highlight element
  const highlightEl = document.createElement('div');
  highlightEl.className = HIGHLIGHT_CLASS;
  if (animate) {
    highlightEl.classList.add(HIGHLIGHT_ANIMATION_CLASS);
  }
  
  // Position and size the highlight
  highlightEl.style.left = `${rect.left + scrollLeft - padding}px`;
  highlightEl.style.top = `${rect.top + scrollTop - padding}px`;
  highlightEl.style.width = `${rect.width + (padding * 2)}px`;
  highlightEl.style.height = `${rect.height + (padding * 2)}px`;
  
  // Apply custom color if provided
  if (color !== '#3498db') {
    highlightEl.style.borderColor = color;
    highlightEl.style.backgroundColor = `${color}19`; // 10% opacity
  }
  
  // Add to DOM
  document.body.appendChild(highlightEl);
  
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
 * Remove all highlights from the page
 */
export function removeHighlight() {
  const highlights = document.querySelectorAll(`.${HIGHLIGHT_CLASS}`);
  highlights.forEach(highlight => {
    highlight.parentNode.removeChild(highlight);
  });
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
