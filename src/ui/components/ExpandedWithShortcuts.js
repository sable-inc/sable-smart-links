// components/ExpandedWithShortcuts.js
class ExpandedWithShortcuts {
    constructor({ recentQueries, shortcuts, onQuerySelect, chatInput, primaryColor, onMinimize }) {
        this.element = this.createElement({ 
            recentQueries, 
            shortcuts, 
            onQuerySelect, 
            chatInput, 
            primaryColor, 
            onMinimize 
        });
    }

    createElement({ recentQueries, shortcuts, onQuerySelect, chatInput, primaryColor, onMinimize }) {
        const container = document.createElement('div');
        Object.assign(container.style, {
            position: 'relative', // Added for absolute positioning of minimize button
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            opacity: '1',
            transform: 'translateY(0)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        });

        const minimizeButton = new MinimizeButton({
            onMinimize,
            primaryColor
        });

        container.appendChild(minimizeButton.render());

        const shortcutsAndRecents = new ShortcutsAndRecents({
            recentQueries,
            shortcuts,
            onQuerySelect
        });

        container.appendChild(shortcutsAndRecents.render());
        container.appendChild(chatInput.render());

        return container;
    }

    render() {
        return this.element;
    }
}