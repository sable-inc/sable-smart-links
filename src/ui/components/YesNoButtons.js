// components/YesNoButtons.js
export class YesNoButtons {
    constructor(onYesNo, primaryColor = '#FFFFFF') {
        this.onYesNo = onYesNo;
        this.primaryColor = primaryColor;
        this.isLoading = false;
        this.element = this.createButtons();
    }

    createButtons() {
        const container = document.createElement('div');
        Object.assign(container.style, {
            display: 'flex',
            gap: '4px',
        });

        // Yes button
        this.yesButton = document.createElement('button');
        Object.assign(this.yesButton.style, {
            padding: '6px 12px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: this.primaryColor,
            color: '#000',
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontWeight: '500',
        });

        this.yesButton.textContent = 'Yes';
        this.yesButton.addEventListener('click', () => {
            if (!this.isLoading) {
                this.onYesNo(true);
            }
        });
        this.yesButton.addEventListener('mouseover', () => {
            if (!this.isLoading) {
                this.yesButton.style.transform = 'scale(1.05)';
            }
        });
        this.yesButton.addEventListener('mouseout', () => {
            if (!this.isLoading) {
                this.yesButton.style.transform = 'scale(1)';
            }
        });

        // No button
        this.noButton = document.createElement('button');
        Object.assign(this.noButton.style, {
            padding: '6px 12px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: '#4A4A4A',
            color: this.primaryColor,
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontWeight: '500',
        });

        this.noButton.textContent = 'No';
        this.noButton.addEventListener('click', () => {
            if (!this.isLoading) {
                this.onYesNo(false);
            }
        });
        this.noButton.addEventListener('mouseover', () => {
            if (!this.isLoading) {
                this.noButton.style.transform = 'scale(1.05)';
                this.noButton.style.backgroundColor = '#5A5A5A';
            }
        });
        this.noButton.addEventListener('mouseout', () => {
            if (!this.isLoading) {
                this.noButton.style.transform = 'scale(1)';
                this.noButton.style.backgroundColor = '#4A4A4A';
            }
        });

        container.appendChild(this.yesButton);
        container.appendChild(this.noButton);
        return container;
    }

    setLoading(isLoading) {
        if (this.isLoading === isLoading) return; // No change needed

        this.isLoading = isLoading;

        // Update button appearances
        if (isLoading) {
            // Disable both buttons
            this.yesButton.style.cursor = 'not-allowed';
            this.noButton.style.cursor = 'not-allowed';

            // Reduce opacity and add pulsing animation
            this.yesButton.style.opacity = '0.6';
            this.noButton.style.opacity = '0.6';

            // Add pulsing animation
            this.yesButton.style.animation = 'pulse 1.5s ease-in-out infinite';
            this.noButton.style.animation = 'pulse 1.5s ease-in-out infinite';

            // Reset transforms
            this.yesButton.style.transform = 'scale(1)';
            this.noButton.style.transform = 'scale(1)';
        } else {
            // Re-enable both buttons
            this.yesButton.style.cursor = 'pointer';
            this.noButton.style.cursor = 'pointer';

            // Restore opacity and remove animation
            this.yesButton.style.opacity = '1';
            this.noButton.style.opacity = '1';

            // Remove pulsing animation
            this.yesButton.style.animation = 'none';
            this.noButton.style.animation = 'none';
        }
    }

    render() {
        return this.element;
    }
}