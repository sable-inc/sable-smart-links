// GlobalPopupManager.js
import { SimplePopup } from './components/SimplePopup.js';

/**
 * Global popup manager that ensures only one popup is active at a time
 * This prevents issues with multiple popups being created simultaneously
 */
class GlobalPopupManager {
    constructor() {
        this.activePopup = null;
        this.listeners = new Set();
    }

    /**
     * Show a popup, ensuring any existing popup is closed first
     * @param {Object} options - Popup configuration options
     * @returns {Object|null} Popup manager instance or null if failed
     */
    showPopup(options) {
        const debug = options && options.debug;
        
        if (debug) {
            console.debug('[GlobalPopupManager] showPopup called with options:', options);
        }
        
        // Close any existing popup first
        this.closeActivePopup();

        try {
            // Create new popup manager directly to avoid circular dependency
            const popupManager = this.createPopupManager(options);
            if (debug) console.debug('[GlobalPopupManager] Popup manager created:', popupManager);
            
            // Store reference to active popup
            if (debug) console.debug('[GlobalPopupManager] Setting activePopup - hasActivePopup will change from', this.hasActivePopup(), 'to true');
            this.activePopup = popupManager;
            if (debug) console.debug('[showPopup] hasActivePopup changed');
            
            // Mount the popup
            const parent = options.parent || document.body;
            if (debug) console.debug('[GlobalPopupManager] Mounting popup to parent:', parent);
            popupManager.mount(parent);
            
            // Notify listeners
            this.notifyListeners();
            
            // Return the popup manager with wrapped methods
            const result = {
                container: popupManager.container, // Expose container for positioning
                unmount: () => {
                    if (debug) {
                        console.log('[GlobalPopupManager] Unmounting popup');
                    }
                    popupManager.unmount();
                    if (debug) {
                        console.log('[GlobalPopupManager] Setting activePopup to null - hasActivePopup will change from', this.hasActivePopup(), 'to false');
                    }
                    this.activePopup = null;
                    if (debug) {
                        console.log('[showPopup.unmount] hasActivePopup changed');
                    }
                    this.notifyListeners();
                },
                mount: (newParent) => {
                    if (debug) {
                        console.log('[GlobalPopupManager] Remounting popup to:', newParent);
                    }
                    popupManager.mount(newParent);
                },
                updatePosition: (position) => {
                    if (debug) {
                        console.log('[GlobalPopupManager] Updating position:', position);
                    }
                    popupManager.updatePosition(position);
                }
            };
            
            if (debug) console.debug('[GlobalPopupManager] Returning popup result:', result);
            return result;
        } catch (error) {
            console.error('[GlobalPopupManager] Error creating popup:', error);
            return null;
        }
    }

    /**
     * Show a stateful popup (e.g., PopupStateManager) and enforce singleton
     * @param {Function} createPopupFn - Function that returns a popup instance (must have mount/unmount)
     * @param {Object} options - Options to pass to the popup constructor
     * @returns {Object|null} Popup manager instance or null if failed
     */
    showStatefulPopup(createPopupFn, options) {
        const debug = options && options.debug;
        
        this.closeActivePopup();
        try {
            const popupManager = createPopupFn(options);
            this.activePopup = popupManager;
            if (typeof popupManager.mount === 'function') {
                popupManager.mount(document.body);
            }
            this.notifyListeners();
            return {
                unmount: () => {
                    if (typeof popupManager.unmount === 'function') {
                        popupManager.unmount();
                    }
                    this.activePopup = null;
                    this.notifyListeners();
                }
            };
        } catch (error) {
            console.error('[GlobalPopupManager] Error creating stateful popup:', error);
            return null;
        }
    }

    /**
     * Create a popup manager instance
     * @param {Object} config - Configuration options
     * @returns {Object} Popup manager instance
     */
    createPopupManager(config) {
        const popupConfig = {
            text: config.text || '',
            boxWidth: config.boxWidth || 200,
            buttonType: config.buttonType || 'arrow',
            onProceed: config.onProceed || (() => {}),
            onYesNo: config.onYesNo || (() => {}),
            primaryColor: config.primaryColor || '#FFFFFF',
            includeTextBox: config.includeTextBox || false,
            fontSize: config.fontSize || '15px',
            sections: config.sections || [],
            // Add agentInfo for analytics logging
            agentInfo: config.agentInfo || null,
            debug: config.debug || false
        };

        // Debug log to verify agentInfo is being passed
        if (config.debug) {
            console.log('[GlobalPopupManager] DEBUG: Creating popup with agentInfo:', config.agentInfo);
        }

        // Create popup instance
        const popup = new SimplePopup({
            ...popupConfig,
            onClose: () => {
                console.trace('[GlobalPopupManager.createPopupManager] onClose callback called');
                console.log('[GlobalPopupManager] DEBUG: onClose callback triggered, calling closeActivePopup()');
                // Close the popup and update state
                this.closeActivePopup();
            },
            onPositionChange: (position) => {
                // Handle position changes if needed
            }
        });

        // Use the popup's own element as the container
        const popupElement = popup.render();

        // Create the popup manager object
        const popupManager = {
            container: popupElement,
            popup,
            mount: (parentElement) => {
                parentElement.appendChild(popupElement);
            },
            unmount: () => {
                console.trace('[GlobalPopupManager] popupManager.unmount() stack trace');
                popupElement.remove();
                // Update global state when popup is unmounted
                if (this.activePopup === popupManager) {
                    // Note: This log is always shown as it's important for debugging popup state
                    console.log('[GlobalPopupManager] Setting activePopup to null in inner unmount - hasActivePopup will change from', this.hasActivePopup(), 'to false');
                    this.activePopup = null;
                    console.log('[inner unmount] hasActivePopup changed');
                    this.notifyListeners();
                }
            },
            updatePosition: (newPosition) => {
                if (newPosition && typeof newPosition === 'object') {
                    Object.assign(popupElement.style, {
                        top: `${newPosition.top}px`,
                        left: `${newPosition.left}px`
                    });
                }
            }
        };

        return popupManager;
    }

    /**
     * Close the currently active popup
     */
    closeActivePopup() {
        if (this.activePopup) {
            try {
                this.activePopup.unmount();
                // Note: The unmount method already handles setting activePopup to null and notifying listeners
            } catch (error) {
                console.error('[GlobalPopupManager] Error closing popup:', error);
                // If unmount failed, manually clear the state
                this.activePopup = null;
                this.notifyListeners();
            }
        }
    }

    /**
     * Check if a popup is currently active
     * @returns {boolean} True if a popup is active
     */
    hasActivePopup() {
        const result = this.activePopup !== null;
        // Note: This log is always shown as it's important for debugging popup state
        if (this.config?.debug) {
            console.log('[GlobalPopupManager] hasActivePopup() called, returning:', result);
        }
        return result;
    }



    /**
     * Add a listener for popup state changes
     * @param {Function} listener - Function to call when state changes
     */
    addListener(listener) {
        this.listeners.add(listener);
    }

    /**
     * Remove a listener
     * @param {Function} listener - Function to remove
     */
    removeListener(listener) {
        this.listeners.delete(listener);
    }

    /**
     * Notify all listeners of state changes
     */
    notifyListeners() {
        this.listeners.forEach(listener => {
            try {
                listener({
                    hasActivePopup: this.hasActivePopup()
                });
            } catch (error) {
                console.error('[GlobalPopupManager] Error in listener:', error);
            }
        });
    }

    /**
     * Get current popup state
     * @returns {Object} Current state
     */
    getState() {
        return {
            hasActivePopup: this.hasActivePopup()
        };
    }
}

// Create singleton instance
const globalPopupManager = new GlobalPopupManager();

export default globalPopupManager; 