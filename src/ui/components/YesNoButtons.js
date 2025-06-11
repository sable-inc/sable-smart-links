// components/YesNoButtons.js
class YesNoButtons {
    constructor(onYesNo, primaryColor = '#FFFFFF') {
        this.element = this.createButtons(onYesNo, primaryColor);
    }

    createButtons(onYesNo, primaryColor) {
        const container = document.createElement('div');
        Object.assign(container.style, {
            display: 'flex',
            gap: '4px',
        });

        // Yes button
        const yesButton = document.createElement('button');
        Object.assign(yesButton.style, {
            padding: '6px 12px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: primaryColor,
            color: '#000',
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontWeight: '500',
        });

        yesButton.textContent = 'Yes';
        yesButton.addEventListener('click', () => onYesNo(true));
        yesButton.addEventListener('mouseover', () => {
            yesButton.style.transform = 'scale(1.05)';
        });
        yesButton.addEventListener('mouseout', () => {
            yesButton.style.transform = 'scale(1)';
        });

        // No button
        const noButton = document.createElement('button');
        Object.assign(noButton.style, {
            padding: '6px 12px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: '#000000',
            color: primaryColor,
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontWeight: '500',
        });

        noButton.textContent = 'No';
        noButton.addEventListener('click', () => onYesNo(false));
        noButton.addEventListener('mouseover', () => {
            noButton.style.transform = 'scale(1.05)';
            noButton.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        });
        noButton.addEventListener('mouseout', () => {
            noButton.style.transform = 'scale(1)';
            noButton.style.backgroundColor = '#000000';
        });

        container.appendChild(yesButton);
        container.appendChild(noButton);
        return container;
    }

    render() {
        return this.element;
    }
}

// components/SimplePopup.js
class SimplePopup {
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

        // Add minimize button
        const minimizeButton = this.createMinimizeButton();
        popup.appendChild(minimizeButton);

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

    createMinimizeButton() {
        const button = document.createElement('button');
        Object.assign(button.style, {
            position: 'absolute',
            top: '4px',
            left: '4px',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: 'transparent',
            color: this.config.primaryColor,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            fontSize: '16px',
            fontWeight: '500',
        });

        button.textContent = '-';
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            this.minimize();
        });

        button.addEventListener('mouseover', () => {
            button.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
            button.style.transform = 'scale(1.1)';
        });

        button.addEventListener('mouseout', () => {
            button.style.backgroundColor = 'transparent';
            button.style.transform = 'scale(1)';
        });

        return button;
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
            fontSize: '14px',
            fontWeight: '400',
            letterSpacing: '-0.01em',
            wordWrap: 'break-word',
            overflowWrap: 'break-word',
            whiteSpace: 'pre-wrap',
            lineHeight: '1.5',
            textRendering: 'optimizeLegibility',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        });

        // Button container
        const buttonContainer = document.createElement('div');
        Object.assign(buttonContainer.style, {
            opacity: '0',
            transform: 'scale(0.9)',
            transition: 'all 0.8s ease',
        });

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

        // Animate text
        const textContainer = this.element.querySelector('div > div:first-child');
        const charDelay = 800 / this.config.text.length;
        
        for (let i = 0; i <= this.config.text.length; i++) {
            setTimeout(() => {
                textContainer.textContent = this.config.text.slice(0, i);
                if (i < this.config.text.length) {
                    const cursor = document.createElement('span');
                    cursor.style.borderRight = '2px solid rgba(255, 255, 255, 0.7)';
                    cursor.style.animation = 'blink 1s step-end infinite';
                    textContainer.appendChild(cursor);
                }
            }, 300 + (i * charDelay));
        }

        // Show button
        setTimeout(() => {
            const buttonContainer = this.element.querySelector('div > div:last-child');
            buttonContainer.style.opacity = '1';
            buttonContainer.style.transform = 'scale(1)';
        }, 2000);
    }

    setupDragging() {
        // ... dragging logic implementation ...
    }

    minimize() {
        // ... minimize logic implementation ...
    }

    render() {
        return this.element;
    }
}