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
        this._isDestroyed = false;
    }

    /**
     * Show a popup, ensuring any existing popup is closed first
     * @param {Object} options - Popup configuration options
     * @returns {Object|null} Popup manager instance or null if failed
     */
    showPopup(options) {
        if (this._isDestroyed) {
            console.error('[GlobalPopupManager] Cannot show popup - manager is destroyed');
            return null;
        }

        // Close any existing popup first
        this.closeActivePopup();

        try {
            // Create new popup manager directly to avoid circular dependency
            const popupManager = this.createPopupManager(options);

            // Store reference to active popup
            this.activePopup = popupManager;

            // Mount the popup
            const parent = options.parent || document.body;
            popupManager.mount(parent);

            // Broadcast popup state change
            this.broadcastStateChange();

            // Return the popup manager with wrapped methods
            const result = {
                container: popupManager.container, // Expose container for positioning
                popup: popupManager.popup, // Expose popup instance for direct access
                unmount: () => {
                    if (this.activePopup === popupManager) {
                        popupManager.unmount();
                        this.activePopup = null;
                        this.broadcastStateChange();
                    }
                },
                mount: (newParent) => {
                    popupManager.mount(newParent);
                },
                updatePosition: (position) => {
                    popupManager.updatePosition(position);
                }
            };

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
        if (this._isDestroyed) {
            console.error('[GlobalPopupManager] Cannot show stateful popup - manager is destroyed');
            return null;
        }

        this.closeActivePopup();
        try {
            const popupManager = createPopupFn(options);

            // Ensure the popup has required methods
            if (typeof popupManager.mount !== 'function' || typeof popupManager.unmount !== 'function') {
                throw new Error('Stateful popup must have mount() and unmount() methods');
            }

            this.activePopup = popupManager;
            popupManager.mount(document.body);
            this.broadcastStateChange();

            return {
                popup: popupManager, // Expose the popup instance for direct access
                unmount: () => {
                    if (this.activePopup === popupManager) {
                        popupManager.unmount();
                        this.activePopup = null;
                        this.broadcastStateChange();
                    }
                },
                mount: (newParent) => {
                    popupManager.mount(newParent);
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
            onProceed: config.onProceed || (() => { }),
            onYesNo: config.onYesNo || (() => { }),
            primaryColor: config.primaryColor || '#FFFFFF',
            fontSize: config.fontSize || '15px',
            sections: config.sections || [],
            agentInfo: config.agentInfo || null,
            debug: config.debug || false
        };

        // Create popup instance
        const popup = new SimplePopup({
            ...popupConfig,
            onClose: () => {
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
                if (parentElement && !parentElement.contains(popupElement)) {
                    parentElement.appendChild(popupElement);
                }
            },
            unmount: () => {
                if (popupElement.parentNode) {
                    popupElement.parentNode.removeChild(popupElement);
                }
                // Update global state when popup is unmounted
                if (this.activePopup === popupManager) {
                    this.activePopup = null;
                    this.broadcastStateChange();
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
                // Note: The unmount method already handles setting activePopup to null and broadcasting state change
            } catch (error) {
                console.error('[GlobalPopupManager] Error closing popup:', error);
                // If unmount failed, manually clear the state
                this.activePopup = null;
                this.broadcastStateChange();
            }
        }
    }

    /**
     * Check if a popup is currently active
     * @returns {boolean} True if a popup is active
     */
    hasActivePopup() {
        const result = this.activePopup !== null;
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
     * Broadcast popup state changes to all listeners and dispatch events
     */
    broadcastStateChange() {
        const state = {
            hasActivePopup: this.hasActivePopup()
        };

        // Notify all listeners
        this.listeners.forEach(listener => {
            try {
                listener(state);
            } catch (error) {
                console.error('[GlobalPopupManager] Error in listener:', error);
            }
        });

        // Dispatch custom event for broader system awareness
        if (typeof window !== 'undefined') {
            const stateEvent = new CustomEvent('sable:popupStateChange', {
                detail: state
            });
            window.dispatchEvent(stateEvent);
        }
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

    /**
     * Destroy the global popup manager
     */
    destroy() {
        this.closeActivePopup();
        this.listeners.clear();
        this._isDestroyed = true;
    }
}

// Create singleton instance
const globalPopupManager = new GlobalPopupManager();

export default globalPopupManager; 