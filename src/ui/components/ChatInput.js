import { ArrowButton } from './ArrowButton.js';

export class ChatInput {
    constructor({ value, onChange, onSubmit, platform = 'Tavily', primaryColor = '#FFFFFF' }) {
        this.onChange = onChange.bind(this);
        this.onSubmit = onSubmit.bind(this);
        this.value = value;
        this.platform = platform;
        this.primaryColor = primaryColor;
        this.element = this.createElement();
    }

    createElement() {
        const container = document.createElement('div');
        Object.assign(container.style, {
            marginTop: '0',
            marginBottom: '0',
            padding: '0',
            width: '100%', // Take full width of parent
            opacity: '1',
            transform: 'translateY(0)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        });

        const inputContainer = document.createElement('div');
        Object.assign(inputContainer.style, {
            display: 'flex',
            gap: '8px',
            backgroundColor: '#323232',
            padding: '8px',
            borderRadius: '0', // Remove border radius at the bottom
            width: '100%', // Take full width of parent
            boxSizing: 'border-box', // Include padding in width calculation
        });

        const input = document.createElement('input');
        Object.assign(input.style, {
            flex: '1',
            padding: '10px 12px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: '#323232',
            color: this.primaryColor,
            fontSize: '14px',
            outline: 'none',
        });
        input.value = this.value;
        input.placeholder = `Ask ${this.platform}...`;
        
        input.addEventListener('input', (e) => this.onChange(e));
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.onSubmit();
            }
        });

        const arrowButton = new ArrowButton(this.onSubmit);

        inputContainer.appendChild(input);
        inputContainer.appendChild(arrowButton.render());
        container.appendChild(inputContainer);

        return container;
    }

    render() {
        return this.element;
    }

    getValue() {
        return this.element.querySelector('input').value;
    }

    setValue(value) {
        this.element.querySelector('input').value = value;
    }
}