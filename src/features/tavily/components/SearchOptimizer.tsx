import React, { useEffect, useState, useRef } from 'react';
import { Box, Button, Text, HStack } from '@chakra-ui/react';
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
                top: rect.top,
                left: rect.right + 20 // 20px to the right of the textarea
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

            // Add input event listener
            queryInput.addEventListener('input', handleInput);

            // Cleanup
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
        <Box
            position="fixed"
            top={`${position.top}px`}
            left={`${position.left}px`}
            zIndex={9999}
            maxWidth="300px"
            bg="white"
            rounded="lg"
            shadow="lg"
            p={3}
        >
            <Text fontSize="sm" color="gray.700" mb={2}>
                Would you like me to optimize the search parameters for your query?
            </Text>
            <HStack gap={2}>
                <Button
                    size="sm"
                    colorScheme="blue"
                    onClick={() => handleOptimize()}
                >
                    Yes
                </Button>
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsVisible(false)}
                >
                    No
                </Button>
            </HStack>
        </Box>
    );
}; 