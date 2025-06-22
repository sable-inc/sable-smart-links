import { ChatMessages } from './ChatMessages.js';
import { ChatInput } from './ChatInput.js';

export class ExpandedWithMessages {
    constructor({ messages, chatInput, primaryColor, onMinimize, customButtons = [] }) {
        console.log('ExpandedWithMessages constructor called with messages:', messages);
        this.messages = messages || []; // Store messages and initialize as empty array if undefined
        this.chatInput = chatInput;
        this.primaryColor = primaryColor;
        this.onMinimize = onMinimize;
        this.customButtons = customButtons;
        this.messagesComponent = null; // Store reference to the ChatMessages component
        this.element = this.createElement({ messages, chatInput, primaryColor });
    }

    createElement({ messages, chatInput, primaryColor }) {
        console.log('Creating ExpandedWithMessages element');
        const container = document.createElement('div');
        Object.assign(container.style, {
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            opacity: '1',
            transform: 'translateY(0)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        });
        
        // Add header with minimize button if onMinimize is provided
        if (this.onMinimize) {
            const header = document.createElement('div');
            Object.assign(header.style, {
                display: 'flex',
                justifyContent: 'flex-end',
                marginBottom: '8px'
            });
            
            const minimizeButton = document.createElement('button');
            minimizeButton.innerHTML = '−'; // Unicode minus sign
            Object.assign(minimizeButton.style, {
                background: 'transparent',
                border: 'none',
                color: this.primaryColor,
                fontSize: '20px',
                cursor: 'pointer',
                padding: '0 8px',
                lineHeight: '20px'
            });
            minimizeButton.addEventListener('click', this.onMinimize);
            header.appendChild(minimizeButton);
            container.appendChild(header);
        }
        
        console.log('Creating ChatMessages component');
        this.messagesComponent = new ChatMessages({
            messages: this.messages,
            primaryColor: this.primaryColor,
            isThinking: false // Initialize with no thinking state
        });
        
        // Add class to make it easier to find
        const messagesElement = this.messagesComponent.render();
        messagesElement.classList.add('messages-container');
        
        container.appendChild(messagesElement);
        console.log('ChatMessages component rendered');
        
        // Add custom buttons if provided
        if (this.customButtons && this.customButtons.length > 0) {
            const buttonsContainer = document.createElement('div');
            Object.assign(buttonsContainer.style, {
                display: 'flex',
                justifyContent: 'center',
                gap: '10px',
                marginTop: '10px',
                marginBottom: '10px'
            });
            
            this.customButtons.forEach(buttonConfig => {
                const button = document.createElement('button');
                button.textContent = buttonConfig.text;
                Object.assign(button.style, {
                    padding: '8px 16px',
                    borderRadius: '20px',
                    border: buttonConfig.primary ? 'none' : `1px solid ${this.primaryColor}`,
                    background: buttonConfig.primary ? this.primaryColor : 'transparent',
                    color: buttonConfig.primary ? '#000' : this.primaryColor,
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    transition: 'all 0.2s ease'
                });
                
                button.addEventListener('click', buttonConfig.onClick);
                buttonsContainer.appendChild(button);
            });
            
            container.appendChild(buttonsContainer);
        }
        
        // Wrap chat input in a container that takes full width and extends to the edges
        const chatInputWrapper = document.createElement('div');
        Object.assign(chatInputWrapper.style, {
            width: 'calc(100% + 32px)', // Account for parent's padding (16px on each side)
            marginLeft: '-16px', // Negative margin to extend beyond parent padding
            marginTop: 'auto', // Push to bottom
        });
        
        chatInputWrapper.appendChild(this.chatInput.render());
        container.appendChild(chatInputWrapper);

        // Scroll to bottom after render
        setTimeout(() => this.messagesComponent.scrollToBottom(), 0);

        return container;
    }

    render() {
        return this.element;
    }
}