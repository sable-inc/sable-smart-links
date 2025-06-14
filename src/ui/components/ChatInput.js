import { ArrowButton } from './ArrowButton.js';

export class ChatInput {
    constructor({ value, onChange, onSubmit, platform = 'Tavily', primaryColor = '#FFFFFF' }) {
        this.onChange = onChange.bind(this);
        this.onSubmit = onSubmit.bind(this);
        this.value = value;
        this.platform = platform;
        this.primaryColor = primaryColor;
        this.element = this.createElement();
    }

    createElement() {
        const container = document.createElement('div');
        Object.assign(container.style, {
            marginTop: '0',
            marginBottom: '0',
            padding: '0',
            width: '100%',
            opacity: '1',
            transform: 'translateY(0)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            borderRadius: '0',
        });

        const inputContainer = document.createElement('div');
        Object.assign(inputContainer.style, {
            display: 'flex',
            gap: '8px',
            backgroundColor: '#323232',
            padding: '8px',
            borderRadius: '0',
            width: '100%',
            boxSizing: 'border-box',
            position: 'relative', // Added for cursor positioning
        });

        const input = document.createElement('input');
        Object.assign(input.style, {
            flex: '1',
            padding: '10px 12px',
            borderRadius: '0',
            border: 'none',
            backgroundColor: '#323232',
            color: this.primaryColor,
            fontSize: '14px',
            outline: 'none',
            caretColor: 'transparent', // Hide the default cursor
        });
        input.value = this.value;
        input.placeholder = `Ask ${this.platform}...`;
        
        // Auto-focus the input when created
        setTimeout(() => {
            input.focus();
        }, 0);

        // Keep focus when clicking anywhere in the container
        inputContainer.addEventListener('click', () => {
            input.focus();
        });

        // Create the custom cursor element
        const cursor = document.createElement('span');
        Object.assign(cursor.style, {
            position: 'absolute',
            left: '20px', // Initial position before the placeholder
            top: '50%',
            transform: 'translateY(-50%)',
            color: this.primaryColor,
            pointerEvents: 'none',
            animation: 'blink 1s infinite',
            zIndex: '1',
        });
        cursor.textContent = '|';

        // Add the blinking animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes blink {
                0%, 100% { opacity: 1; }
                50% { opacity: 0; }
            }

            input::placeholder {
                color: ${this.primaryColor};
                opacity: 0.7;
            }
        `;
        document.head.appendChild(style);

        // Update cursor position based on input
        input.addEventListener('input', (e) => {
            if (e.target.value) {
                // Calculate cursor position based on input text width
                const textWidth = this.getTextWidth(e.target.value.substring(0, e.target.selectionStart), input);
                cursor.style.left = `${textWidth + 20}px`; // 20px is the initial padding
            } else {
                cursor.style.left = '20px'; // Reset to initial position
            }
            this.onChange(e);
        });

        // Update cursor position on click or arrow keys
        input.addEventListener('click', (e) => {
            const textWidth = this.getTextWidth(e.target.value.substring(0, e.target.selectionStart), input);
            cursor.style.left = `${textWidth + 20}px`;
        });

        input.addEventListener('keyup', (e) => {
            if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
                const textWidth = this.getTextWidth(e.target.value.substring(0, e.target.selectionStart), input);
                cursor.style.left = `${textWidth + 20}px`;
            }
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.onSubmit();
            }
        });

        // Helper function to calculate text width
        this.getTextWidth = (text, element) => {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            const computedStyle = window.getComputedStyle(element);
            context.font = `${computedStyle.fontSize} ${computedStyle.fontFamily}`;
            return context.measureText(text).width;
        };

        const arrowButton = new ArrowButton(this.onSubmit);

        inputContainer.appendChild(input);
        inputContainer.appendChild(cursor);
        inputContainer.appendChild(arrowButton.render());
        container.appendChild(inputContainer);

        return container;
    }

    render() {
        return this.element;
    }

    getValue() {
        return this.element.querySelector('input').value;
    }

    setValue(value) {
        this.element.querySelector('input').value = value;
    }
}