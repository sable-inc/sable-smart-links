// components/YesNoButtons.js
export class YesNoButtons {
    constructor(onYesNo, primaryColor = '#FFFFFF') {
        this.element = this.createButtons(onYesNo, primaryColor);
    }

    createButtons(onYesNo, primaryColor) {
        const container = document.createElement('div');
        Object.assign(container.style, {
            display: 'flex',
            gap: '4px',
        });

        // Yes button
        const yesButton = document.createElement('button');
        Object.assign(yesButton.style, {
            padding: '6px 12px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: primaryColor,
            color: '#000',
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontWeight: '500',
        });

        yesButton.textContent = 'Yes';
        yesButton.addEventListener('click', () => onYesNo(true));
        yesButton.addEventListener('mouseover', () => {
            yesButton.style.transform = 'scale(1.05)';
        });
        yesButton.addEventListener('mouseout', () => {
            yesButton.style.transform = 'scale(1)';
        });

        // No button
        const noButton = document.createElement('button');
        Object.assign(noButton.style, {
            padding: '6px 12px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: '#000000',
            color: primaryColor,
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontWeight: '500',
        });

        noButton.textContent = 'No';
        noButton.addEventListener('click', () => onYesNo(false));
        noButton.addEventListener('mouseover', () => {
            noButton.style.transform = 'scale(1.05)';
            noButton.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        });
        noButton.addEventListener('mouseout', () => {
            noButton.style.transform = 'scale(1)';
            noButton.style.backgroundColor = '#000000';
        });

        container.appendChild(yesButton);
        container.appendChild(noButton);
        return container;
    }

    render() {
        return this.element;
    }
}