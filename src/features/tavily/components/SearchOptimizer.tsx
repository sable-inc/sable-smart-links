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
            style={{
                position: 'fixed',
                top: `${position.top}px`,
                left: `${position.left}px`,
                zIndex: 2147483647,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: 'white',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #ddd',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                maxWidth: '200px',
            }}
        >
            <div style={{
                fontSize: '14px',
                color: '#666',
                lineHeight: '1.4',
                wordWrap: 'break-word'
            }}>
                Would you like me to optimize the search parameters for your query?
            </div>
            <div 
                onClick={handleOptimize}
                style={{
                    fontSize: '18px',
                    color: '#0066cc',
                    cursor: 'pointer',
                    userSelect: 'none',
                    paddingLeft: '4px',
                    alignSelf: 'center'
                }}
            >
                &gt;
            </div>
        </div>
    );
}; 