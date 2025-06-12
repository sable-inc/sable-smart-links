// components/ChatMessages.js
export class ChatMessages {
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

        // Render existing messages without animation
        this.messages.forEach((message, index) => {
            const messageWrapper = this.createMessageElement(message, index, false);
            container.appendChild(messageWrapper);
        });

        return container;
    }

    createMessageElement(message, index, shouldAnimate = false) {
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
            opacity: shouldAnimate ? '0' : '1',
            transform: shouldAnimate ? 'translateY(10px)' : 'none',
            animation: shouldAnimate ? 'messageAppear 0.3s ease forwards' : 'none',
        });

        const textSpan = document.createElement('span');
        if (shouldAnimate) {
            textSpan.textContent = ''; // Start empty for animation
            // Add cursor for typing animation
            const cursor = document.createElement('span');
            Object.assign(cursor.style, {
                borderRight: '2px solid currentColor',
                marginLeft: '2px',
                animation: 'blink 1s step-end infinite',
            });
            messageElement.appendChild(cursor);
            
            // Start the typing animation
            this.animateText(textSpan, cursor, message.content);
        } else {
            textSpan.textContent = message.content; // Show full text immediately
        }
        
        messageElement.appendChild(textSpan);
        messageWrapper.appendChild(messageElement);
        return messageWrapper;
    }

    async animateText(textSpan, cursor, text) {
        const charDelay = 10; // Super fast animation - 10ms between characters
        for (let i = 0; i <= text.length; i++) {
            textSpan.textContent = text.slice(0, i);
            await new Promise(resolve => setTimeout(resolve, charDelay));
        }
        // Hide cursor after animation
        cursor.style.display = 'none';
    }

    createThinkingIndicator() {
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
        return thinkingWrapper;
    }

    setThinking(isThinking) {
        // Remove existing thinking indicator if any
        const existingThinking = this.element.querySelector('.thinking-indicator');
        if (existingThinking) {
            existingThinking.remove();
        }

        if (isThinking) {
            const thinkingIndicator = this.createThinkingIndicator();
            thinkingIndicator.classList.add('thinking-indicator');
            this.element.appendChild(thinkingIndicator);
            this.scrollToBottom();
        }
    }

    render() {
        return this.element;
    }

    scrollToBottom() {
        this.element.scrollTop = this.element.scrollHeight;
    }

    // Method to add a new message
    addMessage(message) {
        // Create new message with animation
        const messageWrapper = this.createMessageElement(message, this.messages.length, true);
        this.element.appendChild(messageWrapper);
        this.messages.push(message);
        this.scrollToBottom();
    }
}