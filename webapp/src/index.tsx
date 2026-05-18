import {VoiceNotesPlugin} from './plugin';

declare global {
    interface Window {
        registerPlugin(pluginId: string, plugin: VoiceNotesPlugin): void;
    }
}

window.registerPlugin('dev.kanka.voice-notes', new VoiceNotesPlugin());
