// components/ChatMessages.js
class ChatMessages {
    constructor({ messages, primaryColor, isThinking }) {
        this.messages = messages;
        this.primaryColor = primaryColor;
        this.isThinking = isThinking;
        this.visibleCharacters = {};
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

        // Add styles for animations
        const style = document.createElement('style');
        style.textContent = `
            @keyframes messageAppear {
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            @keyframes blink {
                from, to { opacity: 1; }
                50% { opacity: 0; }
            }

            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.3; }
            }
        `;
        container.appendChild(style);

        // Render messages
        this.messages.forEach((message, index) => {
            const messageWrapper = document.createElement('div');
            Object.assign(messageWrapper.style, {
                alignSelf: message.type === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '80%',
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start',
            });

            const messageElement = document.createElement('div');
            const messageStyles = message.type === 'user' ? {
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                color: '#000',
                padding: '8px 12px',
                borderRadius: '12px',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                maxWidth: '280px',
                wordWrap: 'break-word',
                overflowWrap: 'break-word',
                whiteSpace: 'pre-wrap',
            } : {
                color: this.primaryColor,
                padding: '8px 0',
                maxWidth: '100%',
                whiteSpace: 'pre-wrap',
            };

            Object.assign(messageElement.style, {
                ...messageStyles,
                fontSize: '13px',
                lineHeight: '1.4',
                opacity: '0',
                transform: 'translateY(10px)',
                animation: 'messageAppear 0.3s ease forwards',
            });

            // Create text span for animated text
            const textSpan = document.createElement('span');
            messageElement.appendChild(textSpan);

            // Add cursor for animation
            const cursor = document.createElement('span');
            Object.assign(cursor.style, {
                borderRight: '2px solid currentColor',
                marginLeft: '2px',
                animation: 'blink 1s step-end infinite',
            });
            messageElement.appendChild(cursor);

            messageWrapper.appendChild(messageElement);
            container.appendChild(messageWrapper);
        });

        // Add thinking indicator if needed
        if (this.isThinking) {
            const thinkingWrapper = document.createElement('div');
            Object.assign(thinkingWrapper.style, {
                alignSelf: 'flex-start',
                color: this.primaryColor,
                padding: '8px 0',
                fontSize: '13px',
                lineHeight: '1.4',
                opacity: '0',
                transform: 'translateY(10px)',
                animation: 'messageAppear 0.3s ease forwards',
            });

            const thinkingText = document.createElement('span');
            Object.assign(thinkingText.style, {
                animation: 'pulse 2s ease-in-out infinite',
                display: 'inline-block',
            });
            thinkingText.textContent = 'thinking';

            thinkingWrapper.appendChild(thinkingText);
            container.appendChild(thinkingWrapper);
        }

        return container;
    }

    async animateText(messageIndex, text) {
        const messageElement = this.element.children[messageIndex].querySelector('span');
        const cursor = messageElement.nextSibling;
        const charDelay = 20; // 20ms between characters

        for (let i = 0; i <= text.length; i++) {
            messageElement.textContent = text.slice(0, i);
            await new Promise(resolve => setTimeout(resolve, charDelay));
        }

        // Remove cursor after animation
        setTimeout(() => {
            cursor.style.display = 'none';
        }, 500);
    }

    render() {
        return this.element;
    }

    scrollToBottom() {
        this.element.scrollTop = this.element.scrollHeight;
    }

    // Method to add a new message and animate it
    async addMessage(message) {
        const messageIndex = this.messages.length;
        this.messages.push(message);
        
        // Create and add new message element
        const messageWrapper = document.createElement('div');
        // ... (same styling as in createElement)

        this.element.appendChild(messageWrapper);
        await this.animateText(messageIndex, message.content);
        this.scrollToBottom();
    }

    // Method to show/hide thinking state
    setThinking(isThinking) {
        this.isThinking = isThinking;
        // Remove existing thinking indicator if any
        const existingThinking = this.element.querySelector('.thinking-indicator');
        if (existingThinking) {
            existingThinking.remove();
        }

        if (isThinking) {
            // Add new thinking indicator
            // ... (same code as thinking indicator in createElement)
        }
        this.scrollToBottom();
    }
}