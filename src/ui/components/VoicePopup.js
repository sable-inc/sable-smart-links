/**
 * Voice Popup Component
 * Simple voice chat interface that follows SableSmartLinks patterns
 */

import { MinimizeButton } from './MinimizeButton.js';
import { debugLog } from '../../config.js';

export class VoicePopup {
  constructor(config) {
    this.config = {
      position: 'bottom-right',
      buttonText: {
        start: 'Start Voice Chat',
        stop: 'End Chat'
      },
      theme: {
        primaryColor: '#FFFFFF',
        backgroundColor: 'rgba(60, 60, 60, 0.9)'
      },
      onToggle: () => {},
      onMinimize: () => {},
      ...config
    };

    this.isMinimized = false;
    this.isActive = false;
    this.messages = [];
    this.status = 'Ready';

    this.element = this.createPopup();
    this.setupDragging();
  }

  createPopup() {
    const popup = document.createElement('div');
    
    const position = this.getPositionStyles();
    
    Object.assign(popup.style, {
      position: 'fixed',
      ...position,
      zIndex: '2147483647',
      width: '320px',
      maxHeight: '400px',
      display: 'flex',
      flexDirection: 'column',
      background: this.config.theme.backgroundColor,
      padding: '12px',
      borderRadius: '16px',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      backdropFilter: 'blur(8px)',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: this.config.theme.primaryColor,
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: 'grab',
      userSelect: 'none',
    });

    popup.className = 'sable-voice-popup';

    // Add drag handle
    const dragHandle = this.createDragHandle();
    popup.appendChild(dragHandle);

    // Add minimize button
    const minimizeButton = new MinimizeButton({
      onMinimize: () => this.minimize(),
      primaryColor: this.config.theme.primaryColor
    });
    popup.appendChild(minimizeButton.render());

    // Add content
    const content = this.createContent();
    popup.appendChild(content);

    return popup;
  }

  createDragHandle() {
    const handle = document.createElement('div');
    Object.assign(handle.style, {
      padding: '2px 0',
      cursor: 'grab',
      userSelect: 'none',
    });

    const bar = document.createElement('div');
    Object.assign(bar.style, {
      width: '32px',
      height: '4px',
      backgroundColor: 'rgba(255, 255, 255, 0.3)',
      borderRadius: '2px',
      margin: '0 auto',
    });

    handle.appendChild(bar);
    return handle;
  }

  createContent() {
    const container = document.createElement('div');
    Object.assign(container.style, {
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      marginTop: '8px',
    });

    // Status display
    this.statusElement = document.createElement('div');
    Object.assign(this.statusElement.style, {
      fontSize: '12px',
      opacity: '0.8',
      textAlign: 'center',
      padding: '4px',
    });
    this.statusElement.textContent = this.status;
    container.appendChild(this.statusElement);

    // Messages container
    this.messagesContainer = document.createElement('div');
    Object.assign(this.messagesContainer.style, {
      maxHeight: '200px',
      overflowY: 'auto',
      padding: '8px',
      backgroundColor: 'rgba(0, 0, 0, 0.2)',
      borderRadius: '8px',
      fontSize: '14px',
      lineHeight: '1.4',
    });
    container.appendChild(this.messagesContainer);

    // Control button
    this.controlButton = document.createElement('button');
    Object.assign(this.controlButton.style, {
      padding: '12px 16px',
      borderRadius: '8px',
      border: 'none',
      backgroundColor: this.config.theme.primaryColor,
      color: '#000',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    });
    
    this.updateControlButton();
    
    this.controlButton.addEventListener('click', () => {
      this.config.onToggle();
    });

    container.appendChild(this.controlButton);

    return container;
  }

  getPositionStyles() {
    const positions = {
      'bottom-right': { bottom: '20px', right: '20px' },
      'bottom-left': { bottom: '20px', left: '20px' },
      'top-right': { top: '20px', right: '20px' },
      'top-left': { top: '20px', left: '20px' },
    };
    return positions[this.config.position] || positions['bottom-right'];
  }

  setupDragging() {
    let isDragging = false;
    let dragStart = { x: 0, y: 0 };

    const handleDragStart = (e) => {
      if (e.target.closest('button')) return;
      
      isDragging = true;
      dragStart = { x: e.clientX, y: e.clientY };
      this.element.style.cursor = 'grabbing';
      e.preventDefault();
    };

    const handleMouseMove = (e) => {
      if (!isDragging) return;

      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;

      const rect = this.element.getBoundingClientRect();
      const newLeft = rect.left + deltaX;
      const newTop = rect.top + deltaY;

      this.element.style.left = `${Math.max(0, Math.min(window.innerWidth - rect.width, newLeft))}px`;
      this.element.style.top = `${Math.max(0, Math.min(window.innerHeight - rect.height, newTop))}px`;
      this.element.style.right = 'auto';
      this.element.style.bottom = 'auto';

      dragStart = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      if (isDragging) {
        isDragging = false;
        this.element.style.cursor = 'grab';
      }
    };

    this.element.addEventListener('mousedown', handleDragStart);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }

  updateControlButton() {
    if (this.controlButton) {
      this.controlButton.textContent = this.isActive 
        ? this.config.buttonText.stop 
        : this.config.buttonText.start;
    }
  }

  setActive(active) {
    this.isActive = active;
    this.updateControlButton();
  }

  setStatus(status) {
    this.status = status;
    if (this.statusElement) {
      this.statusElement.textContent = status;
    }
  }

  addMessage(message, isUser = false) {
    this.messages.push({ text: message, isUser, timestamp: Date.now() });
    this.updateMessagesDisplay();
  }

  updateMessagesDisplay() {
    if (!this.messagesContainer) return;

    this.messagesContainer.innerHTML = '';
    
    this.messages.slice(-10).forEach(msg => {
      const messageEl = document.createElement('div');
      Object.assign(messageEl.style, {
        marginBottom: '8px',
        padding: '6px 8px',
        borderRadius: '6px',
        backgroundColor: msg.isUser ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)',
      });
      
      const prefix = msg.isUser ? 'You: ' : 'AI: ';
      messageEl.textContent = prefix + msg.text;
      
      this.messagesContainer.appendChild(messageEl);
    });

    // Scroll to bottom
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  minimize() {
    this.isMinimized = true;
    this.element.style.display = 'none';
    this.config.onMinimize();
  }

  restore() {
    this.isMinimized = false;
    this.element.style.display = 'flex';
  }

  render() {
    return this.element;
  }

  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
}