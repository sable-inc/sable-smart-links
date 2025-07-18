// components/SimplePopup.js
import { ArrowButton } from './ArrowButton.js';
import { YesNoButtons } from './YesNoButtons.js';
import { CloseButton } from './CloseButton.js';
import { ShortcutsAndRecents } from './ShortcutsAndRecents.js';

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
            onProceed: config.onProceed || (() => {}),
            onYesNo: config.onYesNo || (() => {}),
            primaryColor: config.primaryColor || '#FFFFFF',
            onClose: config.onClose || (() => {}),
            onPositionChange: config.onPositionChange || (() => {}),
            includeTextBox: config.includeTextBox || false,
            fontSize: config.fontSize || '15px',
            sections: config.sections || []
        };

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
                const textInput = this.inputBox ? this.inputBox.value : '';
                console.log('[SimplePopup] Input box exists:', !!this.inputBox);
                console.log('[SimplePopup] Raw input box value:', textInput);
                
                // Pass the string value directly
                if (typeof this.config.onProceed === 'function') {
                    console.log('function called arrow button');
                    
                    try {
                        // Set button to loading state
                        arrowButton.setLoading(true);
                        
                        // Call onProceed and handle Promise resolution
                        const result = this.config.onProceed(textInput);
                        
                        // Handle both synchronous and asynchronous results
                        if (result instanceof Promise) {
                            result
                                .catch(err => {
                                    console.error('Error in onProceed:', err);
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
                            }, 60000);
                        }
                    } catch (error) {
                        // Handle any synchronous errors
                        console.error('Error in arrow button onProceed:', error);
                        arrowButton.setLoading(false);
                    }
                }
            });
            
            // Store reference to the arrow button
            this.arrowButton = arrowButton;
            buttonContainer.appendChild(arrowButton.render());
        } else if (this.config.buttonType === 'yes-no') {
            // For yes/no buttons, use the original implementation
            const yesNoButtons = new YesNoButtons((isYes) => {
                if (typeof this.config.onYesNo === 'function') {
                    this.config.onYesNo(isYes);
                }
            }, this.config.primaryColor);
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
            console.log('[SimplePopup][createContent] Rendering sections:', this.config.sections);
            const shortcutsAndRecents = new ShortcutsAndRecents({
                sections: this.config.sections
            });
            // Insert after the rowContainer (which contains the text)
            mainContainer.appendChild(shortcutsAndRecents.render());
        } else if (this.config.sections !== undefined && !Array.isArray(this.config.sections)) {
            console.warn('[SimplePopup][createContent] this.config.sections is not an array:', this.config.sections);
        }

        // Add textbox if needed - always at the bottom
        if (this.config.includeTextBox) {
            const inputBox = document.createElement('input');
            inputBox.type = 'text';
            inputBox.placeholder = 'Type here...';
            Object.assign(inputBox.style, {
                width: '95%',
                padding: '8px',
                borderRadius: '6px',
                border: '1px solid #ccc',
                fontSize: this.config.fontSize || '15px', // Match the text font size
                color: '#222',
            });
            
            // Add enter key handler
            inputBox.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const textInput = inputBox.value;
                    if (typeof this.config.onProceed === 'function') {
                        inputBox.disabled = true;
                        
                        // Call the onProceed function
                        console.log('function called input box');
                        
                        // If we have an arrow button, set it to loading state too
                        if (this.arrowButton) {
                            this.arrowButton.setLoading(true);
                        }
                        
                        try {
                            // Disable the input box immediately
                            inputBox.disabled = true;
                            
                            const result = this.config.onProceed(textInput);
                            
                            // Handle both synchronous and asynchronous results
                            // Check if result is promise-like (has a then method)
                            if (result && typeof result.then === 'function') {
                                console.log('[SimplePopup] Input box: Detected async result, waiting for completion');
                                // For promises, wait for completion before resetting state
                                return Promise.resolve(result)
                                    .catch(err => {
                                        console.error('Error in onProceed:', err);
                                        throw err; // Re-throw to propagate the error
                                    })
                                    .finally(() => {
                                        console.log('[SimplePopup] Input box: Async operation completed, resetting state');
                                        // Restore the input box state when done
                                        inputBox.disabled = false;
                                        
                                        // Reset arrow button if it exists
                                        if (this.arrowButton) {
                                            this.arrowButton.setLoading(false);
                                        }
                                    });
                            } else {
                                console.log('[SimplePopup] Input box: Detected synchronous result');
                                // For synchronous functions, reset after a short delay
                                // to make the loading state visible
                                setTimeout(() => {
                                    inputBox.disabled = false;
                                    if (this.arrowButton) {
                                        this.arrowButton.setLoading(false);
                                    }
                                }, 60000);
                                return result;
                            }
                        } catch (error) {
                            // Handle any synchronous errors
                            console.error('Error in onProceed:', error);
                            
                            // Reset states
                            inputBox.disabled = false;
                            if (this.arrowButton) {
                                this.arrowButton.setLoading(false);
                            }
                            
                            // Re-throw the error
                            throw error;
                        }
                    }
                }
            });
            
            mainContainer.appendChild(inputBox);
            this.inputBox = inputBox;
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

    close() {
        console.log('Close clicked');
        console.trace('[SimplePopup.close] Stack trace for close');
        // Call the onClose callback if provided in config
        if (this.config.onClose) {
            this.config.onClose();
        }

        // Remove the popup from the DOM
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }

        // Clean up event listeners
        if (this.cleanupDragging) {
            this.cleanupDragging();
        }
    }

    render() {
        return this.element;
    }
}