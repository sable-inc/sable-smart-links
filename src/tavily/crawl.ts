import Interactor from '../interactor';
import { getOptimalCrawlParameters } from './client';

export async function pickTab(title: string) {
  const container = document.querySelector('.css-1dofqhu');
  if (container) {
    const buttons = Array.from(container.querySelectorAll('button'));
    const matchBtn = buttons.find(
      btn =>
        btn.textContent?.trim()?.toLowerCase() === title
    );
    if (matchBtn && !matchBtn.classList.contains('css-ousv62')) {
      matchBtn.click();
      await new Promise(resolve => setTimeout(resolve, 150));
    }
  }
}

export async function beforeCrawlTuning() {
  await pickTab('crawl');
  // Check if query url/instructions is empty and populate with random example if so
  const instructionsElement = Interactor.getElement('#instructions') as HTMLInputElement | HTMLTextAreaElement;
  const urlElement = Interactor.getElement('#url') as HTMLInputElement | HTMLTextAreaElement;
  if (urlElement && !urlElement.value.trim() && instructionsElement && !instructionsElement.value.trim()) {
    // Note: crawlParams constant would need to be provided by the consuming app
    // For now, we'll use placeholder values
    const exampleUrl = 'https://example.com';
    const exampleInstructions = 'Extract all product information and pricing';
    Interactor.setInputValue(urlElement, exampleUrl);
    Interactor.setInputValue(instructionsElement, exampleInstructions);
  }
}

export async function runCrawlTuning() {
  // 1. Call server-side API helper
  const urlElement = Interactor.getElement('#url') as HTMLInputElement;
  const urlValue = urlElement?.value || '';

  const instructionsElement = Interactor.getElement('#instructions') as HTMLInputElement;
  const instructionsValue = instructionsElement?.value || '';

  if (urlValue === '' || instructionsValue === '') {
    let explanation = "Your crawl URL & instructions are blank. Write something, then try again.";
    if (urlValue) { explanation = "Your crawl instructions are blank. Write something, then try again."; }
    if (instructionsValue) { explanation = "Your crawl URL is blank. Write something, then try again."; }
    return {
      error: "ERR_INPUT_EMPTY",
      url: urlValue,
      explanation,
      otherCrawls: []
    };
  }
  try {
    const params = await getOptimalCrawlParameters(urlValue, instructionsValue);

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
    // Only set the 0th #search-topic to extractDepth and highlight it
    const selects = Interactor.getElements('#search-topic');
    if (selects.length >= 1) {
      const select = selects[0] as HTMLSelectElement | undefined;
      if (select) {
        // Scroll the select itself into view before interacting
        await Interactor.scrollIntoView(select);
        await new Promise(res => setTimeout(res, 300));
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

        // Set value to extractDepth
        select.value = params.extractDepth as string;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        await new Promise(res => setTimeout(res, 600));
        if (parent && styleInfo) {
          Interactor.restoreElementStyle(parent, styleInfo);
        }
      }
    }

    // 3b. For each button in .chakra-wrap.css-8atqhb, check if it should be selected based on parameters
    const wrap = document.querySelector('.chakra-wrap.css-8atqhb');
    if (wrap && Array.isArray(params.categories)) {
      const allButtons = Array.from(wrap.querySelectorAll('button'));

      for (const btn of allButtons) {
        const buttonText = btn.textContent?.trim();
        if (!buttonText) continue;

        // Check if this button's text is included in the parameters
        const shouldBeSelected = params.categories.includes(buttonText as any);

        // Check current selection status
        const isSelected = btn.classList.contains('css-ut9wgk');
        const isUnselected = btn.classList.contains('css-oh9fyp');

        // Click if selection state doesn't match desired state
        if ((shouldBeSelected && isUnselected) || (!shouldBeSelected && isSelected)) {
          // Should be selected but currently unselected - click to select
          await Interactor.scrollIntoView(btn);
          await Interactor.clickElement(btn);
          await new Promise(res => setTimeout(res, 250));
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
      url: urlValue,
      explanation: params.explanation,
      otherCrawls: params.otherCrawls
    };
  } catch (err) {
    return {
      error: "ERR_CRAWL_FAILED",
      url: urlValue,
      explanation: "Something went wrong. Try again with more descriptive instructions.",
      otherCrawls: []
    };
  }
}
