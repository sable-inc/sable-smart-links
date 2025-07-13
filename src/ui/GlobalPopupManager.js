// GlobalPopupManager.js
import { SimplePopup } from './components/SimplePopup.js';
import { MinimizedState } from './components/MinimizedState.js';

/**
 * Global popup manager that ensures only one popup is active at a time
 * This prevents issues with multiple popups being created simultaneously
 */
class GlobalPopupManager {
    constructor() {
        this.activePopup = null;
        this.isMinimized = false;
        this.listeners = new Set();
    }

    /**
     * Show a popup, ensuring any existing popup is closed first
     * @param {Object} options - Popup configuration options
     * @returns {Object|null} Popup manager instance or null if failed
     */
    showPopup(options) {
        console.log('[GlobalPopupManager] showPopup called with options:', options);
        
        // Close any existing popup first
        this.closeActivePopup();

        try {
            // Create new popup manager directly to avoid circular dependency
            const popupManager = this.createPopupManager(options);
            console.log('[GlobalPopupManager] Popup manager created:', popupManager);
            
            // Store reference to active popup
            this.activePopup = popupManager;
            this.isMinimized = false;
            
            // Mount the popup
            const parent = options.parent || document.body;
            console.log('[GlobalPopupManager] Mounting popup to parent:', parent);
            popupManager.mount(parent);
            
            // Notify listeners
            this.notifyListeners();
            
            // Return the popup manager with wrapped methods
            const result = {
                container: popupManager.container, // Expose container for positioning
                unmount: () => {
                    console.log('[GlobalPopupManager] Unmounting popup');
                    popupManager.unmount();
                    this.activePopup = null;
                    this.isMinimized = false;
                    this.notifyListeners();
                },
                mount: (newParent) => {
                    console.log('[GlobalPopupManager] Remounting popup to:', newParent);
                    popupManager.mount(newParent);
                },
                updatePosition: (position) => {
                    console.log('[GlobalPopupManager] Updating position:', position);
                    popupManager.updatePosition(position);
                }
            };
            
            console.log('[GlobalPopupManager] Returning popup result:', result);
            return result;
        } catch (error) {
            console.error('[GlobalPopupManager] Error creating popup:', error);
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
            fontSize: config.fontSize || '15px'
        };

        // Create popup instance
        const popup = new SimplePopup({
            ...popupConfig,
            onMinimize: () => this.setMinimized(true),
            onPositionChange: (position) => {
                // Handle position changes if needed
            }
        });

        // Use the popup's own element as the container
        const popupElement = popup.render();

        return {
            container: popupElement,
            popup,
            mount: (parentElement) => {
                parentElement.appendChild(popupElement);
            },
            unmount: () => {
                popupElement.remove();
                this.setMinimized(false);
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
    }

    /**
     * Close the currently active popup
     */
    closeActivePopup() {
        if (this.activePopup) {
            try {
                this.activePopup.unmount();
            } catch (error) {
                console.error('[GlobalPopupManager] Error closing popup:', error);
            }
            this.activePopup = null;
            this.isMinimized = false;
            this.notifyListeners();
        }
    }

    /**
     * Check if a popup is currently active
     * @returns {boolean} True if a popup is active
     */
    hasActivePopup() {
        return this.activePopup !== null;
    }

    /**
     * Check if the current popup is minimized
     * @returns {boolean} True if popup is minimized
     */
    isPopupMinimized() {
        return this.isMinimized;
    }

    /**
     * Set the minimized state
     * @param {boolean} minimized - Whether the popup is minimized
     */
    setMinimized(minimized) {
        this.isMinimized = minimized;
        this.notifyListeners();
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
                    hasActivePopup: this.hasActivePopup(),
                    isMinimized: this.isMinimized
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
            hasActivePopup: this.hasActivePopup(),
            isMinimized: this.isMinimized
        };
    }
}

// Create singleton instance
const globalPopupManager = new GlobalPopupManager();

export default globalPopupManager; 