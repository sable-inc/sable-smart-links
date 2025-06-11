// components/ArrowButton.js
export class ArrowButton {
    constructor(onClick, primaryColor = '#FFFFFF') {
        this.onClick = onClick;
        this.primaryColor = primaryColor;
        this.element = this.createButton();
    }

    createButton() {
        const button = document.createElement('button');
        Object.assign(button.style, {
            width: '36px',
            height: '36px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: this.primaryColor,
            color: '#000000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
        });

        // Arrow icon
        const arrowSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        arrowSvg.setAttribute('width', '20');
        arrowSvg.setAttribute('height', '20');
        arrowSvg.setAttribute('viewBox', '0 0 24 24');
        arrowSvg.setAttribute('fill', 'none');
        arrowSvg.setAttribute('stroke', 'currentColor');
        arrowSvg.setAttribute('stroke-width', '2');
        arrowSvg.setAttribute('stroke-linecap', 'round');
        arrowSvg.setAttribute('stroke-linejoin', 'round');
        
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M5 12h14M12 5l7 7-7 7');
        arrowSvg.appendChild(path);

        button.appendChild(arrowSvg);

        // Add hover effect
        button.addEventListener('mouseenter', () => {
            button.style.backgroundColor = '#e6e6e6';
        });
        button.addEventListener('mouseleave', () => {
            button.style.backgroundColor = this.primaryColor;
        });

        // Add click handler
        button.addEventListener('click', (e) => {
            e.preventDefault();
            if (typeof this.onClick === 'function') {
                this.onClick();
            }
        });

        return button;
    }

    render() {
        return this.element;
    }
}