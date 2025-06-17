// components/ShortcutsAndRecents.js
export class ShortcutsAndRecents {
    constructor({ shortcuts, onQuerySelect }) {
        this.shortcuts = shortcuts;
        this.onQuerySelect = onQuerySelect;
        this.element = this.createElement();
    }

    createElement() {
        const container = document.createElement('div');
        Object.assign(container.style, {
            display: 'flex',
            flexDirection: 'column',
            gap: '0',
            padding: '0 0 16px 0',
        });

        // Shortcuts Section only (Recents section removed)
        container.appendChild(this.createSection('Shortcuts', this.shortcuts));

        return container;
    }

    createSection(title, items) {
        const section = document.createElement('div');
        Object.assign(section.style, {
            padding: '0 4px',
            marginTop: '0',
        });

        const heading = document.createElement('h3');
        Object.assign(heading.style, {
            fontSize: '14px',
            color: 'rgba(255, 255, 255, 0.9)',
            marginBottom: '2px',
            fontWeight: '500',
        });
        heading.textContent = title;

        const itemsContainer = document.createElement('div');
        Object.assign(itemsContainer.style, {
            display: 'flex',
            flexDirection: 'column',
            gap: '1px',
            paddingLeft: '0px',
        });

        items.forEach(item => {
            const itemElement = document.createElement('span');
            Object.assign(itemElement.style, {
                color: 'rgba(255, 255, 255, 0.5)',
                fontSize: '13px',
                padding: '1px 0',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'transparent',
            });

            itemElement.addEventListener('mouseover', () => {
                itemElement.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                itemElement.style.color = 'rgba(255, 255, 255, 0.7)';
            });

            itemElement.addEventListener('mouseout', () => {
                itemElement.style.backgroundColor = 'transparent';
                itemElement.style.color = 'rgba(255, 255, 255, 0.5)';
            });

            itemElement.addEventListener('click', () => this.onQuerySelect(item));

            const icon = document.createElement('span');
            Object.assign(icon.style, {
                fontSize: '12px',
                opacity: '0.25',
                color: 'rgba(255, 255, 255, 0.3)',
            });
            icon.textContent = '📖';

            const text = document.createElement('span');
            text.textContent = item;

            itemElement.appendChild(icon);
            itemElement.appendChild(text);
            itemsContainer.appendChild(itemElement);
        });

        section.appendChild(heading);
        section.appendChild(itemsContainer);
        return section;
    }

    render() {
        return this.element;
    }
}