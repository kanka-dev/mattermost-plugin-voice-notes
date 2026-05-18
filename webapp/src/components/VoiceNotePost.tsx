import React, {useEffect, useRef, useState} from 'react';

const PLUGIN_ID = 'dev.kanka.voice-notes';

interface Post {
    id: string;
    user_id: string;
    channel_id: string;
    type: string;
    create_at: number;
    props: {
        fileId?: string;
        duration_ms?: string | number;
    };
}

interface Props {
    post: Post;
}

function formatDuration(ms: number): string {
    const totalSec = Math.round(ms / 1000);
    const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
    const s = (totalSec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

const PlayIcon = () => (
    <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='currentColor'>
        <path d='M8 5v14l11-7z'/>
    </svg>
);

const PauseIcon = () => (
    <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='currentColor'>
        <path d='M6 19h4V5H6v14zm8-14v14h4V5h-4z'/>
    </svg>
);

const DownloadIcon = () => (
    <svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='currentColor'>
        <path d='M19 9h-4V3H9v6H5l7 7 7-7zm-8 2V5h2v6h1.17L12 13.17 9.83 11H11zm-6 7h14v2H5z'/>
    </svg>
);

const MicIcon = () => (
    <svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='currentColor'>
        <path d='M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.93V20H9v2h6v-2h-2v-2.07A7 7 0 0 0 19 11h-2z'/>
    </svg>
);

const VoiceNotePost: React.FC<Props> = ({post}) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [playing, setPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [error, setError] = useState(false);

    const audioSrc = `/plugins/${PLUGIN_ID}/api/v1/audio/${post.id}`;

    // Hide the native Mattermost file attachment that appears when FileIds is set.
    // FileIds must stay set for proper file lifecycle management (data retention etc.),
    // but we don't want the duplicate UI below our custom player.
    useEffect(() => {
        const style = document.createElement('style');
        style.dataset.voiceNotePost = post.id;
        style.textContent = [
            `[data-post-id="${post.id}"] .post-image__columns`,
            `[data-post-id="${post.id}"] .file-view`,
            `[data-post-id="${post.id}"] .post__attachments`,
        ].join(', ') + ' { display: none !important; }';
        document.head.appendChild(style);
        return () => {
            document.head.removeChild(style);
        };
    }, [post.id]);

    const durationMsProp = post.props?.duration_ms;
    const estimatedDurationMs = durationMsProp ? Number(durationMsProp) : 0;

    const handlePlayPause = () => {
        const audio = audioRef.current;
        if (!audio) {
            return;
        }
        if (playing) {
            audio.pause();
        } else {
            audio.play().catch(() => setError(true));
        }
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current) {
            const d = audioRef.current.duration;
            if (d && isFinite(d)) {
                setDuration(d);
            } else if (estimatedDurationMs > 0) {
                setDuration(estimatedDurationMs / 1000);
            }
        }
    };

    const handleEnded = () => {
        setPlaying(false);
        setCurrentTime(0);
        if (audioRef.current) {
            audioRef.current.currentTime = 0;
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const t = Number(e.target.value);
        setCurrentTime(t);
        if (audioRef.current) {
            audioRef.current.currentTime = t;
        }
    };

    const displayDuration = duration > 0 ? duration : (estimatedDurationMs > 0 ? estimatedDurationMs / 1000 : 0);

    const progressPct = displayDuration > 0 ? (currentTime / displayDuration) * 100 : 0;

    const pad = (n: number) => Math.floor(n).toString().padStart(2, '0');
    const fmtTime = (s: number) => `${pad(s / 60)}:${pad(s % 60)}`;

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            padding: '10px 12px',
            background: 'rgba(var(--center-channel-color-rgb, 63,67,80), 0.04)',
            borderRadius: '8px',
            maxWidth: '400px',
            minWidth: '240px',
        }}>
            {/* Label row */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                opacity: 0.65,
                fontSize: '12px',
            }}>
                <MicIcon/>
                <span>{'Voice Note'}</span>
                {estimatedDurationMs > 0 && (
                    <span style={{marginLeft: 'auto'}}>
                        {formatDuration(estimatedDurationMs)}
                    </span>
                )}
            </div>

            {/* Controls row */}
            <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                {/* Play/Pause button */}
                <button
                    className='style--none'
                    onClick={handlePlayPause}
                    disabled={error}
                    aria-label={playing ? 'Pause' : 'Play'}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: error ? 'rgba(var(--error-text-color-rgb,210,75,78),0.15)' : 'var(--button-bg, #1c58d9)',
                        color: error ? '#d24b4e' : '#fff',
                        cursor: error ? 'not-allowed' : 'pointer',
                        flexShrink: 0,
                        border: 'none',
                    }}
                >
                    {playing ? <PauseIcon/> : <PlayIcon/>}
                </button>

                {/* Progress + time */}
                <div style={{flex: 1, minWidth: 0}}>
                    <input
                        type='range'
                        min={0}
                        max={displayDuration || 100}
                        step={0.1}
                        value={currentTime}
                        onChange={handleSeek}
                        style={{
                            width: '100%',
                            height: '3px',
                            display: 'block',
                            marginBottom: '4px',
                            accentColor: 'var(--button-bg, #1c58d9)',
                            cursor: 'pointer',
                        }}
                        aria-label='Seek'
                    />
                    <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '11px', opacity: 0.6}}>
                        <span>{fmtTime(currentTime)}</span>
                        <span>{displayDuration > 0 ? fmtTime(displayDuration) : '--:--'}</span>
                    </div>
                </div>

                {/* Download button */}
                <a
                    href={audioSrc}
                    download={`voice-note-${post.id}.webm`}
                    title='Download voice note'
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        opacity: 0.6,
                        color: 'inherit',
                        textDecoration: 'none',
                        flexShrink: 0,
                    }}
                >
                    <DownloadIcon/>
                </a>
            </div>

            {/* Error message */}
            {error && (
                <p style={{margin: 0, fontSize: '12px', color: '#d24b4e'}}>
                    {'Could not load audio. The file may have been deleted.'}
                </p>
            )}

            {/* Hidden audio element */}
            <audio
                ref={audioRef}
                src={audioSrc}
                preload='metadata'
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={handleEnded}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onError={() => setError(true)}
                style={{display: 'none'}}
            />
        </div>
    );
};

export default VoiceNotePost;
