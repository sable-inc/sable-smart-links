import { ShortcutsAndRecents } from './ShortcutsAndRecents.js';
import { ChatInput } from './ChatInput.js';

export class ExpandedWithShortcuts {
    constructor({ sections, chatInput, primaryColor, onSubmit }) {
        this.element = this.createElement({ 
            sections,
            chatInput, 
            primaryColor,
            onSubmit 
        });
    }

    createElement({ sections, chatInput, primaryColor, onSubmit }) {
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
        
        // Only add chat input if it's provided (chat is enabled)
        if (chatInput) {
            // Wrap chat input in a container that takes full width and extends to the edges
            const chatInputWrapper = document.createElement('div');
            Object.assign(chatInputWrapper.style, {
                width: 'calc(100% + 32px)',
                marginLeft: '-16px',
                marginTop: 'auto',
            });
            
            const chatInputComponent = new ChatInput({
                value: chatInput.value,
                onChange: chatInput.onChange,
                onSubmit: onSubmit,
                platform: chatInput.platform,
                primaryColor: primaryColor
            });
            
            chatInputWrapper.appendChild(chatInputComponent.render());
            container.appendChild(chatInputWrapper);
        }

        return container;
    }

    render() {
        return this.element;
    }
}