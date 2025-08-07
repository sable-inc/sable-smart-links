// Import all required components
import { Sections } from './components/Sections.js';
import { CloseButton } from './components/CloseButton.js';

// PopupStateManager.js
export class PopupStateManager {
    constructor(config) {
        this.config = {
            platform: config.platform || 'Sable',
            primaryColor: config.primaryColor || '#FFFFFF',
            width: config.width || 380,
            sections: config.sections || [],
            onClose: config.onClose || (() => { }),
            agentInfo: config.agentInfo || null
        };

        // State variables
        this.position = {
            top: 240,
            left: ((window?.innerWidth ?? 1700) - (this.config.width ?? 380)) / 2,
        };
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };

        // Component references
        this.components = {
            sections: null
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

        // Broadcast close event for textAgentEngine to listen to
        if (this.config.agentInfo) {
            const closeEvent = new CustomEvent('sable:textAgentEnd', {
                detail: {
                    agentId: this.config.agentInfo.agentId,
                    stepId: this.config.agentInfo.stepId,
                    instanceId: this.config.agentInfo.instanceId,
                    reason: 'manual'
                }
            });
            window.dispatchEvent(closeEvent);
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

        // Reset component references
        this.components = {
            sections: null
        };

        // Use sections directly without restartFromStep processing
        const processedSections = this.config.sections;

        this.components.sections = new Sections({
            sections: processedSections,
            primaryColor: this.config.primaryColor
        });
        const component = this.components.sections;

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
     * Update position of the popup
     * @param {Object} position - New position {top, left}
     */
    updatePosition(position) {
        if (position && typeof position === 'object') {
            this.position = { ...this.position, ...position };
            Object.assign(this.container.style, {
                top: `${this.position.top}px`,
                left: `${this.position.left}px`
            });
        }
    }
}
