// MenuTriggerManager.js
import globalPopupManager from './GlobalPopupManager.js';
import { PopupStateManager } from './PopupStateManager.js';
import { isBrowser, safeDocument, safeWindow } from '../utils/browserAPI.js';
import { waitForElement } from '../utils/elementSelector.js';
import { debounce } from '../utils/events.js';
import { MenuTrigger } from './components/MenuTrigger.js';

/**
 * Simplified Menu Trigger Manager
 * Creates a trigger button that shows/hides based on GlobalPopupManager state
 * and calls showPopup when clicked
 */
export class MenuTriggerManager {
  constructor(config) {
    this.config = {
      enabled: false,
      text: 'Open Menu',
      position: 'bottom-right', // 'bottom-right', 'bottom-left', 'top-right', 'top-left'
      targetElement: null, // Element to attach the button to
      urlPaths: [], // Array of URL paths where the button should be shown
      popupConfig: {
        enableChat: false,
        sections: []
      },
      debug: false,
      ...config
    };

    this.triggerButtonElement = null;
    this.isInitialized = false;
    this.popupStateListener = null;
    this._menuPopupManager = null; // Store reference to the menu popup manager
  }

  /**
   * Initialize the menu trigger manager
   */
  init() {
    if (!isBrowser || this.isInitialized) {
      if (this.config.debug) {
        console.log('[MenuTriggerManager] Skipping init - not browser or already initialized');
      }
      return;
    }

    if (this.config.debug) {
      console.log('[MenuTriggerManager] Initializing with config:', this.config);
    }

    // Wait for page to be fully loaded before creating trigger button
    if (document.readyState === 'loading') {
      if (this.config.debug) {
        console.log('[MenuTriggerManager] Document still loading, waiting for DOMContentLoaded');
      }
      document.addEventListener('DOMContentLoaded', async () => {
        await this._initAfterPageLoad();
      });
    } else {
      if (this.config.debug) {
        console.log('[MenuTriggerManager] Document already loaded, proceeding with init');
      }
      this._initAfterPageLoad();
    }
  }

  /**
   * Initialize after page is loaded
   * @private
   */
  async _initAfterPageLoad() {
    if (this.config.debug) {
      console.log('[MenuTriggerManager] Page loaded, checking for existing trigger button');
    }
    
    // Check if trigger button already exists in DOM
    const existingButton = document.querySelector('.sable-menu-trigger');
    if (existingButton) {
      if (this.config.debug) {
        console.log('[MenuTriggerManager] Found existing trigger button in DOM:', existingButton);
      }
      this.triggerButtonElement = existingButton;
    }

    // Create trigger button if enabled and doesn't exist
    if (this.config.enabled && !this.triggerButtonElement) {
      if (this.config.debug) {
        console.log('[MenuTriggerManager] Creating new trigger button');
      }
      await this._createTriggerButton();
    } else if (this.config.enabled && this.triggerButtonElement) {
      if (this.config.debug) {
        console.log('[MenuTriggerManager] Using existing trigger button');
      }
    } else if (!this.config.enabled) {
      if (this.config.debug) {
        console.log('[MenuTriggerManager] Trigger button creation disabled in config');
      }
    }

    // Set up popup state listener
    this.setupPopupStateListener();

    this.isInitialized = true;
    if (this.config.debug) {
      console.log('[MenuTriggerManager] Initialization complete');
    }
  }

  /**
   * Create and position the trigger button (only once)
   * @private
   */
  async _createTriggerButton() {
    // Check if we should show the button based on current URL path
    if (this.config.debug) {
      console.log('[MenuTriggerManager] Checking trigger button visibility', this._shouldShowTriggerButton());
    }
    if (!this._shouldShowTriggerButton()) {
      return;
    }
    
    // Check if button already exists in DOM
    if (document.querySelector('.sable-menu-trigger')) {
      if (this.config.debug) {
        console.log('[MenuTriggerManager] Trigger button already exists in DOM, skipping creation');
      }
      return;
    }

    if (this.config.debug) {
      console.log('[MenuTriggerManager] Creating new trigger button element');
    }
    
    // Create button using MenuTrigger component
    const menuTrigger = new MenuTrigger({
      text: this.config.text,
      onClick: () => {
        console.log('[MenuTriggerManager] Trigger button clicked');
        this.showMenuPopup();
      },
      primaryColor: '#FFFFFF',
      className: 'sable-menu-trigger'
    });
    
    // Get the button element from the component
    const button = menuTrigger.render();
    
    // Apply positioning styles
    Object.assign(button.style, {
      position: 'fixed',
      zIndex: '9999'
    });
    
    // Position the button if no target selector is provided
    if (!this.config.targetElement) {
      this._positionTriggerButton(button);
    }
    
    // Store reference to the button
    this.triggerButtonElement = button;
    
    // If there's a target selector, wait for the element and append the button
    if (this.config.targetElement) {
      this._attachButtonToTarget();
    } else {
      // Otherwise, append to body
      safeDocument.body.appendChild(button);
    }
    
    // Add URL change listener to show/hide the trigger button
    this._addUrlChangeListener();
  }

  /**
   * Check if the trigger button should be shown based on current URL path
   * @private
   * @returns {boolean} - Whether the button should be shown
   */
  _shouldShowTriggerButton() {
    // If no URL paths are specified, show on all paths
    if (!this.config.urlPaths || this.config.urlPaths.length === 0) {
      return true;
    }
    
    const currentPath = safeWindow.location.pathname;
    if (this.config.debug) {
      console.log('[MenuTriggerManager] Current path:', currentPath);
    }
    
    // Check if current path matches any of the specified paths
    return this.config.urlPaths.some(path => {
      // Support exact match
      if (path === currentPath) {
        return true;
      }
      
      // Support wildcard match (e.g., '/products/*')
      if (path.endsWith('*')) {
        const basePath = path.slice(0, -1);
        return currentPath.startsWith(basePath);
      }
      
      return false;
    });
  }

  /**
   * Position the trigger button based on the position config
   * @private
   * @param {HTMLElement} button - The button element
   */
  _positionTriggerButton(button) {
    const position = this.config.position || 'bottom-right';
    
    switch (position) {
      case 'bottom-right':
        Object.assign(button.style, {
          bottom: '20px',
          right: '20px'
        });
        break;
      case 'bottom-left':
        Object.assign(button.style, {
          bottom: '20px',
          left: '20px'
        });
        break;
      case 'top-right':
        Object.assign(button.style, {
          top: '20px',
          right: '20px'
        });
        break;
      case 'top-left':
        Object.assign(button.style, {
          top: '20px',
          left: '20px'
        });
        break;
      default:
        // Default to bottom-right
        Object.assign(button.style, {
          bottom: '20px',
          right: '20px'
        });
    }
  }

  /**
   * Attach the trigger button to a target element
   * @private
   */
  async _attachButtonToTarget() {
    if (!this.config.targetElement || !this.triggerButtonElement) {
      return;
    }
    
    const targetConfig = this.config.targetElement;
    
    // Try to find the target element immediately
    let targetElement = document.querySelector(targetConfig.selector);
    
    if (targetElement) {
      this._attachButtonToElement(targetElement, targetConfig);
    } else {
      // If element not found and waitForElement is configured, use waitForElement
      if (targetConfig.waitForElement) {
        try {
          targetElement = await waitForElement(targetConfig.selector, {
            timeout: targetConfig.waitTimeout || 5000
          });
          if (targetElement) {
            this._attachButtonToElement(targetElement, targetConfig);
          }
        } catch (error) {
          console.error(`[MenuTriggerManager] Failed to wait for target element: ${error.message}`);
        }
      } else {
        // Use MutationObserver to watch for the target element to appear
        this._watchForTargetElement(targetConfig);
      }
    }
  }

  /**
   * Watch for target element to appear in the DOM using MutationObserver
   * @private
   * @param {Object} targetConfig - The target configuration
   */
  _watchForTargetElement(targetConfig) {
    if (this.config.debug) {
      console.log(`[MenuTriggerManager] Watching for target element: ${targetConfig.selector}`);
    }
    
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Check if the added node matches our selector
              if (node.matches && node.matches(targetConfig.selector)) {
                this._attachButtonToElement(node, targetConfig);
                observer.disconnect();
                return;
              }
              
              // Check if any child of the added node matches our selector
              const matchingChild = node.querySelector && node.querySelector(targetConfig.selector);
              if (matchingChild) {
                this._attachButtonToElement(matchingChild, targetConfig);
                observer.disconnect();
                return;
              }
            }
          }
        }
      }
    });
    
    // Start observing the document body for changes
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // Set a timeout to stop observing after a reasonable time
    setTimeout(() => {
      observer.disconnect();
      if (this.config.debug) {
        console.log(`[MenuTriggerManager] Stopped watching for target element: ${targetConfig.selector}`);
      }
    }, targetConfig.waitTimeout || 10000);
  }

  /**
   * Attach the trigger button to a specific element
   * @private
   * @param {HTMLElement} targetElement - The target element to attach to
   * @param {Object} targetConfig - The target configuration
   */
  _attachButtonToElement(targetElement, targetConfig) {
    if (!this.triggerButtonElement) {
      return;
    }
    
    try {
      // Reset position styles when attaching to a target
      Object.assign(this.triggerButtonElement.style, {
        position: 'relative',
        top: 'auto',
        right: 'auto',
        bottom: 'auto',
        left: 'auto'
      });
      
      // If position is specified, use it to position the button relative to the target
      if (targetConfig.position) {
        const position = targetConfig.position;
        
        switch (position) {
          case 'top':
            targetElement.insertAdjacentElement('beforebegin', this.triggerButtonElement);
            break;
          case 'right':
            targetElement.insertAdjacentElement('afterend', this.triggerButtonElement);
            break;
          case 'bottom':
            targetElement.insertAdjacentElement('afterend', this.triggerButtonElement);
            break;
          case 'left':
            targetElement.insertAdjacentElement('beforebegin', this.triggerButtonElement);
            break;
          default:
            // Default behavior - append inside the target
            targetElement.appendChild(this.triggerButtonElement);
        }
      } else {
        // Default behavior - append inside the target
        targetElement.appendChild(this.triggerButtonElement);
      }
      
      if (this.config.debug) {
        console.log(`[MenuTriggerManager] Attached trigger button to element: ${targetConfig.selector}`);
      }
    } catch (error) {
      console.error(`[MenuTriggerManager] Failed to attach trigger button to target: ${error.message}`);
    }
  }

  /**
   * Add listener for URL changes to show/hide the trigger button
   * @private
   */
  _addUrlChangeListener() {
    if (!this.triggerButtonElement) return;
    
    // Function to update button visibility
    const updateButtonVisibility = () => { 
      if (this._shouldShowTriggerButton()) {
        this.triggerButtonElement.style.display = 'flex';
      } else {
        this.triggerButtonElement.style.display = 'none';
      }
    };
    
    // Listen for popstate events (browser back/forward)
    window.addEventListener('popstate', updateButtonVisibility);
  }

  /**
   * Set up listener for popup state changes
   * @private
   */
  setupPopupStateListener() {
    if (this.config.debug) {
      console.log('[MenuTriggerManager] Setting up popup state listener');
    }
    
    this.popupStateListener = (state) => {
      if (this.config.debug) {
        console.log('[MenuTriggerManager] Received popup state change - hasActivePopup:', state.hasActivePopup);
      }
      this.updateTriggerVisibility(state.hasActivePopup);
    };

    // Get initial state
    const initialState = globalPopupManager.getState();
    if (this.config.debug) {
      console.log('[MenuTriggerManager] Initial popup state - hasActivePopup:', initialState.hasActivePopup);
    }
    this.updateTriggerVisibility(initialState.hasActivePopup);

    // Add listener for state changes
    globalPopupManager.addListener(this.popupStateListener);
    if (this.config.debug) {
      console.log('[MenuTriggerManager] Popup state listener registered');
    }
  }

  /**
   * Update visibility of trigger button based on popup state
   * @param {boolean} hasActivePopup - Whether there's an active popup
   * @private
   */
  updateTriggerVisibility(hasActivePopup) {
    if (!this.triggerButtonElement) {
      if (this.config.debug) {
        console.log('[MenuTriggerManager] No trigger button element to update visibility');
      }
      return;
    }
    
    if (this.config.debug) {
      console.log('[MenuTriggerManager] Updating trigger visibility - hasActivePopup:', hasActivePopup);
    }
    
    if (hasActivePopup) {
      // Hide button when popup is active
      this.triggerButtonElement.style.display = 'none';
      if (this.config.debug) {
        console.log('[MenuTriggerManager] Trigger button hidden');
      }
    } else {
      // Show button when no popup is active
      this.triggerButtonElement.style.display = 'flex';
      if (this.config.debug) {
        console.log('[MenuTriggerManager] Trigger button shown');
      }
    }
  }

  /**
   * Show the menu popup using PopupStateManager
   * @private
   */
  showMenuPopup() {
    if (this.config.debug) {
      console.log('[MenuTriggerManager] Showing menu popup');
    }

    // Hide the trigger button since we're showing a popup
    this.updateTriggerVisibility(true);

    // Get sections from configuration
    const sections = this.config.popupConfig?.sections || [];
    
    // Use globalPopupManager to enforce singleton
    this._menuPopupManager = globalPopupManager.showStatefulPopup(
        (opts) => new PopupStateManager(opts),
        {
            platform: 'Sable',
            primaryColor: '#FFFFFF',
            width: 380,
            sections: sections,
            enableChat: this.config.popupConfig.enableChat,
            onClose: () => {
                this.updateTriggerVisibility(false);
                this._menuPopupManager = null;
            }
        }
    );
  }

  /**
   * Clean up the menu trigger manager
   */
  destroy() {
    if (this.popupStateListener) {
      globalPopupManager.removeListener(this.popupStateListener);
      this.popupStateListener = null;
    }

    // Clean up menu popup if it exists
    if (this._menuPopupManager) {
      this._menuPopupManager.unmount();
      this._menuPopupManager = null;
    }

    // Show the trigger button if it was hidden by a popup
    this.updateTriggerVisibility(false);

    // Remove trigger button if it exists
    if (this.triggerButtonElement && this.triggerButtonElement.parentNode) {
      this.triggerButtonElement.parentNode.removeChild(this.triggerButtonElement);
      this.triggerButtonElement = null;
    }

    this.isInitialized = false;

    if (this.config.debug) {
      console.log('[MenuTriggerManager] Destroyed');
    }
  }
} 