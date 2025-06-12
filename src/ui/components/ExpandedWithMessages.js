import { ChatMessages } from './ChatMessages.js';
import { ChatInput } from './ChatInput.js';

export class ExpandedWithMessages {
    constructor({ messages, chatInput, primaryColor }) {
        console.log('ExpandedWithMessages constructor called with messages:', messages);
        this.messages = messages || []; // Store messages and initialize as empty array if undefined
        this.chatInput = chatInput;
        this.primaryColor = primaryColor;
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
        container.appendChild(this.chatInput.render());

        // Scroll to bottom after render
        setTimeout(() => this.messagesComponent.scrollToBottom(), 0);

        return container;
    }

    render() {
        return this.element;
    }
}