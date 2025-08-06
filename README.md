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
- **Automated Interactions**: Simulate clicks and form form inputs to demonstrate functionality
- **Global Popup Management**: Ensures only one popup is active at a time, preventing conflicts
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
import SableSmartLinks from "sable-smart-links";

// Register a walkthrough
SableSmartLinks.registerWalkthrough("new-user-onboarding", [
  {
    stepId: "welcome-step",
    selector: "#welcome-panel",
    highlight: true,
    spotlight: true,
    tooltip: {
      title: "Welcome to Our Platform",
      content: "This dashboard gives you an overview of all your activities.",
      nextButton: "Next",
    },
  },
  {
    stepId: "navigation-step",
    selector: ".navigation-menu",
    highlight: true,
    tooltip: {
      title: "Navigation",
      content: "Use this menu to access different sections of the application.",
      nextButton: "Continue",
    },
  },
  {
    stepId: "create-step",
    selector: "#create-button",
    highlight: true,
    tooltip: {
      title: "Create New Items",
      content: "Click here to create new items in your workspace.",
      nextButton: "Try it",
    },
    action: {
      type: "click",
      autoAdvance: true,
    },
  },
]);
```

When a user visits your application with the URL parameter `?walkthrough=new-user-onboarding`, the walkthrough will automatically start.

## Configuration

You can customize the behavior of Sable Smart Links by passing a configuration object when initializing:

```javascript
import { SableSmartLinks } from "sable-smart-links";

const smartLinks = new SableSmartLinks({
  paramName: "tour", // Custom URL parameter name (default: 'walkthrough')
  autoStart: true, // Start walkthrough automatically if parameter is found
  stepDelay: 800, // Delay between steps in milliseconds
});
```

## Walkthrough Step Options

Each step in a walkthrough can have the following options:

```javascript
{
  // Required: Unique identifier for the step (used in analytics)
  stepId: 'welcome-step',        // Unique identifier for analytics tracking

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

## End Tour Button

When a walkthrough is running, an "End Tour" button automatically appears at the bottom center of the screen. This button allows users to terminate the walkthrough at any time.

### Features

- **Fixed Positioning**: The button is positioned at the bottom center of the screen
- **Modern Design**: Dark glassmorphism styling with backdrop blur for a modern look
- **High Visibility**: Semi-transparent design with hover effects to ensure it's easily noticeable
- **Automatic Management**: Appears when a walkthrough starts and disappears when it ends
- **Responsive Design**: Works across different screen sizes and devices
- **Smooth Animations**: Includes entrance and exit animations for better UX

### Behavior

- **Appears**: Automatically when a walkthrough starts via `startWalkthrough()` or when restored from localStorage
- **Disappears**: Automatically when a walkthrough ends via `endWalkthrough()` or when the user clicks the button
- **Functionality**: Clicking the button immediately terminates the current walkthrough and cleans up all UI elements

### Customization

The end tour button is automatically managed by the walkthrough engine and doesn't require any additional configuration. It's designed to be unobtrusive while providing an easy way for users to exit walkthroughs.

```javascript
// The end tour button appears automatically when you start a walkthrough
smartLinks.startWalkthrough("my-walkthrough");

// It disappears automatically when the walkthrough ends
smartLinks.endWalkthrough();
```

````

## Menu Trigger System

The library includes a menu trigger system that creates and manages a button that acts as a menu trigger. The button will automatically hide when any popup is active and show a menu popup when clicked. The button can be positioned in corners or attached to specific DOM elements.

### Features

- **Automatic Visibility Management**: Trigger buttons are hidden when popups are active
- **Flexible Positioning**: Position buttons in corners or attach to specific DOM elements
- **URL Path Filtering**: Show/hide buttons based on current URL paths
- **Center-Screen Menu Popups**: Menu popups appear in the center of the screen
- **Configurable Menu Content**: Define sections and items with custom handlers
- **Chat Integration**: Optional chat functionality in menu popups
- **Custom Styling**: Fully customizable button appearance

### Usage

```javascript
import SableSmartLinks from "sable-smart-links";

const sable = new SableSmartLinks({
  menu: {
    enabled: true,
    text: "Open Menu",
    position: "bottom-right",
    targetElement: {
      selector: ".menu-container",
      position: "top",
    },
    urlPaths: [], // Show on all paths
    style: {
      backgroundColor: "#4A90E2",
      color: "#FFFFFF",
      borderRadius: "20px",
      padding: "8px 16px",
      fontSize: "14px",
      boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
    },
    popupConfig: {
      enableChat: true,
      sections: [
        {
          title: "Quick Actions",
          icon: "⚡",
          items: [
            { text: "Action 1", data: { action: "action1" } },
            { text: "Action 2", data: { action: "action2" } },
          ],
          onSelect: (item) => {
            console.log("Selected:", item);
          },
        },
      ],
    },
  },
});
````

### React Integration

```javascript
import { SableSmartLinksProvider } from "sable-smart-links/react";

function App() {
  return (
    <SableSmartLinksProvider
      menu={{
        enabled: true,
        text: "Open Menu",
        position: "bottom-right",
        targetElement: {
          selector: ".menu-container",
          position: "top",
        },
        urlPaths: [],
        style: {
          backgroundColor: "#4A90E2",
          color: "#FFFFFF",
          borderRadius: "20px",
          padding: "8px 16px",
          fontSize: "14px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
        },
        popupConfig: {
          enableChat: true,
          sections: [
            {
              title: "Actions",
              items: [{ text: "Do Something", data: { action: "something" } }],
              onSelect: (item) => console.log(item),
            },
          ],
        },
      }}
    >
      <YourApp />
    </SableSmartLinksProvider>
  );
}
```

## Global Popup Manager

The library includes a global popup manager that ensures only one popup is active at a time across your entire application. This prevents issues with multiple popups being created simultaneously, which can happen during viewport resizing or rapid user interactions.

### Features

- **Single Popup Guarantee**: Only one popup can be active at any time
- **Automatic Cleanup**: Previous popups are automatically closed when new ones are shown
- **State Tracking**: Track whether a popup is active
- **Event Listeners**: Subscribe to popup state changes

### Usage

```javascript
import globalPopupManager from "sable-smart-links/ui/GlobalPopupManager.js";

// Show a popup (automatically closes any existing popup)
const popup = globalPopupManager.showPopup({
  text: "This is a popup message",
  boxWidth: 300,
  buttonType: "arrow",
  onProceed: () => console.log("Proceed clicked"),
});

// Check popup state
const state = globalPopupManager.getState();
console.log("Has active popup:", state.hasActivePopup);

// Listen for state changes
globalPopupManager.addListener((state) => {
  console.log("Popup state changed:", state);
});

// Close all popups
globalPopupManager.closeActivePopup();
```

### React Integration

When using the React provider, you can access popup state through the context:

```javascript
import { useSableSmartLinks } from "sable-smart-links/react";

function MyComponent() {
  const { hasActivePopup, closeAllPopups } = useSableSmartLinks();

  return (
    <div>
      <p>Popup active: {hasActivePopup ? "Yes" : "No"}</p>
      <button onClick={closeAllPopups}>Close All Popups</button>
    </div>
  );
}
```

## Text Agent

Sable Smart Links includes a powerful text agent system that can guide users through interactive popup-based workflows.

### Basic Usage

```javascript
import SableSmartLinks from "sable-smart-links";

const sable = new SableSmartLinks();

// Register a text agent
sable.registerTextAgent(
  "onboarding",
  [
    {
      id: "welcome",
      text: "Welcome to our platform! Let's get you started.",
      buttonType: "arrow",
    },
    {
      id: "step1",
      text: "This is the first step of your onboarding.",
      buttonType: "arrow",
    },
    {
      id: "final",
      text: "You're all set! Welcome aboard.",
      buttonType: "arrow",
    },
  ],
  true,
  true,
  null,
  "#onboarding-container"
);
```

### Advanced Configuration

The `registerTextAgent` method accepts several configuration options:

```javascript
sable.registerTextAgent(
  "agentId", // Unique identifier for the agent
  steps, // Array of step objects
  autoStart, // Whether to start automatically (default: false)
  autoStartOnce, // Only auto-start once per session (default: true)
  beforeStart, // Optional function to run before starting
  requiredSelector, // CSS selector that must exist for agent to run
  endWithoutSelector // End immediately when selector disappears (default: false)
);
```

### endWithoutSelector Feature

The `endWithoutSelector` parameter allows you to control when a text agent should end when its required selector is removed from the DOM:

- **`endWithoutSelector: false` (default)**: The agent will only end if the required selector disappears AND no steps have been rendered yet
- **`endWithoutSelector: true`**: The agent will end immediately when the required selector disappears, even if steps have been rendered

```javascript
// Agent that ends immediately when target element is removed
sable.registerTextAgent(
  "temporary-guide",
  steps,
  false,
  false,
  null,
  "#temp-container",
  true
);

// Agent that continues running even after target is removed (if steps were rendered)
sable.registerTextAgent(
  "persistent-guide",
  steps,
  false,
  false,
  null,
  "#persistent-container",
  false
);
```

### Step Configuration

Each step can have various options:

```javascript
{
  id: 'unique-step-id',
  text: 'Step content or function that returns content',
  secondaryText: 'Optional secondary text',
  buttonType: 'arrow' | 'yes-no',
  boxWidth: 300,
  primaryColor: '#FFFFFF',
  targetElement: {
    selector: '#target-element',
    position: 'top' | 'right' | 'bottom' | 'left'
  },
  autoAdvance: true,
  autoAdvanceDelay: 1000,
  onProceed: (textInput) => {
    // Handle proceed action
  },
  onYesNo: (isYes) => {
    // Handle yes/no selection
  }
}
```

## Tavily Helper Functions

Sable Smart Links includes helper functions for optimizing Tavily search and crawl parameters using AWS Bedrock. These functions can help you get the best results from Tavily's API by automatically determining optimal parameters based on your query or crawl instructions.

### Installation

The tavily helper functions are included in the main package and can be imported separately:

```javascript
import {
  getOptimalCrawlParameters,
  getOptimalSearchParameters,
} from "sable-smart-links/tavily";
```

### Usage

#### getOptimalCrawlParameters

Get optimal crawl parameters for a given URL and instructions:

```javascript
import { getOptimalCrawlParameters } from "sable-smart-links/tavily";

const bedrockApiKey = "YOUR_ACCESS_KEY:YOUR_SECRET_KEY"; // AWS Bedrock credentials

try {
  const params = await getOptimalCrawlParameters(
    "https://example.com/docs",
    "Crawl the documentation to understand the API structure and available endpoints",
    bedrockApiKey
  );

  console.log("Crawl Parameters:", params);
  // {
  //   extractDepth: "advanced",
  //   categories: ["Documentation", "Blogs"],
  //   explanation: "I've set the following parameters:<br> **Extract Depth is advanced** — Documentation sites need detailed extraction.<br> **Categories include Documentation** — API docs are the primary target.<br>",
  //   otherCrawls: [
  //     { url: "https://example.com/api", instructions: "Crawl the API reference documentation" },
  //     { url: "https://example.com/tutorials", instructions: "Crawl tutorials and guides" }
  //   ]
  // }

  // Use the parameters for your Tavily crawl
  const tavilyCrawlConfig = {
    extractDepth: params.extractDepth,
    categories: params.categories,
  };
} catch (error) {
  console.error("Error:", error);
}
```

#### getOptimalSearchParameters

Get optimal search parameters for a given query:

```javascript
import { getOptimalSearchParameters } from "sable-smart-links/tavily";

const bedrockApiKey = "YOUR_ACCESS_KEY:YOUR_SECRET_KEY"; // AWS Bedrock credentials

try {
  const params = await getOptimalSearchParameters(
    "latest developments in artificial intelligence and machine learning",
    bedrockApiKey
  );

  console.log("Search Parameters:", params);
  // {
  //   searchTopic: "news",
  //   searchDepth: "advanced",
  //   timeRange: "month",
  //   includeAnswer: "advanced",
  //   explanation: "I've set the following parameters:<br> **Search Topic is news** — AI/ML developments are current events.<br> **Search Depth is advanced** — Complex topic needs detailed analysis.<br> **Time Range is month** — Recent developments are most relevant.<br>",
  //   otherQueries: [
  //     "AI breakthroughs 2024",
  //     "machine learning research papers",
  //     "artificial intelligence industry trends"
  //   ]
  // }

  // Use the parameters for your Tavily search
  const tavilySearchConfig = {
    searchTopic: params.searchTopic,
    searchDepth: params.searchDepth,
    timeRange: params.timeRange,
    includeAnswer: params.includeAnswer,
  };
} catch (error) {
  console.error("Error:", error);
}
```

### Next.js API Route Example

Here's how to use these functions in a Next.js API route:

```javascript
// pages/api/tavily-optimize.js
import {
  getOptimalCrawlParameters,
  getOptimalSearchParameters,
} from "sable-smart-links/tavily";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { url, instructions, query, type } = req.body;
    const bedrockApiKey = process.env.BEDROCK_API_KEY; // Set in your environment variables

    if (!bedrockApiKey) {
      return res
        .status(500)
        .json({ error: "BEDROCK_API_KEY environment variable is required" });
    }

    if (type === "crawl") {
      if (!url || !instructions) {
        return res.status(400).json({
          error: "URL and instructions are required for crawl optimization",
        });
      }

      const params = await getOptimalCrawlParameters(
        url,
        instructions,
        bedrockApiKey
      );

      return res.status(200).json({
        success: true,
        data: {
          explanation: params.explanation,
          otherCrawls: params.otherCrawls,
          crawlParams: {
            extractDepth: params.extractDepth,
            categories: params.categories,
          },
        },
      });
    } else if (type === "search") {
      if (!query) {
        return res
          .status(400)
          .json({ error: "Query is required for search optimization" });
      }

      const params = await getOptimalSearchParameters(query, bedrockApiKey);

      return res.status(200).json({
        success: true,
        data: {
          explanation: params.explanation,
          otherQueries: params.otherQueries,
          searchParams: {
            searchTopic: params.searchTopic,
            searchDepth: params.searchDepth,
            timeRange: params.timeRange,
            includeAnswer: params.includeAnswer,
          },
        },
      });
    } else {
      return res
        .status(400)
        .json({ error: 'Type must be either "crawl" or "search"' });
    }
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      error: "Failed to process optimization",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
```

### Requirements

- AWS Bedrock API credentials in the format `ACCESS_KEY:SECRET_KEY`
- The `@aws-sdk/client-bedrock-runtime` package (included as a dependency)

### Types

The functions return typed objects with the following interfaces:

```typescript
interface CrawlParameters {
  extractDepth: "basic" | "advanced";
  categories: (
    | "Documentation"
    | "Blogs"
    | "Community"
    | "About"
    | "Contact"
    | "Pricing"
    | "Enterprise"
    | "Careers"
    | "E-Commerce"
    | "Media"
    | "People"
  )[];
  explanation: string;
  otherCrawls: { url: string; instructions: string }[];
}

interface SearchParameters {
  searchTopic: "general" | "news" | "finance";
  searchDepth: "basic" | "advanced";
  timeRange: "none" | "day" | "week" | "month" | "year";
  includeAnswer: "none" | "basic" | "advanced";
  explanation: string;
  otherQueries: string[];
}
```

## API Reference

### SableSmartLinks

#### Methods

- `registerWalkthrough(id, steps)`: Register a new walkthrough
- `start(walkthroughId)`: Start a walkthrough by ID
- `next()`: Go to the next step in the current walkthrough
- `end()`: End the current walkthrough
- `registerTextAgent(id, steps, autoStart, autoStartOnce, beforeStart, requiredSelector, endWithoutSelector)`: Register a text agent
- `startTextAgent(agentId, stepId, skipTrigger)`: Start a text agent
- `nextTextAgentStep()`: Go to next step in current text agent
- `previousTextAgentStep()`: Go to previous step in current text agent
- `endTextAgent()`: End the current text agent
- `showPopup(options)`: Show a popup (uses global popup manager)
- `closeAllPopups()`: Close all active popups

## Browser Support

Sable Smart Links supports all modern browsers:

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

MIT
