// components/MinimizedState.js
class MinimizedState {
    constructor({ primaryColor, isDragging, onMouseOver, onMouseOut }) {
        this.primaryColor = primaryColor;
        this.isDragging = isDragging;
        this.element = this.createElement();
        this.setupEventListeners(onMouseOver, onMouseOut);
    }

    createElement() {
        const container = document.createElement('div');
        Object.assign(container.style, {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            opacity: '0.7',
            transition: 'opacity 0.2s ease',
            cursor: this.isDragging ? 'grabbing' : 'pointer',
        });

        const text = document.createElement('span');
        Object.assign(text.style, {
            fontSize: '14px',
            color: this.primaryColor,
            fontWeight: '500',
        });
        text.textContent = 'Ask Tavily...';

        container.appendChild(text);
        return container;
    }

    setupEventListeners(onMouseOver, onMouseOut) {
        this.element.addEventListener('mouseover', () => {
            if (!this.isDragging) {
                this.element.style.opacity = '1';
                onMouseOver?.();
            }
        });

        this.element.addEventListener('mouseout', () => {
            if (!this.isDragging) {
                this.element.style.opacity = '0.7';
                onMouseOut?.();
            }
        });
    }

    render() {
        return this.element;
    }
}