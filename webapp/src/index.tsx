import {VoiceNotesPlugin} from './plugin';

declare global {
    interface Window {
        registerPlugin(pluginId: string, plugin: VoiceNotesPlugin): void;
    }
}

window.registerPlugin('com.kanka-dev.voice-notes', new VoiceNotesPlugin());
