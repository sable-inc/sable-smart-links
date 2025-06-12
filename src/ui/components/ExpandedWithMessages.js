import { ChatMessages } from './ChatMessages.js';
import { ChatInput } from './ChatInput.js';

export class ExpandedWithMessages {
    constructor({ messages, chatInput, primaryColor }) {
        console.log('ExpandedWithMessages constructor called with messages:', messages);
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
        const messagesComponent = new ChatMessages({
            messages,
            primaryColor
        });

        container.appendChild(messagesComponent.render());
        console.log('ChatMessages component rendered');
        container.appendChild(chatInput.render());

        // Scroll to bottom after render
        setTimeout(() => messagesComponent.scrollToBottom(), 0);

        return container;
    }

    render() {
        return this.element;
    }
}