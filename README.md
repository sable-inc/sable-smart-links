# Sable Smart Links

Product walkthroughs triggered by a specified link, integrated directly with your platform.

[![npm version](https://img.shields.io/npm/v/sable-smart-links.svg)](https://www.npmjs.com/package/sable-smart-links)
[![TypeScript](https://img.shields.io/badge/TypeScript-Supported-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-Compatible-61dafb.svg)](https://reactjs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-Compatible-black.svg)](https://nextjs.org/)

## Overview

Sable Smart Links is a JavaScript library that enables you to create interactive product walkthroughs that can be triggered via URL parameters. It's designed to help your users navigate and understand your web application through guided tours that highlight UI elements, display informative tooltips, and automate interactions.

## Features

- **URL-Triggered Walkthroughs**: Start walkthroughs automatically when users visit a specific URL
- **Interactive UI Elements**: Highlight important UI components to draw user attention
- **Spotlight Effect**: Focus user attention by darkening everything except the highlighted element
- **Clean, Modern Tooltips**: Display helpful information with customizable tooltips
- **Realistic Input Simulation**: Type text character-by-character for more natural demonstrations
- **Step-by-Step Guidance**: Guide users through complex workflows with sequential steps
- **Automated Interactions**: Simulate clicks and form inputs to demonstrate functionality
- **Responsive Design**: Works across different screen sizes and devices
- **Easy Integration**: Simple to add to any web application
- **TypeScript Support**: Full TypeScript type definitions for better developer experience
- **React Integration**: Ready-to-use React components and hooks
- **Next.js Support**: Server-side rendering compatible components for Next.js

## Installation

```bash
npm install sable-smart-links
```

or

```bash
yarn add sable-smart-links
```

## Basic Usage

```javascript
// Import the library
import SableSmartLinks from 'sable-smart-links';

// Register a walkthrough
SableSmartLinks.registerWalkthrough('new-user-onboarding', [
  {
    selector: '#welcome-panel',
    highlight: true,
    spotlight: true,
    tooltip: {
      title: 'Welcome to Our Platform',
      content: 'This dashboard gives you an overview of all your activities.',
      nextButton: 'Next'
    }
  },
  {
    selector: '.navigation-menu',
    highlight: true,
    tooltip: {
      title: 'Navigation',
      content: 'Use this menu to access different sections of the application.',
      nextButton: 'Continue'
    }
  },
  {
    selector: '#create-button',
    highlight: true,
    tooltip: {
      title: 'Create New Items',
      content: 'Click here to create new items in your workspace.',
      nextButton: 'Try it'
    },
    action: {
      type: 'click',
      autoAdvance: true
    }
  }
]);
```

When a user visits your application with the URL parameter `?walkthrough=new-user-onboarding`, the walkthrough will automatically start.

## Configuration

You can customize the behavior of Sable Smart Links by passing a configuration object when initializing:

```javascript
import { SableSmartLinks } from 'sable-smart-links';

const smartLinks = new SableSmartLinks({
  paramName: 'tour',           // Custom URL parameter name (default: 'walkthrough')
  autoStart: true,             // Start walkthrough automatically if parameter is found
  stepDelay: 800               // Delay between steps in milliseconds
});
```

## Walkthrough Step Options

Each step in a walkthrough can have the following options:

```javascript
{
  // Element targeting
  selector: '#element-id',       // CSS selector, XPath, or element ID
  
  // Visual highlighting
  highlight: true,               // Whether to highlight the element
  highlightOptions: {            // Highlight customization
    padding: 5,                  // Padding around element in pixels
    color: '#3498db',            // Highlight color
    animate: true                // Whether to animate the highlight
  },
  
  // Spotlight effect (darkens everything except the target element)
  spotlight: true,               // Whether to create a spotlight effect
  spotlightPadding: 5,           // Padding around element for spotlight (pixels)
  spotlightAnimate: true,        // Whether to animate the spotlight
  overlayOpacity: 0.5,           // Opacity of the darkened overlay (0-1)
  
  // Tooltip configuration
  tooltip: {
    title: 'Step Title',         // Tooltip title
    content: 'Step content...',   // Tooltip content (supports HTML)
    nextButton: 'Next',          // Text for the next button
    skipButton: 'Skip Tour'      // Text for the skip button (optional)
  },
  position: 'bottom',            // Tooltip position (top, right, bottom, left)
  
  // Element interaction
  action: {
    type: 'click',               // Action type (click, input, focus, hover, custom)
    value: 'Text input',         // For input actions
    typeEffect: true,            // Type text character-by-character (for input actions)
    typeDelay: 50,               // Delay between characters when typing (ms)
    delay: 500,                  // Delay before action in milliseconds
    autoAdvance: true,           // Automatically advance to next step after action
    handler: function(el) {}     // Custom action handler function
  },
  
  // Advanced options
  timeout: 5000,                 // Time to wait for element to appear (ms)
  autoAdvance: true,             // Auto-advance to next step
  autoAdvanceDelay: 3000,        // Delay before auto-advancing (ms)
  continueOnError: false,        // Continue to next step if this one fails
  callback: function(el) {}      // Custom callback function
}
```

## Framework Integrations

### React Integration

Sable Smart Links provides React components and hooks for easy integration:

```jsx
import { SmartLinksProvider, useSmartLinks } from 'sable-smart-links/react';

function App() {
  return (
    <SmartLinksProvider 
      walkthroughs={{
        'welcome': [
          // Your walkthrough steps
          {
            selector: '#header',
            highlight: true,
            tooltip: {
              title: 'Welcome',
              content: 'This is our application header.',
              nextButton: 'Next'
            }
          }
        ]
      }}
    >
      <YourApp />
    </SmartLinksProvider>
  );
}

// In a child component
function WalkthroughButton() {
  const smartLinks = useSmartLinks();
  
  return (
    <button onClick={() => smartLinks.start('welcome')}>
      Start Tour
    </button>
  );
}
```

### Next.js Integration

For Next.js applications, use the special Next.js integration that handles server-side rendering properly:

```jsx
// app/layout.jsx (App Router)
import { SmartLinksProvider } from 'sable-smart-links/next';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SmartLinksProvider 
          walkthroughs={{
            'welcome': [
              // Your walkthrough steps
            ]
          }}
        >
          {children}
        </SmartLinksProvider>
      </body>
    </html>
  );
}

// In a client component
'use client';
import { useSmartLinks } from 'sable-smart-links/next';

export default function StartButton() {
  const smartLinks = useSmartLinks();
  
  return (
    <button onClick={() => smartLinks?.start('welcome')}>
      Start Tour
    </button>
  );
}
```

### TypeScript Support

Sable Smart Links includes TypeScript definitions for all its APIs:

```typescript
import SableSmartLinks, { WalkthroughStep } from 'sable-smart-links';

// Define your walkthrough steps with type checking
const steps: WalkthroughStep[] = [
  {
    selector: '#welcome-panel',
    highlight: true,
    spotlight: true,
    tooltip: {
      title: 'Welcome',
      content: 'This is a guided tour of our application.',
      nextButton: 'Next'
    }
  }
];

// Register the walkthrough
SableSmartLinks.registerWalkthrough('welcome', steps);
```

## API Reference

### SableSmartLinks

#### Methods

- `registerWalkthrough(id, steps)`: Register a new walkthrough
- `start(walkthroughId)`: Start a walkthrough by ID
- `next()`: Go to the next step in the current walkthrough
- `end()`: End the current walkthrough

### React Hooks

- `useSmartLinks()`: Access the SableSmartLinks instance in React components
- `useWalkthrough(id, steps)`: Register and control a walkthrough in a React component

## Browser Support

Sable Smart Links supports all modern browsers:

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

MIT
