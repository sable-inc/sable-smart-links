// components/ChatInput.js
class ChatInput {
    constructor({ onSubmit, onInputChange, platform = 'Tavily', primaryColor = '#FFFFFF' }) {
        this.onSubmit = onSubmit;
        this.onInputChange = onInputChange;
        this.platform = platform;
        this.primaryColor = primaryColor;
        this.element = this.createInput();
    }

    createInput() {
        const container = document.createElement('div');
        Object.assign(container.style, {
            marginTop: '0',
            marginBottom: '0',
            padding: '0',
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
            borderRadius: '8px',
            borderBottomLeftRadius: '16px',
            borderBottomRightRadius: '16px',
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
        input.placeholder = `Ask anything about ${this.platform}`;
        
        input.addEventListener('input', (e) => this.onInputChange(e));
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.onSubmit();
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