// components/ShortcutsAndRecents.js
export class ShortcutsAndRecents {
    constructor({ sections }) {
        this.sections = sections || [];
        this.element = this.createElement();
    }

    createElement() {
        const container = document.createElement('div');
        Object.assign(container.style, {
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            padding: '0 0 16px 0',
        });

        // Render sections
        if (this.sections && this.sections.length > 0) {
            this.sections.forEach(section => {
                container.appendChild(this.createSection(
                    section.title,
                    section.items,
                    section.icon,
                    section.onSelect
                ));
            });
        }

        return container;
    }

    /**
     * Creates a section with items, icon and handler
     * @param {string} title - The section title
     * @param {Array} items - Array of items to display
     * @param {string} icon - Icon to display (emoji or URL)
     * @param {Function} onSelectHandler - Handler function when an item is selected
     * @returns {HTMLElement} - The section element
     */
    createSection(title, items, icon = '📄', onSelectHandler) {
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
            
            // Use the provided handler function
            itemElement.addEventListener('click', () => {
                // Check if this item has a restartFromStep property
                if (item.restartFromStep !== undefined) {
                    // Item-level restartFromStep takes precedence
                    onSelectHandler({ ...item, _restartRequested: true });
                } else {
                    onSelectHandler(item);
                }
            });

            const iconElement = document.createElement('span');
            Object.assign(iconElement.style, {
                fontSize: '12px',
                opacity: '0.75',
                color: 'rgba(255, 255, 255, 0.5)',
            });
            
            // Use the item's icon if present, otherwise the section icon
            iconElement.textContent = (item && item.icon) ? item.icon : icon;

            const textElement = document.createElement('span');
            // Handle both string items and object items with text property
            textElement.textContent = typeof item === 'object' && item.text ? item.text : item;

            itemElement.appendChild(iconElement);
            itemElement.appendChild(textElement);
            itemsContainer.appendChild(itemElement);
        });

        if (title != null) {
            section.appendChild(heading);
        }
        section.appendChild(itemsContainer);
        return section;
    }

    render() {
        return this.element;
    }
}