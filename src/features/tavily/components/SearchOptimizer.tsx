import React, { useEffect, useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { suggestSearchParameters } from '../services/functions/tavilySearchParameters';
import { generalizedCopilot } from '../services/functions/generalizedCopilot';

interface SearchOptimizerProps {
  apiKey: string;
}

export const SearchOptimizer: React.FC<SearchOptimizerProps> = ({ apiKey }) => {
    // Initial popup states
    const [isVisible, setIsVisible] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const initialPopupRef = useRef<HTMLDivElement>(null);

    // Copilot popup states
    const [showCopilotPopup, setShowCopilotPopup] = useState(false);
    const [copilotPosition, setCopilotPosition] = useState({ top: 320, left: 32 });
    const [isCopilotDragging, setIsCopilotDragging] = useState(false);
    const [copilotDragStart, setCopilotDragStart] = useState({ x: 0, y: 0 });
    const copilotRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    
    const [isExpanded, setIsExpanded] = useState(false);
    const [copilotQuery, setCopilotQuery] = useState('');
    const [copilotMessages, setCopilotMessages] = useState<Array<{type: 'user' | 'assistant', content: string}>>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [currentQuery, setCurrentQuery] = useState('');
    const debounceTimer = useRef<NodeJS.Timeout>();

    useEffect(() => {
        const setupInputWatcher = () => {
            const queryInput = document.querySelector('textarea#query') as HTMLTextAreaElement;
            if (!queryInput) {
                setTimeout(setupInputWatcher, 500);
                return;
            }

            const rect = queryInput.getBoundingClientRect();
            setPosition({
                top: rect.top + 20,
                left: rect.right + 40
            });

            const handleInput = () => {
                if (debounceTimer.current) {
                    clearTimeout(debounceTimer.current);
                }

                debounceTimer.current = setTimeout(() => {
                    const newValue = queryInput.value;
                    if (newValue && newValue !== currentQuery) {
                        setCurrentQuery(newValue);
                        setIsVisible(true);
                    }
                }, 1000);
            };

            queryInput.addEventListener('input', handleInput);

            return () => {
                queryInput.removeEventListener('input', handleInput);
                if (debounceTimer.current) {
                    clearTimeout(debounceTimer.current);
                }
            };
        };

        setupInputWatcher();
    }, [currentQuery]);

    // Handle initial popup drag
    const handleInitialPopupMouseDown = (e: React.MouseEvent) => {
        if (e.target instanceof HTMLButtonElement) return;
        e.preventDefault();
        setIsDragging(true);
        setDragStart({
            x: e.clientX - position.left,
            y: e.clientY - position.top
        });
    };

    // Handle copilot popup drag
    const handleCopilotMouseDown = (e: React.MouseEvent) => {
        if (e.target instanceof HTMLInputElement || 
            e.target instanceof HTMLButtonElement ||
            (e.target as HTMLElement).closest('.input-container')) {
            return;
        }
        e.preventDefault();
        setIsCopilotDragging(true);
        setCopilotDragStart({
            x: e.clientX - copilotPosition.left,
            y: e.clientY - copilotPosition.top
        });
    };

    // Mouse move handler for both popups
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                const newLeft = e.clientX - dragStart.x;
                const newTop = e.clientY - dragStart.y;
                setPosition({
                    left: Math.max(0, Math.min(newLeft, window.innerWidth - (initialPopupRef.current?.offsetWidth || 0))),
                    top: Math.max(0, Math.min(newTop, window.innerHeight - (initialPopupRef.current?.offsetHeight || 0)))
                });
            }
            if (isCopilotDragging) {
                const newLeft = e.clientX - copilotDragStart.x;
                const newTop = e.clientY - copilotDragStart.y;
                setCopilotPosition({
                    left: Math.max(0, Math.min(newLeft, window.innerWidth - (copilotRef.current?.offsetWidth || 0))),
                    top: Math.max(0, Math.min(newTop, window.innerHeight - (copilotRef.current?.offsetHeight || 0)))
                });
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            setIsCopilotDragging(false);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, isCopilotDragging, dragStart, copilotDragStart]);

    const handleOptimize = async () => {
        if (!currentQuery) return;
        try {
            if (process.env.NODE_ENV === 'development') console.debug('Debug: Starting suggestSearchParameters call');
            await suggestSearchParameters({ query: currentQuery, apiKey });
            if (process.env.NODE_ENV === 'development') console.debug('Debug: Finished suggestSearchParameters call');
            setIsVisible(false);
            
            setCopilotPosition({
                top: window.innerHeight - 450,
                left: 32
            });
            setShowCopilotPopup(true);
            setCopilotMessages([{
                type: 'assistant',
                content: "Hi! I can help you understand Tavily's features. What would you like to know?"
            }]);
        } catch (error) {
            console.error('Debug: Error in handleOptimize:', error);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        e.stopPropagation();
        const newValue = e.target.value;
        if (process.env.NODE_ENV === 'development') console.debug('Input value changing to:', newValue); // Debug log
        setCopilotQuery(newValue);
    };

    const handleCopilotSubmit = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && copilotQuery.trim()) {
            try {
                setIsExpanded(true);
                setCopilotMessages(prev => [...prev, { type: 'user', content: copilotQuery }]);
                const response = await generalizedCopilot({ query: copilotQuery, apiKey });
                setCopilotQuery('');
                setCopilotMessages(prev => [...prev, { type: 'assistant', content: response.response }]);
            } catch (error) {
                console.error('Error in copilot:', error);
                setCopilotMessages(prev => [...prev, { 
                    type: 'assistant', 
                    content: 'Sorry, I encountered an error. Please try again.' 
                }]);
            }
        }
    };

    // Scroll to bottom when messages change
    useEffect(() => {
        if (messagesEndRef.current && copilotMessages.length > 0) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [copilotMessages]);

    const CopilotPopup = () => {
        if (!showCopilotPopup) return null;

    return (
        <div 
                ref={copilotRef}
                style={{
                    position: 'fixed',
                    top: `${copilotPosition.top}px`,
                    left: `${copilotPosition.left}px`,
                    zIndex: 2147483647,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    background: `radial-gradient(
                        circle at center,
                        rgba(60, 60, 60, 0.5) 0%,
                        rgba(60, 60, 60, 0.65) 100%
                    )`,
                    padding: '16px',
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    width: '380px',
                    height: isExpanded ? '400px' : 'auto',
                    backdropFilter: 'blur(8px)',
                    cursor: 'default',
                    userSelect: 'none',
                    transition: 'all 0.3s ease',
                }}
            >
                {/* Drag handle */}
                <div
                    onMouseDown={handleCopilotMouseDown}
                    style={{
                        padding: '4px 0',
                        marginBottom: '4px',
                        cursor: isCopilotDragging ? 'grabbing' : 'grab',
                        userSelect: 'none',
                    }}
                >
                    <div style={{
                        width: '32px',
                        height: '4px',
                        backgroundColor: 'rgba(255, 255, 255, 0.3)',
                        borderRadius: '2px',
                        margin: '0 auto',
                    }} />
                </div>

                {isExpanded && (
                    <div style={{
                        flex: 1,
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        padding: '8px 0',
                    }}>
                        {copilotMessages.map((message, index) => (
                            <div 
                                key={index}
                                style={{
                                    alignSelf: message.type === 'user' ? 'flex-end' : 'flex-start',
                                    maxWidth: '80%',
                                    backgroundColor: message.type === 'user' 
                                        ? 'rgba(255, 255, 255, 0.9)' 
                                        : 'rgba(80, 80, 80, 0.6)',
                                    color: message.type === 'user' ? '#000' : '#fff',
                                    padding: '8px 12px',
                                    borderRadius: '12px',
                                    fontSize: '13px',
                                    lineHeight: '1.4',
                                    whiteSpace: 'pre-wrap',
                                }}
                            >
                                {message.content}
                            </div>
                        ))}
                        <div ref={messagesEndRef} style={{ height: 1 }} />
                    </div>
                )}

                {/* Input container */}
                <div 
                    className="input-container"
                    style={{
                        display: 'flex',
                        gap: '3px',
                        alignItems: 'center',
                        backgroundColor: 'rgba(70, 70, 70, 0.4)',
                        padding: '8px',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        cursor: 'default',
                    }}
                >
                    <input
                        ref={inputRef}
                        type="text"
                        value={copilotQuery}
                        onChange={handleInputChange}
                        onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === 'Enter') {
                                handleCopilotSubmit(e);
                            }
                        }}
                        style={{
                            flex: 1,
                            padding: '10px 12px',
                            borderRadius: '6px',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            backgroundColor: 'rgba(50, 50, 50, 0.6)',
                            color: 'white',
                            fontSize: '14px',
                            outline: 'none',
                            fontFamily: 'system-ui, -apple-system, sans-serif',
                            cursor: 'text',
                        }}
                        placeholder="What is the difference between Tavily Search and Tavily Extract?"
                    />
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            handleCopilotSubmit({ key: 'Enter' } as React.KeyboardEvent<HTMLInputElement>);
                        }}
                        style={{
                            padding: '10px 16px',
                            backgroundColor: '#0066cc',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500',
                            fontFamily: 'system-ui, -apple-system, sans-serif',
                        }}
                    >
                        Enter
                    </button>
                </div>
            </div>
        );
    };

    return (
        <>
            {isVisible && (
                <div 
                    ref={initialPopupRef}
                    onMouseDown={handleInitialPopupMouseDown}
            style={{
                        position: 'fixed',
                top: `${position.top}px`,
                left: `${position.left}px`,
                        zIndex: 2147483647,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        background: `radial-gradient(
                            circle at center,
                            rgba(60, 60, 60, 0.5) 0%,
                            rgba(60, 60, 60, 0.65) 100%
                        )`,
                        padding: '16px',
                        borderRadius: '16px',
                        border: '1px solid rgba(80, 80, 80, 0.8)',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                        maxWidth: '280px',
                        backdropFilter: 'blur(8px)',
                        cursor: isDragging ? 'grabbing' : 'grab',
                        userSelect: 'none',
                        transition: isDragging ? 'none' : 'all 0.2s ease',
                    }}
                >
                    {/* Drag handle */}
                    <div
                        style={{
                            padding: '4px 0',
                            marginBottom: '4px',
                            cursor: isDragging ? 'grabbing' : 'grab',
                            userSelect: 'none',
                        }}
                    >
                        <div style={{
                            width: '32px',
                            height: '4px',
                            backgroundColor: 'rgba(255, 255, 255, 0.3)',
                            borderRadius: '2px',
                            margin: '0 auto',
                        }} />
                    </div>

                    {/* Message text */}
                    <div style={{
                        fontSize: '14px',
                        color: 'white',
                        lineHeight: '1.4',
                        wordWrap: 'break-word',
                    }}>
                Would you like me to optimize the search parameters for your query?
            </div>

                    {/* Button container */}
                    <div style={{
                        display: 'flex',
                        gap: '8px',
                        justifyContent: 'flex-end',
                        marginLeft: 'auto',
                    }}>
                <button
                    onClick={handleOptimize}
                            style={{
                                padding: '6px 16px',
                                borderRadius: '8px',
                                border: 'none',
                                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                color: 'rgba(0, 0, 0, 0.8)',
                                fontSize: '13px',
                                fontWeight: '500',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.backgroundColor = 'white';
                                e.currentTarget.style.transform = 'scale(1.02)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
                                e.currentTarget.style.transform = 'scale(1)';
                            }}
                >
                    Yes
                </button>
                <button
                    onClick={() => setIsVisible(false)}
                            style={{
                                padding: '6px 16px',
                                borderRadius: '8px',
                                border: 'none',
                                backgroundColor: 'rgba(80, 80, 80, 0.6)',
                                color: 'white',
                                fontSize: '13px',
                                fontWeight: '500',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(90, 90, 90, 0.7)';
                                e.currentTarget.style.transform = 'scale(1.02)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(80, 80, 80, 0.6)';
                                e.currentTarget.style.transform = 'scale(1)';
                            }}
                >
                    No
                </button>
            </div>
        </div>
            )}
            <CopilotPopup />
        </>
    );
};