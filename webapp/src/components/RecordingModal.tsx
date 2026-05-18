import React, {useState, useRef, useEffect, useCallback} from 'react';

const PLUGIN_ID = 'com.kanka-dev.voice-notes';
const API_BASE = `/plugins/${PLUGIN_ID}/api/v1`;

type RecordingState = 'idle' | 'requesting' | 'recording' | 'uploading' | 'error';

interface Props {
    channelId: string;
    onClose: () => void;
}

function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

const RecordingModal: React.FC<Props> = ({channelId, onClose}) => {
    const [state, setState] = useState<RecordingState>('idle');
    const [elapsed, setElapsed] = useState(0);
    const [maxDuration, setMaxDuration] = useState(300);
    const [errorMsg, setErrorMsg] = useState('');
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<BlobPart[]>([]);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Fetch plugin config on mount
    useEffect(() => {
        fetch(`${API_BASE}/config`)
            .then((r) => r.json())
            .then((cfg) => {
                if (cfg && cfg.MaxDurationSeconds) {
                    setMaxDuration(cfg.MaxDurationSeconds);
                }
            })
            .catch(() => { /* use default */ });
    }, []);

    // Auto-stop when max duration reached
    useEffect(() => {
        if (elapsed >= maxDuration && state === 'recording') {
            stopRecording();
        }
    }, [elapsed, maxDuration, state]); // eslint-disable-line react-hooks/exhaustive-deps

    const cleanup = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }
    }, []);

    useEffect(() => {
        return cleanup;
    }, [cleanup]);

    const startRecording = async () => {
        setState('requesting');
        setErrorMsg('');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({audio: true});
            streamRef.current = stream;

            // Pick best supported MIME type
            const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg']
                .find((t) => MediaRecorder.isTypeSupported(t)) ?? '';

            const recorder = new MediaRecorder(stream, mimeType ? {mimeType} : undefined);
            mediaRecorderRef.current = recorder;
            chunksRef.current = [];

            recorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            recorder.onstop = () => {
                const blob = new Blob(chunksRef.current, {type: mimeType || 'audio/webm'});
                setAudioBlob(blob);
                setAudioUrl(URL.createObjectURL(blob));
            };

            recorder.start(250); // collect data every 250ms
            setState('recording');

            timerRef.current = setInterval(() => {
                setElapsed((prev) => prev + 1);
            }, 1000);
        } catch (err: any) {
            cleanup();
            setState('error');
            if (err.name === 'NotAllowedError') {
                setErrorMsg('Microphone access was denied. Please allow microphone access in your browser settings.');
            } else if (err.name === 'NotFoundError') {
                setErrorMsg('No microphone found. Please connect a microphone and try again.');
            } else {
                setErrorMsg(`Could not access microphone: ${err.message}`);
            }
        }
    };

    const stopRecording = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }
    }, []);

    const cancelRecording = () => {
        stopRecording();
        cleanup();
        setAudioBlob(null);
        setAudioUrl(null);
        setElapsed(0);
        setState('idle');
        onClose();
    };

    const sendVoiceNote = async () => {
        if (!audioBlob) {
            return;
        }
        setState('uploading');
        try {
            const url = `${API_BASE}/upload?channel_id=${encodeURIComponent(channelId)}&duration_ms=${elapsed * 1000}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': audioBlob.type || 'audio/webm',
                },
                body: audioBlob,
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(text || `Upload failed with status ${response.status}`);
            }

            // Success – close modal
            onClose();
        } catch (err: any) {
            setState('error');
            setErrorMsg(`Failed to send voice note: ${err.message}`);
        }
    };

    const retryRecording = () => {
        setAudioBlob(null);
        if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
        }
        setAudioUrl(null);
        setElapsed(0);
        setState('idle');
    };

    const remaining = maxDuration - elapsed;
    const progressPct = Math.min((elapsed / maxDuration) * 100, 100);

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    cancelRecording();
                }
            }}
        >
            <div
                style={{
                    background: 'var(--center-channel-bg, #fff)',
                    color: 'var(--center-channel-color, #333)',
                    borderRadius: '8px',
                    padding: '24px',
                    minWidth: '340px',
                    maxWidth: '420px',
                    width: '100%',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                }}
            >
                {/* Header */}
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                    <h3 style={{margin: 0, fontSize: '16px', fontWeight: 600}}>
                        {'Voice Note'}
                    </h3>
                    <button
                        className='style--none'
                        onClick={cancelRecording}
                        aria-label='Close'
                        style={{fontSize: '20px', cursor: 'pointer', opacity: 0.7, lineHeight: 1}}
                    >
                        {'×'}
                    </button>
                </div>

                {/* Recording state */}
                {(state === 'idle' || state === 'requesting') && (
                    <div style={{textAlign: 'center', padding: '16px 0'}}>
                        <p style={{marginBottom: '20px', opacity: 0.7, fontSize: '14px'}}>
                            {'Click the button below to start recording. Max duration: '}
                            <strong>{formatTime(maxDuration)}</strong>
                        </p>
                        <button
                            className='btn btn-primary'
                            onClick={startRecording}
                            disabled={state === 'requesting'}
                            style={{borderRadius: '50%', width: '64px', height: '64px', fontSize: '24px'}}
                        >
                            {'🎙️'}
                        </button>
                        {state === 'requesting' && (
                            <p style={{marginTop: '12px', fontSize: '13px', opacity: 0.7}}>
                                {'Requesting microphone access…'}
                            </p>
                        )}
                    </div>
                )}

                {state === 'recording' && (
                    <div style={{textAlign: 'center', padding: '8px 0'}}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            marginBottom: '16px',
                        }}>
                            <span style={{
                                width: '10px',
                                height: '10px',
                                borderRadius: '50%',
                                background: '#d24b4e',
                                animation: 'pulse 1s ease-in-out infinite',
                                display: 'inline-block',
                            }}/>
                            <span style={{fontWeight: 600, fontSize: '22px', fontVariantNumeric: 'tabular-nums'}}>
                                {formatTime(elapsed)}
                            </span>
                        </div>

                        {/* Progress bar */}
                        <div style={{background: 'rgba(128,128,128,0.2)', borderRadius: '4px', height: '4px', margin: '0 0 8px'}}>
                            <div style={{
                                background: remaining < 30 ? '#d24b4e' : 'var(--button-bg, #1c58d9)',
                                borderRadius: '4px',
                                height: '100%',
                                width: `${progressPct}%`,
                                transition: 'width 0.5s linear',
                            }}/>
                        </div>
                        <p style={{fontSize: '12px', opacity: 0.6, marginBottom: '20px'}}>
                            {remaining > 0 ? `${formatTime(remaining)} remaining` : 'Stopping…'}
                        </p>

                        <button
                            className='btn btn-danger'
                            onClick={stopRecording}
                            style={{borderRadius: '4px', padding: '8px 24px'}}
                        >
                            {'Stop'}
                        </button>
                    </div>
                )}

                {/* Preview + send */}
                {audioUrl && (state === 'idle' || state === 'uploading') && audioBlob && (
                    <div style={{padding: '8px 0'}}>
                        <p style={{fontSize: '13px', opacity: 0.7, marginBottom: '10px'}}>
                            {'Preview your recording:'}
                        </p>
                        <audio
                            controls={true}
                            src={audioUrl}
                            style={{width: '100%', marginBottom: '16px'}}
                        />
                        <p style={{fontSize: '12px', opacity: 0.6, marginBottom: '16px'}}>
                            {'Duration: '}
                            <strong>{formatTime(elapsed)}</strong>
                            {' · Size: '}
                            <strong>{`${(audioBlob.size / 1024).toFixed(1)} KB`}</strong>
                        </p>
                        <div style={{display: 'flex', gap: '8px', justifyContent: 'flex-end'}}>
                            <button
                                className='btn btn-tertiary'
                                onClick={retryRecording}
                                disabled={state === 'uploading'}
                            >
                                {'Re-record'}
                            </button>
                            <button
                                className='btn btn-primary'
                                onClick={sendVoiceNote}
                                disabled={state === 'uploading'}
                            >
                                {state === 'uploading' ? 'Sending…' : 'Send'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Error */}
                {state === 'error' && (
                    <div style={{
                        background: 'rgba(210,75,78,0.1)',
                        border: '1px solid rgba(210,75,78,0.3)',
                        borderRadius: '4px',
                        padding: '12px',
                        marginTop: '8px',
                    }}>
                        <p style={{margin: '0 0 12px', fontSize: '14px', color: '#d24b4e'}}>
                            {errorMsg || 'An error occurred.'}
                        </p>
                        <div style={{display: 'flex', gap: '8px', justifyContent: 'flex-end'}}>
                            <button
                                className='btn btn-tertiary'
                                onClick={cancelRecording}
                            >
                                {'Cancel'}
                            </button>
                            <button
                                className='btn btn-primary'
                                onClick={retryRecording}
                            >
                                {'Try Again'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.2; }
                }
            `}</style>
        </div>
    );
};

export default RecordingModal;
