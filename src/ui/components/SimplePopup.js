// components/SimplePopup.js
import { ArrowButton } from './ArrowButton.js';
import { YesNoButtons } from './YesNoButtons.js';
import { MinimizedState } from './MinimizedState.js';
import { MinimizeButton } from './MinimizeButton.js';

export class SimplePopup {
    constructor(config) {
        this.config = {
            text: config.text || '',
            boxWidth: config.boxWidth || 200,
            buttonType: config.buttonType || 'arrow', // 'arrow' or 'yes-no'
            onProceed: config.onProceed || (() => {}),
            onYesNo: config.onYesNo || (() => {}),
            primaryColor: config.primaryColor || '#FFFFFF',
        };

        // State
        this.isMinimized = false;
        this.position = { top: 320, left: 32 };
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.visibleCharacters = 0;
        this.isButtonVisible = false;

        // Create elements
        this.element = this.createPopup();
        this.setupDragging();
        this.startAnimationSequence();
    }

    createPopup() {
        const popup = document.createElement('div');
        Object.assign(popup.style, {
            position: 'fixed',
            top: `${this.position.top}px`,
            left: `${this.position.left}px`,
            zIndex: '2147483647',
            width: 'fit-content',
            display: 'flex',
            flexDirection: 'column',
            background: `radial-gradient(
                circle at center,
                rgba(60, 60, 60, 0.5) 0%,
                rgba(60, 60, 60, 0.65) 100%
            )`,
            padding: '12px',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(8px)',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            color: this.config.primaryColor,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            cursor: 'grab',
            userSelect: 'none',
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
            opacity: '0',
        });

        // Add drag handle
        const dragHandle = this.createDragHandle();
        popup.appendChild(dragHandle);

        // Replace custom minimize button with MinimizeButton component
        const minimizeButton = new MinimizeButton({
            onMinimize: () => this.minimize(),
            primaryColor: this.config.primaryColor
        });
        popup.appendChild(minimizeButton.render());

        // Add content container
        const content = this.createContent();
        popup.appendChild(content);

        // Add cursor animation style
        const style = document.createElement('style');
        style.textContent = `
            @keyframes blink {
                from, to { border-color: transparent }
                50% { border-color: rgba(255, 255, 255, 0.7) }
            }
        `;
        popup.appendChild(style);

        return popup;
    }

    createDragHandle() {
        const handle = document.createElement('div');
        Object.assign(handle.style, {
            padding: '2px 0',
            cursor: 'grab',
            userSelect: 'none',
        });

        const bar = document.createElement('div');
        Object.assign(bar.style, {
            width: '32px',
            height: '4px',
            backgroundColor: 'rgba(255, 255, 255, 0.3)',
            borderRadius: '2px',
            margin: '0 auto',
        });

        handle.appendChild(bar);
        return handle;
    }

    createContent() {
        const container = document.createElement('div');
        Object.assign(container.style, {
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '0 4px',
            marginTop: '4px',
            width: 'fit-content',
        });

        // Text container
        const textContainer = document.createElement('div');
        Object.assign(textContainer.style, {
            width: `${this.config.boxWidth}px`,
            padding: '4px 4px',
            color: this.config.primaryColor,
            fontSize: '15px',
            fontWeight: '400',
            letterSpacing: '-0.01em',
            wordWrap: 'break-word',
            overflowWrap: 'break-word',
            whiteSpace: 'pre-wrap',
            lineHeight: '1.5',
            textRendering: 'optimizeLegibility',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        });
        
        // Store a direct reference to the text container
        this.textContainer = textContainer;

        // Button container
        const buttonContainer = document.createElement('div');
        Object.assign(buttonContainer.style, {
            opacity: '0',
            transform: 'scale(0.9)',
            transition: 'all 0.8s ease',
        });
        
        // Store a direct reference to the button container
        this.buttonContainer = buttonContainer;

        // Add button based on type
        if (this.config.buttonType === 'arrow') {
            const arrowButton = new ArrowButton(this.config.onProceed);
            buttonContainer.appendChild(arrowButton.render());
        } else {
            const yesNoButtons = new YesNoButtons(this.config.onYesNo, this.config.primaryColor);
            buttonContainer.appendChild(yesNoButtons.render());
        }

        container.appendChild(textContainer);
        container.appendChild(buttonContainer);
        return container;
    }

    startAnimationSequence() {
        // Show background
        setTimeout(() => {
            this.element.style.opacity = '1';
        }, 0);

        // Animate text - use the direct reference instead of querySelector
        const charDelay = 800 / this.config.text.length;
        
        for (let i = 0; i <= this.config.text.length; i++) {
            setTimeout(() => {
                this.textContainer.textContent = this.config.text.slice(0, i);
                if (i < this.config.text.length) {
                    const cursor = document.createElement('span');
                    cursor.style.borderRight = '2px solid rgba(255, 255, 255, 0.7)';
                    cursor.style.animation = 'blink 1s step-end infinite';
                    this.textContainer.appendChild(cursor);
                }
            }, 300 + (i * charDelay));
        }

        // Show button - use the direct reference instead of querySelector
        setTimeout(() => {
            this.buttonContainer.style.opacity = '1';
            this.buttonContainer.style.transform = 'scale(1)';
        }, 2000);
    }

    setupDragging() {
        const handleDragStart = (e) => {
            if (e.target instanceof HTMLButtonElement) return;
            
            e.preventDefault();
            this.isDragging = true;
            this.dragStart = {
                x: e.clientX - this.position.left,
                y: e.clientY - this.position.top
            };
            this.element.style.cursor = 'grabbing';
        };

        const handleMouseMove = (e) => {
            if (!this.isDragging) return;
            
            const newLeft = e.clientX - this.dragStart.x;
            const newTop = e.clientY - this.dragStart.y;
            
            // Constrain to window boundaries
            this.position.left = Math.max(0, Math.min(newLeft, window.innerWidth - this.element.offsetWidth));
            this.position.top = Math.max(0, Math.min(newTop, window.innerHeight - this.element.offsetHeight));
            
            // Update element position
            this.element.style.left = `${this.position.left}px`;
            this.element.style.top = `${this.position.top}px`;
        };

        const handleMouseUp = () => {
            if (this.isDragging) {
                this.isDragging = false;
                this.element.style.cursor = 'grab';
            }
        };

        // Add event listeners
        this.element.addEventListener('mousedown', handleDragStart);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        // Cleanup function (store it for potential future cleanup)
        this.cleanupDragging = () => {
            this.element.removeEventListener('mousedown', handleDragStart);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }

    minimize() {
        console.log('Minimize clicked');
        
        // Call the onMinimize callback if provided in config
        if (this.config.onMinimize) {
            this.config.onMinimize();
        }

        // Update state
        this.isMinimized = true;

        // Clear existing content
        this.element.innerHTML = '';

        // Create and render minimized state
        const minimizedState = new MinimizedState({
            text: this.config.text,
            onClick: () => {
                // Handle maximize
                this.isMinimized = false;
                this.element.innerHTML = '';
                
                // Restore original content
                const dragHandle = this.createDragHandle();
                const minimizeButton = new MinimizeButton({
                    onMinimize: () => this.minimize(),
                    primaryColor: this.config.primaryColor
                });
                const content = this.createContent();
                
                this.element.appendChild(dragHandle);
                this.element.appendChild(minimizeButton.render());
                this.element.appendChild(content);
                
                // Restore original styles
                Object.assign(this.element.style, {
                    width: 'fit-content',
                    display: 'flex',
                    flexDirection: 'column',
                    background: `radial-gradient(
                        circle at center,
                        rgba(60, 60, 60, 0.5) 0%,
                        rgba(60, 60, 60, 0.65) 100%
                    )`,
                    padding: '12px',
                    cursor: 'grab',
                });

                // The references to textContainer and buttonContainer are updated in createContent
                // so we can safely call startAnimationSequence
                this.startAnimationSequence();
            },
            primaryColor: this.config.primaryColor
        });

        // Update styles for minimized state
        Object.assign(this.element.style, {
            width: 'auto',
            background: 'rgba(0, 0, 0, 0.8)',
            padding: '8px 16px',
            cursor: 'pointer',
        });

        // Append minimized state
        this.element.appendChild(minimizedState.render());
    }

    render() {
        return this.element;
    }
}

// // Create a simple popup with arrow button
// const popup = new SimplePopup({
//     text: "Would you like to proceed?",
//     boxWidth: 200,
//     buttonType: 'arrow',
//     onProceed: () => console.log('Proceeded'),
//     primaryColor: '#FFFFFF'
// });

// document.body.appendChild(popup.render());

// // Create a simple popup with yes/no buttons
// const yesNoPopup = new SimplePopup({
//     text: "Are you sure?",
//     boxWidth: 200,
//     buttonType: 'yes-no',
//     onYesNo: (isYes) => console.log(isYes ? 'Yes clicked' : 'No clicked'),
//     primaryColor: '#FFFFFF'
// });

// document.body.appendChild(yesNoPopup.render());