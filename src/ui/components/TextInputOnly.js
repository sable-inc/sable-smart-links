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
        // Create style element for placeholder color
        const style = document.createElement('style');
        style.textContent = `
            input::placeholder {
                color: rgba(255, 255, 255, 0.5) !important;
            }
            input::-webkit-input-placeholder {
                color: rgba(255, 255, 255, 0.5) !important;
            }
            input::-moz-placeholder {
                color: rgba(255, 255, 255, 0.5) !important;
            }
            input:-ms-input-placeholder {
                color: rgba(255, 255, 255, 0.5) !important;
            }
        `;
        document.head.appendChild(style);

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
        });

        const input = document.createElement('input');
        Object.assign(input.style, {
            flex: '1',
            background: 'transparent',
            border: 'none',
            color: primaryColor,
            fontSize: '14px',
            outline: 'none',
        });
        input.placeholder = `Ask anything about ${platform}`;
        input.addEventListener('input', onInputChange);
        input.addEventListener('click', onExpand);

        const arrowButton = new ArrowButton(onExpand);

        container.appendChild(input);
        container.appendChild(arrowButton.render());
        return container;
    }

    render() {
        return this.element;
    }
}