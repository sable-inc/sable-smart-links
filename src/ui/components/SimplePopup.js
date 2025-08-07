// components/SimplePopup.js
import { ArrowButton } from './ArrowButton.js';
import { YesNoButtons } from './YesNoButtons.js';
import { CloseButton } from './CloseButton.js';
import { Sections } from './Sections.js';
import { logTextAgentEnd } from '../../utils/analytics.js';

// Simple markdown parser for basic formatting
function parseMarkdown(text) {
    if (!text) return '';

    // Process bold text (** or __)
    text = text.replace(/\*\*(.*?)\*\*|__(.*?)__/g, '<strong>$1$2</strong>');

    // Process italic text (* or _)
    text = text.replace(/\*(.*?)\*|_(.*?)_/g, '<em>$1$2</em>');

    // Process code snippets (`code`)
    text = text.replace(/`(.*?)`/g, '<code style="background-color:rgba(0,0,0,0.2);padding:2px 4px;border-radius:3px;">$1</code>');

    // Process links [text](url)
    text = text.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:inherit;text-decoration:underline;">$1</a>');

    // Process line breaks
    text = text.replace(/\n/g, '<br>');

    return text;
}

export class SimplePopup {
    constructor(config) {
        this.config = {
            text: config.text || '',
            boxWidth: config.boxWidth || 200,
            buttonType: config.buttonType || 'arrow', // 'arrow' or 'yes-no'
            onProceed: config.onProceed || (() => { }),
            onYesNo: config.onYesNo || (() => { }),
            primaryColor: config.primaryColor || '#FFFFFF',
            onClose: config.onClose || (() => { }),
            onPositionChange: config.onPositionChange || (() => { }),
            fontSize: config.fontSize || '15px',
            sections: config.sections || [],
            debug: config.debug || false, // Add debug flag to config
            // Add agent information for analytics logging
            agentInfo: config.agentInfo || null
        };

        // Debug log to verify agentInfo is received
        if (this.config.debug) {
            console.log('[SimplePopup] DEBUG: Constructor called with agentInfo:', this.config.agentInfo);
        }

        // State
        // Use position from config if provided, otherwise use default
        this.position = config.position || { top: window.innerHeight / 2, left: window.innerWidth / 2 };
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.visibleCharacters = 0;
        this.isButtonVisible = false;

        // Create elements
        this.element = this.createPopup();
        this.setupDragging();
        this.startAnimationSequence();
    }

    createPopup() {
        const popup = document.createElement('div');
        Object.assign(popup.style, {
            position: 'fixed',
            top: `${this.position.top}px`,
            left: `${this.position.left}px`,
            zIndex: '2147483647',
            width: 'fit-content',
            display: 'flex',
            flexDirection: 'column',
            background: `radial-gradient(
                circle at center,
                rgba(60, 60, 60, 0.5) 0%,
                rgba(60, 60, 60, 0.65) 100%
            )`,
            padding: '12px',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(8px)',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            color: this.config.primaryColor,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            cursor: 'grab',
            userSelect: 'none',
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
            opacity: '0',
            transform: 'none', // Remove any transform to ensure consistent positioning
        });

        // Add drag handle
        const dragHandle = this.createDragHandle();
        popup.appendChild(dragHandle);

        // Replace custom close button with CloseButton component
        const closeButton = new CloseButton({
            onClose: () => this.close(),
            primaryColor: this.config.primaryColor
        });
        popup.appendChild(closeButton.render());

        // Add content container
        const content = this.createContent();
        popup.appendChild(content);

        // Add cursor animation style
        const style = document.createElement('style');
        style.textContent = `
            @keyframes blink {
                from, to { border-color: transparent }
                50% { border-color: rgba(255, 255, 255, 0.7) }
            }
            @keyframes pulse {
                0%, 100% { opacity: 0.6; }
                50% { opacity: 0.3; }
            }
        `;
        popup.appendChild(style);

        return popup;
    }

    createDragHandle() {
        const handle = document.createElement('div');
        Object.assign(handle.style, {
            padding: '2px 0',
            cursor: 'grab',
            userSelect: 'none',
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

    createContent() {
        // Create a main container for all elements
        const mainContainer = document.createElement('div');
        Object.assign(mainContainer.style, {
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            padding: '0 4px',
            marginTop: '4px',
            width: 'fit-content',
        });

        // Create a row container for text and button
        const rowContainer = document.createElement('div');
        Object.assign(rowContainer.style, {
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '4px',
            width: 'fit-content',
        });

        // Text container
        const textContainer = document.createElement('div');
        Object.assign(textContainer.style, {
            width: `${this.config.boxWidth}px`,
            padding: '4px 4px',
            color: this.config.primaryColor,
            fontSize: this.config.fontSize,
            fontWeight: '400',
            letterSpacing: '-0.01em',
            wordWrap: 'break-word',
            overflowWrap: 'break-word',
            whiteSpace: 'pre-wrap',
            lineHeight: '1.5',
            textRendering: 'optimizeLegibility',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        });

        // Store a direct reference to the text container
        this.textContainer = textContainer;

        // Button container
        const buttonContainer = document.createElement('div');
        Object.assign(buttonContainer.style, {
            opacity: '0',
            transform: 'scale(0.9)',
            transition: 'all 0.8s ease',
        });

        // Store a direct reference to the button container
        this.buttonContainer = buttonContainer;

        // Add button based on type
        if (this.config.buttonType === 'arrow') {
            // Create the arrow button with click handler
            const arrowButton = new ArrowButton(() => {
                // Pass empty string since there's no input box
                if (typeof this.config.onProceed === 'function') {
                    if (this.config.debug) console.debug('function called arrow button');
                    try {
                        // Set button to loading state
                        arrowButton.setLoading(true);
                        // Call onProceed and handle Promise resolution
                        const result = this.config.onProceed('');
                        // Handle both synchronous and asynchronous results
                        if (result instanceof Promise) {
                            result
                                .catch(err => {
                                    if (this.config.debug) {
                                        console.error('Error in onProceed:', err);
                                    }
                                    // Don't rethrow to prevent unhandled promise rejection
                                })
                                .finally(() => {
                                    // Reset button state when done
                                    arrowButton.setLoading(false);
                                });
                        } else {
                            // For synchronous functions, reset after a short delay
                            // to ensure the loading state is visible
                            setTimeout(() => {
                                arrowButton.setLoading(false);
                            }, 600);
                        }
                    } catch (error) {
                        // Handle any synchronous errors
                        if (this.config.debug) {
                            console.error('Error in arrow button onProceed:', error);
                        }
                        arrowButton.setLoading(false);
                    }
                }
            });

            // Store reference to the arrow button
            this.arrowButton = arrowButton;
            buttonContainer.appendChild(arrowButton.render());
        } else if (this.config.buttonType === 'yes-no') {
            // Create the yes/no buttons with click handler
            const yesNoButtons = new YesNoButtons((isYes) => {
                if (typeof this.config.onYesNo === 'function') {
                    if (this.config.debug) console.debug('function called yes/no button');
                    try {
                        // Set buttons to loading state
                        yesNoButtons.setLoading(true);
                        // Call onYesNo and handle Promise resolution
                        const result = this.config.onYesNo(isYes);
                        // Handle both synchronous and asynchronous results
                        if (result instanceof Promise) {
                            result
                                .catch(err => {
                                    if (this.config.debug) {
                                        console.error('Error in onYesNo:', err);
                                    }
                                    // Don't rethrow to prevent unhandled promise rejection
                                })
                                .finally(() => {
                                    // Reset button state when done
                                    yesNoButtons.setLoading(false);
                                });
                        } else {
                            // For synchronous functions, reset after a short delay
                            // to ensure the loading state is visible
                            setTimeout(() => {
                                yesNoButtons.setLoading(false);
                            }, 600);
                        }
                    } catch (error) {
                        // Handle any synchronous errors
                        if (this.config.debug) {
                            console.error('Error in yes/no button onYesNo:', error);
                        }
                        yesNoButtons.setLoading(false);
                    }
                }
            }, this.config.primaryColor);

            // Store reference to the yes/no buttons
            this.yesNoButtons = yesNoButtons;
            buttonContainer.appendChild(yesNoButtons.render());
        }
        // If buttonType is 'none', do not add any button to the buttonContainer or DOM

        // Add text and button to the row container
        rowContainer.appendChild(textContainer);

        // For arrow button, add it to the row. For yes-no buttons, add them below the text
        if (this.config.buttonType === 'arrow') {
            rowContainer.appendChild(buttonContainer);
        }
        mainContainer.appendChild(rowContainer);
        if (this.config.buttonType === 'yes-no') {
            mainContainer.appendChild(buttonContainer);
        }

        if (Array.isArray(this.config.sections) && this.config.sections.length > 0) {
            const sections = new Sections({
                sections: this.config.sections
            });
            // Insert after the rowContainer (which contains the text)
            mainContainer.appendChild(sections.render());
        } else if (this.config.sections !== undefined && !Array.isArray(this.config.sections)) {
            if (this.config.debug) console.warn('[SimplePopup][createContent] this.config.sections is not an array:', this.config.sections);
        }



        return mainContainer;
    }

    startAnimationSequence() {
        // Show background
        setTimeout(() => {
            this.element.style.opacity = '1';
        }, 0);

        // Parse the markdown text first
        const parsedText = parseMarkdown(this.config.text);

        // For animation, we need to work with the raw text
        const rawText = this.config.text;
        const charDelay = 800 / rawText.length;

        // Animate text character by character
        for (let i = 0; i <= rawText.length; i++) {
            setTimeout(() => {
                // For the animation, use the raw text sliced to current position
                const currentText = rawText.slice(0, i);

                // Parse the current slice of text with markdown
                const currentParsedText = parseMarkdown(currentText);

                // Set the HTML content
                this.textContainer.innerHTML = currentParsedText;

                // Add the blinking cursor if not at the end
                if (i < rawText.length) {
                    const cursor = document.createElement('span');
                    cursor.style.borderRight = '2px solid rgba(255, 255, 255, 0.7)';
                    cursor.style.animation = 'blink 1s step-end infinite';
                    this.textContainer.appendChild(cursor);
                }
                // When we reach the end, set the full parsed text to ensure all formatting is applied
                else {
                    this.textContainer.innerHTML = parsedText;
                }
            }, 300 + (i * charDelay));
        }

        // Show button - use the direct reference instead of querySelector
        setTimeout(() => {
            this.buttonContainer.style.opacity = '1';
            this.buttonContainer.style.transform = 'scale(1)';
        }, 2000);
    }

    setupDragging() {
        const handleDragStart = (e) => {
            if (e.target.closest('.close-button') || e.target.closest('.action-button')) {
                return; // Don't start dragging when clicking buttons
            }

            this.isDragging = true;
            this.element.style.cursor = 'grabbing';

            // Calculate the offset of the mouse pointer from the top-left of the element
            this.dragStart.x = e.clientX - this.position.left;
            this.dragStart.y = e.clientY - this.position.top;
        };

        const handleMouseMove = (e) => {
            if (!this.isDragging) return;

            const newLeft = e.clientX - this.dragStart.x;
            const newTop = e.clientY - this.dragStart.y;

            // Constrain to window boundaries
            this.position.left = Math.max(0, Math.min(newLeft, window.innerWidth - this.element.offsetWidth));
            this.position.top = Math.max(0, Math.min(newTop, window.innerHeight - this.element.offsetHeight));

            // Update element position
            this.element.style.left = `${this.position.left}px`;
            this.element.style.top = `${this.position.top}px`;

            // Notify parent of position change
            this.config.onPositionChange(this.position);
        };

        const handleMouseUp = () => {
            if (this.isDragging) {
                this.isDragging = false;
                this.element.style.cursor = 'grab';

                // Ensure final position is reported when drag ends
                this.config.onPositionChange(this.position);
            }
        };

        // Add event listeners
        this.element.addEventListener('mousedown', handleDragStart);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        // Cleanup function (store it for potential future cleanup)
        this.cleanupDragging = () => {
            this.element.removeEventListener('mousedown', handleDragStart);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }

    /**
     * Close the popup
     */
    close() {
        if (this.config.debug) console.log('Close clicked');

        // Call the onClose callback if provided in config
        if (this.config.onClose) {
            this.config.onClose();
        }

        // Log analytics when the user manually closes the popup
        if (this.config.agentInfo) {
            if (this.config.debug) {
                console.log(`[SimplePopup] DEBUG: Manual close detected for agent "${this.config.agentInfo.agentId}", step "${this.config.agentInfo.stepId}", instance "${this.config.agentInfo.instanceId}"`);
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
                console.log(`[SimplePopup] DEBUG: Manual close detected but no agent info available`);
            }
        }

        // Clean up event listeners
        if (this.cleanupDragging) {
            this.cleanupDragging();
        }
    }

    /**
     * Render the popup element
     * @returns {HTMLElement} The popup element
     */
    render() {
        return this.element;
    }
}