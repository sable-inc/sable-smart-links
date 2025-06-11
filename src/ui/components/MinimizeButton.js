// components/MinimizeButton.js
export class MinimizeButton {
    constructor({ onMinimize, primaryColor }) {
        this.element = this.createElement({ onMinimize, primaryColor });
    }

    createElement({ onMinimize, primaryColor }) {
        const button = document.createElement('button');
        Object.assign(button.style, {
            position: 'absolute',
            top: '6px',
            left: '6px',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: 'transparent',
            color: primaryColor,
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
            onMinimize();
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

    render() {
        return this.element;
    }
}