// managers/SimplePopupManager.js
import { SimplePopup } from './components/SimplePopup.js';
import { MinimizedState } from './components/MinimizedState.js';

export class SimplePopupManager {
    constructor(config) {
        this.config = {
            text: config.text || '',
            boxWidth: config.boxWidth || 200,
            buttonType: config.buttonType || 'arrow',
            onProceed: config.onProceed || (() => {}),
            onYesNo: config.onYesNo || (() => {}),
            primaryColor: config.primaryColor || '#FFFFFF',
            includeTextBox: config.includeTextBox || false,
        };

        // Single state variable
        this.isMinimized = false;
        
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

    handleMinimize = () => {
        console.log('Minimize clicked, before:', this.isMinimized);
        this.isMinimized = true;
        console.log('After setting isMinimized:', this.isMinimized);
        this.render();
    }

    handleMaximize = () => {
        this.isMinimized = false;
        this.render();
    }

    render() {
        console.log('Rendering with isMinimized:', this.isMinimized);
        this.container.innerHTML = '';

        if (this.isMinimized) {
            console.log('Attempting to render MinimizedState');
            try {
                const minimizedState = new MinimizedState({
                    text: this.config.text,
                    onClick: () => this.handleMaximize(),
                    primaryColor: this.config.primaryColor
                });
                console.log('MinimizedState created successfully');
            } catch (error) {
                console.error('Error creating MinimizedState:', error);
            }
            // Render minimized state
            const minimizedState = new MinimizedState({
                text: this.config.text,
                onClick: () => this.handleMaximize(),
                primaryColor: this.config.primaryColor
            });
            
            // Update container styles for minimized state
            Object.assign(this.container.style, {
                background: 'rgba(0, 0, 0, 0.8)',
                padding: '8px 16px',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                backdropFilter: 'blur(8px)',
                cursor: 'pointer',
                top: `${this.position.top}px`,
                left: `${this.position.left}px`,
                transform: 'none'
            });

            this.container.appendChild(minimizedState.render());
        } else {
            // Render full popup
            const popup = new SimplePopup({
                ...this.config,
                isVisible: true,
                onMinimize: () => this.handleMinimize(),
                position: this.position,
                onPositionChange: (newPosition) => {
                    this.position = newPosition;
                }
            });

            // Reset container styles for full popup
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
    }

    mount(parentElement) {
        parentElement.appendChild(this.container);
    }

    unmount() {
        this.container.remove();
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
        
        // Re-render if needed to ensure child components get updated position
        if (!this.isMinimized) {
            this.render();
        }
        
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