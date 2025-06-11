// components/ShortcutsAndRecents.js
class ShortcutsAndRecents {
    constructor({ recentQueries, shortcuts, onQuerySelect }) {
        this.recentQueries = recentQueries;
        this.shortcuts = shortcuts;
        this.onQuerySelect = onQuerySelect;
        this.element = this.createElement();
    }

    createElement() {
        const container = document.createElement('div');
        Object.assign(container.style, {
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
        });

        // Recents Section
        container.appendChild(this.createSection('Recents', this.recentQueries));
        // Shortcuts Section
        container.appendChild(this.createSection('Shortcuts', this.shortcuts));

        return container;
    }

    createSection(title, items) {
        const section = document.createElement('div');
        Object.assign(section.style, {
            padding: '0 8px',
            marginBottom: '0',
        });

        const heading = document.createElement('h3');
        Object.assign(heading.style, {
            fontSize: '8px',
            color: 'rgba(255, 255, 255, 0.9)',
            marginBottom: '8px',
            fontWeight: '500',
        });
        heading.textContent = title;

        const itemsContainer = document.createElement('div');
        Object.assign(itemsContainer.style, {
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
        });

        items.forEach(item => {
            const itemElement = document.createElement('div');
            Object.assign(itemElement.style, {
                padding: '4px 8px',
                cursor: 'pointer',
                borderRadius: '4px',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                width: '90%',
                margin: '0 auto',
            });

            itemElement.addEventListener('mouseover', () => {
                itemElement.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                itemElement.style.transform = 'translateX(5px)';
            });

            itemElement.addEventListener('mouseout', () => {
                itemElement.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                itemElement.style.transform = 'translateX(0)';
            });

            itemElement.addEventListener('click', () => this.onQuerySelect(item));

            const text = document.createElement('span');
            Object.assign(text.style, {
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '6px',
            });
            text.textContent = item;

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