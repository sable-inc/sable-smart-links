// components/ShortcutsAndRecents.js
export class ShortcutsAndRecents {
    constructor({ shortcuts, productWalkthroughs, onQuerySelect, onWalkthroughSelect }) {
        this.shortcuts = shortcuts;
        this.productWalkthroughs = productWalkthroughs;
        this.onQuerySelect = onQuerySelect;
        this.onWalkthroughSelect = onWalkthroughSelect || onQuerySelect; // Fallback to onQuerySelect if no walkthrough handler
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

        // Add Shortcuts section
        container.appendChild(this.createSection('Shortcuts', this.shortcuts));
        
        // Add Product Walkthroughs section
        if (this.productWalkthroughs && this.productWalkthroughs.length > 0) {
            container.appendChild(this.createSection('Product Walkthroughs', this.productWalkthroughs, true));
        }

        return container;
    }

    createSection(title, items, isWalkthrough = false) {
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
            
            // Handle different item types and use appropriate handler
            if (isWalkthrough) {
                itemElement.addEventListener('click', () => this.onWalkthroughSelect(item));
            } else {
                itemElement.addEventListener('click', () => this.onQuerySelect(item));
            }

            const icon = document.createElement('span');
            Object.assign(icon.style, {
                fontSize: '12px',
                opacity: '0.25',
                color: 'rgba(255, 255, 255, 0.3)',
            });
            
            // Use different icon for walkthroughs
            icon.textContent = isWalkthrough ? '🔍' : '📖';

            const text = document.createElement('span');
            // Handle both string items and object items with text property
            text.textContent = typeof item === 'object' && item.text ? item.text : item;

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