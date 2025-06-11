// managers/SimplePopupManager.js
class SimplePopupManager {
    constructor(config) {
        this.config = {
            text: config.text || '',
            boxWidth: config.boxWidth || 200,
            buttonType: config.buttonType || 'arrow',
            onProceed: config.onProceed || (() => {}),
            onYesNo: config.onYesNo || (() => {}),
            primaryColor: config.primaryColor || '#FFFFFF',
        };

        // Single state variable
        this.isMinimized = false;

        // Create container
        this.container = document.createElement('div');
        Object.assign(this.container.style, {
            position: 'fixed',
            top: '320px',
            left: '32px',
            zIndex: 2147483647,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        });

        // Initial render
        this.render();
    }

    handleMinimize = () => {
        this.isMinimized = true;
        this.render();
    }

    handleMaximize = () => {
        this.isMinimized = false;
        this.render();
    }

    render() {
        // Clear existing content
        this.container.innerHTML = '';

        if (this.isMinimized) {
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
            });

            this.container.appendChild(minimizedState.render());
        } else {
            // Render full popup
            const popup = new SimplePopup({
                ...this.config,
                isVisible: true,
                onMinimize: () => this.handleMinimize()
            });

            // Reset container styles for full popup
            Object.assign(this.container.style, {
                background: 'transparent',
                padding: '0',
                border: 'none',
                boxShadow: 'none',
                backdropFilter: 'none',
                cursor: 'default',
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
}


// const popupManager = new SimplePopupManager({
//     text: "Would you like to proceed?",
//     boxWidth: 200,
//     buttonType: 'arrow', // or 'yes-no'
//     onProceed: () => console.log('Proceeded'),
//     onYesNo: (isYes) => console.log(isYes ? 'Yes clicked' : 'No clicked'),
//     primaryColor: '#FFFFFF'
// });

// popupManager.mount(document.body);