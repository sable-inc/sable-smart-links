// components/ArrowButton.js
export class ArrowButton {
    constructor(onClick) {
        this.onClick = onClick;
        this.isLoading = false;

        // Create the button element
        this.button = document.createElement('button');
        Object.assign(this.button.style, {
            padding: '5px',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            color: '#000000',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            position: 'relative'
        });

        // Add event listeners
        this.button.addEventListener('mouseover', () => {
            if (!this.isLoading) {
                this.button.style.transform = 'scale(1.05)';
                this.button.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
                this.button.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
            }
        });

        this.button.addEventListener('mouseout', () => {
            if (!this.isLoading) {
                this.button.style.transform = 'scale(1)';
                this.button.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
                this.button.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
            }
        });

        this.button.addEventListener('click', () => {
            if (!this.isLoading) {
                this.onClick();
            }
        });

        // Add arrow icon
        this.updateButtonContent();
    }

    updateButtonContent() {
        if (this.isLoading) {
            // Show spinner
            this.button.innerHTML = `
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
        } else {
            // Show arrow
            this.button.innerHTML = `
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
                        stroke-width="3.5"
                        stroke-linecap="round" 
                        stroke-linejoin="round"
                    />
                </svg>
            `;
        }
    }

    setLoading(isLoading) {
        if (this.isLoading === isLoading) return; // No change needed

        this.isLoading = isLoading;

        // Update button appearance
        if (isLoading) {
            this.button.style.cursor = 'not-allowed';
            this.button.style.backgroundColor = 'rgba(200, 200, 200, 0.7)';
            this.button.style.transform = 'scale(1)';
            this.button.style.opacity = '0.7';
        } else {
            this.button.style.cursor = 'pointer';
            this.button.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
            this.button.style.opacity = '1';
        }

        // Update content (arrow or spinner)
        this.updateButtonContent();
    }

    render() {
        return this.button;
    }
}
