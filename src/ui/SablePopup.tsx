import React, { useEffect, useState, useRef } from 'react';
import { ArrowButton } from './ArrowButton';

interface SablePopupProps {
    // Core functionality
    isVisible: boolean;
    position?: 'text-after' | 'bottom' | 'right' | 'top' | 'left' | 'middle';
    isDraggable?: boolean;
    
    // Content configuration
    mode?: 'chat' | 'proceed' | 'yes-no' | 'text' | 'selector';
    platform?: string; // For chat placeholder
    primaryText?: string;
    secondaryText?: string;
    isExpandable?: boolean;
    
    // Handlers
    onClose?: () => void;
    onAction?: (action: string) => void;
    onChatSubmit?: (message: string) => Promise<string>;
    onProceed?: () => void;
    onYesNo?: (isYes: boolean) => void;
    
    // Styling
    primaryColor?: string;
    secondaryColor?: string;
    width?: number;
}

export const SablePopup: React.FC<SablePopupProps> = ({
    isVisible,
    position = 'text-after',
    isDraggable = true,
    mode = 'chat',
    platform = 'Sable',
    primaryText,
    secondaryText,
    isExpandable = true,
    onClose,
    onAction,
    onChatSubmit,
    onProceed,
    onYesNo,
    primaryColor = '#FFFFFF',
    secondaryColor = '#0066CC',
    width = 380,
}) => {
    const [popupPosition, setPopupPosition] = useState({ top: 320, left: 32 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [isExpanded, setIsExpanded] = useState(false);
    const [chatInput, setChatInput] = useState('');
    const [messages, setMessages] = useState<Array<{type: 'user' | 'assistant' | 'loading', content: string}>>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    
    const popupRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Add new state for recent messages
    const [recentQueries] = useState([
        'Request for Explanation Clarification',
        'Understanding Transformer Architecture Impact',
        'Explaining Transformer Architecture'
    ]);

    // Add new state for shortcuts
    const [shortcuts] = useState([
        'How does this work?',
        'Show me examples',
        'What are the best practices?'
    ]);

    // Dragging functionality
    const handleDragStart = (e: React.MouseEvent) => {
        if (!isDraggable || e.target instanceof HTMLInputElement || 
            e.target instanceof HTMLButtonElement) return;
        
        e.preventDefault();
        setIsDragging(true);
        setDragStart({
            x: e.clientX - popupPosition.left,
            y: e.clientY - popupPosition.top
        });
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            
            const newLeft = e.clientX - dragStart.x;
            const newTop = e.clientY - dragStart.y;
            setPopupPosition({
                left: Math.max(0, Math.min(newLeft, window.innerWidth - (popupRef.current?.offsetWidth || 0))),
                top: Math.max(0, Math.min(newTop, window.innerHeight - (popupRef.current?.offsetHeight || 0)))
            });
        };

        const handleMouseUp = () => setIsDragging(false);

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragStart]);

    // Chat functionality
    const handleChatSubmit = async () => {
        if (!chatInput.trim() || !onChatSubmit) return;

        const userMessage = chatInput.trim();
        setChatInput('');
        setIsExpanded(true);
        setMessages(prev => [...prev, { type: 'user', content: userMessage }]);
        setIsLoading(true);

        try {
            const response = await onChatSubmit(userMessage);
            setMessages(prev => [
                ...prev.filter(m => m.type !== 'loading'),
                { type: 'assistant', content: response }
            ]);
        } catch (error) {
            setMessages(prev => [
                ...prev.filter(m => m.type !== 'loading'),
                { type: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    // Auto-scroll chat
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    // Modify chat input handler to auto-expand
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setChatInput(e.target.value);
        if (!isExpanded && e.target.value.length > 0) {
            setIsExpanded(true);
        }
    };

    if (!isVisible) return null;

    return (
        <div 
            ref={popupRef}
            onClick={() => isMinimized && setIsMinimized(false)}
            onMouseDown={(e) => {
                // Allow dragging in minimized state or if isDraggable is true
                if ((isMinimized || isDraggable) && 
                    !(e.target instanceof HTMLInputElement) && 
                    !(e.target instanceof HTMLButtonElement)) {
                    handleDragStart(e);
                }
            }}
            style={{
                position: 'fixed',
                top: `${popupPosition.top}px`,
                left: `${popupPosition.left}px`,
                zIndex: 2147483647,
                width: isMinimized ? 'auto' : `${width}px`,
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                background: isMinimized 
                    ? 'rgba(0, 0, 0, 0.8)' 
                    : `radial-gradient(
                        circle at center,
                        rgba(60, 60, 60, 0.5) 0%,
                        rgba(60, 60, 60, 0.65) 100%
                    )`,
                padding: isMinimized ? '8px 16px' : '16px',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                backdropFilter: 'blur(8px)',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                color: primaryColor,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: isMinimized ? 'pointer' : 'default',
                userSelect: 'none',
                maxHeight: isExpanded ? '400px' : '48px',
                opacity: 1,
                transform: 'scale(1)',
                transformOrigin: 'bottom center',
                overflow: 'hidden',
            }}
        >
            {/* Only show minimize button when not minimized */}
            {!isMinimized && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsMinimized(true);
                    }}
                    style={{
                        position: 'absolute',
                        top: '6px',
                        left: '6px',
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: primaryColor,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease',
                        fontSize: '16px',
                        fontWeight: '500',
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                        e.currentTarget.style.transform = 'scale(1.1)';
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.transform = 'scale(1)';
                    }}
                >
                    -
                </button>
            )}

            {/* Minimized State */}
            {isMinimized ? (
                <div 
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        opacity: 0.7,
                        transition: 'opacity 0.2s ease',
                        cursor: isDragging ? 'grabbing' : 'pointer',
                    }}
                    onMouseOver={(e) => {
                        if (!isDragging) {
                            e.currentTarget.style.opacity = '1';
                        }
                    }}
                    onMouseOut={(e) => {
                        if (!isDragging) {
                            e.currentTarget.style.opacity = '0.7';
                        }
                    }}
                >
                    <span style={{
                        fontSize: '14px',
                        color: primaryColor,
                        fontWeight: '500',
                    }}>
                        Ask Tavily...
                    </span>
                </div>
            ) : (
                <>
                    {/* Only show drag handle in non-minimized state */}
                    {isDraggable && (
                        <div
                            onMouseDown={handleDragStart}
                            style={{
                                padding: '4px 0',
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
                    )}

                    {/* Chat Interface */}
                    {mode === 'chat' && (
                        <>
                            {(isExpandable && (messages.length > 0 || isExpanded)) && (
                                <div style={{
                                    flex: 1,
                                    overflowY: 'auto',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '16px',
                                    maxHeight: '300px',
                                    paddingTop: '8px',
                                    marginBottom: '8px',
                                    opacity: isExpanded ? 1 : 0,
                                    transform: `translateY(${isExpanded ? 0 : -10}px)`,
                                    transition: 'opacity 0.3s ease, transform 0.3s ease',
                                }}>
                                    {messages.length === 0 && (
                                        <>
                                            {/* Recents Section */}
                                            <div style={{ padding: '0 16px', background: 'transparent' }}>
                                                <h3 style={{ 
                                                    fontSize: '14px',
                                                    color: 'rgba(120, 33, 33, 0.9)',
                                                    marginBottom: '4px',
                                                    fontWeight: '500',
                                                }}>
                                                    Recents
                                                </h3>
                                                <div style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '1px',
                                                    background: 'transparent',
                                                }}>
                                                    {recentQueries.map((query, index) => (
                                                        <span
                                                            key={index}
                                                            style={{ 
                                                                color: 'rgba(255, 255, 255, 0.7)',
                                                                fontSize: '13px',
                                                                padding: '4px 0',
                                                                cursor: 'pointer',
                                                                transition: 'background-color 0.2s ease',
                                                                background: 'transparent',
                                                            }}
                                                            onMouseOver={(e) => {
                                                                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                                                            }}
                                                            onMouseOut={(e) => {
                                                                e.currentTarget.style.backgroundColor = 'transparent';
                                                            }}
                                                            onClick={() => {
                                                                setChatInput(query);
                                                                handleChatSubmit();
                                                            }}
                                                        >
                                                            {query}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Shortcuts Section */}
                                            <div style={{ 
                                                padding: '0 16px',
                                                marginTop: '16px',
                                                background: 'transparent',
                                            }}>
                                                <h3 style={{ 
                                                    fontSize: '14px',
                                                    color: 'rgba(255, 255, 255, 0.9)',
                                                    marginBottom: '4px',
                                                    fontWeight: '500',
                                                }}>
                                                    Shortcuts
                                                </h3>
                                                <div style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '1px',
                                                    background: 'transparent',
                                                }}>
                                                    {shortcuts.map((shortcut, index) => (
                                                        <span
                                                            key={index}
                                                            style={{ 
                                                                color: 'rgba(255, 255, 255, 0.7)',
                                                                fontSize: '13px',
                                                                padding: '4px 0',
                                                                cursor: 'pointer',
                                                                transition: 'background-color 0.2s ease',
                                                                background: 'transparent',
                                                            }}
                                                            onMouseOver={(e) => {
                                                                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                                                            }}
                                                            onMouseOut={(e) => {
                                                                e.currentTarget.style.backgroundColor = 'transparent';
                                                            }}
                                                            onClick={() => {
                                                                setChatInput(shortcut);
                                                                handleChatSubmit();
                                                            }}
                                                        >
                                                            {shortcut}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {/* Existing messages */}
                                    {messages.map((message, index) => (
                                        <div 
                                            key={index}
                                            style={{
                                                alignSelf: message.type === 'user' ? 'flex-end' : 'flex-start',
                                                maxWidth: '80%',
                                                backgroundColor: message.type === 'user' 
                                                    ? 'rgba(255, 255, 255, 0.9)'
                                                    : 'rgba(80, 80, 80, 0.6)',
                                                color: message.type === 'user' ? '#000' : primaryColor,
                                                padding: '8px 12px',
                                                borderRadius: '12px',
                                                fontSize: '13px',
                                                lineHeight: '1.4',
                                            }}
                                        >
                                            {message.type === 'loading' ? (
                                                <div className="loading-spinner" />
                                            ) : message.content}
                                        </div>
                                    ))}
                                    <div ref={messagesEndRef} />
                                </div>
                            )}

                            {/* Input section */}
                            <div style={{
                                marginTop: '0',
                                marginBottom: '0',
                                padding: '0',
                                opacity: 1,
                                transform: 'translateY(0)',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            }}>
                                <div style={{
                                    display: 'flex',
                                    gap: '8px',
                                    backgroundColor: '#323232',
                                    padding: '8px',
                                    borderRadius: '8px',
                                    borderBottomLeftRadius: '16px',
                                    borderBottomRightRadius: '16px',
                                }}>
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={chatInput}
                                        onChange={handleInputChange}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleChatSubmit();
                                        }}
                                        placeholder={messages.length === 0 
                                            ? `Ask anything about ${platform}`
                                            : "Continue chatting"}
                                        style={{
                                            flex: 1,
                                            padding: '10px 12px',
                                            borderRadius: '6px',
                                            border: 'none',
                                            backgroundColor: '#323232',
                                            color: primaryColor,
                                            fontSize: '14px',
                                            outline: 'none',
                                        }}
                                    />
                                    <ArrowButton onClick={handleChatSubmit} />
                                </div>
                            </div>
                        </>
                    )}

                    {/* Yes/No Buttons */}
                    {mode === 'yes-no' && (
                        <div style={{
                            display: 'flex',
                            gap: '8px',
                            justifyContent: 'flex-end',
                        }}>
                            <button
                                onClick={() => onYesNo?.(true)}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    backgroundColor: primaryColor,
                                    color: '#000',
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.transform = 'scale(1.05)';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.transform = 'scale(1)';
                                }}
                            >
                                Yes
                            </button>
                            <button
                                onClick={() => onYesNo?.(false)}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    backgroundColor: 'rgba(80, 80, 80, 0.6)',
                                    color: primaryColor,
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.transform = 'scale(1.05)';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.transform = 'scale(1)';
                                }}
                            >
                                No
                            </button>
                        </div>
                    )}

                    {/* Proceed Button */}
                    {mode === 'proceed' && (
                        <ArrowButton onClick={onProceed} />
                    )}
                </>
            )}

            <style>
                {`
                    .loading-spinner {
                        width: 20px;
                        height: 20px;
                        border: 2px solid rgba(255, 255, 255, 0.3);
                        border-radius: 50%;
                        border-top-color: ${primaryColor};
                        animation: spin 1s linear infinite;
                    }

                    @keyframes spin {
                        to {
                            transform: rotate(360deg);
                        }
                    }
                `}
            </style>
        </div>
    );
};











        












