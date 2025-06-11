// Import all required components
import { MinimizedState } from './components/MinimizedState.js';
import { TextInputOnly } from './components/TextInputOnly.js';
import { ExpandedWithShortcuts } from './components/ExpandedWithShortcuts.js';
import { ExpandedWithMessages } from './components/ExpandedWithMessages.js';
import { ChatInput } from './components/ChatInput.js';

// PopupStateManager.js
export class PopupStateManager {
    constructor(config) {
        this.config = {
            platform: config.platform || 'Sable',
            primaryColor: config.primaryColor || '#FFFFFF',
            width: config.width || 380,
            onChatSubmit: config.onChatSubmit || (() => {}),
        };

        // State variables
        this.currentState = 'textInput'; // possible states: 'textInput', 'expanded', 'messages', 'minimized'
        this.previousState = null; // Store the state before minimization
        this.messages = [];
        this.chatInput = '';
        this.recentQueries = [
            'Request for Explanation Clarification',
            'Understanding Transformer Architecture Impact',
            'Explaining Transformer Architecture'
        ];
        this.shortcuts = [
            'How does this work?',
            'Show me examples',
            'What are the best practices?'
        ];

        // Create container
        this.container = document.createElement('div');
        this.setupContainer();
        
        // Initial render
        this.render();
    }

    setupContainer() {
        Object.assign(this.container.style, {
            position: 'fixed',
            top: '320px',
            left: '32px',
            zIndex: 2147483647,
            width: `${this.config.width}px`,
            display: 'flex',
            flexDirection: 'column',
            background: `radial-gradient(
                circle at center,
                rgba(60, 60, 60, 0.5) 0%,
                rgba(60, 60, 60, 0.65) 100%
            )`,
            padding: '16px',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(8px)',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            color: this.config.primaryColor,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            userSelect: 'none',
            maxHeight: '400px',
            opacity: 1,
            transform: 'scale(1)',
            transformOrigin: 'bottom center',
            overflow: 'hidden',
        });
    }

    handleInputChange = (event) => {
        this.chatInput = event.target.value;
        
        // If in textInput state and user starts typing, transition to expanded state
        if (this.currentState === 'textInput' && this.chatInput.length > 0) {
            this.transitionTo('expanded');
        }
    }

    handleSubmit = async () => {
        console.log('handleSubmit called, current state:', this.currentState);
        if (!this.chatInput.trim()) return;

        const userMessage = this.chatInput.trim();
        
        // First transition to messages state
        this.currentState = 'messages';
        
        // Add user message
        this.messages.push({ type: 'user', content: userMessage });
        
        // Clear input
        const inputText = this.chatInput;
        this.chatInput = '';

        // Render immediately to show user message
        this.render();

        // Show thinking indicator
        const messagesComponent = this.container.querySelector('.messages-container');
        if (messagesComponent) {
            messagesComponent.setThinking(true);
        }

        // Add quick test response after a delay
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay

        // Hide thinking indicator
        if (messagesComponent) {
            messagesComponent.setThinking(false);
        }

        // Add response
        this.messages.push({ 
            type: 'assistant', 
            content: `Test message - You said: "${inputText}"`
        });
        this.render();
    }

    handleMinimize = () => {
        this.previousState = this.currentState;
        this.transitionTo('minimized');
    }

    handleMaximize = () => {
        if (this.previousState) {
            this.transitionTo(this.previousState);
            this.previousState = null;
        } else {
            this.transitionTo('textInput');
        }
    }

    handleShortcutSelect = (text) => {
        this.chatInput = text;
        this.handleSubmit();
    }

    transitionTo(newState) {
        console.log(`Transitioning from ${this.currentState} to ${newState}`);
        this.currentState = newState;
        this.render();
    }

    render() {
        console.log('Rendering PopupStateManager, current state:', this.currentState);
        // Clear existing content
        this.container.innerHTML = '';

        // Update container styles based on state
        if (this.currentState === 'minimized') {
            Object.assign(this.container.style, {
                width: 'auto',
                padding: '8px 16px',
                cursor: 'pointer',
            });
        } else {
            Object.assign(this.container.style, {
                width: `${this.config.width}px`,
                padding: '16px',
                cursor: 'default',
            });
        }

        let component;
        switch (this.currentState) {
            case 'minimized':
                component = new MinimizedState({
                    onClick: this.handleMaximize,
                    primaryColor: this.config.primaryColor
                });
                break;

            case 'textInput':
                component = new TextInputOnly({
                    onSubmit: this.handleSubmit,
                    onInputChange: this.handleInputChange,
                    onExpand: () => this.transitionTo('expanded'),
                    platform: this.config.platform,
                    primaryColor: this.config.primaryColor,
                    onMinimize: this.handleMinimize,
                    value: this.chatInput
                });
                break;

            case 'expanded':
                const chatInput = new ChatInput({
                    value: this.chatInput,
                    onChange: (e) => this.handleInputChange(e),
                    onSubmit: () => this.handleSubmit(),
                    platform: this.config.platform,
                    primaryColor: this.config.primaryColor
                });

                component = new ExpandedWithShortcuts({
                    recentQueries: this.recentQueries,
                    shortcuts: this.shortcuts,
                    onQuerySelect: this.handleShortcutSelect,
                    chatInput: chatInput,
                    primaryColor: this.config.primaryColor,
                    onMinimize: this.handleMinimize,
                    onSubmit: () => this.handleSubmit()
                });
                break;

            case 'messages':
                console.log('Creating ExpandedWithMessages component with messages:', this.messages);
                component = new ExpandedWithMessages({
                    messages: this.messages,
                    chatInput: new ChatInput({
                        value: this.chatInput,
                        onChange: this.handleInputChange,
                        onSubmit: this.handleSubmit,
                        platform: this.config.platform,
                        primaryColor: this.config.primaryColor
                    }),
                    primaryColor: this.config.primaryColor,
                    onMinimize: this.handleMinimize
                });
                break;
        }

        console.log('Created component:', component);
        this.container.appendChild(component.render());
    }

    mount(parentElement) {
        parentElement.appendChild(this.container);
    }

    unmount() {
        this.container.remove();
    }
}



            
// Usage example:
// const popup = new PopupStateManager({
//     platform: 'Sable',
//     primaryColor: '#FFFFFF',
//     width: 380,
//     onChatSubmit: async (message) => {
//         // Handle chat submission
//         return 'Response from assistant';
//     }
// });

// // Mount to document body or any other element
// popup.mount(document.body);










