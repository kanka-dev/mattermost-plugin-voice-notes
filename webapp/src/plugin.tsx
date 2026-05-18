import React from 'react';

import RecordButton from './components/RecordButton';
import VoiceNotePost from './components/VoiceNotePost';

interface Registry {
    registerPostEditorActionComponent: (component: React.ComponentType<{channelId: string}>) => void;
    registerPostTypeComponent: (type: string, component: React.ComponentType<any>) => void;
}

export class VoiceNotesPlugin {
    initialize(registry: Registry): void {
        registry.registerPostEditorActionComponent(RecordButton);
        registry.registerPostTypeComponent('custom_voice_note', VoiceNotePost);
    }

    uninitialize(): void {
        // Nothing to clean up
    }
}
