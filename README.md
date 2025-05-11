# Sable Smart Links

Product walkthroughs triggered by a specified link, integrated directly with your platform.

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

## API Reference

### SableSmartLinks

#### Methods

- `registerWalkthrough(id, steps)`: Register a new walkthrough
- `start(walkthroughId)`: Start a walkthrough by ID
- `next()`: Go to the next step in the current walkthrough
- `end()`: End the current walkthrough

## Browser Support

Sable Smart Links supports all modern browsers:

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

MIT
