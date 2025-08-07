// Popup.js - Unified Popup Component
import { ArrowButton } from './components/ArrowButton.js';
import { YesNoButtons } from './components/YesNoButtons.js';
import { CloseButton } from './components/CloseButton.js';
import { Sections } from './components/Sections.js';
import interact from 'interactjs';

// Simple markdown parser for basic formatting
function parseMarkdown(text) {
  if (!text) return '';
  text = text.replace(/\*\*(.*?)\*\*|__(.*?)__/g, '<strong>$1$2</strong>');
  text = text.replace(/\*(.*?)\*|_(.*?)_/g, '<em>$1$2</em>');
  text = text.replace(/`(.*?)`/g, '<code style="background-color:rgba(0,0,0,0.2);padding:2px 4px;border-radius:3px;">$1</code>');
  text = text.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:inherit;text-decoration:underline;">$1</a>');
  text = text.replace(/\n/g, '<br>');
  return text;
}

export class Popup {
  constructor(config) {
    this.config = {
      text: config.text || '',
      boxWidth: config.boxWidth || 300,
      buttonType: config.buttonType || 'arrow',
      onProceed: config.onProceed || (() => { }),
      onYesNo: config.onYesNo || (() => { }),
      primaryColor: config.primaryColor || '#FFFFFF',
      onClose: config.onClose || (() => { }),
      fontSize: config.fontSize || '15px',
      sections: config.sections || [],
      debug: config.debug || false,
      agentInfo: config.agentInfo || null,
      animateText: config.animateText !== undefined ? config.animateText : true,
      markdown: config.markdown !== undefined ? config.markdown : true,
      width: config.width || 380,
    };
    this.position = config.position || { top: 200, left: (window.innerWidth - (config.width ?? 300)) / 2 };
    this.container = this.createContainer();
    this._initDragging();
    if (this.config.animateText && this.config.text) {
      this.startAnimationSequence();
    } else {
      this.setTextImmediate();
    }
  }

  _initDragging() {
    this.container.setAttribute('data-x', 0);
    this.container.setAttribute('data-y', 0);
    let wasTransition = this.container.style.transition;
    const dragHandle = this.container.querySelector('.sable-popup-drag-handle');
    interact(this.container).styleCursor(false).draggable({
      allowFrom: '.sable-popup-drag-handle',
      listeners: {
        start: () => {
          wasTransition = this.container.style.transition;
          this.container.style.transition = 'none';
          if (dragHandle) dragHandle.style.cursor = 'grabbing';
        },
        move: (event) => {
          const target = event.target;
          let x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
          let y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;
          target.style.transform = `translate(${x}px, ${y}px)`;
          target.setAttribute('data-x', x);
          target.setAttribute('data-y', y);
        },
        end: () => {
          this.container.style.transition = wasTransition;
          if (dragHandle) dragHandle.style.cursor = 'grab';
        }
      }
    });
  }

  createContainer() {
    const container = document.createElement('div');
    Object.assign(container.style, {
      position: 'fixed',
      top: `${this.position.top}px`,
      left: `${this.position.left}px`,
      zIndex: 2147483647,
      width: this.config.width ? `${this.config.width}px` : 'fit-content',
      display: 'flex',
      flexDirection: 'column',
      background: `radial-gradient(circle at center, rgba(60, 60, 60, 0.5) 0%, rgba(60, 60, 60, 0.65) 100%)`,
      padding: this.config.padding ? `${this.config.padding}px` : '12px',
      borderRadius: '16px',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      backdropFilter: 'blur(8px)',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: this.config.primaryColor,
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      userSelect: 'none',
      maxHeight: this.config.maxHeight ? `${this.config.maxHeight}px` : '',
      opacity: 1,
      transform: 'scale(1)',
      transformOrigin: 'bottom center',
      overflow: 'hidden',
    });
    container.appendChild(this.createDragHandle());
    const closeButton = new CloseButton({
      onClose: () => this.close(),
      primaryColor: this.config.primaryColor
    });
    const closeButtonElement = closeButton.render();
    Object.assign(closeButtonElement.style, {
      position: 'absolute',
      top: '8px',
      left: '8px',
      zIndex: 2147483648,
    });
    container.appendChild(closeButtonElement);
    container.appendChild(this.createContent());
    return container;
  }

  createDragHandle() {
    const handle = document.createElement('div');
    handle.className = 'sable-popup-drag-handle';
    Object.assign(handle.style, {
      padding: '2px 0',
      cursor: 'grab',
      userSelect: 'none',
      width: '100%',
      display: 'flex',
      justifyContent: 'center',
      marginBottom: '8px',
    });
    const bar = document.createElement('div');
    Object.assign(bar.style, {
      width: '32px',
      height: '4px',
      backgroundColor: 'rgba(255, 255, 255, 0.3)',
      borderRadius: '2px',
      margin: '0 auto',
    });
    handle.appendChild(bar);
    return handle;
  }

  createContent() {
    const main = document.createElement('div');
    Object.assign(main.style, {
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      padding: '0 4px',
      marginTop: '4px',
      width: this.config.width ? '100%' : 'fit-content',
    });
    const row = document.createElement('div');
    Object.assign(row.style, {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: '4px',
      width: this.config.width ? '100%' : 'fit-content',
    });
    const textDiv = document.createElement('div');
    Object.assign(textDiv.style, {
      width: `${this.config.boxWidth}px`,
      padding: '4px 4px',
      color: this.config.primaryColor,
      fontSize: this.config.fontSize,
      fontWeight: '400',
      letterSpacing: '-0.01em',
      wordWrap: 'break-word',
      overflowWrap: 'break-word',
      whiteSpace: 'pre-wrap',
      lineHeight: '1.5',
      textRendering: 'optimizeLegibility',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    });
    this.textContainer = textDiv;
    let buttonDiv = null;
    if (this.config.buttonType === 'arrow') {
      buttonDiv = document.createElement('div');
      Object.assign(buttonDiv.style, {
        opacity: '0',
        transform: 'scale(0.9)',
        transition: 'all 0.8s ease',
      });
      this.buttonContainer = buttonDiv;
      const arrowButton = new ArrowButton(() => {
        if (typeof this.config.onProceed === 'function') {
          arrowButton.setLoading(true);
          const result = this.config.onProceed('');
          if (result instanceof Promise) {
            result.finally(() => arrowButton.setLoading(false));
          } else {
            setTimeout(() => arrowButton.setLoading(false), 600);
          }
        }
      });
      this.arrowButton = arrowButton;
      buttonDiv.appendChild(arrowButton.render());
    } else if (this.config.buttonType === 'yes-no') {
      buttonDiv = document.createElement('div');
      Object.assign(buttonDiv.style, {
        opacity: '0',
        transform: 'scale(0.9)',
        transition: 'all 0.8s ease',
      });
      this.buttonContainer = buttonDiv;
      const yesNoButtons = new YesNoButtons((isYes) => {
        if (typeof this.config.onYesNo === 'function') {
          yesNoButtons.setLoading(true);
          const result = this.config.onYesNo(isYes);
          if (result instanceof Promise) {
            result.finally(() => yesNoButtons.setLoading(false));
          } else {
            setTimeout(() => yesNoButtons.setLoading(false), 600);
          }
        }
      }, this.config.primaryColor);
      this.yesNoButtons = yesNoButtons;
      buttonDiv.appendChild(yesNoButtons.render());
    } else {
      this.buttonContainer = null;
    }
    row.appendChild(textDiv);
    if (buttonDiv && this.config.buttonType === 'arrow') row.appendChild(buttonDiv);
    main.appendChild(row);
    if (buttonDiv && this.config.buttonType === 'yes-no') main.appendChild(buttonDiv);
    if (Array.isArray(this.config.sections) && this.config.sections.length > 0) {
      const sections = new Sections({
        sections: this.config.sections,
        primaryColor: this.config.primaryColor
      });
      main.appendChild(sections.render());
    }
    return main;
  }

  startAnimationSequence() {
    setTimeout(() => { this.container.style.opacity = '1'; }, 0);
    const parsedText = this.config.markdown ? parseMarkdown(this.config.text) : this.config.text;
    const rawText = this.config.text;
    const charDelay = 800 / rawText.length;
    for (let i = 0; i <= rawText.length; i++) {
      setTimeout(() => {
        const currentText = rawText.slice(0, i);
        const currentParsedText = this.config.markdown ? parseMarkdown(currentText) : currentText;
        this.textContainer.innerHTML = currentParsedText;
      }, 300 + (i * charDelay));
    }
    if (this.buttonContainer) {
      setTimeout(() => {
        this.buttonContainer.style.opacity = '1';
        this.buttonContainer.style.transform = 'scale(1)';
      }, 2000);
    }
  }

  setTextImmediate() {
    const parsedText = this.config.markdown ? parseMarkdown(this.config.text) : this.config.text;
    this.textContainer.innerHTML = parsedText;
    if (this.buttonContainer) {
      this.buttonContainer.style.opacity = '1';
      this.buttonContainer.style.transform = 'scale(1)';
    }
  }

  close() {
    if (this.config.onClose) this.config.onClose();
    if (this.container.parentNode) this.container.parentNode.removeChild(this.container);
  }

  render() { return this.container; }
  mount(parentElement) { if (parentElement && !parentElement.contains(this.container)) parentElement.appendChild(this.container); }
  unmount() {
    if (this.container.parentNode) this.container.parentNode.removeChild(this.container);
  }
  updatePosition(position) {
    if (position && typeof position === 'object') {
      this.position = { ...this.position, ...position };
      Object.assign(this.container.style, {
        top: `${this.position.top}px`,
        left: `${this.position.left}px`
      });
    }
  }
}
