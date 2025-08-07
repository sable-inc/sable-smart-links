// GlobalPopupManager.js
import { Popup } from './Popup.js';

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

    showPopup(options) {
        if (this._isDestroyed) return null;
        this.closeActivePopup();
        try {
            const popupManager = this.createPopupManager(options);
            this.activePopup = popupManager;
            const parent = options.parent || document.body;
            popupManager.mount(parent);
            this.broadcastStateChange();
            return {
                container: popupManager.container,
                popup: popupManager.popup,
                unmount: () => {
                    if (this.activePopup === popupManager) {
                        popupManager.unmount();
                        this.activePopup = null;
                        this.broadcastStateChange();
                    }
                },
                mount: (newParent) => popupManager.mount(newParent),
                updatePosition: (position) => popupManager.updatePosition(position)
            };
        } catch (error) {
            return null;
        }
    }

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
            debug: config.debug || false,
            animateText: config.animateText !== undefined ? config.animateText : true,
            markdown: config.markdown !== undefined ? config.markdown : true,
            width: config.width || 380,
            onClose: () => {
                if (config.onClose) {
                    config.onClose();
                }
                this.closeActivePopup();
            }
        };
        const popup = new Popup(popupConfig);
        const popupElement = popup.render();
        const popupManager = {
            container: popupElement,
            popup,
            mount: (parentElement) => {
                if (parentElement && !parentElement.contains(popupElement)) parentElement.appendChild(popupElement);
            },
            unmount: () => {
                if (popupElement.parentNode) popupElement.parentNode.removeChild(popupElement);
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

    closeActivePopup() {
        if (this.activePopup) {
            try {
                this.activePopup.unmount();
            } catch (error) {
                // ignore
            }
            this.activePopup = null;
            this.broadcastStateChange();
        }
    }

    hasActivePopup() {
        return this.activePopup !== null;
    }

    addListener(listener) { this.listeners.add(listener); }
    removeListener(listener) { this.listeners.delete(listener); }

    broadcastStateChange() {
        const state = { hasActivePopup: this.hasActivePopup() };
        this.listeners.forEach(listener => { try { listener(state); } catch { } });
        if (typeof window !== 'undefined') {
            const stateEvent = new CustomEvent('sable:popupStateChange', { detail: state });
            window.dispatchEvent(stateEvent);
        }
    }

    getState() { return { hasActivePopup: this.hasActivePopup() }; }
    destroy() {
        this.closeActivePopup();
        this.listeners.clear();
        this._isDestroyed = true;
    }
}
const globalPopupManager = new GlobalPopupManager();
export default globalPopupManager; 