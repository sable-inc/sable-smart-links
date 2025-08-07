/**
 * End Tour Button Component
 * A fixed button at the bottom of the screen to end the current walkthrough
 */

export class EndTourButton {
  constructor(onEndTour) {
    this.onEndTour = onEndTour;
    this.isVisible = false;

    // Create the button element
    this.button = document.createElement('button');
    this.button.id = 'sable-end-tour-button';

    // Apply styles to match MenuTrigger design
    Object.assign(this.button.style, {
      position: 'fixed',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: '99999',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      opacity: '0',
      visibility: 'hidden',
      transition: 'opacity 0.2s ease',
      background: 'rgba(0, 0, 0, 0.8)',
      padding: '14px 20px',
      borderRadius: '30px',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      backdropFilter: 'blur(8px)',
      cursor: 'pointer',
      flexShrink: '0',
      alignSelf: 'center',
      margin: '0 10px',
      fontSize: '14px',
      color: '#FFFFFF',
      fontWeight: '500',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    });

    // Add button content
    this.button.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 6L6 18M6 6l12 12"/>
      </svg>
      End Tour
    `;

    // Add event listeners to match MenuTrigger behavior
    this.button.addEventListener('mouseover', () => {
      this.button.style.opacity = '1';
    });

    this.button.addEventListener('mouseout', () => {
      if (this.isVisible) {
        this.button.style.opacity = '0.7';
      }
    });

    this.button.addEventListener('click', () => {
      if (typeof this.onEndTour === 'function') {
        this.onEndTour();
      }
    });

    // Add to document
    if (document.body) {
      document.body.appendChild(this.button);
    }
  }

  /**
   * Show the end tour button
   */
  show() {
    if (this.isVisible) return;

    this.isVisible = true;
    this.button.style.opacity = '0.7';
    this.button.style.visibility = 'visible';

    // Add entrance animation
    this.button.style.transform = 'translateX(-50%) translateY(20px)';
    setTimeout(() => {
      this.button.style.transform = 'translateX(-50%) translateY(0)';
    }, 10);
  }

  /**
   * Hide the end tour button
   */
  hide() {
    if (!this.isVisible) return;

    this.isVisible = false;
    this.button.style.opacity = '0';
    this.button.style.visibility = 'hidden';
    this.button.style.transform = 'translateX(-50%) translateY(20px)';
  }

  /**
   * Remove the button from the DOM
   */
  destroy() {
    if (this.button && this.button.parentNode) {
      this.button.parentNode.removeChild(this.button);
    }
  }

  /**
   * Check if the button is currently visible
   */
  isButtonVisible() {
    return this.isVisible;
  }
} 