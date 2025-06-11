// components/ChatMessages.js
class ChatMessages {
    constructor({ messages, primaryColor }) {
        this.messages = messages;
        this.primaryColor = primaryColor;
        this.element = this.createElement();
    }

    createElement() {
        const container = document.createElement('div');
        Object.assign(container.style, {
            flex: '1',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            maxHeight: '300px',
            paddingTop: '8px',
            marginBottom: '8px',
        });

        this.messages.forEach(message => {
            const messageElement = document.createElement('div');
            Object.assign(messageElement.style, {
                alignSelf: message.type === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '80%',
                backgroundColor: message.type === 'user' 
                    ? 'rgba(255, 255, 255, 0.9)'
                    : 'rgba(80, 80, 80, 0.6)',
                color: message.type === 'user' ? '#000' : this.primaryColor,
                padding: '8px 12px',
                borderRadius: '12px',
                fontSize: '13px',
                lineHeight: '1.4',
            });

            if (message.type === 'loading') {
                messageElement.innerHTML = `
                    <div class="loading-spinner"></div>
                    <style>
                        .loading-spinner {
                            width: 20px;
                            height: 20px;
                            border: 2px solid rgba(255, 255, 255, 0.3);
                            border-radius: 50%;
                            border-top-color: ${this.primaryColor};
                            animation: spin 1s linear infinite;
                        }
                        @keyframes spin {
                            to { transform: rotate(360deg); }
                        }
                    </style>
                `;
            } else {
                messageElement.textContent = message.content;
            }

            container.appendChild(messageElement);
        });

        return container;
    }

    render() {
        return this.element;
    }

    scrollToBottom() {
        this.element.scrollTop = this.element.scrollHeight;
    }
}