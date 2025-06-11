// components/MinimizedState.js
export class MinimizedState {
    constructor(config) {
        this.config = {
            text: config.text || '',
            onClick: config.onClick || (() => {}),
            primaryColor: config.primaryColor || '#FFFFFF'
        };
        this.element = this.createElement();
    }

    createElement() {
        const container = document.createElement('div');
        Object.assign(container.style, {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            opacity: '0.7',
            transition: 'opacity 0.2s ease',
            cursor: 'pointer',
        });

        container.addEventListener('mouseover', () => {
            container.style.opacity = '1';
        });

        container.addEventListener('mouseout', () => {
            container.style.opacity = '0.7';
        });

        container.addEventListener('click', this.config.onClick);

        const text = document.createElement('span');
        Object.assign(text.style, {
            fontSize: '14px',
            color: this.config.primaryColor,
            fontWeight: '500',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        });
        text.textContent = `${this.config.text.substring(0, 20)}...`;

        container.appendChild(text);
        return container;
    }

    render() {
        return this.element;
    }
}