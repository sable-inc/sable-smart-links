/**
 * Browser API utilities for safe server-side rendering
 * Provides safe access to browser-only APIs like window and document
 */

/**
 * Safe browser environment detection
 * @returns {boolean} Whether the code is running in a browser environment
 */
export const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

/**
 * Safe window object access
 */
export const safeWindow = {
  // Location and navigation
  location: {
    get search() {
      return isBrowser ? window.location.search : '';
    },
    get href() {
      return isBrowser ? window.location.href : '';
    },
    get pathname() {
      return isBrowser ? window.location.pathname : '';
    }
  },

  // Event listeners
  addEventListener: (event, handler, options) => {
    if (isBrowser) {
      window.addEventListener(event, handler, options);
    }
  },

  removeEventListener: (event, handler, options) => {
    if (isBrowser) {
      window.removeEventListener(event, handler, options);
    }
  },

  // Viewport and scrolling
  getViewportDimensions: () => {
    if (!isBrowser) return { width: 0, height: 0 };
    return {
      width: window.innerWidth || document.documentElement.clientWidth,
      height: window.innerHeight || document.documentElement.clientHeight
    };
  },

  getScrollPosition: () => {
    if (!isBrowser) return { left: 0, top: 0 };
    return {
      left: window.pageXOffset || document.documentElement.scrollLeft,
      top: window.pageYOffset || document.documentElement.scrollTop
    };
  },

  // History API
  history: {
    pushState: (data, unused, url) => {
      if (isBrowser) {
        window.history.pushState(data, unused, url);
      }
    },
    replaceState: (data, unused, url) => {
      if (isBrowser) {
        window.history.replaceState(data, unused, url);
      }
    }
  }
};

/**
 * Safe document object access
 */
export const safeDocument = {
  // DOM element creation
  createElement: (tagName) => {
    if (!isBrowser) return {};
    return document.createElement(tagName);
  },

  // DOM element queries
  getElementById: (id) => {
    if (!isBrowser) return null;
    return document.getElementById(id);
  },

  querySelector: (selector) => {
    if (!isBrowser) return null;
    return document.querySelector(selector);
  },

  querySelectorAll: (selector) => {
    if (!isBrowser) return [];
    return document.querySelectorAll(selector);
  },

  // DOM manipulation
  appendChild: (parent, child) => {
    if (isBrowser && parent && child) {
      parent.appendChild(child);
    }
  },

  // Document state
  get readyState() {
    if (!isBrowser) return '';
    return document.readyState;
  },

  // Event listeners
  addEventListener: (event, handler, options) => {
    if (isBrowser) {
      document.addEventListener(event, handler, options);
    }
  },

  removeEventListener: (event, handler, options) => {
    if (isBrowser) {
      document.removeEventListener(event, handler, options);
    }
  },

  // DOM properties
  get documentElement() {
    if (!isBrowser) return null;
    return document.documentElement;
  },

  get body() {
    if (!isBrowser) return null;
    return document.body;
  },

  get head() {
    if (!isBrowser) return null;
    return document.head;
  }
};
