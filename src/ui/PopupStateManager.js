// Import all required components
import { MinimizedState } from './components/MinimizedState.js';
import { TextInputOnly } from './components/TextInputOnly.js';
import { ExpandedWithShortcuts } from './components/ExpandedWithShortcuts.js';
import { ExpandedWithMessages } from './components/ExpandedWithMessages.js';
import { ChatInput } from './components/ChatInput.js';
import { MinimizeButton } from './components/MinimizeButton.js';

// PopupStateManager.js
export class PopupStateManager {
    constructor(config) {
        this.config = {
            platform: config.platform || 'Sable',
            primaryColor: config.primaryColor || '#FFFFFF',
            width: config.width || 380,
            onChatSubmit: config.onChatSubmit || (() => {}),
            onWalkthroughSelect: config.onWalkthroughSelect || (() => {}),
            customButtons: config.customButtons || [],
            initialMessage: config.initialMessage || null,
            shortcuts: config.shortcuts || [],
            productWalkthroughs: config.productWalkthroughs || []
        };

        // State variables
        this.currentState = 'textInput'; // possible states: 'textInput', 'expanded', 'messages', 'minimized'
        this.previousState = null; // Store the state before minimization
        this.messages = [];
        
        // If we have an initial message, add it and start in messages state
        if (this.config.initialMessage) {
            this.messages.push({
                role: 'assistant',
                content: this.config.initialMessage,
                timestamp: Date.now()
            });
            this.currentState = 'messages';
        }
        
        this.chatInput = '';
        // Only use shortcuts from config, no defaults
        this.shortcuts = this.config.shortcuts || [];
        
        // Only use product walkthroughs from config, no defaults
        this.productWalkthroughs = this.config.productWalkthroughs || [];
        
        // Dragging state
        this.position = { top: 360, left: 660 };
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        
        // Component references
        this.components = {
            expandedWithMessages: null,
            textInputOnly: null,
            expandedWithShortcuts: null,
            minimizedState: null
        };

        // Create container
        this.container = document.createElement('div');
        this.setupContainer();
        
        // Setup dragging functionality
        this.setupDragging();
        
        // Initial render
        this.render();
    }

    setupContainer() {
        Object.assign(this.container.style, {
            position: 'fixed',
            top: `${this.position.top}px`,
            left: `${this.position.left}px`,
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
            cursor: 'grab',
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
        
        // Clear input and save it
        const inputText = this.chatInput;
        this.chatInput = '';
        
        // Add user message to our internal array
        this.messages.push({ type: 'user', content: userMessage });
        
        // Render to ensure we have the messages component with the user message
        this.render();
        
        // Get the messages component from ExpandedWithMessages
        const expandedWithMessages = this.components?.expandedWithMessages;
        if (!expandedWithMessages || !expandedWithMessages.messagesComponent) return;
        
        const messagesComponent = expandedWithMessages.messagesComponent;
        
        // Animate the user message that was just rendered
        const userMessageIndex = this.messages.length - 1;
        await messagesComponent.animateMessage(userMessageIndex);
        
        // Show thinking indicator
        messagesComponent.setThinking(true);
        
        try {
            // Call the Tavily Copilot backend API
            const apiUrl = "https://f07sqn76ak.execute-api.us-east-1.amazonaws.com/dev/tavily-copilot/tavily-copilot";
            const response = await fetch(apiUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ question: userMessage }) // userMessage is the user's input
            });
            const data = await response.json();

            // Parse the answer from the nested body
            let answer = "Sorry, I couldn't get an answer from the backend.";
            if (data.body) {
                try {
                    const parsedBody = JSON.parse(data.body);
                    answer = parsedBody.answer || answer;
                } catch (e) {
                    // If parsing fails, fallback to the default error message
                }
            }

            // Hide thinking indicator
            messagesComponent.setThinking(false);
            
            // Add assistant message to our internal array
            this.messages.push({ type: 'assistant', content: answer });
            
            // Re-render to update the DOM with the new message
            this.render();
            
            // Get the updated messagesComponent after re-render
            const updatedMessagesComponent = this.components?.expandedWithMessages?.messagesComponent;
            if (updatedMessagesComponent) {
                // Animate the assistant message (last message in the array)
                const assistantMessageIndex = this.messages.length - 1;
                await updatedMessagesComponent.animateMessage(assistantMessageIndex);
            }
        } catch (error) {
            // Hide thinking indicator
            messagesComponent.setThinking(false);
            
            // Add error message to our internal array
            const errorMessage = 'Sorry, I encountered an error. Please try again.';
            this.messages.push({ type: 'assistant', content: errorMessage });
            
            // Re-render to update the DOM with the error message
            this.render();
            
            // Get the updated messagesComponent after re-render
            const updatedMessagesComponent = this.components?.expandedWithMessages?.messagesComponent;
            if (updatedMessagesComponent) {
                // Animate the error message (last message in the array)
                const errorMessageIndex = this.messages.length - 1;
                await updatedMessagesComponent.animateMessage(errorMessageIndex);
            }
        }
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

    handleShortcutSelect = (shortcut) => {
        this.chatInput = shortcut;
        this.handleSubmit();
    }
    
    handleWalkthroughSelect = (walkthrough) => {
        // If walkthrough is an object with url property, navigate or trigger action
        if (typeof walkthrough === 'object' && walkthrough.url) {
            console.log('Navigating to walkthrough:', walkthrough.url);
            
            // Actually navigate to the URL
            if (walkthrough.url.startsWith('/') || walkthrough.url.startsWith('http')) {
                window.location.href = walkthrough.url;
            }
            
            // Also call the configured handler with the walkthrough object
            this.config.onWalkthroughSelect(walkthrough);
        } else {
            // Fallback to treating it as a regular query
            this.chatInput = typeof walkthrough === 'object' ? walkthrough.text : walkthrough;
            this.handleSubmit();
        }
    }

    transitionTo(newState) {
        console.log(`Transitioning from ${this.currentState} to ${newState}`);
        this.currentState = newState;
        this.render();
    }

    createDragHandle() {
        const handle = document.createElement('div');
        Object.assign(handle.style, {
            padding: '2px 0',
            cursor: 'grab',
            userSelect: 'none',
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '8px',
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

    setupDragging() {
        const handleDragStart = (e) => {
            // Don't start dragging if clicking on a button or input
            if (e.target instanceof HTMLButtonElement || 
                e.target instanceof HTMLInputElement) return;
            
            e.preventDefault();
            this.isDragging = true;
            this.dragStart = {
                x: e.clientX - this.position.left,
                y: e.clientY - this.position.top
            };
            this.container.style.cursor = 'grabbing';
        };

        const handleMouseMove = (e) => {
            if (!this.isDragging) return;
            
            const newLeft = e.clientX - this.dragStart.x;
            const newTop = e.clientY - this.dragStart.y;
            
            // Constrain to window boundaries
            this.position.left = Math.max(0, Math.min(newLeft, window.innerWidth - this.container.offsetWidth));
            this.position.top = Math.max(0, Math.min(newTop, window.innerHeight - this.container.offsetHeight));
            
            // Update element position
            this.container.style.left = `${this.position.left}px`;
            this.container.style.top = `${this.position.top}px`;
        };

        const handleMouseUp = () => {
            if (this.isDragging) {
                this.isDragging = false;
                this.container.style.cursor = 'grab';
            }
        };

        // Add event listeners
        this.container.addEventListener('mousedown', handleDragStart);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        // Cleanup function (store it for potential future cleanup)
        this.cleanupDragging = () => {
            this.container.removeEventListener('mousedown', handleDragStart);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }

    render() {
        console.log('Rendering PopupStateManager, current state:', this.currentState);
        // Clear existing content
        this.container.innerHTML = '';
        
        // Add minimize button (except in minimized state)
        if (this.currentState !== 'minimized') {
            const minimizeButton = new MinimizeButton({
                onMinimize: this.handleMinimize,
                primaryColor: this.config.primaryColor
            });
            
            const minimizeButtonElement = minimizeButton.render();
            Object.assign(minimizeButtonElement.style, {
                position: 'absolute',
                top: '8px',
                left: '8px',
                zIndex: 2147483648, // One higher than container
            });
            
            this.container.appendChild(minimizeButtonElement);
        }

        // Add drag handle (except in minimized state)
        if (this.currentState !== 'minimized') {
            const dragHandle = this.createDragHandle();
            this.container.appendChild(dragHandle);
        }

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
                paddingBottom: '0',
                cursor: 'default',
                display: 'flex',
                flexDirection: 'column',
            });
        }

        // Reset component references for current state
        this.components = {
            expandedWithMessages: null,
            textInputOnly: null,
            expandedWithShortcuts: null,
            minimizedState: null
        };
        
        let component;
        switch (this.currentState) {
            case 'minimized':
                this.components.minimizedState = new MinimizedState({
                    onClick: this.handleMaximize,
                    primaryColor: this.config.primaryColor,
                    text: `Ask ${this.config.platform}...`
                });
                component = this.components.minimizedState;
                break;

            case 'textInput':
                this.components.textInputOnly = new TextInputOnly({
                    onSubmit: this.handleSubmit,
                    onInputChange: this.handleInputChange,
                    onExpand: () => this.transitionTo('expanded'),
                    platform: this.config.platform,
                    primaryColor: this.config.primaryColor,
                    onMinimize: this.handleMinimize,
                    value: this.chatInput
                });
                component = this.components.textInputOnly;
                break;

            case 'expanded':
                const chatInput = new ChatInput({
                    value: this.chatInput,
                    onChange: (e) => this.handleInputChange(e),
                    onSubmit: () => this.handleSubmit(),
                    platform: this.config.platform,
                    primaryColor: this.config.primaryColor
                });

                this.components.expandedWithShortcuts = new ExpandedWithShortcuts({
                    shortcuts: this.shortcuts,
                    productWalkthroughs: this.productWalkthroughs,
                    onQuerySelect: this.handleShortcutSelect,
                    onWalkthroughSelect: this.handleWalkthroughSelect,
                    chatInput: chatInput,
                    primaryColor: this.config.primaryColor,
                    onMinimize: this.handleMinimize,
                    onSubmit: () => this.handleSubmit()
                });
                component = this.components.expandedWithShortcuts;
                break;

            case 'messages':
                console.log('Creating ExpandedWithMessages component with messages:', this.messages);
                const chatInputForMessages = new ChatInput({
                    value: this.chatInput,
                    onChange: this.handleInputChange,
                    onSubmit: this.handleSubmit,
                    platform: this.config.platform,
                    primaryColor: this.config.primaryColor
                });
                
                this.components.expandedWithMessages = new ExpandedWithMessages({
                    messages: this.messages,
                    chatInput: chatInputForMessages,
                    primaryColor: this.config.primaryColor,
                    onMinimize: this.handleMinimize,
                    customButtons: this.config.customButtons
                });
                component = this.components.expandedWithMessages;
                break;
        }

        console.log('Created component:', component);
        this.container.appendChild(component.render());
    }

    mount(parentElement) {
        parentElement.appendChild(this.container);
    }

    unmount() {
        // Clean up event listeners before removing
        if (this.cleanupDragging) {
            this.cleanupDragging();
        }
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
