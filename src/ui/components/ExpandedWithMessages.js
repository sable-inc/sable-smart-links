// components/ExpandedWithMessages.js
class ExpandedWithMessages {
    constructor({ messages, chatInput, primaryColor, onMinimize }) {
        this.element = this.createElement({ messages, chatInput, primaryColor, onMinimize });
    }

    createElement({ messages, chatInput, primaryColor, onMinimize }) {
        const container = document.createElement('div');
        Object.assign(container.style, {
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            opacity: '1',
            transform: 'translateY(0)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        });

        const minimizeButton = new MinimizeButton({
            onMinimize,
            primaryColor
        });

        container.appendChild(minimizeButton.render());
        
        const messagesComponent = new ChatMessages({
            messages,
            primaryColor
        });

        container.appendChild(messagesComponent.render());
        container.appendChild(chatInput.render());

        // Scroll to bottom after render
        setTimeout(() => messagesComponent.scrollToBottom(), 0);

        return container;
    }

    render() {
        return this.element;
    }
}