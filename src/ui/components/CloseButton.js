// components/CloseButton.js
export class CloseButton {
    constructor({ onClose, primaryColor }) {
        this.element = this.createElement({ onClose, primaryColor });
    }

    createElement({ onClose, primaryColor }) {
        const button = document.createElement('button');
        Object.assign(button.style, {
            position: 'absolute',
            top: '4px',
            left: '4px',
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            padding: '0',
            outline: 'none',
        });

        // Create a modern close icon using SVG (X)
        button.innerHTML = `
            <svg 
                width="8" 
                height="8" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="${primaryColor}"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                style="transition: all 0.2s ease"
            >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        `;
        
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            onClose();
        });

        button.addEventListener('mouseover', () => {
            button.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
            button.style.transform = 'scale(1.1)';
            const svg = button.querySelector('svg');
            if (svg) {
                svg.style.transform = 'rotate(90deg)';
            }
        });

        button.addEventListener('mouseout', () => {
            button.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            button.style.transform = 'scale(1)';
            const svg = button.querySelector('svg');
            if (svg) {
                svg.style.transform = 'rotate(0deg)';
            }
        });

        return button;
    }

    render() {
        return this.element;
    }
}