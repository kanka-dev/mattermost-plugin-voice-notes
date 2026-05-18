import React, {useState} from 'react';

import RecordingModal from './RecordingModal';

interface Props {
    channelId: string;
}

const MicIcon = () => (
    <svg
        xmlns='http://www.w3.org/2000/svg'
        width='18'
        height='18'
        viewBox='0 0 24 24'
        fill='currentColor'
        aria-hidden='true'
    >
        <path d='M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.93V20H9v2h6v-2h-2v-2.07A7 7 0 0 0 19 11h-2z'/>
    </svg>
);

const getChannelIdFromStore = (): string => {
    try {
        return (window as any).store?.getState()?.entities?.channels?.currentChannelId || '';
    } catch {
        return '';
    }
};

const RecordButton: React.FC<Props> = ({channelId: channelIdProp}) => {
    const [showModal, setShowModal] = useState(false);
    const [showDesktopHint, setShowDesktopHint] = useState(false);
    const [copied, setCopied] = useState(false);
    const [resolvedChannelId, setResolvedChannelId] = useState('');

    const isDesktopApp = navigator.userAgent.includes('Electron');

    const openExternalBrowser = () => {
        const url = window.location.origin;

        // Mattermost Desktop App v6+ exposes desktopAPI.openExternal for system browser
        const win = window as any;
        if (win.desktopAPI?.openExternal) {
            win.desktopAPI.openExternal(url);
            setShowDesktopHint(false);
            return;
        }

        // Fallback: copy URL to clipboard so user can paste into their browser
        navigator.clipboard?.writeText(url).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 3000);
        }).catch(() => {
            // Clipboard also blocked – just show the URL as text (already visible)
        });
    };

    const handleClick = () => {
        const id = channelIdProp || getChannelIdFromStore();
        setResolvedChannelId(id);
        if (isDesktopApp) {
            setShowDesktopHint((prev) => !prev);
        } else {
            setShowModal(true);
        }
    };

    return (
        <>
            <button
                className='style--none post-action'
                aria-label='Record voice note'
                title='Record voice note'
                onClick={handleClick}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px 6px',
                    borderRadius: '4px',
                    opacity: 0.7,
                    cursor: 'pointer',
                    position: 'relative',
                }}
            >
                <MicIcon/>
            </button>
            {showDesktopHint && (
                <div style={{
                    position: 'fixed',
                    bottom: '80px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'var(--center-channel-bg, #1e1f22)',
                    color: 'var(--center-channel-color, #ddd)',
                    border: '1px solid rgba(128,128,128,0.3)',
                    borderRadius: '8px',
                    padding: '16px 20px',
                    zIndex: 9999,
                    maxWidth: '360px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                    fontSize: '13px',
                    lineHeight: 1.6,
                }}>
                    <p style={{fontWeight: 600, marginBottom: '8px'}}>
                        {'🎙️ Voice recording not available in Desktop App'}
                    </p>
                    <p style={{opacity: 0.75, marginBottom: '10px'}}>
                        {'The Mattermost Desktop App does not allow microphone access for plugins. Open Mattermost in your browser to record voice notes:'}
                    </p>
                    <div style={{
                        background: 'rgba(128,128,128,0.1)',
                        borderRadius: '4px',
                        padding: '6px 10px',
                        fontFamily: 'monospace',
                        fontSize: '12px',
                        marginBottom: '14px',
                        userSelect: 'all',
                    }}>
                        {window.location.origin}
                    </div>
                    <div style={{display: 'flex', gap: '8px', justifyContent: 'flex-end'}}>
                        <button
                            className='btn btn-tertiary btn-sm'
                            onClick={() => setShowDesktopHint(false)}
                        >
                            {'Dismiss'}
                        </button>
                        <button
                            className='btn btn-primary btn-sm'
                            onClick={openExternalBrowser}
                        >
                            {copied ? '✓ URL Copied!' : 'Copy URL'}
                        </button>
                    </div>
                </div>
            )}
            {showModal && (
                <RecordingModal
                    channelId={resolvedChannelId}
                    onClose={() => setShowModal(false)}
                />
            )}
        </>
    );
};

export default RecordButton;
