import { MinimizeButton } from './MinimizeButton.js';
import { ArrowButton } from './ArrowButton.js';

export class TextInputOnly {
    constructor({ onSubmit, onInputChange, onExpand, platform, primaryColor, onMinimize }) {
        this.element = this.createElement({ 
            onSubmit, 
            onInputChange, 
            onExpand, 
            platform, 
            primaryColor, 
            onMinimize 
        });
    }

    createElement({ onSubmit, onInputChange, onExpand, platform, primaryColor, onMinimize }) {
        const container = document.createElement('div');
        Object.assign(container.style, {
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            backgroundColor: '#323232',
            padding: '10px 16px',
            borderRadius: '16px',
            width: 'calc(100% + 32px)',
            margin: '0 -16px',
            height: '100%',
        });

        const minimizeButton = new MinimizeButton({
            onMinimize,
            primaryColor
        });

        container.appendChild(minimizeButton.render());

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