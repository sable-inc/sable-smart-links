// Import all required components
import { ExpandedWithShortcuts } from './components/ExpandedWithShortcuts.js';
import { CloseButton } from './components/CloseButton.js';
import { logTextAgentEnd } from '../utils/analytics.js';

// PopupStateManager.js
export class PopupStateManager {
    constructor(config) {
        this.config = {
            platform: config.platform || 'Sable',
            primaryColor: config.primaryColor || '#FFFFFF',
            width: config.width || 380,
            sections: config.sections || [],
            onClose: config.onClose || (() => { }),
            // Add agent information for analytics logging
            agentInfo: config.agentInfo || null
        };

        // State variables
        // Start in expanded state by default:
        this.currentState = 'expanded';

        // Dragging state
        this.position = {
            top: 240,
            left: ((window?.innerWidth ?? 1700) - (this.config.width ?? 380)) / 2,
        };
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };

        // Component references
        this.components = {
            expandedWithShortcuts: null
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

    transitionTo(newState) {
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
            expandedWithShortcuts: null
        };

        let component;
        switch (this.currentState) {

            case 'expanded':
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
                    primaryColor: this.config.primaryColor,
                    onSubmit: () => this.handleSubmit()
                });
                component = this.components.expandedWithShortcuts;
                break;


        }

        this.container.appendChild(component.render());
    }

    /**
     * Mount the popup to a parent element
     * @param {HTMLElement} parentElement - Parent element to mount to
     */
    mount(parentElement) {
        if (parentElement && !parentElement.contains(this.container)) {
            parentElement.appendChild(this.container);
        }
    }

    /**
     * Unmount the popup from DOM
     */
    unmount() {
        // Clean up event listeners before removing
        if (this.cleanupDragging) {
            this.cleanupDragging();
        }
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}
