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
        outline: 3px solid #0066ff; 
        box-shadow: 0 0 15px rgba(0, 102, 255, 0.7); 
        transition: all 0.3s ease-in-out; 
        animation: pulse-border 1.5s infinite alternate;
        position: relative;
        z-index: 2147483646;
    `;
    
    const styleTag = document.createElement('style');
    styleTag.textContent = `
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        @keyframes pulse-border {
            0% { box-shadow: 0 0 10px rgba(0, 102, 255, 0.6); outline-color: #0066ff; }
            100% { box-shadow: 0 0 20px rgba(0, 102, 255, 0.9); outline-color: #3399ff; }
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
    const [buttonPosition, setButtonPosition] = useState({ top: 0, left: 0, width: 0, height: 0 });
    const [exploreQuery, setExploreQuery] = useState('');
    const [buttonStyle, setButtonStyle] = useState<{originalStyle: string, styleTag: HTMLStyleElement} | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleExploreSubmit = async () => {
        if (!exploreQuery.trim() || isLoading) return;
        
        setIsLoading(true);
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
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleExploreSubmit();
        }
    };
    
    const handleCrawlClick = async () => {
        debugLog('info', 'Clicking crawl button');
        const button = document.getElementById('crawl-button');
        if (button) {
            (button as HTMLButtonElement).click();
            await wait(1000);
            setShowChatbox(true);
        }
    };
    
    useEffect(() => {
        const checkForCrawlButton = () => {
            const button = document.getElementById('crawl-button');
            
            if (button) {
                // Remove previous highlight if it exists
                if (buttonStyle) {
                    restoreElementStyle(button, buttonStyle);
                }
                
                // Add blue highlight
                const styleInfo = highlightElement(button);
                setButtonStyle(styleInfo);
                
                const rect = button.getBoundingClientRect();
                setButtonPosition({
                    top: rect.top,
                    left: rect.left,
                    width: rect.width,
                    height: rect.height
                });
                setShowHighlight(true);
            } else {
                setShowHighlight(false);
            }
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
            <div style={{
                position: 'fixed',
                top: `${buttonPosition.top + window.scrollY}px`,
                left: `${buttonPosition.left + buttonPosition.width + 12}px`,
                backgroundColor: 'rgba(60, 60, 60, 0.95)',
                border: '1px solid rgba(80, 80, 80, 0.8)',
                padding: showChatbox ? '16px 20px' : '12px 16px',
                borderRadius: '8px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                zIndex: 2147483647,
                pointerEvents: 'auto',
                transition: 'all 0.3s ease-in-out',
                width: showChatbox ? '400px' : '180px',
                backdropFilter: 'blur(8px)',
                transform: 'translateY(-50%)',
                marginTop: `${buttonPosition.height / 2}px`,
                maxHeight: '90vh',
                overflowY: 'auto'
        }}>
            {!showChatbox ? (
                // Compact view
                <div style={{
                display: 'flex',
                alignItems: 'center',
                    gap: '8px',
                    padding: '2px',
            }}>
                <div>🐻‍❄️</div>
                <div style={{
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    fontSize: '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                        color: 'white',
                        lineHeight: '1.2',
                }}>
                        <div style={{ fontWeight: '500' }}>New Feature!</div>
                        <div>Explore</div>
                        <div>Crawl!</div>
                </div>
                <div 
                    onClick={handleCrawlClick}
                    style={{
                        fontSize: '18px',
                            cursor: 'pointer',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            marginLeft: '4px',
                    }}
                >
                    &gt;
                </div>
            </div>
            ) : (
                // Expanded view
                <>
                    <div style={{
                        fontSize: '14px',
                        lineHeight: '1.5',
                        color: 'white',  // White text for dark background
                        marginBottom: '16px'
                    }}>
                        Crawl explores content from websites using natural language instructions, customizable depth and filters, to support tasks like RAG, data collection, and knowledge discovery.
                    </div>
                    <div style={{
                        fontSize: '15px',
                        fontWeight: '500',
                        color: '#66B2FF',  // Lighter blue for dark background
                        marginBottom: '12px'
                    }}>
                        What would you like to explore?
                    </div>
                    <div style={{
                        display: 'flex',
                        gap: '3px',
                        alignItems: 'center',
                        pointerEvents: 'auto',
                    }}>
                        <input
                            type="text"
                            value={exploreQuery}
                            onChange={(e) => setExploreQuery(e.target.value)}
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
                                border: '1px solid rgba(80, 80, 80, 0.8)',  // Matching border color
                                backgroundColor: 'rgba(70, 70, 70, 0.6)',  // Lighter input background
                                color: 'white',
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
                            disabled={isLoading}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: '#66B2FF',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: isLoading ? 'not-allowed' : 'pointer',
                                fontSize: '14px',
                                fontWeight: '500',
                                fontFamily: 'system-ui, -apple-system, sans-serif',
                                pointerEvents: 'auto',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                minWidth: '70px',
                                opacity: isLoading ? 0.8 : 1,
                            }}
                        >
                            {isLoading ? (
                                <div style={{
                                    width: '16px',
                                    height: '16px',
                                    border: '2px solid rgba(255, 255, 255, 0.3)',
                                    borderTopColor: 'white',
                                    borderRadius: '50%',
                                    animation: 'spin 1s linear infinite',
                                }} />
                            ) : 'Enter'}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};