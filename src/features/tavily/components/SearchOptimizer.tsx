import React, { useEffect, useState, useRef } from 'react';
import { suggestSearchParameters } from '../services/functions/tavilySearchParameters';

interface SearchOptimizerProps {
  apiKey: string;
}

export const SearchOptimizer: React.FC<SearchOptimizerProps> = ({ apiKey }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [currentQuery, setCurrentQuery] = useState('');
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const debounceTimer = useRef<NodeJS.Timeout>();
    
    // Add drag state
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const dragRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const setupInputWatcher = () => {
            // Find the query input
            const queryInput = document.querySelector('textarea#query') as HTMLTextAreaElement;
            if (!queryInput) {
                // If not found, retry after a short delay
                setTimeout(setupInputWatcher, 500);
                return;
            }

            // Calculate position for the popup
            const rect = queryInput.getBoundingClientRect();
            setPosition({
                top: rect.top + 20, // Align with the first line of text
                left: rect.right + 40 // 40px to the right
            });

            // Watch for input changes
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

    // Handle drag start
    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.target instanceof HTMLElement && e.target.closest('.traffic-lights')) {
            return; // Prevent dragging when clicking traffic lights
        }
        
        setIsDragging(true);
        const rect = dragRef.current?.getBoundingClientRect();
        if (rect) {
            setDragOffset({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            });
        }
    };

    // Handle drag
    const handleMouseMove = (e: MouseEvent) => {
        if (isDragging) {
            const newLeft = e.clientX - dragOffset.x;
            const newTop = e.clientY - dragOffset.y;
            
            // Keep within window bounds
            const maxLeft = window.innerWidth - (dragRef.current?.offsetWidth || 0);
            const maxTop = window.innerHeight - (dragRef.current?.offsetHeight || 0);
            
            setPosition({
                left: Math.max(0, Math.min(newLeft, maxLeft)),
                top: Math.max(0, Math.min(newTop, maxTop))
            });
        }
    };

    // Handle drag end
    const handleMouseUp = () => {
        setIsDragging(false);
    };

    // Add event listeners for drag
    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragOffset]);

    const handleOptimize = async () => {
        if (!currentQuery) return;
        try {
            await suggestSearchParameters({ query: currentQuery, apiKey });
            setIsVisible(false);
        } catch (error) {
            console.error('Error optimizing search parameters:', error);
        }
    };

    if (!isVisible) return null;

    return (
        <div 
            ref={dragRef}
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
            onMouseDown={handleMouseDown}
        >
            {/* Message text */}
            <div style={{
                fontSize: '14px',
                color: 'white',
                lineHeight: '1.4',
                wordWrap: 'break-word',
            }}>
                Would you like me to optimize the search parameters for your query?
            </div>

            {/* Button container - added marginLeft: 'auto' to push buttons right */}
            <div style={{
                display: 'flex',
                gap: '8px',
                justifyContent: 'flex-end',
                marginLeft: 'auto', // This will push the buttons to the right
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
    );
};