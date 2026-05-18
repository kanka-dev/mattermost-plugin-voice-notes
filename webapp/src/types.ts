export interface PluginConfig {
    MaxDurationSeconds: number;
    MaxFileSizeMB: number;
}

export interface VoiceNotePostProps {
    post: {
        id: string;
        user_id: string;
        channel_id: string;
        type: string;
        props: {
            fileId?: string;
            duration_ms?: string | number;
        };
        create_at: number;
    };
}

export interface RecordButtonProps {
    channelId: string;
}
