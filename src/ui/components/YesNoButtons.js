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
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
        });

        // Create text span for Yes button
        this.yesText = document.createElement('span');
        this.yesText.textContent = 'Yes';
        this.yesButton.appendChild(this.yesText);
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
            this.yesButton.disabled = true;
            this.noButton.disabled = true;
            this.yesButton.style.cursor = 'not-allowed';
            this.noButton.style.cursor = 'not-allowed';

            // Reduce opacity
            this.yesButton.style.opacity = '0.6';
            this.noButton.style.opacity = '0.6';

            // Reset transforms
            this.yesButton.style.transform = 'scale(1)';
            this.noButton.style.transform = 'scale(1)';

            // Add spinner next to Yes text
            this.yesSpinner = document.createElement('div');
            this.yesSpinner.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" 
                        stroke="#888" 
                        stroke-width="3" 
                        fill="none" 
                        stroke-opacity="0.25" />
                    <path d="M12 2C6.47715 2 2 6.47715 2 12"
                        stroke="#333" 
                        stroke-width="3" 
                        stroke-linecap="round">
                        <animateTransform 
                            attributeName="transform" 
                            type="rotate" 
                            from="0 12 12" 
                            to="360 12 12" 
                            dur="0.8s" 
                            repeatCount="indefinite" />
                    </path>
                </svg>
            `;
            this.yesButton.appendChild(this.yesSpinner);
        } else {
            // Re-enable both buttons
            this.yesButton.disabled = false;
            this.noButton.disabled = false;
            this.yesButton.style.cursor = 'pointer';
            this.noButton.style.cursor = 'pointer';

            // Restore opacity
            this.yesButton.style.opacity = '1';
            this.noButton.style.opacity = '1';

            // Remove spinner from Yes button
            if (this.yesSpinner) {
                this.yesButton.removeChild(this.yesSpinner);
                this.yesSpinner = null;
            }
        }
    }

    render() {
        return this.element;
    }
}