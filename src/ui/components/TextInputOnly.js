import { ArrowButton } from './ArrowButton.js';

export class TextInputOnly {
    constructor({ onSubmit, onInputChange, onExpand, platform, primaryColor }) {
        this.element = this.createElement({ 
            onSubmit, 
            onInputChange, 
            onExpand, 
            platform, 
            primaryColor 
        });
    }

    createElement({ onSubmit, onInputChange, onExpand, platform, primaryColor }) {
        // Create style element for animations and placeholders
        const styleId = 'text-input-cursor-style';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                @keyframes blink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0; }
                }
                input::placeholder {
                    color: rgba(255, 255, 255, 0.5) !important;
                }
            `;
            document.head.appendChild(style);
        }

        const container = document.createElement('div');
        Object.assign(container.style, {
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            backgroundColor: '#323232',
            padding: '10px 16px',
            paddingLeft: '40px',
            borderRadius: '16px 16px 0 0',
            width: 'calc(100% + 32px)',
            margin: '0 -16px',
            marginTop: 'auto',
            height: 'fit-content',
            borderRadius: '0',
        });

        const inputWrapper = document.createElement('div');
        Object.assign(inputWrapper.style, {
            position: 'relative',
            flex: '1',
            display: 'flex',
            alignItems: 'center',
        });

        const cursor = document.createElement('span');
        Object.assign(cursor.style, {
            position: 'absolute',
            left: '-4px',
            color: primaryColor,
            pointerEvents: 'none',
            animation: 'blink 1s infinite',
            zIndex: '1',
            opacity: '1',
            display: 'block',
        });
        cursor.textContent = '|';

        const input = document.createElement('input');
        Object.assign(input.style, {
            flex: '1',
            background: 'transparent',
            border: 'none',
            color: primaryColor,
            fontSize: '14px',
            outline: 'none',
            caretColor: 'transparent',
            paddingLeft: '4px',
        });
        input.placeholder = `Ask anything about ${platform}`;
        
        // Update cursor position based on input
        input.addEventListener('input', (e) => {
            if (e.target.value) {
                const textWidth = this.getTextWidth(e.target.value.substring(0, e.target.selectionStart), input);
                cursor.style.left = `${textWidth - 4}px`;
            } else {
                cursor.style.left = '-4px';
            }
            onInputChange(e);
        });

        // Update cursor position on click or arrow keys
        input.addEventListener('click', (e) => {
            const textWidth = this.getTextWidth(e.target.value.substring(0, e.target.selectionStart), input);
            cursor.style.left = `${textWidth}px`;
        });

        input.addEventListener('keyup', (e) => {
            if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
                const textWidth = this.getTextWidth(e.target.value.substring(0, e.target.selectionStart), input);
                cursor.style.left = `${textWidth}px`;
            }
        });

        input.addEventListener('click', onExpand);

        // Helper function to calculate text width
        this.getTextWidth = (text, element) => {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            const computedStyle = window.getComputedStyle(element);
            context.font = `${computedStyle.fontSize} ${computedStyle.fontFamily}`;
            return context.measureText(text).width;
        };

        const arrowButton = new ArrowButton(onExpand);

        inputWrapper.appendChild(cursor);
        inputWrapper.appendChild(input);
        container.appendChild(inputWrapper);
        container.appendChild(arrowButton.render());

        // Auto-focus input and ensure cursor is visible
        requestAnimationFrame(() => {
            input.focus();
        });

        return container;
    }

    render() {
        return this.element;
    }
}