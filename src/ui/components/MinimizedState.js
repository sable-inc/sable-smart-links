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
            gap: '4px',
            opacity: '0.7',
            transition: 'opacity 0.2s ease',
            cursor: 'pointer',
            paddingLeft: '0',
        });

        container.addEventListener('mouseover', () => {
            container.style.opacity = '1';
        });

        container.addEventListener('mouseout', () => {
            container.style.opacity = '0.7';
        });

        container.addEventListener('click', this.config.onClick);

        // Add AI magic sparkles icon matching the screenshot
        const icon = document.createElement('div');
        icon.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 6L7 4L8 6L10 7L8 8L7 10L6 8L4 7L6 6Z" fill="${this.config.primaryColor}"/>
                <path d="M14 14L15.5 11L17 14L20 15.5L17 17L15.5 20L14 17L11 15.5L14 14Z" fill="${this.config.primaryColor}"/>
                <path d="M16 4L17 2L18 4L20 5L18 6L17 8L16 6L14 5L16 4Z" fill="${this.config.primaryColor}"/>
            </svg>
        `;
        Object.assign(icon.style, {
            display: 'flex',
            alignItems: 'center',
        });

        const text = document.createElement('span');
        Object.assign(text.style, {
            fontSize: '14px',
            color: this.config.primaryColor,
            fontWeight: '500',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        });
        text.textContent = this.config.text;

        container.appendChild(icon);
        container.appendChild(text);
        return container;
    }

    render() {
        return this.element;
    }
}