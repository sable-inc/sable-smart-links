// src/pages/content/components/CrawlFeatureHighlight.tsx
import React, { useEffect, useState, KeyboardEvent } from 'react';
import OpenAI from "openai";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { generateCrawlInstructions } from '../services/functions/crawlnstructions';

// Debug logging
const debugLog = (level: 'info' | 'error', ...args: any[]) => {
    console[level]('[CrawlFeature]:', ...args);
};

// Zod schema for OpenAI response
const CrawlInstructionsSchema = z.object({
    url: z.string().describe('The most relevant URL to crawl based on the query'),
    instruction: z.string().describe('Natural language instruction for how to crawl the URL')
});

type CrawlInstructions = z.infer<typeof CrawlInstructionsSchema>;

// Helper functions
const wait = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

const highlightElement = (element: Element) => {
    const originalStyle = element.getAttribute('style') || '';
    const highlightStyle = `
        ${originalStyle}; 
        outline: 5px solid #FF0000; 
        box-shadow: 0 0 20px rgba(255, 0, 0, 0.9); 
        transition: box-shadow 0.5s ease-in-out; 
        animation: pulse-border 1s infinite alternate;
    `;
    
    const styleTag = document.createElement('style');
    styleTag.textContent = `
        @keyframes pulse-border {
            0% { box-shadow: 0 0 15px rgba(255, 0, 0, 0.8); outline-color: #FF0000; }
            100% { box-shadow: 0 0 25px rgba(255, 0, 0, 1); outline-color: #FF5500; }
        }
    `;
    document.head.appendChild(styleTag);
    element.setAttribute('style', highlightStyle);
    return { originalStyle, styleTag };
};

const restoreElementStyle = (element: Element, styleInfo: { originalStyle: string, styleTag: HTMLStyleElement }) => {
    element.setAttribute('style', styleInfo.originalStyle);
    if (styleInfo.styleTag && document.head.contains(styleInfo.styleTag)) {
        document.head.removeChild(styleInfo.styleTag);
    }
};

const typeTextAsync = async (
    targetElement: string | Element,
    text: string,
    typingSpeed = 50,
    clearExisting = true,
    waitForElement = true,
    maxWaitTime = 5000
): Promise<boolean> => {
    let element: Element | null = null;
    
    if (typeof targetElement === 'string') {
        if (waitForElement) {
            const startTime = Date.now();
            while (!element && Date.now() - startTime < maxWaitTime) {
                element = document.querySelector(targetElement);
                if (!element) await wait(100);
            }
        } else {
            element = document.querySelector(targetElement);
        }
    } else {
        element = targetElement;
    }
    
    if (!element || (!(element instanceof HTMLInputElement) && !(element instanceof HTMLTextAreaElement))) {
        debugLog('error', 'Target element not found or not input/textarea');
        return false;
    }
    
    element.focus();
    if (clearExisting) element.value = '';
    
    for (let i = 0; i < text.length; i++) {
        element.value += text[i];
        element.dispatchEvent(new Event('input', { bubbles: true }));
        await wait(typingSpeed);
    }
    
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
};

// Add apiKey to props interface
interface CrawlFeatureHighlightProps {
    apiKey: string;
}

export const CrawlFeatureHighlight: React.FC<CrawlFeatureHighlightProps> = ({ apiKey }) => {
    const [showHighlight, setShowHighlight] = useState(false);
    const [showChatbox, setShowChatbox] = useState(false);
    const [buttonPosition, setButtonPosition] = useState({ top: 0, left: 0, width: 0 });
    const [exploreQuery, setExploreQuery] = useState('');

    const handleExploreSubmit = async () => {
        if (!exploreQuery.trim()) return;
        
        try {
            const instructions = await generateCrawlInstructions({
                query: exploreQuery.trim(),
                apiKey  // Pass the apiKey to the function
            });

            // Use the exact selectors from the HTML
            const urlInput = document.querySelector('textarea[placeholder="tavily.com"]');
            const instructionsInput = document.querySelector('textarea[placeholder="Get all pages on developer documentation"]');

            if (!urlInput || !instructionsInput) {
                debugLog('error', 'Could not find input elements:', {
                    urlFound: !!urlInput,
                    instructionsFound: !!instructionsInput
                });
                return;
            }

            // Type the URL
            await typeTextAsync(
                urlInput,
                instructions.url,
                50,
                true
            );

            await wait(500);

            // Type the instructions
            await typeTextAsync(
                instructionsInput,
                instructions.instruction,
                50,
                true
            );

            setExploreQuery('');
            setShowChatbox(false);
        } catch (error) {
            debugLog('error', 'Error:', error);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleExploreSubmit();
        }
    };
    
    const handleCrawlClick = async () => {
        debugLog('info', 'Clicking crawl button');
        const allFeatureTextElements = document.querySelectorAll('p.chakra-text');
        
        for (const element of allFeatureTextElements) {
            const buttonText = element.textContent?.trim() || '';
            if (buttonText.toLowerCase() === 'crawl') {
                const button = element.closest('button');
                if (button) {
                    (button as HTMLButtonElement).click();
                    await wait(1000);
                    setShowChatbox(true);
                    return;
                }
            }
        }
    };
    
    useEffect(() => {
        const checkForCrawlButton = () => {
            // debugLog('info', 'Checking for crawl button');
            const allFeatureTextElements = document.querySelectorAll('p.chakra-text');
            
            for (const element of allFeatureTextElements) {
                const buttonText = element.textContent?.trim() || '';
                if (buttonText.toLowerCase() === 'crawl') {
                    // debugLog('info', 'Found crawl button');
                    const button = element.closest('button');
                    if (button) {
                        const rect = button.getBoundingClientRect();
                        setButtonPosition({
                            top: rect.top,
                            left: rect.left,
                            width: rect.width
                        });
                        setShowHighlight(true);
                        return;
                    }
                }
            }
            // debugLog('info', 'Crawl button not found');
            setShowHighlight(false);
        };
        
        checkForCrawlButton();
        const observer = new MutationObserver(checkForCrawlButton);
        observer.observe(document.body, { childList: true, subtree: true });
        
        window.addEventListener('scroll', checkForCrawlButton);
        window.addEventListener('resize', checkForCrawlButton);
        
        return () => {
            observer.disconnect();
            window.removeEventListener('scroll', checkForCrawlButton);
            window.removeEventListener('resize', checkForCrawlButton);
        };
    }, []);

    if (!showHighlight) return null;

    return (
        <>
            <div style={{
                position: 'fixed',
                top: `${Math.max(buttonPosition.top - 60, 10)}px`,
                left: `${buttonPosition.left}px`,
                backgroundColor: 'white',
                padding: '12px 16px',
                borderRadius: '8px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                zIndex: 2147483647,
                pointerEvents: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: 'fit-content',
                minWidth: `${buttonPosition.width}px`,
            }}>
                <div>🐻‍❄️</div>
                <div style={{
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    fontSize: '14px',
                    whiteSpace: 'nowrap'
                }}>
                    New Feature! Explore Crawl!
                </div>
                <div 
                    onClick={handleCrawlClick}
                    style={{
                        fontSize: '18px',
                        color: '#0066cc',
                        cursor: 'pointer'
                    }}
                >
                    &gt;
                </div>
            </div>

            {showChatbox && (
                <div style={{
                    position: 'fixed',
                    top: `${Math.max(buttonPosition.top - 60, 10)}px`,
                    left: `${buttonPosition.left + 400}px`,
                    backgroundColor: 'white',
                    padding: '16px 20px',
                    borderRadius: '12px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                    zIndex: 2147483647,
                    width: '400px',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    pointerEvents: 'auto',
                }}>
                    <div style={{
                        fontSize: '14px',
                        lineHeight: '1.5',
                        color: '#333',
                        marginBottom: '16px'
                    }}>
                        Crawl explores content from websites using natural language instructions, customizable depth and filters, to support tasks like RAG, data collection, and knowledge discovery.
                    </div>
                    <div style={{
                        fontSize: '15px',
                        fontWeight: '500',
                        color: '#0066cc',
                        marginBottom: '12px'
                    }}>
                        What would you like to explore?
                    </div>
                    <div style={{
                        display: 'flex',
                        gap: '8px',
                        alignItems: 'center',
                        pointerEvents: 'auto',
                    }}>
                        <input
                            type="text"
                            value={exploreQuery}
                            onChange={(e) => {
                                const newValue = e.target.value;
                                console.log('Input changed to:', newValue);
                                setExploreQuery(newValue);
                            }}
                            onKeyDown={(e) => {
                                e.stopPropagation();
                                if (e.key === 'Enter') {
                                    handleExploreSubmit();
                                }
                            }}
                            placeholder="I would like to explore..."
                            style={{
                                flex: 1,
                                padding: '8px 12px',
                                borderRadius: '6px',
                                border: '1px solid #ddd',
                                fontSize: '14px',
                                outline: 'none',
                                fontFamily: 'system-ui, -apple-system, sans-serif',
                                pointerEvents: 'auto',
                            }}
                        />
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleExploreSubmit();
                            }}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: '#0066cc',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: '500',
                                fontFamily: 'system-ui, -apple-system, sans-serif',
                                pointerEvents: 'auto',
                            }}
                        >
                            Enter
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};