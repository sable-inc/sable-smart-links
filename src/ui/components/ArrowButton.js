// components/ArrowButton.js
export class ArrowButton {
    constructor(onClick) {
        this.element = this.createButton(onClick);
    }

    createButton(onClick) {
        const button = document.createElement('button');
        Object.assign(button.style, {
            padding: '5px',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: '#ffffff',
            color: '#000000',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        });

        button.addEventListener('mouseover', () => {
            button.style.transform = 'scale(1.05)';
            button.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
        });

        button.addEventListener('mouseout', () => {
            button.style.transform = 'scale(1)';
            button.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
        });

        button.addEventListener('click', onClick);

        // Add SVG icon
        button.innerHTML = `
            <svg 
                width="16"
                height="16"
                viewBox="0 0 16 16" 
                fill="none" 
                style="transform: translateY(-1px)"
            >
                <path 
                    d="M8 2L8 14M8 2L2 8M8 2L14 8"
                    stroke="black" 
                    strokeWidth="3.5"
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                />
            </svg>
        `;

        return button;
    }

    render() {
        return this.element;
    }
}
