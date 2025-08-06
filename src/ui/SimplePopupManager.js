// managers/SimplePopupManager.js
import { SimplePopup } from './components/SimplePopup.js';
import globalPopupManager from './GlobalPopupManager.js';

// NOTE: This class should only be used by GlobalPopupManager to enforce singleton popups.
// Do not instantiate or mount SimplePopupManager directly elsewhere in the codebase.
export class SimplePopupManager {
    constructor(config) {
        this.config = {
            debug: false,
            text: config.text || '',
            boxWidth: config.boxWidth || 200,
            buttonType: config.buttonType || 'arrow',
            onProceed: config.onProceed || (() => {}),
            onYesNo: config.onYesNo || (() => {}),
            primaryColor: config.primaryColor || '#FFFFFF',
            includeTextBox: config.includeTextBox || false,
            fontSize: config.fontSize || '15px'
        };


        
        // Track position state
        this.position = {
            top: window.innerHeight / 2,
            left: window.innerWidth / 2
        };

        // Create container
        this.container = document.createElement('div');
        Object.assign(this.container.style, {
            position: 'fixed',
            zIndex: 2147483646,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        });

        // Initial render
        this.render();
    }

    handleClose = () => {
        // Remove the popup from the DOM
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        // Notify global popup manager that popup is closed
        globalPopupManager.closeActivePopup();
    }

    render() {
        this.container.innerHTML = '';

        // Render full popup
        const popup = new SimplePopup({
            ...this.config,
            isVisible: true,
            onClose: () => this.handleClose(),
            position: this.position,
            onPositionChange: (newPosition) => {
                this.position = newPosition;
            },
            fontSize: this.config.fontSize // Explicitly pass it through
        });

        // Set container styles for popup
        Object.assign(this.container.style, {
            background: 'transparent',
            padding: '0',
            border: 'none',
            boxShadow: 'none',
            backdropFilter: 'none',
            cursor: 'default',
            top: `${this.position.top}px`,
            left: `${this.position.left}px`,
            transform: 'none'
        });

        this.container.appendChild(popup.render());
    }

    mount(parentElement) {
        parentElement.appendChild(this.container);
    }

    unmount() {
        this.container.remove();
        // Notify global popup manager that popup is closed
        globalPopupManager.closeActivePopup();
    }
    
    /**
     * Updates the position of the popup
     * @param {Object} newPosition - The new position object
     * @param {number} newPosition.top - The top position in pixels
     * @param {number} newPosition.left - The left position in pixels
     */
    updatePosition(newPosition) {
        if (!newPosition || typeof newPosition !== 'object') {
            console.error('Invalid position provided to updatePosition');
            return;
        }
        
        // Update the position state
        this.position = {
            top: newPosition.top !== undefined ? newPosition.top : this.position.top,
            left: newPosition.left !== undefined ? newPosition.left : this.position.left
        };
        
        // Update the container position immediately
        Object.assign(this.container.style, {
            top: `${this.position.top}px`,
            left: `${this.position.left}px`
        });
        
        // Re-render to ensure child components get updated position
        this.render();
        
        return this.position;
    }
}


// Example usage (commented out):
// const popupManager = new SimplePopupManager({
//     text: "Would you like to proceed?",
//     boxWidth: 200,
//     buttonType: 'arrow', // or 'yes-no'
//     onProceed: () => console.log('Proceeded'),
//     onYesNo: (isYes) => console.log(isYes ? 'Yes clicked' : 'No clicked'),
//     primaryColor: '#FFFFFF'
// });

// popupManager.mount(document.body);