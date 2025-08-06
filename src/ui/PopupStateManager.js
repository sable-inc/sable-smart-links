// Import all required components
import { TextInputOnly } from './components/TextInputOnly.js';
import { ExpandedWithShortcuts } from './components/ExpandedWithShortcuts.js';
import { ExpandedWithMessages } from './components/ExpandedWithMessages.js';
import { ChatInput } from './components/ChatInput.js';
import { CloseButton } from './components/CloseButton.js';
import { logTextAgentEnd } from '../utils/analytics.js';

// PopupStateManager.js
export class PopupStateManager {
    constructor(config) {
        this.config = {
            platform: config.platform || 'Sable',
            primaryColor: config.primaryColor || '#FFFFFF',
            width: config.width || 380,
            onChatSubmit: config.onChatSubmit || (() => {}),
            customButtons: config.customButtons || [],
            initialMessage: config.initialMessage || null,
            sections: config.sections || [],
            enableChat: config.enableChat !== undefined ? config.enableChat : true,
            onClose: config.onClose || (() => {}),
            // Add agent information for analytics logging
            agentInfo: config.agentInfo || null
        };

        // State variables
        // Start in expanded state by default:
        this.currentState = 'expanded';
        this.messages = [];
        
        // If we have an initial message, add it and start in messages state
        if (this.config.initialMessage && this.config.enableChat) {
            this.messages.push({
                role: 'assistant',
                content: this.config.initialMessage,
                timestamp: Date.now()
            });
            this.currentState = 'messages';
        }
        
        this.chatInput = '';
        
        // Dragging state
        this.position = { 
            top: 240,
            left: ((window?.innerWidth ?? 1700) - (this.config.width ?? 380)) / 2, 
        };
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

    handleClose = () => {
        // Call the onClose callback if provided
        if (typeof this.config.onClose === 'function') {
            this.config.onClose();
        }
        
        // Log analytics for manual close
        if (this.config.agentInfo) {
            if (this.config.debug) {
                console.log(`[PopupStateManager] DEBUG: Manual close detected for agent "${this.config.agentInfo.agentId}", step "${this.config.agentInfo.stepId}", instance "${this.config.agentInfo.instanceId}"`);
            }
            // Calculate agentDuration fresh at the time of logging
            const currentTime = Date.now();
            const agentStartTime = this.config.agentInfo.agentStartTime;
            const agentDuration = agentStartTime ? currentTime - agentStartTime : null;
            
            logTextAgentEnd(
                this.config.agentInfo.agentId,
                this.config.agentInfo.stepId,
                this.config.agentInfo.instanceId,
                {
                    completionReason: 'manual'
                },
                agentDuration
            );
        } else {
            if (this.config.debug) {
                console.log(`[PopupStateManager] DEBUG: Manual close detected but no agent info available`);
            }
        }
        
        // Remove the popup from the DOM
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        
        // Clean up event listeners
        if (this.cleanupDragging) {
            this.cleanupDragging();
        }
    }

    /**
     * Unmount the popup (for use by globalPopupManager)
     */
    unmount() {
        this.handleClose();
    }


    // No legacy handlers needed - sections handle their own selection logic

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
        
        // Add close button
        const closeButton = new CloseButton({
            onClose: this.handleClose,
            primaryColor: this.config.primaryColor
        });
        
        const closeButtonElement = closeButton.render();
        Object.assign(closeButtonElement.style, {
            position: 'absolute',
            top: '8px',
            left: '8px',
            zIndex: 2147483648, // One higher than container
        });
        
        this.container.appendChild(closeButtonElement);

        // Add drag handle
        const dragHandle = this.createDragHandle();
        this.container.appendChild(dragHandle);

        // Update container styles
        Object.assign(this.container.style, {
            width: `${this.config.width}px`,
            padding: '16px',
            paddingBottom: '0',
            cursor: 'default',
            display: 'flex',
            flexDirection: 'column',
        });

        // Reset component references for current state
        this.components = {
            expandedWithMessages: null,
            textInputOnly: null,
            expandedWithShortcuts: null
        };
        
        let component;
        switch (this.currentState) {

            case 'textInput':
                // If chat is disabled, switch to expanded state instead
                if (!this.config.enableChat) {
                    this.transitionTo('expanded');
                    return;
                }
                
                this.components.textInputOnly = new TextInputOnly({
                    onSubmit: this.handleSubmit,
                    onInputChange: this.handleInputChange,
                    onExpand: () => this.transitionTo('expanded'),
                    platform: this.config.platform,
                    primaryColor: this.config.primaryColor,
                    value: this.chatInput
                });
                component = this.components.textInputOnly;
                break;

            case 'expanded':
                const chatInput = this.config.enableChat ? new ChatInput({
                    value: this.chatInput,
                    onChange: (e) => this.handleInputChange(e),
                    onSubmit: () => this.handleSubmit(),
                    platform: this.config.platform,
                    primaryColor: this.config.primaryColor
                }) : null;

                // Process sections to handle restartFromStep
                const processedSections = this.config.sections.map(section => {
                    // Create a new onSelect handler that wraps the original one
                    const originalOnSelect = section.onSelect;
                    const wrappedOnSelect = (item) => {
                        // Check if restart is requested (either at item or section level)
                        if (item._restartRequested && (item.restartFromStep !== undefined || section.restartFromStep !== undefined)) {
                            // Item-level restartFromStep takes precedence over section-level
                            const restartConfig = item.restartFromStep !== undefined ? item.restartFromStep : section.restartFromStep;
                            
                            // Handle different formats of restartFromStep
                            let stepId = null;
                            let skipTrigger = false;
                            
                            if (restartConfig === null || typeof restartConfig === 'string') {
                                // Simple string or null format
                                stepId = restartConfig;
                            } else if (typeof restartConfig === 'object') {
                                // Object format with stepId and skipTrigger
                                stepId = restartConfig.stepId;
                                skipTrigger = !!restartConfig.skipTrigger;
                            }
                            
                            // Emit a custom event that TextAgentEngine can listen for
                            const restartEvent = new CustomEvent('sable:textAgentStart', {
                                detail: { stepId, skipTrigger, agentId: this.lastActiveAgentId }
                            });
                            window.dispatchEvent(restartEvent);
                        }
                        
                        // Always call the original handler
                        originalOnSelect(item);
                    };
                    
                    // Return a new section object with the wrapped handler
                    return {
                        ...section,
                        onSelect: wrappedOnSelect
                    };
                });
                
                this.components.expandedWithShortcuts = new ExpandedWithShortcuts({
                    sections: processedSections,
                    chatInput: chatInput,
                    primaryColor: this.config.primaryColor,
                    onSubmit: () => this.handleSubmit()
                });
                component = this.components.expandedWithShortcuts;
                break;

            case 'messages':
                // If chat is disabled, switch to expanded state instead
                if (!this.config.enableChat) {
                    this.transitionTo('expanded');
                    return;
                }
                
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
