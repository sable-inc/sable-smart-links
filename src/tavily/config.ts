import Interactor from '../interactor';

// Import functions from the same directory to avoid circular dependencies
import { pickTab, beforeCrawlTuning, runCrawlTuning } from './crawl';
import { beforeSearchTuning, runSearchTuning } from './search';

// Helper function to determine target element position based on screen width
function getTargetElementPosition(): 'right' | 'bottom' {
  // Check if we're in a browser environment
  if (typeof window !== 'undefined') {
    // Mobile breakpoint - typically 768px or less
    return window.innerWidth <= 768 ? 'bottom' : 'right';
  }
  // Default to 'right' for server-side rendering
  return 'right';
}

export const sableConfig = {
  config: {
    debug: true,
    walkthrough: {
      paramName: 'walkthrough',
      autoStart: true,
      stepDelay: 500
    },
  },
  menu: {
    debug: true,
    enabled: true,
    position: 'bottom-left',
    text: 'Digital Expert',
    targetElement: {
      selector: 'a[href="https://status.tavily.com"]',
      position: 'left',
    },
    popupConfig: {
      sections: [
        {
          title: 'Product Tours',
          items: [
            {
              icon: '💰',
              text: 'Billing page tour',
              data: { url: '/billing?walkthrough=billing' },
            },
            {
              icon: '🧑‍💻',
              text: 'API playground tour',
              data: { url: '/playground?walkthrough=api-playground' },
            },
            {
              icon: '👥',
              text: 'Team creation tour',
              data: { url: '/settings?walkthrough=create-team' },
            }
          ],
          onSelect: (item: any) => {
            // Navigate the page to the URL in the data object
            window.location.href = item.data.url;
          }
        },
        {
          title: 'Helpers',
          items: [
            {
              icon: '🔍',
              text: 'Search Parameter Tuning',
              data: { url: '/playground', textAgent: 'search' }
            },
            {
              icon: '📑',
              text: 'Crawl Parameter Tuning',
              data: { url: '/playground', textAgent: 'crawl' }
            },
          ],
          onSelect: async (item: any) => {
            if (window.location.pathname !== item.data.url) {
              Interactor.startAgent(item.data.textAgent, { stepId: 'welcome', skipTrigger: true, useSessionStorage: true });
              window.location.href = item.data.url;
            } else {
              Interactor.startAgent(item.data.textAgent, { stepId: 'welcome', skipTrigger: true });
            }
          }
        },
      ],
    },
  },
  textAgents: {
    'search': {
      autoStart: true,
      autoStartOnce: true,
      requiredSelector: "#query",
      beforeStart: beforeSearchTuning,
      steps: [
        {
          id: 'welcome',
          text: 'Would you like to optimize your search parameters based on your query?',
          buttonType: 'yes-no',
          requiredSelector: "#query",
          autoAdvance: false,
          boxWidth: 320,
          triggerOnTyping: {
            selector: '#query',
            on: 'stop',
            stopDelay: 600
          },
          targetElement: {
            selector: '#query',
            waitForElement: true,
            waitTimeout: 3000,
            position: getTargetElementPosition(),
          },
          onYesNo: searchOnYesNo,
        },
        {
          id: 'try-again',
          text: (dataUtils: { getStepData: (arg0: string) => string; }) => dataUtils?.getStepData("searchParamsExplanation"),
          buttonType: 'arrow',
          requiredSelector: "#query",
          autoAdvance: false,
          targetElement: {
            selector: '#query',
            waitForElement: true,
            waitTimeout: 3000,
            position: getTargetElementPosition(),
          },
          onProceed: (_: any, dataUtils: any) => searchOnYesNo(true, dataUtils),
        },
        {
          id: 'optimizing',
          text: (dataUtils: { getStepData: (arg0: string) => string; }) => {
            const query = dataUtils?.getStepData("query");
            return `Optimizing search parameters for "${query}"...`;
          },
          pulse: true,
          buttonType: 'none',
          requiredSelector: "#query",
          autoAdvance: false,
          targetElement: {
            selector: '#query',
            waitForElement: true,
            waitTimeout: 3000,
            position: getTargetElementPosition(),
          },
        },
        {
          id: 'explanation',
          text: (dataUtils: { getStepData: (arg0: string) => string; }) => {
            const explanation = dataUtils?.getStepData("searchParamsExplanation");
            return explanation;
          },
          sections: (dataUtils: { getStepData: (arg0: string) => string[]; setStepData: (arg0: string, arg1: string | string[]) => void; }) => {
            const otherQueries = dataUtils?.getStepData("otherQueries") ?? [];
            return [
              {
                title: otherQueries.length === 0 ? undefined : 'Try Another Search?',
                items: otherQueries.length === 0 ? [
                  {
                    icon: '🔍',
                    text: 'Try a new search',
                    data: { search: '' }
                  }
                ] : otherQueries.map(query => ({
                  icon: '🔍',
                  text: query,
                  data: { search: query }
                })),
                onSelect: async (item: any) => {
                  const queryElement = Interactor.getElement('#query') as HTMLInputElement | HTMLTextAreaElement;
                  if (item.data.search === '') {
                    Interactor.startAgent('search', { stepId: 'welcome' });
                    return;
                  }
                  if (queryElement) {
                    if (queryElement instanceof HTMLTextAreaElement || queryElement instanceof HTMLInputElement) {
                      Interactor.setInputValue(queryElement, item.data.search);
                      dataUtils.setStepData("query", item.data.search);
                      Interactor.startAgent('search', { stepId: 'optimizing' });
                      await searchOnProceed(null, dataUtils);
                      Interactor.startAgent('search', { stepId: 'explanation' });
                    }
                  }
                }
              }
            ];
          },
          buttonType: 'none',
          autoAdvance: true,
          autoAdvanceDelay: 3000,
          requiredSelector: "#query",
          boxWidth: 320,
          targetElement: {
            selector: '#query',
            waitForElement: true,
            waitTimeout: 3000,
            position: getTargetElementPosition(),
          },
        },
      ]
    },
    'direct-to-crawl': {
      autoStart: true,
      autoStartOnce: true,
      requiredSelector: '//a[contains(@class, "css-yf5gc") and contains(text(), "Overview")]',
      steps: [
        {
          id: 'welcome',
          text: 'Try out our new Crawl feature!',
          buttonType: 'arrow',
          onProceed: async () => {
            window.location.href = '/playground';
            // wait for the page to load
            await new Promise(resolve => setTimeout(resolve, 2000));
          },
          targetElement: {
            selector: '//div[contains(@class, "css-19pt9d4")]',
            waitForElement: true,
            waitTimeout: 3000,
            position: 'bottom',
          },
        }
      ]
    },
    'select-crawl-tab': {
      autoStart: true,
      autoStartOnce: true,
      requiredSelector: '//button[contains(@class, "css-1am23gf") and .//p[contains(text(), "Crawl")]]',
      steps: [
        {
          id: 'welcome',
          text: 'Check out the Crawl tab!',
          buttonType: 'arrow',
          onProceed: async () => {
            await pickTab('crawl');
          },
          targetElement: {
            selector: '//button[contains(@class, "css-1am23gf") and .//p[contains(text(), "Crawl")]]',
            waitForElement: true,
            waitTimeout: 3000,
            position: 'right',
          },
        }
      ]
    },
    crawl: {
      autoStart: true,
      autoStartOnce: true,
      requiredSelector: "#instructions",
      beforeStart: beforeCrawlTuning,
      steps: [
        {
          id: 'welcome',
          text: 'Would you like to optimize your crawl parameters based on your instructions?',
          buttonType: 'yes-no',
          requiredSelector: "#instructions",
          autoAdvance: false,
          boxWidth: 320,
          triggerOnTyping: {
            selector: '#instructions',
            on: 'stop',
            stopDelay: 600
          },
          targetElement: {
            selector: '#instructions',
            waitForElement: true,
            waitTimeout: 3000,
            position: getTargetElementPosition(),
          },
          onYesNo: crawlOnYesNo,
        },
        {
          id: 'try-again',
          text: (dataUtils: { getStepData: (arg0: string) => string; }) => dataUtils?.getStepData("crawlParamsExplanation"),
          buttonType: 'arrow',
          requiredSelector: "#instructions",
          autoAdvance: false,
          boxWidth: 320,
          targetElement: {
            selector: '#instructions',
            waitForElement: true,
            waitTimeout: 3000,
            position: getTargetElementPosition(),
          },
          onProceed: (_: any, dataUtils: any) => crawlOnYesNo(true, dataUtils),
        },
        {
          id: 'optimizing',
          text: (dataUtils: { getStepData: (arg0: string) => string; }) => {
            const instructions = dataUtils?.getStepData("instructions");
            const url = dataUtils?.getStepData("url");
            return `Optimizing crawl parameters for "${instructions}" on ${url}...`;
          },
          pulse: true,
          buttonType: 'none',
          requiredSelector: "#instructions",
          autoAdvance: false,
          targetElement: {
            selector: '#instructions',
            waitForElement: true,
            waitTimeout: 3000,
            position: getTargetElementPosition(),
          },
        },
        {
          id: 'explanation',
          text: (dataUtils: { getStepData: (arg0: string) => string; }) => {
            const explanation = dataUtils?.getStepData("crawlParamsExplanation");
            return explanation;
          },
          sections: (dataUtils: { getStepData: (arg0: string) => any[]; setStepData: (arg0: string, arg1: string | string[]) => void; }) => {
            const otherCrawls = dataUtils?.getStepData("otherCrawls") ?? [];
            return [
              {
                title: otherCrawls.length === 0 ? undefined : `Try another crawl on ${dataUtils?.getStepData("url")}?`,
                items: otherCrawls.length === 0 ? [
                  {
                    icon: '📑',
                    text: 'Try a new crawl',
                    data: { url: '', instructions: '' }
                  }
                ] : otherCrawls.map(crawl => ({
                  icon: '📑',
                  text: crawl,
                  data: { url: dataUtils?.getStepData("url"), instructions: crawl }
                })),
                onSelect: async (item: any) => {
                  const urlElement = Interactor.getElement('#url') as HTMLInputElement | HTMLTextAreaElement;
                  if (urlElement) {
                    if (urlElement instanceof HTMLTextAreaElement || urlElement instanceof HTMLInputElement) {
                      Interactor.setInputValue(urlElement, item.data.url);
                    }
                  }
                  const instructionsElement = Interactor.getElement('#instructions') as HTMLInputElement | HTMLTextAreaElement;
                  if (instructionsElement) {
                    if (instructionsElement instanceof HTMLTextAreaElement || instructionsElement instanceof HTMLInputElement) {
                      Interactor.setInputValue(instructionsElement, item.data.instructions);
                      dataUtils.setStepData("instructions", item.data.instructions);
                    }
                  }
                  Interactor.startAgent('crawl', { stepId: 'optimizing' });
                  await crawlOnYesNo(true, dataUtils);
                  Interactor.startAgent('crawl', { stepId: 'explanation' });
                }
              }
            ];
          },
          buttonType: 'none',
          autoAdvanceDelay: 3000,
          requiredSelector: "#instructions",
          boxWidth: 320,
          targetElement: {
            selector: '#instructions',
            waitForElement: true,
            waitTimeout: 3000,
            position: getTargetElementPosition(),
          },
        },
      ]
    },
  },
  walkthroughs: {
    'billing': [
      {
        // First step - Highlight Billing Title
        stepId: "welcome",
        selector: '//*[contains(@class, "css-yf5gc")]',
        spotlight: {
          offsetX: 13,
          offsetY: 5,
        },
        tooltip: {
          title: "Welcome to Billing!",
          content: "Here you can manage your plan, payment methods, and API credit usage. Let's ensure you're set up for uninterrupted access.",
          offsetX: 13,
          offsetY: 5,
        }
      },
      {
        // Second step - Highlight Current Plan
        stepId: "current-plan",
        selector: '//*[contains(@class, "css-jugcby")]',
        spotlight: {
          offsetX: 15,
          offsetY: 8,
        },
        tooltip: {
          title: "Your Current Plan",
          content: "This is your current billing plan. Once you've had a chance to test the platform, we recommend enabling Pay as You Go. It's flexible, requires no commitment, and you can cancel anytime.",
          offsetX: 5,
          offsetY: 8,
        }
      },
      {
        // Third step - Monthly Plans Toggle
        stepId: "monthly-plans",
        selector: '//*[contains(@class, "css-rmm6nl")]',
        spotlight: {
          offsetX: 35,
          offsetY: 15,
        },
        tooltip: {
          title: "Monthly Plans",
          content: "Prefer predictable billing? You can switch to a fixed monthly plan or enable Auto Upgrade to seamlessly cover any overages.",
          offsetX: 5,
          offsetY: 15,
        }
      }
    ],
    'api-playground': [
      {
        // Highlight Search step
        stepId: "search-api",
        selector: '//p[contains(@class, "css-1wu7cx7") and contains(text(), "Search")]',
        spotlight: {
          offsetX: 13,
          offsetY: 5,
        },
        tooltip: {
          title: "Search API",
          content: "The Search endpoint utilizes our search engine built for AI agents, delivering real-time, accurate, and factual results at speed.",
          offsetX: 5,
          offsetY: 10,
        },
        autoAdvanceDelay: 5000,
      },
      {
        // Highlight Extract step
        stepId: "extract-api",
        selector: '//p[contains(text(), "Extract")]', // Need to confirm exact selector
        spotlight: {
          offsetX: 18,
          offsetY: 5,
        },
        tooltip: {
          title: "Extract API",
          content: "Extract allows you to scrape web page content from one or more specified URLs.",
          offsetX: 5,
          offsetY: 10,
        },
        autoAdvanceDelay: 5000,
      },
      {
        // Highlight Crawl step
        stepId: "crawl-api",
        selector: '//p[contains(text(), "Crawl")]',
        spotlight: {
          offsetX: 22,
          offsetY: 5,
        },
        tooltip: {
          title: "Crawl API",
          content: "Crawl allows you to traverse a site like a graph starting from a base URL. This feature is currently in open-access beta!",
          offsetX: 5,
          offsetY: 10,
        },
        autoAdvanceDelay: 5000,
        // Note: Selector may need updating
      },
      {
        // Highlight Search step again
        stepId: "try-search",
        selector: '//p[contains(@class, "css-1wu7cx7") and contains(text(), "Search")]',
        spotlight: {
          offsetX: 13,
          offsetY: 5,
        },
        tooltip: {
          title: "Let's try Search",
          content: "Let's go through an example with the Search endpoint!",
          offsetX: 5,
          offsetY: 10,
        },
        autoAdvanceDelay: 5000,
      },
      {
        // API Key select
        stepId: "api-key",
        selector: "#api-key", // Need to confirm exact selector
        spotlight: {
          offsetX: 15,
          offsetY: 8,
        },
        tooltip: {
          title: "API Key",
          content: "We'll use the default API key...",
          offsetX: 5,
          offsetY: 10,
        },
        autoAdvanceDelay: 3000,
      },
      {
        // Search query textarea
        stepId: "search-query",
        selector: "#query",
        highlight: {
          offsetX: 15,
          offsetY: 12,
        },
        tooltip: {
          title: "Search Query",
          content: "Feel free to type in something you'd like to search for!",
          offsetX: 5,
          offsetY: 10,
        },
        autoAdvanceDelay: 3000
      },
      {
        // Try an example button
        stepId: "try-example",
        selector: ".css-xkh4ph",
        highlight: {
          offsetX: 15,
          offsetY: 14,
        },
        tooltip: {
          title: "Try an example",
          content: "Or, if you can't think of anything, try an example query to see it in action!",
          offsetX: 5,
          offsetY: 10,
          nextButtonText: "Close",
        },
        autoAdvanceDelay: 3000
      },
    ],
    'create-team': [
      {
        stepId: "teams-tab",
        selector: '.css-grjyxi',
        spotlight: {
          offsetX: 5,
          offsetY: 6,
        },
        tooltip: {
          title: 'Teams',
          content: 'This tab allows you to create and manage teams.',
          offsetX: 15,
          offsetY: 15,
        },
      },
      {
        stepId: "click-teams",
        selector: '.css-grjyxi',
        highlight: {
          offsetX: 5,
          offsetY: 5,
        },
        action: {
          type: 'click',
          delay: 100
        },
        autoAdvance: true,
        autoAdvanceDelay: 100
      },
      {
        stepId: "create-team-button",
        selector: '.css-nhhgdw',
        spotlight: {
          offsetX: 5,
          offsetY: 10,
        },
        tooltip: {
          title: 'Create Team',
          content: 'Let\'s create a team!',
          offsetX: 15,
          offsetY: 15,
        },
      },
      {
        stepId: "click-create",
        selector: '.css-nhhgdw',
        highlight: {
          offsetX: 15,
          offsetY: 20,
        },
        action: {
          type: 'click',
          delay: 100
        },
        autoAdvance: true,
        autoAdvanceDelay: 100
      },
      {
        stepId: "team-name",
        selector: '.css-32tk93',
        spotlight: {
          offsetX: 22,
          offsetY: 8,
        },
        tooltip: {
          title: 'Team Name',
          content: 'Enter a name for your team here!',
          offsetX: 15,
          offsetY: 15,
        },
      },
      {
        stepId: "submit-team",
        selector: '.css-g6s2cd',
        spotlight: {
          offsetX: 22,
          offsetY: 10,
        },
        tooltip: {
          title: 'All set!',
          content: 'Click here to create your team!',
          offsetX: 15,
          offsetY: 15,
        },
      },
    ],
  }
};

async function searchOnProceed(_: any, dataUtils: { setStepData: (arg0: string, arg1: string | string[]) => void; }) {
  const result = await runSearchTuning();
  const { explanation, otherQueries, error } = result;
  await new Promise(resolve => setTimeout(resolve, 3000));
  dataUtils.setStepData("searchParamsExplanation", explanation);
  dataUtils.setStepData("otherQueries", otherQueries);
  if (error === "ERR_INPUT_EMPTY") {
    Interactor.startAgent('search', { stepId: 'try-again' });
  } else {
    Interactor.startAgent('search', { stepId: 'explanation' });
  }
};

async function searchOnYesNo(isYes: boolean, dataUtils: { getStepData: (arg0: string) => any[]; setStepData: (arg0: string, arg1: string | string[]) => void; }) {
  if (!isYes) {
    Interactor.endAgent('search');
    return;
  }
  const result = await runSearchTuning();
  const { explanation, otherQueries, error } = result;
  dataUtils.setStepData("searchParamsExplanation", explanation);
  dataUtils.setStepData("otherQueries", otherQueries);
  if (error === "ERR_INPUT_EMPTY") {
    Interactor.startAgent('search', { stepId: 'try-again' });
  } else {
    await new Promise(resolve => setTimeout(resolve, 3000));
    Interactor.startAgent('search', { stepId: 'explanation' });
  }
};

async function crawlOnYesNo(isYes: boolean, dataUtils: { getStepData: (arg0: string) => any[]; setStepData: (arg0: string, arg1: string | string[]) => void; }) {
  if (!isYes) {
    Interactor.endAgent('crawl');
    return;
  }
  const result = await runCrawlTuning();
  const { url, explanation, otherCrawls, error } = result;
  dataUtils.setStepData("url", url);
  dataUtils.setStepData("crawlParamsExplanation", explanation);
  dataUtils.setStepData("otherCrawls", otherCrawls);
  if (error === "ERR_INPUT_EMPTY") {
    Interactor.startAgent('crawl', { stepId: 'try-again' });
  } else {
    await new Promise(resolve => setTimeout(resolve, 3000));
    Interactor.startAgent('crawl', { stepId: 'explanation' });
  }
};
