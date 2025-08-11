import Interactor from '../interactor';
import { getOptimalSearchParameters } from './client';
import { pickTab } from './crawl';
import { searchParams } from './constants';

export async function beforeSearchTuning() {
  await pickTab('search');
  const queryElement = Interactor.getElement('#query') as HTMLInputElement;
  if (queryElement && !queryElement.value.trim()) {
    const { params } = searchParams[Math.floor(Math.random() * searchParams.length)];
    Interactor.setInputValue(queryElement, params.query);
  }
}

export async function runSearchTuning() {
  try {
    // 1. Call server-side API helper
    const queryElement = Interactor.getElement('#query') as HTMLInputElement;
    const queryValue = queryElement?.value || '';
    if (queryValue === '') {
      return {
        error: 'ERR_INPUT_EMPTY',
        explanation: 'Your search query is blank. Write a query and try again.',
        otherQueries: []
      };
    }

    const params = await getOptimalSearchParameters(queryValue);

    // 2. Check if the specific accordion button exists and is collapsed (aria-expanded=false)
    const accordionButton = Interactor.getElement('//button[contains(@class, "chakra-accordion__button") and .//p[text()="Additional fields"]]');

    if (accordionButton && accordionButton.getAttribute('aria-expanded') === 'false') {
      await Interactor.clickElement(accordionButton);
    } else if (!accordionButton) {
      // Fallback to the old method if needed
      const additionalFieldsAccordion = Interactor.getElement('#additional-fields');
      const additionalFieldsButton = additionalFieldsAccordion?.querySelector('button');
      if (additionalFieldsButton) {
        await Interactor.clickElement(additionalFieldsButton);
      }
    }

    // 3. Set each parameter by id
    const selects = Interactor.getElements('#search-topic');
    if (selects.length >= 4) {
      // 0: searchTopic, 1: searchDepth, 2: timeRange, 3: includeAnswer
      const paramOrder = [
        { key: 'searchTopic', idx: 0 },
        { key: 'searchDepth', idx: 1 },
        { key: 'timeRange', idx: 2 },
        { key: 'includeAnswer', idx: 3 }
      ];

      for (const { key, idx } of paramOrder) {
        const select = selects[idx] as HTMLSelectElement | undefined;
        if (!select) {
          continue;
        }
        const parent = select.parentElement;
        if (parent) {
          // Scroll into view only if not visible
          if (!Interactor.isElementInViewport(parent)) {
            await Interactor.scrollIntoView(parent);
          }
        }
        let styleInfo;
        if (parent) {
          styleInfo = Interactor.highlightElement(parent);
        }

        const paramKey = key as keyof typeof params;
        select.value = params[paramKey] as string;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        await new Promise(res => setTimeout(res, 600));
        if (parent && styleInfo) {
          Interactor.restoreElementStyle(parent, styleInfo);
        }
      }
    }

    // 4. Click "Send Request" button by id
    const sendBtn = Interactor.getElement('#send-request');
    if (sendBtn) {
      await Interactor.clickElement(sendBtn);
    }
    return {
      error: null,
      explanation: params.explanation,
      otherQueries: params.otherQueries
    };
  } catch (err) {
    return {
      error: 'ERR_SEARCH_FAILED',
      explanation: 'Something went wrong with your search query. Try again with a more clear query.',
      otherQueries: []
    };
  }
}
