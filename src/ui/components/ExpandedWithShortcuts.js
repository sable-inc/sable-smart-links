import { ShortcutsAndRecents } from './ShortcutsAndRecents.js';

export class ExpandedWithShortcuts {
    constructor({ sections, primaryColor, onSubmit }) {
        this.element = this.createElement({
            sections,
            primaryColor,
            onSubmit
        });
    }

    createElement({ sections, primaryColor, onSubmit }) {
        const container = document.createElement('div');
        Object.assign(container.style, {
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            opacity: '1',
            transform: 'translateY(0)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            paddingTop: '0',
            paddingLeft: '0',
            marginLeft: '-4px',
        });

        const shortcutsAndRecents = new ShortcutsAndRecents({
            sections
        });

        container.appendChild(shortcutsAndRecents.render());

        // Chat input functionality has been removed
        // No chat input will be rendered

        return container;
    }

    render() {
        return this.element;
    }
}