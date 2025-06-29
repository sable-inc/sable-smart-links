// components/ChatMessages.js
export class ChatMessages {
    constructor({ messages, primaryColor, isThinking }) {
        this.messages = messages || []; // Initialize as empty array if undefined
        this.primaryColor = primaryColor;
        this.isThinking = isThinking;
        this.visibleCharacters = {};
        this.messageElements = new Map(); // Store references to message elements
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
        messageWrapper.dataset.messageIndex = index;
        
        Object.assign(messageWrapper.style, {
            alignSelf: message.type === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '80%',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start',
            opacity: '1', // Always start visible for user messages
            transform: 'none', // No transform for user messages
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
            opacity: '1',
            transform: 'none',
            animation: 'none'
        } : {
            color: this.primaryColor,
            padding: '8px 0',
            maxWidth: '100%',
            whiteSpace: 'pre-wrap',
            opacity: shouldAnimate ? '0' : '1',
            transform: shouldAnimate ? 'translateY(10px)' : 'none',
            animation: shouldAnimate ? 'messageAppear 0.3s ease forwards' : 'none',
        };

        Object.assign(messageElement.style, {
            ...messageStyles,
            fontSize: '15px',
            lineHeight: '1.4',
        });

        const textSpan = document.createElement('span');
        textSpan.classList.add('message-text');
        textSpan.textContent = message.content; // Always show full content for user messages
        
        const cursor = document.createElement('span');
        Object.assign(cursor.style, {
            borderRight: '2px solid currentColor',
            marginLeft: '2px',
            animation: 'blink 1s step-end infinite',
            display: 'none', // Never show cursor for user messages
        });
        cursor.classList.add('typing-cursor');
        
        messageElement.appendChild(textSpan);
        if (message.type !== 'user') {
            messageElement.appendChild(cursor); // Only add cursor for non-user messages
        }
        messageWrapper.appendChild(messageElement);
        
        this.messageElements.set(index, {
            wrapper: messageWrapper,
            textSpan: textSpan,
            cursor: cursor
        });
        
        return messageWrapper;
    }

    async animateText(messageIndex, text) {
        const elements = this.messageElements.get(messageIndex);
        if (!elements) return;
        
        const { textSpan, cursor } = elements;
        const charDelay = 20; // 20ms between characters for a natural typing effect
        
        // Show the cursor during typing
        cursor.style.display = 'inline-block';
        
        // Scroll frequency - only scroll every few characters to improve performance
        const scrollFrequency = 5;
        
        for (let i = 0; i <= text.length; i++) {
            textSpan.textContent = text.slice(0, i);
            
            // Scroll to bottom periodically during typing and on line breaks
            if (i % scrollFrequency === 0 || text[i-1] === '\n') {
                this.scrollToBottom();
            }
            
            await new Promise(resolve => setTimeout(resolve, charDelay));
        }
        
        // Final scroll to ensure we're at the bottom when animation completes
        this.scrollToBottom();
        
        // Hide cursor after animation completes
        cursor.style.display = 'none';
    }

    createThinkingIndicator() {
        const thinkingWrapper = document.createElement('div');
        Object.assign(thinkingWrapper.style, {
            alignSelf: 'flex-start',
            color: this.primaryColor,
            padding: '8px 0',
            fontSize: '15px',
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
    async addMessage(message, animate = true) {
        const messageIndex = this.messages.length;
        
        // For user messages: no animation at all
        if (message.type === 'user') {
            const messageWrapper = this.createMessageElement(message, messageIndex, false);
            this.element.appendChild(messageWrapper);
            this.messages.push(message);
            this.scrollToBottom();
            return messageIndex;
        }
        
        // For model responses: animate if requested
        const messageWrapper = this.createMessageElement(message, messageIndex, animate);
        this.element.appendChild(messageWrapper);
        this.messages.push(message);
        this.scrollToBottom();
        
        if (animate) {
            await this.animateText(messageIndex, message.content);
        }
        
        return messageIndex;
    }
    
    // Method to animate an existing message by index
    async animateMessage(index) {
        if (index < 0 || index >= this.messages.length) return;
        
        const message = this.messages[index];
        const elements = this.messageElements.get(index);
        
        if (!elements) return;
        
        // Reset the text content to empty to prepare for animation
        elements.textSpan.textContent = '';
        
        // Show the cursor during typing
        elements.cursor.style.display = 'inline-block';
        
        // Animate the text
        await this.animateText(index, message.content);
    }
}