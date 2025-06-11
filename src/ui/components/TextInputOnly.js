// components/TextInputOnly.js
class TextInputOnly {
    constructor({ onSubmit, onInputChange, onExpand, platform, primaryColor, onMinimize }) {
        this.element = this.createElement({ 
            onSubmit, 
            onInputChange, 
            onExpand, 
            platform, 
            primaryColor, 
            onMinimize 
        });
    }

    createElement({ onSubmit, onInputChange, onExpand, platform, primaryColor, onMinimize }) {
        const container = document.createElement('div');
        Object.assign(container.style, {
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            backgroundColor: '#323232',
            padding: '10px 16px',
            borderRadius: '16px',
            width: 'calc(100% + 32px)',
            margin: '0 -16px',
            height: '100%',
        });

        const minimizeButton = new MinimizeButton({
            onMinimize,
            primaryColor
        });

        container.appendChild(minimizeButton.render());

        const input = document.createElement('input');
        Object.assign(input.style, {
            flex: '1',
            background: 'transparent',
            border: 'none',
            color: primaryColor,
            fontSize: '14px',
            outline: 'none',
        });
        input.placeholder = `Ask anything about ${platform}`;
        input.addEventListener('input', onInputChange);
        input.addEventListener('click', onExpand);

        const expandButton = document.createElement('button');
        Object.assign(expandButton.style, {
            background: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
        });

        expandButton.innerHTML = `
            <svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="black" 
                strokeWidth="2"
                style="transform: rotate(-90deg)"
            >
                <path d="M12 5l7 7-7 7M5 12h14" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
        `;

        expandButton.addEventListener('click', onExpand);
        expandButton.addEventListener('mouseover', () => {
            expandButton.style.transform = 'scale(1.05)';
        });
        expandButton.addEventListener('mouseout', () => {
            expandButton.style.transform = 'scale(1)';
        });

        container.appendChild(input);
        container.appendChild(expandButton);
        return container;
    }

    render() {
        return this.element;
    }
}